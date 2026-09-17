/**
 * Bloque diario de correos. Lo dispara el cron de Vercel una vez al día.
 *
 * La cuenta de Resend es gratuita: 100 correos diarios y 3,000 mensuales.
 * De esos 100 hay que dejar intactos los que no se pueden posponer —alta de
 * cuenta y recuperación de contraseña—, que rondan los 10 al día. Por eso el
 * bloque de campaña nunca pasa de 70, y el módulo de envío descuenta además
 * lo que ya salió hoy.
 *
 * ORDEN DE PRIORIDAD, y la razón de cada puesto:
 *
 *   1. referidos     —  ~167 clientes de pago. Es el único segmento que no
 *                       pide nada: ofrece. Y cada referido que convierte trae
 *                       un cliente nuevo, así que rinde más que cualquier
 *                       correo dirigido a prospectos.
 *   2. entrada       —   65 cuentas que se registraron y NUNCA entraron. Es
 *                       el fallo más crudo del embudo: gente que quiso usar
 *                       la plataforma y se quedó en la puerta. Se les quita
 *                       el obstáculo antes que venderle nada a nadie.
 *   3. suscripcion   —  ~98 personas. Ya chocaron con el muro: son las únicas
 *                       a las que una oferta les dice algo. Se agotan en dos
 *                       días y valen más que el resto junto.
 *   4. reactivacion  —  ~894. Probaron y se fueron; recuperarlos cuesta menos
 *                       que activar a quien nunca escribió nada.
 *   5. activacion    —   ~566. El grueso. Se recorre despacio, en varias
 *                       semanas, que es exactamente lo que conviene: así se
 *                       mide si el correo funciona antes de gastar la lista
 *                       entera.
 *
 * Con 70 diarios, la cola completa (~2,560 correos) tarda unas cinco semanas.
 * No es una limitación que haya que sortear: es el ritmo que permite corregir
 * el rumbo a la mitad.
 */

import { NextRequest, NextResponse } from 'next/server';
import { CAMPANIAS, type NombreCampania } from '@/lib/correo/campanias';
import { segmento } from '@/lib/correo/segmentos';
import { cupoDisponibleHoy, enviarCampania, proximaEntrega, type Resultado } from '@/lib/correo/enviar';
import { revisarAlmacenamiento } from '@/lib/correo/alerta-almacenamiento';
import { revisarSaldoMotor } from '@/lib/correo/alerta-saldo-motor';
import { revisarRecuperacion } from '@/lib/correo/alerta-recuperacion';
import { revisarCorrecciones } from '@/lib/correo/alerta-correcciones';
import { revisarCreditosVoz } from '@/lib/correo/alerta-voz';

export const maxDuration = 300;

/** El orden importa: se gasta el cupo de arriba hacia abajo. */
// «vitrina» va primero mientras dure la invitación: son 169 clientes y el
// cupo diario para campañas es de 70 —los otros 30 quedan reservados para lo
// transaccional, que no puede quedarse sin cupo—. Así el cron completa la
// tanda en tres días sin que nadie tenga que acordarse.
// ORDEN APROBADO POR DAVID EL 17-SEP-2026. Con la pausa de tres días entre
// campañas, la que va primero le cierra la puerta a las demás para esa
// persona, así que el orden decide quién recibe qué:
//
//   1. registro_pendiente — 42 que no pudieron entrar; poca gente, mucha intención.
//   2. descuento_pro      — 1,513 que consultaron y no contrataron: los ingresos.
//   3. vitrina            — ya ampliada a todos los activos, no sólo a clientes.
//   4. referidos
//   5. entrada
//
// EN PAUSA: `suscripcion` —le vende el plan a la misma gente que el descuento,
// con peor oferta—, `reactivacion` —misma gente, y anuncia la app móvil «muy
// pronto»— y `activacion`, con textos de agosto que no se han vuelto a revisar.
const PRIORIDAD: NombreCampania[] = ['registro_pendiente', 'descuento_pro', 'vitrina', 'referidos', 'entrada'];

/**
 * Vercel firma sus crons con CRON_SECRET. Se acepta también la clave de
 * administración para poder dispararlo a mano.
 *
 * Devuelve QUIÉN llama, porque de eso depende el modo por defecto.
 */
function quienLlama(req: NextRequest): 'cron' | 'admin' | null {
    const cron = process.env.CRON_SECRET;
    if (cron && req.headers.get('authorization') === `Bearer ${cron}`) return 'cron';

    const clave = process.env.ADMIN_CAMPAIGN_KEY;
    if (clave && req.headers.get('x-admin-key') === clave) return 'admin';

    return null;
}


export async function GET(req: NextRequest) {
    const arranque = Date.now();
    const llamante = quienLlama(req);
    if (!llamante) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // El cron de Vercel envía de verdad; el disparo manual es simulacro salvo
    // que se pida `?modo=real`.
    //
    // El modo NO se decide por la query string del cron: si Vercel la
    // descartara, el bloque diario se quedaría en simulacro para siempre y
    // nadie se enteraría, porque un simulacro responde 200 igual que un envío.
    // Quien llama es lo que manda; el parámetro sólo sirve para forzarlo a
    // mano.
    const forzarReal = req.nextUrl.searchParams.get('modo') === 'real';
    const simulacro = llamante === 'cron' ? false : !forzarReal;

    try {
        // ── Reversión de ascensos vencidos ───────────────────────────────
        // Va PRIMERO y fuera del simulacro. Es una obligación contractual con
        // el usuario, no una campaña: si se pospusiera, alguien seguiría
        // gozando Platinum después de los tres meses ofrecidos, o —peor— el
        // día que se corrija se le quitaría de golpe sin explicación.
        //
        // Sólo devuelve a su plan a quien todavía está en el de premio: si en
        // el ínterin contrató Platinum de verdad, no se le toca.
        const { revertirVencidos, sincronizarActivaciones } = await import('@/lib/referidos-backend');
        const reversiones = await revertirVencidos();

        // ── Activaciones y peldaños ──────────────────────────────────────
        // Sella qué invitados ya son usuarios reales (una consulta hecha) y
        // paga los peldaños alcanzados. Va aquí y no en el navegador porque
        // el premio es dinero: se cuenta con la llave de servicio, jamás con
        // un dato que mande el cliente. El panel de referidos lo repite para
        // ese padrino al abrirlo, así nadie espera a la tarde para ver su
        // avance; aquí se cubre a quien no ha entrado.
        const activaciones = await sincronizarActivaciones();
        if (activaciones.activados) {
            console.log(`🎁 ${activaciones.activados} invitados activados · ${activaciones.premios.length} peldaños pagados`);
        }

        const inicio = await cupoDisponibleHoy();
        const tandas: Resultado[] = [];
        let restante = inicio.cupo;
        // Se deja de enviar a los 240 s de haber empezado la ruta: quedan 60 de
        // margen antes de que Vercel mate la función (maxDuration = 300).
        const plazoHasta = arranque + 240_000;
        // El cron corre a las 7:00 de México y deja la tanda programada para
        // las 8:00 en punto. Si se dispara a mano después de las 8:00, sale ya.
        const programadoPara = proximaEntrega();

        for (const campania of PRIORIDAD) {
            if (restante <= 0) break;
            if (Date.now() > plazoHasta) break;

            const destinatarios = await segmento(campania);
            if (destinatarios.length === 0) continue;

            // El enlace de invitación se DERIVA del id del usuario, pero el
            // padrino se busca por el código GUARDADO. Si no se guarda antes
            // de mandar el correo, el enlace viaja apuntando a un código que
            // no existe: quien se registre con él no queda atado a nadie y el
            // referido se pierde en silencio.
            //
            // Pasó de verdad: 151 de los 161 correos de la primera tanda
            // salieron con un enlace irresoluble, porque el código sólo se
            // guardaba cuando el abogado abría su panel de referidos.
            if (campania === 'referidos') {
                const { asegurarCodigo } = await import('@/lib/referidos-backend');
                await Promise.all(
                    destinatarios
                        .filter(d => d.id)
                        .map(d => asegurarCodigo(d.id as string).catch(() => null)),
                );
            }

            const r = await enviarCampania({
                campania,
                destinatarios,
                construir: CAMPANIAS[campania].construir,
                simulacro,
                maximo: restante,
                plazoHasta,
                programadoPara,
            });

            tandas.push(r);
            restante -= r.enviados;
        }

        const enviados = tandas.reduce((s, t) => s + t.enviados, 0);
        const pendientes = tandas.reduce((s, t) => s + t.restantes_en_segmento, 0);

        // Vigilancia del almacenamiento de expedientes. Va al final y en
        // simulacro no manda nada: es una alarma que dormirá meses, y cuando
        // suene tiene que encontrar margen de sobra para actuar con calma.
        const almacenamiento = simulacro
            ? 'almacenamiento: simulacro, no se revisa'
            : await revisarAlmacenamiento();

        // Y el saldo del motor. A diferencia del almacenamiento, éste puede
        // apagar la plataforma en días: el 16-ago tocó fondo un sábado y el
        // primer aviso fueron dos clientes de pago reportando.
        const saldoMotor = simulacro
            ? 'saldo-motor: simulacro, no se revisa'
            : await revisarSaldoMotor();

        // Y que la búsqueda no se quede otra vez sin concepto. HyDE estuvo
        // MESES apagado sin que nada fallara —la respuesta seguía saliendo,
        // sólo que peor— y se descubrió porque un abogado notó que faltaba lo
        // obvio. Ésta es la alarma que faltaba ese día.
        const recuperacion = simulacro
            ? 'recuperacion: simulacro, no se revisa'
            : await revisarRecuperacion();

        // Y las correcciones de los abogados. Las tres alarmas de arriba
        // vigilan la máquina; ésta vigila lo único que la máquina no puede
        // ver de sí misma: que alguien que sabe de la materia fue a la fuente
        // y encontró que la respuesta estaba mal. Marie Mejía lo dijo el 29 de
        // julio y canceló el 22 de agosto sin que nadie leyera la frase.
        const correcciones = simulacro
            ? 'correcciones: simulacro, no se revisa'
            : await revisarCorrecciones();

        // Y los créditos de voz del Agente IA. El 16-ago se acabó el saldo del
        // motor un sábado y el primer aviso fueron dos clientes reportando;
        // aquí sería un abogado de pie en una audiencia al que la voz se le
        // apaga a media pregunta. Avisa en DÍAS de margen, no en porcentaje:
        // «te queda el 20%» puede ser una semana o una tarde.
        const creditosVoz = simulacro
            ? 'creditos-voz: simulacro, no se revisa'
            : await revisarCreditosVoz();

        return NextResponse.json({
            almacenamiento,
            saldo_motor: saldoMotor,
            recuperacion,
            correcciones,
            creditos_voz: creditosVoz,
            fecha: new Date().toISOString().slice(0, 10),
            simulacro,
            ascensos_revertidos: reversiones,
            activaciones,
            cuota: inicio,
            enviados,
            cupo_sin_usar: restante,
            pendientes_para_dias_siguientes: pendientes,
            tandas,
        });
    } catch (e) {
        return NextResponse.json(
            { error: e instanceof Error ? e.message : String(e) },
            { status: 500 },
        );
    }
}

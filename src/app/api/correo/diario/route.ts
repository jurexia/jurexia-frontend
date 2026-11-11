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
import { buenFinVigente, esUltimoDiaBuenFin, fechaCDMX } from '@/lib/buen-fin';

// Sin caché de datos de Next en esta ruta GET: ver api/cron/incidencias (2-nov-2026).
export const fetchCache = 'force-no-store';

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
//
// FUERA `descuento_pro` y `registro_pendiente` (2-nov-2026, pedido de David).
// Los dos ofrecen «Pro al 50 %: $74.50, después $149», una oferta que venció el
// 17-oct (VIGENCIA_OFERTA en campanias.ts), y el cron los siguió mandando: 485
// correos del 18 al 30-oct (463 y 22) con un código que ya no valía. Además, el
// 3-nov cambian los precios. `registro_pendiente` vuelve cuando su correo deje
// de llevar la oferta; `descuento_pro`, sólo con oferta y fecha nuevas.
// VUELVE `suscripcion`, y PRIMERO (9-nov-2026, visto bueno de David al texto
// nuevo con precios). La razón de su pausa —competía con el descuento— ya no
// existe: `descuento_pro` está fuera desde el 31-oct. Va primero porque es la
// gente que ya topó el límite: 267 elegibles, 269 nunca lo habían recibido.
const PRIORIDAD: NombreCampania[] = ['suscripcion', 'vitrina', 'referidos', 'entrada'];

/**
 * BUEN FIN 2026 (13 al 17-nov). Va primero y desplaza a `suscripcion`, que
 * le hablaría del plan sin el descuento a la misma gente. El 17 sale la
 * versión «último día» en su lugar. El fin de semana del Buen Fin el cron
 * también corre (ver vercel.json), pero sólo con la campaña del Buen Fin.
 */
/** Desde el 18-nov-2026 (00:00 de México), el posicionamiento al precio normal
 *  para quien el Buen Fin no alcanzó, después del aviso del límite. */
const POSICION_DESDE = new Date('2026-11-18T06:00:00Z');

/**
 * EL FRENO (11-nov-2026). Si en el panel de Resend o en Google Postmaster las
 * quejas de spam pasan de 1 por cada 1,000 o los rebotes del 2 %, se pone
 * `CORREO_PAUSA_POSICION=1` en Vercel y las cartas del Buen Fin y de
 * posicionamiento dejan de salir al día siguiente, sin tocar código. El resto
 * de las campañas sigue igual.
 */
const CARTAS: NombreCampania[] = ['buen_fin', 'buen_fin_ultimo', 'posicion'];

function prioridadDeHoy(ahora = new Date()): NombreCampania[] {
    const lista = prioridadSinFreno(ahora);
    return process.env.CORREO_PAUSA_POSICION === '1' ? lista.filter((c) => !CARTAS.includes(c)) : lista;
}

function prioridadSinFreno(ahora: Date): NombreCampania[] {
    if (!buenFinVigente(ahora)) {
        if (ahora < POSICION_DESDE) return PRIORIDAD;
        const [primera, ...resto] = PRIORIDAD;
        return [primera, 'posicion', ...resto];
    }
    const resto = PRIORIDAD.filter((c) => c !== 'suscripcion');
    const primera: NombreCampania = esUltimoDiaBuenFin(ahora) ? 'buen_fin_ultimo' : 'buen_fin';
    return finDeSemanaCDMX(ahora) ? [primera] : [primera, ...resto];
}

/**
 * POR BLOQUES (11-nov-2026). David: «ir por bloques para que no se nos vayan a
 * promociones ni spam». Gmail mide la forma del envío: un remitente que manda
 * de golpe muchos más correos de los que suele es sospechoso. Así que:
 *   · un tope por día que crece poco a poco —fin de semana más bajo, porque
 *     los abogados abren menos y una carta sin abrir pesa en contra—;
 *   · primero quien usó Iurexia más recientemente (lo ordena el segmento):
 *     es quien más abre y responde, y su respuesta le enseña a Gmail que el
 *     remitente es bueno antes de llegar a las cuentas viejas;
 *   · y cada bloque repartido de 8:00 a 18:00, no todo a la misma hora.
 * El cupo diario de Resend sigue mandando por encima de esto.
 */
const RAMPA_BUEN_FIN: Record<string, number> = {
    '2026-11-13': 400,
    '2026-11-14': 250,
    '2026-11-15': 250,
    '2026-11-16': 800,
    '2026-11-17': 800,
};
const TOPE_POSICION = 600;
const VENTANA_BLOQUE_MS = 10 * 3600_000;

function topeDelBloque(campania: NombreCampania, ahora = new Date()): number | null {
    if (campania === 'buen_fin' || campania === 'buen_fin_ultimo') return RAMPA_BUEN_FIN[fechaCDMX(ahora)] ?? 400;
    if (campania === 'posicion') return TOPE_POSICION;
    return null;
}

function finDeSemanaCDMX(ahora = new Date()): boolean {
    const dia = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Mexico_City', weekday: 'short' }).format(ahora);
    return dia === 'Sat' || dia === 'Sun';
}

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
    // El cron del fin de semana existe sólo para el Buen Fin: fuera de esas
    // fechas no hace nada, para que sábado y domingo sigan como siempre.
    if (llamante === 'cron' && finDeSemanaCDMX() && !buenFinVigente()) {
        return NextResponse.json({ omitido: 'fin de semana fuera del Buen Fin' });
    }

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

        for (const campania of prioridadDeHoy()) {
            if (restante <= 0) break;
            if (Date.now() > plazoHasta) break;

            let destinatarios = await segmento(campania);
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
            //
            // Y POR LOTES, NO EN RÁFAGA (28-oct-2026). Aquí había un
            // `Promise.all` de un PATCH por destinatario: 1,001 PATCH en cinco
            // segundos que no cambiaban nada, y otros ~1,700 que nunca
            // llegaban. Ver `asegurarCodigos`. Si no se puede comprobar quién
            // tiene código, esta tanda se salta hoy en vez de mandar a ciegas;
            // y a quien no se le pudo guardar no se le manda el enlace.
            if (campania === 'referidos') {
                const { asegurarCodigos } = await import('@/lib/referidos-backend');
                try {
                    const codigos = await asegurarCodigos(
                        destinatarios.map(d => d.id).filter((id): id is string => !!id),
                    );
                    if (codigos.guardados) {
                        console.log(`🎟️ ${codigos.guardados} códigos de invitación guardados antes de enviar (${codigos.revisados} revisados)`);
                    }
                    if (codigos.fallidos.length) {
                        const fuera = new Set(codigos.fallidos);
                        destinatarios = destinatarios.filter(d => !d.id || !fuera.has(d.id));
                    }
                } catch (e) {
                    console.error('🎟️ referidos se salta hoy: no se pudo comprobar quién tiene código', e);
                    continue;
                }
            }

            const bloque = topeDelBloque(campania);
            const r = await enviarCampania({
                campania,
                destinatarios,
                construir: CAMPANIAS[campania].construir,
                simulacro,
                maximo: bloque == null ? restante : Math.min(restante, bloque),
                plazoHasta,
                programadoPara,
                ...(bloque != null && programadoPara ? { ventanaMs: VENTANA_BLOQUE_MS } : {}),
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

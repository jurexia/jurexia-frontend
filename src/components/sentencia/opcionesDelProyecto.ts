import type { DecisionSuplencia, FormatoSentencia, OpcionesResolver, PropuestaSuplencia, RespuestaPropuesta } from './api';
import type { ProblemaJuridico } from './tipos';

/* ═══ EL FORMULARIO DEL PROYECTO, EN UN SOLO SITIO (26-sep-2026) ═══
   Lo arma esta función y lo usan TRES llamadas: la que genera el proyecto,
   la que pide el plan del estudio (`pedirPlan`) y la que recalifica los
   accesorios tumbados (`recalificar`). El servidor busca el plan y la
   recalificación por una clave que sale de este formulario; si cada llamada
   lo armara a su manera, al generar no encontraría lo que el secretario vio
   en pantalla.

   Vive fuera de la página, sin React, para poder probarlo sin Next
   (comprobaciones/recalificar.mjs): la página le pasa su estado de AHORA y
   lo lee por referencia en cada llamada. Devuelve null si en «todo el
   asunto» falta el sentido. */

export type ModoDelFormulario = 'acervo' | 'global' | 'por_problema';

export interface EstadoDelFormulario {
    modo: ModoDelFormulario;
    problemas: ProblemaJuridico[];
    tocados: Set<string>;
    grupos: Record<string, string>;
    sentidoGlobal: string;
    razonGlobal: string;
    globalDictado: boolean;
    propuesta: RespuestaPropuesta | null;
    /** Los conceptos de violación que pegó el secretario (el recurso levanta
     *  un sobreseimiento). */
    conceptosViolacion: string;
    contexto: string;
    /** La autoridad corregida a mano, si la corrigió. */
    responsable?: string;
    oportunidadDecision: string;
    oportunidadMotivo: string;
    /** La suplencia que él decidió, si decidió algo. */
    suplencia: DecisionSuplencia | null;
    /** La que propone el motor para el asunto, si propone alguna. */
    suplenciaPropuesta: PropuestaSuplencia | null;
    razonesSegmento: Record<string, string>;
    /** La variante del prompt, YA filtrada: vacía si la cuenta no es de casa. */
    varianteEstudio: string;
}

export function opcionesDelProyecto(e: EstadoDelFormulario, formato: FormatoSentencia): OpcionesResolver | null {
    const { modo, problemas, tocados, grupos, propuesta } = e;
    /* LA SUPLENCIA VIAJA EN TODAS LAS LLAMADAS: la que él decidió o, si no
       decidió nada, la propuesta del motor marcada sin confirmar —el
       servidor sólo aplica la confirmada—. */
    const supl = e.suplencia ?? (e.suplenciaPropuesta
        ? { fraccion: e.suplenciaPropuesta.fraccion,
            aFavorDe: e.suplenciaPropuesta.aFavorDe, confirmada: false }
        : null);
    /* Lo que viaja igual por los tres modos: la autoridad corregida, lo
       que él resolvió sobre la oportunidad —en la petición y no en
       memoria: con -w 2 el worker que compone no es el que leyó—, la
       forma, la suplencia, sus razones por argumento (Decisión 6), sólo
       en casa la variante del prompt, y LOS CONCEPTOS DE VIOLACIÓN.

       Los conceptos iban sólo en la rama de «todo el asunto» (revisión
       adversarial, 26-sep-2026; heredado). En «problema por problema» —que es
       donde se cambia el principal y corre la recalificación— el botón los
       exige (`necesitaConceptos` no mira el modo), el secretario los pegaba y
       el formulario los tiraba: el servidor usaba lo que hubiera quedado en
       la memoria del worker que atendiera —una vuelta global anterior, o
       nada— y el proyecto levantaba el sobreseimiento con el estudio de los
       conceptos «pendiente», o no, según el worker. Y la firma del plan, que
       ya los lista en sus dependencias, cambiaba sin que cambiara lo que se
       manda. Aquí viajan en los tres modos, al resolver, al plan y a la
       recalificación. */
    const comunes: OpcionesResolver = {
        contexto: e.contexto,
        responsable: e.responsable,
        oportunidadDecision: e.oportunidadDecision,
        oportunidadMotivo: e.oportunidadMotivo,
        formato,
        suplencia: supl,
        razonesSegmento: e.razonesSegmento,
        varianteEstudio: e.varianteEstudio,
        conceptosViolacion: e.conceptosViolacion,
    };
    // SE MANDAN TODOS LOS SENTIDOS, NO EL PRIMERO. Antes se tomaba
    // `problemas.find(p => p.sentido)` y los demás se perdían: el
    // secretario calificaba seis problemas y el estudio recibía uno.
    // Con varios criterios el resolutivo sale mixto donde debe salir
    // mixto, que es lo que hace que concuerde con el estudio.
    if (modo === 'global') {
        if (!e.sentidoGlobal) return null;
        /* LO QUE ÉL MARCÓ VIAJA TAMBIÉN AQUÍ, y manda.
           Este camino decía «mandar además los criterios por problema
           sería dar dos órdenes distintas» y por eso los tiraba. El
           razonamiento daba por hecho que el sentido global era la
           palabra del secretario, y no lo es: lo pone la propuesta del
           modelo en cuanto llega. Así que se tiraba lo único que él
           había dicho de verdad.
           Ahora el global RELLENA los problemas que no tocó, y donde
           marcó algo gana su marca. El servidor aplica esa regla en
           modos_decision.repartir y lo dice en un aviso. */
        const suyos = problemas.filter((p) => tocados.has(p.id) && p.sentido);
        /* Y EL GRUPO DE LOS QUE NO TOCÓ (26-sep-2026). «Estudiar juntos»
           vale en los tres modos; en éste el problema agrupado que él no
           calificó viaja SIN sentido y con `tocado: false`: no califica
           nada —el servidor sólo toma como marca la que trae sentido—,
           sólo dice con quién se estudia. */
        const agrupados = problemas.filter((p) => !(tocados.has(p.id) && p.sentido) && grupos[p.id]);
        const filas = [
            ...suyos.map((p) => ({
                problema: p.pregunta,
                sentido: p.sentido,
                razonamiento: p.criterio ?? '',
                grupo: grupos[p.id] ?? '',
                jerarquia: p.jerarquia ?? 'accesorio',
                prediccion: p.prediccion ?? {},
                tocado: true,
            })),
            ...agrupados.map((p) => ({
                problema: p.pregunta,
                sentido: '',
                razonamiento: '',
                grupo: grupos[p.id] ?? '',
                jerarquia: p.jerarquia ?? 'accesorio',
                prediccion: p.prediccion ?? {},
                tocado: false,
            })),
        ];
        return {
            ...comunes,
            sentidoGlobal: e.sentidoGlobal, razonGlobal: e.razonGlobal, globalDictado: e.globalDictado,
            // LO QUE ÉL MARCÓ, con su razón y su grupo. Va junto al
            // sentido global, no en lugar de él: el servidor usa el
            // global de relleno y respeta cada marca expresa.
            criteriosJson: filas.length ? JSON.stringify(filas) : undefined,
            // Qué resolvió el órgano recurrido, del contexto que
            // escribió el motor. Decide el verbo del resolutivo.
            resolvioDeclarado: propuesta?.global?.contexto?.resolvio ?? '',
            // Y la propuesta global entera, para el estudio.
            globalJson: propuesta?.global ? JSON.stringify(propuesta.global) : '',
        };
    }
    const conSentido = problemas.filter((p) => p.sentido);
    const criteriosJson = conSentido.length
        ? JSON.stringify(conSentido.map((p) => ({
              problema: p.pregunta,
              sentido: p.sentido,
              razonamiento: p.criterio ?? '',
              // EL GRUPO VIAJA CON EL CRITERIO. Si el secretario marcó
              // dos planteamientos como una sola línea argumentativa,
              // el estudio tiene que saberlo: es lo único que autoriza
              // resolverlos con una calificación conjunta.
              grupo: grupos[p.id] ?? '',
              // LO QUE SE SEMBRÓ TIENE QUE VOLVER. Este objeto se
              // reconstruía con tres campos y perdía la jerarquía y la
              // predicción, que es lo que ordena el estudio por
              // prelación lógica y lo que avisa de ir contra la
              // corriente del acervo. Es el gemelo exacto del fallo que
              // ya costó una ronda en el servidor: un arreglo
              // reconstruye una lista y descarta lo que otro sembró.
              jerarquia: p.jerarquia ?? 'accesorio',
              prediccion: p.prediccion ?? {},
              // QUIÉN LO PUSO. Lo que él marcó a mano el servidor no lo
              // toca; lo que puso la pantalla con la propuesta o con el
              // reparto sigue la suerte del principal.
              tocado: tocados.has(p.id),
          })))
        : undefined;
    return {
        ...comunes,
        criterio: criteriosJson ? null : {
            sentido: problemas[0]?.sentido ?? 'infundado',
            problema: problemas[0]?.pregunta ?? '',
            razonamiento: problemas.filter((p) => p.criterio)
                .map((p) => `${p.pregunta}\n${p.criterio}`).join('\n\n'),
        },
        criteriosJson,
    };
}

/* ═══════════════════════════════════════════════════════════════════════════
   LO QUE DICTÓ EL SECRETARIO, FRENTE A LAS PREGUNTAS (3-oct-2026)
   ═══════════════════════════════════════════════════════════════════════════
   Revisión adversarial de la mejora final del redactor. Dos reglas puras, sin
   React, para que page.tsx y Decision.tsx las lean igual y se puedan probar
   sin servidor (comprobaciones/redactor_final.mjs):

   1 · Contestar una pregunta NO pisa lo que él dictó. Con la propuesta hecha,
       «Preguntas para ti» sigue a la vista y dice «si contestas alguna, se
       vuelve a proponer». Al llegar la propuesta nueva, la página fijaba
       `modo='global'`, el sentido y la razón del motor y apagaba
       `globalDictado`: el sentido que él dictó (la vía contraria, su razón) o
       su trabajo problema por problema desaparecían por contestar una pregunta
       accesoria. La regla de la casa es que el motor nunca cambia el sentido
       que dicta el secretario: tras responder, sólo se actualiza la propuesta.

   2 · Con la propuesta en «preguntas», «Generar» no se enciende con un sentido
       que nadie dictó. Si había en pantalla un eco del motor anterior (una
       propuesta que salió sin el análisis y luego se rehízo y se detuvo en las
       preguntas), «Generar» seguía activo y el proyecto se escribía con un
       sentido que el servidor ya había retirado, antes de contestar las
       indispensables. Sólo puede generarse con lo que él dictó. */

/** ¿Hay que respetar lo que él dictó al recibir la propuesta tras contestar?
 *  Sí si dictó el sentido global, o si trabaja problema por problema con algún
 *  problema marcado a mano (pasarlo a «todo el asunto» con el sentido del
 *  motor dejaría sus marcas bajo un global que no dictó). En «todo el asunto»
 *  con el global como eco del motor no hay nada suyo que pisar: el eco se
 *  actualiza, y sus marcas ya las protege el volcado por problema. */
export function respetarLoDictado(e: { globalDictado: boolean; nTocados: number; modo: string }): boolean {
    return e.globalDictado || (e.modo === 'por_problema' && e.nTocados > 0);
}

/** ¿Se detiene la generación porque la propuesta espera respuestas y lo que
 *  viajaría es un eco del motor? En «todo el asunto», si el global no lo dictó
 *  él; problema por problema, si algún sentido en pantalla no lo marcó él. */
export function generarDetenidoPorPreguntas(e: {
    esperaRespuestas: boolean;
    enGlobal: boolean;
    globalDictado: boolean;
    problemas: { id: string; sentido?: string | null }[];
    tocados?: Set<string> | null;
}): boolean {
    if (!e.esperaRespuestas) return false;
    if (e.enGlobal) return !e.globalDictado;
    return e.problemas.some((p) => !!p.sentido && !e.tocados?.has(p.id));
}

/** ¿Con qué se recoge la propuesta tras contestar? Si el secretario escribió o
 *  aportó contexto, CON él: /taller/proponer sin contexto sirve la guardada, y
 *  una guardada sin lo aportado no vale (el sentido y el estudio saldrían de
 *  insumos distintos). Sin contexto, la guardada, como antes. */
export function recogerTrasResponder(contexto: string): { sinContexto?: boolean; contextoTexto?: string } {
    const c = (contexto || '').trim();
    return c ? { contextoTexto: contexto } : { sinContexto: true };
}

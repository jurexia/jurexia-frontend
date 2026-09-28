// DOS PLANES REALES, TAL COMO LOS DEJA EL SERVIDOR PLAN-6 (28-sep-2026).
//
// Los dos plan-4 de producción del AR 462 (clave 83a4… «infundado», la
// captura de David, y e34c… «fundado»), pasados SIN MODELO por
// `plan_estudio.resolver_por_dependencia` del worktree API (a3e2af0). Sólo la
// ESTRUCTURA —ids, problema, vicio, proposición atacada, etiqueta, razón,
// tratamiento, diferencia y los grupos—: ni resúmenes ni citas del escrito.
//
// Por qué están aquí: el caso sintético de plan_del_estudio.mjs no detectaba
// que la pantalla clasificaba por el tratamiento antes que por el grupo del
// servidor; todos sus absorbidos traían trat «aplica». En el real, los 23
// «con el principal» del infundado conservan «desarrolla».
//
// Columnas de cada fila: id, problema_id, vicio, ataca, etiqueta, razon,
// razon_p, trat, diferencia, dependencia, con, depende_de.
const COLS = ['id', 'problema_id', 'vicio', 'ataca', 'etiqueta', 'razon', 'razon_p', 'trat',
              'diferencia', 'dependencia', 'con', 'depende_de'];
function deFilas(plan, filas) {
    return { ...plan, segmentos: filas.map((f) => Object.fromEntries(
        COLS.map((c, i) => [c, f[i]]).filter(([, v]) => v !== '' && v !== null))) };
}

export const P462_INFUNDADO = deFilas({
    version: "plan-4", tipo_asunto: "amparo_revision",
    problemas: [{"id": 1, "sentido": "infundado", "jerarquia": "principal"}, {"id": 2, "sentido": "infundado", "jerarquia": "accesorio"}],
    unidades: [{"id": "U1", "problemas": [1], "segmentos": ["A1.a", "A1.b", "A1.e", "A1.h", "A1.i", "A1.u"], "premisa": null}, {"id": "U19", "problemas": [1], "segmentos": ["A1.f"], "premisa": null}, {"id": "U20", "problemas": [1], "segmentos": ["A1.x"], "premisa": null}, {"id": "U2", "problemas": [1], "segmentos": ["A1.c"], "premisa": null}, {"id": "U3", "problemas": [1], "segmentos": ["A1.d"], "premisa": null}, {"id": "U4", "problemas": [1], "segmentos": ["A1.g"], "premisa": null}, {"id": "U5", "problemas": [1], "segmentos": ["A1.j"], "premisa": null}, {"id": "U6", "problemas": [1], "segmentos": ["A1.k"], "premisa": null}, {"id": "U7", "problemas": [1], "segmentos": ["A1.l"], "premisa": null}, {"id": "U8", "problemas": [1], "segmentos": ["A1.m"], "premisa": null}, {"id": "U9", "problemas": [1], "segmentos": ["A1.n"], "premisa": null}, {"id": "U10", "problemas": [1], "segmentos": ["A1.o"], "premisa": null}, {"id": "U11", "problemas": [1], "segmentos": ["A1.p"], "premisa": null}, {"id": "U12", "problemas": [1], "segmentos": ["A1.q"], "premisa": null}, {"id": "U13", "problemas": [1], "segmentos": ["A1.r"], "premisa": null}, {"id": "U14", "problemas": [1], "segmentos": ["A1.s"], "premisa": null}, {"id": "U15", "problemas": [1], "segmentos": ["A1.t"], "premisa": null}, {"id": "U16", "problemas": [1], "segmentos": ["A1.v"], "premisa": null}, {"id": "U17", "problemas": [1], "segmentos": ["A1.w"], "premisa": null}, {"id": "U18", "problemas": [2], "segmentos": ["A2.a"], "premisa": "M3"}],
    jerarquia: [{"problema": 1, "decide": "A1.a", "raiz": "P1", "con_el_principal": ["A1.b", "A1.c", "A1.d", "A1.e", "A1.f", "A1.g", "A1.h", "A1.i", "A1.j", "A1.k", "A1.l", "A1.m", "A1.n", "A1.o", "A1.p", "A1.q", "A1.r", "A1.s", "A1.t", "A1.u", "A1.v", "A1.w", "A1.x"], "innecesario": [], "deriva": []}, {"problema": 2, "decide": "A2.a", "raiz": "P4", "con_el_principal": [], "innecesario": [], "deriva": []}],
}, [
    ["A1.a", 1, "fondo", "P1", "infundado", "fondo_desestimado", "", "desarrolla", "", "decide", "", ""],
    ["A1.b", 1, "fondo", "P1", "infundado", "fondo_desestimado", "", "desarrolla", "", "con_el_principal", "A1.a", "P1"],
    ["A1.c", 1, "fondo", "P3", "infundado", "fondo_desestimado", "", "desarrolla", "", "con_el_principal", "A1.a", "P1"],
    ["A1.d", 1, "fondo", "P3", "infundado", "fondo_desestimado", "", "desarrolla", "norma", "con_el_principal", "A1.a", "P1"],
    ["A1.e", 1, "fondo", "P1", "infundado", "fondo_desestimado", "", "desarrolla", "", "con_el_principal", "A1.a", "P1"],
    ["A1.f", 1, "fondo", "P3", "infundado", "fondo_desestimado", "", "desarrolla", "", "con_el_principal", "A1.a", "P1"],
    ["A1.g", 1, "fondo", "P3", "infundado", "fondo_desestimado", "", "desarrolla", "norma", "con_el_principal", "A1.a", "P1"],
    ["A1.h", 1, "fondo", "P1", "infundado", "fondo_desestimado", "", "desarrolla", "", "con_el_principal", "A1.a", "P1"],
    ["A1.i", 1, "fondo", "P1", "infundado", "fondo_desestimado", "", "desarrolla", "", "con_el_principal", "A1.a", "P1"],
    ["A1.j", 1, "fondo", "P1", "infundado", "fondo_desestimado", "", "desarrolla", "precedente", "con_el_principal", "A1.a", "P1"],
    ["A1.k", 1, "fondo", "P1", "infundado", "fondo_desestimado", "", "residual", "", "con_el_principal", "A1.a", "P1"],
    ["A1.l", 1, "forma", "P1", "infundado", "fondo_desestimado", "", "desarrolla", "", "con_el_principal", "A1.a", "P1"],
    ["A1.m", 1, "forma", "P1", "infundado", "fondo_desestimado", "", "desarrolla", "norma", "con_el_principal", "A1.a", "P1"],
    ["A1.n", 1, "fondo", "P1", "infundado", "fondo_desestimado", "", "desarrolla", "norma", "con_el_principal", "A1.a", "P1"],
    ["A1.o", 1, "fondo", "P1", "infundado", "fondo_desestimado", "", "desarrolla", "precedente", "con_el_principal", "A1.a", "P1"],
    ["A1.p", 1, "forma", "P3", "infundado", "fondo_desestimado", "", "desarrolla", "norma", "con_el_principal", "A1.a", "P1"],
    ["A1.q", 1, "forma", "P1", "infundado", "fondo_desestimado", "", "desarrolla", "norma", "con_el_principal", "A1.a", "P1"],
    ["A1.r", 1, "forma", "P1", "infundado", "fondo_desestimado", "", "desarrolla", "precedente", "con_el_principal", "A1.a", "P1"],
    ["A1.s", 1, "forma", "P1", "infundado", "fondo_desestimado", "", "desarrolla", "precedente", "con_el_principal", "A1.a", "P1"],
    ["A1.t", 1, "forma", "P1", "infundado", "fondo_desestimado", "", "desarrolla", "precedente", "con_el_principal", "A1.a", "P1"],
    ["A1.u", 1, "fondo", "P1", "infundado", "fondo_desestimado", "", "desarrolla", "", "con_el_principal", "A1.a", "P1"],
    ["A1.v", 1, "procesal", "P1", "infundado", "fondo_desestimado", "", "desarrolla", "precedente", "con_el_principal", "A1.a", "P1"],
    ["A1.w", 1, "procesal", "P1", "infundado", "fondo_desestimado", "", "desarrolla", "precedente", "con_el_principal", "A1.a", "P1"],
    ["A1.x", 1, "fondo", "P2", "infundado", "fondo_desestimado", "", "desarrolla", "", "con_el_principal", "A1.a", "P1"],
    ["A2.a", 2, "omision", "P4", "infundado", "omision_inexistente", "", "remite", "", "decide", "", ""],
]);
export const P462_FUNDADO = deFilas({
    version: "plan-4", tipo_asunto: "amparo_revision",
    problemas: [{"id": 1, "sentido": "fundado", "jerarquia": "principal"}, {"id": 2, "sentido": "innecesario", "jerarquia": "accesorio"}],
    unidades: [{"id": "U1", "problemas": [1], "segmentos": ["A1.a"], "premisa": "M1"}, {"id": "U7", "problemas": [1], "segmentos": ["A1.b", "A1.i", "A1.u"], "premisa": "M1"}, {"id": "U8", "problemas": [1], "segmentos": ["A1.d", "A1.e", "A1.f", "A1.g", "A1.x"], "premisa": "M2"}, {"id": "U9", "problemas": [1], "segmentos": ["A1.h"], "premisa": "M2"}, {"id": "U3", "problemas": [1], "segmentos": ["A1.j", "A1.l"], "premisa": null}, {"id": "U10", "problemas": [1], "segmentos": ["A1.n", "A1.o"], "premisa": null}, {"id": "U5", "problemas": [1], "segmentos": ["A1.v"], "premisa": null}, {"id": "U6", "problemas": [2], "segmentos": ["A2.a"], "premisa": "M3"}],
    jerarquia: [{"problema": 1, "decide": "A1.a", "raiz": "P1", "con_el_principal": ["A1.d", "A1.e", "A1.f", "A1.g", "A1.h", "A1.j", "A1.l", "A1.n", "A1.o", "A1.v", "A1.x"], "innecesario": ["A1.c", "A1.k", "A1.m", "A1.p", "A1.q", "A1.r", "A1.s", "A1.t", "A1.w"], "deriva": []}],
}, [
    ["A1.a", 1, "fondo", "P1", "fundado", "fundado", "", "aplica", "consecuencia", "decide", "", ""],
    ["A1.b", 1, "fondo", "P1", "fundado_insuficiente", "fundado_insuficiente", "", "aplica", "consecuencia", "autonomo", "", ""],
    ["A1.c", 1, "fondo", "P2", "innecesario", "innecesario_por_suficiencia", "", "no_se_estudia", "precedente", "innecesario", "A1.a", "P1"],
    ["A1.d", 1, "fondo", "P3", "fundado", "fundado", "", "aplica", "norma", "con_el_principal", "A1.a", "P1"],
    ["A1.e", 1, "fondo", "P3", "fundado", "fundado", "", "remite", "norma", "con_el_principal", "A1.a", "P1"],
    ["A1.f", 1, "fondo", "P3", "fundado", "fundado", "", "aplica", "prueba", "con_el_principal", "A1.a", "P1"],
    ["A1.g", 1, "fondo", "P3", "fundado", "fundado", "", "aplica", "norma", "con_el_principal", "A1.a", "P1"],
    ["A1.h", 1, "fondo", "P2", "fundado", "fundado", "", "remite", "norma", "con_el_principal", "A1.a", "P1"],
    ["A1.i", 1, "fondo", "P1", "fundado_insuficiente", "fundado_insuficiente", "", "remite", "consecuencia", "autonomo", "", ""],
    ["A1.j", 1, "fondo", "P1", "fundado", "fundado", "", "desarrolla", "precedente", "con_el_principal", "A1.a", "P1"],
    ["A1.k", 1, "forma", "P1", "innecesario", "innecesario_por_suficiencia", "", "no_se_estudia", "", "innecesario", "A1.a", "P1"],
    ["A1.l", 1, "fondo", "P1", "fundado", "fundado", "", "desarrolla", "prueba", "con_el_principal", "A1.a", "P1"],
    ["A1.m", 1, "forma", "P1", "innecesario", "innecesario_por_suficiencia", "", "no_se_estudia", "norma", "innecesario", "A1.a", "P1"],
    ["A1.n", 1, "fondo", "P1", "fundado", "fundado", "", "remite", "norma", "con_el_principal", "A1.a", "P1"],
    ["A1.o", 1, "fondo", "P1", "fundado", "fundado", "", "desarrolla", "precedente", "con_el_principal", "A1.a", "P1"],
    ["A1.p", 1, "forma", "P3", "innecesario", "innecesario_por_suficiencia", "", "no_se_estudia", "norma", "innecesario", "A1.a", "P1"],
    ["A1.q", 1, "forma", "P1", "innecesario", "innecesario_por_suficiencia", "", "no_se_estudia", "norma", "innecesario", "A1.a", "P1"],
    ["A1.r", 1, "forma", "P1", "innecesario", "innecesario_por_suficiencia", "", "no_se_estudia", "precedente", "innecesario", "A1.a", "P1"],
    ["A1.s", 1, "forma", "P1", "innecesario", "innecesario_por_suficiencia", "", "no_se_estudia", "precedente", "innecesario", "A1.a", "P1"],
    ["A1.t", 1, "forma", "P1", "innecesario", "innecesario_por_suficiencia", "", "no_se_estudia", "precedente", "innecesario", "A1.a", "P1"],
    ["A1.u", 1, "fondo", "P1", "fundado_insuficiente", "fundado_insuficiente", "", "remite", "consecuencia", "autonomo", "", ""],
    ["A1.v", 1, "fondo", "P1", "fundado", "fundado", "", "desarrolla", "precedente", "con_el_principal", "A1.a", "P1"],
    ["A1.w", 1, "procesal", "P1", "innecesario", "innecesario_por_suficiencia", "", "no_se_estudia", "procesal", "innecesario", "A1.a", "P1"],
    ["A1.x", 1, "fondo", "P3", "fundado", "fundado", "", "aplica", "prueba", "con_el_principal", "A1.a", "P1"],
    ["A2.a", 2, "forma", "P5", "innecesario", "innecesario_mayor_beneficio", "", "no_se_estudia", "", "", "", ""],
]);

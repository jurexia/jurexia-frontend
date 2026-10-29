#!/usr/bin/env python3
"""La API REAL para la prueba de la red que retiene. La lanza `prueba.mts`.

  · /analyze-document: la ruta de main.py tal cual, con su respaldo.
  · /_prueba/chat: un /chat de mentira con EL MISMO respaldo que /chat
    (`respuesta_guardada.con_respaldo`), para detener una consulta a la mitad.

Sin arranque: uvicorn con lifespan="off" (el lifespan borra las cachés de
Gemini de producción). Supabase es el de mentira de la prueba, por HTTP
(base-falsa.mts); el motor y el acervo, de mentira. Sin red y sin gasto.

    <api>/.venv/bin/python servidor_api.py <carpeta-de-la-api> <url-de-la-base> <puerto>
"""
import asyncio
import json
import os
import sys
import types
import urllib.request

API, BASE, PUERTO = sys.argv[1], sys.argv[2], int(sys.argv[3])
ESPERA_MOTOR = float(os.environ.get("ESPERA_MOTOR", "85"))
sys.path.insert(0, API)
os.chdir(API)

# Ni una credencial de producción. main.py busca el .env SUBIENDO directorios,
# y desde un worktree encuentra el del checkout principal: no se lee ninguno, y
# las llaves van falsas a la fuerza, como en test_acceso_platinum.py.
import dotenv  # noqa: E402
dotenv.load_dotenv = lambda *a, **k: False
for _k in ("OPENAI_API_KEY", "OPENROUTER_API_KEY", "DEEPSEEK_API_KEY", "GEMINI_API_KEY",
           "MISTRAL_API_KEY", "ELEVENLABS_API_KEY", "AZURE_DOCINT_KEY", "AZURE_SPEECH_KEY"):
    os.environ[_k] = "falsa-para-pruebas"
os.environ.update(QDRANT_URL="http://127.0.0.1:9", QDRANT_API_KEY="",
                  SUPABASE_URL="", SUPABASE_SERVICE_KEY="")

import main  # noqa: E402

if main.supabase_admin is not None:
    sys.exit("main.py cargó un Supabase de verdad: la prueba no sigue")
import respuesta_guardada as rg  # noqa: E402
import uvicorn  # noqa: E402
from fastapi import Request  # noqa: E402
from starlette.responses import StreamingResponse  # noqa: E402


def _a_la_base(cuerpo, ruta="/consulta"):
    req = urllib.request.Request(BASE + ruta, data=json.dumps(cuerpo).encode("utf-8"),
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=20) as r:
        return json.loads(r.read())


class _Consulta:
    def __init__(self, tabla, op="select", args=None):
        self.c = {"tabla": tabla, "op": op, "filtros": [], "args": args}

    def select(self, columnas="*", count=None):
        self.c["columnas"] = columnas
        self.c["contar"] = count == "exact"
        return self

    def upsert(self, valores, on_conflict=None):
        self.c.update(op="upsert", valores=valores, enConflicto=on_conflict)
        return self

    def update(self, valores):
        self.c.update(op="update", valores=valores)
        return self

    def insert(self, valores):
        self.c.update(op="insert", valores=valores)
        return self

    def eq(self, col, valor):
        self.c["filtros"].append([col, "eq", valor])
        return self

    def limit(self, n):
        self.c["limite"] = n
        return self

    def execute(self):
        r = _a_la_base(self.c)
        if r.get("error"):
            raise RuntimeError(r["error"]["message"])
        return types.SimpleNamespace(data=r.get("data") if r.get("data") is not None else [], count=r.get("count"))


def _usuario(token):
    uid = _a_la_base({"token": token}, "/usuario").get("id")
    if not uid:
        raise RuntimeError("token inválido")
    return types.SimpleNamespace(user=types.SimpleNamespace(id=uid))


class _SupabaseDePrueba:
    auth = types.SimpleNamespace(get_user=lambda token: _usuario(token))

    def table(self, nombre):
        return _Consulta(nombre)

    def rpc(self, nombre, args=None):
        return _Consulta(nombre, "rpc", args or {})


_sb = _SupabaseDePrueba()
main.supabase_admin = _sb
rg.configurar(_sb)


async def _sin_acervo(*a, **k):
    return []

main.hybrid_search_all_silos = _sin_acervo


# ── El motor: calla ESPERA_MOTOR segundos y luego escribe ─────────────────

ANALISIS = [
    "## Los agravios de la recurrente\n\n",
    "La recurrente hace valer tres agravios contra la sentencia de primera instancia.\n\n",
    "**Primero.** Combate la valoración de la prueba testimonial: sostiene que el juzgador ",
    "omitió las contradicciones de los declarantes sobre la fecha y el lugar del acto.\n\n",
    "**Segundo.** Alega la incompetencia por territorio, porque el domicilio de la demandada ",
    "está en Apizaco y no en la capital.\n\n",
    "**Tercero.** Reclama la negativa a desahogar la pericial en grafoscopía.\n",
]


def _trozo(texto=None, fin=None):
    delta = types.SimpleNamespace(content=texto)
    return types.SimpleNamespace(choices=[types.SimpleNamespace(delta=delta, finish_reason=fin, model_extra={})])


class _Motor:
    def __init__(self):
        self.chat = types.SimpleNamespace(completions=types.SimpleNamespace(create=self._create))

    async def _create(self, **kw):
        async def gen():
            await asyncio.sleep(ESPERA_MOTOR)
            for t in ANALISIS:
                yield _trozo(t)
                await asyncio.sleep(0.02)
            yield _trozo(None, "stop")
        return gen()


main._via_documento = lambda modelo, esfuerzo=None: (_Motor(), {})


# ── /chat de mentira con el respaldo de /chat ──────────────────────────────

@main.app.post("/_prueba/chat")
async def _chat_de_prueba(request: Request):
    d = await request.json()

    async def flujo():
        yield "<!--PING-->"
        await asyncio.sleep(float(d.get("espera", 30)))
        for t in d.get("trozos", []):
            yield t
            await asyncio.sleep(0.01)

    return StreamingResponse(
        rg.con_respaldo(flujo(), authorization=request.headers.get("authorization"),
                        peticion_id=d.get("peticion_id"), conversation_id=d.get("conversation_id"),
                        expediente_id=None, pregunta=d.get("pregunta", ""), estado=d.get("estado")),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


@main.app.get("/_prueba/vivo")
async def _vivo():
    return {"ok": True}


@main.app.get("/_prueba/pdf")
async def _pdf():
    """Un escrito de agravios de dos hojas, con texto seleccionable (sin OCR)."""
    import fitz
    from starlette.responses import Response
    d = fitz.open()
    parrafo = ("PRIMER AGRAVIO. La sentencia recurrida valoró indebidamente la prueba testimonial "
               "ofrecida por la parte actora, pues omitió considerar las contradicciones en que "
               "incurrieron los declarantes respecto de la fecha, el lugar y las circunstancias del "
               "acto reclamado. SEGUNDO AGRAVIO. El juzgador de origen carecía de competencia por razón "
               "de territorio, ya que el domicilio de la demandada se ubica en Apizaco, Tlaxcala, y no "
               "en la capital del estado como erróneamente se asentó en el auto admisorio. TERCERO. "
               "Se violaron las formalidades esenciales del procedimiento al negarse el desahogo de la "
               "pericial en materia de grafoscopía ofrecida oportunamente.")
    for i in range(2):
        p = d.new_page()
        p.insert_textbox(fitz.Rect(50, 50, 550, 800), f"Hoja {i + 1}. " + parrafo, fontsize=10)
    return Response(d.tobytes(), media_type="application/pdf")


print(f"API de prueba en :{PUERTO} · motor de mentira que calla {ESPERA_MOTOR:.0f} s", flush=True)
uvicorn.run(main.app, host="127.0.0.1", port=PUERTO, lifespan="off", log_level="warning")

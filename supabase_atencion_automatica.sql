-- ════════════════════════════════════════════════════════════════════════
-- Atención automática de soporte (2-nov-2026). SIN APLICAR: la aplica David.
-- ════════════════════════════════════════════════════════════════════════
-- POR QUÉ
--   La auditoría del 2-nov: 90 casos de soporte en 14 días, casi ninguno
--   resuelto sin una persona, y la respuesta real tardó una mediana de 4.8
--   días. La mayoría tenía una respuesta que ya está escrita: dónde se hace
--   una consulta jurídica, cómo se usa algo, qué pasó con un pago o con una
--   sesión. El cron /api/cron/atencion los diagnostica y, cuando David lo
--   encienda, les contesta con una plantilla que él aprobó.
--
-- QUÉ TRAE
--   1. plantillas_soporte — el texto exacto de cada plantilla y su sha256. El
--      cron sólo manda una plantilla si su hash está aquí con aprobada_at y
--      aprobada_por. Entra SIN APROBAR: aprobarla es el paso 6.
--   2. atencion_casos — una fila por reporte diagnosticado: el diagnóstico,
--      los hechos, el correo que se mandaría y qué pasó con él. Su
--      disparador rechaza reclamar un envío fuera del modo «enviar» o con una
--      plantilla sin aprobar: la base también lo garantiza, no sólo el código.
--   3. correo_canonico() y cuentas_mismo_correo() — otras cuentas del mismo
--      buzón de Gmail (con puntos o con +etiqueta). Medido el 2-nov: 0 grupos
--      así en user_profiles; la función queda para cuando aparezcan.
--   4. auth_resumen_usuario() — inicios, renovaciones y revocaciones de un
--      usuario, y el máximo por minuto (ver su comentario).
--
-- SIN ESTA MIGRACIÓN el código desplegado no se rompe: el cron devuelve
-- { sinTabla: 'atencion_casos' } y no diagnostica ni escribe nada.
--
-- RLS activado y SIN políticas en las tablas; las funciones, sólo para
-- service_role (revoke a public, anon y authenticated: el 22-sep dos
-- funciones quedaron abiertas a la clave pública por no hacerlo).
-- ════════════════════════════════════════════════════════════════════════

begin;

-- ─── 1. plantillas_soporte ──────────────────────────────────────────────

create table if not exists public.plantillas_soporte (
    id            text not null check (id ~ '^T[1-8]$'),
    version       integer not null check (version > 0),
    sha256        text not null check (sha256 ~ '^[0-9a-f]{64}$'),
    -- El texto canónico de la plantilla: asunto, cuerpo, fragmentos, variables
    -- y lo común (saludos, firma, pie). Es lo que se aprueba.
    texto         text not null,
    creada_at     timestamptz not null default now(),
    aprobada_at   timestamptz,
    aprobada_por  text,
    primary key (id, version),
    unique (sha256),
    -- El hash ES el de su texto: no se puede aprobar un hash con otro texto al lado.
    constraint plantillas_soporte_hash_del_texto
        check (sha256 = encode(sha256(convert_to(texto, 'UTF8')), 'hex')),
    constraint plantillas_soporte_aprobacion_completa
        check ((aprobada_at is null) = (aprobada_por is null))
);

alter table public.plantillas_soporte enable row level security;
revoke all on table public.plantillas_soporte from anon, authenticated;

comment on table public.plantillas_soporte is
    'Plantillas de la atención automática de soporte (T1–T8). El cron sólo manda las que tienen aprobada_at y aprobada_por para su sha256 exacto. Sólo service role.';

-- ─── 2. atencion_casos ──────────────────────────────────────────────────

create table if not exists public.atencion_casos (
    folio                 text primary key references public.reportes_soporte(folio) on delete cascade,
    user_id               uuid,
    user_email            text,
    canal                 text not null default 'chat' check (canal in ('chat', 'correo')),
    tipo                  text not null,          -- consulta-juridica | como-se-usa | … | acuse | humano
    clasificado           text not null,          -- lo que leyó el clasificador antes de mirar los hechos
    regla                 text,
    diagnostico           text not null,          -- una frase
    accion                text not null,          -- qué se hace, o qué tiene que hacer una persona
    plantilla_id          text,
    plantilla_version     integer,
    plantilla_sha256      text,
    borrador              boolean not null default false,  -- el correo es un borrador para el parte: no se manda
    variables             jsonb not null default '{}'::jsonb,
    hechos                jsonb not null default '{}'::jsonb,
    confianza             numeric(3,2) not null check (confianza between 0 and 1),
    modo                  text not null check (modo in ('simulacro', 'enviar')),
    turnos_diagnosticados integer not null default 1,
    mensaje               text,                   -- lo que escribió el abogado (para el parte)
    correo_asunto         text,
    correo_texto          text,
    envio_estado          text not null default 'no-se-envia'
                          check (envio_estado in ('no-se-envia', 'por-enviar', 'enviando', 'enviado', 'fallido')),
    envio_motivo          text,                   -- por qué no se mandó: simulacro, plantilla sin aprobar…
    envio_reclamado_at    timestamptz,            -- se reclama ANTES de mandar: un correo por caso
    correo_enviado_at     timestamptz,
    correo_resend_id      text,
    correo_error          text,
    parte_at              timestamptz,            -- cuándo salió en el parte a David
    diagnosticado_at      timestamptz not null default now(),
    constraint atencion_casos_enviado_con_plantilla
        check (correo_enviado_at is null or (plantilla_sha256 is not null and envio_reclamado_at is not null))
);

create index if not exists atencion_casos_sin_parte_ix
    on public.atencion_casos (diagnosticado_at) where parte_at is null;
create index if not exists atencion_casos_parte_ix
    on public.atencion_casos (parte_at desc) where parte_at is not null;
create index if not exists atencion_casos_enviados_ix
    on public.atencion_casos (correo_enviado_at desc, user_email) where correo_enviado_at is not null;

alter table public.atencion_casos enable row level security;
revoke all on table public.atencion_casos from anon, authenticated;

comment on table public.atencion_casos is
    'Diagnóstico automático de cada reporte de soporte y el correo que se le mandó o se le mandaría. Un caso, un correo como mucho. Sólo service role.';

/* EL CANDADO DE LA BASE. Reclamar un envío (envio_reclamado_at de nulo a una
   hora) es lo último antes de llamar a Resend. Se rechaza si el caso no se
   diagnosticó en modo «enviar» o si su plantilla, en esa versión y con ese
   hash, no está aprobada. Aunque el código tuviera un error, la base no deja
   pasar el reclamo y el código no manda nada sin reclamo. */
create or replace function public.atencion_casos_reclamo_aprobado()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    if new.envio_reclamado_at is not null
       and (tg_op = 'INSERT' or old.envio_reclamado_at is null) then
        if new.modo <> 'enviar' then
            raise exception 'atencion_casos %: no se reclama un envío en modo %', new.folio, new.modo;
        end if;
        if not exists (
            select 1 from public.plantillas_soporte p
            where p.sha256 = new.plantilla_sha256
              and p.id = new.plantilla_id
              and p.version = new.plantilla_version
              and p.aprobada_at is not null
              and coalesce(btrim(p.aprobada_por), '') <> ''
        ) then
            raise exception 'atencion_casos %: la plantilla % v% (%) no está aprobada',
                new.folio, new.plantilla_id, new.plantilla_version, left(coalesce(new.plantilla_sha256, ''), 12);
        end if;
    end if;
    return new;
end
$$;

revoke all on function public.atencion_casos_reclamo_aprobado() from public, anon, authenticated;

drop trigger if exists atencion_casos_reclamo_aprobado on public.atencion_casos;
create trigger atencion_casos_reclamo_aprobado
    before insert or update of envio_reclamado_at on public.atencion_casos
    for each row execute function public.atencion_casos_reclamo_aprobado();

-- ─── 3. el mismo buzón de Gmail ─────────────────────────────────────────

/* «juan.perez+iurexia@gmail.com» y «juanperez@gmail.com» llegan a la misma
   bandeja; para Iurexia son dos cuentas. Fuera de Gmail no se toca nada: allá
   los puntos sí cuentan. Es la misma regla que `correoCanonico` de
   src/lib/soporte/diagnostico-reglas.ts. */
create or replace function public.correo_canonico(p text)
returns text
language sql
immutable
set search_path = ''
as $$
    select case
        when split_part(lower(btrim(p)), '@', 2) in ('gmail.com', 'googlemail.com')
            then replace(split_part(split_part(lower(btrim(p)), '@', 1), '+', 1), '.', '') || '@gmail.com'
        else lower(btrim(p))
    end
$$;

create or replace function public.cuentas_mismo_correo(p_correo text)
returns table (id uuid, email text, subscription_type text)
language sql
stable
security definer
set search_path = ''
as $$
    select u.id, u.email, u.subscription_type
    from public.user_profiles u
    where public.correo_canonico(u.email) = public.correo_canonico(p_correo)
    limit 10
$$;

revoke all on function public.correo_canonico(text) from public, anon, authenticated;
revoke all on function public.cuentas_mismo_correo(text) from public, anon, authenticated;
grant execute on function public.correo_canonico(text) to service_role;
grant execute on function public.cuentas_mismo_correo(text) to service_role;

-- ─── 4. las sesiones de un usuario ──────────────────────────────────────

/* AUTH_RESUMEN_USUARIO(usuario, desde) → jsonb, medido el 2-nov-2026.

   NO lee auth.audit_log_entries: en este proyecto está VACÍA (0 filas; los
   eventos de auth sólo van al flujo de registros, que la app no puede
   consultar). Lee lo que sí guarda la base: auth.sessions (un inicio = una
   sesión nueva) y auth.refresh_tokens (cada renovación crea un token hijo y
   revoca al padre).

   Las dos señales que separa, con los casos de ese día:
     · RÁFAGA (reloj del equipo adelantado): 42 renovaciones en un minuto, 140
       en doce, cada token revocado a los 0.14 s de nacer (vida_mediana_s).
       En cuatro días nadie más pasó de 2 por minuto, y la vida mediana de los
       demás fue de 3,463 s en adelante: la hora del token de acceso.
     · SESIÓN QUE NO SE RENUEVA («me saca cada hora»): 5 inicios en 6 h, cada
       uno con un solo token sin rotar y refreshed_at nulo
       (inicios_sin_renovar = inicios, renovaciones = 0).
   Las reglas que lo leen están en src/lib/soporte/diagnostico-reglas.ts
   (`senalDeSesion`). */
create or replace function public.auth_resumen_usuario(p_user uuid, p_desde timestamptz)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
    with ses as (
        select s.id, s.created_at, (s.refreshed_at at time zone 'UTC') as renovada_at, s.user_agent
        from auth.sessions s
        where s.user_id = p_user
          and (s.created_at >= p_desde or s.updated_at >= p_desde
               or (s.refreshed_at is not null and (s.refreshed_at at time zone 'UTC') >= p_desde))
    ), tok as (
        select r.session_id, r.created_at, r.updated_at, r.revoked, r.parent
        from auth.refresh_tokens r
        where r.session_id in (select id from ses)
          and (r.created_at >= p_desde or (r.revoked and r.updated_at >= p_desde))
    ), por_sesion as (
        select s.id, s.created_at, s.renovada_at,
               (select count(*) from auth.refresh_tokens r where r.session_id = s.id) as tokens
        from ses s
        where s.created_at >= p_desde
    ), por_minuto as (
        select date_trunc('minute', t.created_at) as minuto, count(*) as n, count(distinct t.session_id) as sesiones
        from tok t
        where t.created_at >= p_desde
        group by 1
    ), pico as (
        select minuto, n, sesiones from por_minuto order by n desc, minuto limit 1
    )
    select jsonb_build_object(
        'fuente', 'auth.sessions + auth.refresh_tokens',
        'desde', p_desde,
        'inicios', (select count(*) from por_sesion),
        'inicios_sin_renovar', (select count(*) from por_sesion where tokens <= 1 and renovada_at is null),
        'horas_entre_inicios', coalesce((select round((extract(epoch from max(created_at) - min(created_at)) / 3600)::numeric, 2) from por_sesion), 0),
        'renovaciones', (select count(*) from tok where created_at >= p_desde and parent is not null),
        'revocaciones', (select count(*) from tok where revoked and updated_at >= p_desde),
        'max_por_minuto', coalesce((select n from pico), 0),
        'minuto_pico', (select minuto from pico),
        'sesiones_en_pico', coalesce((select sesiones from pico), 0),
        'vida_mediana_s', (select round(percentile_cont(0.5) within group (order by extract(epoch from (updated_at - created_at)))::numeric, 2)
                           from tok where revoked and updated_at >= p_desde),
        'sesiones_activas', (select count(*) from ses),
        'agentes', (select count(distinct user_agent) from ses where created_at >= p_desde),
        'ultimo_inicio', (select max(created_at) from ses)
    )
$$;

revoke all on function public.auth_resumen_usuario(uuid, timestamptz) from public, anon, authenticated;
grant execute on function public.auth_resumen_usuario(uuid, timestamptz) to service_role;

-- ─── 5. las plantillas, SIN APROBAR ─────────────────────────────────────
-- Generado por `node scripts/atencion-vistas-previas.mts --migracion` desde
-- src/lib/soporte/plantillas-atencion.ts: el texto es el canónico y el hash el
-- suyo (la restricción plantillas_soporte_hash_del_texto lo vuelve a calcular).

-- SEMILLA (generada; no editar a mano)
insert into public.plantillas_soporte (id, version, sha256, texto) values
    ('T1', 1, 'd95076ad33cc273de5670431752a872828967b6fbeaf59cc55dd4fec7d80bfbe', $plantilla_T1_v1$PLANTILLA T1 · versión 1 · Consulta jurídica en la caja de soporte

ASUNTO: Soporte Iurexia · folio {{folio}} · dónde se hacen las consultas jurídicas

PREENCABEZADO: Su pregunta jurídica tiene su lugar: la caja de consulta del chat.

TÍTULO: Dónde se hace su consulta jurídica

CUERPO:
{{saludo}}

{{apertura}}

{{situacion}}

{{nota_folio}}

[boton] Ir a la caja de consulta | https://www.iurexia.com/chat

Si esto no resuelve su caso, responda a este correo: llega al equipo de soporte con su folio.

FRAGMENTO apertura.chat:
Le escribimos por el mensaje que dejó en el botón «Soporte» de Iurexia. Ese botón atiende dudas y fallas de la plataforma, así que ahí su pregunta jurídica no recibe el análisis que merece. Las consultas se escriben en la caja de consulta del chat, la caja grande al centro de la pantalla: ahí Iurexia le responde con leyes y jurisprudencia, y cada cita abre su fuente oficial.

FRAGMENTO apertura.correo:
Le escribimos por su correo a soporte. Este buzón atiende dudas y fallas de la plataforma, así que por aquí no podemos analizar su asunto. Las consultas se escriben en la caja de consulta del chat de Iurexia: ahí la plataforma le responde con leyes y jurisprudencia, y cada cita abre su fuente oficial.

FRAGMENTO nota_folio.si:
Una aclaración sobre el número que le dio el asistente de soporte, {{folio}}: es el folio de su reporte. Sirve para darle seguimiento, y no hay que anotarlo ni anexarlo en ninguna parte.

FRAGMENTO situacion.con-consultas:
Consultas disponibles hoy en su cuenta: {{consultas_restantes}}. Entre a [www.iurexia.com/chat](https://www.iurexia.com/chat) y escriba ahí su pregunta; si necesita un escrito, pídalo igual, por ejemplo: «Redacta una demanda de…».

FRAGMENTO situacion.sin-consultas:
Las consultas de su plan de este periodo ya se usaron. Mientras se renuevan, la versión básica del chat le sigue respondiendo con criterios del Semanario Judicial de la Federación y su registro digital. Si necesita el análisis completo —con leyes, documentos y escritos—, los planes están en [www.iurexia.com/precios](https://www.iurexia.com/precios).

FRAGMENTO situacion.sin-cuenta:
Para hacerlo necesita una cuenta: entre a [www.iurexia.com](https://www.iurexia.com) y regístrese con su correo. El registro es gratuito y no pide tarjeta.

VARIABLES: apertura (fragmento), consultas_restantes (numero, opcional), fecha_reporte (fecha), folio (folio), nota_folio (fragmento, opcional), saludo (saludo), situacion (fragmento)

REFERENCIA: Referencia: su mensaje a soporte del {{fecha_reporte}} · folio {{folio}}
SALUDOS: Estimada licenciada {nombre}: | Estimado licenciado {nombre}: | Apreciable Lic. {nombre}: | Estimada, estimado:
DESPEDIDA: Atentamente,
FIRMA: Soporte de Iurexia
REMITENTE: Soporte de Iurexia <soporte@iurexia.com> · RESPONDER A: soporte@iurexia.com
PIE: Soporte de Iurexia · soporte@iurexia.com · Puede responder directamente a este correo.$plantilla_T1_v1$),
    ('T2', 1, '3f18abecb227e96f1cd61836b1f2c8c90f9b3a7c9f3e4b21cba88e7a6627d3d4', $plantilla_T2_v1$PLANTILLA T2 · versión 1 · Cómo se usa

ASUNTO: Soporte Iurexia · folio {{folio}} · cómo se hace en la plataforma

PREENCABEZADO: Los pasos, y el capítulo del tutorial donde se ve.

TÍTULO: Cómo se hace en Iurexia

CUERPO:
{{saludo}}

Con gusto le explicamos. Aquí tiene los pasos y, cuando lo hay, el capítulo del tutorial donde se ve en la plataforma.

{{secciones}}

Si esto no resuelve su caso, responda a este correo: llega al equipo de soporte con su folio.

FRAGMENTO secciones.agenda:
## Cómo usar la agenda de términos

· Abra «Agenda», en la barra de arriba, o [www.iurexia.com/agenda](https://www.iurexia.com/agenda), y pulse «Nuevo término».
· Pegue el acuerdo y pulse «Leer el acuerdo»: le propone qué hay que hacer, el código que rige y el vencimiento calculado, y usted lo puede corregir. También puede capturarlo a mano: expediente, juzgado o tribunal, fecha y tipo de notificación.
· En «Avisarme por correo» elija con cuántos días de anticipación quiere el aviso. Los avisos salen cada mañana a las 7:00, hora de la Ciudad de México.

[video] Agenda y plazos (3:25) | https://www.iurexia.com/tutorial?t=205.23

FRAGMENTO secciones.boveda:
## Cómo usar la Bóveda

· La Bóveda es del plan Platinum y de los planes que lo incluyen. Vive dentro de cada carpeta.
· Suba ahí los documentos del expediente, hasta 500 por carpeta.
· Pregunte al expediente completo: cada respuesta cita el documento y la página. En las tablas de revisión, cada documento es una fila y cada pregunta una columna, con la cita literal verificada.

[video] Bóveda (2:46) | https://www.iurexia.com/tutorial?t=166.4

FRAGMENTO secciones.carpetas:
## Cómo crear y usar sus carpetas

· Entre a «Mi trabajo», en la barra de arriba, o directamente a [www.iurexia.com/carpetas](https://www.iurexia.com/carpetas), y cree una carpeta nueva.
· Elija el tipo —Cliente, Asunto o juicio, Proyecto académico o Documento legal— y escriba su objetivo.
· Suba los documentos del asunto; cada documento que sube cuenta una consulta.
· En «Lo que ve Iurexia» está el análisis de la carpeta; actualizarlo cuenta una consulta.
· Con «Nueva consulta aquí» pregunta con el expediente a la vista, y la consulta queda guardada en la carpeta.

[video] Carpetas inteligentes (0:58) | https://www.iurexia.com/tutorial?t=58.73

FRAGMENTO secciones.consulta:
## Cómo hacer una consulta

· En [www.iurexia.com/chat](https://www.iurexia.com/chat) escriba su consulta en la caja del centro, o pida un escrito: «Redacta una demanda de…». Enter envía; Mayús+Enter salta de línea.
· Con «Fuentes», abajo a la izquierda, elige dónde busca: Bloque de constitucionalidad, Jurisprudencia nacional, Leyes federales y Leyes estatales. Desde el plan Pro suma Internet, con sitios oficiales.
· Si pide un escrito, «Esfuerzo» elige con qué fuerza se redacta.
· Cada respuesta trae sus fuentes, y cada cita abre la suya para que la verifique.

[video] La consulta: fuentes y esfuerzo (0:20) | https://www.iurexia.com/tutorial?t=20.2

FRAGMENTO secciones.contador:
## Cuántas consultas le quedan

· El contador «usadas/límite» está arriba a la derecha; en pantallas angostas se oculta para dejar sitio.
· También lo ve en el menú de su foto, arriba a la derecha, y en su perfil, pestaña «Plan y pagos».
· Las consultas del plan se cuentan por mes.

FRAGMENTO secciones.documento:
## Cómo pedir el análisis de un documento

· En la caja de consulta del chat pulse el clip, o arrastre el archivo a la ventana. Se adjunta un documento por consulta: PDF o Word (.doc o .docx).
· Escriba qué necesita del documento —un resumen, los riesgos, una contestación— y envíe.
· Cada plan lee hasta cierto número de hojas; si su documento tiene más, divídalo y adjunte cada parte en su propia consulta.

FRAGMENTO secciones.entidad:
## La entidad y el derecho federal

· El botón con el nombre de su entidad, en la barra de arriba (en el teléfono, dentro de «Más»), dice qué leyes estatales se consultan. Lista las 32 entidades; no hay una opción «Federal».
· Para trabajar sólo con derecho federal, abra «Fuentes», abajo a la izquierda de la caja de consulta, y apague «Leyes estatales».
· Su elección de fuentes se queda guardada en ese navegador.

FRAGMENTO secciones.escrito:
## Cómo pedir un escrito

· En la caja de consulta del chat, pídalo con sus datos: «Redacta una demanda de…».
· O use «Escrito legal», en «Desplegar herramientas», bajo la caja: es un formulario para demanda, amparo, impugnación, contrato, petición u oficio y denuncia disciplinaria.
· El texto completo se abre en el panel «Documento», a la derecha. Ahí lo edita, y el botón azul «Word» lo descarga con las citas como notas al pie.

FRAGMENTO secciones.flujos:
## Cómo usar los flujos de trabajo

· En la barra izquierda abra «Flujos de trabajo» y elija uno: amparo indirecto, amparo directo, contestación de demanda, agravios de apelación, revisión de contrato, teoría del caso (penal acusatorio) o investigación y dictamen.
· Describa su encargo: el flujo construye el escrito por pasos, le muestra lo que ya dedujo y le pide lo que falta.
· Iniciar un flujo gasta uno de los flujos del mes y ninguna consulta. Los flujos están disponibles desde el plan Pro.
· Una denuncia, una querella o cualquier otro escrito no es un flujo: se pide en el chat («Redacta…») o con «Escrito legal», en «Desplegar herramientas».

[video] Flujos de trabajo (1:39) | https://www.iurexia.com/tutorial?t=99.7

FRAGMENTO secciones.herramientas:
## Las herramientas

· Bajo la caja de consulta, «Desplegar herramientas» abre seis: Escrito legal, Sentencia, Precedentes, Jurimetría, Cronología y Toulmin.
· Escrito legal es de todos los planes. Las otras cinco son del plan Platinum y de los planes que lo incluyen; en los demás se ven con candado.
· Sentencia audita una resolución ajena frente a los precedentes de su tribunal y entrega una nota exportable a Word; Precedentes busca criterios del Poder Judicial de la Federación; Jurimetría estima el sentido probable de un asunto; Cronología ordena los hechos del expediente con la página de cada uno, y Toulmin construye una demanda o un recurso en cinco pasos.

[video] Herramientas de Platinum (4:45) | https://www.iurexia.com/tutorial?t=285.1

FRAGMENTO secciones.historial:
## Dónde están sus consultas anteriores

· En la barra izquierda. Las que no están en una carpeta aparecen en «Consultas», por fecha; las que movió a una carpeta, dentro de esa carpeta al desplegarla.
· Con más de seis consultas sale arriba un buscador.
· El menú de cada consulta permite renombrarla, moverla a una carpeta o eliminarla.
· En el teléfono, la barra se abre con el botón de menú, arriba a la izquierda.

FRAGMENTO secciones.movil:
## Iurexia en el teléfono

· Abra [www.iurexia.com](https://www.iurexia.com) en el navegador de su teléfono y entre con la misma cuenta: sus consultas y sus carpetas son las mismas que en la computadora.
· La barra izquierda se abre con el botón de menú, arriba a la izquierda, y lo que no cabe en la barra de arriba está en «Más».
· La consulta y el documento se alternan con las pestañas «Consulta» y «Documento».

FRAGMENTO secciones.plan-y-pagos:
## Su plan y sus pagos

· En su perfil, pestaña «Plan y pagos», está su suscripción, con «Actualizar Plan» para cambiarla.
· «Portal de Facturación» abre sus pagos: la tarjeta con la que se cobra y sus comprobantes.
· Ahí mismo se capturan sus datos fiscales.

FRAGMENTO secciones.plantillas:
## Cómo usar sus plantillas

· Suba a «Mis plantillas» el formato de su despacho, en Word.
· Iurexia marca los datos que cambian de un asunto a otro —el nombre del cliente, el domicilio, la fecha— y usted decide de dónde se llena cada uno.
· Desde la carpeta de cualquier cliente elija la plantilla y obtenga el documento lleno, con su membrete, sus estilos y sus tablas, sin gastar consultas.

[video] Mis plantillas (4:06) | https://www.iurexia.com/tutorial?t=246.47

FRAGMENTO secciones.redactor:
## El Redactor PJF

· Es el taller que redacta un proyecto de sentencia a partir del expediente: adelanto, acervo, criterio del secretario y proyecto.
· Es del plan Ultra Secretarios; Platinum no lo incluye. Cada cuenta tiene un proyecto de prueba sin costo y sin tarjeta.
· El botón «Redactor PJF» está en la barra de arriba; en pantallas angostas, dentro de «Más».

FRAGMENTO secciones.seguimiento:
## Cómo dar de alta el seguimiento de un expediente

· En «Mis carpetas», abra la pestaña «Seguimiento ante órganos jurisdiccionales».
· Registre el expediente: el órgano, el tipo de asunto y su número. Por ahora se siguen órganos del Poder Judicial de la Federación.
· Se revisa cada día a las 9:10, hora de la Ciudad de México, y le llega un correo sólo si hay algo nuevo.

FRAGMENTO secciones.tutorial:
## El tutorial de la plataforma

En cinco minutos recorre cada herramienta sobre la plataforma real. Cada capítulo empieza justo donde se explica la función:

· [La consulta: fuentes y esfuerzo (0:20)](https://www.iurexia.com/tutorial?t=20.2)
· [Carpetas inteligentes (0:58)](https://www.iurexia.com/tutorial?t=58.73)
· [Flujos de trabajo (1:39)](https://www.iurexia.com/tutorial?t=99.7)
· [Bóveda (2:46)](https://www.iurexia.com/tutorial?t=166.4)
· [Agenda y plazos (3:25)](https://www.iurexia.com/tutorial?t=205.23)
· [Mis plantillas (4:06)](https://www.iurexia.com/tutorial?t=246.47)
· [Herramientas de Platinum (4:45)](https://www.iurexia.com/tutorial?t=285.1)

VARIABLES: fecha_reporte (fecha), folio (folio), saludo (saludo), secciones (fragmentos)

REFERENCIA: Referencia: su mensaje a soporte del {{fecha_reporte}} · folio {{folio}}
SALUDOS: Estimada licenciada {nombre}: | Estimado licenciado {nombre}: | Apreciable Lic. {nombre}: | Estimada, estimado:
DESPEDIDA: Atentamente,
FIRMA: Soporte de Iurexia
REMITENTE: Soporte de Iurexia <soporte@iurexia.com> · RESPONDER A: soporte@iurexia.com
PIE: Soporte de Iurexia · soporte@iurexia.com · Puede responder directamente a este correo.$plantilla_T2_v1$),
    ('T3', 1, '02072b92b84363093388af60649fd98a561f8c8a3a0197caca4ea89a024052ed', $plantilla_T3_v1$PLANTILLA T3 · versión 1 · Contratar o pagar sin tarjeta

ASUNTO: Soporte Iurexia · folio {{folio}} · cómo contratar su plan

PREENCABEZADO: Los planes, cómo se pagan y cómo se activan.

TÍTULO: Cómo contratar su plan

CUERPO:
{{saludo}}

{{situacion}}

{{sin_tarjeta}}

{{contacto}}

[boton] Ver los planes | https://www.iurexia.com/precios

Si esto no resuelve su caso, responda a este correo: llega al equipo de soporte con su folio.

FRAGMENTO contacto.si:
La atención de soporte es por escrito: en este mismo correo y en el botón «Soporte» de la plataforma, que contesta al momento las dudas de uso.

FRAGMENTO sin_tarjeta.si:
Si prefiere no pagar con tarjeta, también puede hacerlo con un enlace de pago o por transferencia. Respóndanos a este correo con el plan que le interesa y la forma de pago que prefiere, y le enviamos los datos para hacerlo.

FRAGMENTO situacion.cambiar:
Su cuenta tiene hoy el plan {{plan}}. Para cambiarlo, entre a su perfil, pestaña «Plan y pagos», y pulse «Actualizar Plan». Subir de plan es inmediato; bajar aplica en el siguiente ciclo. Lo que incluye cada plan, con sus precios vigentes, está en [www.iurexia.com/precios](https://www.iurexia.com/precios).

FRAGMENTO situacion.contratar:
Con gusto. Los planes, con lo que incluye cada uno y sus precios vigentes, están en [www.iurexia.com/precios](https://www.iurexia.com/precios). Ahí elige el plan y paga con tarjeta de crédito o débito, y el plan se activa en el momento en la cuenta con la que entró.

VARIABLES: contacto (fragmento, opcional), fecha_reporte (fecha), folio (folio), plan (texto, opcional), saludo (saludo), sin_tarjeta (fragmento, opcional), situacion (fragmento)

REFERENCIA: Referencia: su mensaje a soporte del {{fecha_reporte}} · folio {{folio}}
SALUDOS: Estimada licenciada {nombre}: | Estimado licenciado {nombre}: | Apreciable Lic. {nombre}: | Estimada, estimado:
DESPEDIDA: Atentamente,
FIRMA: Soporte de Iurexia
REMITENTE: Soporte de Iurexia <soporte@iurexia.com> · RESPONDER A: soporte@iurexia.com
PIE: Soporte de Iurexia · soporte@iurexia.com · Puede responder directamente a este correo.$plantilla_T3_v1$),
    ('T4', 1, '50135217988bb5e99a11217614ba88cf7e80aad593df687f673feb381bcc01d6', $plantilla_T4_v1$PLANTILLA T4 · versión 1 · Pagué y no se activó (estado verificado)

ASUNTO: Soporte Iurexia · folio {{folio}} · lo que encontramos sobre su pago

PREENCABEZADO: Revisamos su cuenta y su cobro.

TÍTULO: Lo que encontramos sobre su pago

CUERPO:
{{saludo}}

{{estado}}

Si esto no resuelve su caso, responda a este correo: llega al equipo de soporte con su folio.

FRAGMENTO estado.activo:
Revisamos su cuenta: el pago se registró y su plan {{plan}} está activo en la cuenta {{correo_oculto}}. Si la pantalla todavía le muestra el plan anterior, cierre sesión —en el menú de su foto, arriba a la derecha, «Cerrar sesión»— y vuelva a entrar: al entrar de nuevo se carga el plan vigente.

FRAGMENTO estado.otra-cuenta:
Revisamos su cuenta: el plan está activo, pero en otra cuenta, la de {{correo_oculto}}. Es su mismo buzón de correo escrito de otra forma —con puntos o con «+»—, y para Iurexia son dos cuentas distintas. Salga de esta sesión y entre con esa dirección exacta: ahí están su plan, sus consultas y sus carpetas. Si prefiere quedarse con la cuenta con la que nos escribió, respóndanos a este correo y lo vemos con usted.

FRAGMENTO estado.pendiente:
Revisamos su cuenta: el cobro de su plan quedó pendiente y no se completó, así que el plan no se activó. Puede intentarlo de nuevo en [www.iurexia.com/precios](https://www.iurexia.com/precios), con la misma tarjeta o con otra; si su banco le pide confirmar la compra, autorícela en su aplicación. Si prefiere no pagar con tarjeta, respóndanos a este correo y le enviamos los datos para pagar con un enlace de pago o por transferencia.

FRAGMENTO estado.sin-pago:
Revisamos su cuenta, la de {{correo_oculto}}, y no encontramos ningún cobro asociado a ella. Si pagó con otro correo, respóndanos a este correo indicándonos cuál, y lo cotejamos.

FRAGMENTO estado.suspendida:
Revisamos su cuenta: el último cobro de su suscripción fue rechazado por su banco, y por eso la cuenta quedó suspendida. No ha perdido nada: su plan, sus consultas y sus carpetas siguen intactos. Entre a [www.iurexia.com](https://www.iurexia.com) y, en el aviso «Cuenta suspendida por falta de pago», pulse «Actualizar mi método de pago» para dar de alta una tarjeta. Si ya la había dado de alta, basta con volver a entrar: al abrirse el aviso, el cobro se intenta solo con la tarjeta nueva, y en cuanto pasa la cuenta se reactiva.

VARIABLES: correo_oculto (correo-oculto, opcional), estado (fragmento), fecha_reporte (fecha), folio (folio), plan (texto, opcional), saludo (saludo)

REFERENCIA: Referencia: su mensaje a soporte del {{fecha_reporte}} · folio {{folio}}
SALUDOS: Estimada licenciada {nombre}: | Estimado licenciado {nombre}: | Apreciable Lic. {nombre}: | Estimada, estimado:
DESPEDIDA: Atentamente,
FIRMA: Soporte de Iurexia
REMITENTE: Soporte de Iurexia <soporte@iurexia.com> · RESPONDER A: soporte@iurexia.com
PIE: Soporte de Iurexia · soporte@iurexia.com · Puede responder directamente a este correo.$plantilla_T4_v1$),
    ('T5', 1, '5e2c8e830cb79ff6811c7f7a99b39e84baa5a3f98ca5a8afd05364bcbcbcb97b', $plantilla_T5_v1$PLANTILLA T5 · versión 1 · No puedo entrar (según la causa)

ASUNTO: Soporte Iurexia · folio {{folio}} · cómo volver a entrar

PREENCABEZADO: Revisamos los accesos de su cuenta.

TÍTULO: Cómo volver a entrar

CUERPO:
{{saludo}}

{{causa}}

Si esto no resuelve su caso, responda a este correo: llega al equipo de soporte con su folio.

FRAGMENTO causa.contrasena:
Revisamos su cuenta y está activa. En la pantalla de acceso tiene dos caminos que no dependen de recordar la contraseña:

· «Entrar con un código por correo»: le llega un código a su correo y no necesita contraseña.
· «¿Olvidaste tu contraseña?»: le manda un enlace para poner una nueva. Ábralo en el mismo navegador donde lo pidió, porque en otro el enlace falla.

Si creó su cuenta con uno de los botones de acceso rápido, entre con ese mismo botón. Y si entra desde el teléfono, revise que el teclado no haya puesto mayúscula inicial ni un espacio al final de su correo.

FRAGMENTO causa.otra-cuenta:
Revisamos su acceso: con su correo hay dos cuentas en Iurexia, porque {{correo_oculto}} es su mismo buzón escrito de otra forma —con puntos o con «+»—. Si al entrar no ve sus consultas o su plan, salga y entre escribiendo la dirección exactamente como la de la otra cuenta. Lo más rápido es «Entrar con un código por correo», en la pantalla de acceso: le llega un código y no necesita contraseña.

FRAGMENTO causa.reloj:
Revisamos los accesos de su cuenta y su contraseña funciona: cada vez que entra, el acceso se concede, pero la sesión se cierra sola en cuestión de segundos. Eso pasa casi siempre cuando el reloj del equipo no está en hora: la sesión se da por vencida en el mismo segundo en que se abre. Ponga la fecha y la hora en automático, cierre las demás pestañas de Iurexia y vuelva a entrar:

· En Windows: Configuración › Hora e idioma › Fecha y hora › «Establecer la hora automáticamente».
· En Mac: Ajustes del Sistema › General › Fecha y hora › «Ajustar fecha y hora automáticamente».
· En el teléfono: Ajustes › Fecha y hora (en algunos, dentro de General o de Sistema) › hora automática.

FRAGMENTO causa.reloj-desfase:
Revisamos los accesos de su cuenta y su contraseña funciona: cada vez que entra, el acceso se concede. Lo que falla es el reloj de su equipo, que va {{desfase}} respecto de la hora real: con esa diferencia, la sesión se da por vencida en el mismo segundo en que se abre. Ponga la fecha y la hora en automático y vuelva a entrar:

· En Windows: Configuración › Hora e idioma › Fecha y hora › «Establecer la hora automáticamente».
· En Mac: Ajustes del Sistema › General › Fecha y hora › «Ajustar fecha y hora automáticamente».
· En el teléfono: Ajustes › Fecha y hora (en algunos, dentro de General o de Sistema) › hora automática.

FRAGMENTO causa.suspendida:
Su contraseña y su cuenta están bien: lo que ve al entrar es el aviso «Cuenta suspendida por falta de pago», porque el último cobro de su suscripción fue rechazado por su banco. Pulse «Actualizar mi método de pago» y dé de alta una tarjeta: en cuanto el cobro pasa, la cuenta se reactiva sola, con su plan y sus carpetas intactos.

VARIABLES: causa (fragmento), correo_oculto (correo-oculto, opcional), desfase (texto, opcional), fecha_reporte (fecha), folio (folio), saludo (saludo)

REFERENCIA: Referencia: su mensaje a soporte del {{fecha_reporte}} · folio {{folio}}
SALUDOS: Estimada licenciada {nombre}: | Estimado licenciado {nombre}: | Apreciable Lic. {nombre}: | Estimada, estimado:
DESPEDIDA: Atentamente,
FIRMA: Soporte de Iurexia
REMITENTE: Soporte de Iurexia <soporte@iurexia.com> · RESPONDER A: soporte@iurexia.com
PIE: Soporte de Iurexia · soporte@iurexia.com · Puede responder directamente a este correo.$plantilla_T5_v1$),
    ('T6', 1, 'b7301dcb37de70e90cd98d9230136911e061258c7bd0e452be0289cb25be344f', $plantilla_T6_v1$PLANTILLA T6 · versión 1 · Respuesta cortada

ASUNTO: Soporte Iurexia · folio {{folio}} · dónde quedó su respuesta

PREENCABEZADO: Revisamos su consulta que no llegó.

TÍTULO: Dónde quedó su respuesta

CUERPO:
{{saludo}}

{{estado}}

{{devolucion}}

Si su respuesta no aparece, responda a este correo: llega al equipo de soporte con su folio.

FRAGMENTO estado.a-medias:
Tiene razón: su consulta del {{fecha_consulta}} se interrumpió antes de terminar. Lo que alcanzó a escribirse quedó en su conversación; para la respuesta completa, vuelva a enviarla. Si se repite y su red pasa por un proxy o un antivirus que revisa las páginas —algo común en oficinas y tribunales—, pruebe desde otra red, por ejemplo con los datos de su teléfono.

FRAGMENTO estado.en-historial:
Revisamos su consulta del {{fecha_consulta}}: la respuesta se terminó y ya está en su historial. La encuentra en la barra izquierda, en «Consultas» —o dentro de la carpeta donde la hizo—, con esa fecha.

FRAGMENTO estado.recuperable:
Tiene razón: la respuesta no llegó a su pantalla. Revisamos su consulta del {{fecha_consulta}} y la respuesta sí se terminó de escribir: quedó guardada. Abra [www.iurexia.com/chat](https://www.iurexia.com/chat) con su cuenta —en este equipo o en cualquier otro— y aparece sola en su conversación; si ya tenía la página abierta, recárguela.

FRAGMENTO estado.sin-texto:
Tiene razón: su consulta del {{fecha_consulta}} se interrumpió antes de que se escribiera la respuesta. Vuelva a enviarla. Si se repite y su red pasa por un proxy o un antivirus que revisa las páginas —algo común en oficinas y tribunales—, pruebe desde otra red, por ejemplo con los datos de su teléfono.

VARIABLES: devolucion (fragmento, opcional), estado (fragmento), fecha_consulta (fecha-hora), fecha_reporte (fecha), folio (folio), saludo (saludo)

REFERENCIA: Referencia: su mensaje a soporte del {{fecha_reporte}} · folio {{folio}}
SALUDOS: Estimada licenciada {nombre}: | Estimado licenciado {nombre}: | Apreciable Lic. {nombre}: | Estimada, estimado:
DESPEDIDA: Atentamente,
FIRMA: Soporte de Iurexia
REMITENTE: Soporte de Iurexia <soporte@iurexia.com> · RESPONDER A: soporte@iurexia.com
PIE: Soporte de Iurexia · soporte@iurexia.com · Puede responder directamente a este correo.$plantilla_T6_v1$),
    ('T7', 1, 'a08bed88850fc4a402aa4bc453cb7519782447454b322d37d66e90e7477eaacc', $plantilla_T7_v1$PLANTILLA T7 · versión 1 · Documento que no se analizó

ASUNTO: Soporte Iurexia · folio {{folio}} · por qué no se analizó su documento

PREENCABEZADO: Revisamos el documento que no se analizó.

TÍTULO: Su documento sin analizar

CUERPO:
{{saludo}}

{{causa}}

Si esto no resuelve su caso, responda a este correo: llega al equipo de soporte con su folio.

FRAGMENTO causa.cuota:
Su documento no se analizó porque las consultas de su plan de este periodo ya se habían usado, y no se le descontó nada. Los planes están en [www.iurexia.com/precios](https://www.iurexia.com/precios).

FRAGMENTO causa.fallo:
Tiene razón: su documento no se analizó por un fallo de la plataforma, no por el archivo. Vuelva a adjuntarlo con el clip de la caja de consulta y envíelo; si falla de nuevo, responda a este correo con la hora aproximada y el tipo de documento, y lo revisamos.

FRAGMENTO causa.formato:
Su documento no se analizó porque el archivo no se pudo abrir como PDF ni como Word: suele pasar cuando está dañado o cuando su extensión no corresponde a su formato. Ábralo en su procesador de textos, use «Guardar como» › PDF y adjunte ese PDF.

FRAGMENTO causa.hojas:
Su documento no se analizó por su extensión: tiene {{hojas_documento}} hojas y su plan lee hasta {{hojas_plan}}. Puede dividirlo y adjuntar cada parte en su propia consulta; en [www.iurexia.com/precios](https://www.iurexia.com/precios) ve qué plan lo lee completo.

FRAGMENTO causa.red:
Tiene razón: su documento no se analizó, y no fue por el archivo. La conexión se cortó mientras se enviaba el documento o mientras llegaba el análisis. Vuelva a adjuntarlo con el clip de la caja de consulta y envíelo. Si se repite y su red pasa por un proxy o un antivirus que revisa las páginas —algo común en oficinas y tribunales—, pruebe desde otra red, por ejemplo con los datos de su teléfono.

FRAGMENTO causa.sin-rastro:
Revisamos su cuenta y no encontramos el error de su documento. Lo más común es una de tres cosas: que la conexión se cortara al enviarlo (vuelva a adjuntarlo y envíelo), que el archivo no sea PDF ni Word (use «Guardar como» › PDF) o que tenga más hojas de las que lee su plan (divídalo y adjunte cada parte en su propia consulta).

FRAGMENTO causa.tamano:
Su documento no se analizó por su tamaño. Puede dividirlo y adjuntar cada parte en su propia consulta; en [www.iurexia.com/precios](https://www.iurexia.com/precios) ve qué plan lee documentos de ese tamaño.

FRAGMENTO causa.texto:
Su documento no se analizó porque no se pudo leer su texto: suele pasar con escaneos de baja calidad o con imágenes guardadas como PDF. Ábralo y use «Guardar como» › PDF, o escanéelo de nuevo a 300 ppp, y adjunte ese PDF.

VARIABLES: causa (fragmento), fecha_reporte (fecha), folio (folio), hojas_documento (numero, opcional), hojas_plan (numero, opcional), saludo (saludo)

REFERENCIA: Referencia: su mensaje a soporte del {{fecha_reporte}} · folio {{folio}}
SALUDOS: Estimada licenciada {nombre}: | Estimado licenciado {nombre}: | Apreciable Lic. {nombre}: | Estimada, estimado:
DESPEDIDA: Atentamente,
FIRMA: Soporte de Iurexia
REMITENTE: Soporte de Iurexia <soporte@iurexia.com> · RESPONDER A: soporte@iurexia.com
PIE: Soporte de Iurexia · soporte@iurexia.com · Puede responder directamente a este correo.$plantilla_T7_v1$),
    ('T8', 1, 'fd24859b52873e677a15cb1635936f4f0fcf1e91a8f89666aaef1f67b0e2fd59', $plantilla_T8_v1$PLANTILLA T8 · versión 1 · Cancelar (autoservicio)

ASUNTO: Soporte Iurexia · folio {{folio}} · cómo cancelar su suscripción

PREENCABEZADO: Se cancela desde su perfil, en un minuto.

TÍTULO: Cómo cancelar su suscripción

CUERPO:
{{saludo}}

{{estado}}

{{por_peticion}}

Si esto no resuelve su caso, responda a este correo: llega al equipo de soporte con su folio.

FRAGMENTO estado.pasos:
Puede cancelarla usted mismo, en un minuto y sin hablar con nadie:

· Entre a su perfil —también desde el menú de su foto, arriba a la derecha— y abra la pestaña «Plan y pagos».
· En la tarjeta «Mi suscripción», pulse «Cancelar mi suscripción».
· Le preguntará el motivo y, según el caso, le ofrecerá pausar un mes sin cargo; «Cancelar de todas formas» está siempre a la vista.

{{fin}}

FRAGMENTO estado.sin-suscripcion:
Revisamos su cuenta y no tiene ninguna suscripción activa: no hay nada que cancelar y no se le hará ningún cargo.

FRAGMENTO estado.ya-cancelada:
Revisamos su suscripción y ya está cancelada: conserva el acceso hasta el {{fin_periodo}} y después no se le vuelve a cobrar. No tiene que hacer nada más; su cuenta, sus consultas y sus carpetas no se borran.

FRAGMENTO fin.con-fecha:
Conserva el acceso hasta el {{fin_periodo}}, fin del periodo que ya pagó, y no se le vuelve a cobrar. Su cuenta, sus consultas y sus carpetas no se borran.

FRAGMENTO fin.sin-fecha:
Conserva el acceso hasta el fin del periodo que ya pagó, y no se le vuelve a cobrar. Su cuenta, sus consultas y sus carpetas no se borran.

VARIABLES: estado (fragmento), fecha_reporte (fecha), fin (fragmento, opcional), fin_periodo (fecha, opcional), folio (folio), por_peticion (fragmento, opcional), saludo (saludo)

REFERENCIA: Referencia: su mensaje a soporte del {{fecha_reporte}} · folio {{folio}}
SALUDOS: Estimada licenciada {nombre}: | Estimado licenciado {nombre}: | Apreciable Lic. {nombre}: | Estimada, estimado:
DESPEDIDA: Atentamente,
FIRMA: Soporte de Iurexia
REMITENTE: Soporte de Iurexia <soporte@iurexia.com> · RESPONDER A: soporte@iurexia.com
PIE: Soporte de Iurexia · soporte@iurexia.com · Puede responder directamente a este correo.$plantilla_T8_v1$)
on conflict (id, version) do nothing;
-- FIN DE LA SEMILLA

commit;

-- ════════════════════════════════════════════════════════════════════════
-- 6. APROBAR UNA PLANTILLA (después de ver su vista previa en
--    ~/Documents/IUREXIA-MAC/soporte-nov02/plantillas/). Una por una:
--
--    update public.plantillas_soporte
--       set aprobada_at = now(), aprobada_por = 'David'
--     where id = 'T4' and version = 1;
--
--    Y para que salgan, en Vercel: ATENCION_MODO=enviar (sin eso, simulacro).
--    Retirar una aprobación: set aprobada_at = null, aprobada_por = null.
--
-- COMPROBAR (sólo lectura):
--    select id, version, left(sha256, 12), aprobada_at, aprobada_por from public.plantillas_soporte order by id;
--    select public.auth_resumen_usuario('<uuid del usuario>', now() - interval '24 hours');
--    select * from public.cuentas_mismo_correo('alguien@gmail.com');
--    select tipo, envio_estado, envio_motivo, count(*) from public.atencion_casos group by 1, 2, 3 order by 4 desc;
-- ════════════════════════════════════════════════════════════════════════

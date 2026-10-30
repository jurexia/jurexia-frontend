-- ════════════════════════════════════════════════════════════════════════
-- reportes_soporte — un reporte por conversación, con su aviso y su atención
-- (29-oct-2026). SIN APLICAR: la aplica David.
-- ════════════════════════════════════════════════════════════════════════
-- POR QUÉ
--   De 118 conversaciones de soporte en 30 días, a soporte@ llegaron 21: sólo
--   avisaba lo escalado. Y de esas 21, cinco recibieron respuesta. No había
--   dónde ver qué reporte seguía sin atender: `user_feedback` guarda un renglón
--   por MENSAJE y su `status` sólo cambia a mano; `incidencias.aviso_at` es el
--   parte a David de lo que el circuito corrigió, no un aviso a soporte@.
--
-- QUÉ GUARDA (una fila por conversación del botón «Soporte»)
--   · folio: el del primer mensaje; es el que va en el asunto del aviso y el
--     que se le dice al abogado. `folios` trae los de cada mensaje.
--   · aviso_*: si el aviso llegó a soporte@ (o por qué no, y cuántas veces se
--     intentó). El cron /api/cron/reportes reintenta lo que falló.
--   · estado: pendiente → respondido (el Apps Script de soporte@ ve salir la
--     respuesta) → cerrado (72 h sin noticias del abogado, o lo cerró el
--     circuito o el panel). Nunca se cierra por tiempo lo NO respondido.
--
-- SIN ESTA TABLA el código desplegado no se rompe: el chat guarda y escala
-- como antes (con reintento), y el cron devuelve { sinTabla: true }.
--
-- RLS activado y SIN políticas: sólo el service role lee y escribe.
-- ════════════════════════════════════════════════════════════════════════

create table if not exists public.reportes_soporte (
    folio              text primary key,
    sesion             text,
    origen             text not null default 'chat' check (origen in ('chat', 'correo')),
    user_id            uuid references auth.users(id) on delete cascade,
    user_email         text,                       -- en minúsculas
    user_name          text,
    plan               text,
    folios             text[] not null default '{}',
    feedback_ids       uuid[] not null default '{}',
    turnos             integer not null default 1,
    primer_mensaje     text,
    hilo               text,
    escalado           boolean not null default false,
    motivo             text,
    delicado           boolean not null default false,
    creado_at          timestamptz not null default now(),
    ultimo_turno_at    timestamptz not null default now(),

    -- el aviso a soporte@
    aviso_at           timestamptz,
    aviso_turnos       integer not null default 0,
    aviso_intentos     integer not null default 0,
    aviso_error        text,
    aviso_via          text,                       -- principal | respaldo | historico
    aviso_resend_id    text,

    -- la atención
    estado             text not null default 'pendiente'
                       check (estado in ('pendiente', 'respondido', 'cerrado')),
    respondido_at      timestamptz,
    respondido_por     text,
    usuario_volvio_at  timestamptz,
    cerrado_at         timestamptz,
    cierre_motivo      text,
    gmail_hilo         text,
    actualizado_at     timestamptz not null default now()
);

create unique index if not exists reportes_soporte_sesion_uk
    on public.reportes_soporte (user_id, sesion) where sesion is not null;
create index if not exists reportes_soporte_abiertos_ix
    on public.reportes_soporte (estado, creado_at) where estado <> 'cerrado';
create index if not exists reportes_soporte_ultimo_turno_ix
    on public.reportes_soporte (ultimo_turno_at desc);
create index if not exists reportes_soporte_correo_ix
    on public.reportes_soporte (user_email);
create index if not exists reportes_soporte_usuario_ix
    on public.reportes_soporte (user_id, ultimo_turno_at desc);
create index if not exists reportes_soporte_folios_gin
    on public.reportes_soporte using gin (folios);

alter table public.reportes_soporte enable row level security;
revoke all on table public.reportes_soporte from anon, authenticated;

comment on table public.reportes_soporte is
    'Un reporte por conversación de soporte: si su aviso llegó a soporte@ y en qué va su atención (pendiente/respondido/cerrado). Sólo service role.';
comment on column public.reportes_soporte.aviso_via is
    'principal = desde soporte@; respaldo = desde el remitente de campañas; historico = anterior al 29-oct, sin aviso individual.';


-- ════════════════════════════════════════════════════════════════════════
-- HISTÓRICO (opcional, pero recomendado): las conversaciones de los últimos
-- 35 días, para que el primer resumen ya incluya lo que nunca se atendió.
-- ════════════════════════════════════════════════════════════════════════
-- · Se agrupan con la misma regla que el código: otro usuario, el contador
--   de turnos que vuelve a empezar (pulsó «Nueva») o una hora de silencio.
--   Comprobado en lectura el 29-oct: 118 conversaciones en 30 días.
-- · aviso_via = 'historico': el cron NO les manda aviso individual (serían
--   ~100 correos de golpe); salen en el resumen diario.
-- · Lo ya resuelto en el panel o cerrado por el circuito entra cerrado.
-- · Lo que ya se contestó lo marca el Apps Script con revisarAtencionHistorica().
-- · Reentrante: ON CONFLICT DO NOTHING.

with chat as (
    select f.id, f.user_id, lower(f.user_email) as user_email, f.user_name, f.folio,
           f.category, f.status, f.message, f.contexto_soporte, f.created_at,
           (select count(*) from regexp_matches(f.contexto_soporte, '(^|\n)Usuario:', 'g'))::int as turno
    from public.user_feedback f
    where f.folio is not null and f.contexto_soporte is not null and f.user_id is not null
      and f.created_at >= now() - interval '35 days'
), marcado as (
    select c.*,
           case when lag(c.created_at) over w is null
                  or c.turno <= lag(c.turno) over w
                  or c.created_at - lag(c.created_at) over w > interval '60 minutes'
                then 1 else 0 end as nueva
    from chat c
    window w as (partition by c.user_id order by c.created_at, c.folio)
), grupos as (
    select m.*, sum(m.nueva) over (partition by m.user_id order by m.created_at, m.folio
                                   rows unbounded preceding) as grupo
    from marcado m
), conversaciones as (
    select g.user_id,
           (array_agg(g.folio order by g.created_at, g.folio))[1]                      as folio,
           (array_agg(g.user_email order by g.created_at desc))[1]                     as user_email,
           (array_agg(g.user_name order by g.created_at desc))[1]                      as user_name,
           array_agg(g.folio order by g.created_at, g.folio)                           as folios,
           array_agg(g.id order by g.created_at, g.folio)                              as feedback_ids,
           max(g.turno)                                                                as turnos,
           (array_agg(g.message order by g.created_at, g.folio))[1]                    as primer_mensaje,
           (array_agg(g.contexto_soporte order by g.created_at desc, g.folio desc))[1] as hilo,
           bool_or(g.category = 'error')                                               as escalado,
           bool_or(g.status in ('resuelto', 'descartado'))                             as cerrado_en_panel,
           min(g.created_at)                                                           as creado_at,
           max(g.created_at)                                                           as ultimo_turno_at
    from grupos g
    group by g.user_id, g.grupo
)
insert into public.reportes_soporte (
    folio, origen, user_id, user_email, user_name, plan, folios, feedback_ids, turnos,
    primer_mensaje, hilo, escalado, creado_at, ultimo_turno_at,
    aviso_via, estado, cerrado_at, cierre_motivo
)
select c.folio, 'chat', c.user_id, c.user_email, c.user_name, p.subscription_type,
       c.folios, c.feedback_ids, c.turnos, left(c.primer_mensaje, 2000), c.hilo, c.escalado,
       c.creado_at, c.ultimo_turno_at,
       'historico',
       case when c.cerrado_en_panel or i.cerrada then 'cerrado' else 'pendiente' end,
       case when c.cerrado_en_panel or i.cerrada then now() end,
       case when i.cerrada then 'circuito' when c.cerrado_en_panel then 'panel' end
from conversaciones c
left join public.user_profiles p on p.id = c.user_id
left join lateral (
    select bool_or(x.cierre_at is not null) as cerrada
    from public.incidencias x
    where x.origen = 'reporte' and x.origen_id = any (select unnest(c.feedback_ids)::text)
) i on true
on conflict (folio) do nothing;

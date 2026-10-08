-- ════════════════════════════════════════════════════════════════════════
-- altas_origen — de dónde vino cada alta (6-oct-2026)
-- ════════════════════════════════════════════════════════════════════════
-- Una fila por usuario, escrita UNA vez por /api/medicion/alta justo después
-- del registro (ON CONFLICT DO NOTHING: el primer contacto no se sobrescribe).
-- La lee el webhook de Stripe para mandar la compra a la API de Conversiones
-- de Meta con el mismo fbc/fbp del alta.
--
-- fbc, fbp y user_agent sólo se guardan si el usuario dio permiso de
-- «Marketing» en el aviso de cookies (consiente_marketing = true); sin él,
-- sólo la atribución propia (utm, fbclid, página de llegada y referrer).
--
-- RLS activado y SIN políticas: sólo el service role lee y escribe.
-- ════════════════════════════════════════════════════════════════════════

create table if not exists public.altas_origen (
    user_id              uuid primary key references auth.users(id) on delete cascade,
    utm_source           text,
    utm_medium           text,
    utm_campaign         text,
    utm_content          text,
    utm_term             text,
    fbclid               text,
    gclid                text,
    fbc                  text,
    fbp                  text,
    landing_path         text,
    referrer             text,
    user_agent           text,
    consiente_marketing  boolean not null default false,
    primer_contacto      timestamptz,
    creado               timestamptz not null default now()
);

alter table public.altas_origen enable row level security;

-- Defensa extra: ni anon ni authenticated tocan la tabla, haya o no políticas.
revoke all on table public.altas_origen from anon, authenticated;

create index if not exists altas_origen_utm_campaign_idx
    on public.altas_origen (utm_campaign);

comment on table public.altas_origen is
    'Primer contacto (utm/fbclid) de cada alta y, con permiso de Marketing, fbc/fbp/user_agent para la API de Conversiones de Meta. Sólo service role.';
comment on column public.altas_origen.consiente_marketing is
    'Permiso de Marketing en el aviso de cookies al registrarse. Sin él no se manda nada a Meta.';

-- 7-oct-2026: identificador de clic de Google Ads. La tabla ya existía sin él.
alter table public.altas_origen add column if not exists gclid text;

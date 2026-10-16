-- ═══════════════════════════════════════════════════════════════════════════
-- FUNCIONES DE DESPACHO (16-oct-2026): cambiar redacción, plantillas del
-- abogado y correo con aprobación.
--
-- David, 16-oct-2026, tras ver los videos de Bufete: «mejorar párrafos del
-- texto en función de la instrucción que dé el abogado… agregar plantillas y
-- trabajar sobre ellas… automatizar las tareas como enviar correos».
--
-- SÓLO AÑADE. No altera ninguna tabla existente. Se puede correr dos veces.
-- Revertir: drop table correos_abogado, plantillas_abogado, uso_funciones;
--           drop function gastar_uso_funcion; borrar el bucket «plantillas».
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. USO POR FUNCIÓN ───────────────────────────────────────────────────
-- Un renglón por (usuario, función, día de la Ciudad de México). Los topes
-- por plan viven en el código (src/lib/uso-funciones-config.ts); aquí sólo se
-- cuenta. Sin políticas: lee y escribe únicamente el servicio.
create table if not exists public.uso_funciones (
    user_id  uuid    not null references auth.users(id) on delete cascade,
    funcion  text    not null,
    dia      date    not null default ((now() at time zone 'America/Mexico_City')::date),
    n        integer not null default 0,
    primary key (user_id, funcion, dia)
);
alter table public.uso_funciones enable row level security;

-- Gasta UNA unidad si cabe en el tope. Atómico: el candado consultivo por
-- (usuario, función) evita que dos peticiones simultáneas pasen las dos con
-- el último lugar. p_periodo = 'dia' | 'mes'.
create or replace function public.gastar_uso_funcion(
    p_user uuid, p_funcion text, p_limite integer, p_periodo text default 'dia'
) returns table (permitido boolean, usados integer)
language plpgsql security definer set search_path = public as $$
declare
    v_dia date := (now() at time zone 'America/Mexico_City')::date;
    v_n   integer;
begin
    perform pg_advisory_xact_lock(hashtext(p_user::text || ':' || p_funcion));
    if p_periodo = 'mes' then
        select coalesce(sum(u.n), 0) into v_n from public.uso_funciones u
         where u.user_id = p_user and u.funcion = p_funcion
           and u.dia >= date_trunc('month', v_dia)::date;
    else
        select coalesce(sum(u.n), 0) into v_n from public.uso_funciones u
         where u.user_id = p_user and u.funcion = p_funcion and u.dia = v_dia;
    end if;
    if v_n >= p_limite then
        return query select false, v_n;
        return;
    end if;
    insert into public.uso_funciones (user_id, funcion, dia, n)
    values (p_user, p_funcion, v_dia, 1)
    on conflict (user_id, funcion, dia) do update set n = public.uso_funciones.n + 1;
    return query select true, v_n + 1;
end $$;
revoke all on function public.gastar_uso_funcion(uuid, text, integer, text) from public, anon, authenticated;

-- ── 2. PLANTILLAS DEL ABOGADO ────────────────────────────────────────────
-- El .docx original se guarda tal cual; el «marcado» es una copia con los
-- campos como {{clave}} (docxtemplater). `campos` describe cada uno:
--   [{ "clave": "cliente_nombre", "etiqueta": "Nombre del cliente",
--      "origen": "carpeta.cliente_nombre" | "manual", "ejemplo": "…" }]
create table if not exists public.plantillas_abogado (
    id                uuid primary key default gen_random_uuid(),
    user_id           uuid not null references auth.users(id) on delete cascade,
    nombre            text not null,
    descripcion       text,
    materia           text,
    archivo_original  text not null,
    archivo_marcado   text,
    campos            jsonb not null default '[]'::jsonb,
    veces_usada       integer not null default 0,
    created_at        timestamptz not null default now(),
    updated_at        timestamptz not null default now()
);
create index if not exists plantillas_abogado_usuario
    on public.plantillas_abogado (user_id, updated_at desc);
alter table public.plantillas_abogado enable row level security;
drop policy if exists "plantillas: el dueño las ve" on public.plantillas_abogado;
create policy "plantillas: el dueño las ve" on public.plantillas_abogado
    for select using (auth.uid() = user_id);
-- Altas, cambios y bajas pasan por el servidor (service_role), que valida el
-- plan y el tamaño; el navegador sólo lee las suyas.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('plantillas', 'plantillas', false, 10485760,
        array['application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
on conflict (id) do nothing;

-- ── 3. CORREOS DEL ABOGADO (con aprobación) ──────────────────────────────
-- Cada envío que el abogado aprobó: a quién, qué, con qué adjunto y qué dijo
-- Resend. Sale de la dirección de Iurexia con «responder a» el abogado.
create table if not exists public.correos_abogado (
    id              uuid primary key default gen_random_uuid(),
    user_id         uuid not null references auth.users(id) on delete cascade,
    expediente_id   uuid references public.expedientes(id) on delete set null,
    para            text[] not null,
    cc              text[] not null default '{}',
    asunto          text not null,
    cuerpo          text not null,
    adjunto_nombre  text,
    adjunto_bytes   integer,
    estado          text not null default 'enviado',
    resend_id       text,
    error           text,
    created_at      timestamptz not null default now()
);
create index if not exists correos_abogado_usuario
    on public.correos_abogado (user_id, created_at desc);
alter table public.correos_abogado enable row level security;
drop policy if exists "correos: el dueño los ve" on public.correos_abogado;
create policy "correos: el dueño los ve" on public.correos_abogado
    for select using (auth.uid() = user_id);

notify pgrst, 'reload schema';

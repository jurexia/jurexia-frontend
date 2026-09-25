-- FLUJOS DE TRABAJO: 30 AL MES EN PRO, 60 EN PLATINUM (25-sep-2026)
--
-- David: «cada workflow consume 1 de los nuevos 30 workflows mensuales de cada
-- cuenta pro, 60 de cada platinum». Un flujo cuesta UNO al empezar, tenga las
-- partes que tenga; sus partes ya no descuentan consultas.
--
-- Mismo diseño que el taller (consumir_proyecto_taller): el mes nuevo se abre
-- solo en el primer intento, sin tarea programada que pueda fallar en
-- silencio. Sólo el backend (service_role) puede consumir o devolver.

alter table public.user_profiles
  add column if not exists flujos_mes_usados integer not null default 0,
  add column if not exists flujos_periodo date;

-- El cupo por plan. Espejo en el frontend: `limiteFlujos` en src/lib/flujo-agente.ts.
create or replace function public.limite_flujos(p_plan text)
returns integer
language sql
immutable
set search_path = public
as $$
  select case
    when p_plan like 'platinum%' or p_plan = 'ultra_secretarios' then 60
    when p_plan like 'pro%' then 30
    else 0
  end
$$;

create or replace function public.consumir_flujo(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  f        public.user_profiles%rowtype;
  v_inicio date := date_trunc('month', (now() at time zone 'America/Mexico_City'))::date;
  v_limite integer;
begin
  select * into f from public.user_profiles where id = p_user_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'motivo', 'sin_perfil');
  end if;

  if f.suspendido_at is not null
     or exists (select 1 from public.blocked_users b where b.user_id = p_user_id) then
    return jsonb_build_object('ok', false, 'motivo', 'cuenta_detenida');
  end if;

  if f.flujos_periodo is null or f.flujos_periodo < v_inicio then
    update public.user_profiles
       set flujos_mes_usados = 0, flujos_periodo = v_inicio
     where id = p_user_id;
    f.flujos_mes_usados := 0;
  end if;

  v_limite := public.limite_flujos(f.subscription_type);
  if v_limite = 0 then
    return jsonb_build_object('ok', false, 'motivo', 'sin_plan', 'usados', 0, 'limite', 0, 'restantes', 0);
  end if;
  if coalesce(f.flujos_mes_usados, 0) >= v_limite then
    return jsonb_build_object('ok', false, 'motivo', 'sin_saldo',
      'usados', f.flujos_mes_usados, 'limite', v_limite, 'restantes', 0);
  end if;

  update public.user_profiles
     set flujos_mes_usados = coalesce(flujos_mes_usados, 0) + 1
   where id = p_user_id;

  return jsonb_build_object('ok', true,
    'usados', coalesce(f.flujos_mes_usados, 0) + 1,
    'limite', v_limite,
    'restantes', v_limite - coalesce(f.flujos_mes_usados, 0) - 1);
end;
$$;

-- Si el flujo no llega a escribir nada (el agente falló al arrancar), se
-- devuelve. Nunca baja de cero.
create or replace function public.devolver_flujo(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.user_profiles
     set flujos_mes_usados = greatest(coalesce(flujos_mes_usados, 0) - 1, 0)
   where id = p_user_id;
end;
$$;

revoke all on function public.consumir_flujo(uuid) from public, anon, authenticated;
revoke all on function public.devolver_flujo(uuid) from public, anon, authenticated;
grant execute on function public.consumir_flujo(uuid) to service_role;
grant execute on function public.devolver_flujo(uuid) to service_role;

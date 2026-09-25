-- CONSULTAS DENTRO DE LA CARPETA, Y EL FLUJO CON QUE EMPEZARON (25-sep-2026)
--
-- La consulta puede vivir dentro de una carpeta inteligente —como un asunto en
-- Astra for Law— y recordar con qué flujo de trabajo arrancó. Las dos columnas
-- son opcionales: lo que ya existe queda como «consulta suelta» y la app móvil
-- no nota nada.
--
-- El frontend funciona con o sin esta migración: si las columnas no existen,
-- `src/lib/consultas-carpeta.ts` lo detecta (42703) y la barra se queda sin
-- carpetas en lugar de romperse.

alter table public.conversations
  add column if not exists expediente_id uuid references public.expedientes(id) on delete set null,
  add column if not exists flujo text;

create index if not exists conversations_expediente_idx
  on public.conversations (expediente_id)
  where expediente_id is not null;

-- La llave foránea no mira de quién es la carpeta: sin esto una consulta podría
-- apuntar al uuid de la carpeta de otra persona. No se leería (RLS), pero el
-- vínculo quedaría escrito. Se rechaza antes de escribirlo.
create or replace function public.conversations_expediente_propio()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.expediente_id is not null and not exists (
    select 1 from public.expedientes e
    where e.id = new.expediente_id and e.user_id = new.user_id
  ) then
    raise exception 'La carpeta no pertenece a quien escribe la consulta'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

-- Función de disparador: nadie tiene por qué llamarla por RPC.
revoke all on function public.conversations_expediente_propio() from public, anon, authenticated;

drop trigger if exists conversations_expediente_propio on public.conversations;
create trigger conversations_expediente_propio
  before insert or update of expediente_id, user_id on public.conversations
  for each row execute function public.conversations_expediente_propio();

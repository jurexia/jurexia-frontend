-- =====================================================
-- Script para corregir el trigger de creación de perfiles
-- =====================================================
-- Este script actualiza la función handle_new_user() para que
-- cree correctamente los perfiles en user_profiles cuando se
-- registra un nuevo usuario en auth.users

-- Paso 1: Actualizar la función handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insertar el perfil del nuevo usuario con valores por defecto
  INSERT INTO public.user_profiles (
    id,
    email,
    full_name,
    subscription_type,
    queries_used,
    queries_limit,
    subscription_start,
    is_active
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'plan', 'gratuito'),
    0,
    5,
    CURRENT_DATE,
    true
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log el error pero no bloquear la creación del usuario
    RAISE WARNING 'Error creando perfil para usuario %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Paso 2: Verificar que el trigger existe (si no existe, crearlo)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers 
    WHERE trigger_name = 'on_auth_user_created' 
    AND event_object_table = 'users'
    AND event_object_schema = 'auth'
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_new_user();
    
    RAISE NOTICE 'Trigger on_auth_user_created creado exitosamente';
  ELSE
    RAISE NOTICE 'Trigger on_auth_user_created ya existe';
  END IF;
END $$;

-- Paso 3: Verificar usuarios sin perfil y crearlos
-- Esto crea perfiles para usuarios que ya existen en auth.users
-- pero no tienen perfil en user_profiles
INSERT INTO public.user_profiles (
  id,
  email,
  full_name,
  subscription_type,
  queries_used,
  queries_limit,
  subscription_start,
  is_active
)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', ''),
  'gratuito',
  0,
  5,
  CURRENT_DATE,
  true
FROM auth.users au
LEFT JOIN public.user_profiles up ON au.id = up.id
WHERE up.id IS NULL;

-- Verificar el resultado
SELECT 
  COUNT(*) as total_usuarios_auth,
  (SELECT COUNT(*) FROM public.user_profiles) as total_perfiles,
  COUNT(*) - (SELECT COUNT(*) FROM public.user_profiles) as usuarios_sin_perfil
FROM auth.users;

-- =====================================================
-- Script de verificación del trigger de perfiles
-- =====================================================
-- Ejecuta estos queries DESPUÉS de ejecutar fix_user_profile_trigger.sql
-- para verificar que todo esté funcionando correctamente

-- 1. Verificar que la función existe y tiene el código correcto
SELECT 
  proname as nombre_funcion,
  pg_get_functiondef(oid) as definicion
FROM pg_proc 
WHERE proname = 'handle_new_user';

-- 2. Verificar que el trigger existe y está activo
SELECT 
  trigger_name,
  event_object_table,
  action_statement,
  action_timing,
  event_manipulation,
  action_orientation
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- 3. Verificar usuarios y perfiles
SELECT 
  'Total usuarios en auth.users' as descripcion,
  COUNT(*) as cantidad
FROM auth.users
UNION ALL
SELECT 
  'Total perfiles en user_profiles' as descripcion,
  COUNT(*) as cantidad
FROM public.user_profiles
UNION ALL
SELECT 
  'Usuarios sin perfil' as descripcion,
  COUNT(*) as cantidad
FROM auth.users au
LEFT JOIN public.user_profiles up ON au.id = up.id
WHERE up.id IS NULL;

-- 4. Ver últimos perfiles creados (para verificar después de crear usuario de prueba)
SELECT 
  up.id,
  up.email,
  up.full_name,
  up.subscription_type,
  up.queries_limit,
  up.queries_used,
  up.is_active,
  up.created_at,
  au.created_at as auth_created_at,
  au.email_confirmed_at
FROM public.user_profiles up
INNER JOIN auth.users au ON au.id = up.id
ORDER BY up.created_at DESC
LIMIT 10;

-- 5. Verificar que los perfiles tengan los valores por defecto correctos
SELECT 
  subscription_type,
  queries_limit,
  queries_used,
  is_active,
  COUNT(*) as cantidad_usuarios
FROM public.user_profiles
GROUP BY subscription_type, queries_limit, queries_used, is_active
ORDER BY cantidad_usuarios DESC;

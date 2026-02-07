-- =============================================
-- MIGRATION: Stripe-Supabase Integration
-- Run this in Supabase Dashboard > SQL Editor
-- =============================================

-- 1. Add Stripe columns to user_profiles
ALTER TABLE public.user_profiles 
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

-- 2. Update subscription_type constraint to match Stripe plans
ALTER TABLE public.user_profiles 
  DROP CONSTRAINT IF EXISTS user_profiles_subscription_type_check;

ALTER TABLE public.user_profiles 
  ADD CONSTRAINT user_profiles_subscription_type_check 
  CHECK (subscription_type IN ('gratuito', 'pro_monthly', 'pro_annual', 'platinum_monthly', 'platinum_annual'));

-- 3. Create/update increment_query_count function
CREATE OR REPLACE FUNCTION public.increment_query_count(p_user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.user_profiles 
  SET queries_used = queries_used + 1,
      updated_at = NOW()
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Function to reset monthly queries (for cron or manual use)
CREATE OR REPLACE FUNCTION public.reset_monthly_queries()
RETURNS void AS $$
BEGIN
  UPDATE public.user_profiles 
  SET queries_used = 0, 
      updated_at = NOW()
  WHERE is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Function to update user subscription from webhook
CREATE OR REPLACE FUNCTION public.update_user_subscription(
  p_email TEXT,
  p_subscription_type TEXT,
  p_queries_limit INTEGER,
  p_stripe_customer_id TEXT DEFAULT NULL,
  p_stripe_subscription_id TEXT DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  UPDATE public.user_profiles 
  SET subscription_type = p_subscription_type,
      queries_limit = p_queries_limit,
      queries_used = 0,
      stripe_customer_id = COALESCE(p_stripe_customer_id, stripe_customer_id),
      stripe_subscription_id = COALESCE(p_stripe_subscription_id, stripe_subscription_id),
      is_active = true,
      updated_at = NOW()
  WHERE email = p_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Function to downgrade user to free plan
CREATE OR REPLACE FUNCTION public.downgrade_to_free(p_email TEXT)
RETURNS void AS $$
BEGIN
  UPDATE public.user_profiles 
  SET subscription_type = 'gratuito',
      queries_limit = 5,
      queries_used = 0,
      stripe_subscription_id = NULL,
      updated_at = NOW()
  WHERE email = p_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Function to reset query count for a specific user (on invoice payment)
CREATE OR REPLACE FUNCTION public.reset_user_queries(p_email TEXT)
RETURNS void AS $$
BEGIN
  UPDATE public.user_profiles 
  SET queries_used = 0,
      updated_at = NOW()
  WHERE email = p_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Grant permissions
GRANT EXECUTE ON FUNCTION public.increment_query_count(UUID) TO authenticated;
-- Note: The webhook functions use SECURITY DEFINER so they run with elevated privileges
-- They should be called via service_role key from the webhook handler

-- 9. Optional: Create a cron job to reset free plan queries monthly
-- (Requires pg_cron extension - enable in Supabase Dashboard > Database > Extensions)
-- SELECT cron.schedule(
--   'reset-free-queries',
--   '0 0 1 * *',  -- First day of every month at midnight UTC
--   $$SELECT public.reset_monthly_queries()$$
-- );

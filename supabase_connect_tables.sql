-- ═══════════════════════════════════════════════════════════════
-- IUREXIA Connect — Contact Requests & Notifications
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)
-- ═══════════════════════════════════════════════════════════════

-- ─── 1. connect_requests — stores contact requests from users to lawyers ───

CREATE TABLE IF NOT EXISTS public.connect_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lawyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  client_name TEXT NOT NULL,
  client_email TEXT NOT NULL,
  client_phone TEXT NOT NULL,
  message TEXT NOT NULL,
  search_query TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'read', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS
ALTER TABLE public.connect_requests ENABLE ROW LEVEL SECURITY;

-- Lawyers can read their own requests
CREATE POLICY "Lawyers can read their requests"
  ON public.connect_requests FOR SELECT
  USING (auth.uid() = lawyer_id);

-- Clients can read their own sent requests
CREATE POLICY "Clients can read their sent requests"
  ON public.connect_requests FOR SELECT
  USING (auth.uid() = client_id);

-- Lawyers can update status of their requests
CREATE POLICY "Lawyers can update request status"
  ON public.connect_requests FOR UPDATE
  USING (auth.uid() = lawyer_id);

-- Service role can insert (via backend API)
CREATE POLICY "Service role can insert requests"
  ON public.connect_requests FOR INSERT
  WITH CHECK (true);

-- Auto-update updated_at
CREATE TRIGGER update_connect_requests_updated_at
  BEFORE UPDATE ON public.connect_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ─── 2. notifications — in-app notifications ───

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'system',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can read their own notifications
CREATE POLICY "Users can read own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update (mark as read) their own notifications
CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Service role can insert
CREATE POLICY "Service role can insert notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_connect_requests_lawyer_id ON public.connect_requests(lawyer_id);
CREATE INDEX IF NOT EXISTS idx_connect_requests_client_id ON public.connect_requests(client_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, is_read) WHERE is_read = false;

-- Grant access
GRANT SELECT, INSERT, UPDATE ON public.connect_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.notifications TO authenticated;

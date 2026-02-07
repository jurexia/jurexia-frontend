-- ═══════════════════════════════════════════════════════════════
-- IUREXIA CONNECT - SCHEMA COMPLETO
-- Ejecutar en Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- 1. Perfiles de abogados
CREATE TABLE IF NOT EXISTS lawyer_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  cedula_number TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  specialties TEXT[] DEFAULT '{}',
  bio TEXT DEFAULT '',
  office_address JSONB DEFAULT '{"estado":"","municipio":"","cp":""}',
  verification_status TEXT DEFAULT 'pending'
    CHECK (verification_status IN ('pending','verified','rejected')),
  is_pro_active BOOLEAN DEFAULT false,
  avatar_url TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Salas de chat Connect
CREATE TABLE IF NOT EXISTS connect_chat_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES auth.users(id),
  lawyer_id UUID NOT NULL REFERENCES auth.users(id),
  dossier_summary JSONB DEFAULT '{}',
  status TEXT DEFAULT 'active'
    CHECK (status IN ('active','closed')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Mensajes del chat Connect
CREATE TABLE IF NOT EXISTS connect_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES connect_chat_rooms(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id),
  content TEXT NOT NULL,
  original_content TEXT,
  is_system_message BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════════════════════════
-- ÍNDICES
-- ═══════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_chat_rooms_client ON connect_chat_rooms(client_id);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_lawyer ON connect_chat_rooms(lawyer_id);
CREATE INDEX IF NOT EXISTS idx_messages_room ON connect_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON connect_messages(room_id, created_at);
CREATE INDEX IF NOT EXISTS idx_lawyer_status ON lawyer_profiles(verification_status);
CREATE INDEX IF NOT EXISTS idx_lawyer_specialties ON lawyer_profiles USING GIN(specialties);

-- ═══════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════
ALTER TABLE lawyer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE connect_chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE connect_messages ENABLE ROW LEVEL SECURITY;

-- lawyer_profiles: lectura pública (directorio), escritura solo el dueño
CREATE POLICY "lawyer_profiles_select_public" ON lawyer_profiles
  FOR SELECT USING (true);

CREATE POLICY "lawyer_profiles_insert_own" ON lawyer_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "lawyer_profiles_update_own" ON lawyer_profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "lawyer_profiles_delete_own" ON lawyer_profiles
  FOR DELETE USING (auth.uid() = id);

-- chat_rooms: STRICT — solo participantes
CREATE POLICY "chat_rooms_select_participant" ON connect_chat_rooms
  FOR SELECT USING (auth.uid() IN (client_id, lawyer_id));

CREATE POLICY "chat_rooms_insert_client" ON connect_chat_rooms
  FOR INSERT WITH CHECK (auth.uid() = client_id);

CREATE POLICY "chat_rooms_update_participant" ON connect_chat_rooms
  FOR UPDATE USING (auth.uid() IN (client_id, lawyer_id));

-- messages: STRICT — solo participantes de la sala
CREATE POLICY "messages_select_participant" ON connect_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM connect_chat_rooms
      WHERE id = room_id AND auth.uid() IN (client_id, lawyer_id)
    )
  );

CREATE POLICY "messages_insert_participant" ON connect_messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM connect_chat_rooms
      WHERE id = room_id AND auth.uid() IN (client_id, lawyer_id)
    )
  );

-- ═══════════════════════════════════════════
-- TRIGGER: auto-update updated_at
-- ═══════════════════════════════════════════
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_lawyer_profiles_updated_at
  BEFORE UPDATE ON lawyer_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chat_rooms_updated_at
  BEFORE UPDATE ON connect_chat_rooms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

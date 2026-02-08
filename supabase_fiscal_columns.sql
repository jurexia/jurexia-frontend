-- Add fiscal data columns to user_profiles for Mexican invoicing (facturación)
-- Run this in the Supabase SQL Editor

ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS rfc TEXT,
ADD COLUMN IF NOT EXISTS razon_social TEXT,
ADD COLUMN IF NOT EXISTS regimen_fiscal TEXT,
ADD COLUMN IF NOT EXISTS codigo_postal_fiscal TEXT,
ADD COLUMN IF NOT EXISTS uso_cfdi TEXT DEFAULT 'G03';

-- Add a comment for documentation
COMMENT ON COLUMN user_profiles.rfc IS 'RFC del contribuyente (12 o 13 caracteres)';
COMMENT ON COLUMN user_profiles.razon_social IS 'Nombre o Razón Social del contribuyente';
COMMENT ON COLUMN user_profiles.regimen_fiscal IS 'Clave del régimen fiscal (ej: 601, 612, 626)';
COMMENT ON COLUMN user_profiles.codigo_postal_fiscal IS 'Código postal del domicilio fiscal';
COMMENT ON COLUMN user_profiles.uso_cfdi IS 'Uso del CFDI (default: G03 - Gastos en general)';

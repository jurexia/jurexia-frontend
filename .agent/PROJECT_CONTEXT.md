# Iurexia - Contexto del Proyecto

## Información General
- **Nombre:** Iurexia (rebrandeado de Jurexia)
- **Tipo:** Plataforma de IA Legal para el sistema jurídico mexicano
- **Stack Frontend:** Next.js 14, TypeScript, TailwindCSS
- **Stack Backend:** FastAPI (Python), desplegado en Render
- **Base de Datos Vectorial:** Qdrant Cloud
- **Autenticación:** Supabase (en implementación)

---

## URLs y Credenciales

### Producción
- **Frontend (Vercel):** https://jurexiagtp.com (pendiente cambiar a iurexia.com)
- **Backend (Render):** https://jurexia-api.onrender.com

### Supabase (NUEVO - en configuración)
- **URL:** https://ukcuzhwmmfwvcedvhfll.supabase.co
- **Anon Key:** sb_publishable_cRZQ0-MUgO1bWMInvmI4GQ_R-T0Jmdd

### Stripe (Pagos)
- Test keys configuradas en .env.local

---

## Estado Actual del Desarrollo

### ✅ Completado
1. **Rebranding Jurexia → Iurexia**
   - Nuevo logo con "I" tipo pilar dorado
   - Todos los textos actualizados (50+ referencias)
   - URLs cambiadas de jurexiagtp.com → iurexia.com
   - Commit local: `1326661`

2. **Soporte .DOC (Backend)**
   - Endpoint `/extract-text` en main.py
   - Usa olefile para archivos Word 97-2003
   - Frontend actualizado para llamar al backend

3. **Eliminación de Twitter/X Login**
   - Removido de login y registro
   - Solo queda Google OAuth

### 🔄 En Progreso - Autenticación Supabase
Archivos creados/modificados:
- `src/lib/supabase.ts` - Cliente y funciones de auth
- `src/app/registro/page.tsx` - Usa Supabase signUp
- `src/app/login/page.tsx` - Usa Supabase signIn
- `src/app/auth/callback/route.ts` - OAuth callback
- `.env.local` - Credenciales Supabase agregadas

**PENDIENTE para completar Supabase:**
1. Reiniciar servidor dev para cargar nuevas env vars
2. Configurar Google OAuth en Supabase Dashboard
3. Probar registro con email
4. Probar login con email
5. Integrar sesión de Supabase con el resto de la app

---

## Estructura de Archivos Clave

```
jurexia-frontend/
├── .env.local                 # Variables de entorno
├── src/
│   ├── app/
│   │   ├── auth/callback/route.ts  # OAuth callback (NUEVO)
│   │   ├── chat/page.tsx           # Chat principal
│   │   ├── login/page.tsx          # Login (actualizado)
│   │   ├── registro/page.tsx       # Registro (actualizado)
│   │   ├── plataforma/page.tsx     # Página de plataforma
│   │   ├── precios/page.tsx        # Página de precios
│   │   └── layout.tsx              # Layout principal
│   ├── components/
│   │   ├── ChatMessage.tsx         # Mensajes del chat
│   │   ├── DocumentModal.tsx       # Modal de documentos
│   │   ├── FileUploadModal.tsx     # Subida de archivos
│   │   └── Navbar.tsx              # Navegación
│   └── lib/
│       ├── api.ts                  # Cliente API
│       ├── auth.ts                 # Config NextAuth
│       ├── supabase.ts             # Cliente Supabase (NUEVO)
│       └── conversations.ts        # Gestión conversaciones
└── public/
    └── logo-iurexia.png            # Nuevo logo
```

---

## Comandos Útiles

```powershell
# Iniciar servidor de desarrollo
cd C:\Users\jdmju\.gemini\antigravity\playground\obsidian-expanse\jurexia-frontend
npm run dev

# Verificar cambios pendientes
git status

# Commit y push a producción
git add -A
git commit -m "mensaje"
git push origin main
```

---

## Próximos Pasos Inmediatos

1. **Reiniciar servidor dev** - Para cargar variables Supabase
2. **Probar registro** - Crear cuenta con email
3. **Configurar Google en Supabase** - Dashboard > Auth > Providers
4. **Integrar sesión** - Actualizar AuthProvider para usar Supabase
5. **Deploy a producción** - Push a GitHub para Vercel

---

## Notas Técnicas

### Logo Rendering
El logo no es imagen, es texto CSS:
```tsx
Iurex<span className="text-accent-gold">ia</span>
```

### Supabase Auth Functions
```typescript
// Registro
signUpWithEmail(email, password, name)

// Login
signInWithEmail(email, password)

// Google OAuth
signInWithGoogle()

// Obtener usuario actual
getCurrentUser()
```

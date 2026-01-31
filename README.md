# Jurexia Frontend

Frontend Next.js 14 para la plataforma de IA legal Jurexia.

## Stack
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- React Markdown

## Setup

```bash
# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env.local

# Ejecutar en desarrollo
npm run dev
```

## Estructura

```
src/
├── app/
│   ├── page.tsx         # Landing page
│   ├── chat/page.tsx    # Chat interface
│   └── layout.tsx       # Root layout
├── components/
│   ├── Navbar.tsx       # Navigation
│   ├── ChatInput.tsx    # Input with chips
│   └── ChatMessage.tsx  # Message bubbles
├── hooks/
│   └── useChat.ts       # Streaming chat hook
└── lib/
    └── api.ts           # API client
```

## Deploy

### Frontend (Vercel)
1. Conecta el repo a Vercel
2. Configura `NEXT_PUBLIC_API_URL` en Variables de Entorno

### API (Railway/Render)
1. Despliega `api_jurexia_core.py`
2. Configura `QDRANT_URL`, `QDRANT_API_KEY`, `OPENAI_API_KEY`

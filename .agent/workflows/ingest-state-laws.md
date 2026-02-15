---
description: Workflow completo para ingestar las leyes de un estado mexicano — desde scraping hasta verificación RAG
---

# /ingest-state-laws — Ingesta de Leyes Estatales

## Contexto
Este workflow documenta el proceso **completo y reutilizable** para agregar las leyes
de cualquier estado mexicano al sistema Iurexia. Incluye: scraping de fuentes oficiales,
carga de PDFs a Supabase Storage, actualización del frontend, ingesta RAG con
Article-Aware Chunking, y verificación de búsqueda.

**Tecnologías involucradas:**
- Frontend: Next.js (`jurexia-frontend-git`)
- Backend: FastAPI (`jurexia-api-git`)
- Storage: Supabase Storage (bucket `leyes-estatales`)
- Vector DB: Qdrant Cloud (colección `leyes_estatales`)
- Embeddings: OpenAI `text-embedding-3-small` (1536d) + fastembed BM25

---

## PASO 1: Scraping de Fuentes Oficiales

Cada estado tiene su propio sitio de legislatura. Identificar la URL y extraer:
- **Nombre completo** de cada ley/código/constitución
- **URL del PDF** oficial
- **Categoría**: constitución, ley, código, reglamento, ley orgánica

### Fuentes comunes por estado:
| Estado | URL Base |
|--------|----------|
| Querétaro | `legislaturaqueretaro.gob.mx/leyes/` |
| Jalisco | `congresojal.gob.mx/legislacion/` |
| CDMX | `congresocdmx.gob.mx/leyes-vigentes/` |

### Herramienta recomendada:
- Usar browser subagent o httpx para scraping
- Guardar resultados en un JSON temporal: `{nombre, url, categoria}`
- Verificar conteo total (comparar con listado oficial)

---

## PASO 2: Descarga de PDFs

```bash
# Crear directorio temporal
mkdir pdfs_{estado}

# Descargar todos los PDFs (se hace desde el script de ingesta)
python ingest_queretaro.py  # Adaptar para cada estado
```

**Validaciones:**
- [ ] Todos los PDFs descargan correctamente (HTTP 200)
- [ ] Ningún archivo está vacío (>100 bytes)
- [ ] Contar PDFs descargados vs esperados

---

## PASO 3: Subir PDFs a Supabase Storage

Los PDFs se almacenan en el bucket `leyes-estatales` de Supabase para:
- Garantizar disponibilidad (sin depender de servidores de legislatura)
- Servir los PDFs desde el dominio de Iurexia
- Permitir acceso directo con un click desde la UI

### Estructura del bucket:
```
leyes-estatales/
├── queretaro/
│   ├── CON-ID-001.pdf
│   ├── LEY-ID-002.pdf
│   ├── COD-ID-01.pdf
│   └── ...
├── jalisco/
│   └── ...
└── cdmx/
    └── ...
```

### Cómo subir:
```python
# Script: upload_pdfs_to_supabase.py
from supabase import create_client
from pathlib import Path

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
bucket = "leyes-estatales"
estado = "queretaro"

for pdf in Path(f"pdfs_{estado}").glob("*.pdf"):
    remote_path = f"{estado}/{pdf.name}"
    with open(pdf, "rb") as f:
        supabase.storage.from_(bucket).upload(remote_path, f, {
            "content-type": "application/pdf",
            "upsert": "true",
        })
    public_url = supabase.storage.from_(bucket).get_public_url(remote_path)
    print(f"  ✅ {pdf.name} → {public_url}")
```

### URL resultante:
```
https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/leyes-estatales/queretaro/LEY-ID-002.pdf
```

---

## PASO 4: Actualizar Frontend (`estadosData.ts`)

Editar `src/app/leyesestatales/estadosData.ts` para agregar las leyes del estado:

1. **Crear la constante de leyes** del estado (ejemplo: `QUERETARO_LEYES`)
2. **Actualizar las URLs** para apuntar a Supabase Storage (no a la legislatura)
3. **Actualizar `leyesCount`** con el conteo real
4. **Agregar `ultimaActualizacion`** con la fecha de ingesta

```typescript
const QUERETARO_LEYES: CategoriaLeyes = {
  constitucion: [
    { nombre: 'Constitución Política del...', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/leyes-estatales/queretaro/CON-ID-001.pdf' },
  ],
  leyes: [
    { nombre: 'Ley de Adquisiciones...', url: '...' },
    // ...
  ],
  codigos: [...],
  reglamentos: [...],
  otros: [...],
};
```

### En el array `ESTADOS`:
```typescript
{ slug: 'queretaro', nombre: 'Querétaro', ..., leyesCount: 132, ultimaActualizacion: '2026-02-14', leyes: QUERETARO_LEYES },
```

**Verificar:**
- [ ] Click en cada PDF abre correctamente desde Supabase
- [ ] Conteo de leyes coincide con lo scrapeado
- [ ] La página `/leyesestatales/queretaro` renderiza correctamente

---

## PASO 5: Ingesta RAG (Article-Aware Chunking)

### Pre-requisito: Tener `OPENAI_API_KEY` como variable de entorno

### Ejecutar el script de ingesta:
```bash
# Establecer API key
set OPENAI_API_KEY=sk-...

# Correr ingesta para el estado
python ingest_queretaro.py
```

### Lo que hace el script:
1. **Borra datos existentes** del estado en `leyes_estatales` (filtro `entidad`)
2. **Descarga PDFs** (o usa cache si ya descargados)
3. **Extrae texto** de cada PDF con PyMuPDF
4. **Aplica Article-Aware Chunking:**
   - Detecta `Artículo \d+` como separadores
   - Cada artículo = 1 chunk (si < ~1200 tokens)
   - Artículos largos → sub-chunks con overlap de 400 chars
   - Preámbulos y Transitorios → chunks de tamaño fijo
5. **Genera dense embeddings** con `text-embedding-3-small`
6. **Upsert a Qdrant** con metadata completa:
   - `entidad`: nombre canónico (ej: `QUERETARO`)
   - `origen`: nombre completo de la ley
   - `ref`: referencia del artículo (ej: `Art. 15`)
   - `texto`: contenido del chunk
   - `tipo_codigo`: tipo Da Vinci (ej: `PENAL`, `CIVIL`)
   - `jurisdiccion`: materia jurídica
   - `jerarquia_txt`: contexto jerárquico

### Adaptar para otros estados:
Para cada nuevo estado, duplicar `ingest_queretaro.py` como `ingest_{estado}.py` y:
1. Cambiar `ENTIDAD = "NOMBRE_ESTADO"`
2. Actualizar la lista `LAWS` con las leyes del nuevo estado
3. Actualizar `QRO_BASE` con la URL base del estado

---

## PASO 6: Generar BM25 Sparse Vectors

Después de la ingesta dense, generar los vectors sparse para búsqueda léxica:

```bash
# Via API endpoint (requiere la API corriendo con fastembed)
curl -X POST https://api.iurexia.com/admin/reingest-sparse \
  -H "Content-Type: application/json" \
  -d '{"admin_key": "...", "entidad": "QUERETARO"}'
```

Esto genera vectores BM25 para cada chunk del estado, habilitando búsqueda híbrida
(semántica + léxica).

---

## PASO 7: Verificación

### 7a. Verificar conteo en Qdrant
```python
from qdrant_client import QdrantClient
from qdrant_client.models import Filter, FieldCondition, MatchValue

client = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY)

count = client.count(
    collection_name="leyes_estatales",
    count_filter=Filter(must=[
        FieldCondition(key="entidad", match=MatchValue(value="QUERETARO"))
    ])
)
print(f"Querétaro chunks: {count.count}")  # Esperado: ~3000-5000
```

### 7b. Test de búsqueda RAG
Probar estas queries en el chat de Iurexia con Querétaro seleccionado:

| Query | Resultado esperado |
|-------|--------------------|
| "¿Qué dice el artículo 15 del código penal de Querétaro?" | Artículo 15 exacto |
| "derechos del tanto en Querétaro" | Código Civil, artículos relevantes |
| "condominios en Querétaro" | Código Urbano, sección de condominios |
| "homicidio Querétaro" | Código Penal, artículos de homicidio |

### 7c. Verificar PDFs en frontend
- [ ] Navegar a `/leyesestatales/queretaro`
- [ ] Click en al menos 5 leyes → PDF abre correctamente
- [ ] Verificar que el conteo coincide

---

## PASO 8: Deploy

```bash
# Frontend (Vercel) — automático con push a main
cd jurexia-frontend-git
git add -A && git commit -m "feat(leyesestatales): agregar leyes de [Estado]" && git push

# Backend (Render) — si hubo cambios en main.py
cd jurexia-api-git
git add -A && git commit -m "feat: ingest script para [Estado]" && git push
```

---

## Checklist Rápido por Estado

```
Estado: _______________   Fecha: _______________

[ ] 1. Scraping: leyes identificadas y URLs obtenidas
[ ] 2. PDFs descargados y verificados
[ ] 3. PDFs subidos a Supabase Storage
[ ] 4. estadosData.ts actualizado con URLs de Supabase
[ ] 5. Frontend desplegado y verificado
[ ] 6. Ingesta RAG ejecutada (dense embeddings)
[ ] 7. BM25 sparse vectors generados
[ ] 8. Búsqueda RAG verificada (4 queries de prueba)
[ ] 9. PDFs accesibles desde la UI
```

---

## Orden de Prioridad Sugerido

| # | Estado | Razón |
|---|--------|-------|
| 1 | Querétaro | Piloto — ya tiene datos scrapeados |
| 2 | CDMX | Mayor demanda de usuarios |
| 3 | Jalisco | 2do estado más consultado |
| 4 | Estado de México | Alto volumen de consultas |
| 5-32 | Resto | Por demanda o alfabético |

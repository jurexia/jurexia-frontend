/**
 * EL DOCUMENTO LISTO (16-oct-2026): la plantilla del despacho + los datos del
 * cliente.
 *
 *   POST { valores: { clave: valor }, expediente_id?, formato?: 'docx' | 'json' }
 *
 * Con `expediente_id`, lo que el navegador no mandó de la carpeta (cliente,
 * domicilio, correo, teléfono, materia, pretensión, título) se toma de ella,
 * leída con el servicio y SÓLO si es de quien pide; la fecha de hoy, en
 * español largo y en la hora de México. Un valor vacío que sí se mandó se
 * respeta: sale «__________» para llenarlo a mano.
 *
 * Gasta 'plantilla_generar' (tope por día) después de validar y antes de
 * llenar. Devuelve el .docx con el formato original; con formato 'json',
 * además el HTML (mammoth) para abrirlo en el editor y el texto plano.
 */

import { NextRequest, NextResponse } from 'next/server'
import mammoth from 'mammoth'
import { servicio, solicitanteDe } from '@/lib/servidor/peticion'
import { gastarUso } from '@/lib/servidor/uso'
import { llenar, MIME_DOCX, NoSePudoLlenar } from '@/lib/plantillas/docx'
import { datosDeCarpeta, nombreDeArchivo, valorDeOrigen, valorLimpio, type DatosCarpeta } from '@/lib/plantillas/campos'
import { htmlDeDocx, textoDeDocx } from '@/lib/plantillas/vista'
import { descargar, devolverUso, fallo, faltaEsquema, plantillaDe, SIN_ESQUEMA } from '@/lib/plantillas/servidor'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
    const yo = await solicitanteDe(req)
    if (!yo) return fallo(401, 'Inicia sesión para usar tus plantillas.')
    let cuerpo: { valores?: unknown; expediente_id?: unknown; formato?: unknown }
    try { cuerpo = await req.json() } catch { return fallo(400, 'Petición mal formada.') }
    const brutos = cuerpo.valores && typeof cuerpo.valores === 'object' && !Array.isArray(cuerpo.valores)
        ? (cuerpo.valores as Record<string, unknown>) : {}

    const { fila, error } = await plantillaDe(yo.user.id, params.id)
    if (error) return faltaEsquema(error) ? fallo(503, SIN_ESQUEMA, { sinEsquema: true }) : fallo(500, 'No se pudo abrir la plantilla.')
    if (!fila) return fallo(404, 'Esa plantilla ya no existe.')
    if (!fila.archivo_marcado) return fallo(409, 'Antes de usarla, revisa y guarda sus campos.')
    const campos = Array.isArray(fila.campos) ? fila.campos : []

    // La carpeta, si viene: del usuario o de nadie.
    let carpeta: (DatosCarpeta & { id: string }) | null = null
    if (typeof cuerpo.expediente_id === 'string' && cuerpo.expediente_id) {
        if (!/^[0-9a-f-]{36}$/i.test(cuerpo.expediente_id)) return fallo(400, 'Carpeta no válida.')
        const { data, error: errCarpeta } = await servicio().from('expedientes')
            .select('id, tipo, titulo, cliente_nombre, cliente_domicilio, cliente_correo, cliente_telefono, materia, pretension')
            .eq('id', cuerpo.expediente_id).eq('user_id', yo.user.id).maybeSingle()
        if (errCarpeta) return fallo(500, 'No se pudo leer la carpeta.')
        if (!data) return fallo(404, 'Esa carpeta ya no existe.')
        carpeta = { ...datosDeCarpeta(data as DatosCarpeta & { tipo?: string | null }), id: (data as { id: string }).id }
    }

    // Los valores: lo que mandó el navegador y, lo que no mandó, de su origen.
    const hoy = new Date()
    const valores: Record<string, string> = {}
    for (const c of campos) {
        if (Object.prototype.hasOwnProperty.call(brutos, c.clave)) {
            const v = valorLimpio(brutos[c.clave])
            if (v !== undefined) valores[c.clave] = v
        } else {
            const v = valorDeOrigen(c.origen, carpeta, hoy)
            if (v !== undefined) valores[c.clave] = v
        }
    }

    try {
        const uso = await gastarUso(yo.user.id, yo.plan, 'plantilla_generar')
        if (!uso.permitido) return fallo(429, uso.mensaje ?? 'Llegaste al tope de documentos de hoy.', { tope: true })
    } catch (e) {
        return fallo(503, (e as Error)?.message || 'No se pudo registrar el uso. Vuelve a intentarlo.')
    }

    let lleno: Uint8Array
    try {
        lleno = llenar(await descargar(fila.archivo_marcado), valores)
    } catch (e) {
        // No salió documento: el uso no se cobra.
        await devolverUso(yo.user.id, 'plantilla_generar')
        if (e instanceof NoSePudoLlenar) return fallo(422, `${e.message} Vuelve a revisar los campos de la plantilla.`)
        console.error('[plantillas] llenar:', (e as Error)?.message)
        return fallo(500, 'No se pudo armar el documento. Vuelve a intentarlo.')
    }

    // Una vez más usada (no es crítico: si falla, el documento ya salió).
    await servicio().from('plantillas_abogado').update({ veces_usada: (fila.veces_usada ?? 0) + 1 })
        .eq('id', fila.id).eq('user_id', yo.user.id)

    const deQuien = campos.find((c) => c.origen === 'carpeta.cliente_nombre' && valores[c.clave])
    const sufijo = deQuien ? valores[deQuien.clave] : carpeta ? (carpeta.titulo || carpeta.cliente_nombre || '') : ''
    const nombre = nombreDeArchivo(sufijo ? `${fila.nombre} — ${sufijo}` : fila.nombre)

    if (cuerpo.formato === 'json') {
        const entrada = { buffer: Buffer.from(lleno) }
        const [html, texto] = await Promise.all([
            htmlDeDocx(mammoth, entrada).catch(() => ''),
            textoDeDocx(mammoth, entrada).catch(() => ''),
        ])
        return NextResponse.json({ nombre, docx: Buffer.from(lleno).toString('base64'), html, texto })
    }
    return new NextResponse(Buffer.from(lleno), {
        status: 200,
        headers: {
            'Content-Type': MIME_DOCX,
            'Content-Disposition': `attachment; filename="documento.docx"; filename*=UTF-8''${encodeURIComponent(nombre)}`,
            'X-Nombre-Archivo': encodeURIComponent(nombre),
            'Cache-Control': 'no-store',
        },
    })
}

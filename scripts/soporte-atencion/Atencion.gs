/**
 * ATENCIÓN DE REPORTES — Google Apps Script en la cuenta soporte@iurexia.com (29-oct-2026).
 *
 * Va como ARCHIVO NUEVO dentro del proyecto «Soporte automático» que ya corre en soporte@
 * (script.google.com, el de Codigo.gs). No toca nada de lo que ya hace ese script.
 *
 * Qué hace, cada 10 minutos:
 *   1. Mira lo que SALIÓ de soporte@ en los últimos días hacia un abogado (no a soporte@ ni a
 *      David) y le cuenta a Iurexia a quién y con qué folios. Así el reporte pasa a «respondido»
 *      sin que nadie lo marque: contestar ES marcarlo.
 *   2. Mira lo que ENTRÓ de abogados (no automático, no un «gracias») y lo cuenta también: si
 *      alguien vuelve a escribir después de que se le respondió, su reporte regresa a «pendiente».
 *
 * No lee ni manda nada más. No escribe en Supabase: llama a /api/soporte/atencion, que sólo sirve
 * para mover el estado de atención.
 *
 * SIN CLAVE: cada llamada lleva `Authorization: Bearer <ScriptApp.getIdentityToken()>`, el token de
 * identidad de la cuenta que ejecuta el script (soporte@). Lo firma Google, dura una hora y el
 * servidor sólo acepta el de soporte@iurexia.com con el correo verificado. No hay nada que guardar
 * ni que copiar en Vercel. La propiedad ATENCION_KEY ya no hace falta; si existe, se manda además
 * como x-atencion-key (sólo sirve si Vercel tiene SOPORTE_ATENCION_KEY).
 *
 * INSTALAR (en script.google.com con la sesión de soporte@, proyecto «Soporte automático»; después
 * de que esté desplegada la ruta que acepta la identidad):
 *   1. Archivos › «+» › Secuencia de comandos › nombre «Atencion»; pegar este archivo entero y guardar.
 *   2. Configuración del proyecto (el engrane) › marcar «Mostrar el archivo de manifiesto
 *      "appsscript.json" en el editor». En Editor, abrir appsscript.json, reemplazar TODO su
 *      contenido por scripts/soporte-atencion/appsscript.json y guardar.
 *   3. Abrir Atencion.gs, elegir revisarAtencionHistorica en el menú de funciones y pulsar
 *      «Ejecutar», una vez (mira 35 días hacia atrás, para los reportes que ya se habían
 *      contestado). Google vuelve a pedir permisos —ahora también «ver su dirección de correo
 *      electrónico»—: aceptarlos con soporte@. El registro debe decir
 *      «atención: {"observaciones":…}», no «atención: 401 …».
 *      Hacer 2 y 3 seguidos: hasta aceptar los permisos nuevos, el disparador de Codigo.gs puede fallar.
 *   4. Elegir instalarAtencion y pulsar «Ejecutar»: crea el disparador de cada 10 minutos.
 *   Ojo: instalar() de Codigo.gs borra TODOS los disparadores; si se vuelve a ejecutar, ejecutar
 *   también instalarAtencion().
 *
 * LOS PERMISOS (oauthScopes de appsscript.json). Al declararlos, Apps Script deja de deducirlos del
 * código: la lista lleva todo lo que usan Codigo.gs y este archivo.
 *   https://mail.google.com/                                  GmailApp, en los dos archivos: search,
 *       getMessages, getFrom/To/Cc/Date/Subject/PlainBody, getLabels, getUserLabelByName,
 *       createLabel, addLabel, markRead, reply, createDraftReply. Su referencia sólo admite este
 *       scope: con gmail.readonly, .modify, .send o .compose, GmailApp falla. Ya lo tenía concedido.
 *   https://www.googleapis.com/auth/script.scriptapp          disparadores: instalar() e instalarAtencion().
 *   https://www.googleapis.com/auth/script.external_request   UrlFetchApp.fetch (este archivo).
 *   openid                                                    ScriptApp.getIdentityToken() (este archivo).
 *   https://www.googleapis.com/auth/userinfo.email            que el token traiga email y email_verified.
 *   PropertiesService, Utilities y console no piden permiso.
 */

const ATENCION_URL = 'https://www.iurexia.com/api/soporte/atencion';
const ATENCION_PROPIA = 'soporte@iurexia.com';
// David y la casa: un correo a ellos no es responderle al abogado.
const ATENCION_INTERNOS = /(@iurexia\.com$|^jdm\.?juridico@gmail\.com$)/i;
// Remitentes automáticos que nunca son un abogado.
const ATENCION_NO_HUMANO = /(no-?reply|mailer-daemon|postmaster|notifications?@|@stripe\.com|@resend|@vercel|@supabase|@google\.com|@render\.com|@facebookmail|@github\.com)/i;
// Las respuestas automáticas de Codigo.gs (cómo se usa, reporte de fallo, cancelación) no son
// atención de una persona: no cuentan como «respondido».
const ATENCION_AUTOMATICA = /(le atiende una persona de nuestro equipo|Avisos como el suyo son los que nos permiten|No necesita escribirnos: lo puede hacer usted mismo)/i;
// «ok», «gracias»: no reabren un reporte.
const ATENCION_ACUSE = /^(ok(ay|ey)?|okis|va|vale|perfecto|enterado|recibido|de acuerdo|listo|excelente|muy bien|si|sí|claro|gracias|muchas gracias|mil gracias|saludos|[\s.!,]*)+$/i;

function revisarAtencion() {
  atencionEnviar_(3);
}

function revisarAtencionHistorica() {
  atencionEnviar_(35);
}

function instalarAtencion() {
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'revisarAtencion')
    .forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('revisarAtencion').timeBased().everyMinutes(10).create();
}

function atencionEnviar_(dias) {
  const obs = [];

  // 1. Lo que salió de soporte@ hacia un abogado.
  GmailApp.search(`in:sent newer_than:${dias}d`, 0, 300).forEach(hilo => {
    hilo.getMessages().forEach(m => {
      if (!/soporte@iurexia\.com/i.test(m.getFrom())) return;
      const para = atencionCorreos_([m.getTo(), m.getCc()].join(','))
        .filter(c => c !== ATENCION_PROPIA && !ATENCION_INTERNOS.test(c));
      if (!para.length) return;   // los avisos a soporte@ mismo, las vistas previas a David
      const cuerpo = m.getPlainBody() || '';
      if (ATENCION_AUTOMATICA.test(cuerpo)) return;
      obs.push({
        tipo: 'respuesta',
        fecha: m.getDate().toISOString(),
        correos: para,
        folios: atencionFolios_(`${m.getSubject()}\n${cuerpo.slice(0, 4000)}`),
        hilo: hilo.getId(),
      });
    });
  });

  // 2. Lo que escribieron los abogados (también lo ya archivado: archivar no es contestar).
  GmailApp.search(`newer_than:${dias}d -in:sent -in:drafts -from:me -category:promotions -category:social -category:forums`, 0, 300)
    .forEach(hilo => {
      hilo.getMessages().forEach(m => {
        const de = atencionCorreos_(m.getFrom())[0];
        if (!de || de === ATENCION_PROPIA || ATENCION_INTERNOS.test(de) || ATENCION_NO_HUMANO.test(m.getFrom())) return;
        const propio = atencionTextoPropio_(m.getPlainBody());
        if (propio.length < 60 && ATENCION_ACUSE.test(propio.replace(/[^\p{L}\s.!,]/gu, ' ').trim())) return;
        obs.push({
          tipo: 'usuario',
          fecha: m.getDate().toISOString(),
          correos: [de],
          folios: atencionFolios_(m.getSubject()),
          hilo: hilo.getId(),
        });
      });
    });

  if (!obs.length) return;
  // El token se pide al final, ya con todo contado: dura una hora y así llega fresco.
  const cabeceras = atencionCabeceras_();
  if (!cabeceras) return;
  // El servidor acepta 500 por llamada; lo más reciente es lo que importa.
  obs.sort((a, b) => a.fecha < b.fecha ? -1 : 1);
  for (let i = Math.max(0, obs.length - 1500); i < obs.length; i += 500) {
    const r = UrlFetchApp.fetch(ATENCION_URL, {
      method: 'post',
      contentType: 'application/json',
      headers: cabeceras,
      payload: JSON.stringify({ observaciones: obs.slice(i, i + 500) }),
      muteHttpExceptions: true,
    });
    if (r.getResponseCode() !== 200) console.error(`atención: ${r.getResponseCode()} ${r.getContentText().slice(0, 300)}`);
    else console.log(`atención: ${r.getContentText().slice(0, 300)}`);
  }
}

/**
 * Quién llama: el token de identidad de la cuenta que ejecuta el script (soporte@), que pide
 * «openid» y «userinfo.email» en appsscript.json. La clave vieja sólo va si existe la propiedad.
 */
function atencionCabeceras_() {
  const cabeceras = {};
  let token = null;
  try { token = ScriptApp.getIdentityToken(); }
  catch (e) { console.warn(`atención: getIdentityToken falló: ${e}`); }
  if (token) cabeceras.Authorization = 'Bearer ' + token;
  const clave = PropertiesService.getScriptProperties().getProperty('ATENCION_KEY');
  if (clave) cabeceras['x-atencion-key'] = clave;
  if (!token && !clave) {
    console.error('atención: sin token de identidad. Faltan «openid» y «https://www.googleapis.com/auth/userinfo.email» '
      + 'en appsscript.json, o no se aceptaron los permisos (ejecute revisarAtencionHistorica a mano). No se cuenta nada.');
    return null;
  }
  return cabeceras;
}

function atencionCorreos_(texto) {
  return (String(texto || '').match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) || [])
    .map(c => c.toLowerCase());
}

/** «folio 1850-02», «Folio 3640-01:», «folios 14-07 y 14-16». */
function atencionFolios_(texto) {
  const vistos = {};
  const rx = /\bfolios?\b[^0-9]{0,12}((?:\d{1,6}-\d{2}(?:[\s,;y]+)?)+)/gi;
  let m;
  while ((m = rx.exec(texto || '')) !== null) {
    (m[1].match(/\d{1,6}-\d{2}/g) || []).forEach(f => { vistos[f] = true; });
  }
  return Object.keys(vistos);
}

/** Sólo lo que la persona escribió: corta en la primera línea de cita (igual que Codigo.gs). */
function atencionTextoPropio_(cuerpo) {
  const lineas = String(cuerpo || '').split(/\r?\n/);
  const out = [];
  for (let i = 0; i < lineas.length; i++) {
    const l = lineas[i], sig = lineas[i + 1] || '';
    if (/^\s*>/.test(l)) break;
    if (/(escribi[oó]|wrote)\s*:?\s*$/i.test(l) && /^\s*(El|On)\s/i.test(l)) break;
    if (/^\s*(El|On)\s/i.test(l) && /^\s*(escribi[oó]|wrote)\s*:?\s*$/i.test(sig)) break;
    if (/^-{2,}\s*(Original|Mensaje original|Forwarded)/i.test(l)) break;
    if (/^(De|From):\s/.test(l)) break;
    out.push(l);
  }
  return out.join('\n').trim();
}

// Para probar sin Gmail (node): exporta las funciones puras.
if (typeof module !== 'undefined') module.exports = { atencionFolios_, atencionCorreos_, atencionTextoPropio_, atencionCabeceras_ };

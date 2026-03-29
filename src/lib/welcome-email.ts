// ─── Welcome Email Builder ─────────────────────────────────
// Shared module used by both the admin welcome-email route
// and the Stripe webhook for auto-sending on checkout.

interface PlanFeatures {
    label: string;
    queries: string;
    highlights: string[];
    features: string[];
    exclusive?: string;
}

const PLAN_FEATURES: Record<string, PlanFeatures> = {
    platinum_monthly: {
        label: 'PLATINUM',
        queries: '560 consultas/mes',
        highlights: [
            '⚡ Arquitectura Multi-Genio — Activa hasta 2 Genios Especializados (Amparo, CIDH, Civil, Penal y más) para razonamiento jurídico avanzado e interdisciplinario',
            '🔍 Análisis y Auditoría de Documentos — Sube contratos, sentencias o cualquier documento legal para obtener un análisis detallado con sugerencias de mejora',
        ],
        features: [
            '📋 Registro Connect — Registra tu cédula profesional para aparecer en nuestro directorio y conectar con clientes potenciales',
            '⚖️ Búsqueda con IA verificada en constante actualización',
            '🏛️ Filtros por entidad federativa + marco federal completo',
            '🛡️ Soporte VIP dedicado — Atención prioritaria por correo electrónico',
        ],
        exclusive: '💼 <strong>Consulta Legal Estratégica</strong> — Como suscriptor Platinum, tienes acceso exclusivo a consulta directa con un abogado del equipo legal de Iurexia vía correo electrónico. Escríbenos a <a href="mailto:soporte@iurexia.com" style="color:#c9a84c;text-decoration:none;">soporte@iurexia.com</a> con tu caso y te responderemos a la brevedad.',
    },
    platinum_annual: {
        label: 'PLATINUM ANUAL',
        queries: '560 consultas/mes',
        highlights: [
            '⚡ Arquitectura Multi-Genio — Activa hasta 2 Genios Especializados (Amparo, CIDH, Civil, Penal y más) para razonamiento jurídico avanzado e interdisciplinario',
            '🔍 Análisis y Auditoría de Documentos — Sube contratos, sentencias o cualquier documento legal para obtener un análisis detallado con sugerencias de mejora',
        ],
        features: [
            '📋 Registro Connect — Registra tu cédula profesional para aparecer en nuestro directorio y conectar con clientes potenciales',
            '⚖️ Búsqueda con IA verificada en constante actualización',
            '🏛️ Filtros por entidad federativa + marco federal completo',
            '🛡️ Soporte VIP dedicado — Atención prioritaria por correo electrónico',
        ],
        exclusive: '💼 <strong>Consulta Legal Estratégica</strong> — Como suscriptor Platinum, tienes acceso exclusivo a consulta directa con un abogado del equipo legal de Iurexia vía correo electrónico. Escríbenos a <a href="mailto:soporte@iurexia.com" style="color:#c9a84c;text-decoration:none;">soporte@iurexia.com</a> con tu caso y te responderemos a la brevedad.',
    },
    pro_monthly: {
        label: 'PRO',
        queries: '140 consultas/mes',
        highlights: [
            '⚡ Arquitectura Multi-Genio — Activa hasta 2 Genios Especializados (Amparo, CIDH, Civil, Penal y más) para razonamiento jurídico avanzado e interdisciplinario',
            '🔍 Análisis y Auditoría de Documentos — Sube contratos, sentencias o cualquier documento legal para obtener un análisis detallado con sugerencias de mejora',
        ],
        features: [
            '📋 Registro Connect — Registra tu cédula profesional para aparecer en nuestro directorio y conectar con clientes potenciales',
            '⚖️ Búsqueda con IA verificada en constante actualización',
            '🏛️ Filtros por entidad federativa + marco federal completo',
            '🛡️ Soporte prioritario por correo electrónico',
        ],
    },
    pro_annual: {
        label: 'PRO ANUAL',
        queries: '140 consultas/mes',
        highlights: [
            '⚡ Arquitectura Multi-Genio — Activa hasta 2 Genios Especializados (Amparo, CIDH, Civil, Penal y más) para razonamiento jurídico avanzado e interdisciplinario',
            '🔍 Análisis y Auditoría de Documentos — Sube contratos, sentencias o cualquier documento legal para obtener un análisis detallado con sugerencias de mejora',
        ],
        features: [
            '📋 Registro Connect — Registra tu cédula profesional para aparecer en nuestro directorio y conectar con clientes potenciales',
            '⚖️ Búsqueda con IA verificada en constante actualización',
            '🏛️ Filtros por entidad federativa + marco federal completo',
            '🛡️ Soporte prioritario por correo electrónico',
        ],
    },
    basico_monthly: {
        label: 'BÁSICO',
        queries: '70 consultas/mes',
        highlights: [],
        features: [
            '⚖️ Búsqueda inteligente en la base de datos legal de Iurexia',
            '🏛️ Filtros por entidad federativa + marco federal',
            '📚 Acceso a base documental completa',
            '🛡️ Soporte estándar',
        ],
    },
    ultra_secretarios: {
        label: 'ULTRA SECRETARIOS',
        queries: '140 consultas/mes',
        highlights: [
            '⚡ Arquitectura Multi-Genio — Genios Especializados para razonamiento jurídico avanzado',
            '🔍 Análisis y Auditoría de Documentos',
        ],
        features: [
            '⚖️ Búsqueda con IA verificada en constante actualización',
            '🏛️ Filtros por entidad federativa + marco federal completo',
            '🛡️ Soporte prioritario por correo electrónico',
        ],
    },
};

function buildFeaturesHtml(plan: PlanFeatures): string {
    let html = '';
    for (const feat of plan.highlights) {
        html += `<tr><td style="padding:8px 0;font-size:13px;color:#c9a84c;line-height:1.6;font-weight:600;">${feat}</td></tr>`;
    }
    for (const feat of plan.features) {
        html += `<tr><td style="padding:6px 0;font-size:13px;color:#ccc;line-height:1.5;">${feat}</td></tr>`;
    }
    return html;
}

export function buildWelcomeEmail(params: {
    name: string;
    estado: string;
    planType: string;
    planLabel?: string;
    isIngested: boolean;
}): string {
    const { name, estado, planType, planLabel, isIngested } = params;
    const firstName = name.split(' ')[0] || name;
    const plan = PLAN_FEATURES[planType] || PLAN_FEATURES.pro_monthly;
    const displayLabel = planLabel || plan.label;

    const isPlatinum = planType.includes('platinum');
    const isBasico = planType.includes('basico');

    return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0a;padding:40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color:#111111;border-radius:16px;overflow:hidden;border:1px solid #222;">

                    <!-- Header -->
                    <tr>
                        <td style="background:linear-gradient(135deg,#1a1a1a 0%,#1f1f1f 100%);padding:32px 40px;border-bottom:1px solid #333;">
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td>
                                        <span style="font-size:26px;font-weight:800;color:#ffffff;letter-spacing:1px;">
                                            IUREX<span style="color:#c9a84c;">IA</span>
                                        </span>
                                    </td>
                                    <td align="right">
                                        <span style="background:linear-gradient(135deg,${isPlatinum ? '#f59e0b,#ea580c' : '#c9a84c,#e8c56d'});color:${isPlatinum ? '#fff' : '#1a1a1a'};font-size:11px;font-weight:700;padding:4px 12px;border-radius:20px;letter-spacing:0.5px;">${displayLabel}</span>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Body -->
                    <tr>
                        <td style="padding:40px;">
                            <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#ffffff;">
                                ¡Bienvenido/a, ${firstName}! 🎉
                            </h1>
                            <p style="margin:0 0 28px;font-size:15px;color:#999;line-height:1.6;">
                                Gracias por confiar en Iurexia. Tu plan <strong style="color:#c9a84c;">${displayLabel}</strong> ya está activo con <strong style="color:#fff;">${plan.queries}</strong>.
                            </p>

                            <!-- State card -->
                            <div style="background-color:#1a1a1a;border:1px solid #2a2a2a;border-radius:12px;padding:24px;margin-bottom:24px;">
                                <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#c9a84c;text-transform:uppercase;letter-spacing:1px;">
                                    📍 Tu Estado: ${estado}
                                </p>
                                ${isIngested ? `
                                <p style="margin:0;font-size:14px;color:#86efac;line-height:1.7;">
                                    ✅ <strong style="color:#fff;">¡Excelentes noticias!</strong> La legislación de <strong style="color:#fff;">${estado}</strong> ya se encuentra completamente integrada en nuestra base de datos.
                                    Puedes consultar códigos, leyes y reglamentos de tu entidad directamente en el chat.
                                </p>
                                ` : `
                                <p style="margin:0;font-size:14px;color:#ccc;line-height:1.7;">
                                    Estamos trabajando activamente para integrar la legislación completa de <strong style="color:#fff;">${estado}</strong> a nuestra base de datos.
                                    Muy pronto tendrás acceso a los códigos, leyes y reglamentos de tu entidad directamente en tus consultas.
                                </p>
                                `}
                            </div>

                            <!-- Plan features -->
                            <div style="background-color:#0d1b0d;border:1px solid #1a3a1a;border-radius:12px;padding:24px;margin-bottom:24px;">
                                <p style="margin:0 0 12px;font-size:14px;font-weight:700;color:#86efac;">
                                    ✅ Lo que incluye tu Plan ${displayLabel}:
                                </p>
                                <table cellpadding="0" cellspacing="0" width="100%">
                                    ${buildFeaturesHtml(plan)}
                                </table>
                            </div>

                            ${plan.exclusive ? `
                            <!-- Exclusive feature (Platinum) -->
                            <div style="background-color:#1a1520;border:1px solid #c9a84c40;border-left:4px solid #c9a84c;border-radius:12px;padding:24px;margin-bottom:24px;">
                                <p style="margin:0 0 8px;font-size:14px;font-weight:700;color:#c9a84c;">
                                    🌟 Exclusivo Platinum
                                </p>
                                <p style="margin:0;font-size:14px;color:#ccc;line-height:1.7;">
                                    ${plan.exclusive}
                                </p>
                            </div>
                            ` : ''}

                            ${!isBasico ? `
                            <!-- Available resources -->
                            <div style="background-color:#1a1a1a;border:1px solid #2a2a2a;border-radius:12px;padding:24px;margin-bottom:24px;">
                                <p style="margin:0 0 12px;font-size:14px;font-weight:700;color:#e5e5e5;">
                                    📚 Base Documental Disponible:
                                </p>
                                <table cellpadding="0" cellspacing="0" width="100%">
                                    <tr><td style="padding:4px 0;font-size:13px;color:#ccc;line-height:1.5;">⚖️&nbsp; <strong style="color:#fff;">Constitución Política</strong> (CPEUM)</td></tr>
                                    <tr><td style="padding:4px 0;font-size:13px;color:#ccc;line-height:1.5;">📜&nbsp; <strong style="color:#fff;">Leyes Federales</strong> — Código Civil Federal, Código Penal Federal, Ley Federal del Trabajo, Ley de Amparo y más</td></tr>
                                    <tr><td style="padding:4px 0;font-size:13px;color:#ccc;line-height:1.5;">🌐&nbsp; <strong style="color:#fff;">Tratados Internacionales</strong> — CADH, PIDCP, Convención de Viena, entre otros</td></tr>
                                    <tr><td style="padding:4px 0;font-size:13px;color:#ccc;line-height:1.5;">🏛️&nbsp; <strong style="color:#fff;">Jurisprudencia Nacional</strong> — Tesis de la SCJN, TCC y Plenos de Circuito</td></tr>
                                    <tr><td style="padding:4px 0;font-size:13px;color:#ccc;line-height:1.5;">🌎&nbsp; <strong style="color:#fff;">Jurisprudencia Interamericana</strong> — Sentencias y opiniones de la Corte IDH</td></tr>
                                </table>
                            </div>
                            ` : ''}

                            <!-- Usage tip -->
                            <div style="background-color:#1a1520;border:1px solid #2d2040;border-radius:12px;padding:24px;margin-bottom:28px;">
                                <p style="margin:0 0 8px;font-size:14px;font-weight:700;color:#c4b5fd;">
                                    💡 Consejo para obtener mejores resultados
                                </p>
                                <p style="margin:0;font-size:14px;color:#bbb;line-height:1.6;">
                                    Te invitamos a revisar la <strong style="color:#fff;">Guía de Uso</strong> ubicada en la barra del chat.
                                    Ahí encontrarás tips para formular consultas más precisas y aprovechar al máximo el potencial de Iurexia.
                                </p>
                            </div>

                            <!-- CTA -->
                            <table cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                    <td align="center" style="padding:8px 0 0;">
                                        <a href="https://www.iurexia.com/chat"
                                           style="display:inline-block;background:linear-gradient(135deg,${isPlatinum ? '#f59e0b,#ea580c' : '#c9a84c,#e8c56d'});color:${isPlatinum ? '#fff' : '#1a1a1a'};font-size:15px;font-weight:700;padding:14px 40px;border-radius:10px;text-decoration:none;letter-spacing:0.3px;">
                                            Comenzar a consultar →
                                        </a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color:#0a0a0a;padding:24px 40px;border-top:1px solid #222;">
                            <p style="margin:0 0 4px;font-size:12px;color:#666;text-align:center;">
                                ¿Dudas o sugerencias? Escríbenos a
                                <a href="mailto:soporte@iurexia.com" style="color:#c9a84c;text-decoration:none;">soporte@iurexia.com</a>
                            </p>
                            <p style="margin:0;font-size:11px;color:#444;text-align:center;">
                                © 2026 Iurexia Technologies. Inteligencia Artificial para el Derecho Mexicano.
                            </p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;
}

// ─── Data Definitions for all 32 Mexican States ───────────────

export interface Ley {
    nombre: string;
    url?: string;
    fecha?: string;
}

export interface CategoriaLeyes {
    constitucion: Ley[];
    leyes: Ley[];
    codigos: Ley[];
    reglamentos: Ley[];
    otros: Ley[];
}

export interface Estado {
    slug: string;
    nombre: string;
    nombreCorto: string;
    abreviatura: string;
    region: 'norte' | 'centro' | 'sur' | 'occidente' | 'oriente';
    leyesCount: number;
    ultimaActualizacion?: string;
    leyes: CategoriaLeyes;
}

// ─── Placeholder for states without data yet ──────────────────
const LEYES_PLACEHOLDER: CategoriaLeyes = {
    constitucion: [],
    leyes: [],
    codigos: [],
    reglamentos: [],
    otros: [],
};

// ─── Querétaro: FULL DATA from legislaturaqueretaro.gob.mx ───
const QRO_BASE = 'http://site.legislaturaqueretaro.gob.mx/CloudPLQ/InvEst';

const QUERETARO_LEYES: CategoriaLeyes = {
    constitucion: [
        { nombre: 'Constitución Política del Estado Libre y Soberano de Querétaro', url: `${QRO_BASE}/Leyes/CON-ID-001.pdf` },
    ],
    leyes: [
        { nombre: 'Ley de Adquisiciones, Enajenaciones, Arrendamientos y Contratación de servicios del Estado de Querétaro', url: `${QRO_BASE}/Leyes/LEY-ID-002.pdf` },
        { nombre: 'Ley de Archivos del Estado de Querétaro', url: `${QRO_BASE}/Leyes/LEY-ID-003.pdf` },
        { nombre: 'Ley de Asociaciones Público Privadas para el Estado de Querétaro', url: `${QRO_BASE}/Leyes/LEY-ID-004.pdf` },
        { nombre: 'Ley de Cambio Climático para el Estado de Querétaro', url: `${QRO_BASE}/Leyes/LEY-ID-005.pdf` },
        { nombre: 'Ley de Catastro para el Estado de Querétaro', url: `${QRO_BASE}/Leyes/LEY-ID-006.pdf` },
        { nombre: 'Ley de Coordinación Fiscal, Estatal Intermunicipal del Estado de Querétaro', url: `${QRO_BASE}/Leyes/LEY-ID-007.pdf` },
        { nombre: 'Ley de Derechos Humanos del Estado de Querétaro', url: `${QRO_BASE}/Leyes/LEY-ID-008.pdf` },
        { nombre: 'Ley de Derechos y Cultura de los Pueblos y Comunidades Indígenas del Estado de Querétaro', url: `${QRO_BASE}/Leyes/LEY-ID-009.pdf` },
        { nombre: 'Ley de Desarrollo Pecuario del Estado de Querétaro', url: `${QRO_BASE}/Leyes/LEY-ID-010.pdf` },
        { nombre: 'Ley de Desarrollo Social del Estado de Querétaro', url: `${QRO_BASE}/Leyes/LEY-ID-011.pdf` },
        { nombre: 'Ley de Deuda Pública del Estado de Querétaro', url: `${QRO_BASE}/Leyes/LEY-ID-012.pdf` },
        { nombre: 'Ley de Donación y Trasplante de Órganos, Tejidos y Células Humanas del Estado de Querétaro', url: `${QRO_BASE}/Leyes/LEY-ID-013.pdf` },
        { nombre: 'Ley de Educación del Estado de Querétaro', url: `${QRO_BASE}/Leyes/LEY-ID-014.pdf` },
        { nombre: 'Ley de Entrega Recepción del Estado de Querétaro', url: `${QRO_BASE}/Leyes/LEY-ID-015.pdf` },
        { nombre: 'Ley de Estacionamientos Públicos y Servicios de Recepción y Depósito de Vehículos para el Estado de Querétaro', url: `${QRO_BASE}/Leyes/LEY-ID-016.pdf` },
        { nombre: 'Ley de Estímulos Civiles del Estado de Querétaro', url: `${QRO_BASE}/Leyes/LEY-ID-017.pdf` },
        { nombre: 'Ley de Expropiación del Estado de Querétaro', url: `${QRO_BASE}/Leyes/LEY-ID-018.pdf` },
        { nombre: 'Ley de Extinción de Dominio del Estado de Querétaro', url: `${QRO_BASE}/Leyes/LEY-ID-019.pdf` },
        { nombre: 'Ley de Firma Electrónica Avanzada para el Estado de Querétaro', url: `${QRO_BASE}/Leyes/LEY-ID-020.pdf` },
        { nombre: 'Ley de Fiscalización Superior y Rendición de Cuentas del Estado de Querétaro', url: `${QRO_BASE}/Leyes/LEY-ID-021.pdf` },
        { nombre: 'Ley de Fomento a la Actividad Artesanal en el Estado de Querétaro', url: `${QRO_BASE}/Leyes/LEY-ID-022.pdf` },
        { nombre: 'Ley de Fomento a las Organizaciones de la Sociedad Civil del Estado de Querétaro', url: `${QRO_BASE}/Leyes/LEY-ID-023.pdf` },
        { nombre: 'Ley de Fomento Apícola y Protección del proceso de Polinización en el Estado de Querétaro', url: `${QRO_BASE}/Leyes/LEY-ID-024.pdf` },
        { nombre: 'Ley de Fundos Legales del Estado de Querétaro', url: `${QRO_BASE}/Leyes/LEY-ID-025.pdf` },
        { nombre: 'Ley de Gobierno Digital del Estado de Querétaro', url: `${QRO_BASE}/Leyes/LEY-ID-026.pdf` },
        { nombre: 'Ley de Hacienda de los Municipios del Estado de Querétaro', url: `${QRO_BASE}/Leyes/LEY-ID-027.pdf` },
        { nombre: 'Ley de Hacienda del Estado de Querétaro', url: `${QRO_BASE}/Leyes/LEY-ID-028.pdf` },
        { nombre: 'Ley de Igualdad Sustantiva entre Mujeres y Hombres del Estado de Querétaro', url: `${QRO_BASE}/Leyes/LEY-ID-029.pdf` },
        { nombre: 'Ley de Instituciones de Asistencia Privada del Estado de Querétaro', url: `${QRO_BASE}/Leyes/LEY-ID-030.pdf` },
        { nombre: 'Ley de Juicio Político del Estado de Querétaro', url: `${QRO_BASE}/Leyes/LEY-ID-031.pdf` },
        { nombre: 'Ley de Justicia Constitucional del Estado de Querétaro', url: `${QRO_BASE}/Leyes/LEY-ID-032.pdf` },
        { nombre: 'Ley de Justicia para Adolescentes del Estado de Querétaro', url: `${QRO_BASE}/Leyes/LEY-ID-033.pdf` },
        { nombre: 'Ley de la Administración Pública Paraestatal del Estado de Querétaro', url: `${QRO_BASE}/Leyes/LEY-ID-034.pdf` },
        { nombre: 'Ley de la Agencia de Movilidad y Modalidades de Transporte Público para el Estado de Querétaro', url: `${QRO_BASE}/Leyes/LEY-ID-035.pdf` },
        { nombre: 'Ley de la Secretaría de Seguridad Ciudadana del Estado de Querétaro', url: `${QRO_BASE}/Leyes/LEY-ID-036.pdf` },
        { nombre: 'Ley de la Unidad de medida y actualización del Estado de Querétaro', url: `${QRO_BASE}/Leyes/LEY-ID-037.pdf` },
        { nombre: 'Ley de los Derechos de las Personas Adultas Mayores del Estado de Querétaro', url: `${QRO_BASE}/Leyes/LEY-ID-038.pdf` },
        { nombre: 'Ley de los Derechos de las Niñas, Niños y Adolescentes del Estado de Querétaro', url: `${QRO_BASE}/Leyes/LEY-ID-039.pdf` },
        { nombre: 'Ley de los Trabajadores del Estado de Querétaro', url: `${QRO_BASE}/Leyes/LEY-ID-040.pdf` },
        { nombre: 'Ley de Medios de Impugnación en Materia Electoral del Estado de Querétaro', url: `${QRO_BASE}/Leyes/LEY-ID-041.pdf` },
        { nombre: 'Ley de Mejora Regulatoria del Estado de Querétaro', url: `${QRO_BASE}/Leyes/LEY-ID-042.pdf` },
        { nombre: 'Ley de Obra Pública del Estado de Querétaro', url: `${QRO_BASE}/Leyes/LEY-ID-043.pdf` },
        { nombre: 'Ley de Participación Ciudadana del Estado de Querétaro', url: `${QRO_BASE}/Leyes/LEY-ID-044.pdf` },
        { nombre: 'Ley de Planeación del Estado de Querétaro', url: `${QRO_BASE}/Leyes/LEY-ID-045.pdf` },
        { nombre: 'Ley de Procedimiento Contencioso Administrativo del Estado de Querétaro', url: `${QRO_BASE}/Leyes/LEY-ID-046.pdf` },
        { nombre: 'Ley de Procedimientos Administrativos del Estado de Querétaro', url: `${QRO_BASE}/Leyes/LEY-ID-047.pdf` },
        { nombre: 'Ley de Profesiones del Estado de Querétaro', url: `${QRO_BASE}/Leyes/LEY-ID-048.pdf` },
        { nombre: 'Ley de Protección a Víctimas, Ofendidos y Personas que Intervienen en el Procedimiento Penal del Estado de Querétaro', url: `${QRO_BASE}/Leyes/LEY-ID-049.pdf` },
        { nombre: 'Ley de Protección de Datos Personales en Posesión de Sujetos Obligados del Estado de Querétaro', url: `${QRO_BASE}/Leyes/LEY-ID-050.pdf` },
        { nombre: 'Ley de Publicaciones Oficiales del Estado de Querétaro', url: `${QRO_BASE}/Leyes/LEY-ID-051.pdf` },
        { nombre: 'Ley de Respeto Vecinal para el Estado de Querétaro', url: `${QRO_BASE}/Leyes/LEY-ID-052.pdf` },
        { nombre: 'Ley de Responsabilidad Patrimonial del Estado de Querétaro', url: `${QRO_BASE}/Leyes/LEY-ID-053.pdf` },
        { nombre: 'Ley de Responsabilidades Administrativas del Estado de Querétaro', url: `${QRO_BASE}/Leyes/LEY-ID-054.pdf` },
        { nombre: 'Ley de Salud del Estado de Querétaro', url: `${QRO_BASE}/Leyes/LEY-ID-055.pdf` },
        { nombre: 'Ley de Salud Mental del Estado de Querétaro', url: `${QRO_BASE}/Leyes/LEY-ID-056.pdf` },
        { nombre: 'Ley de Seguridad para el Estado de Querétaro', url: `${QRO_BASE}/Leyes/LEY-ID-057.pdf` },
        { nombre: 'Ley de Servicios Auxiliares del Transporte Público del Estado de Querétaro', url: `${QRO_BASE}/Leyes/LEY-ID-058.pdf` },
        { nombre: 'Ley de Tránsito para el estado de Querétaro', url: `${QRO_BASE}/Leyes/LEY-ID-059.pdf` },
        { nombre: 'Ley de Transparencia y Acceso a la Información Pública del Estado de Querétaro', url: `${QRO_BASE}/Leyes/LEY-ID-060.pdf` },
        { nombre: 'Ley de Turismo del Estado de Querétaro', url: `${QRO_BASE}/Leyes/LEY-ID-061.pdf` },
        { nombre: 'Ley de Valuación Inmobiliaria para el Estado de Querétaro', url: `${QRO_BASE}/Leyes/LEY-ID-062.pdf` },
        { nombre: 'Ley del Centro de Capacitación, Formación e Investigación para la Seguridad del Estado de Querétaro', url: `${QRO_BASE}/Leyes/LEY-ID-063.pdf` },
        { nombre: 'Ley del Centro de Prevención social del Delito y la Violencia en el Estado de Querétaro', url: `${QRO_BASE}/Leyes/LEY-ID-064.pdf` },
        { nombre: 'Ley del Deporte del Estado de Querétaro', url: `${QRO_BASE}/Leyes/LEY-ID-065.pdf` },
        { nombre: 'Ley del Escudo, la Bandera y el Himno del Estado de Querétaro', url: `${QRO_BASE}/Leyes/LEY-ID-066.pdf` },
        { nombre: 'Ley del Instituto de la Defensoría Penal Pública del Estado de Querétaro', url: `${QRO_BASE}/Leyes/LEY-ID-067.pdf` },
        { nombre: 'Ley del Instituto Queretano de las Mujeres', url: `${QRO_BASE}/Leyes/LEY-ID-068.pdf` },
        { nombre: 'Ley del Instituto Registral y Catastral del Estado de Querétaro', url: `${QRO_BASE}/Leyes/LEY-ID-069.pdf` },
        { nombre: 'Ley del Notariado del Estado de Querétaro', url: `${QRO_BASE}/Leyes/LEY-ID-070.pdf` },
        { nombre: 'Ley del Sistema de Asistencia Social del Estado de Querétaro', url: `${QRO_BASE}/Leyes/LEY-ID-071.pdf` },
        { nombre: 'Ley del Sistema de Servicio Profesional de Carrera del Poder Legislativo del Estado de Querétaro', url: `${QRO_BASE}/Leyes/LEY-ID-072.pdf` },
        { nombre: 'Ley del Sistema Estatal Anticorrupción de Querétaro', url: `${QRO_BASE}/Leyes/LEY-ID-073.pdf` },
        { nombre: 'Ley del Sistema Estatal de Protección Civil, Prevención y Mitigación de Desastres para el Estado de Querétaro', url: `${QRO_BASE}/Leyes/LEY-ID-074.pdf` },
        { nombre: 'Ley del Sistema para el Desarrollo Integral de la Familia del Estado de Querétaro', url: `${QRO_BASE}/Leyes/LEY-ID-075.pdf` },
        { nombre: 'Ley del Voluntariado del Estado de Querétaro', url: `${QRO_BASE}/Leyes/LEY-ID-076.pdf` },
        { nombre: 'Ley Electoral del Estado de Querétaro', url: `${QRO_BASE}/Leyes/LEY-ID-111.pdf` },
        { nombre: 'Ley Estatal de Acceso de las Mujeres a una Vida Libre de Violencia', url: `${QRO_BASE}/Leyes/LEY-ID-077.pdf` },
        { nombre: 'Ley Industrial del Estado de Querétaro', url: `${QRO_BASE}/Leyes/LEY-ID-078.pdf` },
        { nombre: 'Ley para Agilizar los Procedimientos de Entrega-Recepción de Fraccionamientos en el Estado de Querétaro', url: `${QRO_BASE}/Leyes/LEY-ID-079.pdf` },
        { nombre: 'Ley para el Desarrollo de los Jóvenes en el Estado de Querétaro', url: `${QRO_BASE}/Leyes/LEY-ID-080.pdf` },
        { nombre: 'Ley para el Fomento de la Investigación Científica, Tecnológica e Innovación del Estado de Querétaro', url: `${QRO_BASE}/Leyes/LEY-ID-081.pdf` },
        { nombre: 'Ley para el Manejo de los Recursos Públicos del Estado de Querétaro', url: `${QRO_BASE}/Leyes/LEY-ID-082.pdf` },
        { nombre: 'Ley para la Atención de las Migraciones en el Estado de Querétaro', url: `${QRO_BASE}/Leyes/LEY-ID-083.pdf` },
        { nombre: 'Ley para la Cultura y las Artes del Estado de Querétaro', url: `${QRO_BASE}/Leyes/LEY-ID-084.pdf` },
        { nombre: 'Ley para la Inclusión al Desarrollo Social de las Personas con Discapacidad del Estado de Querétaro', url: `${QRO_BASE}/Leyes/LEY-ID-085.pdf` },
        { nombre: 'Ley para la Prevención, Gestión Integral y Economía Circular de los Residuos del Estado de Querétaro', url: `${QRO_BASE}/Leyes/LEY-ID-086.pdf` },
        { nombre: 'Ley para la Promoción, Fomento y Desarrollo de la Industria Cinematográfica y Audiovisual del Estado de Querétaro', url: `${QRO_BASE}/Leyes/LEY-ID-087.pdf` },
        { nombre: 'Ley para la Regularización de Asentamientos Humanos Irregulares, Predios Urbanos, Predios Rústicos, Predios Familiares y Predios Sociales del Estado de Querétaro', url: `${QRO_BASE}/Leyes/LEY-ID-088.pdf` },
        { nombre: 'Ley para Prevenir, Combatir, y Sancionar la Trata de Personas en el Estado de Querétaro', url: `${QRO_BASE}/Leyes/LEY-ID-089.pdf` },
        { nombre: 'Ley para prevenir, investigar, sancionar y reparar la desaparición de personas en el Estado de Querétaro', url: `${QRO_BASE}/Leyes/LEY-ID-090.pdf` },
        { nombre: 'Ley para Prevenir y Eliminar toda Forma de Discriminación en el Estado de Querétaro', url: `${QRO_BASE}/Leyes/LEY-ID-091.pdf` },
        { nombre: 'Ley que aprueba la Incorporación del Estado de Querétaro y sus Municipios a la Coordinación en Materia Federal de Derechos', url: `${QRO_BASE}/Leyes/LEY-ID-092.pdf` },
        { nombre: 'Ley que crea el Centro de Evaluación y Control de Confianza del Estado de Querétaro', url: `${QRO_BASE}/Leyes/LEY-ID-093.pdf` },
        { nombre: 'Ley que Crea el Centro de Información y Análisis para la Seguridad de Querétaro', url: `${QRO_BASE}/Leyes/LEY-ID-094.pdf` },
        { nombre: 'Ley que Crea el Instituto Queretano del Emprendimiento y la Innovación', url: `${QRO_BASE}/Leyes/LEY-ID-095.pdf` },
        { nombre: 'Ley que crea la Comisión Estatal de Infraestructura de Querétaro', url: `${QRO_BASE}/Leyes/LEY-ID-096.pdf` },
        { nombre: 'Ley que crea la Comisión Estatal del Sistema Penitenciario de Querétaro', url: `${QRO_BASE}/Leyes/LEY-ID-097.pdf` },
        { nombre: 'Ley que crea la Comisión para la Evaluación de la Operación del Sistema de Justicia Penal Acusatorio del Estado de Querétaro "Cosmos"', url: `${QRO_BASE}/Leyes/LEY-ID-098.pdf` },
        { nombre: 'Ley que crea la Escuela Normal Superior de Querétaro', url: `${QRO_BASE}/Leyes/LEY-ID-099.pdf` },
        { nombre: 'Ley que crea la Orquesta de Cámara de Querétaro', url: `${QRO_BASE}/Leyes/LEY-ID-100.pdf` },
        { nombre: 'Ley que establece el Secreto Profesional Periodístico en el Estado de Querétaro', url: `${QRO_BASE}/Leyes/LEY-ID-101.pdf` },
        { nombre: 'Ley que establece las bases para la Prevención y la Atención de la Violencia Familiar en el Estado de Querétaro', url: `${QRO_BASE}/Leyes/LEY-ID-102.pdf` },
        { nombre: 'Ley que fija el Arancel para el Cobro de Honorarios de Abogados en el Estado de Querétaro', url: `${QRO_BASE}/Leyes/LEY-ID-103.pdf` },
        { nombre: 'Ley que fija el Arancel para el Cobro de Honorarios Profesionales de los Arquitectos en el Estado de Querétaro Arteaga', url: `${QRO_BASE}/Leyes/LEY-ID-104.pdf` },
        { nombre: 'Ley que regula a los agentes y empresas inmobiliarias en el Estado de Querétaro', url: `${QRO_BASE}/Leyes/LEY-ID-105.pdf` },
        { nombre: 'Ley que regula el Sistema Estatal de Promoción del uso de la Bicicleta', url: `${QRO_BASE}/Leyes/LEY-ID-106.pdf` },
        { nombre: 'Ley que regula la prestación de los servicios de agua potable, alcantarillado y saneamiento del Estado de Querétaro', url: `${QRO_BASE}/Leyes/LEY-ID-107.pdf` },
        { nombre: 'Ley que Regula la Prestación de Servicios para la Atención, Cuidado y Desarrollo Integral Infantil en el Estado de Querétaro', url: `${QRO_BASE}/Leyes/LEY-ID-108.pdf` },
        { nombre: 'Ley Registral del Estado de Querétaro', url: `${QRO_BASE}/Leyes/LEY-ID-109.pdf` },
        { nombre: 'Ley sobre bebidas alcohólicas del Estado de Querétaro', url: `${QRO_BASE}/Leyes/LEY-ID-110.pdf` },
        { nombre: 'Ley de la Secretaría de las Mujeres', url: `${QRO_BASE}/Leyes/LEY-ID-112.pdf` },
    ],
    codigos: [
        { nombre: 'Código Ambiental del Estado de Querétaro', url: `${QRO_BASE}/Codigos/COD-ID-01.pdf` },
        { nombre: 'Código Civil del Estado de Querétaro', url: `${QRO_BASE}/Codigos/COD-ID-02.pdf` },
        { nombre: 'Código de Ética del Poder Legislativo del Estado de Querétaro', url: `${QRO_BASE}/Codigos/COD-ID-03.pdf` },
        { nombre: 'Código de Procedimientos Civiles del Estado de Querétaro', url: `${QRO_BASE}/Codigos/COD-ID-04.pdf` },
        { nombre: 'Código Fiscal del Estado de Querétaro', url: `${QRO_BASE}/Codigos/COD-ID-05.pdf` },
        { nombre: 'Código Urbano del Estado de Querétaro', url: `${QRO_BASE}/Codigos/COD-ID-06.pdf` },
        { nombre: 'Código Penal para el Estado de Querétaro', url: `${QRO_BASE}/Codigos/COD-ID-07.pdf` },
    ],
    reglamentos: [],
    otros: [
        // Leyes Orgánicas
        { nombre: 'Ley Orgánica de la Agencia de Energía del Estado de Querétaro', url: `${QRO_BASE}/Ley-Org/ORG-ID-01.pdf` },
        { nombre: 'Ley Orgánica de la Escuela Normal del Estado', url: `${QRO_BASE}/Ley-Org/ORG-ID-02.pdf` },
        { nombre: 'Ley Orgánica de la Fiscalía General del Estado de Querétaro', url: `${QRO_BASE}/Ley-Org/ORG-ID-03.pdf` },
        { nombre: 'Ley Orgánica de la Universidad Autónoma de Querétaro', url: `${QRO_BASE}/Ley-Org/ORG-ID-04.pdf` },
        { nombre: 'Ley Orgánica de la Universidad Tecnológica de Querétaro', url: `${QRO_BASE}/Ley-Org/ORG-ID-05.pdf` },
        { nombre: 'Ley Orgánica del Centro de Conciliación Laboral del Estado de Querétaro', url: `${QRO_BASE}/Ley-Org/ORG-ID-06.pdf` },
        { nombre: 'Ley Orgánica del Colegio de Bachilleres del Estado de Querétaro', url: `${QRO_BASE}/Ley-Org/ORG-ID-07.pdf` },
        { nombre: 'Ley Orgánica del Poder Ejecutivo del Estado de Querétaro', url: `${QRO_BASE}/Ley-Org/ORG-ID-08.pdf` },
        { nombre: 'Ley Orgánica del Poder Judicial del Estado de Querétaro', url: `${QRO_BASE}/Ley-Org/ORG-ID-09.pdf` },
        { nombre: 'Ley Orgánica del Poder Legislativo del Estado de Querétaro', url: `${QRO_BASE}/Ley-Org/ORG-ID-10.pdf` },
        { nombre: 'Ley Orgánica del Tribunal de Justicia Administrativa del Estado de Querétaro', url: `${QRO_BASE}/Ley-Org/ORG-ID-11.pdf` },
        { nombre: 'Ley Orgánica del Tribunal Electoral del Estado de Querétaro', url: `${QRO_BASE}/Ley-Org/ORG-ID-12.pdf` },
        { nombre: 'Ley Orgánica Municipal del Estado de Querétaro', url: `${QRO_BASE}/Ley-Org/ORG-ID-13.pdf` },
    ],
};

// ─── All 32 States ────────────────────────────────────────────
export const ESTADOS: Estado[] = [
    { slug: 'aguascalientes', nombre: 'Aguascalientes', nombreCorto: 'Aguascalientes', abreviatura: 'AGS', region: 'centro', leyesCount: 0, leyes: LEYES_PLACEHOLDER },
    { slug: 'baja-california', nombre: 'Baja California', nombreCorto: 'Baja California', abreviatura: 'BC', region: 'norte', leyesCount: 0, leyes: LEYES_PLACEHOLDER },
    { slug: 'baja-california-sur', nombre: 'Baja California Sur', nombreCorto: 'B.C. Sur', abreviatura: 'BCS', region: 'norte', leyesCount: 0, leyes: LEYES_PLACEHOLDER },
    { slug: 'campeche', nombre: 'Campeche', nombreCorto: 'Campeche', abreviatura: 'CAMP', region: 'sur', leyesCount: 0, leyes: LEYES_PLACEHOLDER },
    { slug: 'chiapas', nombre: 'Chiapas', nombreCorto: 'Chiapas', abreviatura: 'CHIS', region: 'sur', leyesCount: 0, leyes: LEYES_PLACEHOLDER },
    { slug: 'chihuahua', nombre: 'Chihuahua', nombreCorto: 'Chihuahua', abreviatura: 'CHIH', region: 'norte', leyesCount: 0, leyes: LEYES_PLACEHOLDER },
    { slug: 'cdmx', nombre: 'Ciudad de México', nombreCorto: 'CDMX', abreviatura: 'CDMX', region: 'centro', leyesCount: 0, leyes: LEYES_PLACEHOLDER },
    { slug: 'coahuila', nombre: 'Coahuila', nombreCorto: 'Coahuila', abreviatura: 'COAH', region: 'norte', leyesCount: 0, leyes: LEYES_PLACEHOLDER },
    { slug: 'colima', nombre: 'Colima', nombreCorto: 'Colima', abreviatura: 'COL', region: 'occidente', leyesCount: 0, leyes: LEYES_PLACEHOLDER },
    { slug: 'durango', nombre: 'Durango', nombreCorto: 'Durango', abreviatura: 'DGO', region: 'norte', leyesCount: 0, leyes: LEYES_PLACEHOLDER },
    { slug: 'guanajuato', nombre: 'Guanajuato', nombreCorto: 'Guanajuato', abreviatura: 'GTO', region: 'centro', leyesCount: 0, leyes: LEYES_PLACEHOLDER },
    { slug: 'guerrero', nombre: 'Guerrero', nombreCorto: 'Guerrero', abreviatura: 'GRO', region: 'sur', leyesCount: 0, leyes: LEYES_PLACEHOLDER },
    { slug: 'hidalgo', nombre: 'Hidalgo', nombreCorto: 'Hidalgo', abreviatura: 'HGO', region: 'centro', leyesCount: 0, leyes: LEYES_PLACEHOLDER },
    { slug: 'jalisco', nombre: 'Jalisco', nombreCorto: 'Jalisco', abreviatura: 'JAL', region: 'occidente', leyesCount: 0, leyes: LEYES_PLACEHOLDER },
    { slug: 'estado-de-mexico', nombre: 'Estado de México', nombreCorto: 'Edo. México', abreviatura: 'EDOMEX', region: 'centro', leyesCount: 0, leyes: LEYES_PLACEHOLDER },
    { slug: 'michoacan', nombre: 'Michoacán', nombreCorto: 'Michoacán', abreviatura: 'MICH', region: 'occidente', leyesCount: 0, leyes: LEYES_PLACEHOLDER },
    { slug: 'morelos', nombre: 'Morelos', nombreCorto: 'Morelos', abreviatura: 'MOR', region: 'centro', leyesCount: 0, leyes: LEYES_PLACEHOLDER },
    { slug: 'nayarit', nombre: 'Nayarit', nombreCorto: 'Nayarit', abreviatura: 'NAY', region: 'occidente', leyesCount: 0, leyes: LEYES_PLACEHOLDER },
    { slug: 'nuevo-leon', nombre: 'Nuevo León', nombreCorto: 'Nuevo León', abreviatura: 'NL', region: 'norte', leyesCount: 0, leyes: LEYES_PLACEHOLDER },
    { slug: 'oaxaca', nombre: 'Oaxaca', nombreCorto: 'Oaxaca', abreviatura: 'OAX', region: 'sur', leyesCount: 0, leyes: LEYES_PLACEHOLDER },
    { slug: 'puebla', nombre: 'Puebla', nombreCorto: 'Puebla', abreviatura: 'PUE', region: 'centro', leyesCount: 0, leyes: LEYES_PLACEHOLDER },
    { slug: 'queretaro', nombre: 'Querétaro', nombreCorto: 'Querétaro', abreviatura: 'QRO', region: 'centro', leyesCount: 132, ultimaActualizacion: '2026-02-14', leyes: QUERETARO_LEYES },
    { slug: 'quintana-roo', nombre: 'Quintana Roo', nombreCorto: 'Quintana Roo', abreviatura: 'QROO', region: 'sur', leyesCount: 0, leyes: LEYES_PLACEHOLDER },
    { slug: 'san-luis-potosi', nombre: 'San Luis Potosí', nombreCorto: 'San Luis Potosí', abreviatura: 'SLP', region: 'centro', leyesCount: 0, leyes: LEYES_PLACEHOLDER },
    { slug: 'sinaloa', nombre: 'Sinaloa', nombreCorto: 'Sinaloa', abreviatura: 'SIN', region: 'norte', leyesCount: 0, leyes: LEYES_PLACEHOLDER },
    { slug: 'sonora', nombre: 'Sonora', nombreCorto: 'Sonora', abreviatura: 'SON', region: 'norte', leyesCount: 0, leyes: LEYES_PLACEHOLDER },
    { slug: 'tabasco', nombre: 'Tabasco', nombreCorto: 'Tabasco', abreviatura: 'TAB', region: 'sur', leyesCount: 0, leyes: LEYES_PLACEHOLDER },
    { slug: 'tamaulipas', nombre: 'Tamaulipas', nombreCorto: 'Tamaulipas', abreviatura: 'TAMPS', region: 'norte', leyesCount: 0, leyes: LEYES_PLACEHOLDER },
    { slug: 'tlaxcala', nombre: 'Tlaxcala', nombreCorto: 'Tlaxcala', abreviatura: 'TLAX', region: 'centro', leyesCount: 0, leyes: LEYES_PLACEHOLDER },
    { slug: 'veracruz', nombre: 'Veracruz', nombreCorto: 'Veracruz', abreviatura: 'VER', region: 'oriente', leyesCount: 0, leyes: LEYES_PLACEHOLDER },
    { slug: 'yucatan', nombre: 'Yucatán', nombreCorto: 'Yucatán', abreviatura: 'YUC', region: 'sur', leyesCount: 0, leyes: LEYES_PLACEHOLDER },
    { slug: 'zacatecas', nombre: 'Zacatecas', nombreCorto: 'Zacatecas', abreviatura: 'ZAC', region: 'norte', leyesCount: 0, leyes: LEYES_PLACEHOLDER },
];

// ─── Helpers ──────────────────────────────────────────────────
export function getEstadoBySlug(slug: string): Estado | undefined {
    return ESTADOS.find(e => e.slug === slug);
}

export function getTotalLeyes(leyes: CategoriaLeyes): number {
    return leyes.constitucion.length + leyes.leyes.length + leyes.codigos.length + leyes.reglamentos.length + leyes.otros.length;
}

// ─── Category metadata for UI rendering ───────────────────────
export const CATEGORIA_META: Record<keyof CategoriaLeyes, { label: string; icon: string; color: string }> = {
    constitucion: { label: 'Constitución Local', icon: '🏛️', color: 'text-amber-600' },
    leyes: { label: 'Leyes', icon: '📜', color: 'text-blue-600' },
    codigos: { label: 'Códigos', icon: '📕', color: 'text-red-600' },
    reglamentos: { label: 'Reglamentos', icon: '📋', color: 'text-green-600' },
    otros: { label: 'Leyes Orgánicas y Otros', icon: '📎', color: 'text-gray-600' },
};

// ─── Region colors for state cards ────────────────────────────
export const REGION_COLORS: Record<string, { bg: string; text: string; border: string }> = {
    norte: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
    centro: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
    sur: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
    occidente: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
    oriente: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
};

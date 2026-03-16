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

// ─── Querétaro: FULL DATA — PDFs hosted on GCS ───────────────
const QRO_BASE = 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/Queretaro';

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
    reglamentos: [
        // Reglamentos Municipales del Municipio de Querétaro
        { nombre: 'Código de Conducta de los Servidores Públicos Municipales de Querétaro 2021', url: `${QRO_BASE}/Reglamentos/Codigo-Conducta-Servidores-Publicos-QRO-2021.pdf` },
        { nombre: 'Código Municipal de Querétaro', url: `${QRO_BASE}/Reglamentos/Codigo-Municipal-Queretaro.pdf` },
        { nombre: 'Lineamientos en Materia de Obra Pública del Municipio de Querétaro', url: `${QRO_BASE}/Reglamentos/Lineamientos-Obra-Publica-Municipio-QRO.pdf` },
        { nombre: 'Protocolo para la Implementación de los Puntos de Control de Alcoholimetría para el Municipio de Querétaro', url: `${QRO_BASE}/Reglamentos/Protocolo-Alcoholimetria-Municipio-QRO.pdf` },
        { nombre: 'Reglamento para la Movilidad y el Tránsito del Municipio de Querétaro', url: `${QRO_BASE}/Reglamentos/Reglamento-Movilidad-Transito-Municipio-QRO.pdf` },
        { nombre: 'Reglamento de Justicia Cívica del Municipio de Querétaro (Marzo 2025)', url: `${QRO_BASE}/Reglamentos/Reglamento-Justicia-Civica-Municipio-QRO-2025.pdf` },
    ],
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

// ─── CDMX: UPDATED FROM SUPABASE ───────
const CDMX_LEYES: CategoriaLeyes = {
    constitucion: [
        { nombre: 'Constitución Política de la Ciudad de México', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/CONSTITUCION_POLITICA_DE_LA_CDMX_14.4.pdf' },
    ],
    leyes: [
        { nombre: 'Ley Constitucional de Derechos Humanos y sus Garantías de la Ciudad de México', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_CONSTITUCIONAL_DE_DERECHOS_HUMANOS_Y_SUS_GARANTIAS_DE_LA_CIUDAD_DE_MEXICO_2.1.pdf' },
        { nombre: 'Ley de la Sala Constitucional del Poder Judicial de la Ciudad de México', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_DE_LA_SALA_CONSTITUCIONAL_DEL_PODER_JUDICIAL_DE_LA_CIUDAD_DE_MEXICO_2.1.pdf' },
        { nombre: 'Ley Orgánica de la Sala Constitucional del Poder Judicial de la CDMX', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_ORG_SALA_CONSTITUCIONAL_DEL_PJCDMX_2.1.pdf' },
        { nombre: 'Ley  De Justicia Administrativa De La Cdmx 3.1', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY__DE_JUSTICIA_ADMINISTRATIVA_DE_LA_CDMX_3.1.pdf' },
        { nombre: 'Ley  Org Del Inst De Planeacion Democratica  Y Prospectiva De La Cdmx 3.4', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY__ORG_DEL_INST_DE_PLANEACION_DEMOCRATICA__Y_PROSPECTIVA_DE_LA_CDMX_3.4.pdf' },
        { nombre: 'Ley Acceso Gratuito Internet Cdmx 1', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_ACCESO_GRATUITO_INTERNET_CDMX_1.pdf' },
        { nombre: 'Ley Ambiental De La Cdmx 1.2', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_AMBIENTAL_DE_LA_CDMX_1.2.pdf' },
        { nombre: 'Ley Atn Y Apo A Vict Dein Secuestro 2.1', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_ATN_Y_APO_A_VICT_DEIN_SECUESTRO_2.1.pdf' },
        { nombre: 'Ley Banco Adn Para Uso Forense De La Ciudad De Mexico 2.1', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_BANCO_ADN_PARA_USO_FORENSE_DE_LA_CIUDAD_DE_MEXICO_2.1.pdf' },
        { nombre: 'Ley Busqueda De Personas De La Cdmx 2.4', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_BUSQUEDA_DE_PERSONAS_DE_LA_CDMX_2.4.pdf' },
        { nombre: 'Ley Codigo De Etica De Los Servidores Publicos Del Df 3', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/Codigo_de_etica_de_los_servidores_publicos_del_DF_3.pdf' },
        { nombre: 'Ley Codigo Procedimientos Civiles Df 2.2', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/Codigo_Procedimientos_Civiles_DF_2.2.pdf' },
        { nombre: 'Ley De Accesibilidad Para La Cdmx 3.2', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_DE_ACCESIBILIDAD_PARA_LA_CDMX_3.2.pdf' },
        { nombre: 'Ley De Acceso De Las Mujeres A Una Vida Libre De Violencia De La Cdmx 12.4', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_DE_ACCESO_DE_LAS_MUJERES_A_UNA_VIDA_LIBRE_DE_VIOLENCIA_DE_LA_CDMX_12.4.pdf' },
        { nombre: 'Ley De Adquisiciones Para El Distrito Federal 2.2', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_DE_ADQUISICIONES_PARA_EL_DISTRITO_FEDERAL_2.2.pdf' },
        { nombre: 'Ley De Alberg Pub Priv Ninas Y Ninos Df 2.3', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_DE_ALBERG_PUB_PRIV_NINAS_Y_NINOS_DF_2.3.pdf' },
        { nombre: 'Ley De Albergues Privados Para Personas Adultas Mayores Del Df 3.1', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_DE_ALBERGUES_PRIVADOS_PARA_PERSONAS_ADULTAS_MAYORES_DEL_DF_3.1.pdf' },
        { nombre: 'Ley De Archivos De La Cdmx 2.1', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_DE_ARCHIVOS_DE_LA_CDMX_2.1.pdf' },
        { nombre: 'Ley De Asistencia E Integra Social Del Df 2.1', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_DE_ASISTENCIA_E_INTEGRA_SOCIAL_DEL_DF_2.1.pdf' },
        { nombre: 'Ley De Aten Prio P Las Personas Con Disca Y En Situacion De Vulne En La Cdmx 3', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_DE_ATEN_PRIO_P_LAS_PERSONAS_CON_DISCA_Y_EN_SITUACION_DE_VULNE_EN_LA_CDMX_3.pdf' },
        { nombre: 'Ley De Atn Int Para El Desarrollo De Ninas Yninos En Primera Infancia 1.1', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_DE_ATN_INT_PARA_EL_DESARROLLO_DE_NINAS_YnINOS_EN_PRIMERA_INFANCIA_1.1.pdf' },
        { nombre: 'Ley De Auditoria Y Control Interno De La Admon Publica De La Cdmx 3.3', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_DE_AUDITORIA_Y_CONTROL_INTERNO_DE_LA_ADMON_PUBLICA_DE_LA_CDMX_3.3.pdf' },
        { nombre: 'Ley De Bebe Seguro De La Cdmx 6', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_DE_BEBE_SEGURO_DE_LA_CDMX_6.pdf' },
        { nombre: 'Ley De Bibliotecas  De  La  Ciudad  De  Mexico 3.4', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_DE_BIBLIOTECAS__DE__LA__CIUDAD__DE__MEXICO_3.4.pdf' },
        { nombre: 'Ley De Centros Penitenciarios De La Cdmx 2.1', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_DE_CENTROS_PENITENCIARIOS_DE_LA_CDMX_2.1.pdf' },
        { nombre: 'Ley De Ciudadania Digital De La Ciudad De Mexico 2.3', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_DE_CIUDADANIA_DIGITAL_DE_LA_CIUDAD_DE_MEXICO_2.3.pdf' },
        { nombre: 'Ley De Comedores Sociales De La Cdmx 4', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_DE_COMEDORES_SOCIALES_DE_LA_CDMX_4.pdf' },
        { nombre: 'Ley De Coordinacion Metropolitana De La Ciudad De Mexico 3.1', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_DE_COORDINACION_METROPOLITANA_DE_LA_CIUDAD_DE_MEXICO_3.1.pdf' },
        { nombre: 'Ley De Cuid Alt Ninas Ninos Y Adol En El Df 3', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_DE_CUID_ALT_NINAS_NINOS_Y_ADOL_EN_EL_DF_3.pdf' },
        { nombre: 'Ley De Cultura Civica De La Ciudad De Mexico 2.8', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_DE_CULTURA_CIVICA_DE_LA_CIUDAD_DE_MEXICO_2.8.pdf' },
        { nombre: 'Ley De Cunas De La Cdmx 3', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_DE_CUNAS_DE_LA_CDMX_3.pdf' },
        { nombre: 'Ley De Declaracion Esp De Ausencia Para Pers Desaparecidas En La Cdmx 3', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_DE_DECLARACION_ESP_DE_AUSENCIA_PARA_PERS_DESAPARECIDAS_EN_LA_CDMX_3.pdf' },
        { nombre: 'Ley De Desarrllo Agropecuario Rural Y Sustentable De La Cdmx 3', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_DE_DESARRLLO_AGROPECUARIO_RURAL_Y_SUSTENTABLE_DE_LA_CDMX_3.pdf' },
        { nombre: 'Ley De Desarrollo Urbano Del Df 5.1', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_DE_DESARROLLO_URBANO_DEL_DF_5.1.pdf' },
        { nombre: 'Ley De Economia Circular De La Cdmx', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_DE_ECONOMIA_CIRCULAR_DE_LA_CDMX.pdf' },
        { nombre: 'Ley De Educacion De La Cdmx 3.6', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_DE_EDUCACION_DE_LA_CDMX_3.6.pdf' },
        { nombre: 'Ley De Educacion Fisica Y Deporte Del Df 9.2', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_DE_EDUCACION_FISICA_Y_DEPORTE_DEL_DF_9.2.pdf' },
        { nombre: 'Ley De Ejecucion De Sanciones Penales Y Reinsercion Social Para El Df 2', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_DE_EJECUCION_DE_SANCIONES_PENALES_Y_REINSERCION_SOCIAL_PARA_EL_DF_2.pdf' },
        { nombre: 'Ley De Entrega Recepcion De Los Recursos De La Administracion Publica De La Cdmx 2.2', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_DE_ENTREGA_RECEPCION_DE_LOS_RECURSOS_DE_LA_ADMINISTRACION_PUBLICA_DE_LA_CDMX_2.2.pdf' },
        { nombre: 'Ley De Espacios Culturales Independientes De La Cdmx 3', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_DE_ESPACIOS_CULTURALES_INDEPENDIENTES_DE_LA_CDMX_3.pdf' },
        { nombre: 'Ley De Establecimientos Mercantiles Para La Cdmx 5.4', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_DE_ESTABLECIMIENTOS_MERCANTILES_PARA_LA_CDMX_5.4.pdf' },
        { nombre: 'Ley De Evaluacion De La Cdmx 4', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_DE_EVALUACION_DE_LA_CDMX_4.pdf' },
        { nombre: 'Ley De Extincion De Dominio Para La Cdmx 1.1', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_DE_EXTINCION_DE_DOMINIO_PARA_LA_CDMX_1.1.pdf' },
        { nombre: 'Ley De Filmaciones De La Ciudad De Mexico 3.1', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_DE_FILMACIONES_DE_LA_CIUDAD_DE_MEXICO_3.1.pdf' },
        { nombre: 'Ley De Fiscalizacion Superior De La Cdmx 2', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_DE_FISCALIZACION_SUPERIOR_DE_LA_CDMX_2.pdf' },
        { nombre: 'Ley De Fomento A Las Acti De Desarrollo Social De Las Orng Civiles Para El Df 2.3', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_DE_FOMENTO_A_LAS_ACTI_DE_DESARROLLO_SOCIAL_DE_LAS_ORNG_CIVILES_PARA_EL_DF_2.3.pdf' },
        { nombre: 'Ley De Fomento Al Cine Mexicano De La Cdmx 2.3', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_DE_FOMENTO_AL_CINE_MEXICANO_DE_LA_CDMX_2.3.pdf' },
        { nombre: 'Ley De Fomento Cooperativo Para El Df 4', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_DE_FOMENTO_COOPERATIVO_PARA_EL_DF_4.pdf' },
        { nombre: 'Ley De Fomento Cultural De La Cdmx 5.1', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_DE_FOMENTO_CULTURAL_DE_LA_CDMX_5.1.pdf' },
        { nombre: 'Ley De Fomento De Procesos Productivos Eficientes Para El Df 4.1', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_DE_FOMENTO_DE_PROCESOS_PRODUCTIVOS_EFICIENTES_PARA_EL_DF_4.1.pdf' },
        { nombre: 'Ley De Fomento Para La Lectura Y El Libro De La Ciudad De Mexico 6.6', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_DE_FOMENTO_PARA_LA_LECTURA_Y_EL_LIBRO_DE_LA_CIUDAD_DE_MEXICO_6.6.pdf' },
        { nombre: 'Ley De Gestion Integral De Riesgos Y Proteccion Civil De La Cdmx 4', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_DE_GESTION_INTEGRAL_DE_RIESGOS_Y_PROTECCION_CIVIL_DE_LA_CDMX_4.pdf' },
        { nombre: 'Ley De Huertos Urbanos De La Ciudad De Mexico 3.3', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_DE_HUERTOS_URBANOS_DE_LA_CIUDAD_DE_MEXICO_3.3.pdf' },
        { nombre: 'Ley De Igualdad Sustantiva Entre M Y H En La Cdmx 3.9', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_DE_IGUALDAD_SUSTANTIVA_ENTRE_M_Y_H_EN_LA_CDMX_3.9.pdf' },
        { nombre: 'Ley De Infraestructura Fisica Educativa De La Cdmx 2.4', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_DE_INFRAESTRUCTURA_FISICA_EDUCATIVA_DE_LA_CDMX_2.4.pdf' },
        { nombre: 'Ley De Ingresos 2025', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_DE_INGRESOS_2025.pdf' },
        { nombre: 'Ley De Instituciones De Asistencia Privada Para El Df 3.2', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_DE_INSTITUCIONES_DE_ASISTENCIA_PRIVADA_PARA_EL_DF_3.2.pdf' },
        { nombre: 'Ley De Interculturalidad Atencion A Migrantes Y Movilidad Humana En El Df 2.1', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_DE_INTERCULTURALIDAD_ATENCION_A_MIGRANTES_Y_MOVILIDAD_HUMANA_EN_EL_DF_2.1.pdf' },
        { nombre: 'Ley De Justicia Alternativa Del Tribunal Superior De Justicia Para El Df 2.1', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_DE_JUSTICIA_ALTERNATIVA_DEL_TRIBUNAL_SUPERIOR_DE_JUSTICIA_PARA_EL_DF_2.1.pdf' },
        { nombre: 'Ley De Justicia Alternativa En La Procuracion De Justicia Para El Df 1.2', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_DE_JUSTICIA_ALTERNATIVA_EN_LA_PROCURACION_DE_JUSTICIA_PARA_EL_DF_1.2.pdf' },
        { nombre: 'Ley De Justicia Para Adolescentes Para El Df 2.1', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_DE_JUSTICIA_PARA_ADOLESCENTES_PARA_EL_DF_2.1.pdf' },
        { nombre: 'Ley De La Caja De Prevision De La Policia Preventiva Del Df 3', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_DE_LA_CAJA_DE_PREVISION_DE_LA_POLICIA_PREVENTIVA_DEL_DF_3.pdf' },
        { nombre: 'Ley De La Inst Desc Del Serv Pub Del Df Serv De Transp Electricos 3.1', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_DE_LA_INST_DESC_DEL_SERV_PUB_DEL_DF_SERV_DE_TRANSP_ELECTRICOS_3.1.pdf' },
        { nombre: 'Ley De La Inst Desc Del Serv Pub Del Df Serv De Transp Electricos 3.2', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_DE_LA_INST_DESC_DEL_SERV_PUB_DEL_DF_SERV_DE_TRANSP_ELECTRICOS_3.2.pdf' },
        { nombre: 'Ley De La Procuraduria Social De La Cdmx 3.2', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_DE_LA_PROCURADURIA_SOCIAL_DE_LA_CDMX_3.2.pdf' },
        { nombre: 'Ley De La Universidad Autonoma De La Cdmx 2.2', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_DE_LA_UNIVERSIDAD_AUTONOMA_DE_LA_CDMX_2.2.pdf' },
        { nombre: 'Ley De Los Derechos Culturales De Los Habitantes Y Visitantes De La Ciudad De Mexico 2.1', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_DE_LOS_DERECHOS_CULTURALES_DE_LOS_HABITANTES_Y_VISITANTES_DE_LA_CIUDAD_DE_MEXICO_2.1.pdf' },
        { nombre: 'Ley De Los Derechos De Las Personas Jovenes En La Ciudad De Mexico 3.4', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_DE_LOS_DERECHOS_DE_LAS_PERSONAS_JOVENES_EN_LA_CIUDAD_DE_MEXICO_3.4.pdf' },
        { nombre: 'Ley De Los Derechos De Las Personas Mayores De La Cdmx 3', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_DE_LOS_DERECHOS_DE_LAS_PERSONAS_MAYORES_DE_LA_CDMX_3.pdf' },
        { nombre: 'Ley De Mejora Regulatoria Para La Ciudad De Mexico 3.4', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_DE_MEJORA_REGULATORIA_PARA_LA_CIUDAD_DE_MEXICO_3.4.pdf' },
        { nombre: 'Ley De Mejoramiento Barrial Y Comunitario Del Df 2.3', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_DE_MEJORAMIENTO_BARRIAL_Y_COMUNITARIO_DEL_DF_2.3.pdf' },
        { nombre: 'Ley De Memoria De La Cdmx', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_DE_MEMORIA_DE_LA_CDMX.pdf' },
        { nombre: 'Ley De Mitigacion Y Adaptacion Al Cambio Climatico Y Desarrollo Sustentable De La Cdmx 6.3', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_DE_MITIGACION_Y_ADAPTACION_AL_CAMBIO_CLIMATICO_Y_DESARROLLO_SUSTENTABLE_DE_LA_CDMX_6.3.pdf' },
        { nombre: 'Ley De Movilidad De La Cdmx 3.2', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_DE_MOVILIDAD_DE_LA_CDMX_3.2.pdf' },
        { nombre: 'Ley De Obras Publicas Del Df 3.1', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_DE_OBRAS_PUBLICAS_DEL_DF_3.1.pdf' },
        { nombre: 'Ley De Operacion E Innovacion Digital Para La Ciudad De Mexico 3.1', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_DE_OPERACION_E_INNOVACION_DIGITAL_PARA_LA_CIUDAD_DE_MEXICO_3.1.pdf' },
        { nombre: 'Ley De Participacion Ciudadana De La Cdmx 4.2', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_DE_PARTICIPACION_CIUDADANA_DE_LA_CDMX_4.2.pdf' },
        { nombre: 'Ley De Patrimonio Cultural Natural Y Biocultural De La Ciudad De Mexico 2.7', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_DE_PATRIMONIO_CULTURAL_NATURAL_Y_BIOCULTURAL_DE_LA_CIUDAD_DE_MEXICO_2.7.pdf' },
        { nombre: 'Ley De Planeacion Demografica Y Estadistica Para La Poblacion Del Df 2.1', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_DE_PLANEACION_DEMOGRAFICA_Y_ESTADISTICA_PARA_LA_POBLACION_DEL_DF_2.1.pdf' },
        { nombre: 'Ley De Prestacion De Servicios Inmobiliarios Del Df 2.1', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_DE_PRESTACION_DE_SERVICIOS_INMOBILIARIOS_DEL_DF_2.1.pdf' },
        { nombre: 'Ley De Prevencion Social Del Delito Y La Violencia De La Cdmx 2.3', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_DE_PREVENCION_SOCIAL_DEL_DELITO_Y_LA_VIOLENCIA_DE_LA_CDMX_2.3.pdf' },
        { nombre: 'Ley De Procedimiento Administrativo De La Cdmx 1.1', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_DE_PROCEDIMIENTO_ADMINISTRATIVO_DE_LA_CDMX_1.1.pdf' },
        { nombre: 'Ley De Propiedad En Condominio De Inmuebles Para El Df 4', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_DE_PROPIEDAD_EN_CONDOMINIO_DE_INMUEBLES_PARA_EL_DF_4.pdf' },
        { nombre: 'Ley De Proteccion A La Salud De Los No Fumadores 2.3', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_DE_PROTECCION_A_LA_SALUD_DE_LOS_NO_FUMADORES_2.3.pdf' },
        { nombre: 'Ley De Proteccion De Datos Personales En Posesion De Sujetos Obligados De La Cdmx 4', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_DE_PROTECCION_DE_DATOS_PERSONALES_EN_POSESION_DE_SUJETOS_OBLIGADOS_DE_LA_CDMX_4.pdf' },
        { nombre: 'Ley De Proteccion Y Bienestar De Los Animales De La Cdmx 1.1.5', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_DE_PROTECCION_Y_BIENESTAR_DE_LOS_ANIMALES_DE_LA_CDMX_1.1.5.pdf' },
        { nombre: 'Ley De Proteccion Y Fomento Al Empleo Para La Cdmx 2', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_DE_PROTECCION_Y_FOMENTO_AL_EMPLEO_PARA_LA_CDMX_2.pdf' },
        { nombre: 'Ley De Publicidad Exterior De La Cdmx 2.1', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_DE_PUBLICIDAD_EXTERIOR_DE_LA_CDMX_2.1.pdf' },
        { nombre: 'Ley De Residuos Solidos De La Cdmx 8.1', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_DE_RESIDUOS_SOLIDOS_DE_LA_CDMX_8.1.pdf' },
        { nombre: 'Ley De Resp  Soc  Mercantil De La Ciudad De Mexico 2.4', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_DE_RESP__SOC__MERCANTIL_DE_LA_CIUDAD_DE_MEXICO_2.4.pdf' },
        { nombre: 'Ley De Respon Civil Para La Proteccion Del Drcho A La Vida Priv El Honor Y La Propia Imgen En El Df 2.1', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_DE_RESPON_CIVIL_PARA_LA_PROTECCION_DEL_DRCHO_A_LA_VIDA_PRIV_EL_HONOR_Y_LA_PROPIA_IMGEN_EN_EL_DF_2.1.pdf' },
        { nombre: 'Ley De Responsabilidad Ambiental De La Cdmx 1', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_DE_RESPONSABILIDAD_AMBIENTAL_DE_LA_CDMX_1.pdf' },
        { nombre: 'Ley De Responsabilidad Patrimonial De La Cdmx 2.1', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_DE_RESPONSABILIDAD_PATRIMONIAL_DE_LA_CDMX_2.1.pdf' },
        { nombre: 'Ley De Responsabilidades Administrativas De La Cdmx 3.1', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_DE_RESPONSABILIDADES_ADMINISTRATIVAS_DE_LA_CDMX_3.1.pdf' },
        { nombre: 'Ley De Salud De La Ciudad De Mexico 3.7', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_DE_SALUD_DE_LA_CIUDAD_DE_MEXICO_3.7.pdf' },
        { nombre: 'Ley De Salud Mental Del Df 2.1', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_DE_SALUD_MENTAL_DEL_DF_2.1.pdf' },
        { nombre: 'Ley De Seguridad Alimentaria Y Nutricional Para El Df 2.1', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_DE_SEGURIDAD_ALIMENTARIA_Y_NUTRICIONAL_PARA_EL_DF_2.1.pdf' },
        { nombre: 'Ley De Seguridad Privada Para El Df 2.1', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_DE_SEGURIDAD_PRIVADA_PARA_EL_DF_2.1.pdf' },
        { nombre: 'Ley De Seguridad Privada Para El Df 2.2', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_DE_SEGURIDAD_PRIVADA_PARA_EL_DF_2.2.pdf' },
        { nombre: 'Ley De Sociedad De Convivencia Para La Cdmx 2.1', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_DE_SOCIEDAD_DE_CONVIVENCIA_PARA_LA_CDMX_2.1.pdf' },
        { nombre: 'Ley De Sociedades Mutualistas De La Cdmx 3.1', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_DE_SOCIEDADES_MUTUALISTAS_DE_LA_CDMX_3.1.pdf' },
        { nombre: 'Ley De Transparencia Acceso A La Informacion Publica Y Rendicion De Cuentas De La Cdmx 5.1', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_DE_TRANSPARENCIA_ACCESO_A_LA_INFORMACION_PUBLICA_Y_RENDICION_DE_CUENTAS_DE_LA_CDMX_5.1.pdf' },
        { nombre: 'Ley De Turismo De La Ciudad De Mexico 1.1.1', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_DE_TURISMO_DE_LA_CIUDAD_DE_MEXICO_1.1.1.pdf' },
        { nombre: 'Ley De Unidad De Cuenta De La Cdmx 2.3', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_DE_UNIDAD_DE_CUENTA_DE_LA_CDMX_2.3.pdf' },
        { nombre: 'Ley De Victimas Para La Cdmx 5', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_DE_VICTIMAS_PARA_LA_CDMX_5.pdf' },
        { nombre: 'Ley De Vivienda Para La Cdmx 4.3', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_DE_VIVIENDA_PARA_LA_CDMX_4.3.pdf' },
        { nombre: 'Ley De Voluntad Anticipada Para El Df 2.1', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_DE_VOLUNTAD_ANTICIPADA_PARA_EL_DF_2.1.pdf' },
        { nombre: 'Ley Del Derecho Al Bienestar ', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_DEL_DERECHO_AL_BIENESTAR_.pdf' },
        { nombre: 'Ley Del Fondo De Apoyo A La Adm De Justicia En El Df 2.6', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_DEL_FONDO_DE_APOYO_A_LA_ADM_DE_JUSTICIA_EN_EL_DF_2.6.pdf' },
        { nombre: 'Ley Del Fondo De Apoyo A La Procura De Just Df 3.1', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_DEL_FONDO_DE_APOYO_A_LA_PROCURA_DE_JUST_DF_3.1.pdf' },
        { nombre: 'Ley Del Heroico Cuerpo De Bomberos Del Df 2.3', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_DEL_HEROICO_CUERPO_DE_BOMBEROS_DEL_DF_2.3.pdf' },
        { nombre: 'Ley Del Inst Para La Seg De Las Construcciones De La Cdmx 3.2', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_DEL_INST_PARA_LA_SEG_DE_LAS_CONSTRUCCIONES_DE_LA_CDMX_3.2.pdf' },
        { nombre: 'Ley Del Insti De Estudios Cientificos Para La Prev Del Delito En La Cdmx 2.1', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_DEL_INSTI_DE_ESTUDIOS_CIENTIFICOS_PARA_LA_PREV_DEL_DELITO_EN_LA_CDMX_2.1.pdf' },
        { nombre: 'Ley Del Instit De  Verificacion Admitva De La Ciudad De Mexico 4', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_DEL_INSTIT_DE__VERIFICACION_ADMITVA_DE_LA_CIUDAD_DE_MEXICO_4.pdf' },
        { nombre: 'Ley Del Notariado Para La Ciudad De Mexico 1.4', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_DEL_NOTARIADO_PARA_LA_CIUDAD_DE_MEXICO_1.4.pdf' },
        { nombre: 'Ley Del Programa De Derechos Humanos Del Df 2', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_DEL_PROGRAMA_DE_DERECHOS_HUMANOS_DEL_DF_2.pdf' },
        { nombre: 'Ley Del Regimen Patrimonial Y Del Servicio Publico 8', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_DEL_REGIMEN_PATRIMONIAL_Y_DEL_SERVICIO_PUBLICO_8.pdf' },
        { nombre: 'Ley Del Seguro Educativo Para El Df 4', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_DEL_SEGURO_EDUCATIVO_PARA_EL_DF_4.pdf' },
        { nombre: 'Ley Del Servicio Publico De Carrera De La Adm Pub De La Cdmx 2.4', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_DEL_SERVICIO_PUBLICO_DE_CARRERA_DE_LA_ADM_PUB_DE_LA_CDMX_2.4.pdf' },
        { nombre: 'Ley Del Sistema Anticorrupcion De La Ciudad De Mexico 4.1', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_DEL_SISTEMA_ANTICORRUPCION_DE_LA_CIUDAD_DE_MEXICO_4.1.pdf' },
        { nombre: 'Ley Del Sistema De Alerta Social De La Cdmx 2.5', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_DEL_SISTEMA_DE_ALERTA_SOCIAL_DE_LA_CDMX_2.5.pdf' },
        { nombre: 'Ley Del Sistema De Planeacion Del Desarrollo De La Cdmx 2.7', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_DEL_SISTEMA_DE_PLANEACION_DEL_DESARROLLO_DE_LA_CDMX_2.7.pdf' },
        { nombre: 'Ley Del Sistema De Seguridad Ciudadana De La Cdmx 10', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_DEL_SISTEMA_DE_SEGURIDAD_CIUDADANA_DE_LA_CDMX_10.pdf' },
        { nombre: 'Ley Del Sistema Integral De Derechos Humanos Cdmx 1.1', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_DEL_SISTEMA_INTEGRAL_DE_DERECHOS_HUMANOS_CDMX_1.1.pdf' },
        { nombre: 'Ley Del Sistema Publico De Radiodifusion De La Ciudad De Mexico 2.2', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_DEL_SISTEMA_PUBLICO_DE_RADIODIFUSION_DE_LA_CIUDAD_DE_MEXICO_2.2.pdf' },
        { nombre: 'Ley Del Territorio De La Ciudad De Mexico 2', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_DEL_TERRITORIO_DE_LA_CIUDAD_DE_MEXICO_2.pdf' },
        { nombre: 'Ley Dela Defensoria Publica Del Df 5.1', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_DELA_DEFENSORIA_PUBLICA_DEL_DF_5.1.pdf' },
        { nombre: 'Ley Derecho Acc Disp Y Saneamiento Del Agua De La Ciudad De Mexico 4.1', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_DERECHO_ACC_DISP_Y_SANEAMIENTO_DEL_AGUA_DE_LA_CIUDAD_DE_MEXICO_4.1.pdf' },
        { nombre: 'Ley Derecho Al Acceso A Los Serv Medicos Y Medicamentos Residentes Df 1.1', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_DERECHO_AL_ACCESO_A_LOS_SERV_MEDICOS_Y_MEDICAMENTOS_RESIDENTES_DF_1.1.pdf' },
        { nombre: 'Ley Derecho Alimentario A Madres Solas De Escasos 1.2', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_DERECHO_ALIMENTARIO_A_MADRES_SOLAS_DE_ESCASOS_1.2.pdf' },
        { nombre: 'Ley Derechos De Pueblos Y Barrios Originarios Y Comunidades Indigenas Residentes En La Cdmx 2.4', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_DERECHOS_DE_PUEBLOS_Y_BARRIOS_ORIGINARIOS_Y_COMUNIDADES_INDIGENAS_RESIDENTES_EN_LA_CDMX_2.4.pdf' },
        { nombre: 'Ley Derechos Ninas Ninos Adolescentes Cdmx 7.3', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_DERECHOS_NINAS_NINOS_ADOLESCENTES_CDMX_7.3.pdf' },
        { nombre: 'Ley Ley Org Tjacdmx 2.1', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/Ley_Org_TJACDMX_2.1.pdf' },
        { nombre: 'Ley Ley Organica De La Cdhcdmx 1.3', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/Ley_Organica_de_la_CDHCDMX_1.3.pdf' },
        { nombre: 'Ley Ley Para El Desarrollo De La Competitividad De La Mipymes Para Df 3.3', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/Ley_para_el_Desarrollo_de_la_Competitividad_de_la_MIPYMES_para_DF_3.3.pdf' },
        { nombre: 'Ley Ley Para La Celebracion De Espectaculos Publicos De La Cdmx 3.3', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/Ley_para_la_Celebracion_de_Espectaculos_Publicos_de_la_CDMX_3.3.pdf' },
        { nombre: 'Ley Ley Para La Celebracion De Espectaculos Publicos De La Cdmx 3.4', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/Ley_para_la_Celebracion_de_Espectaculos_Publicos_de_la_CDMX_3.4.pdf' },
        { nombre: 'Ley Ley Para La Donacion Altruista De Alimentos 2.4', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/Ley_para_la_Donacion_Altruista_de_Alimentos_2.4.pdf' },
        { nombre: 'Ley Leydprotecciondedatospersonalesparaeldistritofederal', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEYDPROTECCIONDEDATOSPERSONALESPARAELDISTRITOFEDERAL.pdf' },
        { nombre: 'Ley Org Fiscalia Especial En Combate A La Corrupcion 1.2', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_ORG_FISCALIA_ESPECIAL_EN_COMBATE_A_LA_CORRUPCION_1.2.pdf' },
        { nombre: 'Ley Organica De Alcaldias De La Cdmx 6.3', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_ORGANICA_DE_ALCALDIAS_DE_LA_CDMX_6.3.pdf' },
        { nombre: 'Ley Organica De La Escuela De Adm Publica De La  Cdmx 1.2', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_ORGANICA_DE_LA_ESCUELA_DE_ADM_PUBLICA_DE_LA__CDMX_1.2.pdf' },
        { nombre: 'Ley Organica De La Fiscalia General De Justicia De La Ciudad De Mexico 7.1', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_ORGANICA_DE_LA_FISCALIA_GENERAL_DE_JUSTICIA_DE_LA_CIUDAD_DE_MEXICO_7.1.pdf' },
        { nombre: 'Ley Organica De La Paot De La Cdmx 3.2', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_ORGANICA_DE_LA_PAOT_DE_LA_CDMX_3.2.pdf' },
        { nombre: 'Ley Organica De La Ssc Cdmx 7', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_ORGANICA_DE_LA_SSC_CDMX_7.pdf' },
        { nombre: 'Ley Organica Del Centro De Conciliacion Laboral De La Ciudad De  Mexico 1.4', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_ORGANICA_DEL_CENTRO_DE_CONCILIACION_LABORAL_DE_LA_CIUDAD_DE__MEXICO_1.4.pdf' },
        { nombre: 'Ley Organica Del Congreso De La Cdmx 7.4', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_ORGANICA_DEL_CONGRESO_DE_LA_CDMX_7.4.pdf' },
        { nombre: 'Ley Organica Del Poder Ejecutivo Y De La Administracion Publica De La Cdmx 7.1', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_ORGANICA_DEL_PODER_EJECUTIVO_Y_DE_LA_ADMINISTRACION_PUBLICA_DE_LA_CDMX_7.1.pdf' },
        { nombre: 'Ley Organica Del Poder Judicial De La Cdmx 3.2', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_ORGANICA_DEL_PODER_JUDICIAL_DE_LA_CDMX_3.2.pdf' },
        { nombre: 'Ley Orgnica Del Consejo Econmico Social Y Ambiental Cdmx 5.4', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_ORGNICA_DEL_CONSEJO_ECONMICO_SOCIAL_Y_AMBIENTAL_CDMX_5.4.pdf' },
        { nombre: 'Ley Para El Desarrollo Del Df-Como-Ciudad-Digital Y Del Conocimiento 2.1', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_PARA_EL_DESARROLLO_DEL_DF-COMO-CIUDAD-DIGITAL_Y_DEL_CONOCIMIENTO_2.1.pdf' },
        { nombre: 'Ley Para El Desarrollo Economico De La Cdmx 1.1', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_PARA_EL_DESARROLLO_ECONOMICO_DE_LA_CDMX_1.1.pdf' },
        { nombre: 'Ley Para La Atencion Integral Del Vih Sida Del Df 2', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_PARA_LA_ATENCION_INTEGRAL_DEL_VIH_SIDA_DEL_DF_2.pdf' },
        { nombre: 'Ley Para La Atencion Integral Delcancer De Mama Del Df 2.3', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_PARA_LA_ATENCION_INTEGRAL_DELcANCER_DE_MAMA_DEL_DF_2.3.pdf' },
        { nombre: 'Ley Para La Atencion Personas Espectro Autista 3', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_PARA_LA_ATENCION_PERSONAS_ESPECTRO_AUTISTA_3.pdf' },
        { nombre: 'Ley Para La Atn Delitos Trata De Personas De La Cdmx 4', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_PARA_LA_ATN_DELITOS_TRATA_DE_PERSONAS_DE_LA_CDMX_4.pdf' },
        { nombre: 'Ley Para La Int Al Desa De Las Pers Con Discapacidad Del Df 6.4', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_PARA_LA_INT_AL_DESA_DE_LAS_PERS_CON_DISCAPACIDAD_DEL_DF_6.4.pdf' },
        { nombre: 'Ley Para La Prev Y Trat De La Obesidad Cdmx 3', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_PARA_LA_PREV_Y_TRAT_DE_LA_OBESIDAD_CDMX_3.pdf' },
        { nombre: 'Ley Para La Prevencion De Enfermedades Bucodentales 2', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_PARA_LA_PREVENCION_DE_ENFERMEDADES_BUCODENTALES_2.pdf' },
        { nombre: 'Ley Para La Promocion De La Convivencia Libre De Violencia En El Entorno Escolar De La Ciudad De Mexico 2.3', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_PARA_LA_PROMOCION_DE_LA_CONVIVENCIA_LIBRE_DE_VIOLENCIA_EN_EL_ENTORNO_ESCOLAR_DE_LA_CIUDAD_DE_MEXICO_2.3.pdf' },
        { nombre: 'Ley Para La Reconstruccion Integral De La Ciudad De Mexico 6.1 2', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_PARA_LA_RECONSTRUCCION_INTEGRAL_DE_LA_CIUDAD_DE_MEXICO_6.1_2.pdf' },
        { nombre: 'Ley Para La Ret Por Serv Amb En Suelo De Conserv 3.1', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_PARA_LA_RET_POR_SERV_AMB_EN_SUELO_DE_CONSERV_3.1.pdf' },
        { nombre: 'Ley Para Prev Elim Y Sanc La Desap Forzada Y La Desap Por Part En La Cdmx 2', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_PARA_PREV_ELIM_Y_SANC_LA_DESAP_FORZADA_Y_LA_DESAP_POR_PART_EN_LA_CDMX_2.pdf' },
        { nombre: 'Ley Para Prev La Violencia En Los Esp Deport Del Df 2', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_PARA_PREV_LA_VIOLENCIA_EN_LOS_ESP_DEPORT_DEL_DF_2.pdf' },
        { nombre: 'Ley Para Prevenir La Violencia En  Los Espectaculos Deportivos En La Cdmx 2', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_PARA_PREVENIR_LA_VIOLENCIA_EN__LOS_ESPECTACULOS_DEPORTIVOS_EN_LA_CDMX_2.pdf' },
        { nombre: 'Ley Para Prevenir Y Eliminar La Discriminacion De La Cdmx 5.1', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_PARA_PREVENIR_Y_ELIMINAR_LA_DISCRIMINACION_DE_LA_CDMX_5.1.pdf' },
        { nombre: 'Ley Para Reconocimiento Y La Atencion De Las Personas Lgbttti De La Cdmx 4.1', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_PARA_RECONOCIMIENTO_Y_LA_ATENCION_DE_LAS_PERSONAS_LGBTTTI_DE_LA_CDMX_4.1.pdf' },
        { nombre: 'Ley Parala Atencion Integral De Sustancias Psicoactivas Del Df 2.3', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_PARALA_ATENCION_INTEGRAL_DE_SUSTANCIAS_PSICOACTIVAS_DEL_DF_2.3.pdf' },
        { nombre: 'Ley Parala Atencion Integral Delas Personas Con Sindrome De Down Cdmx 3', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_PARALA_ATENCION_INTEGRAL_DELAS_PERSONAS_CON_SINDROME_DE_DOWN_CDMX_3.pdf' },
        { nombre: 'Ley Parala Prev Trat Y Control De La Diabetes En El Df 2', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_PARALA_PREV_TRAT_Y_CONTROL_DE_LA_DIABETES_EN_EL_DF_2.pdf' },
        { nombre: 'Ley Pension Para El Bienestar Personas Mayores 2.1', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_PENSION_PARA_EL_BIENESTAR_PERSONAS_MAYORES_2.1.pdf' },
        { nombre: 'Ley Presupuesto De Egresos 2024 1.1', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/PRESUPUESTO_DE_EGRESOS_2024_1.1.pdf' },
        { nombre: 'Ley Proc Remocion De Serv Publicos Nomb Por La Aldf Y Tit Org Pol Admin 2.1', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_PROC_REMOCION_DE_SERV_PUBLICOS_NOMB_POR_LA_ALDF_Y_TIT_ORG_POL_ADMIN_2.1.pdf' },
        { nombre: 'Ley Procesal Electoral De La Cdmx 5.3', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_PROCESAL_ELECTORAL_DE_LA_CDMX_5.3.pdf' },
        { nombre: 'Ley Prot Int Personas Ddh Y Periodistas Df 3.1', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_PROT_INT_PERSONAS_DDH_Y_PERIODISTAS_DF_3.1.pdf' },
        { nombre: 'Ley Que Crea Elconsejo Para La Prev Y Atn Int Del Vih Sida Del Df 1.1', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_QUE_CREA_ELcONSEJO_PARA_LA_PREV_Y_ATN_INT_DEL_VIH_SIDA_DEL_DF_1.1.pdf' },
        { nombre: 'Ley Que Extingue La Pretension Punitiva Marchas 1.1', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_QUE_EXTINGUE_LA_PRETENSION_PUNITIVA_MARCHAS_1.1.pdf' },
        { nombre: 'Ley Que Regula El Uso Dela Tecnologa Para La Seguridad Ciudadana De La Cdmx 2.5', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_QUE_REGULA_EL_USO_DELA_TECNOLOGA_PARA_LA_SEGURIDAD_CIUDADANA_DE_LA_CDMX_2.5.pdf' },
        { nombre: 'Ley Rec Derechos Personas Mayores Y Del Sistema Int Para Su Atn De La Cdmx 5.1', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_REC_DERECHOS_PERSONAS_MAYORES_Y_DEL_SISTEMA_INT_PARA_SU_ATN_DE_LA_CDMX_5.1.pdf' },
        { nombre: 'Ley Registral Para La Cdmx 2.4', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_REGISTRAL_PARA_LA_CDMX_2.4.pdf' },
        { nombre: 'Ley Regula Funcionamiento De Los Caci Del Df 1.3', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_REGULA_FUNCIONAMIENTO_DE_LOS_CACI_DEL_DF_1.3.pdf' },
        { nombre: 'Ley Regula Uso De La Fuerza Publica Df 1.1', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_REGULA_USO_DE_LA_FUERZA_PUBLICA_DF_1.1.pdf' },
        { nombre: 'Ley Rgto De La Ley De Huertos Urbanos Cdmx', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/rgto_de_la_ley_de_huertos_urbanos_cdmx.pdf' },
        { nombre: 'Ley Secreto Prof Y Claus De Concien Ejercicio Periodistico De La Cdmx 2.1', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/LEY_SECRETO_PROF_Y_CLAUS_DE_CONCIEN_EJERCICIO_PERIODISTICO_DE_LA_CDMX_2.1.pdf' },
    ],
    codigos: [
        { nombre: 'Codigo De Etica De La Ap De La Ciudad De Mexico 2.1', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/CODIGO_DE_ETICA_DE_LA_AP_DE_LA_CIUDAD_DE_MEXICO_2.1.pdf' },
        { nombre: 'Codigo De Instituciones Y Proc Electorales Cdmx 6', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/CODIGO_DE_INSTITUCIONES_Y_PROC_ELECTORALES_CDMX_6.pdf' },
        { nombre: 'Codigo De Responsabilidad Parlamentaria Del Congreso De La Ciudad De Mexico 2.1', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/CODIGO_DE_RESPONSABILIDAD_PARLAMENTARIA_DEL_CONGRESO_DE_LA_CIUDAD_DE_MEXICO_2.1.pdf' },
        { nombre: 'Código Civil para el Distrito Federal', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/CODIGO_CIVIL_PARA_EL_DF_15.3.pdf' },
        { nombre: 'Código Fiscal de la Ciudad de México', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/CODIGO_FISCAL_DE_LA_CDMX_26.1.pdf' },
        { nombre: 'Código Penal para el Distrito Federal', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/CODIGO_PENAL_PARA_EL_DF_12.3.4.pdf' },
    ],
    reglamentos: [
        { nombre: 'Reglamento De La Ley De Cultura Civica De La Cdmx', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/REGLAMENTO_DE_LA_LEY_DE_CULTURA_CIVICA_DE_LA_CDMX.pdf' },
        { nombre: 'Reglamento De La Ley De Establecimientos Mercantiles Para La Ciudad De Mexico 2', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/REGLAMENTO_DE_LA_LEY_DE_ESTABLECIMIENTOS_MERCANTILES_PARA_LA_CIUDAD_DE_MEXICO_2.pdf' },
        { nombre: 'Reglamento De La Ley Del Notariado En La Ciudad De Mexico 1', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/REGLAMENTO_DE_LA_LEY_DEL_NOTARIADO_EN_LA_CIUDAD_DE_MEXICO_1.pdf' },
        { nombre: 'Reglamento Del Registro Civil De La Cdmx 1.1', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/REGLAMENTO_DEL_REGISTRO_CIVIL_DE_LA_CDMX_1.1.pdf' },
        { nombre: 'Rgto De La Ley De Turismo De La Cdmx 1', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/RGTO_DE_LA_LEY_DE_TURISMO_DE_LA_CDMX_1.pdf' },
        { nombre: 'Rto Economia Circular Cdmx', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/RTO_ECONOMIA_CIRCULAR_CDMX.pdf' },
        { nombre: 'Rto Ley De Publicidad Exterior Cdmx 2.6', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/RTO_LEY_DE_PUBLICIDAD_EXTERIOR_CDMX_2.6.pdf' },
        { nombre: 'Rto Ley Esp Culturales Ind Cdmx.2', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CDMX/RTO_LEY_ESP_CULTURALES_IND_CDMX.2.pdf' },
    ],
    otros: [],
};







// ─── Veracruz: FULL DATA — PDFs hosted on Supabase ────────────────
const VER_BASE = 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/Veracruz';
const VER_LEYES: CategoriaLeyes = {
    constitucion: [
        { nombre: 'Constitución Política del Estado de Veracruz de Ignacio de la Llave', url: `${VER_BASE}/CONSTITUCION28012026.pdf` },
    ],
    leyes: [
        { nombre: 'Dictamen y Texto de Ley aprobado por el Congreso del Estado', url: `${VER_BASE}/DICTAMEN.pdf` },
        { nombre: 'Iniciativa de Reforma Integral a la Constitución Política del Estado de Veracruz de Ignacio de la Llave', url: `${VER_BASE}/INICIATIVA.pdf` },
        { nombre: 'Ley Apícola para el Estado de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/LAPICOLA04022020.pdf` },
        { nombre: 'Ley Apícola para el Estado de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/LAPICOLA04022020.pdf` },
        { nombre: 'Ley Contra el Lucro Inmoderado.', url: `${VER_BASE}/LeyContraLucroInmoderado.pdf` },
        { nombre: 'Ley Contra el Lucro Inmoderado.', url: `${VER_BASE}/LeyContraLucroInmoderado.pdf` },
        { nombre: 'Ley Contra el Ruido en el Estado de Veracruz.', url: `${VER_BASE}/LRUIDO230818.pdf` },
        { nombre: 'Ley Contra el Ruido en el Estado de Veracruz.', url: `${VER_BASE}/LRUIDO230818.pdf` },
        { nombre: 'Ley Estatal de Mitigación y Adaptación ante los efectos del Cambio Climático', url: `${VER_BASE}/LEYESTATALDEMITIGACIONY ADAPTACION DELCAMBIOCLIMATICO07082024.pdf` },
        { nombre: 'Ley Estatal de Mitigación y Adaptación ante los efectos del Cambio Climático', url: `${VER_BASE}/LEYESTATALDEMITIGACIONY ADAPTACION DELCAMBIOCLIMATICO07082024.pdf` },
        { nombre: 'Ley Estatal de Participación Ciudadana y Gobierno Abierto', url: `${VER_BASE}/LEPCGA291118.pdf` },
        { nombre: 'Ley Estatal de Participación Ciudadana y Gobierno Abierto', url: `${VER_BASE}/LEPCGA291118.pdf` },
        { nombre: 'Ley Estatal de Protección Ambiental.', url: `${VER_BASE}/LEYESTATALDEPROTECCIONAMBIENTAL07082024.pdf` },
        { nombre: 'Ley Estatal de Protección Ambiental.', url: `${VER_BASE}/LEYESTATALDEPROTECCIONAMBIENTAL07082024.pdf` },
        { nombre: 'Ley Estatal del Servicio Civil de Veracruz.', url: `${VER_BASE}/LESCV301216.pdf` },
        { nombre: 'Ley Estatal del Servicio Civil de Veracruz.', url: `${VER_BASE}/LESCV301216.pdf` },
        { nombre: 'Ley Ganadera para el Estado de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/LEYGANADERA16082023.pdf` },
        { nombre: 'Ley Ganadera para el Estado de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/LEYGANADERA16082023.pdf` },
        { nombre: 'Ley Orgánica de la Fiscalía General del Estado de Veracruz de Ignacio de la Llave', url: `${VER_BASE}/LEYORGANICADELAFISCALIAGENERAL11122025.pdf` },
        { nombre: 'Ley Orgánica de la Fiscalía General del Estado de Veracruz de Ignacio de la Llave', url: `${VER_BASE}/LEYORGANICADELAFISCALIAGENERAL11122025.pdf` },
        { nombre: 'Ley Orgánica de la Universidad Veracruzana.', url: `${VER_BASE}/ORGUV130397.pdf` },
        { nombre: 'Ley Orgánica de la Universidad Veracruzana.', url: `${VER_BASE}/ORGUV130397.pdf` },
        { nombre: 'Ley Orgánica del Colegio de Veracruz', url: `${VER_BASE}/LOCOLEGIOVER30072020.pdf` },
        { nombre: 'Ley Orgánica del Colegio de Veracruz', url: `${VER_BASE}/LOCOLEGIOVER30072020.pdf` },
        { nombre: 'Ley Orgánica del Municipio Libre.', url: `${VER_BASE}/LEYORGANICADELMUNICIPIOLIBRE19122025.pdf` },
        { nombre: 'Ley Orgánica del Municipio Libre.', url: `${VER_BASE}/LEYORGANICADELMUNICIPIOLIBRE19122025.pdf` },
        { nombre: 'Ley Orgánica del Poder Ejecutivo del Estado de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/LEYORGANICADELPODEREJECUTIVO25022026.pdf` },
        { nombre: 'Ley Orgánica del Poder Ejecutivo del Estado de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/LEYORGANICADELPODEREJECUTIVO25022026.pdf` },
        { nombre: 'Ley Orgánica del Poder Judicial del Estado de Veracruz de Ignacio de la Llave', url: `${VER_BASE}/LOPODERJUDICIALTO29012025FE.pdf` },
        { nombre: 'Ley Orgánica del Poder Judicial del Estado de Veracruz de Ignacio de la Llave', url: `${VER_BASE}/LOPODERJUDICIALTO29012025FE.pdf` },
        { nombre: 'Ley Orgánica del Poder Legislativo del Estado de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/LEYORGANICADELPODERLEGISLATIVO19122025.pdf` },
        { nombre: 'Ley Orgánica del Poder Legislativo del Estado de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/LEYORGANICADELPODERLEGISLATIVO19122025.pdf` },
        { nombre: 'Ley Orgánica del Tribunal de Justicia Administrativa del Estado de Veracruz', url: `${VER_BASE}/LOTJUSTICIAADMINISTRATIVAEVERA19072023.pdf` },
        { nombre: 'Ley Orgánica del Tribunal de Justicia Administrativa del Estado de Veracruz', url: `${VER_BASE}/LOTJUSTICIAADMINISTRATIVAEVERA19072023.pdf` },
        { nombre: 'Ley Para la Protección de los No Fumadores del Estado de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/LPNOFUMADORES04022020.pdf` },
        { nombre: 'Ley Para la Protección de los No Fumadores del Estado de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/LPNOFUMADORES04022020.pdf` },
        { nombre: 'Ley Pro Aumento de la Producción de Maíz, Frijol, Arroz y Trigo, en el Estado de Veracruz.', url: `${VER_BASE}/LeyProAumentoProdMaizFrijolArroz.pdf` },
        { nombre: 'Ley Pro Aumento de la Producción de Maíz, Frijol, Arroz y Trigo, en el Estado de Veracruz.', url: `${VER_BASE}/LeyProAumentoProdMaizFrijolArroz.pdf` },
        { nombre: 'Ley Reglamentaria del artículo 84 de la Constitución Política del Estado de Veracruz de Ignacio de la Llave, en Materia de Reformas Constitucionales Parciales', url: `${VER_BASE}/LR 84C041218.pdf` },
        { nombre: 'Ley Reglamentaria del artículo 84 de la Constitución Política del Estado de Veracruz de Ignacio de la Llave, en Materia de Reformas Constitucionales Parciales', url: `${VER_BASE}/LR 84C041218.pdf` },
        { nombre: 'Ley Relativa a la Prostitución y de Profilaxis Social.', url: `${VER_BASE}/LeyRelativaProstYProfilaxisSocial.pdf` },
        { nombre: 'Ley Relativa a la Prostitución y de Profilaxis Social.', url: `${VER_BASE}/LeyRelativaProstYProfilaxisSocial.pdf` },
        { nombre: 'Ley de Acceso de las Mujeres a una Vida Libre de Violencia para el Estado de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/LEYDEACCESOALASMUJERESAUNAVIDALIBREDEVIOLENCIA06032026.pdf` },
        { nombre: 'Ley de Acceso de las Mujeres a una Vida Libre de Violencia para el Estado de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/LEYDEACCESOALASMUJERESAUNAVIDALIBREDEVIOLENCIA06032026.pdf` },
        { nombre: 'Ley de Adaptación Social y de los Consejos Tutelares para Menores Infractores.', url: `${VER_BASE}/TUTELARES18-05-07.pdf` },
        { nombre: 'Ley de Adaptación Social y de los Consejos Tutelares para Menores Infractores.', url: `${VER_BASE}/TUTELARES18-05-07.pdf` },
        { nombre: 'Ley de Adopciones para el Estado de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/LADOPCIONES03072020.pdf` },
        { nombre: 'Ley de Adopciones para el Estado de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/LADOPCIONES03072020.pdf` },
        { nombre: 'Ley de Adquisiciones, Arrendamientos, Administración y Enajenación de Bienes Muebles del Estado de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/LEYDEADQUISICIONES04022025.pdf` },
        { nombre: 'Ley de Adquisiciones, Arrendamientos, Administración y Enajenación de Bienes Muebles del Estado de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/LEYDEADQUISICIONES04022025.pdf` },
        { nombre: 'Ley de Aguas del Estado de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/LAGUAS04022020.pdf` },
        { nombre: 'Ley de Aguas del Estado de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/LAGUAS04022020.pdf` },
        { nombre: 'Ley de Amnistía para el Estado de Veracruz', url: `${VER_BASE}/AMNISTIA30-05-07.pdf` },
        { nombre: 'Ley de Amnistía para el Estado de Veracruz', url: `${VER_BASE}/AMNISTIA30-05-07.pdf` },
        { nombre: 'Ley de Amnistía para el Estado de Veracruz-Llave.', url: `${VER_BASE}/AMNISTIA26-06-96.pdf` },
        { nombre: 'Ley de Amnistía para el Estado de Veracruz-Llave.', url: `${VER_BASE}/AMNISTIA26-06-96.pdf` },
        { nombre: 'Ley de Asociaciones Público-Privadas para el Estado de Veracruz de Ignacio de la Llave', url: `${VER_BASE}/LASOCIACIONESPP04022020.pdf` },
        { nombre: 'Ley de Asociaciones Público-Privadas para el Estado de Veracruz de Ignacio de la Llave', url: `${VER_BASE}/LASOCIACIONESPP04022020.pdf` },
        { nombre: 'Ley de Atención a Personas Migrantes y sus Familias para el Estado de Veracruz de Ignacio de la Llave', url: `${VER_BASE}/LMIGRANTES051018.pdf` },
        { nombre: 'Ley de Atención a Personas Migrantes y sus Familias para el Estado de Veracruz de Ignacio de la Llave', url: `${VER_BASE}/LMIGRANTES051018.pdf` },
        { nombre: 'Ley de Austeridad para el Estado de Veracruz de Ignacio de la Llave', url: `${VER_BASE}/LAUSTERIDAD28012025CC1.pdf` },
        { nombre: 'Ley de Austeridad para el Estado de Veracruz de Ignacio de la Llave', url: `${VER_BASE}/LAUSTERIDAD28012025CC1.pdf` },
        { nombre: 'Ley de Autonomía de la Universidad Veracruzana.', url: `${VER_BASE}/LeyAutonomiaUV.pdf` },
        { nombre: 'Ley de Autonomía de la Universidad Veracruzana.', url: `${VER_BASE}/LeyAutonomiaUV.pdf` },
        { nombre: 'Ley de Bienes del Estado.', url: `${VER_BASE}/BIENES130411.pdf` },
        { nombre: 'Ley de Bienes del Estado.', url: `${VER_BASE}/BIENES130411.pdf` },
        { nombre: 'Ley de Caminos y Puentes del Estado.', url: `${VER_BASE}/LCAMINOSP120718.pdf` },
        { nombre: 'Ley de Caminos y Puentes del Estado.', url: `${VER_BASE}/LCAMINOSP120718.pdf` },
        { nombre: 'Ley de Campaña para la Erradicación de la Garrapata en la Ganadería del Estado.', url: `${VER_BASE}/LeyCampanaErradGarrapata.pdf` },
        { nombre: 'Ley de Campaña para la Erradicación de la Garrapata en la Ganadería del Estado.', url: `${VER_BASE}/LeyCampanaErradGarrapata.pdf` },
        { nombre: 'Ley de Catastro del Estado de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/CATASTRO180712(1).pdf` },
        { nombre: 'Ley de Catastro del Estado de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/CATASTRO180712(1).pdf` },
        { nombre: 'Ley de Comunicación Social para el Estado de Veracruz de Ignacio de la Llave', url: `${VER_BASE}/LCOMUNICACIONSOCIALTO15032021.pdf` },
        { nombre: 'Ley de Comunicación Social para el Estado de Veracruz de Ignacio de la Llave', url: `${VER_BASE}/LCOMUNICACIONSOCIALTO15032021.pdf` },
        { nombre: 'Ley de Control Constitucional para el Estado de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/LCCONSTITUCIONAL04022020.pdf` },
        { nombre: 'Ley de Control Constitucional para el Estado de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/LCCONSTITUCIONAL04022020.pdf` },
        { nombre: 'Ley de Coordinación Fiscal para el Estado y los Municipios de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/LCOORDINACIONFISCAL12122025.pdf` },
        { nombre: 'Ley de Coordinación Fiscal para el Estado y los Municipios de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/LCOORDINACIONFISCAL12122025.pdf` },
        { nombre: 'Ley de Coordinación en Materia de Sanidad Vegetal e Inocuidad Agrícola del Estado de Veracruz de Ignacio de la LLave.', url: `${VER_BASE}/SANVEGETAL040816.pdf` },
        { nombre: 'Ley de Coordinación en Materia de Sanidad Vegetal e Inocuidad Agrícola del Estado de Veracruz de Ignacio de la LLave.', url: `${VER_BASE}/SANVEGETAL040816.pdf` },
        { nombre: 'Ley de Defensoría Pública del Estado de Veracruz de Ignacio de la Llave', url: `${VER_BASE}/DEFENSORIA210313.pdf` },
        { nombre: 'Ley de Defensoría Pública del Estado de Veracruz de Ignacio de la Llave', url: `${VER_BASE}/DEFENSORIA210313.pdf` },
        { nombre: 'Ley de Derechos y Culturas Indígenas para el Estado de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/LDCI161219.pdf` },
        { nombre: 'Ley de Derechos y Culturas Indígenas para el Estado de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/LDCI161219.pdf` },
        { nombre: 'Ley de Desarrollo Forestal Sustentable para el Estado de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/LDFS04022020.pdf` },
        { nombre: 'Ley de Desarrollo Forestal Sustentable para el Estado de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/LDFS04022020.pdf` },
        { nombre: 'Ley de Desarrollo Integral de la Juventud', url: `${VER_BASE}/LDIJ10092020.pdf` },
        { nombre: 'Ley de Desarrollo Integral de la Juventud', url: `${VER_BASE}/LDIJ10092020.pdf` },
        { nombre: 'Ley de Desarrollo Social y Humano para el Estado de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/LDSH160819.pdf` },
        { nombre: 'Ley de Desarrollo Social y Humano para el Estado de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/LDSH160819.pdf` },
        { nombre: 'Ley de Desarrollo Urbano, Ordenamiento Territorial y Vivienda para el Estado de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/LDUOTV04022025.pdf` },
        { nombre: 'Ley de Desarrollo Urbano, Ordenamiento Territorial y Vivienda para el Estado de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/LDUOTV04022025.pdf` },
        { nombre: 'Ley de Documentos Administrativos e Históricos del Estado Libre y Soberano de Veracruz - Llave.', url: `${VER_BASE}/LeyDocAdmvosEHist.pdf` },
        { nombre: 'Ley de Documentos Administrativos e Históricos del Estado Libre y Soberano de Veracruz - Llave.', url: `${VER_BASE}/LeyDocAdmvosEHist.pdf` },
        { nombre: 'Ley de Educación del Estado de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/LEDUCACION04022020.pdf` },
        { nombre: 'Ley de Educación del Estado de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/LEDUCACION04022020.pdf` },
        { nombre: 'Ley de Ejecución de Sanciones para el Estado de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/ESANCIONES110106.pdf` },
        { nombre: 'Ley de Ejecución de Sanciones para el Estado de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/ESANCIONES110106.pdf` },
        { nombre: 'Ley de Ejecución de Sanciones y Reinserción Social para el Estado de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/ESANCIONES280616.pdf` },
        { nombre: 'Ley de Ejecución de Sanciones y Reinserción Social para el Estado de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/ESANCIONES280616.pdf` },
        { nombre: 'Ley de Expropiación, Ocupación Temporal y Limitación de Dominio de Bienes de Propiedad Privada para el Estado de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/EXPROPIACION200712.pdf` },
        { nombre: 'Ley de Expropiación, Ocupación Temporal y Limitación de Dominio de Bienes de Propiedad Privada para el Estado de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/EXPROPIACION200712.pdf` },
        { nombre: 'Ley de Firma Electrónica para el Estado de Veracruz de Ignacio de la Llave y sus Municipios', url: `${VER_BASE}/FELECTRO250515.pdf` },
        { nombre: 'Ley de Firma Electrónica para el Estado de Veracruz de Ignacio de la Llave y sus Municipios', url: `${VER_BASE}/FELECTRO250515.pdf` },
        { nombre: 'Ley de Fiscalización Superior y Rendición de Cuentas del Estado de Veracruz de Ignacio de la Llave', url: `${VER_BASE}/LEYDEFISCALIZACIONSUPERIOR29042025.pdf` },
        { nombre: 'Ley de Fiscalización Superior y Rendición de Cuentas del Estado de Veracruz de Ignacio de la Llave', url: `${VER_BASE}/LEYDEFISCALIZACIONSUPERIOR29042025.pdf` },
        { nombre: 'Ley de Fomento Económico para el Estado de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/LFECO230818.pdf` },
        { nombre: 'Ley de Fomento Económico para el Estado de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/LFECO230818.pdf` },
        { nombre: 'Ley de Fomento a la Actividad Artesanal para el Estado de Veracruz de Ignacio de la Llave', url: `${VER_BASE}/LFAARTESANAL12022020.pdf` },
        { nombre: 'Ley de Fomento a la Actividad Artesanal para el Estado de Veracruz de Ignacio de la Llave', url: `${VER_BASE}/LFAARTESANAL12022020.pdf` },
        { nombre: 'Ley de Fomento a la Investigación Científica y Tecnológica del Estado de Veracruz de Ignacio de la Llave', url: `${VER_BASE}/LFIC050618.pdf` },
        { nombre: 'Ley de Fomento a la Investigación Científica y Tecnológica del Estado de Veracruz de Ignacio de la Llave', url: `${VER_BASE}/LFIC050618.pdf` },
        { nombre: 'Ley de Fomento a las Actividades de Desarrollo Social de las Organizaciones Civiles para el Estado de Veracruz de Ignacio Llave.', url: `${VER_BASE}/LFADSOCIAL090216.pdf` },
        { nombre: 'Ley de Fomento a las Actividades de Desarrollo Social de las Organizaciones Civiles para el Estado de Veracruz de Ignacio Llave.', url: `${VER_BASE}/LFADSOCIAL090216.pdf` },
        { nombre: 'Ley de Fomento al Empleo del Estado de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/LFOMEMPLEO04022020.pdf` },
        { nombre: 'Ley de Fomento al Empleo del Estado de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/LFOMEMPLEO04022020.pdf` },
        { nombre: 'Ley de Fomento y Protección de Ciudades Industriales nuevas en el Estado de Veracruz - Llave.', url: `${VER_BASE}/LeyFomentoYProtecCdIndustNvas.pdf` },
        { nombre: 'Ley de Fomento y Protección de Ciudades Industriales nuevas en el Estado de Veracruz - Llave.', url: `${VER_BASE}/LeyFomentoYProtecCdIndustNvas.pdf` },
        { nombre: 'Ley de Fomento y Protección de la Vainilla.', url: `${VER_BASE}/LeyFomentoyProtecionVainilla.pdf` },
        { nombre: 'Ley de Fomento y Protección de la Vainilla.', url: `${VER_BASE}/LeyFomentoyProtecionVainilla.pdf` },
        { nombre: 'Ley de Ingresos del Gobierno del Estado de Veracruz de Ignacio de la Llave para el Ejercicio Fiscal de 2025', url: `${VER_BASE}/LEYDEINGRESOS2025.pdf` },
        { nombre: 'Ley de Ingresos del Gobierno del Estado de Veracruz de Ignacio de la Llave para el Ejercicio Fiscal de 2025', url: `${VER_BASE}/LEYDEINGRESOS2025.pdf` },
        { nombre: 'Ley de Instituciones de Beneficencia Privada para el Estado de Veracruz de Ignacio de la Llave', url: `${VER_BASE}/LINSTBENEPRIV04022020.pdf` },
        { nombre: 'Ley de Instituciones de Beneficencia Privada para el Estado de Veracruz de Ignacio de la Llave', url: `${VER_BASE}/LINSTBENEPRIV04022020.pdf` },
        { nombre: 'Ley de Juicio Político y Declaración de Procedencia para el Estado de Veracruz de Ignacio de la Llave', url: `${VER_BASE}/JUIPOLIT080807.pdf` },
        { nombre: 'Ley de Juicio Político y Declaración de Procedencia para el Estado de Veracruz de Ignacio de la Llave', url: `${VER_BASE}/JUIPOLIT080807.pdf` },
        { nombre: 'Ley de Juntas de Mejoras para el Desarrollo y Bienestar de las Comunidades del Estado de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/LJUNTASMEJORASBIENESTAR04112020.pdf` },
        { nombre: 'Ley de Juntas de Mejoras para el Desarrollo y Bienestar de las Comunidades del Estado de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/LJUNTASMEJORASBIENESTAR04112020.pdf` },
        { nombre: 'Ley de Mecanismos Alternativos de Solución de Controversias del Estado de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/LEYDEMECANISMOSALTERNATIVOSDESOLUCIONDECONTROVERSIAS(17102025SCJN.pdf` },
        { nombre: 'Ley de Mecanismos Alternativos de Solución de Controversias del Estado de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/LEYDEMECANISMOSALTERNATIVOSDESOLUCIONDECONTROVERSIAS(17102025SCJN.pdf` },
        { nombre: 'Ley de Obras Públicas y Servicios Relacionados con ellas del Estado de Veracruz de Ignacio de la Llave', url: `${VER_BASE}/LEYDEOBRASPUBLICASYSERVICIOSRELACIONADOSCONELLAS14082025.pdf` },
        { nombre: 'Ley de Obras Públicas y Servicios Relacionados con ellas del Estado de Veracruz de Ignacio de la Llave', url: `${VER_BASE}/LEYDEOBRASPUBLICASYSERVICIOSRELACIONADOSCONELLAS14082025.pdf` },
        { nombre: 'Ley de Operaciones Inmobiliarias para el Estado de Veracruz de Ignacio de la Llave', url: `${VER_BASE}/LOINMOB04022020F.pdf` },
        { nombre: 'Ley de Operaciones Inmobiliarias para el Estado de Veracruz de Ignacio de la Llave', url: `${VER_BASE}/LOINMOB04022020F.pdf` },
        { nombre: 'Ley de Pensiones del Estado de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/PENSIONES151211.pdf` },
        { nombre: 'Ley de Pensiones del Estado de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/PENSIONES151211.pdf` },
        { nombre: 'Ley de Pesca y Acuacultura Sustentables para el Estado de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/LPESCA04022020.pdf` },
        { nombre: 'Ley de Pesca y Acuacultura Sustentables para el Estado de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/LPESCA04022020.pdf` },
        { nombre: 'Ley de Planeación del Estado de Veracruz de Ignacio de la Llave', url: `${VER_BASE}/LEYDEPLANEACION19122025F.pdf` },
        { nombre: 'Ley de Planeación del Estado de Veracruz de Ignacio de la Llave', url: `${VER_BASE}/LEYDEPLANEACION19122025F.pdf` },
        { nombre: 'Ley de Premios del Estado de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/LPREMIOS27022020.pdf` },
        { nombre: 'Ley de Premios del Estado de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/LPREMIOS27022020.pdf` },
        { nombre: 'Ley de Prevención Social de la Violencia y la Delincuencia del Estado de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/LEY DE PREVENCION SOCIAL DE LA VIOLENCIA 04-03-2021 FE.pdf` },
        { nombre: 'Ley de Prevención Social de la Violencia y la Delincuencia del Estado de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/LEY DE PREVENCION SOCIAL DE LA VIOLENCIA 04-03-2021 FE.pdf` },
        { nombre: 'Ley de Prevención y Atención del Acoso Escolar para el Estado de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/LPAAE310517.pdf` },
        { nombre: 'Ley de Prevención y Atención del Acoso Escolar para el Estado de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/LPAAE310517.pdf` },
        { nombre: 'Ley de Prevención y Gestión Integral de Residuos Sólidos Urbanos y de Manejo Especial para el Estado de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/LPGIRS2911182.pdf` },
        { nombre: 'Ley de Prevención y Gestión Integral de Residuos Sólidos Urbanos y de Manejo Especial para el Estado de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/LPGIRS2911182.pdf` },
        { nombre: 'Ley de Prevención, Atención y Asistencia de la Violencia Familiar en el Estado de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/LPAAVFVTO01082024.pdf` },
        { nombre: 'Ley de Prevención, Atención y Asistencia de la Violencia Familiar en el Estado de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/LPAAVFVTO01082024.pdf` },
        { nombre: 'Ley de Protección Civil y la Reducción del Riesgo de Desastres para el Estado de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/LEY_DE_PROTECCION_CIVIL_Y_LA_REDUCCION_DE_RIESGOS_DE_DESASTRES_15-10-2025.pdf` },
        { nombre: 'Ley de Protección Civil y la Reducción del Riesgo de Desastres para el Estado de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/LEY_DE_PROTECCION_CIVIL_Y_LA_REDUCCION_DE_RIESGOS_DE_DESASTRES_15-10-2025.pdf` },
        { nombre: 'Ley de Protección a la Maternidad para el Estado de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/MATERNIDAD150116.pdf` },
        { nombre: 'Ley de Protección a la Maternidad para el Estado de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/MATERNIDAD150116.pdf` },
        { nombre: 'Ley de Protección a los Animales para el Estado de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/LPANIMALES04022020F.pdf` },
        { nombre: 'Ley de Protección a los Animales para el Estado de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/LPANIMALES04022020F.pdf` },
        { nombre: 'Ley de Protección de Datos Personales en Posesión de Sujetos Obligados del Estado de Veracruz de Ignacio de la Llave', url: `${VER_BASE}/LPROTECCIONDATOSPERSONALESTO30062025.pdf` },
        { nombre: 'Ley de Protección de Datos Personales en Posesión de Sujetos Obligados del Estado de Veracruz de Ignacio de la Llave', url: `${VER_BASE}/LPROTECCIONDATOSPERSONALESTO30062025.pdf` },
        { nombre: 'Ley de Protección, Conservación y Fomento de Arbolado y Áreas Verdes Urbanas para el Estado de Veracruz de Ignacio de la Llave', url: `${VER_BASE}/LARBOLADO291118.pdf` },
        { nombre: 'Ley de Protección, Conservación y Fomento de Arbolado y Áreas Verdes Urbanas para el Estado de Veracruz de Ignacio de la Llave', url: `${VER_BASE}/LARBOLADO291118.pdf` },
        { nombre: 'Ley de Proyectos para la prestación de Servicios para el Estado de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/PROYECTOS27-11-07.pdf` },
        { nombre: 'Ley de Proyectos para la prestación de Servicios para el Estado de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/PROYECTOS27-11-07.pdf` },
        { nombre: 'Ley de Referendo, Plebiscito, Iniciativa Ciudadana y Consulta Popular para el Estado de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/LRPICCP280518.pdf` },
        { nombre: 'Ley de Referendo, Plebiscito, Iniciativa Ciudadana y Consulta Popular para el Estado de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/LRPICCP280518.pdf` },
        { nombre: 'Ley de Responsabilidad Patrimonial de la Administración Pública Estatal y Municipal del Estado de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/RESPONSABILIDADPATRIMONIAL20122022.pdf` },
        { nombre: 'Ley de Responsabilidad Patrimonial de la Administración Pública Estatal y Municipal del Estado de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/RESPONSABILIDADPATRIMONIAL20122022.pdf` },
        { nombre: 'Ley de Responsabilidades Administrativas para el Estado de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/LRADMINISTRATIVAS20122022.pdf` },
        { nombre: 'Ley de Responsabilidades Administrativas para el Estado de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/LRADMINISTRATIVAS20122022.pdf` },
        { nombre: 'Ley de Salud del Estado de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/LSALUD04022020F2.pdf` },
        { nombre: 'Ley de Salud del Estado de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/LSALUD04022020F2.pdf` },
        { nombre: 'Ley de Transparencia y Acceso a la Información Pública del Estado de Veracruz de Ignacio de la Llave', url: `${VER_BASE}/LTRANSPARENCIATO30062025.pdf` },
        { nombre: 'Ley de Transparencia y Acceso a la Información Pública del Estado de Veracruz de Ignacio de la Llave', url: `${VER_BASE}/LTRANSPARENCIATO30062025.pdf` },
        { nombre: 'Ley de Tránsito y Seguridad Vial para el Estado de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/LTRANSITOSEGURIDADVIAL22032021.pdf` },
        { nombre: 'Ley de Tránsito y Seguridad Vial para el Estado de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/LTRANSITOSEGURIDADVIAL22032021.pdf` },
        { nombre: 'Ley de Turismo del Estado de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/LEYDETURISMO06032026.pdf` },
        { nombre: 'Ley de Turismo del Estado de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/LEYDETURISMO06032026.pdf` },
        { nombre: 'Ley de Valuación Inmobiliaria del Estado de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/VALUACIONT.O..pdf` },
        { nombre: 'Ley de Valuación Inmobiliaria del Estado de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/VALUACIONT.O..pdf` },
        { nombre: 'Ley de Vida Silvestre para el Estado de Veracruz de Ignacio de la Llave', url: `${VER_BASE}/LVSILVESTRE04022020.pdf` },
        { nombre: 'Ley de Vida Silvestre para el Estado de Veracruz de Ignacio de la Llave', url: `${VER_BASE}/LVSILVESTRE04022020.pdf` },
        { nombre: 'Ley de Voluntad Anticipada para el Estado de Veracruz de Ignacio de la Llave', url: `${VER_BASE}/LEY DE VOLUNTAD ANTICIPADA PARA EL ESTADO DE VERACRUZ DE IGNACIO DE LA LLAVE 20-11-18.pdf` },
        { nombre: 'Ley de Voluntad Anticipada para el Estado de Veracruz de Ignacio de la Llave', url: `${VER_BASE}/LEY DE VOLUNTAD ANTICIPADA PARA EL ESTADO DE VERACRUZ DE IGNACIO DE LA LLAVE 20-11-18.pdf` },
        { nombre: 'Ley de Víctimas para el Estado de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/LVICTIMAS07032025.pdf` },
        { nombre: 'Ley de Víctimas para el Estado de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/LVICTIMAS07032025.pdf` },
        { nombre: 'Ley de la Comisión Estatal de Derechos Humanos para el Estado de Veracruz - Llave.', url: `${VER_BASE}/LCEDH26012021.pdf` },
        { nombre: 'Ley de la Comisión Estatal de Derechos Humanos para el Estado de Veracruz - Llave.', url: `${VER_BASE}/LCEDH26012021.pdf` },
        { nombre: 'Ley de la Comisión Estatal para la Atención y Protección de los Periodistas.', url: `${VER_BASE}/LCOMISIONESTATALATENCIONPROTECCION17092025.pdf` },
        { nombre: 'Ley de la Comisión Estatal para la Atención y Protección de los Periodistas.', url: `${VER_BASE}/LCOMISIONESTATALATENCIONPROTECCION17092025.pdf` },
        { nombre: 'Ley de la Gaceta Oficial del Gobierno del Estado de Veracruz de Ignacio de la Llave', url: `${VER_BASE}/GACETA29-08-07.pdf` },
        { nombre: 'Ley de la Gaceta Oficial del Gobierno del Estado de Veracruz de Ignacio de la Llave', url: `${VER_BASE}/GACETA29-08-07.pdf` },
        { nombre: 'Ley de los Cuerpos de Bomberos del Estado de Veracruz de Ignacio de la Lave.', url: `${VER_BASE}/LBOMBEROSTO.pdf` },
        { nombre: 'Ley de los Cuerpos de Bomberos del Estado de Veracruz de Ignacio de la Lave.', url: `${VER_BASE}/LBOMBEROSTO.pdf` },
        { nombre: 'Ley de los Derechos de Niñas, Niños y Adolescentes para el Estado de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/LDNNA07032025F.pdf` },
        { nombre: 'Ley de los Derechos de Niñas, Niños y Adolescentes para el Estado de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/LDNNA07032025F.pdf` },
        { nombre: 'Ley de los Derechos de las Personas Mayores para el Estado de Veracruz de Ignacio de la Llave', url: `${VER_BASE}/LDPMEV12062020.pdf` },
        { nombre: 'Ley de los Derechos de las Personas Mayores para el Estado de Veracruz de Ignacio de la Llave', url: `${VER_BASE}/LDPMEV12062020.pdf` },
        { nombre: 'Ley del Centro de Conciliación Laboral del estado de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/LCONCILIACIONLABORAL24122020.pdf` },
        { nombre: 'Ley del Centro de Conciliación Laboral del estado de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/LCONCILIACIONLABORAL24122020.pdf` },
        { nombre: 'Ley del Ejercicio Profesional para el Estado de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/LEP061219.pdf` },
        { nombre: 'Ley del Ejercicio Profesional para el Estado de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/LEP061219.pdf` },
        { nombre: 'Ley del Escudo.', url: `${VER_BASE}/LeyDelEscudo.pdf` },
        { nombre: 'Ley del Escudo.', url: `${VER_BASE}/LeyDelEscudo.pdf` },
        { nombre: 'Ley del Himno al Estado de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/LHIMNOVER04022020.pdf` },
        { nombre: 'Ley del Himno al Estado de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/LHIMNOVER04022020.pdf` },
        { nombre: 'Ley del Inquilinato para el Estado de Veracruz.', url: `${VER_BASE}/LeyInquilinato.pdf` },
        { nombre: 'Ley del Inquilinato para el Estado de Veracruz.', url: `${VER_BASE}/LeyInquilinato.pdf` },
        { nombre: 'Ley del Instituto Veracruzano de Desarrollo Municipal', url: `${VER_BASE}/LIVDM17092021F.pdf` },
        { nombre: 'Ley del Instituto Veracruzano de Desarrollo Municipal', url: `${VER_BASE}/LIVDM17092021F.pdf` },
        { nombre: 'Ley del Notariado del Estado de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/NOTARIADO030815.pdf` },
        { nombre: 'Ley del Notariado del Estado de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/NOTARIADO030815.pdf` },
        { nombre: 'Ley del Patrimonio Cultural del Estado de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/LPCULTURAL21042021F.pdf` },
        { nombre: 'Ley del Patrimonio Cultural del Estado de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/LPCULTURAL21042021F.pdf` },
        { nombre: 'Ley del Patronato de Construcciones, laboratorios y equipos de la Universidad Veracruzana.', url: `${VER_BASE}/LeyPatronatoConstLabYEqUV.pdf` },
        { nombre: 'Ley del Patronato de Construcciones, laboratorios y equipos de la Universidad Veracruzana.', url: `${VER_BASE}/LeyPatronatoConstLabYEqUV.pdf` },
        { nombre: 'Ley del Registro Público de la Propiedad para el Estado de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/LRPP230508.pdf` },
        { nombre: 'Ley del Registro Público de la Propiedad para el Estado de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/LRPP230508.pdf` },
        { nombre: 'Ley del Seguro Social de los Trabajadores de la Educación del Estado de Veracruz.', url: `${VER_BASE}/LeySeguroSocTrabEduc.pdf` },
        { nombre: 'Ley del Seguro Social de los Trabajadores de la Educación del Estado de Veracruz.', url: `${VER_BASE}/LeySeguroSocTrabEduc.pdf` },
        { nombre: 'Ley del Servicio Profesional de Carrera del Congreso del Estado de Veracruz de Ignacio de la Llave', url: `${VER_BASE}/LeyServProfesionaldeCarrera.pdf` },
        { nombre: 'Ley del Servicio Profesional de Carrera del Congreso del Estado de Veracruz de Ignacio de la Llave', url: `${VER_BASE}/LeyServProfesionaldeCarrera.pdf` },
        { nombre: 'Ley del Servicio Público de Carrera de la Administración Pública Centralizada del Estado de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/LSPCAP301216.pdf` },
        { nombre: 'Ley del Servicio Público de Carrera de la Administración Pública Centralizada del Estado de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/LSPCAP301216.pdf` },
        { nombre: 'Ley del Sistema Estatal Anticorrupción de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/LSEANTICORRUPCION20122022.pdf` },
        { nombre: 'Ley del Sistema Estatal Anticorrupción de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/LSEANTICORRUPCION20122022.pdf` },
        { nombre: 'Ley del Sistema Estatal de Cultura Física y Deporte para el Estado de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/LSECFD21082023.pdf` },
        { nombre: 'Ley del Sistema Estatal de Cultura Física y Deporte para el Estado de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/LSECFD21082023.pdf` },
        { nombre: 'Ley del Sistema Estatal de Seguridad Pública para el Estado de Veracruz de Ignacio de la Llave', url: `${VER_BASE}/LEYDELSISTEMAESTATALDESEGURIDADPUBLICA17122025F2.pdf` },
        { nombre: 'Ley del Sistema Estatal de Seguridad Pública para el Estado de Veracruz de Ignacio de la Llave', url: `${VER_BASE}/LEYDELSISTEMAESTATALDESEGURIDADPUBLICA17122025F2.pdf` },
        { nombre: 'Ley en Materia de Desaparición de Personas para el Estado de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/LEYENMATERIADEDESAPARICIONDEPERSONAS14082025.pdf` },
        { nombre: 'Ley en Materia de Desaparición de Personas para el Estado de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/LEYENMATERIADEDESAPARICIONDEPERSONAS14082025.pdf` },
        { nombre: 'Ley para Prevenir , Sancionar y Erradicar los Delitos en Materia de Trata de Personas y Para la Protección y Asistencia a las Víctimas de estos Delitos del Estado de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/TRATAPERSONAS090513.pdf` },
        { nombre: 'Ley para Prevenir , Sancionar y Erradicar los Delitos en Materia de Trata de Personas y Para la Protección y Asistencia a las Víctimas de estos Delitos del Estado de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/TRATAPERSONAS090513.pdf` },
        { nombre: 'Ley para Prevenir y Sancionar la Tortura en el Estado de Veracruz - Llave.', url: `${VER_BASE}/LeyPrevenirYSancionarTortura.pdf` },
        { nombre: 'Ley para Prevenir y Sancionar la Tortura en el Estado de Veracruz - Llave.', url: `${VER_BASE}/LeyPrevenirYSancionarTortura.pdf` },
        { nombre: 'Ley para Prevenir y eliminar la Discriminación en el Estado de Veracruz de Ignacio de la Llave', url: `${VER_BASE}/LPEDE160818.pdf` },
        { nombre: 'Ley para Prevenir y eliminar la Discriminación en el Estado de Veracruz de Ignacio de la Llave', url: `${VER_BASE}/LPEDE160818.pdf` },
        { nombre: 'Ley para el Desarrollo Cultural del Estado de Veracruz de Ignacio de la Llave', url: `${VER_BASE}/DESCUL11-03-10.pdf` },
        { nombre: 'Ley para el Desarrollo Cultural del Estado de Veracruz de Ignacio de la Llave', url: `${VER_BASE}/DESCUL11-03-10.pdf` },
        { nombre: 'Ley para el Desarrollo, Equidad y Empoderamiento de la Mujer Rural Veracruzana', url: `${VER_BASE}/LDEEMRV291118.pdf` },
        { nombre: 'Ley para el Desarrollo, Equidad y Empoderamiento de la Mujer Rural Veracruzana', url: `${VER_BASE}/LDEEMRV291118.pdf` },
        { nombre: 'Ley para el Establecimiento y Desarrollo de Zonas Económicas Especiales del Estado de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/LDZEE230117.pdf` },
        { nombre: 'Ley para el Establecimiento y Desarrollo de Zonas Económicas Especiales del Estado de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/LDZEE230117.pdf` },
        { nombre: 'Ley para el Fomento y Protección de la Lactancia Materna de Veracruz de Ignacio de la Llave', url: `${VER_BASE}/LFPLactanciaMaterna30112021.pdf` },
        { nombre: 'Ley para el Fomento y Protección de la Lactancia Materna de Veracruz de Ignacio de la Llave', url: `${VER_BASE}/LFPLactanciaMaterna30112021.pdf` },
        { nombre: 'Ley para el Fomento, Desarrollo Sustentable, Producción, Distribución y Comercialización del Café Veracruzano', url: `${VER_BASE}/LFDSPDCcafe02122021F.pdf` },
        { nombre: 'Ley para el Fomento, Desarrollo Sustentable, Producción, Distribución y Comercialización del Café Veracruzano', url: `${VER_BASE}/LFDSPDCcafe02122021F.pdf` },
        { nombre: 'Ley para el Fomento, Desarrollo y Protección de la Actividad Piloncillera, considerándola como una actividad Agrícola, Artesanal y Tradicional en el Estado de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/LFDPAPILONCILLERA29112018.pdf` },
        { nombre: 'Ley para el Fomento, Desarrollo y Protección de la Actividad Piloncillera, considerándola como una actividad Agrícola, Artesanal y Tradicional en el Estado de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/LFDPAPILONCILLERA29112018.pdf` },
        { nombre: 'Ley para el fomento de la Lectura y el Libro para el Estado Libre y Soberano de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/LFLIBRO110918.pdf` },
        { nombre: 'Ley para el fomento de la Lectura y el Libro para el Estado Libre y Soberano de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/LFLIBRO110918.pdf` },
        { nombre: 'Ley para el funcionamiento y operación de Albergues, Centros Asistenciales y sus similares del Estado de Veracruz de Ignacio de la Llave', url: `${VER_BASE}/ALBERGUES240912.pdf` },
        { nombre: 'Ley para el funcionamiento y operación de Albergues, Centros Asistenciales y sus similares del Estado de Veracruz de Ignacio de la Llave', url: `${VER_BASE}/ALBERGUES240912.pdf` },
        { nombre: 'Ley para el otorgamiento de beneficios a deudos de integrantes de las instituciones de Seguridad Pública del Estado caídos en cumplimiento del deber', url: `${VER_BASE}/BENEDEUDOST.O..pdf` },
        { nombre: 'Ley para el otorgamiento de beneficios a deudos de integrantes de las instituciones de Seguridad Pública del Estado caídos en cumplimiento del deber', url: `${VER_BASE}/BENEDEUDOST.O..pdf` },
        { nombre: 'Ley para el otorgamiento de pensiones a deudos de integrantes de las Fuerzas Armadas caídos en cumplimiento del Deber', url: `${VER_BASE}/PENFUERZASARMT.O..pdf` },
        { nombre: 'Ley para el otorgamiento de pensiones a deudos de integrantes de las Fuerzas Armadas caídos en cumplimiento del Deber', url: `${VER_BASE}/PENFUERZASARMT.O..pdf` },
        { nombre: 'Ley para enfrentar la epidemia VIH-SIDA en el Estado de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/LVIH181217.pdf` },
        { nombre: 'Ley para enfrentar la epidemia VIH-SIDA en el Estado de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/LVIH181217.pdf` },
        { nombre: 'Ley para la Administración de Bienes Asegurados, Decomisados o Abandonados para el Estado de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/LABADA281114.pdf` },
        { nombre: 'Ley para la Administración de Bienes Asegurados, Decomisados o Abandonados para el Estado de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/LABADA281114.pdf` },
        { nombre: 'Ley para la Atención, Intervención, Protección e Inclusión de las Personas con Trastorno del Espectro Autista para el Estado de Veracruz de Ignacio de la Llave', url: `${VER_BASE}/LAUTISTA200818.pdf` },
        { nombre: 'Ley para la Atención, Intervención, Protección e Inclusión de las Personas con Trastorno del Espectro Autista para el Estado de Veracruz de Ignacio de la Llave', url: `${VER_BASE}/LAUTISTA200818.pdf` },
        { nombre: 'Ley para la Creación y Fomento de la Pequeña Propiedad.', url: `${VER_BASE}/LeyCreacionFomentoPequenaPropiedad.pdf` },
        { nombre: 'Ley para la Creación y Fomento de la Pequeña Propiedad.', url: `${VER_BASE}/LeyCreacionFomentoPequenaPropiedad.pdf` },
        { nombre: 'Ley para la Declaración Especial de Ausencia por Desaparición de Personas para el Estado de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/LDEA30062020.pdf` },
        { nombre: 'Ley para la Declaración Especial de Ausencia por Desaparición de Personas para el Estado de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/LDEA30062020.pdf` },
        { nombre: 'Ley para la Enajenación de Predios de Interés Social.', url: `${VER_BASE}/LeyEnajenacionPrediosInteresSocial.pdf` },
        { nombre: 'Ley para la Enajenación de Predios de Interés Social.', url: `${VER_BASE}/LeyEnajenacionPrediosInteresSocial.pdf` },
        { nombre: 'Ley para la Entrega y Recepción del Poder Ejecutivo y la Administración Pública Municipal', url: `${VER_BASE}/LENTREGAYRECEPCIONDELPODEREJECUTIVOYLAADMINISTRACIONPUBLICAMUNICIPAL24112025.pdf` },
        { nombre: 'Ley para la Entrega y Recepción del Poder Ejecutivo y la Administración Pública Municipal', url: `${VER_BASE}/LENTREGAYRECEPCIONDELPODEREJECUTIVOYLAADMINISTRACIONPUBLICAMUNICIPAL24112025.pdf` },
        { nombre: 'Ley para la Igualdad entre Mujeres y Hombres para el Estado de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/LIMH10092020.pdf` },
        { nombre: 'Ley para la Igualdad entre Mujeres y Hombres para el Estado de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/LIMH10092020.pdf` },
        { nombre: 'Ley para la Prevención y Atención del Cáncer de Mama del Estado de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/CANMAMA190116.pdf` },
        { nombre: 'Ley para la Prevención y Atención del Cáncer de Mama del Estado de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/CANMAMA190116.pdf` },
        { nombre: 'Ley para la Prevención y Control del Dengue par el Estado de Veracruz.', url: `${VER_BASE}/LPCDENGUE04022020.pdf` },
        { nombre: 'Ley para la Prevención y Control del Dengue par el Estado de Veracruz.', url: `${VER_BASE}/LPCDENGUE04022020.pdf` },
        { nombre: 'Ley para la Solución de Conflictos de Límites Territoriales Intermunicipales en el Estado de Veracruz de Ignacio de la Llave', url: `${VER_BASE}/LPSCLT110918.pdf` },
        { nombre: 'Ley para la Solución de Conflictos de Límites Territoriales Intermunicipales en el Estado de Veracruz de Ignacio de la Llave', url: `${VER_BASE}/LPSCLT110918.pdf` },
        { nombre: 'Ley para la Transferencia de Funciones y Servicios Públicos del Estado a los Municipios.', url: `${VER_BASE}/LEYPARALATRASFERENCIAFUNCIONES.pdf` },
        { nombre: 'Ley para la Transferencia de Funciones y Servicios Públicos del Estado a los Municipios.', url: `${VER_BASE}/LEYPARALATRASFERENCIAFUNCIONES.pdf` },
        { nombre: 'Ley para la integración de las personas con discapacidad del Estado de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/LIPDISCAPACIDAD08062023.pdf` },
        { nombre: 'Ley para la integración de las personas con discapacidad del Estado de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/LIPDISCAPACIDAD08062023.pdf` },
        { nombre: 'Ley que Crea la Universidad Femenina de Veracruz - Llave.', url: `${VER_BASE}/LeyCreaUniversidadFemenina.pdf` },
        { nombre: 'Ley que Crea la Universidad Femenina de Veracruz - Llave.', url: `${VER_BASE}/LeyCreaUniversidadFemenina.pdf` },
        { nombre: 'Ley que Crea la Universidad Popular Autónoma de Veracruz.', url: `${VER_BASE}/LCUPAV161219.pdf` },
        { nombre: 'Ley que Crea la Universidad Popular Autónoma de Veracruz.', url: `${VER_BASE}/LCUPAV161219.pdf` },
        { nombre: 'Ley que Crea un Impuesto Especial sobre Transmisión de la Propiedad de Ganado Bovino.', url: `${VER_BASE}/LeyCreaImpuestoEspTransPropiedad.pdf` },
        { nombre: 'Ley que Crea un Impuesto Especial sobre Transmisión de la Propiedad de Ganado Bovino.', url: `${VER_BASE}/LeyCreaImpuestoEspTransPropiedad.pdf` },
        { nombre: 'Ley que Declara Típica la Ciudad de Tlacotalpan y Previene su Conservación.', url: `${VER_BASE}/LeyDeclaraTipicaCDTlacotalpan.pdf` },
        { nombre: 'Ley que Declara Típica la Ciudad de Tlacotalpan y Previene su Conservación.', url: `${VER_BASE}/LeyDeclaraTipicaCDTlacotalpan.pdf` },
        { nombre: 'Ley que Declara de Interés Público y Obligatorio el cercado de Terrenos libres de Construcciones, ubicados en las zonas urbanas de las poblaciones del Estado.', url: `${VER_BASE}/LeyDeclaraInteresPubYObligCercadoTerrenos.pdf` },
        { nombre: 'Ley que Declara de Interés Público y Obligatorio el cercado de Terrenos libres de Construcciones, ubicados en las zonas urbanas de las poblaciones del Estado.', url: `${VER_BASE}/LeyDeclaraInteresPubYObligCercadoTerrenos.pdf` },
        { nombre: 'Ley que Declara de Utilidad Pública el Combate y Extinción de la Epizootia de Fiebre Aftosa existente en el Estado.', url: `${VER_BASE}/LeyDeclaraUtilidadPubComYExtEpizootia.pdf` },
        { nombre: 'Ley que Declara de Utilidad Pública el Combate y Extinción de la Epizootia de Fiebre Aftosa existente en el Estado.', url: `${VER_BASE}/LeyDeclaraUtilidadPubComYExtEpizootia.pdf` },
        { nombre: 'Ley que Establece el Arancel para el cobro de Honorarios de los Abogados Postulantes, Depositarios, Peritos Médicos, Peritos Valuadores, Árbitros, Intérpretes y Traductores.', url: `${VER_BASE}/LeyEstableceArancelCobroHonAbogPost.pdf` },
        { nombre: 'Ley que Establece el Arancel para el cobro de Honorarios de los Abogados Postulantes, Depositarios, Peritos Médicos, Peritos Valuadores, Árbitros, Intérpretes y Traductores.', url: `${VER_BASE}/LeyEstableceArancelCobroHonAbogPost.pdf` },
        { nombre: 'Ley que Establece el Arancel para el cobro de Honorarios por los Notarios Públicos.', url: `${VER_BASE}/LeyEstableceArancelCobroHonNotarios.pdf` },
        { nombre: 'Ley que Establece el Arancel para el cobro de Honorarios por los Notarios Públicos.', url: `${VER_BASE}/LeyEstableceArancelCobroHonNotarios.pdf` },
        { nombre: 'Ley que Establece el Derecho de Vía de una Carretera o Camino Estatal.', url: `${VER_BASE}/LeyEstableceDerechoViaCarreteraCamino.pdf` },
        { nombre: 'Ley que Establece el Derecho de Vía de una Carretera o Camino Estatal.', url: `${VER_BASE}/LeyEstableceDerechoViaCarreteraCamino.pdf` },
        { nombre: 'Ley que Establece el Otorgamiento de un Pago Único a los Integrantes de la Armada de México', url: `${VER_BASE}/LEOPUIAM141118.pdf` },
        { nombre: 'Ley que Establece el Otorgamiento de un Pago Único a los Integrantes de la Armada de México', url: `${VER_BASE}/LEOPUIAM141118.pdf` },
        { nombre: 'Ley que Establece las Bases Normativas a que se Sujetarán los Reglamentos en Materia de Faltas de Policía que Expidan los Ayuntamientos del Estado de Veracruz - Llave.', url: `${VER_BASE}/LEYFALTASPOLICIA05-08-05.pdf` },
        { nombre: 'Ley que Establece las Bases Normativas a que se Sujetarán los Reglamentos en Materia de Faltas de Policía que Expidan los Ayuntamientos del Estado de Veracruz - Llave.', url: `${VER_BASE}/LEYFALTASPOLICIA05-08-05.pdf` },
        { nombre: 'Ley que Establece las Bases Normativas para expedir las condiciones generales de trabajo a las que se sujetarán los trabajadores de confianza de los Poderes Públicos, Organismos Autónomos y Municipios del Estado de Veracruz - Llave.', url: `${VER_BASE}/CONDICIONESTRABAJO.pdf` },
        { nombre: 'Ley que Establece las Bases Normativas para expedir las condiciones generales de trabajo a las que se sujetarán los trabajadores de confianza de los Poderes Públicos, Organismos Autónomos y Municipios del Estado de Veracruz - Llave.', url: `${VER_BASE}/CONDICIONESTRABAJO.pdf` },
        { nombre: 'Ley que Exenta del pago de Diversos Impuestos y Derechos a las construcciones destinadas a Exhibiciones cinematográficas o teatrales o para la Celebración de Juegos Deportivos.', url: `${VER_BASE}/LeyExentaPagoDivImpuestosYDerechos.pdf` },
        { nombre: 'Ley que Exenta del pago de Diversos Impuestos y Derechos a las construcciones destinadas a Exhibiciones cinematográficas o teatrales o para la Celebración de Juegos Deportivos.', url: `${VER_BASE}/LeyExentaPagoDivImpuestosYDerechos.pdf` },
        { nombre: 'Ley que Impone Obligación a los Propietarios de Bienes Inmuebles del Estado de Legalizar sus Derechos de Propiedad.', url: `${VER_BASE}/LIPBIELDP22091938.pdf` },
        { nombre: 'Ley que Impone Obligación a los Propietarios de Bienes Inmuebles del Estado de Legalizar sus Derechos de Propiedad.', url: `${VER_BASE}/LIPBIELDP22091938.pdf` },
        { nombre: 'Ley que Prohíbe Celebren Bailes Escolares o Públicos o Cualquier otro acto de Especulación.', url: `${VER_BASE}/LeyProhibeCelebrenBailesEscolaresPub.pdf` },
        { nombre: 'Ley que Prohíbe Celebren Bailes Escolares o Públicos o Cualquier otro acto de Especulación.', url: `${VER_BASE}/LeyProhibeCelebrenBailesEscolaresPub.pdf` },
        { nombre: 'Ley que Regula el Procedimiento para fijar las Cuotas, Tarifas y Tablas de Valores Unitarios de las Contribuciones sobre la Propiedad Inmobiliaria.', url: `${VER_BASE}/LeyRegulaProcedFijarCuotasTarifasTablas.pdf` },
        { nombre: 'Ley que Regula el Procedimiento para fijar las Cuotas, Tarifas y Tablas de Valores Unitarios de las Contribuciones sobre la Propiedad Inmobiliaria.', url: `${VER_BASE}/LeyRegulaProcedFijarCuotasTarifasTablas.pdf` },
        { nombre: 'Ley que Regula el Régimen de propiedad en Condominio en el Estado de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/CONDOMINIOS.pdf` },
        { nombre: 'Ley que Regula el Régimen de propiedad en Condominio en el Estado de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/CONDOMINIOS.pdf` },
        { nombre: 'Ley que Regula el Servicio de Limpia Pública en los Municipios del Estado de Veracruz de Ignacio de la Llave que no cuenten con Reglamento en esa área.', url: `${VER_BASE}/LLIMPIAPUBLICA2016.pdf` },
        { nombre: 'Ley que Regula el Servicio de Limpia Pública en los Municipios del Estado de Veracruz de Ignacio de la Llave que no cuenten con Reglamento en esa área.', url: `${VER_BASE}/LLIMPIAPUBLICA2016.pdf` },
        { nombre: 'Ley que Regula la Integración y el Funcionamiento del Consejo Veracruzano de Armonización Contable.', url: `${VER_BASE}/LARMOCONTA280518.pdf` },
        { nombre: 'Ley que Regula la Integración y el Funcionamiento del Consejo Veracruzano de Armonización Contable.', url: `${VER_BASE}/LARMOCONTA280518.pdf` },
        { nombre: 'Ley que Regula la Prestación de Servicios para la Atención, Cuidado y Desarrollo Integral Infantil en el Estado de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/LSERVICIOSCUIDADOINFANTIL03112020.pdf` },
        { nombre: 'Ley que Regula la Prestación de Servicios para la Atención, Cuidado y Desarrollo Integral Infantil en el Estado de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/LSERVICIOSCUIDADOINFANTIL03112020.pdf` },
        { nombre: 'Ley que Regula las Construcciones Públicas y Privadas del Estado de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/LRCONSTRUCCIONESPP16082021.pdf` },
        { nombre: 'Ley que Regula las Construcciones Públicas y Privadas del Estado de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/LRCONSTRUCCIONESPP16082021.pdf` },
        { nombre: 'Ley que reconoce el derecho de las personas físicas, mayores de setenta años de edad, que no tengan ingreso alguno y sin la protección de los sistemas de seguridad social del estado o de la federación, a recibir una pensión alimenticia del gobierno del Estado de Veracruz de Ignacio de la Llave', url: `${VER_BASE}/PENSION7090514.pdf` },
        { nombre: 'Ley que reconoce el derecho de las personas físicas, mayores de setenta años de edad, que no tengan ingreso alguno y sin la protección de los sistemas de seguridad social del estado o de la federación, a recibir una pensión alimenticia del gobierno del Estado de Veracruz de Ignacio de la Llave', url: `${VER_BASE}/PENSION7090514.pdf` },
        { nombre: 'Ley sobre Protección y Conservación de Lugares Típicos y de Belleza Natural.', url: `${VER_BASE}/LeyProtecConservLugaresTipyBelleza.pdf` },
        { nombre: 'Ley sobre Protección y Conservación de Lugares Típicos y de Belleza Natural.', url: `${VER_BASE}/LeyProtecConservLugaresTipyBelleza.pdf` },
        { nombre: 'Ley sobre el Sistema Estatal de Asistencia Social.', url: `${VER_BASE}/LSSEAS230818.pdf` },
        { nombre: 'Ley sobre el Sistema Estatal de Asistencia Social.', url: `${VER_BASE}/LSSEAS230818.pdf` },
        { nombre: 'Número 85.', url: `${VER_BASE}/GACETA85S.pdf` },
    ],
    codigos: [
        { nombre: 'Código Civil para el Estado de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/CCIVIL08102025SCJN.pdf` },
        { nombre: 'Código de Procedimientos Penales para el Estado Libre y Soberano de Veracruz de Ignacio de la Llave vigente parcialmente a partir del 11 de mayo de 2013', url: `${VER_BASE}/CPPENALES574180714.pdf` },
        { nombre: 'Código de Derechos para el Estado de Veracruz de Ignacio de la Llave', url: `${VER_BASE}/CDERECHOS09052025.pdf` },
        { nombre: 'Código de Procedimientos Administrativos para el Estado de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/CPADMINISTRATIVOS04022025.pdf` },
        { nombre: 'Código de Procedimientos Civiles para el Estado de Veracruz.', url: `${VER_BASE}/CPROCEDIMIENTOSCIVILES03072020F.pdf` },
        { nombre: 'Código de Procedimientos Penales para el Estado de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/CODIGODEPROCEDIMIENTOSPENALES(590)180714F.pdf` },
        { nombre: 'Código Electoral para el Estado de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/CELECTORAL20012025F.pdf` },
        { nombre: 'Código Financiero para el Estado de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/CODIGOFINANCIERO12012026.pdf` },
        { nombre: 'Código Hacendario Municipal para el Estado de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/CHMEDOVER10032021.pdf` },
        { nombre: 'Código Penal para el Estado Libre y Soberano de Veracruz de Ignacio de la Llave.', url: `${VER_BASE}/CODIGOPENAL06032026F.pdf` },
    ],
    reglamentos: [],
    otros: [],
};

// ─── Nuevo León: FULL DATA — PDFs hosted on Supabase ────────────────
const NL_BASE = 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/NuevoLeon';
const NL_LEYES: CategoriaLeyes = {
    constitucion: [
        { nombre: 'CONSTITUCIÓN POLÍTICA DEL ESTADO LIBRE Y SOBERANO DE NUEVO LEÓN', url: `${NL_BASE}/CONSTITUCION POLITICA DEL ESTADO LIBRE Y SOBERANO DE NUEVO LEON.pdf` },
    ],
    leyes: [
        { nombre: 'ARANCEL DE ABOGADOS', url: `${NL_BASE}/ARANCEL DE ABOGADOS.pdf` },
        { nombre: 'DECRETO 187 DE FOMENTO A LA DESCONCENTRACIÓN INDUSTRIAL EN LOTES DE PARQUES INDUSTRIALES', url: `${NL_BASE}/DECRETO 187 FOMENTO A LA DESCONCENTRACION INDUSTRIAL EN LOTES DE PARQUES INDUSTRIALES.pdf` },
        { nombre: 'DECRETO DE FOMENTO A LA VIVIENDA PARA EL AÑO 2010', url: `${NL_BASE}/2424.pdf` },
        { nombre: 'DECRETO DE FOMENTO A LA VIVIENDA PARA EL AÑO 2011', url: `${NL_BASE}/DECRETO DE FOMENTO A LA VIVIENDA 2011.pdf` },
        { nombre: 'DECRETO DE FOMENTO A LA VIVIENDA PARA EL AÑO 2012', url: `${NL_BASE}/DECRETO DE FOMENTO A LA VIVIENDA 2012.pdf` },
        { nombre: 'DECRETO DE FOMENTO A LA VIVIENDA PARA EL AÑO 2013', url: `${NL_BASE}/DECRETO DE FOMENTO A LA VIVIENDA 2013.pdf` },
        { nombre: 'DECRETO DE FOMENTO AL EMPLEO PARA EL AÑO 2010', url: `${NL_BASE}/502.pdf` },
        { nombre: 'DECRETO DE FOMENTO AL EMPLEO PARA EL AÑO 2011', url: `${NL_BASE}/DECRETO DE FOMENTO AL EMPLEO 2011.pdf` },
        { nombre: 'DECRETO DE FOMENTO AL EMPLEO PARA EL AÑO 2012', url: `${NL_BASE}/DECRETO DE FOMENTO AL EMPLEO 2012.pdf` },
        { nombre: 'DECRETO DE FOMENTO AL EMPLEO PARA EL AÑO 2013', url: `${NL_BASE}/DECRETO DE FOMENTO AL EMPLEO PARA EL 2013.pdf` },
        { nombre: 'LEY AMBIENTAL DEL ESTADO DE NUEVO LEÓN', url: `${NL_BASE}/LEY AMBIENTAL DEL ESTADO DE NUEVO LEON.pdf` },
        { nombre: 'LEY DE ACCESO DE LAS MUJERES A UNA VIDA LIBRE DE VIOLENCIA', url: `${NL_BASE}/LEY DE ACCESO DE LAS MUJERES A UNA VIDA LIBRE DE VIOLENCIA.pdf` },
        { nombre: 'LEY DE ADMINISTRACION FINANCIERA PARA EL ESTADO DE NUEVO LEON', url: `${NL_BASE}/LEY DE ADMINISTRACION FINANCIERA PARA EL ESTADO DE NUEVO LEON.pdf` },
        { nombre: 'LEY DE ADQUISICIONES, ARRENDAMIENTOS Y CONTRATACIÓN DE SERVICIOS DEL ESTADO DE NUEVO LEÓN', url: `${NL_BASE}/LEY DE ADQUISICIONES ARRENDAMIENTOS Y CONTRATACION DE SERVICIOS DEL ESTADO DE NUEVO LEON.pdf` },
        { nombre: 'LEY DE AGUA POTABLE Y SANEAMIENTO PARA EL ESTADO DE NUEVO LEON', url: `${NL_BASE}/LEY DE AGUA POTABLE Y SANEAMIENTO PARA EL ESTADO DE NUEVO LEON.pdf` },
        { nombre: 'LEY DE AMNISTÍA PARA EL ESTADO DE NUEVO LEÓN', url: `${NL_BASE}/LEY DE AMNISTIA PARA EL ESTADO DE NUEVO LEON.pdf` },
        { nombre: 'LEY DE APARCERÍA AGRÍCOLA DEL ESTADO DE NUEVO LEON', url: `${NL_BASE}/LEY DE APARCERIA AGRICOLA DEL ESTADO DE NUEVO LEON.pdf` },
        { nombre: 'LEY DE ARCHIVOS PARA EL ESTADO DE NUEVO LEÓN', url: `${NL_BASE}/LEY DE ARCHIVOS PARA EL ESTADO DE NUEVO LEON.pdf` },
        { nombre: 'LEY DE ASENTAMIENTOS HUMANOS, ORDENAMIENTO TERRITORIAL Y DESARROLLO URBANO PARA EL ESTADO DE NUEVO LEÓN', url: `${NL_BASE}/LEY DE ASENTAMIENTOS HUMANOS ORDENAMIENTO TERRITORIAL Y DESARROLLO URBANO PARA EL ESTADO DE NUEVO LEON.pdf` },
        { nombre: 'LEY DE ASOCIACIONES PÚBLICO PRIVADAS PARA EL ESTADO DE NUEVO LEÓN', url: `${NL_BASE}/LEY DE ASOCIACIONES PUBLICO PRIVADAS PARA EL ESTADO DE NUEVO LEON.pdf` },
        { nombre: 'LEY DE CAMBIO CLIMÁTICO DEL ESTADO DE NUEVO LEÓN', url: `${NL_BASE}/LEY DE CAMBIO CLIMATICO DEL ESTADO DE NUEVO LEON.pdf` },
        { nombre: 'LEY DE CIENCIA, TECNOLOGÍA E INNOVACIÓN DEL ESTADO DE NUEVO LEÓN', url: `${NL_BASE}/LEY DE CIENCIA TECNOLOGIA E INNOVACION DEL ESTADO DE NUEVO LEON.pdf` },
        { nombre: 'LEY DE COORDINACIÓN HACENDARIA DEL ESTADO DE NUEVO LEÓN', url: `${NL_BASE}/LEY DE COORDINACION HACENDARIA DEL ESTADO DE NUEVO LEON.pdf` },
        { nombre: 'LEY DE COPROPIEDADES RURALES', url: `${NL_BASE}/35.pdf` },
        { nombre: 'LEY DE DEFENSORÍA PÚBLICA PARA EL ESTADO DE NUEVO LEÓN', url: `${NL_BASE}/LEY DE DEFENSORIA PUBLICA PARA EL ESTADO DE NUEVO LEON.pdf` },
        { nombre: 'LEY DE DESARROLLO FORESTAL SUSTENTABLE DEL ESTADO DE NUEVO LEÓN', url: `${NL_BASE}/LEY DE DESARROLLO FORESTAL SUSTENTABLE DEL ESTADO DE NUEVO LEON.pdf` },
        { nombre: 'LEY DE DESARROLLO RURAL INTEGRAL SUSTENTABLE DEL ESTADO DE NUEVO LEÓN', url: `${NL_BASE}/LEY DE DESARROLLO RURAL INTEGRAL SUSTENTABLE DEL ESTADO DE NUEVO LEON.pdf` },
        { nombre: 'LEY DE DESARROLLO SOCIAL PARA EL ESTADO DE NUEVO LEÓN', url: `${NL_BASE}/LEY DE DESARROLLO SOCIAL PARA EL ESTADO DE NUEVO LEON.pdf` },
        { nombre: 'LEY DE EDUCACIÓN DEL ESTADO', url: `${NL_BASE}/LEY DE EDUCACION DEL ESTADO.pdf` },
        { nombre: 'LEY DE EGRESOS DEL ESTADO DE NUEVO LEÓN PARA EL AÑO 2009', url: `${NL_BASE}/985.pdf` },
        { nombre: 'LEY DE EGRESOS DEL ESTADO DE NUEVO LEÓN PARA EL AÑO 2011', url: `${NL_BASE}/LEY DE EGRESOS DEL ESTADO PARA EL 2011.pdf` },
        { nombre: 'LEY DE EGRESOS DEL ESTADO DE NUEVO LEÓN PARA EL AÑO 2012', url: `${NL_BASE}/LEY DE EGRESOS DEL ESTADO PARA EL 2012.pdf` },
        { nombre: 'LEY DE EGRESOS DEL ESTADO DE NUEVO LEÓN PARA EL AÑO 2014', url: `${NL_BASE}/LEY DE EGRESOS DEL ESTADO DE NUEVO LEON PARA EL ANO 2014.pdf` },
        { nombre: 'LEY DE EGRESOS DEL ESTADO DE NUEVO LEÓN PARA EL EJERCICIO FISCAL 2018', url: `${NL_BASE}/LEY DE EGRESOS DEL ESTADO DE NUEVO LEON PARA EL EJERCICIO FISCAL 2018.pdf` },
        { nombre: 'LEY DE EGRESOS DEL ESTADO DE NUEVO LEÓN PARA EL EJERCICIO FISCAL 2019', url: `${NL_BASE}/LEY DE EGRESOS DEL ESTADO EJERCICIO FISCAL 2019.pdf` },
        { nombre: 'LEY DE EGRESOS DEL ESTADO DE NUEVO LEÓN PARA EL EJERCICIO FISCAL 2020', url: `${NL_BASE}/LEY DE EGRESOS DEL ESTADO EJERCICIO FISCAL 2020.pdf` },
        { nombre: 'LEY DE EGRESOS DEL ESTADO DE NUEVO LEÓN PARA EL EJERCICIO FISCAL 2021', url: `${NL_BASE}/LEY DE EGRESOS DEL ESTADO DE NUEVO LEON PARA EL EJERCICIO FISCAL 2021.pdf` },
        { nombre: 'LEY DE EGRESOS DEL ESTADO DE NUEVO LEÓN PARA EL EJERCICIO FISCAL 2022', url: `${NL_BASE}/LEY DE EGRESOS DEL ESTADO DE NUEVO LEON PARA EL EJERCICIO FISCAL 2022 REFORMA.pdf` },
        { nombre: 'LEY DE EGRESOS DEL ESTADO DE NUEVO LEÓN PARA EL EJERCICIO FISCAL 2023', url: `${NL_BASE}/LEY DE EGRESOS DEL ESTADO DE NUEVO LEON PARA EL EJERCICIO FISCAL 2023.pdf` },
        { nombre: 'LEY DE EGRESOS DEL ESTADO DE NUEVO LEÓN PARA EL EJERCICIO FISCAL 2025', url: `${NL_BASE}/LEY DE EGRESOS DEL ESTADO DE NUEVO LEON PARA EL EJERCICIO FISCAL-2025.pdf` },
        { nombre: 'LEY DE EGRESOS DEL ESTADO PARA EL AÑO 2010', url: `${NL_BASE}/2882.pdf` },
        { nombre: 'LEY DE EGRESOS DEL ESTADO PARA EL AÑO 2013', url: `${NL_BASE}/LEY DE EGRESOS DEL ESTADO DE NUEVO LEON PARA EL ANO 2013.pdf` },
        { nombre: 'LEY DE EGRESOS DEL ESTADO PARA EL AÑO 2015.', url: `${NL_BASE}/LEY DE EGRESOS PARA EL ESTADO DE NUEVO LEON PARA EL 2015.pdf` },
        { nombre: 'LEY DE EGRESOS DEL ESTADO PARA EL AÑO 2016', url: `${NL_BASE}/LEY DE EGRESOS DEL ESTADO PARA EL ANO 2016.pdf` },
        { nombre: 'LEY DE EGRESOS DEL ESTADO PARA EL AÑO 2017', url: `${NL_BASE}/LEY DE EGRESOS PARA EL ESTADO DE N.L. EJERCICIO FISCAL 2017.pdf` },
        { nombre: 'LEY DE ENTREGA RECEPCIÓN PARA EL ESTADO DE NUEVO LEÓN', url: `${NL_BASE}/LEY DE ENTREGA RECEPCION PARA EL ESTADO DE NUEVO LEON.pdf` },
        { nombre: 'LEY DE EXPROPIACION POR CAUSA DE UTILIDAD PÚBLICA', url: `${NL_BASE}/39.pdf` },
        { nombre: 'LEY DE FISCALIZACIÓN SUPERIOR DEL ESTADO DE NUEVO LEÓN', url: `${NL_BASE}/LEY DE FISCALIZACION SUPERIOR DEL ESTADO DE NUEVO LEON.pdf` },
        { nombre: 'LEY DE FOMENTO A LA INVERSIÓN Y AL EMPLEO PARA EL ESTADO DE NUEVO LEÓN', url: `${NL_BASE}/LEY DE FOMENTO A LA INVERSION Y AL EMPLEO PARA EL ESTADO DE NUEVO LEON.pdf` },
        { nombre: 'LEY DE FOMENTO A LA MICRO, PEQUEÑA Y MEDIANA EMPRESA PARA EL ESTADO DE NUEVO LEÓN', url: `${NL_BASE}/LEY DE FOMENTO A LA MICRO PEQUENA Y MEDIANA EMPRESA PARA EL ESTADO DE NUEVO LEON.pdf` },
        { nombre: 'LEY DE FOMENTO A LAS ACTIVIDADES AGROPECUARIAS DEL ESTADO DE NUEVO LEÓN', url: `${NL_BASE}/LEY DE FOMENTO A LAS ACTIVIDADES AGROPECUARIAS DEL ESTADO DE NUEVO LEON.pdf` },
        { nombre: 'LEY DE FOMENTO AL TURISMO DEL ESTADO DE NUEVO LEÓN', url: `${NL_BASE}/LEY DE FOMENTO AL TURISMO DEL ESTADO DE NUEVO LEON.pdf` },
        { nombre: 'LEY DE FOMENTO DE LA SOCIEDAD CIVIL ORGANIZADA PARA EL ESTADO DE NUEVO LEÓN', url: `${NL_BASE}/LEY DE FOMENTO DE LA SOCIEDAD CIVIL ORGANIZADA PARA EL ESTADO DE NUEVO LEON.pdf` },
        { nombre: 'LEY DE FOMENTO PARA LA CONSTRUCCIÓN DE EDIFICIOS DE ESTACIONAMIENTO DE VEHÍCULOS', url: `${NL_BASE}/LEY DE FOMENTO PARA CONSTRUCCION DE EDIFICIOS DE ESTACIONAMIENTO.pdf` },
        { nombre: 'LEY DE GOBIERNO MUNICIPAL DEL ESTADO DE NUEVO LEÓN', url: `${NL_BASE}/LEY DE GOBIERNO MUNICIPAL DEL ESTADO DE NUEVO LEON.pdf` },
        { nombre: 'LEY DE HACIENDA DEL ESTADO DE NUEVO LEÓN', url: `${NL_BASE}/LEY DE HACIENDA DEL ESTADO DE NUEVO LEON.pdf` },
        { nombre: 'LEY DE HACIENDA PARA LOS MUNICIPIOS DEL ESTADO DE NUEVO LEÓN', url: `${NL_BASE}/LEY DE HACIENDA PARA LOS MUNICIPIOS DEL ESTADO DE NUEVO LEON.pdf` },
        { nombre: 'LEY DE INDULTO PARA EL ESTADO DE NUEVO LEÓN', url: `${NL_BASE}/LEY DE INDULTO PARA EL ESTADO DE NUEVO LEON.pdf` },
        { nombre: 'LEY DE INFRAESTRUCTURA FÍSICA EDUCATIVA Y DEPORTIVA DE NUEVO LEÓN', url: `${NL_BASE}/LEY DE INFRAESTRUCTURA FISICA EDUCATIVA Y DEPORTIVA DE NUEVO LEON.pdf` },
        { nombre: 'LEY DE INGRESOS DE LOS MUNICIPIOS DE NUEVO LEÓN PARA EL AÑO 2010', url: `${NL_BASE}/987.pdf` },
        { nombre: 'LEY DE INGRESOS DE LOS MUNICIPIOS DE NUEVO LEÓN PARA EL AÑO 2011', url: `${NL_BASE}/LEY DE INGRESOS DE LOS MUNICIPIOS PARA EL ANO 2011.pdf` },
        { nombre: 'LEY DE INGRESOS DE LOS MUNICIPIOS DE NUEVO LEÓN PARA EL AÑO 2012', url: `${NL_BASE}/LEY DE INGRESOS DE LOS MUNICIPIOS PARA EL 2012.pdf` },
        { nombre: 'LEY DE INGRESOS DE LOS MUNICIPIOS DE NUEVO LEÓN PARA EL AÑO 2013', url: `${NL_BASE}/LEY DE INGRESOS DE LOS MUNICIPIOS DE NUEVO LEON PARA EL ANO 2013.pdf` },
        { nombre: 'LEY DE INGRESOS DE LOS MUNICIPIOS DE NUEVO LEÓN PARA EL AÑO 2014', url: `${NL_BASE}/LEY DE INGRESOS DE LOS MUNICIPIOS 2014.pdf` },
        { nombre: 'LEY DE INGRESOS DE LOS MUNICIPIOS DE NUEVO LEÓN PARA EL AÑO 2015', url: `${NL_BASE}/LEY DE INGRESOS DE LOS MUNCIIPIOS DEL NUEVO LEON PARA EL 2015.pdf` },
        { nombre: 'LEY DE INGRESOS DE LOS MUNICIPIOS DE NUEVO LEÓN PARA EL AÑO 2016', url: `${NL_BASE}/LEY DE INGRESOS DE LOS MUNICIPIOS PARA EL ANO 2016.pdf` },
        { nombre: 'LEY DE INGRESOS DE LOS MUNICIPIOS DEL ESTADO DE NUEVO LEÓN PARA EL AÑO 2017', url: `${NL_BASE}/LEY DE INGRESOS DE LOS MUNICIPIOS PARA EL 2017.pdf` },
        { nombre: 'LEY DE INGRESOS DE LOS MUNICIPIOS DEL ESTADO DE NUEVO LEÓN PARA EL AÑO 2018', url: `${NL_BASE}/LEY DE INGRESOS DE LOS MUNICIPIOS PARA EL 2018.pdf` },
        { nombre: 'LEY DE INGRESOS DE LOS MUNICIPIOS DEL ESTADO DE NUEVO LEÓN PARA EL AÑO 2019', url: `${NL_BASE}/LEY DE INGRESOS DE LOS MUNICIPIOS 2019.pdf` },
        { nombre: 'LEY DE INGRESOS DE LOS MUNICIPIOS DEL ESTADO DE NUEVO LEÓN PARA EL AÑO 2020', url: `${NL_BASE}/LEY DE INGRESOS DE LOS MUNICIPIOS DEL ESTADO 2020.pdf` },
        { nombre: 'LEY DE INGRESOS DE LOS MUNICIPIOS DEL ESTADO DE NUEVO LEÓN PARA EL AÑO 2021', url: `${NL_BASE}/LEY DE INGRESOS DE LOS MUNICIPIOS DEL ESTADO DE NUEVO LEON PARA EL 2021.pdf` },
        { nombre: 'LEY DE INGRESOS DE LOS MUNICIPIOS DEL ESTADO DE NUEVO LEÓN PARA EL AÑO 2022', url: `${NL_BASE}/LEY DE INGRESOS DE LOS MUNICIPIOS DEL ESTADO DE NUEVO LEON 2022.pdf` },
        { nombre: 'LEY DE INGRESOS DE LOS MUNICIPIOS DEL ESTADO DE NUEVO LEÓN PARA EL EJERCICIO FISCAL 2023', url: `${NL_BASE}/LEY DE INGRESOS DE LOS MUNICIPIOS DEL ESTADO DE NUEVO LEON 2023 13 MAR 2023.pdf` },
        { nombre: 'LEY DE INGRESOS DE LOS MUNICIPIOS DEL ESTADO DE NUEVO LEÓN PARA EL EJERCICIO FISCAL 2025', url: `${NL_BASE}/LEY DE INGRESOS DE LOS MUNICIPIOS DEL ESTADO DE NUEVO LEON PARA EL EJERCICIO FISCAL 2025.pdf` },
        { nombre: 'LEY DE INGRESOS DEL ESTADO DE NUEVO LEÓN PARA EL AÑO 2010', url: `${NL_BASE}/984.pdf` },
        { nombre: 'LEY DE INGRESOS DEL ESTADO DE NUEVO LEÓN PARA EL AÑO 2011', url: `${NL_BASE}/LEY DE INGRESOS DEL ESTADO DE NUEVO LEON PARA EL 2011.pdf` },
        { nombre: 'LEY DE INGRESOS DEL ESTADO DE NUEVO LEÓN PARA EL AÑO 2012', url: `${NL_BASE}/LEY DE INGRESOS DEL ESTADO PARA EL 2012.pdf` },
        { nombre: 'LEY DE INGRESOS DEL ESTADO DE NUEVO LEÓN PARA EL AÑO 2013', url: `${NL_BASE}/LEY DE INGRESOS DEL ESTADO DE NUEVO LEON PARA EL ANO 2013.pdf` },
        { nombre: 'LEY DE INGRESOS DEL ESTADO DE NUEVO LEÓN PARA EL AÑO 2015', url: `${NL_BASE}/LEY DE INGRESOS DEL ESTADO DE NUEVO LEON PARA EL 2015.pdf` },
        { nombre: 'LEY DE INGRESOS DEL ESTADO DE NUEVO LEÓN PARA EL AÑO 2016', url: `${NL_BASE}/LEY DE INGRESOS DEL ESTADO DE NUEVO LEON PARA EL ANO 2016.pdf` },
        { nombre: 'LEY DE INGRESOS DEL ESTADO DE NUEVO LEÓN PARA EL EJERCICIO FISCAL 2018', url: `${NL_BASE}/LEY DE INGRESOS DEL ESTADO PARA EL 2018.pdf` },
        { nombre: 'LEY DE INGRESOS DEL ESTADO DE NUEVO LEÓN PARA EL EJERCICIO FISCAL 2019', url: `${NL_BASE}/LEY DE INGRESOS DEL ESTADO PARA EL 2019.pdf` },
        { nombre: 'LEY DE INGRESOS DEL ESTADO DE NUEVO LEÓN PARA EL EJERCICIO FISCAL 2020', url: `${NL_BASE}/LEY DE INGRESOS DEL ESTADO 2020.pdf` },
        { nombre: 'LEY DE INGRESOS DEL ESTADO DE NUEVO LEÓN PARA EL EJERCICIO FISCAL 2021', url: `${NL_BASE}/LEY DE INGRESOS DEL ESTADO DE NUEVO LEON PARA EL EJERCICIO FISCAL 2021.pdf` },
        { nombre: 'LEY DE INGRESOS DEL ESTADO DE NUEVO LEÓN PARA EL EJERCICIO FISCAL 2022', url: `${NL_BASE}/LEY DE INGRESOS DEL ESTADO DE NUEVO LEON PARA EL EJERCICIO FISCAL 2022.pdf` },
        { nombre: 'LEY DE INGRESOS DEL ESTADO DE NUEVO LEÓN PARA EL EJERCICIO FISCAL 2023', url: `${NL_BASE}/LEY DE INGRESOS DEL ESTADO DE NUEVO LEON PARA EL EJERCICIO FISCAL 2023.pdf` },
        { nombre: 'LEY DE INGRESOS DEL ESTADO DE NUEVO LEÓN PARA EL EJERCICIO FISCAL 2025', url: `${NL_BASE}/LEY DE INGRESOS DEL ESTADO DE NUEVO LEON PARA EL EJERCICIO FISCAL 2025.pdf` },
        { nombre: 'LEY DE INGRESOS DEL ESTADO DE NUEVO LEÓN, PARA EL AÑO 2017', url: `${NL_BASE}/LEY DE INGRESOS DEL ESTADO PARA EL 2017.pdf` },
        { nombre: 'LEY DE INGRESOS PARA EL ESTADO DE NUEVO LEÓN PARA EL EJERCICIO 2014', url: `${NL_BASE}/LEY DE INGRESOS PARA EL ESTADO DE NUEVO LEON 2014.pdf` },
        { nombre: 'LEY DE INSTITUCIONES ASISTENCIALES PÚBLICAS Y PRIVADAS PARA LAS PERSONAS ADULTAS MAYORES EN EL ESTADO DE NUEVO LEÓN', url: `${NL_BASE}/LEY DE INSTITUCIONES ASISTENACIALES PUBLICAS Y PRIVADAS PARA LAS PERSONAS ADULTAS MAYORES EN EL ESTADO DE NUEVO LEON.pdf` },
        { nombre: 'LEY DE INSTITUCIONES ASISTENCIALES QUE TIENEN BAJO SU GUARDA, CUSTODIA O AMBAS A NIÑAS, NIÑOS Y ADOLESCENTES EN EL ESTADO DE NUEVO LEÓN', url: `${NL_BASE}/LEY DE INSTITUCIONES ASISTENCIALES QUE TIENEN BAJO SU GUARDA CUSTODIA O AMBAS A NINAS NINOS Y ADOLESCENTES EN EL ESTADO DE NUEVO LEON.pdf` },
        { nombre: 'LEY DE JUICIO POLÍTICO DEL ESTADO DE NUEVO LEÓN', url: `${NL_BASE}/LEY DE JUICIO POLITICO DEL ESTADO DE NUEVO LEON.pdf` },
        { nombre: 'LEY DE JUSTICIA ADMINISTRATIVA PARA EL ESTADO Y MUNICIPIOS DE NUEVO LEON', url: `${NL_BASE}/LEY DE JUSTICIA ADMINISTRATIVA PARA EL ESTADO Y MUNICIPIOS.pdf` },
        { nombre: 'LEY DE JUSTICIA CÍVICA PARA EL ESTADO DE NUEVO LEÓN', url: `${NL_BASE}/LEY DE JUSTICIA CIVICA PARA EL ESTADO DE NUEVO LEON.pdf` },
        { nombre: 'LEY DE LA BENEFICENCIA PRIVADA PARA EL ESTADO DE NUEVO LEÓN', url: `${NL_BASE}/LEY DE LA BENEFICENCIA PRIVADA PARA EL ESTADO DE NUEVO LEON.pdf` },
        { nombre: 'LEY DE LA COMISIÓN ESTATAL DE DERECHOS HUMANOS DEL ESTADO DE NUEVO LEÓN', url: `${NL_BASE}/LEY DE LA COMISION ESTATAL DE DERECHOS HUMANOS DEL ESTADO DE NUEVO LEON.pdf` },
        { nombre: 'LEY DE LA CORPORACIÓN PARA EL DESARROLLO AGROPECUARIO DE NUEVO LEÓN', url: `${NL_BASE}/LEY DE LA CORPORACION PARA EL DESARROLLO AGROPECUARIO.pdf` },
        { nombre: 'LEY DE LA CORPORACIÓN PARA EL DESARROLLO TURÍSTICO DE NUEVO LEÓN', url: `${NL_BASE}/LEY DE LA CORPORACION PARA EL DESARROLLO TURISTICO DE NUEVO LEON.pdf` },
        { nombre: 'LEY DE LA INSTITUCIÓN POLICIAL ESTATAL FUERZA CIVIL', url: `${NL_BASE}/LEY DE LA INSTITUCION POLICIAL ESTATAL FUERZA CIVIL.pdf` },
        { nombre: 'LEY DE LA JUVENTUD PARA EL ESTADO DE NUEVO LEÓN', url: `${NL_BASE}/LEY DE LA JUVENTUD PARA EL ESTADO DE NUEVO LEON.pdf` },
        { nombre: 'LEY DE LOS DERECHOS DE LAS PERSONAS ADULTAS MAYORES EN EL ESTADO DE NUEVO LEÓN', url: `${NL_BASE}/LEY DE LOS DERECHOS DE LAS PERSONAS ADULTAS MAYORES.pdf` },
        { nombre: 'LEY DE LOS DERECHOS DE LAS PERSONAS INDÍGENAS Y AFROMEXICANAS EN EL ESTADO DE NUEVO LEÓN', url: `${NL_BASE}/LEY DE LOS DERECHOS DE LAS PERSONAS INDIGENAS Y AFROMEXICANAS EN EL ESTADO DE NUEVO LEON.pdf` },
        { nombre: 'LEY DE LOS DERECHOS DE NIÑAS, NIÑOS Y ADOLESCENTES PARA EL ESTADO DE NUEVO LEÓN', url: `${NL_BASE}/LEY DE LOS DERECHOS DE NINAS NINOS Y ADOLESCENTES PARA EL ESTADO DE NUEVO LEON.pdf` },
        { nombre: 'LEY DE MECANISMOS ALTERNATIVOS PARA LA SOLUCIÓN DE CONTROVERSIAS PARA EL ESTADO DE NUEVO LEÓN', url: `${NL_BASE}/LEY DE MECANISMOS ALTERNATIVOS PARA LA SOLUCION DE CONTROVERSIAS PARA EL ESTADO DE NUEVO LEON.pdf` },
        { nombre: 'LEY DE MOVILIDAD SOSTENIBLE, DE ACCESIBILIDAD Y SEGURIDAD VIAL PARA EL ESTADO DE NUEVO LEÓN', url: `${NL_BASE}/LEY DE MOVILIDAD SOSTENIBLE DE ACCESIBILIDAD Y SEGURIDAD VIAL PARA EL ESTADO DE NUEVO LEON.pdf` },
        { nombre: 'LEY DE NOMENCLATURA DEL ESTADO Y MUNICIPIOS DE NUEVO LEÓN', url: `${NL_BASE}/LEY DE NOMENCLATURA DEL ESTADO Y MUNICIPIOS DE NUEVO LEON.pdf` },
        { nombre: 'LEY DE OBRAS PÚBLICAS PARA EL ESTADO Y MUNICIPIOS DE NUEVO LEÓN', url: `${NL_BASE}/LEY DE OBRAS PUBLICAS PARA EL ESTADO.pdf` },
        { nombre: 'LEY DE PARTICIPACIÓN CIUDADANA PARA EL ESTADO DE NUEVO LEÓN', url: `${NL_BASE}/LEY DE PARTICIPACION CIUDADANA PARA EL ESTADO DE NUEVO LEON.pdf` },
        { nombre: 'LEY DE PENSIONES, SEGURO DE VIDA Y OTROS BENEFICIOS A LOS VETERANOS DE LA REVOLUCIÓN', url: `${NL_BASE}/62.pdf` },
        { nombre: 'LEY DE PLANEACIÓN ESTRATÉGICA DEL ESTADO DE NUEVO LEÓN', url: `${NL_BASE}/LEY DE PLANEACION ESTRATEGICA DEL ESTADO DE NUEVO LEON.pdf` },
        { nombre: 'LEY DE PRESTACIÓN DE SERVICIOS PARA LA ATENCIÓN, CUIDADO Y DESARROLLO INTEGRAL INFANTIL DEL ESTADO DE NUEVO LEÓN', url: `${NL_BASE}/LEY DE PRESTACION DE SERVICIOS PARA LA ATENCION CUIDADO Y DESARROLLO INTEGRAL INFANTIL DEL ESTADO DE NUEVO LEON.pdf` },
        { nombre: 'LEY DE PREVENCIÓN SOCIAL DE LA VIOLENCIA Y LA DELINCUENCIA CON PARTICIPACIÓN CIUDADANA DEL ESTADO DE NUEVO LEÓN', url: `${NL_BASE}/LEY DE PREVENCION SOCIAL DE LA VIOLENCIA Y LA DELINCUENCIA CON PARTICIPACION CIUDADANA DEL ESTADO DE NUEVO LEON.pdf` },
        { nombre: 'LEY DE PREVENCIÓN Y ATENCIÓN INTEGRAL DE LA VIOLENCIA FAMILIAR EN EL ESTADO DE NUEVO LEÓN', url: `${NL_BASE}/LEY DE PREVENCION Y ATENCION INTEGRAL A LA VIOLENCIA FAMILIAR.pdf` },
        { nombre: 'LEY DE PROFESIONES DEL ESTADO DE NUEVO LEÓN', url: `${NL_BASE}/LEY DE PROFESIONES DEL ESTADO DE NUEVO LEON.pdf` },
        { nombre: 'LEY DE PROPIEDAD EN CONDOMINIO DE INMUEBLES PARA EL ESTADO DE NUEVO LEÓN', url: `${NL_BASE}/LEY DE PROPIEDAD EN CONDOMINIO DE INMUEBLES PARA EL ESTADO DE NUEVO LEON.pdf` },
        { nombre: 'LEY DE PROTECCIÓN A LA SALUD BUCAL PARA EL ESTADO DE NUEVO LEÓN', url: `${NL_BASE}/LEY DE PROTECCION A LA SALUD BUCAL PARA EL ESTADO DE NUEVO LEON.pdf` },
        { nombre: 'LEY DE PROTECCIÓN AL PARTO HUMANIZADO Y A LA MATERNIDAD DIGNA DEL ESTADO DE NUEVO LEÓN', url: `${NL_BASE}/LEY DE PROTECCION AL PARTO HUMANIZADO Y A LA MATERNIDAD DIGNA DEL ESTADO DE NUEVO LEON.pdf` },
        { nombre: 'LEY DE PROTECCIÓN CIVIL PARA EL ESTADO DE NUEVO LEÓN', url: `${NL_BASE}/LEY DE PROTECCION CIVIL PARA EL ESTADO DE NUEVO LEON.pdf` },
        { nombre: 'LEY DE PROTECCIÓN CONTRA INCENDIOS Y MATERIALES PELIGROSOS DEL ESTADO DE NUEVO LEÓN', url: `${NL_BASE}/69.pdf` },
        { nombre: 'LEY DE PROTECCIÓN CONTRA LA EXPOSICIÓN AL HUMO DEL TABACO DEL ESTADO DE NUEVO LEÓN', url: `${NL_BASE}/LEY DE PROTECCION CONTRA LA EXPOSICION AL HUMO DEL TABACO DEL ESTADO DE NUEVO LEON.pdf` },
        { nombre: 'LEY DE PROTECCIÓN DE DATOS PERSONALES EN POSESIÓN DE SUJETOS OBLIGADOS DEL ESTADO DE NUEVO LEÓN', url: `${NL_BASE}/LEY DE PROTECCION DE DATOS PERSONALES EN POSESION DE SUJETOS OBLIGADOS DEL ESTADO DE NUEVO LEON.pdf` },
        { nombre: 'LEY DE PROTECCIÓN Y BIENESTAR ANIMAL PARA LA SUSTENTABILIDAD DEL ESTADO DE NUEVO LEÓN', url: `${NL_BASE}/LEY DE PROTECCION Y BIENESTAR ANIMAL PARA LA SUSTENTABILIDAD DEL ESTADO DE NL.pdf` },
        { nombre: 'LEY DE PROTECCIÓN Y FOMENTO APÍCOLA DEL ESTADO DE NUEVO LEÓN', url: `${NL_BASE}/LEY DE PROTECCION Y FOMENTO APICOLA DEL ESTADO DE NUEVO LEON.pdf` },
        { nombre: 'LEY DE REMUNERACIONES DE LOS SERVIDORES PÚBLICOS DEL ESTADO DE NUEVO LEÓN', url: `${NL_BASE}/990.pdf` },
        { nombre: 'LEY DE RESPONSABILIDAD PATRIMONIAL DEL ESTADO Y MUNICIPIOS DE NUEVO LEÓN', url: `${NL_BASE}/LEY DE RESPONSABILIDAD PATRIMONIAL DEL ESTADO Y MUNICIPIOS.pdf` },
        { nombre: 'LEY DE RESPONSABILIDADES ADMINISTRATIVAS DEL ESTADO DE NUEVO LEÓN', url: `${NL_BASE}/LEY DE RESPONSABILIDADES ADMINISTRATIVAS DEL ESTADO DE NUEVO LEON.pdf` },
        { nombre: 'LEY DE SALUD MENTAL PARA EL ESTADO DE NUEVO LEÓN', url: `${NL_BASE}/LEY DE SALUD MENTAL PARA EL ESTADO DE NUEVO LEON.pdf` },
        { nombre: 'LEY DE SEGURIDAD PRIVADA PARA EL ESTADO DE NUEVO LEÓN', url: `${NL_BASE}/LEY DE SEGURIDAD PRIVADA PARA EL ESTADO DE NUEVO LEON.pdf` },
        { nombre: 'LEY DE SEGURIDAD PÚBLICA PARA EL ESTADO DE NUEVO LEÓN', url: `${NL_BASE}/LEY DE SEGURIDAD PUBLICA PARA EL ESTADO DE NUEVO LEON.pdf` },
        { nombre: 'LEY DE SEÑALAMIENTOS VIALES PARA EL ESTADO DE NUEVO LEÓN', url: `${NL_BASE}/LEY DE SENALAMIENTOS VIALES PARA EL ESTADO DE NUEVO LEON.pdf` },
        { nombre: 'LEY DE SOCIEDADES MUTUALISTAS DEL ESTADO DE NUEVO LEÓN', url: `${NL_BASE}/76.pdf` },
        { nombre: 'LEY DE TRANSPARENCIA Y ACCESO A LA INFORMACIÓN PÚBLICA DEL ESTADO DE NUEVO LEÓN', url: `${NL_BASE}/LEY DE TRANSPARENCIA Y ACCESO A LA INFORMACION PUBLICA DEL ESTADO DE NUEVO LEON.pdf` },
        { nombre: 'LEY DE VÍCTIMAS DEL ESTADO DE NUEVO LEÓN', url: `${NL_BASE}/LEY DE VICTIMAS DEL ESTADO DE NUEVO LEON.pdf` },
        { nombre: 'LEY DEL CATASTRO', url: `${NL_BASE}/LEY DEL CATASTRO.pdf` },
        { nombre: 'LEY DEL DERECHO A LA ALIMENTACIÓN ADECUADA Y COMBATE CONTRA EL DESPERDICIO DE ALIMENTOS PARA EL ESTADO DE NUEVO LEÓN', url: `${NL_BASE}/LEY DEL DERECHO A LA ALIMENTACION ADECUADA Y COMBATE CONTRA EL DESPERDICIO DE ALIMENTOS PARA EL ESTADO DE NUEVO LEON.pdf` },
        { nombre: 'LEY DEL INSTITUTO DE EVALUACIÓN EDUCATIVA DE NUEVO LEÓN', url: `${NL_BASE}/LEY DEL INSTITUTO DE EVALUACION EDUCATIVA .pdf` },
        { nombre: 'LEY DEL INSTITUTO DE LA VIVIENDA DE NUEVO LEÓN', url: `${NL_BASE}/LEY DEL INSTITUTO DE LA VIVIENDA DE NUEVO LEON.pdf` },
        { nombre: 'LEY DEL INSTITUTO DE SEGURIDAD Y SERVICIOS SOCIALES DE LOS TRABAJADORES DEL ESTADO DE NUEVO LEÓN', url: `${NL_BASE}/LEY DEL INSTITUTO DE SEGURIDAD Y SERVICIOS SOCIALES DE LOS TRABAJADORES DEL ESTADO DE NUEVO LEON.pdf` },
        { nombre: 'LEY DEL INSTITUTO ESTATAL DE CULTURA FÍSICA Y DEPORTE', url: `${NL_BASE}/LEY DEL INSTITUTO ESTATAL DE CULTURA FISICA Y DEPORTE.pdf` },
        { nombre: 'LEY DEL INSTITUTO ESTATAL DE LA JUVENTUD', url: `${NL_BASE}/LEY DEL INSTITUTO ESTATAL DE LA JUVENTUD.pdf` },
        { nombre: 'LEY DEL INSTITUTO ESTATAL DE LAS MUJERES', url: `${NL_BASE}/LEY DEL INSTITUTO ESTATAL DE LAS MUJERES.pdf` },
        { nombre: 'LEY DEL INSTITUTO ESTATAL DE SEGURIDAD PÚBLICA', url: `${NL_BASE}/LEY DEL INSTITUTO ESTATAL DE SEGURIDAD PUBLICA.pdf` },
        { nombre: 'LEY DEL INSTITUTO REGISTRAL Y CATASTRAL DEL ESTADO DE NUEVO LEÓN', url: `${NL_BASE}/LEY DEL INSTITUTO REGISTRAL Y CATASTRAL DEL ESTADO DE NUEVO LEON.pdf` },
        { nombre: 'LEY DEL NOTARIADO DEL ESTADO DE NUEVO LEÓN', url: `${NL_BASE}/LEY DEL NOTARIADO DEL ESTADO DE NUEVO LEON.pdf` },
        { nombre: 'LEY DEL ORGANISMO PÚBLICO DESCENTRALIZADO DENOMINADO SISTEMA INTEGRAL PARA EL MANEJO ECOLÓGICO Y PROCESAMIENTO DE DESECHOS (SIMEPRODE)', url: `${NL_BASE}/LEY DEL ORGANISMO PUBLICO DESCENTRALIZADO DENOMINADO SISTEMA INTEGRAL PARA EL MANEJO ECOLOGICO Y PROCESAMIENTO DE DESECHOS (SIMEPRODE).pdf` },
        { nombre: 'LEY DEL PATRIMONIO CULTURAL DEL ESTADO DE NUEVO LEÓN', url: `${NL_BASE}/LEY DEL PATRIMONIO CULTURAL DEL ESTADO DE NUEVO LEON.pdf` },
        { nombre: 'LEY DEL PERIODICO OFICIAL DEL ESTADO DE NUEVO LEON', url: `${NL_BASE}/LEY DEL PERIODICO OFICIAL DEL ESTADO DE NUEVO LEON.pdf` },
        { nombre: 'LEY DEL REGISTRO CIVIL PARA EL ESTADO DE NUEVO LEÓN', url: `${NL_BASE}/LEY DEL REGISTRO CIVIL PARA EL ESTADO DE NUEVO LEON.pdf` },
        { nombre: 'LEY DEL SERVICIO CIVIL DEL ESTADO DE NUEVO LEÓN', url: `${NL_BASE}/LEY DEL SERVICIO CIVIL DEL ESTADO DE NUEVO LEON.pdf` },
        { nombre: 'LEY DEL SERVICIO PROFESIONAL DE CARRERA DE LA AUDITORÍA SUPERIOR DEL ESTADO DE NUEVO LEÓN', url: `${NL_BASE}/LEY DEL SERVICIO PROFESIONAL DE CARRERA DE LA AUDITORIA SUPERIOR DEL ESTADO DE NUEVO LEON.pdf` },
        { nombre: 'LEY ELECTORAL PARA EL ESTADO DE NUEVO LEÓN', url: `${NL_BASE}/LEY ELECTORAL PARA EL ESTADO DE NUEVO LEON.pdf` },
        { nombre: 'LEY EN MATERIA DE DESAPARICIÓN Y BÚSQUEDA DE PERSONAS PARA EL ESTADO DE NUEVO LEÓN', url: `${NL_BASE}/LEY EN MATERIA DE DESAPARICION Y BUSQUEDANDE PERSONAS PARA EL ESTADO DE NUEVO LEON.pdf` },
        { nombre: 'LEY ESTATAL DE SALUD', url: `${NL_BASE}/LEY ESTATAL DE SALUD.pdf` },
        { nombre: 'LEY ESTATAL DEL DEPORTE', url: `${NL_BASE}/LEY ESTATAL DEL DEPORTE.pdf` },
        { nombre: 'LEY GANADERA DEL ESTADO DE NUEVO LEÓN', url: `${NL_BASE}/101.pdf` },
        { nombre: 'LEY ORGÁNICA DE LA ADMINISTRACIÓN PÚBLICA PARA EL ESTADO DE NUEVO LEÓN', url: `${NL_BASE}/LEY ORGANICA DE LA ADMINISTRACION PUBLICA PARA EL ESTADO DE NUEVO LEON.pdf` },
        { nombre: 'LEY ORGÁNICA DE LA FISCALÍA GENERAL DE JUSTICIA DEL ESTADO DE NUEVO LEÓN', url: `${NL_BASE}/LEY ORGANICA DE LA FISCALIA GENERAL DE JUSTICIA DEL ESTADO DE NUEVO LEON.pdf` },
        { nombre: 'LEY ORGÁNICA DE LA UNIVERSIDAD AUTÓNOMA DE NUEVO LEÓN', url: `${NL_BASE}/LEY ORGANICA DE LA UNIVERSIDAD AUTONOMA DE NUEVO LEON.pdf` },
        { nombre: 'LEY ORGÁNICA DEL CENTRO DE CONCILIACIÓN LABORAL DEL ESTADO DE NUEVO LEÓN', url: `${NL_BASE}/LEY ORGANICA DEL CENTRO DE CONCILIACION LABORAL DEL ESTADO DE NUEVO LEON.pdf` },
        { nombre: 'LEY ORGÁNICA DEL HOSPITAL UNIVERSITARIO "DR . JOSÉ ELEUTERIO GONZÁLEZ"', url: `${NL_BASE}/107.pdf` },
        { nombre: 'LEY ORGÁNICA DEL PODER JUDICIAL DEL ESTADO DE NUEVO LEÓN', url: `${NL_BASE}/LEY ORGANICA DEL PODER JUDICIAL DEL ESTADO DE NUEVO LEON.pdf` },
        { nombre: 'LEY ORGÁNICA DEL PODER LEGISLATIVO DEL ESTADO DE NUEVO LEÓN', url: `${NL_BASE}/LEY ORGANICA DEL PODER LEGISLATIVO.pdf` },
        { nombre: 'LEY ORGÁNICA QUE CREA LA ESCUELA NORMAL SUPERIOR DEL ESTADO DE NUEVO LEÓN', url: `${NL_BASE}/110.pdf` },
        { nombre: 'LEY PARA EL IMPULSO, DESARROLLO Y PROMOCIÓN DE LA INDUSTRIA CINEMATOGRÁFICA Y AUDIOVISUAL DEL ESTADO DE NUEVO LEÓN', url: `${NL_BASE}/LEY PARA EL IMULSO DESARROLLO Y PROMOCION DE LA INDUSTRIA CINEMATOGRAFICA Y AUDIOVISUAL DEL ESTADO DE NUEVO LEON.pdf` },
        { nombre: 'LEY PARA EL RECONOCIMIENTO AL MÉRITO CÍVICO "PRESEA ESTADO DE NUEVO LEÓN"', url: `${NL_BASE}/LEY PARA EL RECONOCIMIENTO AL MERITO CIVICO PRESEA ESTADO DE NUEVO LEON.pdf` },
        { nombre: 'LEY PARA INCENTIVAR LA DENUNCIA DE ACTOS DE CORRUPCIÓN DE SERVIDORES PÚBLICOS DEL ESTADO DE NUEVO LEÓN', url: `${NL_BASE}/LEY PARA INCENTIVAR LA DENUNCIA DE ACTOS DE CORRUPCION DE SERVIDORES PUBLICOS.pdf` },
        { nombre: 'LEY PARA LA ADMINISTRACIÓN DE BIENES ASEGURADOS, DECOMISADOS O ABANDONADOS DEL ESTADO DE NUEVO LEÓN', url: `${NL_BASE}/LEY PARA LA ADMINISTRACION DE BIENES ASEGURADOS DECOMISADOS O ABANDONADOS DEL ESTADO DE NUEVO LEON.pdf` },
        { nombre: 'LEY PARA LA ATENCIÓN, PROTECCIÓN E INCLUSIÓN DE LAS PERSONAS CON LA CONDICIÓN DEL ESPECTRO AUTISTA Y OTRAS CONDICIONES DE LA NEURODIVERSIDAD PARA EL ESTADO DE NUEVO LEÓN', url: `${NL_BASE}/LEY PARA LA ATENCION PROTECCION E INCLUSION DE LAS PERSONAS CON EL ESPECTRO AUTISTA Y OTRAS CONDICIONES DE LA NEURODIVERSIDAD.pdf` },
        { nombre: 'LEY PARA LA CONSERVACIÓN Y PROTECCIÓN DEL ARBOLADO URBANO DEL ESTADO DE NUEVO LEÓN', url: `${NL_BASE}/LEY PARA LA CONSERVACION Y PROTECCION DEL ARBOLADO URBANO DEL ESTADO DE NUEVO LEON.pdf` },
        { nombre: 'LEY PARA LA CONSTRUCCIÓN Y REHABILITACIÓN DE PAVIMENTOS DEL ESTADO DE NUEVO LEÓN', url: `${NL_BASE}/LEY PARA LA CONSTRUCCION Y REHABILITACION DE PAVIMENTOS DEL ESTADO DE NUEVO LEON.pdf` },
        { nombre: 'LEY PARA LA DETECCIÓN Y TRATAMIENTO OPORTUNO E INTEGRAL DEL CÁNCER EN LA INFANCIA Y LA ADOLESCENCIA DEL ESTADO DE NUEVO LEÓN', url: `${NL_BASE}/LEY PARA LA DETECCION Y TRATAMIENTO OPORTUNO E INTEGRAL DEL CANCER EN LA INFANCIA Y LA ADOLESCENCIA DEL ESTADO DE NUEVO LEON.pdf` },
        { nombre: 'LEY PARA LA IGUALDAD ENTRE MUJERES Y HOMBRES DEL ESTADO DE NUEVO LEÓN', url: `${NL_BASE}/LEY PARA LA IGUALDAD ENTRE MUJERES Y HOMBRES DEL ESTADO DE NUEVO LEON.pdf` },
        { nombre: 'LEY PARA LA INTEGRACIÓN DEL ACERVO BIBLIOGRÁFICO EN EL ESTADO DE NUEVO LEÓN', url: `${NL_BASE}/114.pdf` },
        { nombre: 'LEY PARA LA MEJORA REGULATORIA Y LA SIMPLIFICACIÓN ADMINISTRATIVA DEL ESTADO DE NUEVO LEÓN', url: `${NL_BASE}/LEY PARA LA MEJORA REGULATORIA Y LA SIMPLIFICACION ADMINISTRATIVA DEL ESTADO.pdf` },
        { nombre: 'LEY PARA LA PREVENCIÓN Y COMBATE AL ABUSO DEL ALCOHOL Y DE REGULACIÓN PARA SU VENTA Y CONSUMO PARA EL ESTADO DE NUEVO LEÓN.', url: `${NL_BASE}/LEY PARA LA PREVENCION Y COMBATE AL ABUSO DEL ALCOHOL Y DE REGULACION PARA SU VENTA Y CONSUMO PARA EL ESTADO.pdf` },
        { nombre: 'LEY PARA LA PROMOCIÓN DE VALORES Y CULTURA DE LA LEGALIDAD DEL ESTADO DE NUEVO LEÓN.', url: `${NL_BASE}/LEY PARA LA PROMOCION DE VALORES Y CULTURA DE LA LEGALIDAD DEL ESTADO DE NUEVO LEON.pdf` },
        { nombre: 'LEY PARA LA PROTECCIÓN DE LOS DERECHOS DE LAS PERSONAS CON DISCAPACIDAD', url: `${NL_BASE}/LEY PARA LA PROTECCION DE LOS DERECHOS DE LAS PERSONAS CON DISCAPACIDAD.pdf` },
        { nombre: 'LEY PARA LA PROTECCIÓN DE PERSONAS QUE INTERVIENEN EN EL PROCEDIMIENTO PENAL DEL ESTADO DE NUEVO LEÓN', url: `${NL_BASE}/LEY PARA LA PROTECCION DE PERSONAS QUE INTERVIENEN EN EL PROCEDIMIENTO PENAL DEL ESTADO DE NUEVO LEON.pdf` },
        { nombre: 'LEY PARA LA PROTECCIÓN, APOYO Y PROMOCIÓN DE LA LACTANCIA MATERNA DEL ESTADO DE NUEVO LEÓN', url: `${NL_BASE}/LEY PARA LA PROTECCION APOYO Y PROMOCION DE LA LACTANCIA MATERNA DEL ESTADO DE NUEVO LEON.pdf` },
        { nombre: 'LEY PARA PREVENIR LA OBESIDAD Y EL SOBREPESO EN EL ESTADO Y MUNICIPIOS DE NUEVO LEÓN', url: `${NL_BASE}/LEY PARA PREVENIR LA OBESIDAD Y EL SOBREPESO EN EL ESTADO Y MUNICIPIOS DE NUEVO LEON.pdf` },
        { nombre: 'LEY PARA PREVENIR Y ELIMINAR LA DISCRIMINACIÓN EN EL ESTADO DE NUEVO LEÓN', url: `${NL_BASE}/LEY PARA PREVENIR Y ELIMINAR LA DISCRIMINACION EN EL ESTADO DE NUEVO LEON.pdf` },
        { nombre: 'LEY PARA PREVENIR, ATENDER Y ERRADICAR EL ACOSO Y LA VIOLENCIA ESCOLAR DEL ESTADO DE NUEVO LEÓN', url: `${NL_BASE}/LEY PARA PREVENIR ATENDER Y ERRADICAR EL ACOSO Y LA VIOLENCIA ESCOLAR DEL ESTADO DE NUEVO LEON.pdf` },
        { nombre: 'LEY PARA PREVENIR, ATENDER, COMBATIR Y ERRADICAR LA TRATA DE PERSONAS EN EL ESTADO DE NUEVO LEÓN', url: `${NL_BASE}/LEY PARA PREVENIR ATENDER COMBATIR Y ERRADICAR LA TRATA DE PERSONAS EN EL ESTADO DE NUEVO LEON.pdf` },
        { nombre: 'LEY PARA REGULAR EL ACCESO VIAL Y MEJORAR LA SEGURIDAD DE LOS VECINOS EN EL ESTADO DE NUEVO LEÓN', url: `${NL_BASE}/LEY PARA REGULAR EL ACCESO VIAL Y MEJORAR LA SEGURIDAD DE LOS VECINOS EN EL ESTADO DE NUEVO LEON.pdf` },
        { nombre: 'LEY PARA REGULAR EL USO DE LA VÍA PÚBLICA EN EL EJERCICIO DE LA ACTIVIDAD COMERCIAL', url: `${NL_BASE}/LEY PARA REGULAR EL USO DE LA VIA PUBLICA 24 DIC 2010.pdf` },
        { nombre: 'LEY QUE CREA AL ORGANISMO PÚBLICO DESCENTRALIZADO DENOMINADO INSTITUTO DEL AGUA DEL ESTADO DE NUEVO LEÓN', url: `${NL_BASE}/LEY QUE CREA AL ORGANISMO PUBLICO DESCENTRALIZADO DENOMINADO INSTITUTO DEL AGUA DEL ESTADO DE NUEVO LEON.pdf` },
        { nombre: 'LEY QUE CREA AL ORGANISMO PÚBLICO DESCENTRALIZADO DENOMINADO PARQUE FUNDIDORA', url: `${NL_BASE}/LEY QUE CREA AL ORGANISMO PUBLICO DESCENTRALIZADO DENOMINADO PARQUE FUNDIDORA.pdf` },
        { nombre: 'LEY QUE CREA AL ORGANISMO PÚBLICO DESCENTRALIZADO DENOMINADO PARQUES Y VIDA SILVESTRE DE NUEVO LEÓN', url: `${NL_BASE}/LEY QUE CREA AL ORGANISMO PUBLICO DESCENTRALIZADO DENOMINADO PARQUES Y VIDA SILVESTRE DE NUEVO LEON.pdf` },
        { nombre: 'LEY QUE CREA EL COLEGIO DE EDUCACIÓN PROFESIONAL TÉCNICA DEL ESTADO DE NUEVO LEÓN', url: `${NL_BASE}/LEY QUE CREA EL COLEGIO DE EDUCACION PROFESIONAL TECNICA .pdf` },
        { nombre: 'LEY QUE CREA EL COLEGIO MILITARIZADO "GENERAL MARIANO ESCOBEDO" DEL ESTADO DE NUEVO LEÓN', url: `${NL_BASE}/LEY QUE CREA EL COLEGIO MILITARIZADO GENERAL MARIANO ESCOBEDO DEL ESTADO DE NUEVO LEON.pdf` },
        { nombre: 'LEY QUE CREA EL CONSEJO ESTATAL DE ADOPCIONES', url: `${NL_BASE}/LEY QUE CREA EL CONSEJO ESTATAL DE ADOPCIONES.pdf` },
        { nombre: 'LEY QUE CREA EL CONSEJO PARA LA CULTURA Y LAS ARTES DE NUEVO LEÓN', url: `${NL_BASE}/LEY QUE CREA EL CONSEJO PARA LA CULTURA Y LAS ARTES DE NUEVO LEON.pdf` },
        { nombre: 'LEY QUE CREA EL INSTITUTO DE CAPACITACIÓN Y EDUCACIÓN PARA EL TRABAJO DEL ESTADO DE NUEVO LEÓN', url: `${NL_BASE}/LEY QUE CREA EL INSTITUTO DE CAPACITACION Y EDUCACION PARA EL TRABAJO DEL ESTADO DE NUEVO LEON.pdf` },
        { nombre: 'LEY QUE CREA EL INSTITUTO DE CONTROL VEHICULAR DEL ESTADO DE NUEVO LEÓN', url: `${NL_BASE}/LEY QUE CREA EL INSTITUTO DE CONTROL VEHICULAR.pdf` },
        { nombre: 'LEY QUE CREA EL INSTITUTO DE INVESTIGACIÓN, INNOVACIÓN Y ESTUDIOS DE POSGRADO PARA LA EDUCACIÓN DEL ESTADO DE NUEVO LEÓN', url: `${NL_BASE}/LEY QUE CREA EL INSTITUTO DE INVESTIGACION INNOVACION Y ESTUDIOS DE POSGRADO PARA LA EDUCACION DEL ESTADO.pdf` },
        { nombre: 'LEY QUE CREA EL ORGANISMO PÚBLICO DESCENTRALIZADO "OPERADORA DE SERVICIOS TURÍSTICOS DE NUEVO LEÓN"', url: `${NL_BASE}/129.pdf` },
        { nombre: 'LEY QUE CREA EL ORGANISMO PÚBLICO DESCENTRALIZADO DE PARTICIPACIÓN CIUDADANA DENOMINADO "CORPORACIÓN PARA EL DESARROLLO DE LA ZONA FRONTERIZA DE NUEVO LEÓN"', url: `${NL_BASE}/111.pdf` },
        { nombre: 'LEY QUE CREA EL ORGANISMO PÚBLICO DESCENTRALIZADO DENOMINADO "RED ESTATAL DE AUTOPISTAS DE NUEVO LEÓN"', url: `${NL_BASE}/LEY QUE CREA EL ORGANISMO PUBLICO RED ESTATAL DE AUTOPISTAS.pdf` },
        { nombre: 'LEY QUE CREA EL ORGANISMO PÚBLICO DESCENTRALIZADO DENOMINADO "SISTEMA DE CAMINOS DE NUEVO LEÓN"', url: `${NL_BASE}/LEY QUE CREA EL ORGANISMO PUBLICO SISTEMA DE CAMINOS.pdf` },
        { nombre: 'LEY QUE CREA EL ORGANISMO PÚBLICO DESCENTRALIZADO DENOMINADO COLEGIO DE ESTUDIOS CIENTÍFICOS Y TECNOLÓGICOS DEL ESTADO DE NUEVO LEÓN, CECyTENL', url: `${NL_BASE}/125.pdf` },
        { nombre: 'LEY QUE CREA EL ORGANISMO PÚBLICO DESCENTRALIZADO DENOMINADO MUSEO DE HISTORIA MEXICANA', url: `${NL_BASE}/LEY QUE CREA EL ORGANISMO PUBLICO MUSEO DE HISTORIA.pdf` },
        { nombre: 'LEY QUE CREA EL ORGANISMO PÚBLICO DESCENTRALIZADO DENOMINADO SISTEMA DE RADIO Y TELEVISIÓN DE NUEVO LEÓN', url: `${NL_BASE}/LEY QUE CREA EL ORGANISMO PUBLICO DESCENTRALIZADO DENOMINADO SISTEMA DE RADIO Y TELEVISION DE NUEVO LEON.pdf` },
        { nombre: 'LEY QUE CREA EL ORGANISMO PÚBLICO DESCENTRALIZADO DENOMINADO SISTEMA DE TRANSPORTE COLECTIVO "METRORREY"', url: `${NL_BASE}/LEY QUE CREA EL ORGANISMO PUBLICO SISTEMA DE TRANSPORTE METROREY.pdf` },
        { nombre: 'LEY QUE CREA EL ORGANISMO PÚBLICO DESCENTRALIZADO SERVICIOS DE SALUD DE NUEVO LEÓN', url: `${NL_BASE}/134.pdf` },
        { nombre: 'LEY QUE CREA EL REGISTRO ESTATAL DE ASESORES INMOBILIARIOS DEL ESTADO DE NUEVO LEÓN', url: `${NL_BASE}/LEY QUE CREA EL REGISTRO ESTATAL DE ASESORES INMOBILIARIOS DEL ESTADO DE NUEVO LEON.pdf` },
        { nombre: 'LEY QUE CREA LA ESCUELA PARA PADRES, MADRES O QUIENES EJERZAN LA TUTELA, GUARDA O CUSTODIA DEL ESTADO DE NUEVO LEÓN', url: `${NL_BASE}/LEY QUE CREA LA ESCUELA PARA PADRES MADRES O QUIENES EJERZAN LA TUTELA GUARDA O CUSTODIA DEL ESTADO DE NUEVO LEON.pdf` },
        { nombre: 'LEY QUE CREA LA MEDALLA DE HONOR "FRAY SERVANDO TERESA DE MIER" DEL H. CONGRESO DEL ESTADO DE NUEVO LEÓN', url: `${NL_BASE}/LEY QUE CREA LA MEDALLA DE HONOR FRAY SERVANDO TERESA DE MIER DEL H CONGRESO DEL ESTADO DE NUEVO LEON.pdf` },
        { nombre: 'LEY QUE CREA LA MEDALLA DE HONOR "MAURICIO FERNÁNDEZ GARZA" DEL H. CONGRESO DEL ESTADO DE NUEVO LEÓN', url: `${NL_BASE}/LEY QUE CREA LA MEDALLA DE HONOR MAURICIO FERNANDEZ GARZA DEL H. CONGRESO DEL ESTADO DE NUEVO LEON.pdf` },
        { nombre: 'LEY QUE CREA LA UNIDAD DE INTEGRACIÓN EDUCATIVA DE NUEVO LEÓN', url: `${NL_BASE}/LEY QUE CREA LA UNIDAD DE INTEGRACION EDUCATIVA.pdf` },
        { nombre: 'LEY QUE CREA LA UNIVERSIDAD DE CIENCIAS DE LA SEGURIDAD DEL ESTADO DE NUEVO LEÓN', url: `${NL_BASE}/LEY QUE CREA LA UNIVERSIDAD DE CIENCIAS DE LA SEGURIDAD DEL ESTADO DE NUEVO LEON.pdf` },
        { nombre: 'LEY QUE CREA LA UNIVERSIDAD GRAL. MARIANO ESCOBEDO', url: `${NL_BASE}/LEY QUE CREA LA UNIVERSIDAD GRAL MARIANO ESCOBEDO.pdf` },
        { nombre: 'LEY QUE CREA LA UNIVERSIDAD POLITÉCNICA DE APODACA', url: `${NL_BASE}/LEY QUE CREA LA UNIVERSIDAD POLITECNICA DE APODACA.pdf` },
        { nombre: 'LEY QUE CREA LA UNIVERSIDAD POLITÉCNICA DE GARCÍA', url: `${NL_BASE}/LEY QUE CREA LA UNIVERSIDAD POLITECNICA DE GARCIA.pdf` },
        { nombre: 'LEY QUE CREA LA UNIVERSIDAD TECNOLÓGICA BILINGÜE FRANCO MEXICANA DE NUEVO LEÓN', url: `${NL_BASE}/LEY QUE CREA LA UNIVERSIDAD TECNOLOGICA BILINGUE FRANCO MEXICANA DE NL.pdf` },
        { nombre: 'LEY QUE CREA LA UNIVERSIDAD TECNOLÓGICA CADEREYTA', url: `${NL_BASE}/LEY QUE CREA LA UNIVERSIDAD TECNOLOGICA CADEREYTA.pdf` },
        { nombre: 'LEY QUE CREA LA UNIVERSIDAD TECNOLÓGICA LINARES', url: `${NL_BASE}/LEY QUE CREA LA UNIVERSIDAD TECNOLOGICA LINARES.pdf` },
        { nombre: 'LEY QUE CREA LA UNIVERSIDAD TECNOLÓGICA SANTA CATARINA', url: `${NL_BASE}/LEY QUE CREA LA UNIVERSIDAD TECNOLOGICA SANTA CATARINA.pdf` },
        { nombre: 'LEY QUE CREA LAS JUNTAS DE MEJORAMIENTO MORAL, CÍVICO Y MATERIAL EN EL ESTADO DE NUEVO LEÓN', url: `${NL_BASE}/142.pdf` },
        { nombre: 'LEY QUE CREA UNA INSTITUCIÓN PÚBLICA DESCENTRALIZADA CON PERSONALIDAD JURÍDICA PROPIA Y CON DOMICILIO EN LA CIUDAD DE MONTERREY QUE SE DENOMINARÁ "SERVICIOS DE AGUA Y DRENAJE DE MONTERREY"', url: `${NL_BASE}/LEY QUE CREA SERVICIOS DE AGUA Y DRENAJE DE MONTERREY.pdf` },
        { nombre: 'LEY QUE REGULA EL PROCEDIMIENTO DE EMISIÓN DE LA DECLARATORIA DE AUSENCIA POR DESAPARICIÓN EN EL ESTADO DE NUEVO LEÓN', url: `${NL_BASE}/LEY QUE REGULA EL PROCEDIMIENTO DE EMISION DE LA DECLARATORIA DE AUSENCIA POR DESAPARICION EN EL ESTADO DE NUEVO LEON.pdf` },
        { nombre: 'LEY QUE REGULA EL USO DE VEHÍCULOS RECREATIVOS TODO TERRENO EN EL ESTADO DE NUEVO LEÓN', url: `${NL_BASE}/LEY QUE REGULA EL USO DE VEHICULOS RECREATIVOS TODO TERRENO.pdf` },
        { nombre: 'LEY QUE REGULA LA EXPEDICIÓN DE LICENCIAS PARA CONDUCIR DEL ESTADO DE NUEVO LEÓN', url: `${NL_BASE}/LEY QUE REGULA LA EXPEDICION DE LICENCIAS PARA CONDUCIR DEL ESTADO DE NUEVO LEON.pdf` },
        { nombre: 'LEY QUE REGULA LAS CARACTERÍSTICAS, USO Y DIFUSIÓN DEL ESCUDO DEL ESTADO DE NUEVO LEÓN', url: `${NL_BASE}/LEY QUE REGULA LAS CARACTERISTICAS USO Y DIFUSION DEL ESCUDO DEL ESTADO DE NUEVO LEON.pdf` },
        { nombre: 'LEY REGLAMENTARIA DEL ARTÍCULO 95 DE LA CONSTITUCIÓN POLÍTICA DEL ESTADO DE NUEVO LEÓN', url: `${NL_BASE}/LEY REGLAMENTARIA DEL ARTICULO 95 DE LA CONSTITUCION POLITICA DEL ESTADO DE NUEVO LEON.pdf` },
        { nombre: 'LEY REGLAMENTARIA DEL REGISTRO PÚBLICO DE LA PROPIEDAD Y DEL COMERCIO PARA EL ESTADO DE NUEVO LEÓN', url: `${NL_BASE}/LEY REGLAMENTARIA DEL REGISTRO PUBLICO DE LA PROPIEDAD Y EL COMERCIO PARA EL ESTADO DE NUEVO LEON.pdf` },
        { nombre: 'LEY SOBRE EL SISTEMA ESTATAL DE ASISTENCIA SOCIAL DEL ESTADO DE NUEVO LEÓN', url: `${NL_BASE}/LEY SOBRE EL SISTEMA ESTATAL DE ASISTENCIA SOCIAL DEL ESTADO DE NUEVO LEON.pdf` },
        { nombre: 'LEY SOBRE GOBIERNO ELECTRÓNICO Y FOMENTO AL USO DE LAS TECNOLOGÍAS DE LA INFORMACIÓN DEL ESTADO', url: `${NL_BASE}/LEY SOBRE EL GOBIERNO ELECTRONICO Y FOMENTO AL USO DE LAS TECNOLOGIAS DE LA INFORMACION DEL ESTADO.pdf` },
    ],
    codigos: [
        { nombre: 'CÓDIGO DE ÉTICA PARA EL CONGRESO DEL ESTADO DE NUEVO LEÓN', url: `${NL_BASE}/CODIGO DE ETICA PARA EL CONGRESO DEL ESTADO DE NUEVO LEON.pdf` },
        { nombre: 'CÓDIGO PENAL PARA EL ESTADO DE NUEVO LEÓN', url: `${NL_BASE}/CODIGO PENAL PARA EL ESTADO DE NUEVO LEON.pdf` },
        { nombre: 'CÓDIGO FISCAL DEL ESTADO DE NUEVO LEÓN', url: `${NL_BASE}/CODIGO FISCAL DEL ESTADO DE NUEVO LEON.pdf` },
        { nombre: 'CÓDIGO DE PROCEDIMIENTOS CIVILES DEL ESTADO DE NUEVO LEÓN', url: `${NL_BASE}/CODIGO DE PROCEDIMIENTOS CIVILES DEL ESTADO DE NUEVO LEON.pdf` },
        { nombre: 'CÓDIGO CIVIL PARA EL ESTADO DE NUEVO LEÓN', url: `${NL_BASE}/CODIGO CIVIL PARA EL ESTADO DE NUEVO LEON.pdf` },
    ],
    reglamentos: [],
    otros: [],
};

// ─── Guerrero: FULL DATA — PDFs hosted on Supabase ────────────────
const GUERRERO_BASE = 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/Guerrero';
const GUERRERO_LEYES: CategoriaLeyes = {
    constitucion: [
        { nombre: 'Constitución Política del Estado Libre y Soberano de Guerrero', url: `${GUERRERO_BASE}/CONSTITUCION-GUERRERO-15-06-2022.pdf` },
    ],
    leyes: [
        { nombre: 'LEY ARANCELARIA PARA EL COBRO DE HONORARIOS DE LOS ABOGADOS, DEPOSITARIOS, INTERPRETES, TRADUCTORES, PERITOS VALUADORES Y ARBITROS, NUMERO 47', url: `${GUERRERO_BASE}/LEY-ARANCELARIA-PARA-EL-COBRO-DE-HONORARIOS-DE-LOS-ABOGADOS-DEPOSITARIOS-INTERPRETES-TRADUCTORES-PERITOS-VALUADORES-Y-ARBITROS-47-2021-03-10.pdf` },
        { nombre: 'LEY DE AGUAS PARA EL ESTADO LIBRE Y SOBERANO DE GUERRERO NÚMERO 574', url: `${GUERRERO_BASE}/LEY-DE-AGUAS-PARA-EL-ESTADO-LIBRE-Y-SOBERANO-DE-GUERRERO-574-2021-11-16.pdf` },
        { nombre: 'LEY DE DIVORCIO DEL ESTADO DE GUERRERO', url: `${GUERRERO_BASE}/ley-de-divorcio-del-estado-de-guerrero.pdf` },
        { nombre: 'LEY DE FOMENTO ECONOMICO, INVERSION Y DESARROLLO DEL ESTADO DE GUERRERO NÚMERO 487', url: `${GUERRERO_BASE}/LEY-DE-FOMENTO-ECONOMICO-INVERSION-Y-DESARROLLO-DEL-ESTADO-DE-GUERRERO-487-2021-03-10.pdf` },
        { nombre: 'LEY DE JUSTICIA EN MATERIA DE FALTAS DE POLICIA Y BUEN GOBIERNO DEL ESTADO', url: `${GUERRERO_BASE}/LEY-DE-JUSTICIA-EN-MATERIA-DE-FALTAS-DE-POLICIA-Y-BUEN-GOBIERNO-DEL-ESTADO-0-2021-03-10.pdf` },
        { nombre: 'LEY DE LA CAJA DE PREVISION DE LOS AGENTES DEL MINISTERIO PUBLICO, PERITOS, AGENTES DE LA POLICIA JUDICIAL, AGENTES DE LA POLICIA PREVENTIVA, CUSTODIOS Y DEFENSORES DE OFICIO DEL ESTADO DE GUERRERO', url: `${GUERRERO_BASE}/LEY-DE-LA-CAJA-DE-PREVISION-DE-LOS-AGENTES-DEL-MINISTERIO-PUBLICO-PERITOS-AGENTES-DE-LA-POLICIA-JUDICIAL-AGENTES-DE-LA-POLICIA-PREVENTIVA-CUSTODIOS-Y-DEFENSORES-DE-OFICIO-DEL-ESTADO-DE-GUERRERO-0-2021-03-10.pdf` },
        { nombre: 'LEY DE OBRAS PÚBLICAS Y SUS SERVICIOS DEL ESTADO DE GUERRERO NUMERO 266', url: `${GUERRERO_BASE}/LEY-DE-OBRAS-PUBLICAS-Y-SUS-SERVICIOS-DEL-ESTADO-DE-GUERRERO-266-2021-03-10.pdf` },
        { nombre: 'LEY DE PREMIOS CIVILES DEL ESTADO DE GUERRERO NÚMERO 434', url: `${GUERRERO_BASE}/ley-de-premios-civiles-del-estado-de-guerrero-434.pdf` },
        { nombre: 'LEY DE PREMIOS NACIONALES GUERRERO', url: `${GUERRERO_BASE}/LEY-DE-PREMIOS-NACIONALES-GUERRERO-0-2021-03-10.pdf` },
        { nombre: 'LEY DE PREVENCIÓN Y ATENCIÓN DE LA VIOLENCIA FAMILIAR DEL ESTADO DE GUERRERO NÚMERO 280', url: `${GUERRERO_BASE}/ley-de-prevencion-y-atencion-de-la-violencia-familiar-del-estado-de-guerrero-numero-280-07-02-2024.pdf` },
        { nombre: 'LEY DE PROTECCION Y FOMENTO A LAS ARTESANIAS', url: `${GUERRERO_BASE}/LEY-DE-PROTECCION-Y-FOMENTO-A-LAS-ARTESANIAS-0.pdf` },
        { nombre: 'LEY DE REESTRUCTURACION DEL SECTOR EDUCATIVO DEL ESTADO DE GUERRERO NUM. 243', url: `${GUERRERO_BASE}/LEY-DE-REESTRUCTURACION-DEL-SECTOR-EDUCATIVO-DEL-ESTADO-DE-GUERRERO-243-2021-03-10.pdf` },
        { nombre: 'LEY DE REGULACION Y FOMENTO DE MERCADOS Y TIANGUIS POPULARES', url: `${GUERRERO_BASE}/LEY-DE-REGULACION-Y-FOMENTO-DE-MERCADOS-Y-TIANGUIS-POPULARES-0-2021-03-10.pdf` },
        { nombre: 'LEY DE REGULACION Y FOMENTO DEL SISTEMA DE TIEMPO COMPARTIDO DEL ESTADO DE GUERRERO', url: `${GUERRERO_BASE}/LEY-DE-REGULACION-Y-FOMENTO-DEL-SISTEMA-DE-TIEMPO-COMPARTIDO-DEL-ESTADO-DE-GUERRERO-0-2021-03-10.pdf` },
        { nombre: 'LEY DE TRABAJO DE LOS SERVIDORES PUBLICOS DEL ESTADO DE GUERRERO NUMERO 248', url: `${GUERRERO_BASE}/LEY-DE-TRABAJO-DE-LOS-SERVIDORES-PUBLICOS-DEL-ESTADO-DE-GUERRERO-248.pdf` },
        { nombre: 'LEY DE TRANSPORTE Y VIALIDAD DEL ESTADO DE GUERRERO', url: `${GUERRERO_BASE}/ley-transporte-vialidad-estado-guerrero.pdf` },
        { nombre: 'LEY DE VIVIENDA SOCIAL DEL ESTADO DE GUERRERO NUMERO 573', url: `${GUERRERO_BASE}/ley-de-vivienda-del-estado-de-guerrero-573-2023-04-27.pdf` },
        { nombre: 'LEY ESTATAL DE BIBLIOTECAS NUMERO 565', url: `${GUERRERO_BASE}/LEY-ESTATAL-DE-BIBLIOTECAS-565-2021-03-10.pdf` },
        { nombre: 'LEY NUM. 101, PARA LA PROTECCION DE LOS NO FUMADORES DEL ESTADO DE GUERRERO', url: `${GUERRERO_BASE}/LEY-PARA-LA-PROTECCION-DE-LOS-NO-FUMADORES-DEL-ESTADO-DE-GUERRERO-101-2021-03-10.pdf` },
        { nombre: 'LEY NUM. 463, PARA EL BIENESTAR INTEGRAL DE LOS PERIODISTAS DEL ESTADO DE GUERRERO', url: `${GUERRERO_BASE}/LEY-PARA-EL-BIENESTAR-INTEGRAL-DE-LOS-PERIODISTAS-DEL-ESTADO-DE-GUERRERO-463-2021-03-10.pdf` },
        { nombre: 'LEY NUMERO 179 DEL SISTEMA DE SEGURIDAD PÚBLICA DEL ESTADO LIBRE Y SOBERANO DE GUERRERO', url: `${GUERRERO_BASE}/ley-del-sistema-de-seguridad-publica-del-estado-de-guerrero-179.pdf` },
        { nombre: 'LEY NUMERO 33 DE INSTITUCIONES DE ASISTENCIA PRIVADA PARA EL ESTADO DE GUERRERO', url: `${GUERRERO_BASE}/LEY-DE-INSTITUCIONES-DE-ASISTENCIA-PRIVADA-PARA-EL-ESTADO-DE-GUERRERO-33-2021-03-10.pdf` },
        { nombre: 'LEY NUMERO 41 QUE ESTABLECE EL DERECHO DE VIA DE CARRETERAS O CAMINOS LOCALES', url: `${GUERRERO_BASE}/LEY-QUE-ESTABLECE-EL-DERECHO-DE-VIA-DE-CARRETERAS-O-CAMINOS-LOCALES-41-2021-03-10.pdf` },
        { nombre: 'LEY NUMERO 428 DE CONSERVACION Y VIGILANCIA DE OLINALA, GUERRERO', url: `${GUERRERO_BASE}/LEY-DE-CONSERVACION-Y-VIGILANCIA-DE-OLINALA-GUERRERO-428-2021-03-10.pdf` },
        { nombre: 'LEY NUMERO 47, DE FOMENTO INDUSTRIAL DEL ESTADO DE GUERRERO.', url: `${GUERRERO_BASE}/LEY-DE-FOMENTO-INDUSTRIAL-DEL-ESTADO-DE-GUERRERO-47-2021-03-10.pdf` },
        { nombre: 'LEY NUMERO 59, ORGANICA DE DIVISION TERRITORIAL DEL ESTADO', url: `${GUERRERO_BASE}/ley-organica-de-division-territorial-del-estado-59-2022-11-25.pdf.pdf` },
        { nombre: 'LEY NUMERO 61, DEL FONDO AUXILIAR DEL TRIBUNAL DE LO CONTENCIOSO ADMINISTRATIVO DEL ESTADO DE GUERRERO', url: `${GUERRERO_BASE}/LEY-DEL-FONDO-AUXILIAR-DEL-TRIBUNAL-DE-LO-CONTENCIOSO-ADMINISTRATIVO-DEL-ESTADO-DE-GUERRERO-61-2021-03-10.pdf` },
        { nombre: 'LEY NUMERO 696 DE LA COMISIÓN DE LOS DERECHOS HUMANOS DEL ESTADO DE GUERRERO', url: `${GUERRERO_BASE}/LEY-DE-LA-COMISION-DE-LOS-DERECHOS-HUMANOS-DEL-ESTADO-DE-GUERRERO-696.pdf` },
        { nombre: 'LEY NUMERO 814 DE DESARROLLO RURAL SUSTENTABLE DEL ESTADO DE GUERRERO', url: `${GUERRERO_BASE}/ley-de-desarrollo-rural-sustentable-del-estado-de-guerrero-814-2023-06-14.pdf` },
        { nombre: 'LEY NUMERO 851 DE AMNISTÍA DEL ESTADO DE GUERRERO', url: `${GUERRERO_BASE}/LEY-NUMERO-851-DE-AMNISTIA-DEL-ESTADO-DE-GUERRERO.pdf` },
        { nombre: 'LEY NÚMERO 026 PARA EL BIENESTAR DEL ESTADO DE GUERRERO', url: `${GUERRERO_BASE}/ley-para-el-bienestar-estado-guerrero.pdf` },
        { nombre: 'LEY NÚMERO 028 DE INGRESOS PARA EL MUNICIPIO DE ACATEPEC DEL ESTADO DE GUERRERO, PARA EL EJERCICIO FISCAL 2025.', url: `${GUERRERO_BASE}/ley-numero-028-de-ingresos-para-el-municipio-de-acatepec-del-estado-de-guerrero-para-el-ejercicio-fiscal-2025-fb314.pdf` },
        { nombre: 'LEY NÚMERO 029 DE INGRESOS PARA EL MUNICIPIO DE AHUACUOTZINGO DEL ESTADO DE GUERRERO, PARA EL EJERCICIO FISCAL 2025.', url: `${GUERRERO_BASE}/ley-numero-029-de-ingresos-para-el-municipio-de-ahuacuotzingo-del-estado-de-guerrero-para-el-ejercicio-fiscal-2025-91ff6.pdf` },
        { nombre: 'LEY NÚMERO 030 DE INGRESOS PARA EL MUNICIPIO DE AJUCHITLÁN DEL PROGRESO DEL ESTADO DE GUERRERO, PARA EL EJERCICIO FISCAL 2025.', url: `${GUERRERO_BASE}/ley-numero-030-de-ingresos-para-el-municipio-de-ajuchitlan-del-progreso-del-estado-de-guerrero-para-el-ejercicio-fiscal-2025-2d4aa.pdf` },
        { nombre: 'LEY NÚMERO 031 DE INGRESOS PARA EL MUNICIPIO DE ALCOZAUCA DE GUERRERO DEL ESTADO DE GUERRERO, PARA EL EJERCICIO FISCAL 2025.', url: `${GUERRERO_BASE}/ley-numero-031-de-ingresos-para-el-municipio-de-alcozauca-de-guerrero-del-estado-de-guerrero-para-el-ejercicio-fiscal-2025-bcd97.pdf` },
        { nombre: 'LEY NÚMERO 032 DE INGRESOS PARA EL MUNICIPIO DE ALPOYECA DEL ESTADO DE GUERRERO, PARA EL EJERCICIO FISCAL 2025.', url: `${GUERRERO_BASE}/ley-numero-032-de-ingresos-para-el-municipio-de-alpoyeca-del-estado-de-guerrero-para-el-ejercicio-fiscal-2025-40e8c.pdf` },
        { nombre: 'LEY NÚMERO 033 DE INGRESOS PARA EL MUNICIPIO DE ARCELIA DEL ESTADO DE GUERRERO, PARA EL EJERCICIO FISCAL 2025.', url: `${GUERRERO_BASE}/ley-numero-033-de-ingresos-para-el-municipio-de-arcelia-del-estado-de-guerrero-para-el-ejercicio-fiscal-2025-5cd07.pdf` },
        { nombre: 'LEY NÚMERO 034 DE INGRESOS PARA EL MUNICIPIO DE ATENANGO DEL RÍO DEL ESTADO DE GUERRERO, PARA EL EJERCICIO FISCAL 2025.', url: `${GUERRERO_BASE}/ley-numero-034-de-ingresos-para-el-municipio-de-atenango-del-rio-del-estado-de-guerrero-para-el-ejercicio-fiscal-2025-122a6.pdf` },
        { nombre: 'LEY NÚMERO 035 DE INGRESOS PARA EL MUNICIPIO DE ATLAMAJALCINGO DEL MONTE DEL ESTADO DE GUERRERO, PARA EL EJERCICIO FISCAL 2025.', url: `${GUERRERO_BASE}/ley-numero-035-de-ingresos-para-el-municipio-de-atlamajalcingo-del-monte-del-estado-de-guerrero-para-el-ejercicio-fiscal-2025-221db.pdf` },
        { nombre: 'LEY NÚMERO 036 DE INGRESOS PARA EL MUNICIPIO DE ATOYAC DE ÁLVAREZ DEL ESTADO DE GUERRERO, PARA EL EJERCICIO FISCAL 2025.', url: `${GUERRERO_BASE}/ley-numero-036-de-ingresos-para-el-municipio-de-atoyac-de-alvarez-del-estado-de-guerrero-para-el-ejercicio-fiscal-2025-f063b.pdf` },
        { nombre: 'LEY NÚMERO 037 DE INGRESOS PARA EL MUNICIPIO DE AYUTLA DE LOS LIBRES DEL ESTADO DE GUERRERO, PARA EL EJERCICIO FISCAL 2025.', url: `${GUERRERO_BASE}/ley-numero-037-de-ingresos-para-el-municipio-de-ayutla-de-los-libres-del-estado-de-guerrero-para-el-ejercicio-fiscal-2025-0c0ad.pdf` },
        { nombre: 'LEY NÚMERO 038 DE INGRESOS PARA EL MUNICIPIO DE AZOYÚ DEL ESTADO DE GUERRERO, PARA EL EJERCICIO FISCAL 2025.', url: `${GUERRERO_BASE}/ley-numero-038-de-ingresos-para-el-municipio-de-azoyu-del-estado-de-guerrero-para-el-ejercicio-fiscal-2025-f1517.pdf` },
        { nombre: 'LEY NÚMERO 039 DE INGRESOS PARA EL MUNICIPIO DE BENITO JUÁREZ DEL ESTADO DE GUERRERO, PARA EL EJERCICIO FISCAL 2025.', url: `${GUERRERO_BASE}/ley-numero-039-de-ingresos-para-el-municipio-de-benito-juarez-del-estado-de-guerrero-para-el-ejercicio-fiscal-2025-5757d.pdf` },
        { nombre: 'LEY NÚMERO 040 DE INGRESOS PARA EL MUNICIPIO DE BUENAVISTA DE CUELLAR DEL ESTADO DE GUERRERO, PARA EL EJERCICIO FISCAL 2025.', url: `${GUERRERO_BASE}/ley-numero-040-de-ingresos-para-el-municipio-de-buenavista-de-cuellar-del-estado-de-guerrero-para-el-ejercicio-fiscal-2025-2f3f2.pdf` },
        { nombre: 'LEY NÚMERO 041 DE INGRESOS PARA EL MUNICIPIO DE COAHUAYUTLA DE JOSÉ MARÍA IZAZAGA DEL ESTADO DE GUERRERO, PARA EL EJERCICIO FISCAL 2025.', url: `${GUERRERO_BASE}/ley-numero-041-de-ingresos-para-el-municipio-de-coahuayutla-de-jose-maria-izazaga-del-estado-de-guerrero-para-el-ejercicio-fiscal-2025-fb7a5.pdf` },
        { nombre: 'LEY NÚMERO 042 DE INGRESOS PARA EL MUNICIPIO DE COCHOAPA EL GRANDE DEL ESTADO DE GUERRERO, PARA EL EJERCICIO FISCAL 2025.', url: `${GUERRERO_BASE}/ley-numero-042-de-ingresos-para-el-municipio-de-cochoapa-el-grande-del-estado-de-guerrero-para-el-ejercicio-fiscal-2025-070f3.pdf` },
        { nombre: 'LEY NÚMERO 043 DE INGRESOS PARA EL MUNICIPIO DE COCULA DEL ESTADO DE GUERRERO, PARA EL EJERCICIO FISCAL 2025.', url: `${GUERRERO_BASE}/ley-numero-043-de-ingresos-para-el-municipio-de-cocula-del-estado-de-guerrero-para-el-ejercicio-fiscal-2025-4977a.pdf` },
        { nombre: 'LEY NÚMERO 044 DE INGRESOS PARA EL MUNICIPIO COPALILLO DEL ESTADO DE GUERRERO, PARA EL EJERCICIO FISCAL 2025.', url: `${GUERRERO_BASE}/ley-numero-044-de-ingresos-para-el-municipio-copalillo-del-estado-de-guerrero-para-el-ejercicio-fiscal-2025-fb531.pdf` },
        { nombre: 'LEY NÚMERO 045 DE INGRESOS PARA EL MUNICIPIO DE COPANATOYAC DEL ESTADO DE GUERRERO, PARA EL EJERCICIO FISCAL 2025.', url: `${GUERRERO_BASE}/ley-numero-045-de-ingresos-para-el-municipio-de-copanatoyac-del-estado-de-guerrero-para-el-ejercicio-fiscal-2025-3d7ca.pdf` },
        { nombre: 'LEY NÚMERO 046 DE INGRESOS PARA EL MUNICIPIO DE COYUCA DE BENÍTEZ DEL ESTADO DE GUERRERO, PARA EL EJERCICIO FISCAL 2025.', url: `${GUERRERO_BASE}/ley-numero-046-de-ingresos-para-el-municipio-de-coyuca-de-benitez-del-estado-de-guerrero-para-el-ejercicio-fiscal-2025-f8f2c.pdf` },
        { nombre: 'LEY NÚMERO 047 DE INGRESOS PARA EL MUNICIPIO COYUCA DE CATALÁN DEL ESTADO DE GUERRERO, PARA EL EJERCICIO FISCAL 2025.', url: `${GUERRERO_BASE}/ley-numero-047-de-ingresos-para-el-municipio-coyuca-de-catalan-del-estado-de-guerrero-para-el-ejercicio-fiscal-2025-f4435.pdf` },
        { nombre: 'LEY NÚMERO 048 DE INGRESOS PARA EL MUNICIPIO DE CUALÁC DEL ESTADO DE GUERRERO, PARA EL EJERCICIO FISCAL 2025.', url: `${GUERRERO_BASE}/ley-numero-048-de-ingresos-para-el-municipio-de-cualac-del-estado-de-guerrero-para-el-ejercicio-fiscal-2025-1e6d7.pdf` },
        { nombre: 'LEY NÚMERO 049 DE INGRESOS PARA EL MUNICIPIO DE CUETZALA DEL PROGRESO DEL ESTADO DE GUERRERO, PARA EL EJERCICIO FISCAL 2025.', url: `${GUERRERO_BASE}/ley-numero-049-de-ingresos-para-el-municipio-de-cuetzala-del-progreso-del-estado-de-guerrero-para-el-ejercicio-fiscal-2025-46529.pdf` },
        { nombre: 'LEY NÚMERO 050 DE INGRESOS PARA EL MUNICIPIO DE CUTZAMALA DE PINZÓN DEL ESTADO DE GUERRERO, PARA EL EJERCICIO FISCAL 2025.', url: `${GUERRERO_BASE}/ley-numero-050-de-ingresos-para-el-municipio-de-cutzamala-de-pinzon-del-estado-de-guerrero-para-el-ejercicio-fiscal-2025-f7865.pdf` },
        { nombre: 'LEY NÚMERO 051 DE INGRESOS PARA EL MUNICIPIO DE EDUARDO NERI DEL ESTADO DE GUERRERO, PARA EL EJERCICIO FISCAL 2025.', url: `${GUERRERO_BASE}/ley-numero-051-de-ingresos-para-el-municipio-de-eduardo-neri-del-estado-de-guerrero-para-el-ejercicio-fiscal-2025-9e9ae.pdf` },
        { nombre: 'LEY NÚMERO 052 DE INGRESOS PARA EL MUNICIPIO DE GENERAL HELIODORO CASTILLO DEL ESTADO DE GUERRERO, PARA EL EJERCICIO FISCAL 2025.', url: `${GUERRERO_BASE}/ley-numero-052-de-ingresos-para-el-municipio-de-general-heliodoro-castillo-del-estado-de-guerrero-para-el-ejercicio-fiscal-2025-d28ee.pdf` },
        { nombre: 'LEY NÚMERO 072 DE INGRESOS PARA EL MUNICIPIO DE HUAMUXTITLÁN DEL ESTADO DE GUERRERO, PARA EL EJERCICIO FISCAL 2025.', url: `${GUERRERO_BASE}/ley-numero-072-de-ingresos-para-el-municipio-de-huamuxtitlan-del-estado-de-guerrero-para-el-ejercicio-fiscal-2025-bf31f.pdf` },
        { nombre: 'LEY NÚMERO 073 DE INGRESOS PARA EL MUNICIPIO DE IGUALAPA DEL ESTADO DE GUERRERO, PARA EL EJERCICIO FISCAL 2025.', url: `${GUERRERO_BASE}/ley-numero-073-de-ingresos-para-el-municipio-de-igualapa-del-estado-de-guerrero-para-el-ejercicio-fiscal-2025-25616.pdf` },
        { nombre: 'LEY NÚMERO 074 DE INGRESOS PARA EL MUNICIPIO DE ILIATENCO DEL ESTADO DE GUERRERO, PARA EL EJERCICIO FISCAL 2025.', url: `${GUERRERO_BASE}/ley-numero-074-de-ingresos-para-el-municipio-de-iliatenco-del-estado-de-guerrero-para-el-ejercicio-fiscal-2025-0bb9d.pdf` },
        { nombre: 'LEY NÚMERO 075 DE INGRESOS PARA EL MUNICIPIO DE IXCATEOPAN DE CUAUHTÉMOC DEL ESTADO DE GUERRERO, PARA EL EJERCICIO FISCAL 2025.', url: `${GUERRERO_BASE}/ley-numero-075-de-ingresos-para-el-municipio-de-ixcateopan-de-cuauhtemoc-del-estado-de-guerrero-para-el-ejercicio-fiscal-2025-985d4.pdf` },
        { nombre: 'LEY NÚMERO 076 DE CIENCIA, TECNOLOGÍA E INNOVACIÓN DEL ESTADO DE GUERRERO', url: `${GUERRERO_BASE}/ley-numero-076-de-ciencia-tecnologia-e-innovacion-del-estado-de-guerrero-07-02-2024.pdf` },
        { nombre: 'LEY NÚMERO 076 DE INGRESOS PARA EL MUNICIPIO DE JOSÉ JOAQUÍN DE HERRERA DEL ESTADO DE GUERRERO, PARA EL EJERCICIO FISCAL 2025.', url: `${GUERRERO_BASE}/ley-numero-076-de-ingresos-para-el-municipio-de-jose-joaquin-de-herrera-del-estado-de-guerrero-para-el-ejercicio-fiscal-2025-56567.pdf` },
        { nombre: 'LEY NÚMERO 077 DE INGRESOS PARA EL MUNICIPIO DE JUAN R. ESCUDERO DEL ESTADO DE GUERRERO, PARA EL EJERCICIO FISCAL 2025.', url: `${GUERRERO_BASE}/ley-numero-077-de-ingresos-para-el-municipio-de-juan-r-escudero-del-estado-de-guerrero-para-el-ejercicio-fiscal-2025-24349.pdf` },
        { nombre: 'LEY NÚMERO 078 DE INGRESOS PARA EL MUNICIPIO DE LA UNIÓN DE ISIDORO MONTES DE OCA DEL ESTADO DE GUERRERO, PARA EL EJERCICIO FISCAL 2025.', url: `${GUERRERO_BASE}/ley-numero-078-de-ingresos-para-el-municipio-de-la-union-de-isidoro-montes-de-oca-del-estado-de-guerrero-para-el-ejercicio-fiscal-2025-e89bf.pdf` },
        { nombre: 'LEY NÚMERO 079 DE INGRESOS PARA EL MUNICIPIO DE LAS VIGAS DEL ESTADO DE GUERRERO, PARA EL EJERCICIO FISCAL 2025.', url: `${GUERRERO_BASE}/ley-numero-079-de-ingresos-para-el-municipio-de-las-vigas-del-estado-de-guerrero-para-el-ejercicio-fiscal-2025-01830.pdf` },
        { nombre: 'LEY NÚMERO 080 DE INGRESOS PARA EL MUNICIPIO DE MÁRTIR DE CUILAPAN DEL ESTADO DE GUERRERO, PARA EL EJERCICIO FISCAL 2025.', url: `${GUERRERO_BASE}/ley-numero-080-de-ingresos-para-el-municipio-de-martir-de-cuilapan-del-estado-de-guerrero-para-el-ejercicio-fiscal-2025-72d64.pdf` },
        { nombre: 'LEY NÚMERO 081 DE INGRESOS PARA EL MUNICIPIO DE METLATÓNOC DEL ESTADO DE GUERRERO, PARA EL EJERCICIO FISCAL 2025.', url: `${GUERRERO_BASE}/ley-numero-081-de-ingresos-para-el-municipio-de-metlatonoc-del-estado-de-guerrero-para-el-ejercicio-fiscal-2025-40d56.pdf` },
        { nombre: 'LEY NÚMERO 082 DE INGRESOS PARA EL MUNICIPIO DE MOCHITLÁN DEL ESTADO DE GUERRERO, PARA EL EJERCICIO FISCAL 2025.', url: `${GUERRERO_BASE}/ley-numero-082-de-ingresos-para-el-municipio-de-mochitlan-del-estado-de-guerrero-para-el-ejercicio-fiscal-2025-ee54f.pdf` },
        { nombre: 'LEY NÚMERO 083 DE INGRESOS PARA EL MUNICIPIO DE OLINALÁ DEL ESTADO DE GUERRERO, PARA EL EJERCICIO FISCAL 2025.', url: `${GUERRERO_BASE}/ley-numero-083-de-ingresos-para-el-municipio-de-olinala-del-estado-de-guerrero-para-el-ejercicio-fiscal-2025-d8dc8.pdf` },
        { nombre: 'LEY NÚMERO 084 DE INGRESOS PARA EL MUNICIPIO DE OMETEPEC DEL ESTADO DE GUERRERO, PARA EL EJERCICIO FISCAL 2025.', url: `${GUERRERO_BASE}/ley-numero-084-de-ingresos-para-el-municipio-de-ometepec-del-estado-de-guerrero-para-el-ejercicio-fiscal-2025-8b57e.pdf` },
        { nombre: 'LEY NÚMERO 085 DE INGRESOS PARA EL MUNICIPIO DE PETATLÁN DEL ESTADO DE GUERRERO, PARA EL EJERCICIO FISCAL 2025.', url: `${GUERRERO_BASE}/ley-numero-085-de-ingresos-para-el-municipio-de-petatlan-del-estado-de-guerrero-para-el-ejercicio-fiscal-2025-2f73a.pdf` },
        { nombre: 'LEY NÚMERO 086 DE INGRESOS PARA EL MUNICIPIO DE PILCAYA DEL ESTADO DE GUERRERO, PARA EL EJERCICIO FISCAL 2025.', url: `${GUERRERO_BASE}/ley-numero-086-de-ingresos-para-el-municipio-de-pilcaya-del-estado-de-guerrero-para-el-ejercicio-fiscal-2025-c0fec.pdf` },
        { nombre: 'LEY NÚMERO 087 DE INGRESOS PARA EL MUNICIPIO DE PUNGARABATO DEL ESTADO DE GUERRERO, PARA EL EJERCICIO FISCAL 2025.', url: `${GUERRERO_BASE}/ley-numero-087-de-ingresos-para-el-municipio-de-pungarabato-del-estado-de-guerrero-para-el-ejercicio-fiscal-2025-0b3bf.pdf` },
        { nombre: 'LEY NÚMERO 088 DE INGRESOS PARA EL MUNICIPIO DE QUECHULTENANGO DEL ESTADO DE GUERRERO, PARA EL EJERCICIO FISCAL 2025.', url: `${GUERRERO_BASE}/ley-numero-088-de-ingresos-para-el-municipio-de-quechultenango-del-estado-de-guerrero-para-el-ejercicio-fiscal-2025-43776.pdf` },
        { nombre: 'LEY NÚMERO 089 DE INGRESOS PARA EL MUNICIPIO DE SAN LUIS ACATLÁN DEL ESTADO DE GUERRERO, PARA EL EJERCICIO FISCAL 2025.', url: `${GUERRERO_BASE}/ley-numero-089-de-ingresos-para-el-municipio-de-san-luis-acatlan-del-estado-de-guerrero-para-el-ejercicio-fiscal-2025-f5904.pdf` },
        { nombre: 'LEY NÚMERO 090 DE INGRESOS PARA EL MUNICIPIO DE SAN MIGUEL TOTOLAPAN DEL ESTADO DE GUERRERO, PARA EL EJERCICIO FISCAL 2025.', url: `${GUERRERO_BASE}/ley-numero-090-de-ingresos-para-el-municipio-de-san-miguel-totolapan-del-estado-de-guerrero-para-el-ejercicio-fiscal-2025-c68fe.pdf` },
        { nombre: 'LEY NÚMERO 091 DE INGRESOS PARA EL MUNICIPIO DE SAN NICOLÁS DEL ESTADO DE GUERRERO, PARA EL EJERCICIO FISCAL 2025.', url: `${GUERRERO_BASE}/ley-numero-091-de-ingresos-para-el-municipio-de-san-nicolas-del-estado-de-guerrero-para-el-ejercicio-fiscal-2025-23022.pdf` },
        { nombre: 'LEY NÚMERO 092 DE INGRESOS PARA EL MUNICIPIO DE TECOANAPA DEL ESTADO DE GUERRERO, PARA EL EJERCICIO FISCAL 2025.', url: `${GUERRERO_BASE}/ley-numero-092-de-ingresos-para-el-municipio-de-tecoanapa-del-estado-de-guerrero-para-el-ejercicio-fiscal-2025-23a26.pdf` },
        { nombre: 'LEY NÚMERO 093 DE INGRESOS PARA EL MUNICIPIO DE TETIPAC DEL ESTADO DE GUERRERO, PARA EL EJERCICIO FISCAL 2025.', url: `${GUERRERO_BASE}/ley-numero-093-de-ingresos-para-el-municipio-de-tetipac-del-estado-de-guerrero-para-el-ejercicio-fiscal-2025-994bf.pdf` },
        { nombre: 'LEY NÚMERO 094 DE INGRESOS PARA EL MUNICIPIO DE TLACOACHISTLAHUACA DEL ESTADO DE GUERRERO, PARA EL EJERCICIO FISCAL 2025.', url: `${GUERRERO_BASE}/ley-numero-094-de-ingresos-para-el-municipio-de-tlacoachistlahuaca-del-estado-de-guerrero-para-el-ejercicio-fiscal-2025-bbcea.pdf` },
        { nombre: 'LEY NÚMERO 095 DE INGRESOS PARA EL MUNICIPIO DE TLAPEHUALA DEL ESTADO DE GUERRERO, PARA EL EJERCICIO FISCAL 2025.', url: `${GUERRERO_BASE}/ley-numero-095-de-ingresos-para-el-municipio-de-tlapehuala-del-estado-de-guerrero-para-el-ejercicio-fiscal-2025-d9d80.pdf` },
        { nombre: 'LEY NÚMERO 096 DE INGRESOS PARA EL MUNICIPIO DE SANTA CRUZ DEL RINCÓN DEL ESTADO DE GUERRERO, PARA EL EJERCICIO FISCAL 2025.', url: `${GUERRERO_BASE}/ley-numero-096-de-ingresos-para-el-municipio-de-santa-cruz-del-rincon-del-estado-de-guerrero-para-el-ejercicio-fiscal-2025-73637.pdf` },
        { nombre: 'LEY NÚMERO 097 DE INGRESOS PARA EL MUNICIPIO DE TECPAN DE GALEANA DEL ESTADO DE GUERRERO, PARA EL EJERCICIO FISCAL 2025.', url: `${GUERRERO_BASE}/ley-numero-097-de-ingresos-para-el-municipio-de-tecpan-de-galeana-del-estado-de-guerrero-para-el-ejercicio-fiscal-2025-09ba2.pdf` },
        { nombre: 'LEY NÚMERO 098 DE INGRESOS PARA EL MUNICIPIO DE TELOLOAPAN DEL ESTADO DE GUERRERO, PARA EL EJERCICIO FISCAL 2025.', url: `${GUERRERO_BASE}/ley-numero-098-de-ingresos-para-el-municipio-de-teloloapan-del-estado-de-guerrero-para-el-ejercicio-fiscal-2025-50a1a.pdf` },
        { nombre: 'LEY NÚMERO 099 DE INGRESOS PARA EL MUNICIPIO DE TLALCHAPA DEL ESTADO DE GUERRERO, PARA EL EJERCICIO FISCAL 2025.', url: `${GUERRERO_BASE}/ley-numero-099-de-ingresos-para-el-municipio-de-tlalchapa-del-estado-de-guerrero-para-el-ejercicio-fiscal-2025-713d9.pdf` },
        { nombre: 'LEY NÚMERO 100 DE INGRESOS PARA EL MUNICIPIO DE XALPATLÁHUACDEL ESTADO DE GUERRERO, PARA EL EJERCICIO FISCAL 2025.', url: `${GUERRERO_BASE}/ley-numero-100-de-ingresos-para-el-municipio-de-xalpatlahuacdel-estado-de-guerrero-para-el-ejercicio-fiscal-2025-23147.pdf` },
        { nombre: 'LEY NÚMERO 101 DE INGRESOS PARA EL MUNICIPIO DE XOCHIHUEHUETLÁN DEL ESTADO GUERRERO, PARA EL EJERCICIO FISCAL 2025.', url: `${GUERRERO_BASE}/ley-numero-101-de-ingresos-para-el-municipio-de-xochihuehuetlan-del-estado-guerrero-para-el-ejercicio-fiscal-2025-48bf8.pdf` },
        { nombre: 'LEY NÚMERO 102 DE INGRESOS PARA EL MUNICIPIO DE XOCHISTLAHUACA DEL ESTADO DE GUERRERO, PARA EL EJERCICIO FISCAL 2025.', url: `${GUERRERO_BASE}/ley-numero-102-de-ingresos-para-el-municipio-de-xochistlahuaca-del-estado-de-guerrero-para-el-ejercicio-fiscal-2025-59030.pdf` },
        { nombre: 'LEY NÚMERO 103 DE INGRESOS PARA EL MUNICIPIO DE ZIRÁNDARO DEL ESTADO DE GUERRERO, PARA EL EJERCICIO FISCAL 2025.', url: `${GUERRERO_BASE}/ley-numero-103-de-ingresos-para-el-municipio-de-zirandaro-del-estado-de-guerrero-para-el-ejercicio-fiscal-2025-c412f.pdf` },
        { nombre: 'LEY NÚMERO 104 DE INGRESOS PARA EL MUNICIPIO DE ZITLALA DEL ESTADO DE GUERRERO, PARA EL EJERCICIO FISCAL 2025.', url: `${GUERRERO_BASE}/ley-numero-104-de-ingresos-para-el-municipio-de-zitlala-del-estado-de-guerrero-para-el-ejercicio-fiscal-2025-525f0.pdf` },
        { nombre: 'LEY NÚMERO 105 DE INGRESOS PARA EL MUNICIPIO DE APAXTLA DE CASTREJÓN DEL ESTADO DE GUERRERO, PARA EL EJERCICIO FISCAL 2025.', url: `${GUERRERO_BASE}/ley-numero-105-de-ingresos-para-el-municipio-de-apaxtla-de-castrejon-del-estado-de-guerrero-para-el-ejercicio-fiscal-2025-1a79a.pdf` },
        { nombre: 'LEY NÚMERO 106 DE INGRESOS PARA EL MUNICIPIO DE ATLIXTAC DEL ESTADO DE GUERRERO, PARA EL EJERCICIO FISCAL 2025.', url: `${GUERRERO_BASE}/ley-numero-106-de-ingresos-para-el-municipio-de-atlixtac-del-estado-de-guerrero-para-el-ejercicio-fiscal-2025-5fe46.pdf` },
        { nombre: 'LEY NÚMERO 107 DE INGRESOS PARA EL MUNICIPIO DE COPALA DEL ESTADO DE GUERRERO, PARA EL EJERCICIO FISCAL 2025.', url: `${GUERRERO_BASE}/ley-numero-107-de-ingresos-para-el-municipio-de-copala-del-estado-de-guerrero-para-el-ejercicio-fiscal-2025-5ed22.pdf` },
        { nombre: 'LEY NÚMERO 108 DE INGRESOS PARA EL MUNICIPIO DE CUAJINICUILAPA DEL ESTADO DE GUERRERO, PARA EL EJERCICIO FISCAL 2025.', url: `${GUERRERO_BASE}/ley-numero-108-de-ingresos-para-el-municipio-de-cuajinicuilapa-del-estado-de-guerrero-para-el-ejercicio-fiscal-2025-5fff8.pdf` },
        { nombre: 'LEY NÚMERO 109 DE INGRESOS PARA EL MUNICIPIO DE CUAUTEPEC DEL ESTADO DE GUERRERO, PARA EL EJERCICIO FISCAL 2025.', url: `${GUERRERO_BASE}/ley-numero-109-de-ingresos-para-el-municipio-de-cuautepec-del-estado-de-guerrero-para-el-ejercicio-fiscal-2025-ce53d.pdf` },
        { nombre: 'LEY NÚMERO 110 DE INGRESOS PARA EL MUNICIPIO DE FLORENCIO VILLARREAL DEL ESTADO DE GUERRERO, PARA EL EJERCICIO FISCAL 2025.', url: `${GUERRERO_BASE}/ley-numero-110-de-ingresos-para-el-municipio-de-florencio-villarreal-del-estado-de-guerrero-para-el-ejercicio-fiscal-2025-02b72.pdf` },
        { nombre: 'LEY NÚMERO 111 DE INGRESOS PARA EL MUNICIPIO DE GENERAL CANUTO A. NERI DEL ESTADO DE GUERRERO, PARA EL EJERCICIO FISCAL 2025.', url: `${GUERRERO_BASE}/ley-numero-111-de-ingresos-para-el-municipio-de-general-canuto-a-neri-del-estado-de-guerrero-para-el-ejercicio-fiscal-2025-73088.pdf` },
        { nombre: 'LEY NÚMERO 112 DE INGRESOS PARA EL MUNICIPIO DE HUITZUCO DE LOS FIGUEROA DEL ESTADO DE GUERRERO, PARA EL EJERCICIO FISCAL 2025.', url: `${GUERRERO_BASE}/ley-numero-112-de-ingresos-para-el-municipio-de-huitzuco-de-los-figueroa-del-estado-de-guerrero-para-el-ejercicio-fiscal-2025-f9548.pdf` },
        { nombre: 'LEY NÚMERO 113 DE INGRESOS PARA EL MUNICIPIO DE JUCHITÁN DEL ESTADO DE GUERRERO, PARA EL EJERCICIO FISCAL 2025.', url: `${GUERRERO_BASE}/ley-numero-113-de-ingresos-para-el-municipio-de-juchitan-del-estado-de-guerrero-para-el-ejercicio-fiscal-2025-38768.pdf` },
        { nombre: 'LEY NÚMERO 114 DE INGRESOS PARA EL MUNICIPIO DE LEONARDO BRAVO DEL ESTADO DE GUERRERO, PARA EL EJERCICIO FISCAL 2025.', url: `${GUERRERO_BASE}/ley-numero-114-de-ingresos-para-el-municipio-de-leonardo-bravo-del-estado-de-guerrero-para-el-ejercicio-fiscal-2025-cf493.pdf` },
        { nombre: 'LEY NÚMERO 115 DE INGRESOS PARA EL MUNICIPIO DE MALINALTEPEC DEL ESTADO DE GUERRERO, PARA EL EJERCICIO FISCAL 2025.', url: `${GUERRERO_BASE}/ley-numero-115-de-ingresos-para-el-municipio-de-malinaltepec-del-estado-de-guerrero-para-el-ejercicio-fiscal-2025-8b90f.pdf` },
        { nombre: 'LEY NÚMERO 116 DE INGRESOS PARA EL MUNICIPIO DE MARQUELIA DEL ESTADO DE GUERRERO, PARA EL EJERCICIO FISCAL 2025.', url: `${GUERRERO_BASE}/ley-numero-116-de-ingresos-para-el-municipio-de-marquelia-del-estado-de-guerrero-para-el-ejercicio-fiscal-2025-0bbd8.pdf` },
        { nombre: 'LEY NÚMERO 117 DE INGRESOS PARA EL MUNICIPIO DE ÑUU SAVI DEL ESTADO DE GUERRERO, PARA EL EJERCICIO FISCAL 2025.', url: `${GUERRERO_BASE}/ley-numero-117-de-ingresos-para-el-municipio-de-nuu-savi-del-estado-de-guerrero-para-el-ejercicio-fiscal-2025-c739c.pdf` },
        { nombre: 'LEY NÚMERO 1173 DE VOLUNTAD ANTICIPADA PARA EL ESTADO DE GUERRERO', url: `${GUERRERO_BASE}/LEY-DE-VOLUNTAD-ANTICIPADA-PARA-EL-ESTADO-DE-GUERRERO-1173-2021-03-10.pdf` },
        { nombre: 'LEY NÚMERO 118 DE INGRESOS PARA EL MUNICIPIO DE PEDRO ASCENCIO ALQUISIRAS DEL ESTADO DE GUERRERO, PARA EL EJERCICIO FISCAL 2025.', url: `${GUERRERO_BASE}/ley-numero-118-de-ingresos-para-el-municipio-de-pedro-ascencio-alquisiras-del-estado-de-guerrero-para-el-ejercicio-fiscal-2025-a8005.pdf` },
        { nombre: 'LEY NÚMERO 119 DE INGRESOS PARA EL MUNICIPIO DE SAN MARCOS DEL ESTADO DE GUERRERO, PARA EL EJERCICIO FISCAL 2025.', url: `${GUERRERO_BASE}/ley-numero-119-de-ingresos-para-el-municipio-de-san-marcos-del-estado-de-guerrero-para-el-ejercicio-fiscal-2025-b25b9.pdf` },
        { nombre: 'LEY NÚMERO 120 DE INGRESOS PARA EL MUNICIPIO DE TEPECOACUILCO DE TRUJANO DEL ESTADO DE GUERRERO, PARA EL EJERCICIO FISCAL 2025.', url: `${GUERRERO_BASE}/ley-numero-120-de-ingresos-para-el-municipio-de-tepecoacuilco-de-trujano-del-estado-de-guerrero-para-el-ejercicio-fiscal-2025-59f70.pdf` },
        { nombre: 'LEY NÚMERO 121 DE INGRESOS PARA EL MUNICIPIO DE TIXTLA DE GUERRERO DEL ESTADO DE GUERRERO, PARA EL EJERCICIO FISCAL 2025.', url: `${GUERRERO_BASE}/ley-numero-121-de-ingresos-para-el-municipio-de-tixtla-de-guerrero-del-estado-de-guerrero-para-el-ejercicio-fiscal-2025-d0327.pdf` },
        { nombre: 'LEY NÚMERO 1212 DE SALUD DEL ESTADO DE GUERRERO.', url: `${GUERRERO_BASE}/LEY-DE-SALUD-DEL-ESTADO-DE-GUERRERO-1212.pdf` },
        { nombre: 'LEY NÚMERO 122 DE INGRESOS PARA EL MUNICIPIO DE TLACOAPA DEL ESTADO DE GUERRERO, PARA EL EJERCICIO FISCAL 2025.', url: `${GUERRERO_BASE}/ley-numero-122-de-ingresos-para-el-municipio-de-tlacoapa-del-estado-de-guerrero-para-el-ejercicio-fiscal-2025-6336f.pdf` },
        { nombre: 'LEY NÚMERO 123 DE INGRESOS PARA EL MUNICIPIO TLALIXTAQUILLA DE MALDONADO DEL ESTADO DE GUERRERO, PARA EL EJERCICIO FISCAL 2025.', url: `${GUERRERO_BASE}/ley-numero-123-de-ingresos-para-el-municipio-tlalixtaquilla-de-maldonado-del-estado-de-guerrero-para-el-ejercicio-fiscal-2025-7e309.pdf` },
        { nombre: 'LEY NÚMERO 124 DE INGRESOS PARA EL MUNICIPIO DE ZAPOTITLÁN TABLAS DEL ESTADO DE GUERRERO, PARA EL EJERCICIO FISCAL 2025.', url: `${GUERRERO_BASE}/ley-numero-124-de-ingresos-para-el-municipio-de-zapotitlan-tablas-del-estado-de-guerrero-para-el-ejercicio-fiscal-2025-c1e02.pdf` },
        { nombre: 'LEY NÚMERO 125 DE INGRESOS PARA EL MUNICIPIO DE ACAPULCO DE JUÁREZ DEL ESTADO DE GUERRERO, PARA EL EJERCICIO FISCAL 2025.', url: `${GUERRERO_BASE}/ley-numero-125-de-ingresos-para-el-municipio-de-acapulco-de-juarez-del-estado-de-guerrero-para-el-ejercicio-fiscal-2025-a7248.pdf` },
        { nombre: 'LEY NÚMERO 1256 PARA LA PROMOCIÓN DE LA CONVIVENCIA LIBRE DE VIOLENCIA EN EL ENTORNO ESCOLAR DEL ESTADO DE GUERRERO', url: `${GUERRERO_BASE}/LEY-PARA-LA-PROMOCION-DE-LA-CONVIVENCIA-LIBRE-DE-VIOLENCIA-EN-EL-ENTORNO-ESCOLAR-DEL-ESTADO-DE-GUERRERO-1256-2024-03-12.pdf` },
        { nombre: 'LEY NÚMERO 126 DE INGRESOS PARA EL MUNICIPIO DE ZIHUATANEJO DE AZUETA DEL ESTADO DE GUERRERO, PARA EL EJERCICIO FISCAL 2025.', url: `${GUERRERO_BASE}/ley-numero-126-de-ingresos-para-el-municipio-de-zihuatanejo-de-azueta-del-estado-de-guerrero-para-el-ejercicio-fiscal-2025-c75fd.pdf` },
        { nombre: 'LEY NÚMERO 127 DE INGRESOS PARA EL MUNICIPIO DE CHILPANCINGO DE LOS BRAVO DEL ESTADO DE GUERRERO, PARA EL EJERCICIO FISCAL 2025.', url: `${GUERRERO_BASE}/ley-numero-127-de-ingresos-para-el-municipio-de-chilpancingo-de-los-bravo-del-estado-de-guerrero-para-el-ejercicio-fiscal-2025-e8104.pdf` },
        { nombre: 'LEY NÚMERO 128 DE INGRESOS PARA EL MUNICIPIO DE TLAPA DE COMONFORT DEL ESTADO DE GUERRERO, PARA EL EJERCICIO FISCAL 2025.', url: `${GUERRERO_BASE}/ley-numero-128-de-ingresos-para-el-municipio-de-tlapa-de-comonfort-del-estado-de-guerrero-para-el-ejercicio-fiscal-2025-dbdf1.pdf` },
        { nombre: 'LEY NÚMERO 129 DE INGRESOS PARA EL MUNICIPIO DE IGUALA DE LA INDEPENDENCIA DEL ESTADO DE GUERRERO, PARA EL EJERCICIO FISCAL 2025.', url: `${GUERRERO_BASE}/ley-numero-129-de-ingresos-para-el-municipio-de-iguala-de-la-independencia-del-estado-de-guerrero-para-el-ejercicio-fiscal-2025-178a8.pdf` },
        { nombre: 'LEY NÚMERO 130 DE INGRESOS PARA EL MUNICIPIO DE CHILAPA DE ÁLVAREZ DEL ESTADO DE GUERRERO, PARA EL EJERCICIO FISCAL 2025.', url: `${GUERRERO_BASE}/ley-numero-130-de-ingresos-para-el-municipio-de-chilapa-de-alvarez-del-estado-de-guerrero-para-el-ejercicio-fiscal-2025-91a77.pdf` },
        { nombre: 'LEY NÚMERO 131 DE INGRESOS PARA EL MUNICIPIO DE TAXCO DE ALARCÓN DEL ESTADO DE GUERRERO, PARA EL EJERCICIO FISCAL 2025.', url: `${GUERRERO_BASE}/ley-numero-131-de-ingresos-para-el-municipio-de-taxco-de-alarcon-del-estado-de-guerrero-para-el-ejercicio-fiscal-2025-2418e.pdf` },
        { nombre: 'LEY NÚMERO 175 DEL CENTRO DE CONCILIACIÓN LABORAL DEL ESTADO DE GUERRERO', url: `${GUERRERO_BASE}/LEY-DEL CENTRO-DE-CONCILIACION-LABORAL-DEL-ESTADO-DE GUERRERO-175-2022-04-21.pdf` },
        { nombre: 'LEY NÚMERO 18 DE REMUNERACIONES DE LOS SERVIDORES PÚBLICOS DEL ESTADO DE GUERRERO.', url: `${GUERRERO_BASE}/LEY-DE-REMUNERACIONES-DE-LOS-SERVIDORES-PUBLICOS-DEL-ESTADO-DE-GUERRERO-18-2021-08-30.pdf` },
        { nombre: 'LEY NÚMERO 198 DE INGRESOS PARA LOS MUNICIPIOS DEL ESTADO DE GUERRERO, PARA EL EJERCICIO FISCAL 2025.', url: `${GUERRERO_BASE}/ley-numero-198-de-ingresos-para-los-municipios-del-estado-de-guerrero-para-el-ejercicio-fiscal-2025-7c1f0.pdf` },
        { nombre: 'LEY NÚMERO 199 DE INGRESOS DEL ESTADO DE GUERRERO PARA EL EJERCICIO FISCAL 2025.', url: `${GUERRERO_BASE}/ley-numero-199-de-ingresos-del-estado-de-guerrero-para-el-ejercicio-fiscal-2025-6b654.pdf` },
        { nombre: 'LEY NÚMERO 207 DE TRANSPARENCIA Y ACCESO A LA INFORMACIÓN PÚBLICA DEL ESTADO DE GUERRERO', url: `${GUERRERO_BASE}/ley-de-transparencia-y-acceso-a-la-informacion-publica-del-estado-de-guerrero-207-2023-04-27.pdf` },
        { nombre: 'LEY NÚMERO 213 DE ENTREGA RECEPCIÓN DE LAS ADMINISTRACIONES PÚBLICAS DEL ESTADO Y MUNICIPIOS DE GUERRERO', url: `${GUERRERO_BASE}/LEY-DE-ENTREGA-RECEPCION-DE-LAS-ADMINISTRACIONES-PUBLICAS-DEL-ESTADO-Y-MUNICIPIOS-DE-GUERRERO-213-2021-03-10.pdf` },
        { nombre: 'LEY NÚMERO 214 PARA PREVENIR, COMBATIR Y ELIMINAR LA DISCRIMINACIÓN EN EL ESTADO DE GUERRERO', url: `${GUERRERO_BASE}/LEY-PARA-PREVENIR-COMBATIR-Y-ELIMINAR-LA-DISCRIMINACION-EN-EL-ESTADO-DE-GUERRERO-214-2024-03-12.pdf` },
        { nombre: 'LEY NÚMERO 230 DE ADQUISICIONES, ENAJENACIONES, ARRENDAMIENTOS, PRESTACIÓN DE SERVICIOS Y ADMINISTRACIÓN DE BIENES MUEBLES E INMUEBLES DEL ESTADO DE GUERRERO', url: `${GUERRERO_BASE}/LEY-DE-ADQUISICIONES-ENAJENACIONES-ARRENDAMIENTOS-PRESTACION-DE-SERVICIOS-Y-ADMINISTRACION-DE-BIENES-MUEBLES-E-INMUEBLES-DEL-ESTADO-DE-GUERRERO-230-2022-08-12.pdf` },
        { nombre: 'LEY NÚMERO 239 DE RECONOCIMIENTO Y DERECHOS DE LAS PERSONAS DE LA COMUNIDAD LGBTTTIQ+ DEL ESTADO DE GUERRERO', url: `${GUERRERO_BASE}/LEY-DE-RECONOCIMIENTO-LGBTTTIQ-DEL-ESTADO-DE-GUERRERO-239.pdf` },
        { nombre: 'LEY NÚMERO 239 PARA EL FOMENTO Y DESARROLLO DE LA CULTURA Y LAS ARTES DEL ESTADO DE GUERRERO', url: `${GUERRERO_BASE}/LEY-PARA-EL-FOMENTO-Y-DESARROLLO-DE-LA-CULTURA-Y-LAS-ARTES-DEL-ESTADO-DE-GUERRERO-239-2021-03-10.pdf` },
        { nombre: 'LEY NÚMERO 240 DE PROPIEDAD EN CONDOMINIO PARA EL ESTADO DE GUERRERO', url: `${GUERRERO_BASE}/ley-propiedad-en-condominio-240.pdf` },
        { nombre: 'LEY NÚMERO 260 PARA LA PREVENCIÓN Y ATENCIÓN DEL CÁNCER DE MAMA DEL ESTADO DE GUERRERO', url: `${GUERRERO_BASE}/ley-numero-260-para-la-prevencion-y-atencion-del-cancer-de-mama-del-estado-de-guerrero-13-02-2024.pdf` },
        { nombre: 'LEY NÚMERO 266 DE CATASTRO PARA LOS MUNICIPIOS DEL ESTADO DE GUERRERO', url: `${GUERRERO_BASE}/LEY-DE-CATASTRO-PARA-LOS-MUNICIPIOS-DEL-ESTADO-DE-GUERRERO-266-2022-02-25.pdf` },
        { nombre: 'LEY NÚMERO 278 PARA LA PREVENCIÓN SOCIAL DE LA VIOLENCIA Y LA DELINCUENCIA CON PARTICIPACIÓN CIUDADANA DEL ESTADO DE GUERRERO', url: `${GUERRERO_BASE}/LEY-PARA-LA-PREVENCION-Y-ATENCION-DEL-CANCER-DE-MAMA-DEL-ESTADO-DE-GUERRERO-260-2024-03-12.pdf` },
        { nombre: 'LEY NÚMERO 375 DE LOS DERECHOS DE LAS PERSONAS ADULTAS MAYORES DEL ESTADO DE GUERRERO', url: `${GUERRERO_BASE}/LEY-DE-LOS-DERECHOS-DE-LAS-PERSONAS-ADULTAS-MAYORES-DEL-ESTADO-DE-GUERRERO-375-2021-09-21.pdf` },
        { nombre: 'LEY NÚMERO 391 DE PROTECCIÓN DE LOS DEFENSORES DE LOS DERECHOS HUMANOS EN EL ESTADO DE GUERRERO', url: `${GUERRERO_BASE}/LEY-DE-PROTECCION-DE-LOS-DEFENSORES-DE-LOS-DERECHOS-HUMANOS-EN-EL-ESTADO-DE-GUERRERO-391-2021-03-10.pdf` },
        { nombre: 'LEY NÚMERO 393 DE FOMENTO APÍCOLA DEL ESTADO DE GUERRERO', url: `${GUERRERO_BASE}/LEY-DE-FOMENTO-APICOLA-DEL-ESTADO-DE-GUERRERO-393-2021-03-10.pdf` },
        { nombre: 'LEY NÚMERO 417 PARA PREVENIR Y ERRADICAR LA TRATA DE PERSONAS Y PARA LA PROTECCIÓN, ATENCIÓN Y ASISTENCIA DE LAS VÍCTIMAS, OFENDIDOS Y TESTIGOS DE ESTOS DELITOS EN EL ESTADO DE GUERRERO', url: `${GUERRERO_BASE}/LEY-PARA-PREVENIR-Y-ERRADICAR-LA-TRATA-DE-PERSONAS-Y-PARA-LA-PROTECCION-ATENCION-Y-ASISTENCIA-DE-LAS-VICTIMAS-OFENDIDOS-Y-TESTIGOS-DE-ESTOS-DELITOS-EN-EL-ESTADO-DE-GUERRERO-417-2021-03-10.pdf` },
        { nombre: 'LEY NÚMERO 419 DE HACIENDA DEL ESTADO DE GUERRERO', url: `${GUERRERO_BASE}/ley-de-hacienda-del-estado-de-guerrero-419.pdf` },
        { nombre: 'LEY NÚMERO 427 DE ZONAS ECONÓMICAS ESPECIALES DEL ESTADO DE GUERRERO', url: `${GUERRERO_BASE}/LEY-DE-ZONAS-ECONOMICAS-ESPECIALES-DEL-ESTADO-DE-GUERRERO-427-2021-03-10.pdf` },
        { nombre: 'LEY NÚMERO 427 DEL SISTEMA DE COORDINACIÓN HACENDARIA DEL ESTADO DE GUERRERO', url: `${GUERRERO_BASE}/ley-del-sistema-de-coordinacion-hacendaria-del-estado-de-guerrero-427.pdf` },
        { nombre: 'LEY NÚMERO 439 PARA PREVENIR, SANCIONAR Y ERRADICAR LA TORTURA EN EL ESTADO DE GUERRERO', url: `${GUERRERO_BASE}/LEY-PARA-PREVENIR-SANCIONAR-Y-ERRADICAR-LA-TORTURA-EN-EL-ESTADO-DE-GUERRERO-439-2021-03-10.pdf` },
        { nombre: 'LEY NÚMERO 444 PARA LA PROTECCIÓN DEL PATRIMONIO CULTURAL Y NATURAL DEL ESTADO Y LOS MUNICIPIOS DE GUERRERO', url: `${GUERRERO_BASE}/LEY-PARA-LA-PROTECCION-DEL-PATRIMONIO-CULTURAL-Y-NATURAL-DEL-ESTADO-Y-LOS-MUNICIPIOS-DE-GUERRERO-444-2021-03-10.pdf` },
        { nombre: 'LEY NÚMERO 449 QUE REGULA LA VENTA Y EL CONSUMO DE BEBIDAS ALCOHÓLICAS DEL ESTADO DE GUERRERO', url: `${GUERRERO_BASE}/LEY-QUE-REGULA-LA-VENTA-Y-EL-CONSUMO-DE-BEBIDAS-ALCOHOLICAS-DEL-ESTADO-DE-GUERRERO-449-2021-03-10.pdf` },
        { nombre: 'LEY NÚMERO 450 DE VÍCTIMAS DEL ESTADO LIBRE Y SOBERANO DE GUERRERO', url: `${GUERRERO_BASE}/LEY-DE-VICTIMAS-DEL-ESTADO-LIBRE-Y-SOBERANO-DE-GUERRERO-450-2024-03-12.pdf` },
        { nombre: 'LEY NÚMERO 454 DE PRESUPUESTO Y DISCIPLINA FISCAL DEL ESTADO DE GUERRERO', url: `${GUERRERO_BASE}/LEY-DE-PRESUPUESTO-Y-DISCIPLINA-FISCAL-DEL-ESTADO-DE-GUERRERO-454-2021-03-10.pdf` },
        { nombre: 'LEY NÚMERO 455 DE MEJORA REGULATORIA PARA EL ESTADO DE GUERRERO Y SUS MUNICIPIOS', url: `${GUERRERO_BASE}/ley-de-mejora-regulatoria-para-el-estado-de-guerrero-y-sus-municipios-455.pdf` },
        { nombre: 'LEY NÚMERO 456 DEL SISTEMA DE MEDIOS DE IMPUGNACIÓN EN MATERIA ELECTORAL DEL ESTADO DE GUERRERO', url: `${GUERRERO_BASE}/LEY-DEL-SISTEMA-DE-MEDIOS-DE-IMPUGNACION-EN-MATERIA-ELECTORAL-DEL-ESTADO-DE-GUERRERO-456.pdf` },
        { nombre: 'LEY NÚMERO 458 PARA IMPULSAR A LAS ORGANIZACIONES DE LA SOCIEDAD CIVIL EN EL ESTADO DE GUERRERO', url: `${GUERRERO_BASE}/LEY-PARA-IMPULSAR-A-LAS-ORGANIZACIONES-DE-LA-SOCIEDAD-CIVIL-EN-EL-ESTADO-DE-GUERRERO-458-2021-03-10.pdf` },
        { nombre: 'LEY NÚMERO 464 DE EDUCACIÓN DEL ESTADO LIBRE Y SOBERANO DE GUERRERO', url: `${GUERRERO_BASE}/ley-numero-464-de-educacion-del-estado-libre-y-soberano-de-guerrero.pdf` },
        { nombre: 'LEY NÚMERO 464 DEL SISTEMA ESTATAL ANTICORRUPCIÓN DE GUERRERO', url: `${GUERRERO_BASE}/LEY-DEL-SISTEMA-ESTATAL-ANTICORRUPCION-DE-GUERRERO-464-2021-03-10.pdf` },
        { nombre: 'LEY NÚMERO 465 DE RESPONSABILIDADES ADMINISTRATIVAS PARA EL ESTADO DE GUERRERO', url: `${GUERRERO_BASE}/LEY-DE-RESPONSABILIDADES-ADMINISTRATIVAS-PARA-EL-ESTADO-DE-GUERRERO-465.pdf` },
        { nombre: 'LEY NÚMERO 466 DE PROTECCIÓN DE DATOS PERSONALES EN POSESIÓN DE SUJETOS OBLIGADOS DEL ESTADO DE GUERRERO', url: `${GUERRERO_BASE}/LEY-DE-PROTECCION-DE-DATOS-PERSONALES-EN-POSESION-DE-SUJETOS-OBLIGADOS-DEL-ESTADO-DE-GUERRERO-466-.pdf` },
        { nombre: 'LEY NÚMERO 466 DE RESPONSABILIDAD PATRIMONIAL DEL ESTADO DE GUERRERO Y MUNICIPIOS.', url: `${GUERRERO_BASE}/LEY-NUMERO-466-DE-RESPONSABILIDAD-PATRIMONIAL-DEL-ESTADO-DE-GUERRERO-Y-MUNICIPIOS.pdf` },
        { nombre: 'LEY NÚMERO 468 DE FISCALIZACIÓN SUPERIOR Y RENDICIÓN DE CUENTAS DEL ESTADO DE GUERRERO', url: `${GUERRERO_BASE}/ley-de-fiscalizacion-superior-y-rendicion-de-cuentas-del-estado-de-guerrero-468-2023-06-16.pdf` },
        { nombre: 'LEY NÚMERO 469 DE GANADERÍA DEL ESTADO DE GUERRERO', url: `${GUERRERO_BASE}/LEY-DE-GANADERIA-DEL-ESTADO-DE-GUERRERO-469-2021-03-10.pdf` },
        { nombre: 'LEY NÚMERO 474 DE ASCENSOS, ESTÍMULOS Y RECONOCIMIENTOS DE LA POLICÍA DEL ESTADO DE GUERRERO', url: `${GUERRERO_BASE}/LEY-DE-ASCENSOS-ESTIMULOS-Y-RECONOCIMIENTOS-DE-LA-POLICIA-DEL-ESTADO-DE-GUERRERO-474-2021-03-10.pdf` },
        { nombre: 'LEY NÚMERO 478 DE JUSTICIA PARA ADOLESCENTES DEL ESTADO DE GUERRERO', url: `${GUERRERO_BASE}/LEY-DE-JUSTICIA-PARA-ADOLESCENTES-DEL-ESTADO-DE-GUERRERO-478.pdf` },
        { nombre: 'LEY NÚMERO 480 DE SUJETOS PROTEGIDOS DEL ESTADO DE GUERRERO', url: `${GUERRERO_BASE}/LEY-DE-SUJETOS-PROTEGIDOS-DEL-ESTADO-DE-GUERRERO-480-2021-03-10.pdf` },
        { nombre: 'LEY NÚMERO 481 DE EXTINCIÓN DE DOMINIO PARA EL ESTADO DE GUERRERO', url: `${GUERRERO_BASE}/LEY-DE-EXTINCION-DE-DOMINIO-PARA-EL-ESTADO-DE-GUERRERO-481-2021-03-10.pdf` },
        { nombre: 'LEY NÚMERO 483 DE INSTITUCIONES Y PROCEDIMIENTOS ELECTORALES DEL ESTADO DE GUERRERO', url: `${GUERRERO_BASE}/ley-de-instituciones-y-procedimientos-electorales-del-estado-de-guerrero-483-2023-06-28.pdf` },
        { nombre: 'LEY NÚMERO 487 PARA PREVENIR Y ATENDER EL DESPLAZAMIENTO INTERNO EN EL ESTADO DE GUERRERO', url: `${GUERRERO_BASE}/LEY-PARA-PREVENIR-Y-ATENDER-EL-DESPLAZAMIENTO-INTERNO-EN-EL-ESTADO-DE-GUERRERO-487-2021-03-10.pdf` },
        { nombre: 'LEY NÚMERO 488 DE DESARROLLO FORESTAL SUSTENTABLE DEL ESTADO DE GUERRERO', url: `${GUERRERO_BASE}/LEY-DE-DESARROLLO-FORESTAL-SUSTENTABLE-DEL-ESTADO-DE-GUERRERO-488-2021-03-10.pdf` },
        { nombre: 'LEY NÚMERO 489 PARA LA PROTECCIÓN DE PERSONAS EN SITUACIÓN DE RIESGO DEL ESTADO DE GUERRERO', url: `${GUERRERO_BASE}/LEY-PARA-LA-PROTECCION-DE-PERSONAS-EN-SITUACION-DE-RIESGO-DEL-ESTADO-DE-GUERRERO-489-2021-03-10.pdf` },
        { nombre: 'LEY NÚMERO 491 DE BIENESTAR ANIMAL DEL ESTADO DE GUERRERO', url: `${GUERRERO_BASE}/LEY-DE-BIENESTAR-ANIMAL-DEL-ESTADO-DE-GUERRERO-491.pdf` },
        { nombre: 'LEY NÚMERO 492 DE HACIENDA MUNICIPAL DEL ESTADO DE GUERRERO', url: `${GUERRERO_BASE}/LEY-DE-HACIENDA-MUNICIPAL-DEL-ESTADO-DE-GUERRERO-492-2021-03-10.pdf` },
        { nombre: 'LEY NÚMERO 494 DE FOMENTO Y DESARROLLO TURÍSTICO PARA EL ESTADO Y LOS MUNICIPIOS DE GUERRERO', url: `${GUERRERO_BASE}/ley-de-fomento-y-desarrollo-turistico-para-el-estado-y-los-municipios-de-guerrero-494-2023-05-04.pdf` },
        { nombre: 'LEY NÚMERO 494 PARA LA IGUALDAD ENTRE MUJERES Y HOMBRES DEL ESTADO DE GUERRERO', url: `${GUERRERO_BASE}/ley-para-la-igualdad-entre-mujeres-y-hombres-del-estado-de-guerrero-494.pdf` },
        { nombre: 'LEY NÚMERO 495 DEL REGISTRO CIVIL DEL ESTADO DE GUERRERO', url: `${GUERRERO_BASE}/ley-numero-495-del-registro-civil-del-estado-de-guerrero.pdf` },
        { nombre: 'LEY NÚMERO 51: ESTATUTO DE LOS TRABAJADORES AL SERVICIO DEL ESTADO, DE LOS MUNICIPIOS Y DE LOS ORGANISMOS PÚBLICOS COORDINADOS Y DESCENTRALIZADOS DEL ESTADO DE GUERRERO', url: `${GUERRERO_BASE}/LEY-DEL-ESTATUTO-DE-LOS-TRABAJADORES-AL-SERVICIO-DEL-ESTADO-DE-LOS-MUNICIPIOS-Y-DE-LOS-ORGANISMOS-PUBLICOS-COORDINADOS-Y-DESCENTRALIZADOS-DEL-ESTADO-DE-GUERRERO-51.pdf` },
        { nombre: 'LEY NÚMERO 535 DE ACUICULTURA Y PESCA SUSTENTABLES DEL ESTADO DE GUERRERO', url: `${GUERRERO_BASE}/ley-numero-535-de-acuicultura-y-pesca-sustentable-del-estado-de-guerrero.pdf` },
        { nombre: 'LEY NÚMERO 553 DE ACCESO DE LAS MUJERES A UNA VIDA LIBRE DE VIOLENCIA DEL ESTADO LIBRE Y SOBERANO DE GUERRERO', url: `${GUERRERO_BASE}/LEY-DE-ACCESO-DE-LAS-MUJERES-A-UNA-VIDA-LIBRE-DE-VIOLENCIA-DEL-ESTADO-LIBRE-Y-SOBERANO-DE-GUERRERO-553.pdf` },
        { nombre: 'LEY NÚMERO 593 DE APROVECHAMIENTO Y GESTIÓN INTEGRAL DE LOS RESIDUOS DEL ESTADO DE GUERRERO', url: `${GUERRERO_BASE}/LEY-DE-APROVECHAMIENTO-Y-GESTION-INTEGRAL-DE-LOS-RESIDUOS-DEL-ESTADO-DE-GUERRERO-593.pdf` },
        { nombre: 'LEY NÚMERO 616 DE DEUDA PÚBLICA PARA EL ESTADO DE GUERRERO', url: `${GUERRERO_BASE}/LEY-DE-DEUDA-PUBLICA-PARA-EL-ESTADO-DE-GUERRERO-616-2021-03-10.pdf` },
        { nombre: 'LEY NÚMERO 669 DE PARTICIPACIÓN CIUDADANA DEL ESTADO DE GUERRERO', url: `${GUERRERO_BASE}/ley-numero-669-de-participacion-ciudadana-del-estado-de-guerrero.pdf` },
        { nombre: 'LEY NÚMERO 679 DE GOBERNANZA DIGITAL DEL ESTADO DE GUERRERO.', url: `${GUERRERO_BASE}/ley-numero-679-de-gobernanza-digital-del-estado-de-guerrero.pdf` },
        { nombre: 'LEY NÚMERO 685 DE CONSERVACIÓN Y VIGILANCIA DE LA CIUDAD DE TAXCO DE ALARCÓN GUERRERO', url: `${GUERRERO_BASE}/LEY-DE-CONSERVACION-Y-VIGILANCIA-DE-LA-CIUDAD-DE-TAXCO-DE-ALARCON-GUERRERO-685-2021-03-10.pdf` },
        { nombre: 'LEY NÚMERO 688 DE PERSONAS JÓVENES DEL ESTADO DE GUERRERO.', url: `${GUERRERO_BASE}/ley-numero-688-de-personas-jovenes-del-estado-de-guerrero.pdf` },
        { nombre: 'LEY NÚMERO 690 DE ENTIDADES PARAESTATALES DEL ESTADO DE GUERRERO', url: `${GUERRERO_BASE}/LEY-DE-ENTIDADES-PARAESTATALES-DEL-ESTADO-DE-GUERRERO-690-2021-03-10.pdf` },
        { nombre: 'LEY NÚMERO 697 DE CULTURA FÍSICA Y DEPORTE PARA EL ESTADO Y LOS MUNICIPIOS DE GUERRERO', url: `${GUERRERO_BASE}/LEY-DE-CULTURA-FISICA-Y-DEPORTE-PARA-EL-ESTADO-Y-LOS-MUNICIPIOS-DE-GUERRERO-697.pdf` },
        { nombre: 'LEY NÚMERO 698 DE ESCUELA PARA PADRES DEL ESTADO DE GUERRERO', url: `${GUERRERO_BASE}/LEY-DE-ESCUELA-PARA-PADRES-DEL-ESTADO-DE-GUERRERO-698-2021-03-10.pdf` },
        { nombre: 'LEY NÚMERO 701 DE RECONOCIMIENTO, DERECHOS Y CULTURA DE LOS PUEBLOS Y COMUNIDADES INDÍGENAS Y AFROMEXICANAS, DEL ESTADO DE GUERRERO', url: `${GUERRERO_BASE}/ley-numero-701-de-reconocimiento-derechos-y-cultura-de-los-pueblos-y-comunidades-indigenas-y-afromexicanas-del-estado-de-guerrero-701-2022-07-19.pdf` },
        { nombre: 'LEY NÚMERO 727 QUE REGULA LA INFRAESTRUCTURA FÍSICA EDUCATIVA PARA EL ESTADO DE GUERRERO', url: `${GUERRERO_BASE}/LEY-QUE-REGULA-LA-INFRAESTRUCTURA-FISICA-EDUCATIVA-PARA-EL-ESTADO-DE-GUERRERO-727-2021-03-10.pdf` },
        { nombre: 'LEY NÚMERO 760 DE RESPONSABILIDADES POLÍTICA, PENAL Y CIVIL DE LOS SERVIDORES PÚBLICOS DEL ESTADO DE GUERRERO', url: `${GUERRERO_BASE}/LEY-DE-RESPONSABILIDADES-POLITICA-PENAL-Y-CIVIL-DE-LOS-SERVIDORES-PUBLICOS-DEL-ESTADO-DE-GUERRERO-760-2021-03-10.pdf` },
        { nombre: 'LEY NÚMERO 761 SOBRE SÍMBOLOS DE IDENTIDAD Y PERTENENCIA DEL ESTADO DE GUERRERO', url: `${GUERRERO_BASE}/LEY-SOBRE-SIMBOLOS-DE-IDENTIDAD-Y-PERTENENCIA-DEL-ESTADO-DE-GUERRERO-761-2021-03-10.pdf` },
        { nombre: 'LEY NÚMERO 762 DEL INSTITUTO DE RADIO Y TELEVISIÓN DE GUERRERO', url: `${GUERRERO_BASE}/LEY-DEL-INSTITUTO-DE-RADIO-Y-TELEVISION-DE-GUERRERO-762-2021-03-10.pdf` },
        { nombre: 'LEY NÚMERO 787 DE VIDA SILVESTRE PARA EL ESTADO DE GUERRERO', url: `${GUERRERO_BASE}/LEY-DE-VIDA-SILVESTRE-PARA-EL-ESTADO-DE-GUERRERO-787-2021-03-10.pdf` },
        { nombre: 'LEY NÚMERO 790 DE ASENTAMIENTOS HUMANOS, ORDENAMIENTO TERRITORIAL Y DESARROLLO URBANO DEL ESTADO DE GUERRERO', url: `${GUERRERO_BASE}/LEY-DE-ASENTAMIENTOS-HUMANOS-ORDENAMIENTO-TERRITORIAL-Y-DESARROLLO-URBANO-DEL-ESTADO-DE-GUERRERO-790.pdf` },
        { nombre: 'LEY NÚMERO 794 DE ARCHIVOS DEL ESTADO DE GUERRERO Y SUS MUNICIPIOS', url: `${GUERRERO_BASE}/LEY-NUMERO-794-DE-ARCHIVOS-DEL-ESTADO-DE-GUERRERO-Y-SUS MUNICIPIOS.pdf` },
        { nombre: 'LEY NÚMERO 801 DE ASOCIACIONES PÚBLICO-PRIVADAS PARA EL ESTADO DE GUERRERO', url: `${GUERRERO_BASE}/LEY-DE-ASOCIACIONES-PUBLICO-PRIVADAS-PARA-EL-ESTADO-DE-GUERRERO-801-2021-03-10.pdf` },
        { nombre: 'LEY NÚMERO 810 PARA LA PRESTACIÓN DEL SERVICIO DE ATENCIÓN, CUIDADO Y DESARROLLO INTEGRAL INFANTIL PARA EL ESTADO DE GUERRERO', url: `${GUERRERO_BASE}/LEY-PARA-LA-PRESTACION-DEL-SERVICIO-DE-ATENCION-CUIDADO-Y-DESARROLLO-INTEGRAL-INFANTIL-PARA-EL-ESTADO-DE-GUERRERO-810-2024-03-12.pdf` },
        { nombre: 'LEY NÚMERO 812 PARA LA PROTECCIÓN DE LOS DERECHOS DE NIÑAS, NIÑOS Y ADOLESCENTES DEL ESTADO DE GUERRERO', url: `${GUERRERO_BASE}/LEY-PARA-LA-PROTECCION-DE-LOS-DERECHOS-DE-NINAS-NINOS-Y-ADOLESCENTES-DEL-ESTADO-DE-GUERRERO-812.pdf` },
        { nombre: 'LEY NÚMERO 817 PARA LAS PERSONAS CON DISCAPACIDAD DEL ESTADO DE GUERRERO', url: `${GUERRERO_BASE}/LEY-PARA-LAS-PERSONAS-CON-DISCAPACIDAD-DEL-ESTADO-DE-GUERRERO-817.pdf` },
        { nombre: 'LEY NÚMERO 830 DE ATENCIÓN A DESASTRES, RECONSTRUCCIÓN Y RECUPERACIÓN DEL ESTADO DE GUERRERO', url: `${GUERRERO_BASE}/LEY-NUMERO-83-DE-ATENCION-A-DESASTRES-RECONSTRUCCION-Y-RECUPERACION-DEL-ESTADO-DE-GUERRERO.pdf` },
        { nombre: 'LEY NÚMERO 831 DE CONSULTA A LAS PERSONAS CON DISCAPACIDAD DEL ESTADO DE GUERRERO', url: `${GUERRERO_BASE}/LEY-NUMERO-831-CONSULTA-A-PERSONAS-CON-DISCAPACIDAD-ESTADO-DE-GUERRERO.pdf` },
        { nombre: 'LEY NÚMERO 832 PARA LA ATENCIÓN, INCLUSIÓN Y PROTECCIÓN A PERSONAS CON LA CONDICIÓN DEL ESPECTRO AUTISTA DEL ESTADO DE GUERRERO', url: `${GUERRERO_BASE}/LEY-NUMERO-832-ATENCION-PERSONAS-CONDICION-AUTISMO.pdf` },
        { nombre: 'LEY NÚMERO 833 REGISTRAL PARA EL ESTADO DE GUERRERO.', url: `${GUERRERO_BASE}/LEY-NUMERO-833-REGISTRAL-PARA-EL-ESTADO-DE-GUERRERO.pdf` },
        { nombre: 'LEY NÚMERO 838 DE ATENCIÓN A LOS MIGRANTES DEL ESTADO DE GUERRERO', url: `${GUERRERO_BASE}/ley-numero-838-de-atencion-a-los-migrantes-del-estado-de-guerrero-07-02-2024.pdf` },
        { nombre: 'LEY NÚMERO 845 DE CAMBIO CLIMÁTICO DEL ESTADO DE GUERRERO', url: `${GUERRERO_BASE}/LEY-DE-CAMBIO-CLIMATICO-DEL-ESTADO-DE-GUERRERO-845-2021-03-10.pdf` },
        { nombre: 'LEY NÚMERO 847 DE EJECUCIÓN PENAL DEL ESTADO DE GUERRERO', url: `${GUERRERO_BASE}/ley-de-ejacucion-penal-del-estado-de-guerrero-847.pdf` },
        { nombre: 'LEY NÚMERO 848 DE DEFENSORÍA PÚBLICA DEL ESTADO DE GUERRERO', url: `${GUERRERO_BASE}/LEY-DE-DEFENSORIA-PUBLICA-DEL-ESTADO-DE-GUERRERO-848-2022-05-18.pdf` },
        { nombre: 'LEY NÚMERO 849 DE MOVILIDAD Y SEGURIDAD VIAL DEL ESTADO DE GUERRERO', url: `${GUERRERO_BASE}/LEY-NUMERO-849-DE-MOVILIDAD-Y-SEGURIDAD-VIAL-DEL-ESTADO-DE-GUERRERO.pdf` },
        { nombre: 'LEY NÚMERO 850 DE SEGURIDAD PRIVADA DEL ESTADO DE GUERRERO', url: `${GUERRERO_BASE}/LEY-NUMERO-850-DE-SEGURIDAD-PRIVADA.pdf` },
        { nombre: 'LEY NÚMERO 856 QUE REGULA EL USO DE TECNOLOGÍAS DE LA INFORMACIÓN Y COMUNICACIÓN PARA LA SEGURIDAD PÚBLICA DEL ESTADO DE GUERRERO.', url: `${GUERRERO_BASE}/LEY-NUMERO-856-QUE-REGULA-EL-USO-DE-TECNOLOGIAS-INFORMACION.pdf` },
        { nombre: 'LEY NÚMERO 861 DE GESTIÓN INTEGRAL DE RIESGOS Y PROTECCIÓN CIVIL DEL ESTADO DE GUERRERO.', url: `${GUERRERO_BASE}/ley-no-861-gestion-integral-riesgos-proteccion-civil-estado-2024-10-15.pdf` },
        { nombre: 'LEY NÚMERO 861 PARA LA ADMINISTRACIÓN DE BIENES ASEGURADOS, DECOMISADOS O ABANDONADOS DEL ESTADO DE GUERRERO', url: `${GUERRERO_BASE}/LEY-PARA-LA-ADMINISTRACION-DE-BIENES-ASEGURADOS-DECOMISADOS-O-ABANDONADOS-DEL-ESTADO-DE-GUERRERO-861-2021-03-10.pdf` },
        { nombre: 'LEY NÚMERO 864 DE OPERACIONES INMOBILIARIAS DEL ESTADO DE GUERRERO', url: `${GUERRERO_BASE}/LEY-DE-OPERACIONES-INMOBILIARIAS-DEL-ESTADO-DE-GUERRERO-864-2021-09-01.pdf` },
        { nombre: 'LEY NÚMERO 877 DE EXPROPIACIÓN PARA EL ESTADO DE GUERRERO', url: `${GUERRERO_BASE}/LEY-DE-EXPROPIACION-PARA-EL-ESTADO-DE-GUERRERO-877-2021-03-10.pdf` },
        { nombre: 'LEY NÚMERO 878 DEL EQUILIBRIO ECOLÓGICO Y LA PROTECCIÓN AL AMBIENTE DEL ESTADO DE GUERRERO', url: `${GUERRERO_BASE}/LEY-DEL-EQUILIBRIO-ECOLOGICO-Y-LA-PROTECCION-AL-AMBIENTE-DEL-ESTADO-DE-GUERRERO-878.pdf` },
        { nombre: 'LEY NÚMERO 912 DE SEGURIDAD SOCIAL DE LOS SERVIDORES PÚBLICOS DEL ESTADO DE GUERRERO', url: `${GUERRERO_BASE}/LEY-DE-SEGURIDAD-SOCIAL-DE-LOS-SERVIDORES-PUBLICOS-DEL-ESTADO-DE-GUERRERO-912-2021-03-10.pdf` },
        { nombre: 'LEY NÚMERO 932 POR LA QUE SE CREA LA COMISIÓN DE LA VERDAD PARA LA INVESTIGACIÓN DE LAS VIOLACIONES A LOS DERECHOS HUMANOS DURANTE LA GUERRA SUCIA DE LOS AÑOS SESENTA Y SETENTAS DEL ESTADO DE GUERRERO', url: `${GUERRERO_BASE}/LEY-POR-LA-QUE-SE-CREA-LA-COMISION-DE-LA-VERDAD-PARA-LA-INVESTIGACION-DE-LAS-VIOLACIONES-A-LOS-DERECHOS-HUMANOS-DURANTE-LA-GUERRA-SUCIA-DE-LOS-ANOS-SESENTA-Y-SETENTAS-DEL-ESTADO-DE-GUERRERO-932-2021-03-10.pdf` },
        { nombre: 'LEY NÚMERO 971 DEL NOTARIADO DEL ESTADO DE GUERRERO', url: `${GUERRERO_BASE}/LEY-DEL-NOTARIADO-DEL-ESTADO-DE-GUERRERO-971-2021-03-10.pdf` },
        { nombre: 'LEY NÚMERO 994 DE PLANEACIÓN DEL ESTADO LIBRE Y SOBERANO DE GUERRERO', url: `${GUERRERO_BASE}/LEY-DE-PLANEACION-DEL-ESTADO-LIBRE-Y-SOBERANO-DE-GUERRERO-994-2023-03-20.pdf` },
        { nombre: 'LEY ORGANICA DEL FONDO AUXILIAR PARA LA ADMINISTRACION DE JUSTICIA DEL ESTADO DE GUERRERO NUMERO 55', url: `${GUERRERO_BASE}/LEY-ORGANICA-DEL-FONDO-AUXILIAR-PARA-LA-ADMINISTRACION-DE-JUSTICIA-DEL-ESTADO-DE-GUERRERO-55-2021-03-10.pdf` },
        { nombre: 'LEY ORGANICA DEL PODER JUDICIAL DEL ESTADO LIBRE Y SOBERANO DE GUERRERO NUMERO 129', url: `${GUERRERO_BASE}/LEY-ORGANICA-DEL-PODER-JUDICIAL-DEL-ESTADO-LIBRE-Y-SOBERANO-DE-GUERRERO-NUMERO-129.pdf` },
        { nombre: 'LEY ORGANICA DEL PODER LEGISLATIVO DEL ESTADO DE GUERRERO NUM. 286. (ABROGADA)', url: `${GUERRERO_BASE}/LEY-ORGANICA-DEL-PODER-LEGISLATIVO-DEL-ESTADO-DE-GUERRERO-286-ABROGADA.pdf` },
        { nombre: 'LEY ORGÁNICA DE LA ADMINISTRACIÓN PÚBLICA DEL ESTADO DE GUERRERO NÚMERO 242', url: `${GUERRERO_BASE}/ley-organica-de-la-administracion-publica-del-estado-de-guerrero-numero-242.pdf` },
        { nombre: 'LEY ORGÁNICA DE LA FISCALÍA GENERAL DEL ESTADO DE GUERRERO. NÚMERO 500', url: `${GUERRERO_BASE}/LEY-ORGANICA-DE-LA-FISCALIA-GENERAL-DEL-ESTADO-DE-GUERRERO-500-2024-03-12.pdf` },
        { nombre: 'LEY ORGÁNICA DE LA UNIVERSIDAD AUTÓNOMA DE GUERRERO NÚMERO 178', url: `${GUERRERO_BASE}/LEY-ORGANICA-DE-LA-UNIVERSIDAD-AUTONOMA-DE-GUERRERO-178.pdf` },
        { nombre: 'LEY ORGÁNICA DEL MUNICIPIO LIBRE DEL ESTADO DE GUERRERO', url: `${GUERRERO_BASE}/LEY-ORGANICA-DEL-MUNICIPIO-LIBRE-DEL-ESTADO-DE-GUERRERO.pdf` },
        { nombre: 'LEY ORGÁNICA DEL PODER LEGISLATIVO DEL ESTADO DE GUERRERO NÚMERO 231', url: `${GUERRERO_BASE}/ley-organica-del-poder-legislativo-del-estado-de-guerrero-231.pdf` },
        { nombre: 'LEY ORGÁNICA DEL TRIBUNAL DE JUSTICIA ADMINISTRATIVA DEL ESTADO DE GUERRERO NÚMERO 467', url: `${GUERRERO_BASE}/LEY-ORGANICA-DEL-TRIBUNAL-DE-JUSTICIA-ADMINISTRATIVA-DEL-ESTADO-DE-GUERRERO-467-2021-03-10.pdf` },
        { nombre: 'LEY ORGÁNICA DEL TRIBUNAL ELECTORAL DEL ESTADO DE GUERRERO NÚMERO 457', url: `${GUERRERO_BASE}/LEY-ORGANICA-DEL-TRIBUNAL-ELECTORAL-DEL-ESTADO-DE-GUERRERO-457-2021-03-10.pdf` },
        { nombre: 'LEY PARA PREVENIR Y SANCIONAR LA DESAPARICIÓN FORZADA DE PERSONAS EN EL ESTADO DE GUERRERO NÚMERO 569', url: `${GUERRERO_BASE}/LEY-PARA-PREVENIR-Y-SANCIONAR-LA-DESAPARICION-FORZADA-DE-PERSONAS-EN-EL-ESTADO-DE-GUERRERO-569-2021-03-10.pdf` },
        { nombre: 'LEY QUE CREA EL ORGANISMO PUBLICO DESCENTRALIZADO DEL AYUNTAMIENTO DE ACAPULCO DE JUAREZ "SERVICIOS MUNICIPALES DE LIMPIA DE ACAPULCO', url: `${GUERRERO_BASE}/LEY-QUE-CREA-EL-ORGANISMO-PUBLICO-DESCENTRALIZADO-DEL-AYUNTAMIENTO-DE-ACAPULCO-DE-JUAREZ-SERVICIOS-MUNICIPALES-DE-LIMPIA-DE-ACAPULCO-0-2021-03-10.pdf` },
        { nombre: 'LEY QUE CREA EL ORGANISMO PUBLICO DESCENTRALIZADO DEL AYUNTAMIENTO DE TAXCO DE ALARCON "SERVICIOS MUNICIPALES DE LIMPIA DE TAXCO', url: `${GUERRERO_BASE}/LEY-QUE-CREA-EL-ORGANISMO-PUBLICO-DESCENTRALIZADO-DEL-AYUNTAMIENTO-DE-TAXCO-DE-ALARCON-SERVICIOS-MUNICIPALES-DE-LIMPIA-DE-TAXCO-0-2021-03-10.pdf` },
        { nombre: 'LEY QUE CREA LA ADMINISTRACION DEL PATRIMONIO DE LA BENEFICENCIA PUBLICA DEL ESTADO DE GUERRERO NUMERO 435', url: `${GUERRERO_BASE}/LEY-QUE-CREA-LA-ADMINISTRACION-DEL-PATRIMONIO-DE-LA-BENEFICENCIA-PUBLICA-DEL-ESTADO-DE-GUERRERO-435-2021-03-10.pdf` },
        { nombre: 'LEY QUE ESTABLECE LAS BASES PARA EL PROCEDIMIENTO AL QUE DEBERA AJUSTARSE LA INSCRIPCION DE LOS PREDIOS SUB-URBANOS Y RUSTICOS EN EL REGISTRO PUBLICO DE LA PROPIEDAD', url: `${GUERRERO_BASE}/LEY-QUE-ESTABLECE-LAS-BASES-PARA-EL-PROCEDIMIENTO-AL-QUE-DEBERA-AJUSTARSE-LA-INSCRIPCION-DE-LOS-PREDIOS-SUB-URBANOS-Y-RUSTICOS-EN-EL-REGISTRO-PUBLICO-DE-LA-PROPIEDAD.pdf` },
        { nombre: 'LEY QUE ESTABLECE LAS BASES PARA EL REGIMEN DE PERMISOS, LICENCIAS Y CONCESIONES PARA LA PRESTACION DE SERVICIOS PUBLICOS Y LA EXPLOTACION Y APROVECHAMIENTO DE BIENES DE DOMINIO DEL ESTADO Y LOS AYUNTAMIENTOS', url: `${GUERRERO_BASE}/LEY-QUE-ESTABLECE-LAS-BASES-PARA-EL-REGIMEN-DE-PERMISOS-LICENCIAS-Y-CONCESIONES-PARA-LA-PRESTACION-DE-SERVICIOS-PUBLICOS-Y-LA-EXPLOTACION-Y-APROVECHAMIENTO-DE-BIENES-DE-DOMINIO-DEL-ESTADO-Y-LOS-AYUNTAMIENTOS-0-2021-03-10.pdf` },
        { nombre: 'LEY QUE INSTITUYE LOS ORGANISMOS PUBLICOS DE PARTICIPACION SOCIAL Y FIJA LAS BASES PARA SU REGULACION', url: `${GUERRERO_BASE}/LEY-QUE-INSTITUYE-LOS-ORGANISMOS-PUBLICOS-DE-PARTICIPACION-SOCIAL-Y-FIJA-LAS-BASES-PARA-SU-REGULACION-0-2021-03-10.pdf` },
        { nombre: 'LEY SOBRE EL SISTEMA ESTATAL DE ASISTENCIA SOCIAL NUMERO 332', url: `${GUERRERO_BASE}/LEY-SOBRE-EL-SISTEMA-ESTATAL-DE-ASISTENCIA-SOCIAL-332-2024-03-12.pdf` },
        { nombre: 'LLEY NÚMERO 699 QUE ESTABLECE EL DERECHO AL ACCESO DE ÚTILES ESCOLARES, ZAPATOS Y UNIFORMES GRATUITOS, PARA LAS NIÑAS Y LOS NIÑOS DE LOS NIVELES DE PREESCOLAR, PRIMARIA Y SECUNDARIA DEL ESTADO DE GUERRERO', url: `${GUERRERO_BASE}/LEY-QUE-ESTABLECE-EL-DERECHO-AL-ACCESO-DE-UTILES-ESCOLARES-ZAPATOS-Y-UNIFORMES-GRATUITOS-PARA-LAS-NINAS-Y-LOS-NINOS-DE-LOS-NIVELES-DE-PREESCOLAR-PRIMARIA-Y-SECUNDARIA-DEL-ESTADO-DE-GUERRERO-699-2021-03-10.pdf` },
        { nombre: 'LEY REGLAMENTARIA DEL EJERCICIO PROFESIONAL PARA EL ESTADO LIBRE Y SOBERANO DE GUERRERO', url: `${GUERRERO_BASE}/LEY-REGLAMENTARIA-DEL-EJERCICIO-PROFESIONAL-PARA-EL-ESTADO-LIBRE-Y-SOBERANO-DE-DE-GUERRERO.pdf` },
    ],
    codigos: [
        { nombre: 'CODIGO FISCAL MUNICIPAL NUMERO 152', url: `${GUERRERO_BASE}/codigo-fiscal-municipal-152.pdf` },
        { nombre: 'CÓDIGO DE PROCEDIMIENTOS CONTENCIOSOS ADMINISTRATIVOS DEL ESTADO DE GUERRERO, NUMERO 215', url: `${GUERRERO_BASE}/CODIGO-DE-PROCEDIMIENTOS-CONTENCIOSOS-ADMINISTRATIVOS-DEL-ESTADO-DE-GUERRERO-215.pdf` },
        { nombre: 'CODIGO CIVIL DEL ESTADO LIBRE Y SOBERANO DE GUERRERO NUMERO 358', url: `${GUERRERO_BASE}/CODIGO-CIVIL-DEL-ESTADO-LIBRE-Y-SOBERANO-DE-GUERRERO-358.pdf` },
        { nombre: 'CODIGO PROCESAL CIVIL DEL ESTADO LIBRE Y SOBERANO DE GUERRERO NUMERO 364', url: `${GUERRERO_BASE}/codigo-de-procedimientos-civiles-del-estado-de-guerrero-numero-364.pdf` },
        { nombre: 'CÓDIGO FISCAL DEL ESTADO DE GUERRERO NÚMERO 420', url: `${GUERRERO_BASE}/codigo-fiscal-del-estado-de-guerrero-numero-420.pdf` },
        { nombre: 'CÓDIGO PENAL PARA EL ESTADO LIBRE Y SOBERANO DE GUERRERO, NÚMERO 499', url: `${GUERRERO_BASE}/codigo-penal-no-499.pdf` },
        { nombre: 'CÓDIGO DE PROCEDIMIENTOS DE JUSTICIA ADMINISTRATIVA DEL ESTADO DE GUERRERO, NÚMERO 763. GUERRERO', url: `${GUERRERO_BASE}/CODIGO-DE-PROCEDIMIENTOS-DE-JUSTICIA-ADMINISTRATIVA-DEL-ESTADO-DE-GUERRERO-763.pdf` },
    ],
    reglamentos: [],
    otros: [],
};

// ─── Jalisco: FULL DATA — PDFs hosted on Supabase ────────────────
const JALISCO_BASE = 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/Jalisco';
const JALISCO_LEYES: CategoriaLeyes = {
    constitucion: [
        { nombre: 'Constitución Política del Estado de Jalisco', url: `${JALISCO_BASE}/Constitucion Politica del Estado de Jalisco-241125.pdf` },
    ],
    leyes: [
        { nombre: 'Arancel de Abogados para el Estado de Jalisco', url: `${JALISCO_BASE}/Arancel de Abogados para el Estado de Jalisco-100223.pdf` },
        { nombre: 'Declaratoria de Inicio de Vigencia de la Ley Nacional de Extinción de Dominio en el Territorio del Estado de Jalisco', url: `${JALISCO_BASE}/Declaratoria de Inicio de Vigencia de la Ley Nacional de Extincion de Dominio en el Territorio del Estado de Jalisco.pdf` },
        { nombre: 'Declaratoria de incorporación a la Ley Nacional de Mecanismos Alternativos de solución de controversias', url: `${JALISCO_BASE}/Declaratoria de incorporacion a la Ley Nacional de Mecanismos Alternativos de solucion de controversias.-100223.pdf` },
        { nombre: 'Declaratoria de incorporación del Sistema Procesal Penal Acusatorio', url: `${JALISCO_BASE}/Declaratoria de incorporacion del Sistema Procesal Penal Acusatorio-100223.pdf` },
        { nombre: 'Declaratoria del Área Metropolitana de Guadalajara', url: `${JALISCO_BASE}/Declaratoria del Area Metropolitana de Guadalajara-130223.pdf` },
        { nombre: 'Declaratoria para el inicio de vigencia de la Ley Nacional de Ejecución Penal en el Territorio del Estado de Jalisco', url: `${JALISCO_BASE}/Declaratoria para el inicio de vigencia de la Ley Nacional de Ejecucion Penal en el Territorio del Estado de Jalisco-130223.pdf` },
        { nombre: 'Decreto 17114, Regularización de Predios Rústicos del Estado de Jalisco', url: `${JALISCO_BASE}/Decreto 17114 Regularizacion de Predios Rusticos del Estado de Jalisco-261125.pdf` },
        { nombre: 'Ley Agroalimentaria del Estado de Jalisco', url: `${JALISCO_BASE}/Ley Agroalimentaria del Estado de Jalisco-150223.pdf` },
        { nombre: 'Ley Contra la Delincuencia Organizada del Estado de Jalisco', url: `${JALISCO_BASE}/Ley Contra la Delincuencia Organizada del Estado de Jalisco-210923.pdf` },
        { nombre: 'Ley Estatal del Equilibrio Ecológico y la Protección al Ambiente', url: `${JALISCO_BASE}/Ley Estatal del Equilibrio Ecologico y la Proteccion al Ambiente-181225.pdf` },
        { nombre: 'Ley Estatal para Prevenir, Combatir y Erradicar la Trata de Personas', url: `${JALISCO_BASE}/Ley Estatal para Prevenir Combatir y Erradicar la Trata de Personas-020323.pdf` },
        { nombre: 'Ley Estatal para Promover la Igualdad, Prevenir y Eliminar la Discriminación en el Estado de Jalisco', url: `${JALISCO_BASE}/Ley Estatal para Promover la Igualdad Prevenir y Eliminar la Discriminacion en el Estado de Jalisco-271023.pdf` },
        { nombre: 'Ley Estatal para la Igualdad entre Mujeres y Hombres', url: `${JALISCO_BASE}/Ley Estatal para la Igualdad entre Mujeres y Hombres-020323.pdf` },
        { nombre: 'Ley Organica del Organismo Púlblico descentralizado denominado Museos, Exposiciones y Galerías de Jalisco', url: `${JALISCO_BASE}/Ley Organica del Organismo Pulblico descentralizado denominado Museos Exposiciones y Galerias de Jalisco-191022.pdf` },
        { nombre: 'Ley Orgánica de la Agencia Estatal de Entretenimiento de Jalisco', url: `${JALISCO_BASE}/Ley Organica de la Agencia Estatal de Entretenimiento de Jalisco-300424.pdf` },
        { nombre: 'Ley Orgánica de la Agencia de Conectividad y Acceso a Internet', url: `${JALISCO_BASE}/Ley Organica de la Agencia de Conectividad y Acceso a Internet-271123.pdf` },
        { nombre: 'Ley Orgánica de la Agencia de Energía del Estado de Jalisco', url: `${JALISCO_BASE}/Ley Organica de la Agencia de Energia del Estado de Jalisco-020323.pdf` },
        { nombre: 'Ley Orgánica de la Agencia para el Desarrollo de Industrias Creativas y Digitales del Estado de Jalisco', url: `${JALISCO_BASE}/Ley Organica de la Agencia para el Desarrollo de Industrias Creativas y Digitales del Estado de Jalisco-020323.pdf` },
        { nombre: 'Ley Orgánica de la Fiscalía del Estado de Jalisco', url: `${JALISCO_BASE}/Ley Organica de la Fiscalia del Estado de Jalisco-070225.pdf` },
        { nombre: 'Ley Orgánica de la Procuraduría Social del Estado de Jalisco', url: `${JALISCO_BASE}/Ley Organica de la Procuraduria Social del Estado de Jalisco -020323.pdf` },
        { nombre: 'Ley Orgánica de la Universidad Intercultural de Jalisco', url: `${JALISCO_BASE}/Ley Organica de la Universidad Intercultural de Jalisco-080725.pdf` },
        { nombre: 'Ley Orgánica de la Universidad Politécnica de la Zona Metropolitana de Guadalajara', url: `${JALISCO_BASE}/Ley Organica de la Universidad Politecnica de la Zona Metropolitana de Guadalajara-290523.pdf` },
        { nombre: 'Ley Orgánica de la Universidad Tecnológica de Jalisco', url: `${JALISCO_BASE}/Ley Organica de la Universidad Tecnologica de Jalisco-310523.pdf` },
        { nombre: 'Ley Orgánica de la Universidad Tecnológica de la Zona Metropolitana de Guadalajara', url: `${JALISCO_BASE}/Ley Organica de la Universidad Tecnologica de la Zona Metropolitana de Guadalajara-310523.pdf` },
        { nombre: 'Ley Orgánica de la Universidad de Guadalajara', url: `${JALISCO_BASE}/Ley Organica de la Universidad de Guadalajara-020323.pdf` },
        { nombre: 'Ley Orgánica del Colegio de Bachilleres del Estado de Jalisco', url: `${JALISCO_BASE}/Ley Organica del Colegio de Bachilleres del Estado de Jalisco-290523.pdf` },
        { nombre: 'Ley Orgánica del Colegio de Educación Profesional Técnica del Estado de Jalisco', url: `${JALISCO_BASE}/Ley Organica del Colegio de Educacion Profesional Tecnica del Estado de Jalisco-030323.pdf` },
        { nombre: 'Ley Orgánica del Colegio de Estudios Científicos y Tecnológicos del Estado de Jalisco', url: `${JALISCO_BASE}/Ley Organica del Colegio de Estudios Cientificos y Tecnologicos del Estado de Jalisco-260523.pdf` },
        { nombre: 'Ley Orgánica del Instituto Cultural Cabañas', url: `${JALISCO_BASE}/Ley Organica del Instituto Cultural Cabanas-100323.pdf` },
        { nombre: 'Ley Orgánica del Instituto Jalisciense de Ciencias Forenses Dr. Jesús Mario Rivas Souza', url: `${JALISCO_BASE}/Ley Organica del Instituto Jalisciense de Ciencias Forenses Dr. Jesus Mario Rivas Souza-181024.pdf` },
        { nombre: 'Ley Orgánica del Instituto Jalisciense de la Vivienda', url: `${JALISCO_BASE}/Ley Organica del Instituto Jalisciense de la Vivienda.pdf` },
        { nombre: 'Ley Orgánica del Instituto Tecnológico José Molina Pasquel y Henríquez', url: `${JALISCO_BASE}/Ley Organica del Instituto Tecnologico Jose Molina Pasquel y Henriquez-171023.pdf` },
        { nombre: 'Ley Orgánica del Instituto de Información Estadística y Geográfica del Estado de Jalisco', url: `${JALISCO_BASE}/Ley Organica del Instituto de Informacion Estadistica y Geografica del Estado de Jalisco-300523.pdf` },
        { nombre: 'Ley Orgánica del Organismo Público Descentralizado Denominado Agencia de Coinversión para el Desarrollo Sostenible de Jalisco (Coinvierte)', url: `${JALISCO_BASE}/Ley Organica del Organismo Publico Descentralizado Denominado Agencia de Coinversion para el Desarrollo Sostenible de Jalisco (Coinvierte)-100323.pdf` },
        { nombre: 'Ley Orgánica del Organismo Público Descentralizado denominado Agencia Integral de Regulación de Emisiones', url: `${JALISCO_BASE}/Ley Organica del Organismo Publico Descentralizado denominado Agencia Integral de Regulacion de Emisiones-060326.pdf` },
        { nombre: 'Ley Orgánica del Organismo Público Descentralizado denominado Centro de Conciliación Laboral del Estado de Jalisco', url: `${JALISCO_BASE}/Ley Organica del Organismo Publico Descentralizado denominado Centro de Conciliacion Laboral del Estado de Jalisco-240323.pdf` },
        { nombre: 'Ley Orgánica del Organismo Público Descentralizado denominado Centro de Coordinación, Comando, Control, Comunicaciones y Cómputo del Estado de Jalisco', url: `${JALISCO_BASE}/Ley Organica del Organismo Publico Descentralizado denominado Centro de Coordinacion Comando Control Comunicaciones y Computo del Estado de Jalisco-150125.pdf` },
        { nombre: 'Ley Orgánica del Organismo Público Descentralizado denominado Red de Centros de Justicia para las Mujeres', url: `${JALISCO_BASE}/Ley Organica del Organismo Publico Descentralizado denominado Red de Centros de Justicia para las Mujeres-240323.pdf` },
        { nombre: 'Ley Orgánica del Poder Ejecutivo del Estado de Jalisco', url: `${JALISCO_BASE}/Ley Organica del Poder Ejecutivo del Estado de Jalisco-150125.pdf` },
        { nombre: 'Ley Orgánica del Poder Judicial del Estado de Jalisco', url: `${JALISCO_BASE}/Ley Organica del Poder Judicial del Estado de Jalisco-240323.pdf` },
        { nombre: 'Ley Orgánica del Poder Legislativo del Estado de Jalisco', url: `${JALISCO_BASE}/Ley Organica del Poder Legislativo del Estado de Jalisco -071024.pdf` },
        { nombre: 'Ley Orgánica del Sistema Jalisciense de Radio y Televisión', url: `${JALISCO_BASE}/Ley Organica del Sistema Jalisciense de Radio y Television-240323.pdf` },
        { nombre: 'Ley Orgánica del Tribunal Electoral del Estado de Jalisco', url: `${JALISCO_BASE}/Ley Organica del Tribunal Electoral del Estado de Jalisco-270323.pdf` },
        { nombre: 'Ley Orgánica del Tribunal de Justicia Administrativa del Estado de Jalisco', url: `${JALISCO_BASE}/Ley Organica del Tribunal de Justicia Administrativa del Estado de Jalisco-240323.pdf` },
        { nombre: 'Ley Orgánica que crea al Organismo Público Descentralizado denominado Plataforma Abierta de Innovación y Desarrollo de Jalisco', url: `${JALISCO_BASE}/Ley Organica que crea al Organismo Publico Descentralizado denominado Plataforma Abierta de Innovacion y Desarrollo de Jalisco-171023.pdf` },
        { nombre: 'Ley Reglamentaria del Artículo 117 Bis de la Constitución Política del Estado de Jalisco', url: `${JALISCO_BASE}/Ley Reglamentaria del Articulo 117 Bis de la Constitucion Politica del Estado de Jalisco-310323.pdf` },
        { nombre: 'Ley Reglamentaria del Derecho de Vía en los Caminos Públicos de Jurisdicción Estatal', url: `${JALISCO_BASE}/Ley Reglamentaria del Derecho de Via en los Caminos Publicos de Jurisdiccion Estatal-310323.pdf` },
        { nombre: 'Ley de Acceso de las Mujeres a una Vida Libre de Violencia del Estado de Jalisco', url: `${JALISCO_BASE}/Ley de Acceso de las Mujeres a una Vida Libre de Violencia del Estado de Jalisco-011225.pdf` },
        { nombre: 'Ley de Acuacultura y Pesca para el Estado de Jalisco', url: `${JALISCO_BASE}/Ley de Acuacultura y Pesca para el Estado de Jalisco-260923.pdf` },
        { nombre: 'Ley de Amnistía', url: `${JALISCO_BASE}/Ley de Amnistia-150223.pdf` },
        { nombre: 'Ley de Amnistía para las Mujeres Víctimas de Violencia de Género.', url: `${JALISCO_BASE}/Ley de Amnistia para las Mujeres Victimas de Violencia de Genero.-091023.pdf` },
        { nombre: 'Ley de Archivos del Estado de Jalisco y sus Municipios', url: `${JALISCO_BASE}/Ley de Archivos del Estado de Jalisco y sus Municipios -230224.pdf` },
        { nombre: 'Ley de Asociaciones Intermunicipales del Estado de Jalisco', url: `${JALISCO_BASE}/Ley de Asociaciones Intermunicipales del Estado de Jalisco-311023.pdf` },
        { nombre: 'Ley de Atención a Víctimas del Estado de Jalisco', url: `${JALISCO_BASE}/Ley de Atencion a Victimas del Estado de Jalisco-251125.pdf` },
        { nombre: 'Ley de Austeridad y Ahorro del Estado de Jalisco y sus Municipios', url: `${JALISCO_BASE}/Ley de Austeridad y Ahorro del Estado de Jalisco y sus Municipios-110124.pdf` },
        { nombre: 'Ley de Beneméritos del Estado de Jalisco', url: `${JALISCO_BASE}/Ley de Benemeritos del Estado de Jalisco-220124.pdf` },
        { nombre: 'Ley de Bibliotecas del Estado de Jalisco', url: `${JALISCO_BASE}/Ley de Bibliotecas del Estado de Jalisco-240124.pdf` },
        { nombre: 'Ley de Catastro Municipal del Estado de Jalisco', url: `${JALISCO_BASE}/Ley de Catastro Municipal del Estado de Jalisco-240424.pdf` },
        { nombre: 'Ley de Ciencia, Desarrollo Tecnológico e Innovación del Estado de Jalisco', url: `${JALISCO_BASE}/Ley de Ciencia Desarrollo Tecnologico e Innovacion del Estado de Jalisco-250424.pdf` },
        { nombre: 'Ley de Compras Gubernamentales, Enajenaciones y Contratación de Servicios del Estado de Jalisco y sus Municipios', url: `${JALISCO_BASE}/Ley de Compras Gubernamentales Enajenaciones y Contratacion de Servicios del Estado de Jalisco y sus Municipios-171023.pdf` },
        { nombre: 'Ley de Control de Confianza del Estado de Jalisco y sus Municipios', url: `${JALISCO_BASE}/Ley de Control de Confianza del Estado de Jalisco y sus Municipios-210824.pdf` },
        { nombre: 'Ley de Coordinación Fiscal del Estado de Jalisco y sus Municipios', url: `${JALISCO_BASE}/Ley de Coordinacion Fiscal del Estado de Jalisco y sus Municipios-130924.pdf` },
        { nombre: 'Ley de Coordinación Metropolitana del Estado de Jalisco', url: `${JALISCO_BASE}/Ley de Coordinacion Metropolitana del Estado de Jalisco-200223.pdf` },
        { nombre: 'Ley de Cultura Física y Deporte del Estado de Jalisco', url: `${JALISCO_BASE}/Ley de Cultura Fisica y Deporte del Estado de Jalisco-140325.pdf` },
        { nombre: 'Ley de Cultura de Paz del Estado de Jalisco', url: `${JALISCO_BASE}/Ley de Cultura de Paz del Estado de Jalisco-170823.pdf` },
        { nombre: 'Ley de Desarrollo Forestal Sustentable para el Estado de Jalisco', url: `${JALISCO_BASE}/Ley de Desarrollo Forestal Sustentable para el Estado de Jalisco-190325.pdf` },
        { nombre: 'Ley de Desarrollo Rural Sustentable del Estado de Jalisco', url: `${JALISCO_BASE}/Ley de Desarrollo Rural Sustentable del Estado de Jalisco-310325.pdf` },
        { nombre: 'Ley de Desarrollo Social para el Estado de Jalisco', url: `${JALISCO_BASE}/Ley de Desarrollo Social para el Estado de Jalisco-251125.pdf` },
        { nombre: 'Ley de Deuda Pública y Disciplina Financiera del Estado de Jalisco y sus Municipios', url: `${JALISCO_BASE}/Ley de Deuda Publica y Disciplina Financiera del Estado de Jalisco y sus Municipios-290525.pdf` },
        { nombre: 'Ley de Educación Superior del Estado de Jalisco', url: `${JALISCO_BASE}/Ley de Educacion Superior del Estado de Jalisco-170725.pdf` },
        { nombre: 'Ley de Educación del Estado Libre y Soberano de Jalisco', url: `${JALISCO_BASE}/Ley de Educacion del Estado Libre y Soberano de Jalisco-121125.pdf` },
        { nombre: 'Ley de Entidades Paraestatales del Estado de Jalisco', url: `${JALISCO_BASE}/Ley de Entidades Paraestatales del Estado de Jalisco-010323.pdf` },
        { nombre: 'Ley de Entrega Recepción del Estado de Jalisco y sus Municipios', url: `${JALISCO_BASE}/Ley de Entrega Recepcion del Estado de Jalisco y sus Municipios-160725.pdf` },
        { nombre: 'Ley de Evaluación y Supervisión de Medidas Cautelares y Suspensión Condicional del Proceso del Estado de Jalisco', url: `${JALISCO_BASE}/Ley de Evaluacion y Supervision de Medidas Cautelares y Suspension Condicional del Proceso del Estado de Jalisco -210725.pdf` },
        { nombre: 'Ley de Expropiación de bienes Muebles e Inmuebles de Propiedad Privada', url: `${JALISCO_BASE}/Ley de Expropiacion de bienes Muebles e Inmuebles de Propiedad Privada-190225.pdf` },
        { nombre: 'Ley de Filmaciones del Estado de Jalisco', url: `${JALISCO_BASE}/Ley de Filmaciones del Estado de Jalisco-230725.pdf` },
        { nombre: 'Ley de Firma Electrónica Avanzada para el Estado de Jalisco y sus Municipios', url: `${JALISCO_BASE}/Ley de Firma Electronica Avanzada para el Estado de Jalisco y sus Municipios-250725.pdf` },
        { nombre: 'Ley de Fiscalización Superior y Rendición de Cuentas del Estado de Jalisco y sus Municipios', url: `${JALISCO_BASE}/Ley de Fiscalizacion Superior y Rendicion de Cuentas del Estado de Jalisco y sus Municipios-200825.pdf` },
        { nombre: 'Ley de Fomento Apícola y Protección de Agentes Polinizadores de Jalisco', url: `${JALISCO_BASE}/Ley de Fomento Apicola y Proteccion de Agentes Polinizadores de Jalisco-270825.pdf` },
        { nombre: 'Ley de Fomento a la Cultura del Estado de Jalisco', url: `${JALISCO_BASE}/Ley de Fomento a la Cultura del Estado de Jalisco -220825.pdf` },
        { nombre: 'Ley de Fomento al Emprendimiento del Estado de Jalisco', url: `${JALISCO_BASE}/Ley de Fomento al Emprendimiento del Estado de Jalisco-250825.pdf` },
        { nombre: 'Ley de Fomento y Desarrollo Pecuario del Estado de Jalisco', url: `${JALISCO_BASE}/Ley de Fomento y Desarrollo Pecuario del Estado de Jalisco-020524.pdf` },
        { nombre: 'Ley de Gestión Integral de los Residuos del Estado de Jalisco', url: `${JALISCO_BASE}/Ley de Gestion Integral de los Residuos del Estado de Jalisco-030925.pdf` },
        { nombre: 'Ley de Hacienda Municipal del Estado de Jalisco', url: `${JALISCO_BASE}/Ley de Hacienda Municipal del Estado de Jalisco -111125.pdf` },
        { nombre: 'Ley de Hacienda del Estado de Jalisco', url: `${JALISCO_BASE}/Ley de Hacienda del Estado de Jalisco -160424.pdf` },
        { nombre: 'Ley de Incompatibilidades para los Servidores Públicos, Reglamentaria del Artículo 112 de la Constitución del Estado de Jalisco', url: `${JALISCO_BASE}/Ley de Incompatibilidades para los Servidores Publicos Reglamentaria del Articulo 112 de la Constitucion del Estado de Jalisco-220223.pdf` },
        { nombre: 'Ley de Justicia Administrativa del Estado de Jalisco', url: `${JALISCO_BASE}/Ley de Justicia Administrativa del Estado de Jalisco-061125.pdf` },
        { nombre: 'Ley de Justicia Alternativa del Estado de Jalisco', url: `${JALISCO_BASE}/Ley de Justicia Alternativa del Estado de Jalisco-111125.pdf` },
        { nombre: 'Ley de Límites Territoriales de los Municipios del Estado de Jalisco', url: `${JALISCO_BASE}/Ley de Limites Territoriales de los Municipios del Estado de Jalisco-240223.pdf` },
        { nombre: 'Ley de Mecenazgo Cultural del Estado de Jalisco', url: `${JALISCO_BASE}/Ley de Mecenazgo Cultural del Estado de Jalisco-011225.pdf` },
        { nombre: 'Ley de Mejora Regulatoria para el Estado de Jalisco y sus Municipios', url: `${JALISCO_BASE}/Ley de Mejora Regulatoria para el Estado de Jalisco y sus Municipios -031225.pdf` },
        { nombre: 'Ley de Movilidad, Seguridad Vial y Transporte del Estado de Jalisco', url: `${JALISCO_BASE}/Ley de Movilidad Seguridad Vial y Transporte del Estado de Jalisco-110725.pdf` },
        { nombre: 'Ley de Nutrición Adecuada y Estilos de Vida Saludables del Estado de Jalisco', url: `${JALISCO_BASE}/Ley de Nutricion Adecuada y Estilos de Vida Saludables del Estado de Jalisco-220424.pdf` },
        { nombre: 'Ley de Obra Pública del Estado de Jalisco y sus Municipios', url: `${JALISCO_BASE}/Ley de Obra Publica del Estado de Jalisco y sus Municipios-180226.pdf` },
        { nombre: 'Ley de Patrimonio Cultural del Estado de Jalisco y sus Municipios', url: `${JALISCO_BASE}/Ley de Patrimonio Cultural del Estado de Jalisco y sus Municipios-120226.pdf` },
        { nombre: 'Ley de Personas Desaparecidas del Estado de Jalisco', url: `${JALISCO_BASE}/Ley de Personas Desaparecidas del Estado de Jalisco-121125.pdf` },
        { nombre: 'Ley de Planeación Participativa para el Estado de Jalisco y sus Municipios', url: `${JALISCO_BASE}/Ley de Planeacion Participativa para el Estado de Jalisco y sus Municipios-230223.pdf` },
        { nombre: 'Ley de Prevención Social de la Violencia y la Delincuencia del Estado de Jalisco', url: `${JALISCO_BASE}/Ley de Prevencion Social de la Violencia y la Delincuencia del Estado de Jalisco-230223.pdf` },
        { nombre: 'Ley de Promoción y Desarrollo Artesanal del Estado de Jalisco', url: `${JALISCO_BASE}/Ley de Promocion y Desarrollo Artesanal del Estado de Jalisco-240223.pdf` },
        { nombre: 'Ley de Protección Civil del Estado', url: `${JALISCO_BASE}/Ley de Proteccion Civil del Estado-091225.pdf` },
        { nombre: 'Ley de Protección contra la Exposición al Humo de Tabaco para el Estado de Jalisco', url: `${JALISCO_BASE}/Ley de Proteccion contra la Exposicion al Humo de Tabaco para el Estado de Jalisco-240223.pdf` },
        { nombre: 'Ley de Protección de Datos Personales en Posesión de Sujetos Obligados del Estado de Jalisco y sus Municipios', url: `${JALISCO_BASE}/Ley de Proteccion de Datos Personales en Posesion de Sujetos Obligados del Estado de Jalisco y sus Municipios -240223.pdf` },
        { nombre: 'Ley de Protección y Atención de los Migrantes en el Estado de Jalisco', url: `${JALISCO_BASE}/Ley de Proteccion y Atencion de los Migrantes en el Estado de Jalisco-111225.pdf` },
        { nombre: 'Ley de Protección y Cuidado de los Animales del Estado de Jalisco', url: `${JALISCO_BASE}/Ley de Proteccion y Cuidado de los Animales del Estado de Jalisco-250226.pdf` },
        { nombre: 'Ley de Protección, Conservación y Fomento de Arbolado y Áreas Verdes Urbanas del Estado de Jalisco y sus Municipios', url: `${JALISCO_BASE}/Ley de Proteccion Conservacion y Fomento de Arbolado y Areas Verdes Urbanas del Estado de Jalisco y sus Municipios-240223.pdf` },
        { nombre: 'Ley de Proyectos de Inversión y de Prestación de Servicios del Estado de Jalisco y sus Municipios', url: `${JALISCO_BASE}/Ley de Proyectos de Inversion y de Prestacion de Servicios del Estado de Jalisco y sus Municipios-240223.pdf` },
        { nombre: 'Ley de Responsabilidad Patrimonial del Estado de Jalisco y sus Municipios', url: `${JALISCO_BASE}/Ley de Responsabilidad Patrimonial del Estado de Jalisco y sus Municipios-240223.pdf` },
        { nombre: 'Ley de Responsabilidades Políticas y Administrativas del Estado de Jalisco', url: `${JALISCO_BASE}/Ley de Responsabilidades Politicas y Administrativas del Estado de Jalisco-170323.pdf` },
        { nombre: 'Ley de Salud Mental y Adicciones del Estado de Jalisco', url: `${JALISCO_BASE}/Ley de Salud Mental y Adicciones del Estado de Jalisco-190724.pdf` },
        { nombre: 'Ley de Salud del Estado de Jalisco', url: `${JALISCO_BASE}/Ley de Salud del Estado de Jalisco-110226.pdf` },
        { nombre: 'Ley de Sujetos Protegidos para el Estado de Jalisco', url: `${JALISCO_BASE}/Ley de Sujetos Protegidos para el Estado de Jalisco-121225.pdf` },
        { nombre: 'Ley de Transparencia y Acceso a la Información Pública del Estado de Jalisco y sus Municipios', url: `${JALISCO_BASE}/Ley de Transparencia y Acceso a la Informacion Publica del Estado de Jalisco y sus Municipios-180823.pdf` },
        { nombre: 'Ley de Turismo para el Estado de Jalisco y sus Municipios', url: `${JALISCO_BASE}/Ley de Turismo para el Estado de Jalisco y sus Municipios-270223.pdf` },
        { nombre: 'Ley de Vivienda del Estado de Jalisco', url: `${JALISCO_BASE}/Ley de Vivienda del Estado de Jalisco-181125.pdf` },
        { nombre: 'Ley de la Comisión Estatal de Derechos Humanos', url: `${JALISCO_BASE}/Ley de la Comision Estatal de Derechos Humanos-211125.pdf` },
        { nombre: 'Ley de los Derechos de Niñas, Niños y Adolescentes en el Estado de Jalisco', url: `${JALISCO_BASE}/Ley de los Derechos de Ninas Ninos y Adolescentes en el Estado de Jalisco-281125.pdf` },
        { nombre: 'Ley de los Derechos de las Personas Adultas Mayores del Estado de Jalisco', url: `${JALISCO_BASE}/Ley de los Derechos de las Personas Adultas Mayores del Estado de Jalisco-211024.pdf` },
        { nombre: 'Ley de los Símbolos Oficiales del Estado de Jalisco', url: `${JALISCO_BASE}/Ley de los Simbolos Oficiales del Estado de Jalisco-011225.pdf` },
        { nombre: 'Ley del Agua para el Estado y sus Municipios', url: `${JALISCO_BASE}/Ley del Agua para el Estado y sus Municipios-200126.pdf` },
        { nombre: 'Ley del Centro de Atención para las Víctimas del Delito', url: `${JALISCO_BASE}/Ley del Centro de Atencion para las Victimas del Delito-270223.pdf` },
        { nombre: 'Ley del Gobierno y la Administración Pública Municipal del Estado de Jalisco', url: `${JALISCO_BASE}/Ley del Gobierno y la Administracion Publica Municipal del Estado de Jalisco-080925.pdf` },
        { nombre: 'Ley del Instituto de Pensiones del Estado de Jalisco', url: `${JALISCO_BASE}/Ley del Instituto de Pensiones del Estado de Jalisco-200824.pdf` },
        { nombre: 'Ley del Notariado del Estado de Jalisco', url: `${JALISCO_BASE}/Ley del Notariado del Estado de Jalisco-190423.pdf` },
        { nombre: 'Ley del Organismo Público Descentralizado Hospital Civil de Guadalajara', url: `${JALISCO_BASE}/Ley del Organismo Publico Descentralizado Hospital Civil de Guadalajara-280223.pdf` },
        { nombre: 'Ley del Organismo Público Descentralizado Servicios de Salud Jalisco', url: `${JALISCO_BASE}/Ley del Organismo Publico Descentralizado Servicios de Salud Jalisco-190423.pdf` },
        { nombre: 'Ley del Organismo Público Descentralizado denominado Bosque la Primavera', url: `${JALISCO_BASE}/Ley del Organismo Publico Descentralizado denominado Bosque la Primavera-280223.pdf` },
        { nombre: 'Ley del Periódico Oficial El Estado de Jalisco', url: `${JALISCO_BASE}/Ley del Periodico Oficial El Estado de Jalisco-280223.pdf` },
        { nombre: 'Ley del Presupuesto, Contabilidad  y Gasto Público del Estado de Jalisco', url: `${JALISCO_BASE}/Ley del Presupuesto Contabilidad y Gasto Publico del Estado de Jalisco-161024.pdf` },
        { nombre: 'Ley del Procedimiento Administrativo del Estado de Jalisco', url: `${JALISCO_BASE}/Ley del Procedimiento Administrativo del Estado de Jalisco-140623.pdf` },
        { nombre: 'Ley del Registro Civil del Estado de Jalisco', url: `${JALISCO_BASE}/Ley del Registro Civil del Estado de Jalisco-160725.pdf` },
        { nombre: 'Ley del Registro Público de la Propiedad del Estado de Jalisco', url: `${JALISCO_BASE}/Ley del Registro Publico de la Propiedad del Estado de Jalisco-280223.pdf` },
        { nombre: 'Ley del Servicio Estatal Tributario de Jalisco', url: `${JALISCO_BASE}/Ley del Servicio Estatal Tributario de Jalisco-200623.pdf` },
        { nombre: 'Ley del Servicio de Protección para el Estado de Jalisco y sus Municipios', url: `${JALISCO_BASE}/Ley del Servicio de Proteccion para el Estado de Jalisco y sus Municipios-181024.pdf` },
        { nombre: 'Ley del Sistema Anticorrupción del Estado de Jalisco', url: `${JALISCO_BASE}/Ley del Sistema Anticorrupcion del Estado de Jalisco-150623.pdf` },
        { nombre: 'Ley del Sistema Integral de Cuidados para el Estado de Jalisco', url: `${JALISCO_BASE}/Ley del Sistema Integral de Cuidados para el Estado de Jalisco-190424.pdf` },
        { nombre: 'Ley del Sistema de Agua Potable y Alcantarillado de Chapala, Jalisco', url: `${JALISCO_BASE}/Ley del Sistema de Agua Potable y Alcantarillado de Chapala Jalisco-010323.pdf` },
        { nombre: 'Ley del Sistema de Agua Potable y Alcantarillado de Ciudad Guzmán, Jalisco', url: `${JALISCO_BASE}/Ley del Sistema de Agua Potable y Alcantarillado de Ciudad Guzman Jalisco-010323.pdf` },
        { nombre: 'Ley del Sistema de Agua Potable y Alcantarillado de Zapotlanejo, Jalisco', url: `${JALISCO_BASE}/Ley del Sistema de Agua Potable y Alcantarillado de Zapotlanejo Jalisco-010323.pdf` },
        { nombre: 'Ley del Sistema de Participación Ciudadana y Popular para la Gobernanza del Estado de Jalisco', url: `${JALISCO_BASE}/Ley del Sistema de Participacion Ciudadana y Popular para la Gobernanza del Estado de Jalisco-010323.pdf` },
        { nombre: 'Ley del Sistema de Seguridad Pública para el Estado de Jalisco', url: `${JALISCO_BASE}/Ley del Sistema de Seguridad Publica para el Estado de Jalisco-150125.pdf` },
        { nombre: 'Ley para Garantizar el Derecho Humano a la Alimentación del Estado de Jalisco', url: `${JALISCO_BASE}/Ley para Garantizar el Derecho Humano a la Alimentacion del Estado de Jalisco-190424.pdf` },
        { nombre: 'Ley para Prevenir, Sancionar, Erradicar y Reparar la Tortura y otros Tratos o Penas crueles e Inhumanos o degradantes del Estado de Jalisco', url: `${JALISCO_BASE}/Ley para Prevenir Sancionar Erradicar y Reparar la Tortura y otros Tratos o Penas crueles e Inhumanos o degradantes del Estado de Jalisco-310323.pdf` },
        { nombre: 'Ley para Regular la Venta y el Consumo de Bebidas Alcohólicas del Estado de Jalisco', url: `${JALISCO_BASE}/Ley para Regular la Venta y el Consumo de Bebidas Alcoholicas del Estado de Jalisco-040326.pdf` },
        { nombre: 'Ley para el Desarrollo Económico del Estado de Jalisco', url: `${JALISCO_BASE}/Ley para el Desarrollo Economico del Estado de Jalisco-120424.pdf` },
        { nombre: 'Ley para el Desarrollo Integral de las Juventudes del Estado de Jalisco', url: `${JALISCO_BASE}/Ley para el Desarrollo Integral de las Juventudes del Estado de Jalisco-200723.pdf` },
        { nombre: 'Ley para el Ejercicio de las Actividades Profesionales del Estado de Jalisco', url: `${JALISCO_BASE}/Ley para el Ejercicio de las Actividades Profesionales del Estado de Jalisco-070623.pdf` },
        { nombre: 'Ley para el Fomento y Participación de las Organizaciones de la Sociedad Civil en el Estado de Jalisco', url: `${JALISCO_BASE}/Ley para el Fomento y Participacion de las Organizaciones de la Sociedad Civil en el Estado de Jalisco-270323.pdf` },
        { nombre: 'Ley para la Acción ante el Cambio Climático del Estado de Jalisco', url: `${JALISCO_BASE}/Ley para la Accion ante el Cambio Climatico del Estado de Jalisco-270323.pdf` },
        { nombre: 'Ley para la Administración de Bienes Asegurados, Decomisados o Abandonados para el Estado de Jalisco', url: `${JALISCO_BASE}/Ley para la Administracion de Bienes Asegurados Decomisados o Abandonados para el Estado de Jalisco-280323.pdf` },
        { nombre: 'Ley para la Declaración Especial de Ausencia por Desaparición de Personas del Estado de Jalisco', url: `${JALISCO_BASE}/Ley para la Declaracion Especial de Ausencia por Desaparicion de Personas del Estado de Jalisco-100424.pdf` },
        { nombre: 'Ley para la Detección y Tratamiento Oportuno e Integral del Cáncer en la Infancia y en la Adolescencia del Estado de Jalisco', url: `${JALISCO_BASE}/Ley para la Deteccion y Tratamiento Oportuno e Integral del Cancer en la Infancia y en la Adolescencia del Estado de Jalisco-141122.pdf` },
        { nombre: 'Ley para la Inclusión y Desarrollo Integral de las personas con Discapacidad del Estado de Jalisco', url: `${JALISCO_BASE}/Ley para la Inclusion y Desarrollo Integral de las personas con Discapacidad del Estado de Jalisco-230424.pdf` },
        { nombre: 'Ley para la Operación de Albergues del Estado de Jalisco', url: `${JALISCO_BASE}/Ley para la Operacion de Albergues del Estado de Jalisco-290323.pdf` },
        { nombre: 'Ley para la Prevención y Atención de la Violencia Intrafamiliar del Estado de Jalisco', url: `${JALISCO_BASE}/Ley para la Prevencion y Atencion de la Violencia Intrafamiliar del Estado de Jalisco-290424.pdf` },
        { nombre: 'Ley para la Promoción de Inversiones en el Estado de Jalisco', url: `${JALISCO_BASE}/Ley para la Promocion de Inversiones en el Estado de Jalisco-171023.pdf` },
        { nombre: 'Ley para la Protección de Personas Defensoras de los Derechos Humanos y Periodistas del Estado de Jalisco', url: `${JALISCO_BASE}/Ley para la Proteccion de Personas Defensoras de los Derechos Humanos y Periodistas del Estado de Jalisco-180226.pdf` },
        { nombre: 'Ley para la Protección y Apoyo de las Madres Jefas de Familia del Estado de Jalisco', url: `${JALISCO_BASE}/Ley para la Proteccion y Apoyo de las Madres Jefas de Familia del Estado de Jalisco-290323.pdf` },
        { nombre: 'Ley para la Regularización y Titulación de Predios Urbanos en el Estado de Jalisco', url: `${JALISCO_BASE}/Ley para la Regularizacion y Titulacion de Predios Urbanos en el Estado de Jalisco-290323.pdf` },
        { nombre: 'Ley para las Personas con Transtorno del Espectro del Autismo en el Estado de Jalisco', url: `${JALISCO_BASE}/Ley para las Personas con Transtorno del Espectro del Autismo en el Estado de Jalisco-290323.pdf` },
        { nombre: 'Ley para los Servidores Públicos del Estado de Jalisco y sus Municipios', url: `${JALISCO_BASE}/Ley para los Servidores Publicos del Estado de Jalisco y sus Municipios-130623.pdf` },
        { nombre: 'Ley que Crea el Organismo Público Descentralizado del Poder Ejecutivo denominado Sistema Intermunicipal de los Servicios de Agua Potable y Alcantarillado', url: `${JALISCO_BASE}/Ley que Crea el Organismo Publico Descentralizado del Poder Ejecutivo denominado Sistema Intermunicipal de los Servicios de Agua Potable y Alcantarillado-210825.pdf` },
        { nombre: 'Ley que Crea el Sistema de Agua Potable y Alcantarillado de Degollado, Jalisco', url: `${JALISCO_BASE}/Ley que Crea el Sistema de Agua Potable y Alcantarillado de Degollado Jalisco-310323.pdf` },
        { nombre: 'Ley que Establece el Registro y Acreditación de los Prestadores de Servicios en Materia Inmobiliaria del Estado de Jalisco', url: `${JALISCO_BASE}/Ley que Establece el Registro y Acreditacion de los Prestadores de Servicios en Materia Inmobiliaria del Estado de Jalisco-180823.pdf` },
        { nombre: 'Ley que Establece la Remuneración de los Auxiliares en la Administración de la Justicia', url: `${JALISCO_BASE}/Ley que Establece la Remuneracion de los Auxiliares en la Administracion de la Justicia-310323.pdf` },
        { nombre: 'Ley que Establece las Bases para el Otorgamiento de Premios y Condecoraciones en el Estado de Jalisco', url: `${JALISCO_BASE}/Ley que Establece las Bases para el Otorgamiento de Premios y Condecoraciones en el Estado de Jalisco-240424.pdf` },
        { nombre: 'Ley que Regula los Centros de Atención Infantil en el Estado de Jalisco', url: `${JALISCO_BASE}/Ley que Regula los Centros de Atencion Infantil en el Estado de Jalisco-310323.pdf` },
        { nombre: 'Ley que aprueba el Plan Parcial de Urbanización y Control de la Edificación para la Protección Ecológica de la Zona de Los Colomos', url: `${JALISCO_BASE}/Ley que aprueba el Plan Parcial de Urbanizacion y Control de la Edificacion para la Proteccion Ecologica de la Zona de Los Colomos-310323.pdf` },
        { nombre: 'Ley que aprueba el Plan de Ordenamiento de la Zona Conurbada de Guadalajara', url: `${JALISCO_BASE}/Ley que aprueba el Plan de Ordenamiento de la Zona Conurbada de Guadalajara-310323.pdf` },
        { nombre: 'Ley que crea el Instituto de la Infraestructura Física Educativa del Estado de Jalisco', url: `${JALISCO_BASE}/Ley que crea el Instituto de la Infraestructura Fisica Educativa del Estado de Jalisco -290523.pdf` },
        { nombre: 'Ley que crea el Sistema de Agua Potable y Alcantarillado de Casimiro Castillo, Jalisco', url: `${JALISCO_BASE}/Ley que crea el Sistema de Agua Potable y Alcantarillado de Casimiro Castillo Jalisco-310323.pdf` },
        { nombre: 'Ley que crea el Sistema de Agua Potable y Alcantarillado de Unión de Tula, Jalisco', url: `${JALISCO_BASE}/Ley que crea el Sistema de Agua Potable y Alcantarillado de Union de Tula Jalisco-310323.pdf` },
        { nombre: 'Ley que crea la Industria Jalisciense de Rehabilitación Social', url: `${JALISCO_BASE}/Ley que crea la Industria Jalisciense de Rehabilitacion Social-310323.pdf` },
        { nombre: 'Ley que divide los Bienes Pertenecientes al Estado en Bienes de Dominio Público y Bienes de Dominio Privado', url: `${JALISCO_BASE}/Ley que divide los Bienes Pertenecientes al Estado en Bienes de Dominio Publico y Bienes de Dominio Privado-310323.pdf` },
        { nombre: 'Ley sobre el Establecimiento de Fundos Legales para los Campesinos del Estado', url: `${JALISCO_BASE}/Ley sobre el Establecimiento de Fundos Legales para los Campesinos del Estado-310323.pdf` },
        { nombre: 'Ley sobre los Derechos y el Desarrollo de los Pueblos y las Comunidades Indígenas del Estado de Jalisco', url: `${JALISCO_BASE}/Ley sobre los Derechos y el Desarrollo de los Pueblos y las Comunidades Indigenas del Estado de Jalisco-310323.pdf` },
    ],
    codigos: [
        { nombre: 'Código Civil del Estado de Jalisco', url: `${JALISCO_BASE}/Codigo Civil del Estado de Jalisco-121125.pdf` },
        { nombre: 'Código de Asistencia Social del Estado de Jalisco', url: `${JALISCO_BASE}/Codigo de Asistencia Social del Estado de Jalisco-251125.pdf` },
        { nombre: 'Código de Ética del Congreso del Estado de Jalisco', url: `${JALISCO_BASE}/Codigo de Etica del Congreso del Estado de Jalisco -100223.pdf` },
        { nombre: 'Código de Procedimientos Civiles del Estado de Jalisco', url: `${JALISCO_BASE}/Codigo de Procedimientos Civiles del Estado de Jalisco-250424.pdf` },
        { nombre: 'Código Electoral del Estado de Jalisco', url: `${JALISCO_BASE}/Codigo Electoral del Estado de Jalisco-100725.pdf` },
        { nombre: 'Código Fiscal del Estado de Jalisco', url: `${JALISCO_BASE}/Codigo Fiscal del Estado de Jalisco-280524.pdf` },
        { nombre: 'Código Penal para el Estado Libre y Soberano de Jalisco', url: `${JALISCO_BASE}/Codigo Penal para el Estado Libre y Soberano de Jalisco -251125.pdf` },
        { nombre: 'Código Urbano para el Estado de Jalisco', url: `${JALISCO_BASE}/Codigo Urbano para el Estado de Jalisco-100823.pdf` },
    ],
    reglamentos: [],
    otros: [],
};

// ─── Estado de México: FULL DATA — PDFs hosted on Supabase ───────
const EDOMEX_BASE = 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/EdoMex';
const EDOMEX_LEYES: CategoriaLeyes = {
    constitucion: [
        { nombre: 'Constitución Política del Estado Libre y Soberano de México', url: `${EDOMEX_BASE}/leyvig001.pdf` },
    ],
    leyes: [
        { nombre: 'Ley Orgánica Municipal del Estado de México', url: `${EDOMEX_BASE}/leyvig022.pdf` },
        { nombre: 'Ley Orgánica de la Administración Pública del Estado de México', url: `${EDOMEX_BASE}/leyvig017.pdf` },
        { nombre: 'Ley Orgánica del Poder Judicial del Estado de México', url: `${EDOMEX_BASE}/leyvig020.pdf` },
        { nombre: 'Ley Orgánica del Poder Legislativo del Estado Libre y Soberano de México', url: `${EDOMEX_BASE}/leyvig021.pdf` },
        { nombre: 'Ley Orgánica del Tribunal de Justicia Administrativa del Estado de México', url: `${EDOMEX_BASE}/leyvig242.pdf` },
        { nombre: 'Ley Registral para el Estado de México', url: `${EDOMEX_BASE}/leyvig182.pdf` },
        { nombre: 'Ley Reglamentaria de las fracciones XXV y XXVI del artículo 61 de la Constitución Política del Estado Libre y Soberano de México', url: `${EDOMEX_BASE}/leyvig023.pdf` },
        { nombre: 'Ley Reglamentaria del Artículo 88 Bis de la Constitución Política del Estado Libre y Soberano de México', url: `${EDOMEX_BASE}/leyvig097.pdf` },
        { nombre: 'Ley de Acceso de las Mujeres a una Vida Libre de Violencia del Estado de México', url: `${EDOMEX_BASE}/leyvig139.pdf` },
        { nombre: 'Ley de Amnistía del Estado de México', url: `${EDOMEX_BASE}/leyvig268.pdf` },
        { nombre: 'Ley de Apicultura del Estado de México', url: `${EDOMEX_BASE}/leyvig212.pdf` },
        { nombre: 'Ley de Apoyo a Migrantes del Estado de México', url: `${EDOMEX_BASE}/leyvig220.pdf` },
        { nombre: 'Ley de Arancel para el Pago de Honorarios de Abogados y Costas Judiciales en el Estado de México', url: `${EDOMEX_BASE}/leyvig003.pdf` },
        { nombre: 'Ley de Archivos y Administración de Documentos del Estado de México y Municipios', url: `${EDOMEX_BASE}/leyvig266.pdf` },
        { nombre: 'Ley de Asistencia Social del Estado de México y Municipios', url: `${EDOMEX_BASE}/leyvig004.pdf` },
        { nombre: 'Ley de Asociaciones Público Privadas del Estado de México y Municipios', url: `${EDOMEX_BASE}/leyvig251.pdf` },
        { nombre: 'Ley de Bienes del Estado de México y sus Municipios', url: `${EDOMEX_BASE}/leyvig085.pdf` },
        { nombre: 'Ley de Bienestar y Desarrollo Social del Estado de México', url: `${EDOMEX_BASE}/leyvig101.pdf` },
        { nombre: 'Ley de Cambio Climático del Estado de México', url: `${EDOMEX_BASE}/leyvig202.pdf` },
        { nombre: 'Ley de Ciencia y Tecnología del Estado de México', url: `${EDOMEX_BASE}/leyvig102.pdf` },
        { nombre: 'Ley de Competitividad y Ordenamiento Comercial del Estado de México', url: `${EDOMEX_BASE}/leyvig217.pdf` },
        { nombre: 'Ley de Contratación Pública del Estado de México y Municipios', url: `${EDOMEX_BASE}/leyvig192.pdf` },
        { nombre: 'Ley de Cultura Física y Deporte del Estado de México', url: `${EDOMEX_BASE}/leyvig089.pdf` },
        { nombre: 'Ley de Defensoría Pública del Estado de México', url: `${EDOMEX_BASE}/leyvig012.pdf` },
        { nombre: 'Ley de Depósito Legal para el Estado de México', url: `${EDOMEX_BASE}/leyvig174.pdf` },
        { nombre: 'Ley de Derechos y Cultura Indígena del Estado de México', url: `${EDOMEX_BASE}/leyvig090.pdf` },
        { nombre: 'Ley de Educación del Estado de México', url: `${EDOMEX_BASE}/leyvig180.pdf` },
        { nombre: 'Ley de Eventos Públicos del Estado de México', url: `${EDOMEX_BASE}/leyvig210.pdf` },
        { nombre: 'Ley de Expropiación para el Estado de México', url: `${EDOMEX_BASE}/leyvig007.pdf` },
        { nombre: 'Ley de Fiscalización Superior del Estado de México', url: `${EDOMEX_BASE}/leyvig096.pdf` },
        { nombre: 'Ley de Fomento Económico para el Estado de México', url: `${EDOMEX_BASE}/leyvig157.pdf` },
        { nombre: 'Ley de Fomento a las Actividades de las Organizaciones de la Sociedad Civil del Estado de México', url: `${EDOMEX_BASE}/leyvig287.pdf` },
        { nombre: 'Ley de Fomento de la Cultura de la Legalidad del Estado de México', url: `${EDOMEX_BASE}/leyvig213.pdf` },
        { nombre: 'Ley de Fomento para la Lectura y el Libro del Estado de México', url: `${EDOMEX_BASE}/leyvig292.pdf` },
        { nombre: 'Ley de Fomento y Protección del Maíz Nativo como Patrimonio Biocultural y Alimentario del Estado de México', url: `${EDOMEX_BASE}/leyvig278.pdf` },
        { nombre: 'Ley de Gobierno Digital del Estado de México y Municipios', url: `${EDOMEX_BASE}/leyvig228.pdf` },
        { nombre: 'Ley de Gobierno de Coalición, Reglamentaria de los artículos 61 fracción LI y 77 fracción XLVIII de la Constitución Política del Estado Libre y Soberano de México', url: `${EDOMEX_BASE}/leyvig277.pdf` },
        { nombre: 'Ley de Igualdad de Trato y Oportunidades entre Mujeres y Hombres del Estado de México', url: `${EDOMEX_BASE}/leyvig154.pdf` },
        { nombre: 'Ley de Indulto del Estado de México', url: `${EDOMEX_BASE}/leyvig232.pdf` },
        { nombre: 'Ley de Ingresos de los Municipios del Estado de México para el ejercicio fiscal 2026', url: `${EDOMEX_BASE}/leyvig290.pdf` },
        { nombre: 'Ley de Ingresos del Estado de México para el ejercicio fiscal 2026', url: `${EDOMEX_BASE}/leyvig289.pdf` },
        { nombre: 'Ley de Instituciones de Asistencia Privada del Estado de México', url: `${EDOMEX_BASE}/leyvig008.pdf` },
        { nombre: 'Ley de Justicia Cotidiana del Estado de México', url: `${EDOMEX_BASE}/leyvig276.pdf` },
        { nombre: 'Ley de Justicia Cívica del Estado de México y sus Municipios', url: `${EDOMEX_BASE}/leyvig283.pdf` },
        { nombre: 'Ley de Mediación, Conciliación y Promoción de la Paz Social para el Estado de México', url: `${EDOMEX_BASE}/leyvig173.pdf` },
        { nombre: 'Ley de Movilidad y Seguridad Vial del Estado de México y sus Municipios', url: `${EDOMEX_BASE}/leyvig222.pdf` },
        { nombre: 'Ley de Planeación del Estado de México y Municipios', url: `${EDOMEX_BASE}/leyvig087.pdf` },
        { nombre: 'Ley de Prestación de Servicios para la Atención, Cuidado y Desarrollo Integral Infantil en el Estado de México', url: `${EDOMEX_BASE}/leyvig203.pdf` },
        { nombre: 'Ley de Prevención del Tabaquismo y de Protección ante la Exposición al Humo de Tabaco en el Estado de México', url: `${EDOMEX_BASE}/leyvig188.pdf` },
        { nombre: 'Ley de Protección de Datos Personales en Posesión de Sujetos Obligados del Estado de México y Municipios', url: `${EDOMEX_BASE}/leyvig244.pdf` },
        { nombre: 'Ley de Responsabilidad Patrimonial para el Estado de México y Municipios', url: `${EDOMEX_BASE}/leyvig243.pdf` },
        { nombre: 'Ley de Responsabilidades Administrativas del Estado de México y Municipios', url: `${EDOMEX_BASE}/leyvig241.pdf` },
        { nombre: 'Ley de Seguridad Privada del Estado de México', url: `${EDOMEX_BASE}/leyvig078.pdf` },
        { nombre: 'Ley de Seguridad Social para los Servidores Públicos del Estado de México y Municipios', url: `${EDOMEX_BASE}/leyvig016.pdf` },
        { nombre: 'Ley de Seguridad del Estado de México', url: `${EDOMEX_BASE}/leyvig015.pdf` },
        { nombre: 'Ley de Transparencia y Acceso a la Información Pública del Estado de México y Municipios', url: `${EDOMEX_BASE}/leyvig233.pdf` },
        { nombre: 'Ley de Turismo Sostenible y Desarrollo Artesanal del Estado de México', url: `${EDOMEX_BASE}/leyvig270.pdf` },
        { nombre: 'Ley de Vigilancia de Medidas Cautelares y de la Suspensión Condicional del Proceso en el Estado de México', url: `${EDOMEX_BASE}/leyvig219.pdf` },
        { nombre: 'Ley de Vivienda del Estado de México', url: `${EDOMEX_BASE}/leyvig140.pdf` },
        { nombre: 'Ley de Voluntad Anticipada del Estado de México', url: `${EDOMEX_BASE}/leyvig191.pdf` },
        { nombre: 'Ley de Víctimas del Estado de México', url: `${EDOMEX_BASE}/leyvig223.pdf` },
        { nombre: 'Ley de la Comisión de Derechos Humanos del Estado de México', url: `${EDOMEX_BASE}/leyvig076.pdf` },
        { nombre: 'Ley de la Comisión de Impacto Estatal', url: `${EDOMEX_BASE}/leyvig269.pdf` },
        { nombre: 'Ley de la Fiscalía General de Justicia del Estado de México', url: `${EDOMEX_BASE}/leyvig236.pdf` },
        { nombre: 'Ley de la Juventud del Estado de México', url: `${EDOMEX_BASE}/leyvig152.pdf` },
        { nombre: 'Ley de la Universidad Autónoma del Estado de México', url: `${EDOMEX_BASE}/leyvig013.pdf` },
        { nombre: 'Ley de las Personas Adultas Mayores del Estado de México', url: `${EDOMEX_BASE}/leyvig138.pdf` },
        { nombre: 'Ley de los Cuerpos de Bomberos del Estado de México', url: `${EDOMEX_BASE}/leyvig274.pdf` },
        { nombre: 'Ley de los Derechos de Niñas, Niños y Adolescentes del Estado de México', url: `${EDOMEX_BASE}/leyvig098.pdf` },
        { nombre: 'Ley del Agua para el Estado de México y Municipios', url: `${EDOMEX_BASE}/leyvig002.pdf` },
        { nombre: 'Ley del Centro de Conciliación Laboral del Estado de México', url: `${EDOMEX_BASE}/leyvig259.pdf` },
        { nombre: 'Ley del Notariado del Estado de México', url: `${EDOMEX_BASE}/leyvig019.pdf` },
        { nombre: 'Ley del Periódico Oficial “Gaceta del Gobierno” del Estado de México', url: `${EDOMEX_BASE}/leyvig229.pdf` },
        { nombre: 'Ley del Programa de Derechos Humanos del Estado de México', url: `${EDOMEX_BASE}/leyvig238.pdf` },
        { nombre: 'Ley del Seguro de Desempleo para el Estado de México', url: `${EDOMEX_BASE}/leyvig183.pdf` },
        { nombre: 'Ley del Sistema Anticorrupción del Estado de México y Municipios', url: `${EDOMEX_BASE}/leyvig240.pdf` },
        { nombre: 'Ley del Trabajo de los Servidores Públicos del Estado y  Municipios', url: `${EDOMEX_BASE}/leyvig083.pdf` },
        { nombre: 'Ley del organismo público descentralizado de carácter estatal denominado Instituto de Políticas Pública del Estado de México y sus Municipios', url: `${EDOMEX_BASE}/leyvig267.pdf` },
        { nombre: 'Ley en materia de Desaparición Forzada de Personas y Desaparición Cometida por Particulares para el Estado Libre y Soberano de México', url: `${EDOMEX_BASE}/leyvig260.pdf` },
        { nombre: 'Ley para Prevenir y Atender el Acoso Escolar en el Estado de México', url: `${EDOMEX_BASE}/leyvig249.pdf` },
        { nombre: 'Ley para Prevenir y Sancionar la Tortura en el Estado de México', url: `${EDOMEX_BASE}/leyvig026.pdf` },
        { nombre: 'Ley para Prevenir, Atender y Combatir el Delito de Secuestro en el Estado de México', url: `${EDOMEX_BASE}/leyvig227.pdf` },
        { nombre: 'Ley para Prevenir, Atender y Combatir los Delitos en materia de Extorsión y Delitos Vinculados del Estado de México', url: `${EDOMEX_BASE}/leyvig293.pdf` },
        { nombre: 'Ley para Prevenir, Atender, Combatir y Erradicar la Trata de Personas y para la Protección y Asistencia a las Víctimas en el Estado de México', url: `${EDOMEX_BASE}/leyvig201.pdf` },
        { nombre: 'Ley para Prevenir, Combatir y Eliminar Actos de Discriminación en el Estado de México', url: `${EDOMEX_BASE}/leyvig025.pdf` },
        { nombre: 'Ley para la Administración de Bienes Vinculados al Procedimiento Penal y a la Extinción de Dominio para el Estado de México', url: `${EDOMEX_BASE}/leyvig215.pdf` },
        { nombre: 'Ley para la Atención y Protección a Personas con la Condición del Espectro Autista en el Estado de México', url: `${EDOMEX_BASE}/leyvig224.pdf` },
        { nombre: 'Ley para la Coordinación y Control de Organismos Auxiliares del Estado de México', url: `${EDOMEX_BASE}/leyvig024.pdf` },
        { nombre: 'Ley para la Declaración Especial de Ausencia por Desaparición de Personas del Estado de México', url: `${EDOMEX_BASE}/leyvig245.pdf` },
        { nombre: 'Ley para la Implementación de Energías Limpias y Renovables en los Edificios Públicos del Estado de México y Municipios', url: `${EDOMEX_BASE}/leyvig282.pdf` },
        { nombre: 'Ley para la Inclusión de las Personas con Discapacidad del Estado de México', url: `${EDOMEX_BASE}/leyvig189.pdf` },
        { nombre: 'Ley para la Prevención Social de la Violencia y la Delincuencia, con Participación Ciudadana del Estado de México', url: `${EDOMEX_BASE}/leyvig193.pdf` },
        { nombre: 'Ley para la Prevención, Tratamiento y Combate del Sobrepeso, la Obesidad y los Trastornos Alimentarios del Estado de México y sus Municipios', url: `${EDOMEX_BASE}/leyvig230.pdf` },
        { nombre: 'Ley para la Protección Integral de Periodistas y Personas Defensoras de los Derechos Humanos del Estado de México', url: `${EDOMEX_BASE}/leyvig271.pdf` },
        { nombre: 'Ley para la Protección de Sujetos que Intervienen en el Procedimiento Penal o de Extinción de Dominio del Estado de México', url: `${EDOMEX_BASE}/leyvig216.pdf` },
        { nombre: 'Ley para la Protección del Maguey en el Estado de México', url: `${EDOMEX_BASE}/leyvig211.pdf` },
        { nombre: 'Ley para la Protección, Apoyo y Promoción a la Lactancia Materna del Estado de México', url: `${EDOMEX_BASE}/leyvig218.pdf` },
        { nombre: 'Ley para la Recuperación y Aprovechamiento de Alimentos del Estado de México', url: `${EDOMEX_BASE}/leyvig257.pdf` },
        { nombre: 'Ley por el que se crea el Organismo Público Descentralizado denominado “Instituto Municipal de Cultura Física y Deporte de Lerma', url: `${EDOMEX_BASE}/leyvig264.pdf` },
        { nombre: 'Ley por la que se crea el Organismo Público Descentralizado denominado Instituto Municipal de Cultura Física y Deporte de Ecatepec de Morelos, México (IMCUFIDEEM)', url: `${EDOMEX_BASE}/leyvig265.pdf` },
        { nombre: 'Ley que Crea el Organismo Público Descentralizado Denominado Instituto Municipal de Cultura Física y Deporte de Acambay', url: `${EDOMEX_BASE}/leyvig124.pdf` },
        { nombre: 'Ley que Crea el Organismo Público Descentralizado Denominado Instituto Municipal de Cultura Física y Deporte de Acolman', url: `${EDOMEX_BASE}/leyvig123.pdf` },
        { nombre: 'Ley que Crea el Organismo Público Descentralizado Denominado Instituto Municipal de Cultura Física y Deporte de Amatepec', url: `${EDOMEX_BASE}/leyvig122.pdf` },
        { nombre: 'Ley que Crea el Organismo Público Descentralizado Denominado Instituto Municipal de Cultura Física y Deporte de Atlacomulco', url: `${EDOMEX_BASE}/leyvig121.pdf` },
        { nombre: 'Ley que Crea el Organismo Público Descentralizado Denominado Instituto Municipal de Cultura Física y Deporte de Chapultepec', url: `${EDOMEX_BASE}/leyvig119.pdf` },
        { nombre: 'Ley que Crea el Organismo Público Descentralizado Denominado Instituto Municipal de Cultura Física y Deporte de Chiautla', url: `${EDOMEX_BASE}/leyvig129.pdf` },
        { nombre: 'Ley que Crea el Organismo Público Descentralizado Denominado Instituto Municipal de Cultura Física y Deporte de Chimalhuacán', url: `${EDOMEX_BASE}/leyvig128.pdf` },
        { nombre: 'Ley que Crea el Organismo Público Descentralizado Denominado Instituto Municipal de Cultura Física y Deporte de Coatepec Harinas', url: `${EDOMEX_BASE}/leyvig120.pdf` },
        { nombre: 'Ley que Crea el Organismo Público Descentralizado Denominado Instituto Municipal de Cultura Física y Deporte de Cuautitlán', url: `${EDOMEX_BASE}/leyvig127.pdf` },
        { nombre: 'Ley que Crea el Organismo Público Descentralizado Denominado Instituto Municipal de Cultura Física y Deporte de Cuautitlán Izcalli', url: `${EDOMEX_BASE}/leyvig126.pdf` },
        { nombre: 'Ley que Crea el Organismo Público Descentralizado Denominado Instituto Municipal de Cultura Física y Deporte de Huehuetoca', url: `${EDOMEX_BASE}/leyvig130.pdf` },
        { nombre: 'Ley que Crea el Organismo Público Descentralizado Denominado Instituto Municipal de Cultura Física y Deporte de Hueypoxtla', url: `${EDOMEX_BASE}/leyvig118.pdf` },
        { nombre: 'Ley que Crea el Organismo Público Descentralizado Denominado Instituto Municipal de Cultura Física y Deporte de Ixtapan de la Sal', url: `${EDOMEX_BASE}/leyvig117.pdf` },
        { nombre: 'Ley que Crea el Organismo Público Descentralizado Denominado Instituto Municipal de Cultura Física y Deporte de Joquicingo', url: `${EDOMEX_BASE}/leyvig137.pdf` },
        { nombre: 'Ley que Crea el Organismo Público Descentralizado Denominado Instituto Municipal de Cultura Física y Deporte de Luvianos', url: `${EDOMEX_BASE}/leyvig136.pdf` },
        { nombre: 'Ley que Crea el Organismo Público Descentralizado Denominado Instituto Municipal de Cultura Física y Deporte de Mexicaltzingo', url: `${EDOMEX_BASE}/leyvig135.pdf` },
        { nombre: 'Ley que Crea el Organismo Público Descentralizado Denominado Instituto Municipal de Cultura Física y Deporte de Nextlalpan', url: `${EDOMEX_BASE}/leyvig134.pdf` },
        { nombre: 'Ley que Crea el Organismo Público Descentralizado Denominado Instituto Municipal de Cultura Física y Deporte de Nicolás Romero', url: `${EDOMEX_BASE}/leyvig131.pdf` },
        { nombre: 'Ley que Crea el Organismo Público Descentralizado Denominado Instituto Municipal de Cultura Física y Deporte de Polotitlán', url: `${EDOMEX_BASE}/leyvig132.pdf` },
        { nombre: 'Ley que Crea el Organismo Público Descentralizado Denominado Instituto Municipal de Cultura Física y Deporte de San Felipe del Progreso', url: `${EDOMEX_BASE}/leyvig133.pdf` },
        { nombre: 'Ley que Crea el Organismo Público Descentralizado Denominado Instituto Municipal de Cultura Física y Deporte de Tonatico', url: `${EDOMEX_BASE}/leyvig125.pdf` },
        { nombre: 'Ley que Crea el Organismo Público Descentralizado Denominado Instituto de Formación Continua, Profesionalización e Investigación del Magisterio del Estado', url: `${EDOMEX_BASE}/leyvig239.pdf` },
        { nombre: 'Ley que Crea el Organismo Público Descentralizado de Carácter Estatal Denominado Hospital Regional de Alta Especialidad de Zumpango', url: `${EDOMEX_BASE}/leyvig028.pdf` },
        { nombre: 'Ley que Regula el Régimen de Propiedad en Condominio en el Estado de México', url: `${EDOMEX_BASE}/leyvig088.pdf` },
        { nombre: 'Ley que Regula el Uso de Tecnologías de la Información y Comunicación para la Seguridad Pública del Estado de México', url: `${EDOMEX_BASE}/leyvig209.pdf` },
        { nombre: 'Ley que crea el Banco de Tejidos del Estado de México', url: `${EDOMEX_BASE}/leyvig155.pdf` },
        { nombre: 'Ley que crea el Instituto de Verificación Administrativa del Estado de México', url: `${EDOMEX_BASE}/leyvig237.pdf` },
        { nombre: 'Ley que crea el Organismo Público Descentralizado Denominado Instituto Municipal de Cultura Física y Deporte de Capulhuac', url: `${EDOMEX_BASE}/leyvig047.pdf` },
        { nombre: 'Ley que crea el Organismo Público Descentralizado de Carácter Estatal denominado Instituto Mexiquense de la Pirotecnia', url: `${EDOMEX_BASE}/leyvig092.pdf` },
        { nombre: 'Ley que crea el Organismo Público Descentralizado de Carácter Estatal denominado Instituto Mexiquense de la Vivienda Social', url: `${EDOMEX_BASE}/leyvig093.pdf` },
        { nombre: 'Ley que crea el Organismo Público Descentralizado de Carácter Estatal denominado Tecnológico de Estudios Superiores de Coacalco', url: `${EDOMEX_BASE}/leyvig070.pdf` },
        { nombre: 'Ley que crea el Organismo Público Descentralizado de Carácter Estatal denominado Universidad Tecnológica de Tecámac', url: `${EDOMEX_BASE}/leyvig072.pdf` },
        { nombre: 'Ley que crea el Organismo Público Descentralizado de Carácter Municipal para el Mantenimiento de Vialidades de Cuautitlán Izcalli', url: `${EDOMEX_BASE}/leyvig086.pdf` },
        { nombre: 'Ley que crea el Organismo Público Descentralizado de carácter Estatal denominado Colegio de Estudios Científicos y Tecnológicos del Estado de México', url: `${EDOMEX_BASE}/leyvig031.pdf` },
        { nombre: 'Ley que crea el Organismo Público Descentralizado de carácter Estatal denominado Tecnológico de Estudios Superiores de Ecatepec', url: `${EDOMEX_BASE}/leyvig071.pdf` },
        { nombre: 'Ley que crea el Organismo Público Descentralizado de carácter Estatal denominado Universidad Tecnológica "Fidel Velázquez"', url: `${EDOMEX_BASE}/leyvig029.pdf` },
        { nombre: 'Ley que crea el Organismo Público Descentralizado de carácter Estatal denominado Universidad Tecnológica de Nezahualcóyotl', url: `${EDOMEX_BASE}/leyvig030.pdf` },
        { nombre: 'Ley que crea el Organismo Público Descentralizado denominado "Instituto Municipal de Cultura Física y Deporte de Toluca"', url: `${EDOMEX_BASE}/leyvig141.pdf` },
        { nombre: 'Ley que crea el Organismo Público Descentralizado denominado Colegio de Bachilleres del Estado de México', url: `${EDOMEX_BASE}/leyvig073.pdf` },
        { nombre: 'Ley que crea el Organismo Público Descentralizado denominado Consejo Estatal para el Desarrollo Integral de los Pueblos Indígenas del Estado de México', url: `${EDOMEX_BASE}/leyvig074.pdf` },
        { nombre: 'Ley que crea el Organismo Público Descentralizado denominado Instituto Municipal de Cultura Física y Deporte de Aculco', url: `${EDOMEX_BASE}/leyvig039.pdf` },
        { nombre: 'Ley que crea el Organismo Público Descentralizado denominado Instituto Municipal de Cultura Física y Deporte de Almoloya de Alquisiras', url: `${EDOMEX_BASE}/leyvig040.pdf` },
        { nombre: 'Ley que crea el Organismo Público Descentralizado denominado Instituto Municipal de Cultura Física y Deporte de Almoloya de Juárez', url: `${EDOMEX_BASE}/leyvig100.pdf` },
        { nombre: 'Ley que crea el Organismo Público Descentralizado denominado Instituto Municipal de Cultura Física y Deporte de Almoloya del Río', url: `${EDOMEX_BASE}/leyvig041.pdf` },
        { nombre: 'Ley que crea el Organismo Público Descentralizado denominado Instituto Municipal de Cultura Física y Deporte de Amanalco', url: `${EDOMEX_BASE}/leyvig042.pdf` },
        { nombre: 'Ley que crea el Organismo Público Descentralizado denominado Instituto Municipal de Cultura Física y Deporte de Amecameca, México', url: `${EDOMEX_BASE}/leyvig179.pdf` },
        { nombre: 'Ley que crea el Organismo Público Descentralizado denominado Instituto Municipal de Cultura Física y Deporte de Apaxco', url: `${EDOMEX_BASE}/leyvig043.pdf` },
        { nombre: 'Ley que crea el Organismo Público Descentralizado denominado Instituto Municipal de Cultura Física y Deporte de Atizapan', url: `${EDOMEX_BASE}/leyvig044.pdf` },
        { nombre: 'Ley que crea el Organismo Público Descentralizado denominado Instituto Municipal de Cultura Física y Deporte de Atlautla', url: `${EDOMEX_BASE}/leyvig033.pdf` },
        { nombre: 'Ley que crea el Organismo Público Descentralizado denominado Instituto Municipal de Cultura Física y Deporte de Axapusco', url: `${EDOMEX_BASE}/leyvig045.pdf` },
        { nombre: 'Ley que crea el Organismo Público Descentralizado denominado Instituto Municipal de Cultura Física y Deporte de Ayapango, México', url: `${EDOMEX_BASE}/leyvig159.pdf` },
        { nombre: 'Ley que crea el Organismo Público Descentralizado denominado Instituto Municipal de Cultura Física y Deporte de Calimaya', url: `${EDOMEX_BASE}/leyvig046.pdf` },
        { nombre: 'Ley que crea el Organismo Público Descentralizado denominado Instituto Municipal de Cultura Física y Deporte de Chicoloapan, México', url: `${EDOMEX_BASE}/leyvig199.pdf` },
        { nombre: 'Ley que crea el Organismo Público Descentralizado denominado Instituto Municipal de Cultura Física y Deporte de Chiconcuac, México', url: `${EDOMEX_BASE}/leyvig148.pdf` },
        { nombre: 'Ley que crea el Organismo Público Descentralizado denominado Instituto Municipal de Cultura Física y Deporte de Coacalco de Berriozábal', url: `${EDOMEX_BASE}/leyvig145.pdf` },
        { nombre: 'Ley que crea el Organismo Público Descentralizado denominado Instituto Municipal de Cultura Física y Deporte de Cocotitlán', url: `${EDOMEX_BASE}/leyvig034.pdf` },
        { nombre: 'Ley que crea el Organismo Público Descentralizado denominado Instituto Municipal de Cultura Física y Deporte de Donato Guerra, México', url: `${EDOMEX_BASE}/leyvig164.pdf` },
        { nombre: 'Ley que crea el Organismo Público Descentralizado denominado Instituto Municipal de Cultura Física y Deporte de Ecatzingo', url: `${EDOMEX_BASE}/leyvig038.pdf` },
        { nombre: 'Ley que crea el Organismo Público Descentralizado denominado Instituto Municipal de Cultura Física y Deporte de El Oro, México', url: `${EDOMEX_BASE}/leyvig169.pdf` },
        { nombre: 'Ley que crea el Organismo Público Descentralizado denominado Instituto Municipal de Cultura Física y Deporte de Huixquilucan', url: `${EDOMEX_BASE}/leyvig069.pdf` },
        { nombre: 'Ley que crea el Organismo Público Descentralizado denominado Instituto Municipal de Cultura Física y Deporte de Isidro Fabela', url: `${EDOMEX_BASE}/leyvig048.pdf` },
        { nombre: 'Ley que crea el Organismo Público Descentralizado denominado Instituto Municipal de Cultura Física y Deporte de Ixtapaluca', url: `${EDOMEX_BASE}/leyvig143.pdf` },
        { nombre: 'Ley que crea el Organismo Público Descentralizado denominado Instituto Municipal de Cultura Física y Deporte de Ixtapan del Oro, México', url: `${EDOMEX_BASE}/leyvig176.pdf` },
        { nombre: 'Ley que crea el Organismo Público Descentralizado denominado Instituto Municipal de Cultura Física y Deporte de Ixtlahuaca', url: `${EDOMEX_BASE}/leyvig116.pdf` },
        { nombre: 'Ley que crea el Organismo Público Descentralizado denominado Instituto Municipal de Cultura Física y Deporte de Jaltenco, México', url: `${EDOMEX_BASE}/leyvig177.pdf` },
        { nombre: 'Ley que crea el Organismo Público Descentralizado denominado Instituto Municipal de Cultura Física y Deporte de Jilotepec, México', url: `${EDOMEX_BASE}/leyvig151.pdf` },
        { nombre: 'Ley que crea el Organismo Público Descentralizado denominado Instituto Municipal de Cultura Física y Deporte de Jilotzingo', url: `${EDOMEX_BASE}/leyvig049.pdf` },
        { nombre: 'Ley que crea el Organismo Público Descentralizado denominado Instituto Municipal de Cultura Física y Deporte de Jiquipilco, México', url: `${EDOMEX_BASE}/leyvig207.pdf` },
        { nombre: 'Ley que crea el Organismo Público Descentralizado denominado Instituto Municipal de Cultura Física y Deporte de Jocotitlán', url: `${EDOMEX_BASE}/leyvig115.pdf` },
        { nombre: 'Ley que crea el Organismo Público Descentralizado denominado Instituto Municipal de Cultura Física y Deporte de Juchitepec', url: `${EDOMEX_BASE}/leyvig037.pdf` },
        { nombre: 'Ley que crea el Organismo Público Descentralizado denominado Instituto Municipal de Cultura Física y Deporte de La Paz, México', url: `${EDOMEX_BASE}/leyvig147.pdf` },
        { nombre: 'Ley que crea el Organismo Público Descentralizado denominado Instituto Municipal de Cultura Física y Deporte de Malinalco', url: `${EDOMEX_BASE}/leyvig050.pdf` },
        { nombre: 'Ley que crea el Organismo Público Descentralizado denominado Instituto Municipal de Cultura Física y Deporte de Metepec, México', url: `${EDOMEX_BASE}/leyvig175.pdf` },
        { nombre: 'Ley que crea el Organismo Público Descentralizado denominado Instituto Municipal de Cultura Física y Deporte de Morelos, México', url: `${EDOMEX_BASE}/leyvig160.pdf` },
        { nombre: 'Ley que crea el Organismo Público Descentralizado denominado Instituto Municipal de Cultura Física y Deporte de Naucalpan de Juárez', url: `${EDOMEX_BASE}/leyvig197.pdf` },
        { nombre: 'Ley que crea el Organismo Público Descentralizado denominado Instituto Municipal de Cultura Física y Deporte de Nezahualcóyotl, México', url: `${EDOMEX_BASE}/leyvig158.pdf` },
        { nombre: 'Ley que crea el Organismo Público Descentralizado denominado Instituto Municipal de Cultura Física y Deporte de Nopaltepec, México', url: `${EDOMEX_BASE}/leyvig161.pdf` },
        { nombre: 'Ley que crea el Organismo Público Descentralizado denominado Instituto Municipal de Cultura Física y Deporte de Ocoyoacac', url: `${EDOMEX_BASE}/leyvig051.pdf` },
        { nombre: 'Ley que crea el Organismo Público Descentralizado denominado Instituto Municipal de Cultura Física y Deporte de Ocuilan', url: `${EDOMEX_BASE}/leyvig052.pdf` },
        { nombre: 'Ley que crea el Organismo Público Descentralizado denominado Instituto Municipal de Cultura Física y Deporte de Otumba', url: `${EDOMEX_BASE}/leyvig053.pdf` },
        { nombre: 'Ley que crea el Organismo Público Descentralizado denominado Instituto Municipal de Cultura Física y Deporte de Otzoloapan, México', url: `${EDOMEX_BASE}/leyvig149.pdf` },
        { nombre: 'Ley que crea el Organismo Público Descentralizado denominado Instituto Municipal de Cultura Física y Deporte de Otzolotepec, México', url: `${EDOMEX_BASE}/leyvig162.pdf` },
        { nombre: 'Ley que crea el Organismo Público Descentralizado denominado Instituto Municipal de Cultura Física y Deporte de Ozumba', url: `${EDOMEX_BASE}/leyvig036.pdf` },
        { nombre: 'Ley que crea el Organismo Público Descentralizado denominado Instituto Municipal de Cultura Física y Deporte de Papalotla', url: `${EDOMEX_BASE}/leyvig054.pdf` },
        { nombre: 'Ley que crea el Organismo Público Descentralizado denominado Instituto Municipal de Cultura Física y Deporte de Rayón', url: `${EDOMEX_BASE}/leyvig055.pdf` },
        { nombre: 'Ley que crea el Organismo Público Descentralizado denominado Instituto Municipal de Cultura Física y Deporte de San Antonio la Isla', url: `${EDOMEX_BASE}/leyvig056.pdf` },
        { nombre: 'Ley que crea el Organismo Público Descentralizado denominado Instituto Municipal de Cultura Física y Deporte de San José del Rincón, México', url: `${EDOMEX_BASE}/leyvig196.pdf` },
        { nombre: 'Ley que crea el Organismo Público Descentralizado denominado Instituto Municipal de Cultura Física y Deporte de San Martín de las Pirámides', url: `${EDOMEX_BASE}/leyvig057.pdf` },
        { nombre: 'Ley que crea el Organismo Público Descentralizado denominado Instituto Municipal de Cultura Física y Deporte de San Mateo Atenco', url: `${EDOMEX_BASE}/leyvig058.pdf` },
        { nombre: 'Ley que crea el Organismo Público Descentralizado denominado Instituto Municipal de Cultura Física y Deporte de San Simón de Guerrero', url: `${EDOMEX_BASE}/leyvig114.pdf` },
        { nombre: 'Ley que crea el Organismo Público Descentralizado denominado Instituto Municipal de Cultura Física y Deporte de Santo Tomás', url: `${EDOMEX_BASE}/leyvig068.pdf` },
        { nombre: 'Ley que crea el Organismo Público Descentralizado denominado Instituto Municipal de Cultura Física y Deporte de Soyaniquilpan de Juárez, México', url: `${EDOMEX_BASE}/leyvig206.pdf` },
        { nombre: 'Ley que crea el Organismo Público Descentralizado denominado Instituto Municipal de Cultura Física y Deporte de Sultepec', url: `${EDOMEX_BASE}/leyvig113.pdf` },
        { nombre: 'Ley que crea el Organismo Público Descentralizado denominado Instituto Municipal de Cultura Física y Deporte de Tecámac', url: `${EDOMEX_BASE}/leyvig272.pdf` },
        { nombre: 'Ley que crea el Organismo Público Descentralizado denominado Instituto Municipal de Cultura Física y Deporte de Tejupilco, México', url: `${EDOMEX_BASE}/leyvig198.pdf` },
        { nombre: 'Ley que crea el Organismo Público Descentralizado denominado Instituto Municipal de Cultura Física y Deporte de Temamatla', url: `${EDOMEX_BASE}/leyvig112.pdf` },
        { nombre: 'Ley que crea el Organismo Público Descentralizado denominado Instituto Municipal de Cultura Física y Deporte de Temascalapa, México', url: `${EDOMEX_BASE}/leyvig165.pdf` },
        { nombre: 'Ley que crea el Organismo Público Descentralizado denominado Instituto Municipal de Cultura Física y Deporte de Temascalcingo, México', url: `${EDOMEX_BASE}/leyvig167.pdf` },
        { nombre: 'Ley que crea el Organismo Público Descentralizado denominado Instituto Municipal de Cultura Física y Deporte de Temascaltepec', url: `${EDOMEX_BASE}/leyvig111.pdf` },
        { nombre: 'Ley que crea el Organismo Público Descentralizado denominado Instituto Municipal de Cultura Física y Deporte de Temoaya, México', url: `${EDOMEX_BASE}/leyvig205.pdf` },
        { nombre: 'Ley que crea el Organismo Público Descentralizado denominado Instituto Municipal de Cultura Física y Deporte de Tenancingo', url: `${EDOMEX_BASE}/leyvig059.pdf` },
        { nombre: 'Ley que crea el Organismo Público Descentralizado denominado Instituto Municipal de Cultura Física y Deporte de Tenango del Aire', url: `${EDOMEX_BASE}/leyvig032.pdf` },
        { nombre: 'Ley que crea el Organismo Público Descentralizado denominado Instituto Municipal de Cultura Física y Deporte de Tenango del Valle', url: `${EDOMEX_BASE}/leyvig060.pdf` },
        { nombre: 'Ley que crea el Organismo Público Descentralizado denominado Instituto Municipal de Cultura Física y Deporte de Teoloyucan, México', url: `${EDOMEX_BASE}/leyvig163.pdf` },
        { nombre: 'Ley que crea el Organismo Público Descentralizado denominado Instituto Municipal de Cultura Física y Deporte de Teotihuacan', url: `${EDOMEX_BASE}/leyvig110.pdf` },
        { nombre: 'Ley que crea el Organismo Público Descentralizado denominado Instituto Municipal de Cultura Física y Deporte de Tepetlaoxtoc', url: `${EDOMEX_BASE}/leyvig109.pdf` },
        { nombre: 'Ley que crea el Organismo Público Descentralizado denominado Instituto Municipal de Cultura Física y Deporte de Tepetlixpa', url: `${EDOMEX_BASE}/leyvig035.pdf` },
        { nombre: 'Ley que crea el Organismo Público Descentralizado denominado Instituto Municipal de Cultura Física y Deporte de Tepotzotlán', url: `${EDOMEX_BASE}/leyvig108.pdf` },
        { nombre: 'Ley que crea el Organismo Público Descentralizado denominado Instituto Municipal de Cultura Física y Deporte de Tequixquiac, México', url: `${EDOMEX_BASE}/leyvig181.pdf` },
        { nombre: 'Ley que crea el Organismo Público Descentralizado denominado Instituto Municipal de Cultura Física y Deporte de Texcaltitlán', url: `${EDOMEX_BASE}/leyvig061.pdf` },
        { nombre: 'Ley que crea el Organismo Público Descentralizado denominado Instituto Municipal de Cultura Física y Deporte de Texcalyacac', url: `${EDOMEX_BASE}/leyvig062.pdf` },
        { nombre: 'Ley que crea el Organismo Público Descentralizado denominado Instituto Municipal de Cultura Física y Deporte de Tezoyuca, México', url: `${EDOMEX_BASE}/leyvig168.pdf` },
        { nombre: 'Ley que crea el Organismo Público Descentralizado denominado Instituto Municipal de Cultura Física y Deporte de Tianguistenco, México', url: `${EDOMEX_BASE}/leyvig200.pdf` },
        { nombre: 'Ley que crea el Organismo Público Descentralizado denominado Instituto Municipal de Cultura Física y Deporte de Timilpan', url: `${EDOMEX_BASE}/leyvig063.pdf` },
        { nombre: 'Ley que crea el Organismo Público Descentralizado denominado Instituto Municipal de Cultura Física y Deporte de Tlalmanalco', url: `${EDOMEX_BASE}/leyvig144.pdf` },
        { nombre: 'Ley que crea el Organismo Público Descentralizado denominado Instituto Municipal de Cultura Física y Deporte de Tlalnepantla de Baz', url: `${EDOMEX_BASE}/leyvig288.pdf` },
        { nombre: 'Ley que crea el Organismo Público Descentralizado denominado Instituto Municipal de Cultura Física y Deporte de Tlatlaya, México', url: `${EDOMEX_BASE}/leyvig150.pdf` },
        { nombre: 'Ley que crea el Organismo Público Descentralizado denominado Instituto Municipal de Cultura Física y Deporte de Tonanitla', url: `${EDOMEX_BASE}/leyvig064.pdf` },
        { nombre: 'Ley que crea el Organismo Público Descentralizado denominado Instituto Municipal de Cultura Física y Deporte de Tultepec, México', url: `${EDOMEX_BASE}/leyvig178.pdf` },
        { nombre: 'Ley que crea el Organismo Público Descentralizado denominado Instituto Municipal de Cultura Física y Deporte de Tultitlán, México', url: `${EDOMEX_BASE}/leyvig166.pdf` },
        { nombre: 'Ley que crea el Organismo Público Descentralizado denominado Instituto Municipal de Cultura Física y Deporte de Valle de Bravo', url: `${EDOMEX_BASE}/leyvig107.pdf` },
        { nombre: 'Ley que crea el Organismo Público Descentralizado denominado Instituto Municipal de Cultura Física y Deporte de Valle de Chalco Solidaridad, México', url: `${EDOMEX_BASE}/leyvig171.pdf` },
        { nombre: 'Ley que crea el Organismo Público Descentralizado denominado Instituto Municipal de Cultura Física y Deporte de Villa Guerrero', url: `${EDOMEX_BASE}/leyvig065.pdf` },
        { nombre: 'Ley que crea el Organismo Público Descentralizado denominado Instituto Municipal de Cultura Física y Deporte de Villa Victoria', url: `${EDOMEX_BASE}/leyvig066.pdf` },
        { nombre: 'Ley que crea el Organismo Público Descentralizado denominado Instituto Municipal de Cultura Física y Deporte de Villa de Allende', url: `${EDOMEX_BASE}/leyvig142.pdf` },
        { nombre: 'Ley que crea el Organismo Público Descentralizado denominado Instituto Municipal de Cultura Física y Deporte de Villa del Carbón', url: `${EDOMEX_BASE}/leyvig106.pdf` },
        { nombre: 'Ley que crea el Organismo Público Descentralizado denominado Instituto Municipal de Cultura Física y Deporte de Xalatlaco', url: `${EDOMEX_BASE}/leyvig067.pdf` },
        { nombre: 'Ley que crea el Organismo Público Descentralizado denominado Instituto Municipal de Cultura Física y Deporte de Xonacatlán, México', url: `${EDOMEX_BASE}/leyvig208.pdf` },
        { nombre: 'Ley que crea el Organismo Público Descentralizado denominado Instituto Municipal de Cultura Física y Deporte de Zacazonapan, México', url: `${EDOMEX_BASE}/leyvig170.pdf` },
        { nombre: 'Ley que crea el Organismo Público Descentralizado denominado Instituto Municipal de Cultura Física y Deporte de Zacualpan', url: `${EDOMEX_BASE}/leyvig104.pdf` },
        { nombre: 'Ley que crea el Organismo Público Descentralizado denominado Instituto Municipal de Cultura Física y Deporte de Zinacantepec', url: `${EDOMEX_BASE}/leyvig099.pdf` },
        { nombre: 'Ley que crea el Organismo Público Descentralizado denominado Instituto Municipal de Cultura Física y Deporte de Zumpahuacán', url: `${EDOMEX_BASE}/leyvig105.pdf` },
        { nombre: 'Ley que crea el Organismo Público Descentralizado denominado Instituto Municipal de Cultura Física y Deporte de Zumpango, México', url: `${EDOMEX_BASE}/leyvig172.pdf` },
        { nombre: 'Ley que crea el Organismo Público Descentralizado denominado Instituto Municipal de la Mujer de Toluca', url: `${EDOMEX_BASE}/leyvig258.pdf` },
        { nombre: 'Ley que crea el Organismo Público Descentralizado denominado Instituto de la Función Registral del Estado de México', url: `${EDOMEX_BASE}/leyvig103.pdf` },
        { nombre: 'Ley que crea el Organismo Público Descentralizado denominado Servicios Educativos Integrados al Estado de México', url: `${EDOMEX_BASE}/leyvig075.pdf` },
        { nombre: 'Ley que crea el Organismo Público Descentralizado denominado “Instituto Municipal de Cultura Física y Deporte de Chalco”, México', url: `${EDOMEX_BASE}/leyvig146.pdf` },
        { nombre: 'Ley que crea el Organismo Público Descentralizado denominado “Instituto Municipal de la Juventud de Ayapango”', url: `${EDOMEX_BASE}/leyvig235.pdf` },
        { nombre: 'Ley que crea los Organismos Públicos Descentralizados de Asistencia Social de Carácter Municipal denominados "Sistemas Municipales para el Desarrollo Integral de la Familia"', url: `${EDOMEX_BASE}/leyvig077.pdf` },
        { nombre: 'Ley que regula los Centros de Asistencia Social y las Adopciones en el Estado de México', url: `${EDOMEX_BASE}/leyvig225.pdf` },
        { nombre: 'Ley que transforma al Organo Desconcentrado denominado Instituto de Capacitación y Adiestramiento para el Trabajo Industrial (ICATI), en Organismo Descentralizado', url: `${EDOMEX_BASE}/leyvig079.pdf` },
        { nombre: 'Ley sobre el Escudo y el Himno del Estado de México', url: `${EDOMEX_BASE}/leyvig082.pdf` },
        { nombre: 'Presupuesto de Egresos del Gobierno del Estado de México para el ejercicio fiscal 2026', url: `${EDOMEX_BASE}/leyvig291.pdf` },
    ],
    codigos: [
        { nombre: 'Código Administrativo del Estado de México', url: `${EDOMEX_BASE}/codvig008.pdf` },
        { nombre: 'Código Civil del Estado de México', url: `${EDOMEX_BASE}/codvig001.pdf` },
        { nombre: 'Código de Procedimientos Administrativos del Estado de México', url: `${EDOMEX_BASE}/codvig002.pdf` },
        { nombre: 'Código de Procedimientos Civiles del Estado de México', url: `${EDOMEX_BASE}/codvig003.pdf` },
        { nombre: 'Código Electoral del Estado de México', url: `${EDOMEX_BASE}/codvig005.pdf` },
        { nombre: 'Código Financiero del Estado de México y Municipios', url: `${EDOMEX_BASE}/codvig007.pdf` },
        { nombre: 'Código para la Biodiversidad del Estado de México', url: `${EDOMEX_BASE}/codvig009.pdf` },
        { nombre: 'Código Penal del Estado de México', url: `${EDOMEX_BASE}/codvig006.pdf` },
    ],
    reglamentos: [],
    otros: [],
};

// ─── Puebla: FULL DATA — PDFs hosted on Supabase ───────────────
const PUE_BASE = 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/Puebla';
const PUEBLA_LEYES: CategoriaLeyes = {
    constitucion: [
        { nombre: 'Constitución Política del Estado Libre y Soberano de Puebla', url: `${PUE_BASE}/Constitucion_Politica_del_Estado_Libre_y_Soberano_de_Puebla_T4_05062025.pdf` },
    ],
    leyes: [
        { nombre: 'Ley Estatal de Salud', url: `${PUE_BASE}/Ley_Estatal_de_Salud_T6_04112025.pdf` },
        { nombre: 'Ley Estatal del Deporte', url: `${PUE_BASE}/Ley_Estatal_del_Deporte_20EV_04122025.pdf` },
        { nombre: 'Ley Ganadera para el Estado de Puebla', url: `${PUE_BASE}/Ley_Ganadera_para_el_Estado_de_Puebla_29122017.pdf` },
        { nombre: 'Ley General de Bienes del Estado', url: `${PUE_BASE}/Ley_General_de_Bienes_del_Estado_T6_04082014.pdf` },
        { nombre: 'Ley Orgánica Municipal', url: `${PUE_BASE}/Ley_Organica_Municipal_T4_15102025.pdf` },
        { nombre: 'Ley Orgánica de la Administración Pública del Estado de Puebla', url: `${PUE_BASE}/Ley_Orgánica_de_la_Administración_Pública_del_Estado_de_Puebla_EV_15122025.pdf` },
        { nombre: 'Ley Orgánica de la Defensoría Pública del Estado de Puebla', url: `${PUE_BASE}/Ley_Orgánica_de_la_Defensoría_Pública_del_Estado_de_Puebla_T5_23032023.pdf` },
        { nombre: 'Ley Orgánica de la Fiscalía General del Estado de Puebla', url: `${PUE_BASE}/Ley_Organica_de_la_Fiscalia_General_del_Estado_de_Puebla_EV_18082023.pdf` },
        { nombre: 'Ley Orgánica del Centro de Conciliación Laboral del Estado de Puebla', url: `${PUE_BASE}/Ley_Orgánica_del_Centro_de_Conciliación_Laboral_del_Estado_de_Puebla_7EV_23072025.pdf` },
        { nombre: 'Ley Orgánica del Poder Judicial del Estado de Puebla', url: `${PUE_BASE}/Ley_Organica_del_Poder_Judicial_del_Estado_de_Puebla_T3_13082025.pdf` },
        { nombre: 'Ley Orgánica del Poder Legislativo del Estado Libre y Soberano de Puebla', url: `${PUE_BASE}/Ley_Organica_del_Poder_Legislativo_del_Estado_Libre_y_Soberano_de_Puebla_3EV_29052025.pdf` },
        { nombre: 'Ley Orgánica del Tribunal de Justicia Administrativa del Estado de Puebla', url: `${PUE_BASE}/Ley_Organica_del_Tribunal_de_Justicia_Administrativa_del_Estado_de_Puebla_EV_11022022.pdf` },
        { nombre: 'Ley Reglamentaria de los Medios de Defensa de la Constitución Política del Estado de Puebla', url: `${PUE_BASE}/Ley_Reglamentaria_de_los_Medios_de_Defensa_de_la_Constitucion_Politica_2EV_23022024.pdf` },
        { nombre: 'Ley de Adquisiciones, Arrendamientos y Servicios del Sector Público Estatal y Municipal', url: `${PUE_BASE}/Ley_de_Adquisiciones_Arrendamientos_y_Servicios_del_Sector_Publico_Estatal_y_Municipal_T6_13032024.pdf` },
        { nombre: 'Ley de Agricultura Urbana para el Estado de Puebla', url: `${PUE_BASE}/Ley_de_Agricultura_Urbana_para_el_Estado_Puebla_30122013.pdf` },
        { nombre: 'Ley de Amnistía para el Estado de Puebla', url: `${PUE_BASE}/Ley_de_Amnistía_para_el_Estado_de_Puebla_T7_03102024.pdf` },
        { nombre: 'Ley de Aranceles para el Cobro de Honorarios de los Abogados o Licenciados en Derecho del Estado de Puebla', url: `${PUE_BASE}/Ley_de_Aranceles_para_el_cobro_de_honorarios_de_los_Abogados_o_Licenciados_en_Derecho_del_Estado_de_Puebla_EV_01072022.pdf` },
        { nombre: 'Ley de Arbolado y Áreas Verdes Urbanas del Estado de Puebla', url: `${PUE_BASE}/Ley_de_Arbolado_y_Áreas_Verdes_Urbanas_del_Estado_de_Puebla_T6_05062025.pdf` },
        { nombre: 'Ley de Archivos del Estado de Puebla', url: `${PUE_BASE}/Ley_de_Archivos_del_Estado_de_Puebla_T3_28022024.pdf` },
        { nombre: 'Ley de Atención y Prevención de la Contaminación Visual y Auditiva para el Estado de Puebla', url: `${PUE_BASE}/Ley_de_Atencion_y_Prevencion_de_la_Contaminacion_Visual_y_Auditiva_para_el_Estado_de_Puebla_EV_17062022.pdf` },
        { nombre: 'Ley de Bibliotecas del Estado de Puebla', url: `${PUE_BASE}/Ley_de_Bibliotecas_del_Estado_de_Puebla_T3_16072024.pdf` },
        { nombre: 'Ley de Bienestar Animal del Estado de Puebla', url: `${PUE_BASE}/Ley_de_Bienestar_Animal_del_Estado_de_Puebla_EV_21032024.pdf` },
        { nombre: 'Ley de Búsqueda de Personas del Estado de Puebla', url: `${PUE_BASE}/Ley_de_Busqueda_de_Personas_del_Estado_de_Puebla_T2EV_02092021.pdf` },
        { nombre: 'Ley de Cambio Climático del Estado de Puebla', url: `${PUE_BASE}/Ley_de_Cambio_Climático_del_Estado_de_Puebla_T4_08082023.pdf` },
        { nombre: 'Ley de Carrera Judicial del Estado de Puebla', url: `${PUE_BASE}/Ley_de_Carrera_Judicial_del_Estado_de_Puebla_4EV_23022024.pdf` },
        { nombre: 'Ley de Catastro del Estado de Puebla', url: `${PUE_BASE}/Ley_de_Catastro_del_Estado_de_Puebla_02102020.pdf` },
        { nombre: 'Ley de Construcciones para el Estado y Municipios de Puebla', url: `${PUE_BASE}/Ley_de_Construcciones_para_el_Estado_y_Municipios_de_Puebla_T6_15082024.pdf` },
        { nombre: 'Ley de Coordinación Hacendaria del Estado de Puebla y sus Municipios', url: `${PUE_BASE}/Ley_de_Coordinacion_Hacendaria_del_Estado_de_Puebla_y_sus_Municipios_T2_18022025.pdf` },
        { nombre: 'Ley de Cultura del Estado de Puebla', url: `${PUE_BASE}/Ley_de_Cultura_del_Estado_de_Puebla__T5_26062023.pdf` },
        { nombre: 'Ley de Derechos, Cultura y Desarrollo de los Pueblos y Comunidades Indígenas del Estado de Puebla', url: `${PUE_BASE}/Ley_de_Derechos_Cultura_y_Desarrollo_de_los_Pueblos_y_Comunidades_Indígenas_del_Estado_de_Puebla_4EV_05122023.pdf` },
        { nombre: 'Ley de Desarrollo Económico Sustentable del Estado de Puebla', url: `${PUE_BASE}/Ley_de_Desarrollo_Económico_Sustentable_del_Estado_de_Puebla_EV_27022024.pdf` },
        { nombre: 'Ley de Desarrollo Forestal Sustentable del Estado de Puebla', url: `${PUE_BASE}/Ley_de_Development_Forestal_Sustentable_del_Estado_de_Puebla_3EV_19082025.pdf` },
        { nombre: 'Ley de Desarrollo Rural Sustentable del Estado de Puebla', url: `${PUE_BASE}/Ley_de_Desarrollo_Rural_Sustentable_del_Estado_de_Puebla_T34_22122022.pdf` },
        { nombre: 'Ley de Desarrollo Social para el Estado de Puebla', url: `${PUE_BASE}/Ley_de_Desarrollo_Social_para_el_Estado_de_Puebla_T33_23122022.pdf` },
        { nombre: 'Ley de Desarrollo Urbano Sustentable del Estado de Puebla', url: `${PUE_BASE}/Ley_de_Desarrollo_Urbano_Sustentable_del_Estado_de_Puebla_26032003.pdf` },
        { nombre: 'Ley de Deuda Pública para el Estado Libre y Soberano de Puebla', url: `${PUE_BASE}/Ley_de_Deuda_Publica_para_el_Estado_Libre_y_Soberano_de_Puebla_29122017.pdf` },
        { nombre: 'Ley de Educación Inicial del Estado Libre y Soberano de Puebla', url: `${PUE_BASE}/Ley_de_Educacion_Inicial_del_Estado_Libre_y_Soberano_de_Puebla_T10_16032023.pdf` },
        { nombre: 'Ley de Educación Superior del Estado de Puebla', url: `${PUE_BASE}/Ley_de_Educacion_Superior_del_Estado_de_Puebla_T10_16032023.pdf` },
        { nombre: 'Ley de Educación del Estado de Puebla', url: `${PUE_BASE}/Ley_de_Educación_del_Estado_de_Puebla_3EV_23072025.pdf` },
        { nombre: 'Ley de Egresos del Estado de Puebla, para el Ejercicio Fiscal 2026', url: `${PUE_BASE}/Ley_de_Egresos_del_Estado_de_Puebla,_para_el_Ejercicio_Fiscal_2026_15EV_04122025.pdf` },
        { nombre: 'Ley de Ejecución de Medidas Cautelares y Sanciones Penales', url: `${PUE_BASE}/Ley_de_Ejecucion_de_Medidas_Cautelares_y_Sanciones_Penales_14092012.pdf` },
        { nombre: 'Ley de Entidades Paraestatales del Estado de Puebla', url: `${PUE_BASE}/Ley_de_Entidades_Paraestatales_del_Estado_de_Puebla_T4_16072024.pdf` },
        { nombre: 'Ley de Expropiación para el Estado de Puebla', url: `${PUE_BASE}/Ley_de_Expropiacion_para_el_Estado_de_Puebla_9octubre2018.pdf` },
        { nombre: 'Ley de Extinción de Dominio para el Estado de Puebla', url: `${PUE_BASE}/Ley_de_Extincion_de_Dominio_para_el_Estado_de_Puebla_1092015.pdf` },
        { nombre: 'Ley de Fomento a las Actividades Realizadas por Organizaciones de la Sociedad Civil para el Estado de Puebla', url: `${PUE_BASE}/Ley_de_Fomento_a_las_Actividades_Realizadas_por_Organizaciones_de_la_Sociedad_Civil_para_el_Estado_de_Puebla_4EV_27072023.pdf` },
        { nombre: 'Ley de Fraccionamientos y Acciones Urbanísticas del Estado Libre y Soberano de Puebla', url: `${PUE_BASE}/Ley_de_Fraccionamientos_y_Acciones_Urbanisticas_del_Estado_Libre_y_Soberano__de_Puebla_T8_05042024.pdf` },
        { nombre: 'Ley de Gobernanza Regulatoria para el Estado de Puebla', url: `${PUE_BASE}/Ley_de_Gobernanza_Regulatoria_para_el_Estado_de_Puebla_T3_11022015_1.pdf` },
        { nombre: 'Ley de Gobierno Digital para el Estado de Puebla y sus Municipios', url: `${PUE_BASE}/Ley_de_Gobierno_Digital_para_el_Estado_de_Puebla_y_sus_Municipios_T5_04112025.pdf` },
        { nombre: 'Ley de Hacienda Municipal del Estado Libre y Soberano de Puebla', url: `${PUE_BASE}/Ley_de_Hacienda_Municipal_del_Estado_Libre_y_Soberano_de_Puebla_T6_15122023.pdf` },
        { nombre: 'Ley de Hacienda para el Estado Libre y Soberano de Puebla', url: `${PUE_BASE}/Ley_de_Hacienda_para_el_Estado_Libre_y_Soberano_de_Puebla_T5_05082024.pdf` },
        { nombre: 'Ley de Ingresos del Estado de Puebla, para el Ejercicio Fiscal 2026', url: `${PUE_BASE}/Ley_de_Ingresos_del_Estado_de_Puebla,_para_el_Ejercicio_Fiscal_2026_EV_27112025.pdf` },
        { nombre: 'Ley de Instituciones de Asistencia Privada para el Estado Libre y Soberano de Puebla', url: `${PUE_BASE}/Ley_de_Instituciones_de_Asistencia_Privada_para_el_Estado_Libre_y_Soberano_de_Puebla19052014.pdf` },
        { nombre: 'Ley de Mecanismos Alternativos de Solución de Controversias para el Estado Libre y Soberano de Puebla', url: `${PUE_BASE}/Ley_de_Mecanismos_Alternativos_de_Solución_de_Controversias_para_el_Estado_Libre_y_Soberano_de_Puebla_5EV_23022024.pdf` },
        { nombre: 'Ley de Medios Alternativos en Materia Penal para el Estado de Puebla', url: `${PUE_BASE}/Ley_de_Medios_Alternativos_en_Materia_Penal_para_el_Edo_de_Puebla_17032016.pdf` },
        { nombre: 'Ley de Mejora Regulatoria y Buena Administración para el Estado de Puebla', url: `${PUE_BASE}/Ley_de_Mejora_Regulatoria_y_Buena_Administracion_para_el_Estado_de_Puebla_T_2_20112020.pdf` },
        { nombre: 'Ley de Movilidad y Seguridad Vial del Estado de Puebla', url: `${PUE_BASE}/Ley_de_Movilidad_y_Seguridad_Vial_del_Estado_de_Puebla_EV_18062025.pdf` },
        { nombre: 'Ley de Obra Pública y Servicios Relacionados con la Misma para el Estado de Puebla', url: `${PUE_BASE}/Ley_de_Obra_Pública_y_Servicios_Relacionados_con_la_Misma_para_el_Estado_de_Puebla_T2_07082023.pdf` },
        { nombre: 'Ley de Ordenamiento Territorial y Desarrollo Urbano del Estado de Puebla', url: `${PUE_BASE}/Ley_de_Ordenamiento_Territorial_y_Development_Urbano_del_Estado_de_Puebla_18EV_04122025.pdf` },
        { nombre: 'Ley de Planeación para el Desarrollo del Estado de Puebla', url: `${PUE_BASE}/Ley_de_Planeacion_para_el_Desarrollo_del_Estado_de_Puebla_2EV_25082023.pdf` },
        { nombre: 'Ley de Prestación de Servicios para la Atención, Cuidado y Desarrollo Integral Infantil del Estado de Puebla', url: `${PUE_BASE}/Ley_de_Prestacion_de_Servicios_para_la_Atencion_Cuidado_y_Development_Integral_Infantil_del_Estado_de_Puebla_T6_17102025.pdf` },
        { nombre: 'Ley de Presupuesto y Gasto Público Responsable del Estado de Puebla', url: `${PUE_BASE}/Ley_de_Presupuesto_y_Gasto_Público_Responsable_del_Estado_de_Puebla_3EV_20112025.pdf` },
        { nombre: 'Ley de Prevención, Atención y Sanción de la Violencia Familiar para el Estado de Puebla', url: `${PUE_BASE}/Ley_de_Prevencion_Atencion_y_Sancion_de_la_Violencia_Familiar_para_el_Estado_de_Puebla_T2_02012024.pdf` },
        { nombre: 'Ley de Protección a las Personas Adultas Mayores para el Estado de Puebla', url: `${PUE_BASE}/Ley_de_Proteccion_a_las_Personas_Adultas_Mayores_para_el_Estado_de_Puebla_T6_04102024.pdf` },
        { nombre: 'Ley de Protección a los No Fumadores para el Estado de Puebla', url: `${PUE_BASE}/Ley_de_Proteccion_a_los_No_Fumadores_para_el_Estado_de_Puebla_29122017.pdf` },
        { nombre: 'Ley de Protección de Datos Personales en Posesión de Sujetos Obligados del Estado de Puebla', url: `${PUE_BASE}/Ley_de_Protección_de_Datos_Personales_en_Posesión_de_Sujetos_Obligados_del_Estado_de_Puebla_T2_31072025.pdf` },
        { nombre: 'Ley de Rendición de Cuentas y Fiscalización Superior del Estado de Puebla', url: `${PUE_BASE}/Ley_de_Rendicion_de_Cuentas_y_Fiscalizacion_Superior_del_Estado_de_Puebla_T7_05072024.pdf` },
        { nombre: 'Ley de Responsabilidad Patrimonial para el Estado de Puebla', url: `${PUE_BASE}/Ley_de_Responsabilidad_Patrimonial_para_el_Estado_de_Puebla_EV_19092023.pdf` },
        { nombre: 'Ley de Responsabilidades de los Servidores Públicos del Estado de Puebla', url: `${PUE_BASE}/Ley_de_Responsabilidades_de_los_Servidores_Publicos_del_Estado_de_Puebla__02dic2020.pdf` },
        { nombre: 'Ley de Salud Mental y Adicciones para el Estado de Puebla', url: `${PUE_BASE}/Ley_de_Salud_Mental_y_Adicciones_para_el_Estado_de_Puebla_T4_15082024.pdf` },
        { nombre: 'Ley de Seguridad Integral Escolar para el Estado Libre y Soberano de Puebla', url: `${PUE_BASE}/Ley_de_Seguridad_Integral_Escolar_para_el_Estado_Libre_y_Soberano_de_Puebla_T4_8112021.pdf` },
        { nombre: 'Ley de Seguridad Privada del Estado Libre y Soberano de Puebla', url: `${PUE_BASE}/Ley_de_Seguridad_Privada_del_Estado_Libre_y_Soberano_de_Puebla_22EV_04122025.pdf` },
        { nombre: 'Ley de Seguridad Pública del Estado de Puebla', url: `${PUE_BASE}/Ley_de_Seguridad_Publica_del_Estado_de_Puebla_T6_16042024.pdf` },
        { nombre: 'Ley de Transparencia y Acceso a la Información Pública del Estado de Puebla', url: `${PUE_BASE}/Ley_de_Transparencia_y_Acceso_a_la_Información_Pública_del_Estado_de_Puebla_T2_31072025.pdf` },
        { nombre: 'Ley de Transporte del Estado de Puebla', url: `${PUE_BASE}/Ley_de_Transporte_del_Estado_de_Puebla_16EV_04122025.pdf` },
        { nombre: 'Ley de Turismo del Estado de Puebla', url: `${PUE_BASE}/Ley_de_Turismo_del_Estado_de_Puebla_T5_04112025.pdf` },
        { nombre: 'Ley de Vialidad para el Estado Libre y Soberano de Puebla', url: `${PUE_BASE}/Ley_de_Vialidad_para_el_Estado_Libre_y_Soberano_de_Puebla_EV_21102022.pdf` },
        { nombre: 'Ley de Vivienda para el Estado de Puebla', url: `${PUE_BASE}/Ley_de_Vivienda_para_el_Estado_de_Puebla_19EV_04122025.pdf` },
        { nombre: 'Ley de Voluntad Anticipada para el Estado de Puebla', url: `${PUE_BASE}/Ley_de_Voluntad_Anticipada_para_el_Estado_de_Puebla_T20_31122024.pdf` },
        { nombre: 'Ley de Víctimas del Estado de Puebla', url: `${PUE_BASE}/Ley_de_Victimas_del_Estado_de_Puebla_T5_04102024.pdf` },
        { nombre: 'Ley de la Benemérita Universidad Autónoma de Puebla', url: `${PUE_BASE}/Ley_de_la_Benemérita_Universidad_Autónoma_de_Puebla_T5_28112023.pdf` },
        { nombre: 'Ley de la Comisión de Derechos Humanos del Estado de Puebla', url: `${PUE_BASE}/Ley_de_la_Comision_de_Derechos_Humanos_del_Estado_de_Puebla_T5_04102024.pdf` },
        { nombre: 'Ley de la Juventud para el Estado de Puebla', url: `${PUE_BASE}/Ley_de_la_Juventud_para_el_Estado_de_Puebla_21EV_04122025.pdf` },
        { nombre: 'Ley de la Procuraduría de Protección de los Derechos de Niñas, Niños y Adolescentes del Estado de Puebla', url: `${PUE_BASE}/Ley_de_la_Procuraduria_de_Proteccion_de_los_Derechos_de_Nias_Nios_Y_Adolescentes_del_Estado_de_Puebla_31ago2018.pdf` },
        { nombre: 'Ley de los Derechos de las Niñas, Niños y Adolescentes del Estado de Puebla', url: `${PUE_BASE}/Ley_de_los_Derechos_de_las_Niñas_Niños_y_Adolescentes_del_Estado_de_Puebla_T6_04112025.pdf` },
        { nombre: 'Ley de los Trabajadores al Servicio del Estado', url: `${PUE_BASE}/Ley_de_los_Trabajadores_al_Servicio_del_Estado_T6_07022024.pdf` },
        { nombre: 'Ley del Agua para el Estado de Puebla', url: `${PUE_BASE}/Ley_del_Agua_para_el_Estado_de_Puebla_T31_26122022_C.pdf` },
        { nombre: 'Ley del Centro Estatal de Mediación del Estado de Puebla', url: `${PUE_BASE}/Ley_del_Centro_Estatal_de_Mediacion_del_Edo_Pue_26022021.pdf` },
        { nombre: 'Ley del Escudo y el Himno del Estado de Puebla', url: `${PUE_BASE}/Ley_del_Escudo_y_el_Himno_del_Estado_de_Puebla_29122017.pdf` },
        { nombre: 'Ley del Instituto de Seguridad y Servicios Sociales de los Trabajadores al Servicio de los Poderes del Estado de Puebla', url: `${PUE_BASE}/Ley_del_Instituto_de_Seguridad_y_Servicios_Sociales_de_los_Trabajadores_al_Servicio_de_los_Poderes_del_Edo_de_Pue_18112014.pdf` },
        { nombre: 'Ley del Notariado para el Estado de Puebla', url: `${PUE_BASE}/Ley_del_Notariado_para_el_Estaddo_de_Puebla_T5_05082024.pdf` },
        { nombre: 'Ley del Primer Empleo del Estado de Puebla', url: `${PUE_BASE}/Ley_del_Primer_Empleo_del_Estado_de_Puebla_T6_08102024.pdf` },
        { nombre: 'Ley del Procedimiento Contencioso Administrativo del Estado de Puebla', url: `${PUE_BASE}/Ley_del_Procedimiento_Contencioso_Administrativo_del_Estado_de_Puebla_3EV_23022024.pdf` },
        { nombre: 'Ley del Registro Público de la Propiedad del Estado de Puebla', url: `${PUE_BASE}/Ley_del_Registro_Publicode_la_Propiedad_del_Estado_de_Puebla_22022017.pdf` },
        { nombre: 'Ley del Servicio de la Defensoría Pública del Estado de Puebla', url: `${PUE_BASE}/Ley_del_Servicio_de_la_Defensoria_Publica_del_Estado_de_Puebla_3EV_8042022.pdf` },
        { nombre: 'Ley del Sistema Anticorrupción Puebla', url: `${PUE_BASE}/Ley_del_Sistema_Anticorrupción_Puebla_T3_27022024.pdf` },
        { nombre: 'Ley del Sistema Estatal de Protección Civil', url: `${PUE_BASE}/Ley_del_Sistema_Estatal_de_Proteccion_Civil_T27_21122022.pdf` },
        { nombre: 'Ley del Voluntariado Social para el Estado de Puebla', url: `${PUE_BASE}/Ley_-del_Voluntariado_Social_para_el_Estado_de_Puebla_14012020.pdf` },
        { nombre: 'Ley para Prevenir y Eliminar la Discriminación del Estado de Puebla', url: `${PUE_BASE}/Ley_para_Prevenir_y_Eliminar_la_Discriminación_T6_04112025.pdf` },
        { nombre: 'Ley para Prevenir y Erradicar los Delitos en Materia de Trata de Personas del Estado de Puebla', url: `${PUE_BASE}/Ley_para_Prevenir_y_Erradicar_los_Delitos_en_Materia_de_Trata_de_Personas_y_para_la_Proteccion_y_Asistencia_a_las_Victimas_de_estos_Delitos_Edo_de_Puebla_T6_28102021.pdf` },
        { nombre: 'Ley para el Acceso de las Mujeres a una Vida Libre de Violencia del Estado de Puebla', url: `${PUE_BASE}/Ley_para_el_Acceso_de_las_Mujeres_a_una_Vida_Libre_de_Violencia_EV_19082025.pdf` },
        { nombre: 'Ley para la Administración, Enajenación y Destino de Bienes Asegurados, Abandonados, Decomisados y Extintos', url: `${PUE_BASE}/Ley_para_la_Administración,_Enajenación_y_Destino_de_Bienes_Asegurados,_Abandonados,_Decomisados_y_Extintos_EV_25052023.pdf` },
        { nombre: 'Ley para la Declaración Especial de Ausencia por Desaparición de Personas del Estado de Puebla', url: `${PUE_BASE}/Ley_para_la_Declaración_Especial_de_Ausencia_por_Desaparición_de_Personas_del_Estado_de_Puebla_T6_03102024.pdf` },
        { nombre: 'Ley para la Igualdad entre Mujeres y Hombres del Estado de Puebla', url: `${PUE_BASE}/Ley_para_la_Igualdad_entre_Mujeres_y_Hombres_del_Estado_de_Puebla_EV_19082025.pdf` },
        { nombre: 'Ley para la Prevención Social y Comunitaria de la Violencia y la Delincuencia del Estado de Puebla', url: `${PUE_BASE}/Ley_para_la_Prevención_Social_y_Comunitaria_de_la_Violencia_y_la_Delincuencia_del_Estado_de_Puebla_T11_05062025.pdf` },
        { nombre: 'Ley para la Prevención y Gestión Integral de los Residuos Sólidos Urbanos y de Manejo Especial', url: `${PUE_BASE}/Ley_para_la_Prevención_y_Gestión_Integral_de_los_Residuos_Sólidos_Urbanos_y_de_Manejo_Especial_T5_05082024.pdf` },
        { nombre: 'Ley para la Protección del Ambiente Natural y el Desarrollo Sustentable del Estado de Puebla', url: `${PUE_BASE}/Ley_para_la_Proteccion_del_Ambiente_Natural_y_el_Desarrollo_Sustentable_del_Estado_de_Puebla_2EV_19082025.pdf` },
        { nombre: 'Ley para la Regularización de Predios Rústicos, Urbanos y Suburbanos en el Régimen de Propiedad Privada de Puebla', url: `${PUE_BASE}/Ley_para_la_Regularizacion_de_Predios_Rusticos_Urbanos_y_Suburbanos_en_el_Regimen_de_Propiedad_Privada_del_Puebla_TEV_20062022.pdf` },
        { nombre: 'Ley para la Venta y Suministros de Bebidas Alcohólicas del Estado de Puebla', url: `${PUE_BASE}/Ley_para_la_Venta_y_Suministros_de_Bebidas_Alcoholicas_del_Estado_Puebla_T4_16072024.pdf` },
        { nombre: 'Ley para las Personas con Discapacidad del Estado de Puebla', url: `${PUE_BASE}/Ley_para_las_Personas_Discapacidad_Estado_Puebla_2EV_10092024.pdf` },
        { nombre: 'Ley que Establece las Bases de Organización del Gobierno de Coalición del Estado de Puebla', url: `${PUE_BASE}/Ley-que-establece-las-Bases-de-Organizacin-del-Gobierno-de-Coalicin-del-Estado-de-Puebla_30_12_2016.pdf` },
        { nombre: 'Ley que Establece los Procedimientos de Entrega-Recepción en los Poderes Públicos', url: `${PUE_BASE}/Ley_que_Establece_los_Procedimientos_de_Entrega-Recepción_en_los_Poderes_Públicos_EV_15022024.pdf` },
        { nombre: 'Ley que Regula el Régimen de Propiedad en Condominio para el Estado de Puebla', url: `${PUE_BASE}/Ley_que_Regula_el_Regimen_de_Propiedad_en_Condominio_para_el_Estado_de_Puebla_7ene2021.pdf` },
        { nombre: 'Ley que crea el Consejo de Armonización Contable del Estado de Puebla', url: `${PUE_BASE}/Ley_que_crea_el_Consejo_de_Armonizacion_Contable_T4_01122023.pdf` },
        { nombre: 'Ley que crea el Fondo Adicional para el Mejoramiento de la Administración de Justicia en el Estado', url: `${PUE_BASE}/Ley_que_crea_el_Fondo_Adicional_para_el_Mejoramiento_de_la_Administracion_de_Justicia_en_el_Estado_T3_02012024.pdf` },
        { nombre: 'Ley que crea el Fondo para el Mejoramiento de la Procuración de Justicia', url: `${PUE_BASE}/Ley_que_crea_el_Fondo_para_el_Mejoramiento_de_la_Procuracion_de_Justicia_T5_11122020.pdf` },
        { nombre: 'Ley que crea la Universidad Tecnológica de Puebla', url: `${PUE_BASE}/Ley_que_crea_la_Universidad_Tecnologica_de_Puebla_01122016.pdf` },
        { nombre: 'Ley sobre Protección y Conservación de Poblaciones Típicas y Bellezas Naturales del Estado de Puebla', url: `${PUE_BASE}/Ley_Sobre_Proteccion_y_Conservacion_de_Poblaciones_Tipicas_y_Bellezas_Naturales_del_Estado_de_Puebla_29122017.pdf` },
        { nombre: 'Ley sobre el Sistema Estatal de Asistencia Social', url: `${PUE_BASE}/Ley_sobre_el_Sistema_Estatal_de_Asistencia_Social_2EV_10092024.pdf` },
    ],
    codigos: [
        { nombre: 'Código Civil para el Estado Libre y Soberano de Puebla', url: `${PUE_BASE}/Codigo_Civil_para_el_Estado_Libre_y_Soberano_de_Puebla_T4_17102025.pdf` },
        { nombre: 'Código Penal del Estado Libre y Soberano de Puebla', url: `${PUE_BASE}/Codigo_Penal_del_Estado_Libre_y_Soberano_de_Puebla_2EV_15122025.pdf` },
        { nombre: 'Código de Procedimientos Civiles para el Estado Libre y Soberano de Puebla', url: `${PUE_BASE}/Codigo_de_Procedimientos_Civiles-_para_el_Estado_Libre_y_Soberano_de_Puebla_29122017.pdf` },
        { nombre: 'Código de Procedimientos en Materia de Defensa Social del Estado', url: `${PUE_BASE}/Codigo_Procedimiento_Materia_de_Defensa_Social_del_Estado17032016.pdf` },
        { nombre: 'Código Fiscal del Estado de Puebla', url: `${PUE_BASE}/Codigo_Fiscal_del_Estado_de_Puebla_T6_31072025.pdf` },
        { nombre: 'Código Fiscal Municipal del Estado de Puebla', url: `${PUE_BASE}/Codigo_Fiscal_Municipal_del_Estado_de_Puebla_16012017.pdf` },
        { nombre: 'Código Fiscal y Presupuestario para el Municipio de Puebla', url: `${PUE_BASE}/Codigo_Fiscal_y_Presupuestario_para_el_Municipio_de_Puebla_EV_18122023.pdf` },
        { nombre: 'Código de Instituciones y Procesos Electorales del Estado de Puebla', url: `${PUE_BASE}/Codigo_de_Instituciones_y_Procesos_Electorales_del_Estado_de_Puebla_T5_11042025.pdf` },
        { nombre: 'Código de Justicia para Adolescentes del Estado Libre y Soberano de Puebla', url: `${PUE_BASE}/Codigo_de_Justicia_para_Adolescentes_del_Estado_Libre_y_Soberano_de_Puebla_17062011.pdf` },
    ],
    reglamentos: [],
    otros: [],
};

const GTO_BASE = 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/Guanajuato';
const GUANAJUATO_LEYES: CategoriaLeyes = {
    constitucion: [
        { nombre: 'Ley Reglamentaria de la Fracción XV del articulo 88 de la Constitución Política del Estado de Guanajuato', url: `${GTO_BASE}/20180514.pdf` },
    ],
    leyes: [
        { nombre: 'Ley de Bebidas Alcohólicas para el Estado de Guanajuato y sus Municipios', url: `${GTO_BASE}/LBAEGM_REF_31Diciembre2025.pdf` },
        { nombre: 'Ley de Hacienda para el Estado de Guanajuato', url: `${GTO_BASE}/LHEG_REF_31Diciembre2025.pdf` },
        { nombre: 'Ley de Ingresos del Estado de Guanajuato para el Ejercicio Fiscal de 2026', url: `${GTO_BASE}/LIEG_2026.pdf` },
        { nombre: 'Ley de Coordinación Fiscal del Estado de Guanajuato', url: `${GTO_BASE}/LCFEG_REF_18Dic2025.pdf` },
        { nombre: 'Ley del Presupuesto General de Egresos del Estado de Guanajuato para el Ejercicio Fiscal de 2026', url: `${GTO_BASE}/LPGE_2026.pdf` },
        { nombre: 'Ley de los Derechos de Niñas, Niños y Adolescentes del Estado de Guanajuato', url: `${GTO_BASE}/LNNAEG_REF_18Diciembre2025.pdf` },
        { nombre: 'Ley de Responsabilidades Administrativas para el Estado de Guanajuato', url: `${GTO_BASE}/LRAESPEG_REF_11Diciembre2025.pdf` },
        { nombre: 'Ley de Acceso de las Mujeres a una Vida Libre de Violencia Para el Estado de Guanajuato', url: `${GTO_BASE}/LAMVLVEG_REF_11Diciembre2025.pdf` },
        { nombre: 'Ley para el Desarrollo y Competitividad Económica del Estado de Guanajuato y sus Municipios', url: `${GTO_BASE}/LPDCEEG_11Diciembre2025.pdf` },
        { nombre: 'Ley de Movilidad del Estado de Guanajuato y sus Municipios', url: `${GTO_BASE}/LMEGM_REF_05Dic2025.pdf` },
        { nombre: 'Ley para Prevenir, Atender y Erradicar la Discriminación en el Estado de Guanajuato.', url: `${GTO_BASE}/LPAEDEG_REF_03Dic2025.pdf` },
        { nombre: 'Ley de Salud del Estado de Guanajuato', url: `${GTO_BASE}/LSEG_REF_20Noviembre2025.pdf` },
        { nombre: 'Ley para el Gobierno y Administración de los Municipios del Estado de Guanajuato', url: `${GTO_BASE}/LGYAMEG_NVA_13Noviembre2025_DL101.pdf` },
        { nombre: 'Ley de Fomento a las Actividades de las Organizaciones de la Sociedad Civil en el Estado de Guanajuato', url: `${GTO_BASE}/LFAOSC_REF_13Noviembre2025.pdf` },
        { nombre: 'Ley de Desarrollo Social y Humano para el Estado y los Municipios de Guanajuato', url: `${GTO_BASE}/LDSYHEMG_REF_13Noviembre2025.pdf` },
        { nombre: 'Ley para la Protección de los Pueblos y Comunidades Indígenas y Afromexicanas en el Estado de Guanajuato', url: `${GTO_BASE}/LPPYCIEG_REF_30Octubre2025.pdf` },
        { nombre: 'Ley de Fomento y Desarrollo Agrícola para el Estado de Guanajuato', url: `${GTO_BASE}/LFDAEG_REF_30Octubrel2025.pdf` },
        { nombre: 'Ley de Educación para el Estado de Guanajuato', url: `${GTO_BASE}/LEEG_REF_30Octubre2025_DL95.pdf` },
        { nombre: 'Ley de Inclusión para las personas con Discapacidad en el Estado de Guanajuato', url: `${GTO_BASE}/LDIPDEG_30Octubre_2025.pdf` },
        { nombre: 'Ley de Cultura Física y Deporte del Estado de Guanajuato', url: `${GTO_BASE}/LCFYDEG_REF_30Oct2025.pdf` },
        { nombre: 'Ley para la Protección de Personas Defensoras de Derechos Humanos y Periodistas del Estado de Guanajuato', url: `${GTO_BASE}/LPPDDHPEG_14_10_2025.pdf` },
        { nombre: 'Ley Orgánica del Poder Legislativo del Estado de Guanajuato', url: `${GTO_BASE}/LOPLEG_09102025.pdf` },
        { nombre: 'Ley para la Protección y Atención del Migrante y sus Familias del Estado de Guanajuato', url: `${GTO_BASE}/LPAPMFEG_REF_28Julio2025.pdf` },
        { nombre: 'Ley para las Juventudes del Estado de Guanajuato', url: `${GTO_BASE}/LJEG_REF_28Julio2025.pdf` },
        { nombre: 'Ley de los Derechos de las Personas Adultas Mayores para el Estado de Guanajuato', url: `${GTO_BASE}/LDPAMEG_REF28Julio2025.pdf` },
        { nombre: 'Ley del Patrimonio Inmobiliario del Estado de Guanajuato', url: `${GTO_BASE}/LPIEG_DL14_08Dic2022.pdf` },
        { nombre: 'Ley para la Gestión Integral de Residuos del Estado y los Municipios de Guanajuato', url: `${GTO_BASE}/LGIREMG_REF_26Junio2025.pdf` },
        { nombre: 'Ley para Prevenir, Atender y Erradicar la Violencia en el Estado de Guanajuato', url: `${GTO_BASE}/LPAEVEG_REF_25Junio2025.pdf` },
        { nombre: 'Ley de Víctimas del Estado de Guanajuato', url: `${GTO_BASE}/LVEG_REF_25Junio2025.pdf` },
        { nombre: 'Ley de Asistencia Social y Fortalecimiento Familiar para el Estado de Guanajuato', url: `${GTO_BASE}/LASFFEG_REF_25Junio2025.pdf` },
        { nombre: 'Ley para las Personas de la Diversidad Sexual y de Género del Estado de Guanajuato y sus Municipios', url: `${GTO_BASE}/LPDSYGEG_REF_25Jun2025.pdf` },
        { nombre: 'Ley para la Igualdad entre Mujeres y Hombres del Estado de Guanajuato', url: `${GTO_BASE}/LIMYHPEG_REF_25Jun2025.pdf` },
        { nombre: 'Ley para la Prevención Social de la Violencia y la Delincuencia del Estado de Guanajuato y sus Municipios', url: `${GTO_BASE}/LPSVDEG_REF_25Jun2025.pdf` },
        { nombre: 'Ley para la Búsqueda de Personas Desaparecidas en el Estado de Guanajuato', url: `${GTO_BASE}/LBPDEG_REF_25Junio2025.pdf` },
        { nombre: 'Ley Orgánica del Poder Ejecutivo para el Estado de Guanajuato', url: `${GTO_BASE}/LOPEEG_REF_25Junio2025.pdf` },
        { nombre: 'Ley Orgánica del Poder Judicial del Estado de Guanajuato', url: `${GTO_BASE}/LOPJEG_REF_28Abril2025.pdf` },
        { nombre: 'Ley del Sistema de Seguridad Pública del Estado de Guanajuato', url: `${GTO_BASE}/LSSPEG_DL61_14Marzo2025.pdf` },
        { nombre: 'Ley para el Ejercicio y Control de los Recursos Públicos para el Estado y los municipios de Guanajuato', url: `${GTO_BASE}/LEYCRP_REF_27Dic2024.pdf` },
        { nombre: 'Ley Orgánica de la Fiscalía General del Estado de Guanajuato', url: `${GTO_BASE}/LOFEG_REF_27Dic2024.pdf` },
        { nombre: 'Ley de Educación Superior para el Estado de Guanajuato', url: `${GTO_BASE}/LESEG_ORIG_19Julio2024.pdf` },
        { nombre: 'Ley de Derechos Culturales para el Estado de Guanajuato', url: `${GTO_BASE}/LDCEG_REF_17Sep2024.pdf` },
        { nombre: 'Ley de Economía Circular para el Estado de Guanajuato y sus Municipios', url: `${GTO_BASE}/LECEG_NVA_17Septiembre2024.pdf` },
        { nombre: 'Ley para la Protección y Preservación del Ambiente del Estado de Guanajuato', url: `${GTO_BASE}/LPPAEG_REF_17Sep2024.pdf` },
        { nombre: 'Ley para la Protección Animal en el Estado de Guanajuato', url: `${GTO_BASE}/LPAEG_REF_02Agosto2024.pdf` },
        { nombre: 'Ley de Cambio Climático para el Estado de Guanajuato y sus Municipios', url: `${GTO_BASE}/LCCEGYM_PO_07Jun2024.pdf` },
        { nombre: 'Ley para la Protección de los Derechos Humanos en el Estado de Guanajuato', url: `${GTO_BASE}/LPDHEG_REF_07Junio2024.pdf` },
        { nombre: 'Ley de Fiscalización Superior del Estado de Guanajuato', url: `${GTO_BASE}/LFSEG_08Enero2024.pdf` },
        { nombre: 'Ley de Seguridad Privada del Estado de Guanajuato', url: `${GTO_BASE}/LSPEG_REF_21Dic2023.pdf` },
        { nombre: 'Ley del Notariado para el Estado de Guanajuato', url: `${GTO_BASE}/LNEG_REF_30Diciembre2022.pdf` },
        { nombre: 'Ley Orgánica del Tribunal de Justicia Administrativa del Estado de Guanajuato', url: `${GTO_BASE}/LOTJA_REF_13Dic2023.pdf` },
        { nombre: 'Ley de Desarrollo Forestal Sustentable para el Estado y los Municipios de Guanajuato', url: `${GTO_BASE}/Ley_de_Desarrollo_Forestal_Sustentable_para_el_Estado_y_los_Municipios_de_Guanajuato_PO_23Nov2021.pdf` },
        { nombre: 'Ley de Archivos del Estado de Guanajuato', url: `${GTO_BASE}/LAEG_REF22Dic2022.pdf` },
        { nombre: 'Ley de Voluntad Anticipada para el Estado de Guanajuato', url: `${GTO_BASE}/LVAEG_03Junio2011.pdf` },
        { nombre: 'Ley del Escudo, la Bandera y el Himno del Estado de Guanajuato', url: `${GTO_BASE}/LEBHEG_NVA_24Nov2023.pdf` },
        { nombre: 'Ley Orgánica del Centro de Conciliación Laboral del Estado de Guanajuato', url: `${GTO_BASE}/LOCCLEG_DL222_REF_24Oct2023.pdf` },
        { nombre: 'Ley de Justicia Cívica del Estado de Guanajuato', url: `${GTO_BASE}/LJCEG_DL_222_REF_24Oct2023.pdf` },
        { nombre: 'Ley del Trabajo de los Servidores Públicos al Servicio del Estado y de los Municipios', url: `${GTO_BASE}/LTSPASEYMEG_REF20Nov2023.pdf` },
        { nombre: 'Ley de Instituciones y Procedimientos Electorales para el Estado de Guanajuato', url: `${GTO_BASE}/LIPEEG_REF20Nov2023.pdf` },
        { nombre: 'Ley de Transparencia y Acceso a la Información Pública para el Estado de Guanajuato', url: `${GTO_BASE}/LTAIPEG_REF20Noviembre2023.pdf` },
        { nombre: 'Ley de Responsabilidad Patrimonial del Estado y los Municipios de Guanajuato', url: `${GTO_BASE}/LRPEMG_REF20Nov2023.pdf` },
        { nombre: 'Ley del Servicio Profesional de Carrera Policial del Estado y Municipios de Guanajuato', url: `${GTO_BASE}/LSPCPEMG_DL230_REF_15Nov2023.pdf` },
        { nombre: 'Ley para una Convivencia Libre de Violencia en el Entorno Escolar para el Estado de Guanajuato y sus Municipios', url: `${GTO_BASE}/LCLVEEEG_DL_225_REF_24Oct2023.pdf` },
        { nombre: 'Ley de Fomento a la Agricultura Familiar del Estado de Guanajuato', url: `${GTO_BASE}/LFAFEG_REF_11Julio2023.pdf` },
        { nombre: 'Ley de Mejora Regulatoria para el Estado de Guanajuato', url: `${GTO_BASE}/LMREG_REF_04Julio2023.pdf` },
        { nombre: 'Ley de Turismo para el Estado de Guanajuato y sus Municipios', url: `${GTO_BASE}/LTPEGYM_PO_30Dic2022.pdf` },
        { nombre: 'Ley de Propiedad en Condominio de Inmuebles para el Estado de Guanajuato', url: `${GTO_BASE}/LPCIEG_REF_30Nov2022.pdf` },
        { nombre: 'Ley de Obra Pública y Servicios relacionados con la misma para el Estado y los Municipios de Guanajuato', url: `${GTO_BASE}/LOPySRLMG_REF_28Octubre2022.pdf` },
        { nombre: 'Ley de Planeación para el Estado de Guanajuato', url: `${GTO_BASE}/LPEG_REF_28Octubre2022.pdf` },
        { nombre: 'Ley de Contrataciones Públicas para el Estado de Guanajuato', url: `${GTO_BASE}/LCPPEG_REF_21Julio2022.pdf` },
        { nombre: 'Ley del Servicio de Administración Tributaria del Estado de Guanajuato', url: `${GTO_BASE}/LSATEG_REF_30Dic2023.pdf` },
        { nombre: 'Ley de Hacienda para los Municipios del Estado de Guanajuato', url: `${GTO_BASE}/LHMEG_REF_24Sep2021.pdf` },
        { nombre: 'Ley de la Defensoría Pública Penal del Estado de Guanajuato', url: `${GTO_BASE}/Ley_de_la_Defensor_a_P_blica_Penal_del_Estado_de_Guanajuato_20141128.pdf` },
        { nombre: 'Ley de Aparcería Agrícola y Ganadera del Estado de Guanajuato', url: `${GTO_BASE}/Ley_de_Aparcer_a_Agr_cola_y_Ganadera_del_Estado_de_Guanajuato_Reforma__07_06_2013.pdf` },
        { nombre: 'Ley de Concesiones de Servicios e Infraestructura Pública para el Estado de Guanajuato', url: `${GTO_BASE}/20180921.pdf` },
        { nombre: 'Ley de Representación Gratuita en Materia Civil', url: `${GTO_BASE}/20190801.pdf` },
        { nombre: 'Ley del Patrimonio Cultural del Estado de Guanajuato', url: `${GTO_BASE}/LEY_DEL_PATRIMONIO_CULTURAL_DEL_ESTADO_DE_GUANAJUATO_PO_19Jul2021_Dto328.pdf` },
        { nombre: 'Ley de Declaración Especial de Ausencia para el Estado de Guanjuato', url: `${GTO_BASE}/LDEAEG_22Diciembre2020.pdf` },
        { nombre: 'Ley de Fomento a la Actividad Vitivinícola del Estado de Guanajuato', url: `${GTO_BASE}/LFAVEG_22dic2020.pdf` },
        { nombre: 'Ley de Hospedaje a través de Plataformas Digitales del Estado de Guanajuato', url: `${GTO_BASE}/LHPDEG_09Diciembre2020.pdf` },
        { nombre: 'Ley del Proceso Penal para el Estado de Guanajuato', url: `${GTO_BASE}/20160701.pdf` },
        { nombre: 'Ley de Protección Civil para el Estado de Guanajuato', url: `${GTO_BASE}/Ley_de_Protecci_n_Civil_para_el_Estado_de_Guanajuato_20181010.pdf` },
        { nombre: 'Ley que Regula los Establecimientos dedicados a la Compraventa o Adquisición de Vehículos Automotores en Desuso y sus Autopartes, así como en los que se Comercializan, Manejan o Disponen de Metales para Reciclaje, para el Estado de Guanajuato', url: `${GTO_BASE}/LRLOEDCOADVDAUT_D163_30dic19.pdf` },
        { nombre: 'Ley para la Regularización de Predios Rústicos en el Estado de Guanajuato', url: `${GTO_BASE}/Ley_para_la_Regularizaci_n_de_Predios_Rusticos_en_el_Estado_de_Guanajuato_2013_06_07.pdf` },
        { nombre: 'Ley de Proyectos de Prestación de Servicios para el Estado y los Municipios de Guanajuato', url: `${GTO_BASE}/20161028.pdf` },
        { nombre: 'Ley de Profesiones para el Estado de Guanajuato', url: `${GTO_BASE}/20200722.pdf` },
        { nombre: 'Ley de Participación Ciudadana para el Estado de Guanajuato', url: `${GTO_BASE}/20180705.pdf` },
        { nombre: 'Ley de Premios y Estímulos al Mérito Ciudadano para el Estado de Guanajuato', url: `${GTO_BASE}/LPEMC_REF_13Marzo2015.pdf` },
        { nombre: 'Ley de Justicia Alternativa del Estado de Guanajuato', url: `${GTO_BASE}/20201230.pdf` },
        { nombre: 'Ley Arancelaria para el Cobro de Honorarios Profesionales de Abogados y Notarios y de Costas Procesales para el Estado de Guanajuato', url: `${GTO_BASE}/20160701.pdf` },
        { nombre: 'Ley de Protección de Datos Personales en Posesión de Sujetos Obligados para el Estado de Guanajuato', url: `${GTO_BASE}/20171205.pdf` },
        { nombre: 'Ley de Seguridad Social del Estado de Guanajuato', url: `${GTO_BASE}/Ley_de_Seguridad_Social.pdf` },
        { nombre: 'Ley sobre el uso de medios electrónicos y firma electrónica para el estado de Guanajuato y sus Municipios', url: `${GTO_BASE}/LSUMEYFEPEG.pdf` },
        { nombre: 'Ley que Regula a los Agentes Inmobiliarios en el Estado de Guanajuato', url: `${GTO_BASE}/20160701.pdf` },
        { nombre: 'Ley para la Administración y disposición de bienes relacionados con hechos delictuosos para el estado de Guanajuato', url: `${GTO_BASE}/20141128.pdf` },
        { nombre: 'Ley del Sistema Estatal Anticorrupción de Guanajuato', url: `${GTO_BASE}/20191101.pdf` },
        { nombre: 'Ley para Regular la Prestación de Servicios de Atención, Cuidado y Desarrollo Integral Infantil en el Estado de Guanajuato', url: `${GTO_BASE}/LEY_PARA_REGULAR_LA_PRESTACI_N_DE_SERVICIOS_DE_ATENCI_N__CUIDADO_Y_DESARROLLO_INTEGRAL_INFANTIL_EN_EL_ESTADO_DE_G.pdf` },
        { nombre: 'Ley Orgánica de las Fuerzas de Seguridad Pública del Estado', url: `${GTO_BASE}/LFSPEG_REF_15Agosto1995.pdf` },
        { nombre: 'Ley Orgánica de la Universidad de Guanajuato', url: `${GTO_BASE}/20180720.pdf` },
        { nombre: 'Ley de Expropiación, de Ocupación Temporal y de Limitación de Dominio para el Estado de Guanajuato', url: `${GTO_BASE}/20020614.pdf` },
        { nombre: 'Ley que Regula las Bases del Permiso para el Establecimiento de las Casas de Empeño en el Estado de Guanajuato y sus Municipios', url: `${GTO_BASE}/LQRPECEGTO_30Dic2019.pdf` },
        { nombre: 'Ley Ganadera para el Estado de Guanajuato', url: `${GTO_BASE}/Ley_GanaderaPO_25nov2019.pdf` },
        { nombre: 'Ley de Ejecución de Medidas Judiciales y Sanciones Penales del Estado de Guanajuato', url: `${GTO_BASE}/20160701.pdf` },
        { nombre: 'Ley de Deuda Pública para el Estado y los Municipios de Guanajuato', url: `${GTO_BASE}/LEY_DE_DEUDA_P_BLICA_PARA_EL_ESTADO_Y_LOS_MUNICIPIOS_DE_GUANAJUATO.pdf` },
        { nombre: 'Ley para el Fomento de la Industria Cinematográfica y Audiovisual del Estado de Guanajuato', url: `${GTO_BASE}/LFICAEG_27Junio_2014.pdf` },
        { nombre: 'Ley para Prevenir, Atender Erradicar la Trata de Personas en el Estado de Guanajuato', url: `${GTO_BASE}/20140228.pdf` },
        { nombre: 'Ley del Secreto Profesional del Periodista del Estado de Guanajuato', url: `${GTO_BASE}/20171026.pdf` },
    ],
    codigos: [
        { nombre: 'Código de Procedimientos Civiles para el Estado de Guanajuato', url: `${GTO_BASE}/20190801.pdf` },
        { nombre: 'Código Territorial para el Estado y los Municipios de Guanajuato', url: `${GTO_BASE}/CTPEMG_REF_17Sep2024.pdf` },
        { nombre: 'Código de Procedimiento y Justicia Administrativa para el Estado y los Municipios de Guanajuato', url: `${GTO_BASE}/CPJAEG_FDE_05Nov2025.pdf` },
        { nombre: 'Código Penal del Estado de Guanajuato', url: `${GTO_BASE}/CPEG_REF_31Diciembre2025.pdf` },
        { nombre: 'Código Civil para el Estado de Guanajuato', url: `${GTO_BASE}/CCG_REF_18Diciembre2025_DL113.pdf` },
        { nombre: 'Código Fiscal para el Estado de Guanajuato', url: `${GTO_BASE}/CFEG_REF_31Diciembre2025.pdf` },
    ],
    reglamentos: [
        { nombre: 'Reglamento de la Ley de Fiscalización Superior del Estado de Guanajuato', url: `${GTO_BASE}/Reglamento_de_la_Ley_de_Fiscalizacion_D235_PO_216_3ra_Parte_28oct2020.pdf` },
        { nombre: 'Reglamento del Poder Legislativo del Estado de Guanajuato para el uso de Medios Electrónicos y Firma Electrónica.', url: `${GTO_BASE}/REGLAMENTO_DEL_PL_PARA_EL_USO_DE_MEDIOS_ELECTR_NICOS_Y_FIRMA_ELECTR_NICA_PO_02mar2018.pdf` },
        { nombre: 'Reglamento en Materia de Transparencia y Acceso a la Información Pública del Poder Legislativo del Estado de Guanajuato', url: `${GTO_BASE}/REGLAMENTO_EN_MATERIA_DE_TRANSPARENCIA_FedeE21Abr2017.pdf` },
        { nombre: 'Reglamento de Contrataciones Públicas del Poder Legislativo del Estado de Guanajuato', url: `${GTO_BASE}/REGLAMENTO_DE_CONTRATACIONES_P_BLICAS_DEL_PODER_LEGISLATIVO.pdf` },
        { nombre: 'Reglamento de los Procedimientos en Materia de Protección de Datos Personales del Poder Legislativo del Estado de Guanajuato.', url: `${GTO_BASE}/REGLAMENTO_DE_LOS_PROCEDIMIENTOS_EN_MATERIA_DE_PROTECCI_N.pdf` },
        { nombre: 'Reglamento del Archivo General del Poder Legislativo del Estado de Guanajuato', url: `${GTO_BASE}/REGLAMENTO_DEL_ARCHIVO_GENERAL_DEL_PODER_LEGISLATIVO.pdf` },
    ],
    otros: []
};





// --- Michoacan: FULL DATA --- PDFs hosted on Supabase -----



const MICH_BASE = 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/Michoacan';



const MICHOACAN_LEYES: CategoriaLeyes = {



    constitucion: [



        { nombre: 'Constitución Política del Estado Libre y Soberano de Michoacán de Ocampo', url: `${MICH_BASE}/LXXVIDECRETOLEGISLATIVO-005.pdf` },



    ],



    leyes: [



        { nombre: 'Ley Reglamentaria de la fracción XVII bis, del Artículo 44 de la Constitución Política del Estado Libre y Soberano de Michoacán de Ocampo.', url: `${MICH_BASE}/LEY-REGLAMENTARIA-DE-LA-FRACCION-XVII-BIS-DEL-ARTICULO-44-DE-LA-CONSTITUCION-POLITICA-REF-27-FEB-2019.pdf` },



        { nombre: 'Ley Contra las Adicciones en el Estado de Michoacán.', url: `${MICH_BASE}/LEY-CONTRA-LAS-ADICCIONES-EN-EL-ESTADO-DE-MICHOACAN-PO-11-DE-JULIO-DE-2022.pdf` },



        { nombre: 'Ley Estatal de Educación en el Nivel Medio Superior y la Formación para el Trabajo del Estado de Michoacán de Ocampo.', url: `${MICH_BASE}/LEY-ESTATAL-DE-EDUCACION-EN-EL-NIVEL-MEDIO-SUPERIOR-Y-LA-FORMACION-PARA-EL-TRABAJO-5-OCTUBRE-2021.pdf` },



        { nombre: 'Ley Inquilinaria del Estado de Michoacán', url: `${MICH_BASE}/LEY-INQUILINARIA-DEL-ESTADO-REF-29-DIC-2016.pdf` },



        { nombre: 'Ley Orgánica Municipal del Estado de Michoacán de Ocampo', url: `${MICH_BASE}/LXXVDECRETOLEGISLATIVO652.pdf` },



        { nombre: 'Ley Orgánica de División Territorial de Michoacán', url: `${MICH_BASE}/LXXVDECRETOLEGISLATIVO445.pdf` },



        { nombre: 'Ley Orgánica de la Administración Pública del Estado de Michoacán de Ocampo', url: `${MICH_BASE}/LXXVDECRETOLEGISLATIVO679.pdf` },



        { nombre: 'Ley Orgánica de la Fiscalía General del Estado de Michoacán.', url: `${MICH_BASE}/LXXVDECRETOLEGISLATIVO465-Fe-de-erratas.pdf` },



        { nombre: 'Ley Orgánica de la Universidad Michoacana de San Nicolás de Hidalgo', url: `${MICH_BASE}/Ley-Organica-de-la-Universidad-Michoacana-de-San-Nicolas-de-Hidalgo.pdf` },



        { nombre: 'Ley Orgánica del Centro de Conciliación Laboral del Estado de Michoacán de Ocampo.', url: `${MICH_BASE}/LEY-ORGANICA-DEL-CENTRO-DE-CONCILIACION-LABORAL-DEL-ESTADO-REF-8-DE-JULIO-2022-1.pdf` },



        { nombre: 'Ley Orgánica del Instituto de Vivienda del Estado de Michoacán de Ocampo', url: `${MICH_BASE}/LEY_ORGANICA_DEL_INSTITUTO_DE_VIVIENDA_DEL_ESTADO_DE_MICHOACAN_DE_OCAMPO.pdf` },



        { nombre: 'Ley Orgánica del Poder Judicial del Estado de Michoacán', url: `${MICH_BASE}/LXXVIDECRETOLEGISLATIVO-095.pdf` },



        { nombre: 'Ley Orgánica del Registro Civil del Estado de Michoacán de Ocampo', url: `${MICH_BASE}/LXXVDECRETOLEGISLATIVO465-Fe-de-erratas.pdf` },



        { nombre: 'Ley Orgánica y de Procedimientos del Congreso del Estado de Michoacán de Ocampo', url: `${MICH_BASE}/ultima-reforma-Ley-organica-y-de-procedimientos-del-Congreso-del-Estado-de-Michoacan-de-Ocampo.pdf` },



        { nombre: 'Ley Reglamentaria de Tierras Ociosas', url: `${MICH_BASE}/Ley-Reglamentaria-de-Tierras-Ociosas.pdf` },



        { nombre: 'Ley Sobre el Régimen de Propiedad en Condominio', url: `${MICH_BASE}/Ley-Sobre-el-Regimen-de-Propiedad-en-Condominio.pdf` },



        { nombre: 'Ley de Adopción y Acogimiento Familiar del Estado de Michoacán de Ocampo.', url: `${MICH_BASE}/LXXVDECRETOLEGISLATIVO353.pdf` },



        { nombre: 'Ley de Adquisiciones, Arrendamientos y Prestación de Servicios Relacionados con Bienes Muebles e Inmueble (Sic) del Estado de Michoacán de Ocampo', url: `${MICH_BASE}/LEY-DE-ADQUISICIONES-ARRENDAMIENTOS-Y-PRESTACION-DE-SERVICIOS-REF-5-DE-NOV-2020.pdf` },



        { nombre: 'Ley de Agricultura Urbana y Periurbana del Estado de Michoacán de Ocampo.', url: `${MICH_BASE}/LXXVDECRETOLEGISLATIVO458.pdf` },



        { nombre: 'Ley de Amnistía del Estado de Michoacán de Ocampo', url: `${MICH_BASE}/LEY-DE-AMNISTIA-REF-28-DE-AGOSTO-DE-2019.pdf` },



        { nombre: 'Ley de Arancel de Abogados en el Estado de Michoacán', url: `${MICH_BASE}/Ley-de-Arancel-de-Abogados-en-el-Estado-de-Michoacan.pdf` },



        { nombre: 'Ley de Arancel de Notarios', url: `${MICH_BASE}/Ley-de-Arancel-de-Notarios.pdf` },



        { nombre: 'Ley de Archivos Administrativos e Históricos del Estado de Michoacán de Ocampo y sus Municipios', url: `${MICH_BASE}/Ley-de-Archivos-Administrativos-e-Historicos-del-Estado-de-Michoacan-de-Ocampo-y-sus-Municipios..pdf` },



        { nombre: 'Ley de Asistencia Social del Estado de Michoacán de Ocampo', url: `${MICH_BASE}/LXXVDECRETOLEGISLATIVO695.pdf` },



        { nombre: 'Ley de Asociaciones Público Privadas para el Estado de Michoacán de Ocampo', url: `${MICH_BASE}/LEY-DE-ASOCIACIONES-PUBLICO-PRIVADAS-REF-29-DIC-2016.pdf` },



        { nombre: 'Ley de Atención a Víctimas para el Estado de Michoacán de Ocampo', url: `${MICH_BASE}/LXXVDECRETOLEGISLATIVO660.pdf` },



        { nombre: 'Ley de Bibliotecas para el Estado de Michoacán de Ocampo.', url: `${MICH_BASE}/LEY-DE-BIBLIOTECAS-PARA-EL-ESTADO-19-DE-JULIO-DE-2018.pdf` },



        { nombre: 'Ley de Cambio Climático del Estado de Michoacán de Ocampo', url: `${MICH_BASE}/LXXVDECRETOLEGISLATIVO-08.pdf` },



        { nombre: 'Ley de Caminos y Puentes del Estado de Michoacán de Ocampo', url: `${MICH_BASE}/LEY-DE-CAMINOS-Y-PUENTES-REF-28-DIC-2017.pdf` },



        { nombre: 'Ley de Catastro del Estado de Michoacán de Ocampo.', url: `${MICH_BASE}/LEY_DE_CATASTRO_DEL_ESTADO_REF_01_FEB_2017.pdf` },



        { nombre: 'Ley de Ciencia, Tecnología e Innovación del Estado de Michoacán', url: `${MICH_BASE}/LXXVDECRETOLEGISLATIVO439.pdf` },



        { nombre: 'Ley de Comunicaciones y Transportes del Estado de Michoacán', url: `${MICH_BASE}/Ley-de-Comunicaciones-y-Transportes-del-Estado-de-Michoacan.pdf` },



        { nombre: 'Ley de Cooperación de los Productores de Limón del Estado de Michoacán', url: `${MICH_BASE}/Ley-de-Cooperacion-de-los-Productores-de-Limon-del-Estado-de-Michoacan.pdf` },



        { nombre: 'Ley de Coordinación Fiscal del Estado de Michoacán de Ocampo', url: `${MICH_BASE}/LXXVIDECRETOLEGISLATIVO-111.pdf` },



        { nombre: 'Ley de Cultura Física y Deporte del Estado de Michoacán de Ocampo.', url: `${MICH_BASE}/LEY-DE-CULTURA-FISICA-Y-DEPORTE-REF-28-DE-AGOSTO-DE-2019.pdf` },



        { nombre: 'Ley de Derechos, el Bienestar y Protección de los Animales en el Estado de Michoacán de Ocampo.', url: `${MICH_BASE}/LXXVDECRETOLEGISLATIVO643.pdf` },



        { nombre: 'Ley de Desarrollo Cultural para el Estado de Michoacán de Ocampo', url: `${MICH_BASE}/LXXVDECRETOLEGISLATIVO-08.pdf` },



        { nombre: 'Ley de Desarrollo Forestal Sustentable del Estado de Michoacán de Ocampo', url: `${MICH_BASE}/LEY-DE-DESARROLLO-FORESTAL-SUSTENTABLE-REF-2-de-Diciembre-de-2022.pdf` },



        { nombre: 'Ley de Desarrollo Rural Integral Sustentable del Estado de Michoacán de Ocampo', url: `${MICH_BASE}/LEY-DE-DESARROLLO-RURAL-INTEGRAL-SUSTENTABLE-REF-25-DE-JULIO-DE-2023.pdf` },



        { nombre: 'Ley de Desarrollo Social del Estado de Michoacán', url: `${MICH_BASE}/LEY-DE-DESARROLLO-SOCIAL-DEL-ESTADO-DE-MICHOACAN-REF-4-DE-DICIEMBRE-DE-2020.pdf` },



        { nombre: 'Ley de Deuda Pública del Estado de Michoacán de Ocampo', url: `${MICH_BASE}/LEY-DE-DEUDA-PUBLICA-REF-28-DIC-2017.pdf` },



        { nombre: 'Ley de Educación para el Estado de Michoacán de Ocampo.', url: `${MICH_BASE}/LXXVDECRETOLEGISLATIVO673.pdf` },



        { nombre: 'Ley de Ejecución de Sanciones Penales del Estado de Michoacán de Ocampo', url: `${MICH_BASE}/LEY-DE-EJECUCION-DE-SANCIONES-PENALES-REF-28-AGOSTO-2019.pdf` },



        { nombre: 'Ley de Entidades Paraestatales del Estado de Michoacán.', url: `${MICH_BASE}/LEY-DE-ENTIDADES-PARAESTATALES-DEL-ESTADO-REF-18-DE-JULIO-DE-2017.pdf` },



        { nombre: 'Ley de Expropiación del Estado de Michoacán de Ocampo', url: `${MICH_BASE}/Ley-de-Expropiacion-del-Estado-de-Michoacan-de-Ocampo.pdf` },



        { nombre: 'Ley de Extinción de Dominio del Estado de Michoacán de Ocampo', url: `${MICH_BASE}/LEY-DE-EXTINCION-DE-DOMINIO-REF-28-DE-AGOSTO-DE-2019.pdf` },



        { nombre: 'Ley de Financiamiento Rural para el Estado de Michoacán de Ocampo', url: `${MICH_BASE}/LEY-DE-FINANCIAMIENTO-RURAL-REF-26-DE-JUNIO-DE-2023.pdf` },



        { nombre: 'Ley de Firma Electrónica Certificada del Estado de Michoacán de Ocampo', url: `${MICH_BASE}/LEY-DE-FIRMA-ELECTRONICA-CERTIFICADA-REF-29-DIC-2016.pdf` },



        { nombre: 'Ley de Fiscalización Superior y Rendición de Cuentas del Estado de Michoacán de Ocampo.', url: `${MICH_BASE}/LXXVDECRETOLEGISLATIVO450.pdf` },



        { nombre: 'Ley de Fomento Apícola del Estado de Michoacán de Ocampo', url: `${MICH_BASE}/LEY-DE-FOMENTO-APICOLA-REF-18-DE-NOV-DE-2022.pdf` },



        { nombre: 'Ley de Fomento a la Lectura y el Libro del Estado de Michoacán de Ocampo', url: `${MICH_BASE}/Ley-de-Fomento-a-la-Lectura-y-el-Libro-del-Estado-de-Michoacan-de-Ocampo.pdf` },



        { nombre: 'Ley de Fomento al Primer Empleo y a la Primera Empresa para el Estado de Michoacán de Ocampo y sus Municipios', url: `${MICH_BASE}/LEY-DE-FOMENTO-AL-PRIMER-EMPLEO-Y-A-LA-PRIMERA-EMPRESA-PARA-EL-ESTADO-DE-MICHOACAN-DE-OCAMPO-Y-SUS-MUNICIPIOS-REF-01-AGOSTO-2019.pdf` },



        { nombre: 'Ley de Fomento y Desarrollo Artesanal del Estado de Michoacán de Ocampo.', url: `${MICH_BASE}/LXXVDECRETOLEGISLATIVO645.pdf` },



        { nombre: 'Ley de Fomento y Fortalecimiento a las Actividades Realizadas por Organizaciones de la Sociedad Civil en el Estado de Michoacán de Ocampo', url: `${MICH_BASE}/LEY-DE-FOMENTO-Y-FORTALECIMIENTO-A-LAS-ACTIVIDADES-REALIZADAS-POR-ORGANIZACIONES-DE-LA-SOCIEDAD-CIVIL-REF-4-DE-DIC-2020.pdf` },



        { nombre: 'Ley de Fomento y Protección del Maíz Criollo Como Patrimonio Alimentario del Estado de Michoacán de Ocampo.', url: `${MICH_BASE}/Ley-de-Fomento-y-Proteccion-del-Maiz-Criollo-Como-Patrimonio-Alimentario-del-Estado-de-Michoacan-de-Ocampo..pdf` },



        { nombre: 'Ley de Fondos de Aseguramiento Agropecuario y Rural para el Estado de Michoacán de Ocampo', url: `${MICH_BASE}/Ley-de-Fondos-de-Aseguramiento-Agropecuario-y-Rural-para-el-Estado-de-Michoacan-de-Ocampo.pdf` },



        { nombre: 'Ley de Ganadería del Estado de Michoacán de Ocampo', url: `${MICH_BASE}/LXXVDECRETOLEGISLATIVO644.pdf` },



        { nombre: 'Ley de Gobierno Digital del Estado de Michoacán de Ocampo.', url: `${MICH_BASE}/LEY-DE-GOBIERNO-DIGITAL-DEL-ESTADO-DE-MICHOACAN-DE-OCAMPO-5-OCT-2021.pdf` },



        { nombre: 'Ley de Hacienda Municipal del Estado de Michoacán de Ocampo.', url: `${MICH_BASE}/LEY-DE-HACIENDA-MUNICIPAL-DEL-ESTADO-REF-22-DE-DIC-2022.pdf` },



        { nombre: 'Ley de Hacienda del Estado de Michoacán de Ocampo.', url: `${MICH_BASE}/LXXVIDECRETOLEGISLATIVO-109.pdf` },



        { nombre: 'Ley de Indulto', url: `${MICH_BASE}/Ley-de-Indulto.pdf` },



        { nombre: 'Ley de Ingresos del Estado de Michoacán de Ocampo, para el Ejercicio Fiscal del año 2024.', url: `${MICH_BASE}/LXXVDECRETOLEGISLATIVO606.pdf` },



        { nombre: 'Ley de Instituciones de Asistencia Privada del Estado de Michoacán.', url: `${MICH_BASE}/LEY-DE-INSTITUCIONES-DE-ASISTENCIA-PRIVADA-DEL-ESTADO-REF-29-DIC-2016.pdf` },



        { nombre: 'Ley de Justicia Alternativa y Restaurativa del Estado de Michoacán de Ocampo.', url: `${MICH_BASE}/LEY-DE-JUSTICIA-ALTERNATIVA-Y-RESTAURATIVA-REF-30-DE-JUNIO-DE-2020.pdf` },



        { nombre: 'Ley de Justicia Comunal del Estado de Michoacán de Ocampo', url: `${MICH_BASE}/LEY-DE-JUSTICIA-COMUNAL-REF-28-DE-AGOSTO-DE-2019.pdf` },



        { nombre: 'Ley de Justicia Cívica del Estado de Michoacán de Ocampo.', url: `${MICH_BASE}/LXXVDECRETOLEGISLATIVO567.pdf` },



        { nombre: 'Ley de Justicia en materia Electoral y de Participación Ciudadana del Estado de Michoacán de Ocampo.', url: `${MICH_BASE}/LEY-DE-JUSTICIA-EN-MATERIA-ELECTORAL-Y-DE-PARTICIPACION-CIUDADANA-REF-2-DE-JUNIO-DE-2023.pdf` },



        { nombre: 'Ley de Mecanismos de Participación Ciudadana del Estado de Michoacán de Ocampo', url: `${MICH_BASE}/LEY-DE-MECANISMOS-DE-PARTICIPACION-CIUDADANA-REF-2-DE-JUNIO-DE-2023.pdf` },



        { nombre: 'Ley de Mejora Regulatoria del Estado de Michoacán de Ocampo y sus Municipios.', url: `${MICH_BASE}/LXXVDECRETOLEGISLATIVO433.pdf` },



        { nombre: 'Ley de Movilidad y Seguridad Vial del Estado de Michoacán de Ocampo.', url: `${MICH_BASE}/LEY-DE-MOVILIDAD-Y-SEGURIDAD-VIAL-FE-DE-ERRATAS-16-DE-JUNIO-DE-2023.pdf` },



        { nombre: 'Ley de Obra Pública y Servicios Relacionados con la misma para el Estado de Michoacán de Ocampo y sus Municipios', url: `${MICH_BASE}/LEY-DE-OBRA-PUBLICA-Y-SERVICIOS-RELACIONADOS-22-DIC-2022.pdf` },



        { nombre: 'Ley de Organizaciones Agrícolas del Estado de Michoacán.', url: `${MICH_BASE}/LEY-DE-ORGANIZACIONES-AGRICOLAS-REF-29-DIC-2016.pdf` },



        { nombre: 'Ley de Pensiones Civiles para el Estado de Michoacán', url: `${MICH_BASE}/LEY-DE-PENSIONES-CIVILES-REFORMA-5-DE-OCTUBRE-DE-2018.pdf` },



        { nombre: 'Ley de Pesca y Acuacultura Sustentables para el Estado de Michoacán de Ocampo', url: `${MICH_BASE}/LEY-DE-PESCA-Y-ACUACULTURA-SUSTENTABLES-REF-29-DIC-2016.pdf` },



        { nombre: 'Ley de Planeación del Estado de Michoacán de Ocampo', url: `${MICH_BASE}/LEY_DE_PLANEACION_DEL_ESTADO_27-JUNIO-2014.pdf` },



        { nombre: 'Ley de Productos Orgánicos para el Estado de Michoacán de Ocampo.', url: `${MICH_BASE}/LEY-DE-PRODUCTOS-ORGANICOS-PARA-EL-ESTADO-REF-29-DIC-2016.pdf` },



        { nombre: 'Ley de Profesiones del Estado de Michoacán de Ocampo.', url: `${MICH_BASE}/NUEVA-LEY-DE-PROFESIONES-20-DE-ENERO-DE-2020.pdf` },



        { nombre: 'Ley de Protección Civil del Estado de Michoacán de Ocampo.', url: `${MICH_BASE}/LEY-DE-PROTECCION-CIVIL-DEL-ESTADO-13-JUNIO-DE-2023.pdf` },



        { nombre: 'Ley de Protección Integral a las Personas Adultas Mayores del Estado de Michoacán de Ocampo', url: `${MICH_BASE}/LEY-DE-PROTECCION-INTEGRAL-A-LAS-PERSONAS-ADULTAS-MAYORES-REF-31-DE-MARZO-DE-2023.pdf` },



        { nombre: 'Ley de Protección de Datos Personales en Posesión de Sujetos Obligados del Estado de Michoacán de Ocampo', url: `${MICH_BASE}/LEY-DE-PROTECCION-DE-DATOS-PERSONALES-EN-POSESION-DE-SUJETOS-REF-13-DE-NOV-2017.pdf` },



        { nombre: 'Ley de Protección de los No Fumadores del Estado de Michoacán de Ocampo', url: `${MICH_BASE}/LEY-DE-PROTECCION-DE-LOS-NO-FUMADORES-REF-11-MAYO-2018.pdf` },



        { nombre: 'Ley de Remuneraciones de los Servidores Públicos del Estado de Michoacán de Ocampo', url: `${MICH_BASE}/LEY-DE-REMUNERACIONES-DE-LOS-SERVIDORES-PUBLICOS-REF-22-DE-AGOSTO-DE-2019.pdf` },



        { nombre: 'Ley de Responsabilidad Ambiental para el Estado de Michoacán de Ocampo.', url: `${MICH_BASE}/LXXVDECRETOLEGISLATIVO-08.pdf` },



        { nombre: 'Ley de Responsabilidad Patrimonial del Estado de Michoacán y sus Municipios.', url: `${MICH_BASE}/NUEVA-LEY-DE-RESPONSABILIDAD-PATRIMONIAL-DEL-ESTADO-PUBLICADA-01-SEPT-20171023.pdf` },



        { nombre: 'Ley de Responsabilidades Administrativas para el Estado de Michoacán de Ocampo.', url: `${MICH_BASE}/LEY-DE-RESPONSABILIDADES-ADMINISTRATIVAS-13-MAYO-2021.pdf` },



        { nombre: 'Ley de Responsabilidades y Registro Patrimonial de los Servidores Públicos del Estado de Michoacán y sus Municipios', url: `${MICH_BASE}/LEY-DE-RESPONSABILIDADES-Y-REGISTRO-PATRIMONIAL-DE-LOS-SERVIDORES-PUBLICOS-REF-14-DE-FEBRERO-DE-2018.pdf` },



        { nombre: 'Ley de Salud Mental del Estado de Michoacán de Ocampo', url: `${MICH_BASE}/LXXVDECRETOLEGISLATIVO648.pdf` },



        { nombre: 'Ley de Salud del Estado de Michoacán de Ocampo.', url: `${MICH_BASE}/LXXVDECRETOLEGISLATIVO650.pdf` },



        { nombre: 'Ley de Seguridad Privada del Estado de Michoacán de Ocampo', url: `${MICH_BASE}/LEY-DE-SEGURIDAD-PRIVADA-REF-28-AGOSTO-201940391.pdf` },



        { nombre: 'Ley de Transparencia, Acceso a la Información Pública y Protección de Datos Personales del Estado de Michoacán de Ocampo', url: `${MICH_BASE}/LXXVDECRETOLEGISLATIVO608-2024-01-25.pdf` },



        { nombre: 'Ley de Trasplantes y Donación de Órganos, Tejidos y Células en el Estado de Michoacán de Ocampo.', url: `${MICH_BASE}/LXXVDECRETOLEGISLATIVO651.pdf` },



        { nombre: 'Ley de Turismo del Estado de Michoacán de Ocampo', url: `${MICH_BASE}/LEY-DE-TURISMO-REF-25-DE-JULIO-DE-2023.pdf` },



        { nombre: 'Ley de Voluntad Vital Anticipada del Estado de Michoacán de Ocampo', url: `${MICH_BASE}/LEY-DE-VOLUNTAD-VITAL-ANTICIPADA-REF-14-DE-AGOSTO-DE-201838870.pdf` },



        { nombre: 'Ley de Zonas Económicas Especiales del Estado de Michoacán de Ocampo', url: `${MICH_BASE}/NUEVA-LEY-DE-ZONAS-ECONOMICAS-ESPECIALES-DEL-ESTADO-PO-30-MARZO-DE-2017-11A-SECC.pdf` },



        { nombre: 'Ley de la Atención y Protección a Personas con la Condición del Espectro Autista para el Estado de Michoacán de Ocampo.', url: `${MICH_BASE}/LEY-DE-LA-ATENCION-Y-PROTECCION-A-PERSONAS-CON-LA-CONDICION-DEL-ESPECTRO-AUTISTA-P.O.-04-DIC-2020.pdf` },



        { nombre: 'Ley de la Comisión Estatal de los Derechos Humanos de Michoacán de Ocampo', url: `${MICH_BASE}/LXXVDECRETOLEGISLATIVO671.pdf` },



        { nombre: 'Ley de la Comisión Estatal para la Protección contra Riesgos Sanitarios de Michoacán', url: `${MICH_BASE}/LEY-DE-LA-COMISION-ESTATAL-PARA-LA-PROTECCION-CONTRA-RIESGOS-SANITARIOS-REF-30-DE-MARZO-DE-2023.pdf` },



        { nombre: 'Ley de la Defensoría Pública del Estado de Michoacán', url: `${MICH_BASE}/LEY-DE-LA-DEFENSORIA-PUBLICA-REF-29-DIC-2016.pdf` },



        { nombre: 'Ley de la Función Registral y Catastral del Estado de Michoacán de Ocampo.', url: `${MICH_BASE}/LEY-DE-LA-FUNCION-REGISTRAL-Y-CATASTRAL-DEL-ESTADO-DE-MICHOACAN-DE-OCAMPO-26-ENERO-DE-2021.pdf` },



        { nombre: 'Ley de los Derechos de Niñas, Niños y Adolescentes del Estado de Michoacán de Ocampo', url: `${MICH_BASE}/LXXVDECRETOLEGISLATIVO674.pdf` },



        { nombre: 'Ley de los Jóvenes del Estado de Michoacán de Ocampo', url: `${MICH_BASE}/LXXVDECRETOLEGISLATIVO451.pdf` },



        { nombre: 'Ley de los Trabajadores al Servicio del Estado de Michoacán de Ocampo y de sus Municipios.', url: `${MICH_BASE}/LXXVDECRETOLEGISLATIVO676.pdf` },



        { nombre: 'Ley del Agua y Gestión de Cuencas para el Estado de Michoacán', url: `${MICH_BASE}/LXXVDECRETOLEGISLATIVO610.pdf` },



        { nombre: 'Ley del Consejo Económico y Social del Estado de Michoacán de Ocampo', url: `${MICH_BASE}/LXXVDECRETOLEGISLATIVO192.pdf` },



        { nombre: 'Ley del Escudo del Estado Libre y Soberano de Michoacán de Ocampo', url: `${MICH_BASE}/LEY-DEL-ESCUDO-DEL-ESTADO-REF-29-DIC-2016.pdf` },



        { nombre: 'Ley del Fondo Auxiliar para la Administración de Justicia del Estado de Michoacán de Ocampo', url: `${MICH_BASE}/Ley-del-Fondo-Auxiliar-para-la-Administracion-de-Justicia-del-Estado-de-Michoacan-de-Ocampo.pdf` },



        { nombre: 'Ley del Mezcal para el Estado de Michoacán de Ocampo', url: `${MICH_BASE}/LEY-DEL-MEZCAL-PARA-EL-ESTADO-30-marzo-2018.pdf` },



        { nombre: 'Ley del Notariado del Estado de Michoacán', url: `${MICH_BASE}/LEY-DEL-NOTARIADO-REF-28-DE-MARZO-DE-2022.pdf` },



        { nombre: 'Ley del Patrimonio Estatal', url: `${MICH_BASE}/LEY-DEL-PATRIMONIO-ESTATAL-REF-25-ENERO-2017.pdf` },



        { nombre: 'Ley del Periódico Oficial del Estado de Michoacán de Ocampo', url: `${MICH_BASE}/Ley-del-Periodico-Oficial-del-Estado-de-Michoacan-de-Ocampo.pdf` },



        { nombre: 'Ley del Registro Público de la Propiedad del Estado de Michoacán de Ocampo', url: `${MICH_BASE}/Ley-del-Registro-Publico-de-la-Propiedad-del-Estado-de-Michoacan-de-Ocampo.pdf` },



        { nombre: 'Ley del Servicio de Administración Tributaria del Estado de Michoacán de Ocampo.', url: `${MICH_BASE}/LXXVIDECRETOLEGISLATIVO-110.pdf` },



        { nombre: 'Ley del Sistema Estatal Anticorrupción para el Estado de Michoacán de Ocampo.', url: `${MICH_BASE}/LEY-DEL-SISTEMA-ESTATAL-ANTICORRUPCION-REF-28-DE-AGOSTO-DE-2019.pdf` },



        { nombre: 'Ley del Sistema Estatal de Seguridad Pública de Michoacán de Ocampo.', url: `${MICH_BASE}/LXXVDECRETOLEGISLATIVO437.pdf` },



        { nombre: 'Ley para Prevenir y Eliminar la Discriminación y la Violencia en el Estado de Michoacán de Ocampo.', url: `${MICH_BASE}/LXXVDECRETOLEGISLATIVO673.pdf` },



        { nombre: 'Ley para Prevenir y Erradicar el Feminicidio del Estado de Michoacán de Ocampo.', url: `${MICH_BASE}/LEY-PARA-PREVENIR-Y-ERRADICAR-EL-FEMINICIDIO-.pdf` },



        { nombre: 'Ley para Prevenir, Atender y Erradicar la Trata de Personas y para la Protección y Asistencia de las Víctimas en el Estado de Michoacán de Ocampo', url: `${MICH_BASE}/LEY-PARA-PREVENIR-ATENDER-Y-ERRADICAR-LA-TRATA-DE-PERSONAS-Y-PARA-LA-PROTECCION-Y-ASISTENCIA-DE-LAS-VICTIMAS-REF-28-AGOSTO-2019.pdf` },



        { nombre: 'Ley para el Desarrollo de la Competitividad de la Micro, Pequeña y Mediana Empresa del Estado de Michoacán', url: `${MICH_BASE}/LEY-PARA-EL-DESARROLLO-DE-LA-COMPETITIVIDAD-DE-LA-MICRO-REF.-01-DE-AGOSTO-DE-2019.pdf` },



        { nombre: 'Ley para el Desarrollo y Protección de las Madres Jefas de Familia del Estado de Michoacán de Ocampo', url: `${MICH_BASE}/Decreto-Legislativo-366_04-12-20.pdf` },



        { nombre: 'Ley para la Administración de Bienes Asegurados y Decomisados del Estado de Michoacán de Ocampo', url: `${MICH_BASE}/LEY-PARA-LA-ADMINISTRACION-DE-BIENES-ASEGURADOS-Y-DECOMISADOS-REF-28-AGOSTO-201940835.pdf` },



        { nombre: 'Ley para la Atención de la Violencia Escolar en el Estado de Michoacán', url: `${MICH_BASE}/LXXVDECRETOLEGISLATIVO673.pdf` },



        { nombre: 'Ley para la Atención y Prevención de la Violencia Familiar en el Estado de Michoacán de Ocampo', url: `${MICH_BASE}/LEY-PARA-LA-ATENCION-Y-PREVENCION-DE-LA-VIOLENCIA-FAMILIAR-ref-5-de-abril-de-2021.pdf` },



        { nombre: 'Ley para la Atención y Protección de los Migrantes y sus Familias del Estado de Michoacán de Ocampo.', url: `${MICH_BASE}/LXXVDECRETOLEGISLATIVO653.pdf` },



        { nombre: 'Ley para la Conservación y Restauración de Tierras del Estado de Michoacán de Ocampo', url: `${MICH_BASE}/LEY-PARA-LA-CONSERVACION-Y-RESTAURACION-DE-TIERRAS-DEL-ESTADO-REF-29-DIC-2016.pdf` },



        { nombre: 'Ley para la Conservación y Sustentabilidad Ambiental del Estado de Michoacán de Ocampo.', url: `${MICH_BASE}/LEY-PARA-LA-CONSERVACION-Y-SUSTENTABILIDAD-AMBIENTAL-REF-5-DE-JULIO-DE-2023.pdf` },



        { nombre: 'Ley para la Igualdad entre Mujeres y Hombres del Estado de Michoacán de Ocampo', url: `${MICH_BASE}/LEY-PARA-LA-IGUALDAD-ENTRE-MUJERES-Y-HOMBRES-REF-22-DE-AGISTO-DE-2019.pdf` },



        { nombre: 'Ley para la Inclusión de las Personas con Discapacidad en el Estado de Michoacán de Ocampo.', url: `${MICH_BASE}/LXXVDECRETOLEGISLATIVO691.pdf` },



        { nombre: 'Ley para la Prestación de Servicios Inmobiliarios en el Estado de Michoacán', url: `${MICH_BASE}/LEY-PARA-LA-PRESTACION-DE-SERVICIOS-INMOBILIARIOS-REF-29-DIC-2016.pdf` },



        { nombre: 'Ley para la Prestación de servicios de Atención, Cuidado y Desarrollo Integral Infantil en el Estado de Michoacán', url: `${MICH_BASE}/LEY-PARA-LA-PRESTACION-DE-SERVICIOS-DE-ATENCION-CUIDADO-Y-DESARROLLO-INTEGRAL-INFANTIL-EN-EL-ESTADO-REF-25-ENERO-2021.pdf` },



        { nombre: 'Ley para la Prevención y Gestión Integral de Residuos en el Estado de Michoacán de Ocampo', url: `${MICH_BASE}/LEY-PARA-LA-PREVENCION-Y-GESTION-INTEGRAL-DE-RESIDUOS-REF-18-DE-FEB-2022.pdf` },



        { nombre: 'Ley para la Prevención, Atención y Tratamiento Integral del Sobrepeso, Obesidad y Trastornos de la Conducta Alimentaria para el Estado de Michoacán de Ocampo', url: `${MICH_BASE}/LEY-PARA-LA-PREVENCION-ATENCION-Y-TRATAMIENTO-REF-4-DE-DIC-2020.pdf` },



        { nombre: 'Ley para la Prevención, Tratamiento y Control de la Diabetes Mellitus en el Estado de Michoacán de Ocampo', url: `${MICH_BASE}/Ley-para-la-Prevencion-Tratamiento-y-Control-de-la-Diabetes-Mellitus-en-el-Estado-de-Michoacan-de-Ocampo.pdf` },



        { nombre: 'Ley para la Protección de Personas Defensoras de Derechos Humanos y Periodistas del Estado de Michoacán.', url: `${MICH_BASE}/LXXVDECRETOLEGISLATIVO568.pdf` },



        { nombre: 'Ley para la Protección de Personas Intervinientes en el Proceso Penal del Estado de Michoacán', url: `${MICH_BASE}/LEY-PARA-LA-PROTECCION-DE-PERSONAS-INTERVINIENTES-EN-EL-PROCESO-PENAL-REF-28-DE-AGOSTO-DE-2019.pdf` },



        { nombre: 'Ley para una Cultura de Paz y Prevención de la Violencia y la Delincuencia en Michoacán', url: `${MICH_BASE}/LEY-PARA-UNA-CULTURA-DE-PAZ-Y-PREVENCION-DE-LA-VIOLENCIA-Y-LA-DELINCUENCIA-REF-28-DE-AGOSTO-DE-2019.pdf` },



        { nombre: 'Ley por una Vida Libre de Violencia para las Mujeres en el Estado de Michoacán de Ocampo', url: `${MICH_BASE}/LXXVDECRETOLEGISLATIVO677.pdf` },



        { nombre: 'Ley que Cataloga y Prevee la Conservación, Uso de Monumentos, Zonas Históricas, Turísticas y Arqueológicas del Estado de Michoacán', url: `${MICH_BASE}/LEY_QUE_CATALOGA_Y_PREVEE_LA_CONSERVACION_USO_DE.pdf` },



        { nombre: 'Ley que Reglamenta la Aparcería Agrícola y Pecuaria en el Estado de Michoacán', url: `${MICH_BASE}/Ley-que-Reglamenta-la-Aparceria-Agricola-y-Pecuaria-en-el-Estado-de-Michoacan.pdf` },



        { nombre: 'Presupuesto de Egresos del Gobierno del Estado de Michoacán de Ocampo, para el Ejercicio Fiscal del Año 2025', url: `${MICH_BASE}/LXXVIDECRETOLEGISLTIVO114-Fe-de-erratas-2024-12-30.pdf` },



    ],



    codigos: [



        { nombre: 'Código Civil para el Estado de Michoacán de Ocampo', url: `${MICH_BASE}/LXXVDECRETOLEGISLATIVO462.pdf` },



        { nombre: 'Código Electoral del Estado de Michoacán de Ocampo.', url: `${MICH_BASE}/LXXVDECRETOLEGISLATIVO409.pdf` },



        { nombre: 'Código Familiar para el Estado de Michoacán de Ocampo.', url: `${MICH_BASE}/LXXVDECRETOLEGISLATIVO697.pdf` },



        { nombre: 'Código Fiscal Municipal del Estado de Michoacán de Ocampo.', url: `${MICH_BASE}/CODIGO-FISCAL-MUNICIPAL-DEL-ESTADO-REF-26-de-Octubre-de-2020.pdf` },



        { nombre: 'Código Fiscal del Estado de Michoacán de Ocampo.', url: `${MICH_BASE}/LXXVIDECRETOLEGISLATIVO-112.pdf` },



        { nombre: 'Código Penal para el Estado de Michoacán de Ocampo', url: `${MICH_BASE}/LXXVDECRETOLEGISLATIVO702.pdf` },



        { nombre: 'Código de Desarrollo Urbano del Estado de Michoacán de Ocampo', url: `${MICH_BASE}/LXXVDECRETOLEGISLATIVO687.pdf` },



        { nombre: 'Código de Justicia Administrativa del Estado de Michoacán de Ocampo.', url: `${MICH_BASE}/LXXVDECRETOLEGISLATIVO428.pdf` },



        { nombre: 'Código de Justicia Especializada para Adolescentes del Estado de Michoacán', url: `${MICH_BASE}/CODIGO-DE-JUSTICIA-ESPECIALIZADA-PARA-ADOLESCENTES-REF-28-AGOSTO-2019.pdf` },



        { nombre: 'Código de Procedimientos Civiles para el Estado de Michoacán de Ocampo.', url: `${MICH_BASE}/CODIGO-DE-PROCEDIMIENTOS-CIVILES-REF-30-DE-JUNIO-DE-2020.pdf` },



        { nombre: 'Código de Ética de la Auditoría Superior de Michoacán', url: `${MICH_BASE}/CODIGO-DE-ETICA-DE-LA-AUDITORIA-SUPERIOR.pdf` },



        { nombre: 'Declaratoria de Incorporación del Sistema Penal Acusatorio y de Inicio de Vigencia del Código Nacional de Procedimientos Penales en el Estado de Michoacán.', url: `${MICH_BASE}/DECLARATORIA-DE-INCORPORACION-DEL-SISTEMA-PENAL-ACUSATORIO-Y-DE-INICIO-DE-VIGENCIA-DEL-CODIGO-NACIONAL-DE-PROCEDIMIENTOS-PENALES-REF-31-JULIO-DE-2015.pdf` },



    ],



    reglamentos: [],



    otros: [],



};



// --- Morelos: FULL DATA --- PDFs hosted on Supabase -----

const MORELOS_BASE = 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/Morelos';

const MORELOS_LEYES: CategoriaLeyes = {
    constitucion: [
        { nombre: 'CONSTITUCION POLITICA DEL ESTADO LIBRE Y SOBERANO DE MORELOS, QUE REFORMA LA DEL AÑO DE 1888', url: `${MORELOS_BASE}/CONSTMOR.pdf` },
    ],
    leyes: [
        { nombre: 'DECRETO DE LA ERECCIÓN DEL ESTADO DE MORELOS', url: `${MORELOS_BASE}/DECERECCIONMORELOS.pdf` },
        { nombre: 'DECRETO SETECIENTOS CUARENTA Y NUEVE POR EL QUE SE EXPIDE LA LEY PARA LA CONSERVACIÓN Y PROTECCIÓN DEL ARBOLADO URBANO PARA EL ESTADO LIBRE Y SOBERANO DE MORELOS', url: `${MORELOS_BASE}/LCONSPROTARBOLADOMO.pdf` },
        { nombre: 'LEY DE ACCESO DE LAS MUJERES A UNA VIDA LIBRE DE VIOLENCIA PARA EL ESTADO DE MORELOS', url: `${MORELOS_BASE}/LMUJERVVEM.pdf` },
        { nombre: 'LEY DE AGRICULTURA FAMILIAR DEL ESTADO DE MORELOS', url: `${MORELOS_BASE}/LAGRAFAMI2023.pdf` },
        { nombre: 'LEY DE AMNISTÍA PARA EL ESTADO LIBRE Y SOBERANO DE MORELOS', url: `${MORELOS_BASE}/LEYAMNISTIAMO.pdf` },
        { nombre: 'LEY DE APOYO ALIMENTARIO PARA PERSONAS CON DISCAPACIDAD PERMANENTE TOTAL Y EN POBREZA EXTREMA DEL ESTADO DE MORELOS', url: `${MORELOS_BASE}/LALIMENTARIOMO.pdf` },
        { nombre: 'LEY DE ASISTENCIA SOCIAL Y CORRESPONSABILIDAD CIUDADANA PARA EL ESTADO DE MORELOS', url: `${MORELOS_BASE}/LCORRESPEM.pdf` },
        { nombre: 'LEY DE ASOCIACIONES PÚBLICO PRIVADAS PARA DEL ESTADO DE MORELOS Y SUS MUNICIPIOS', url: `${MORELOS_BASE}/LEYSOCIAPUBLIMUNI.pdf` },
        { nombre: 'LEY DE BENEFICIOS, ESTÍMULOS Y RECOMPENSAS A LAS PERSONAS VETERANAS DE LA REVOLUCIÓN EN EL ESTADO DE MORELOS', url: `${MORELOS_BASE}/LVETERANOEM.pdf` },
        { nombre: 'LEY DE BIOADITIVO Y FOMENTO PARA EL RECICLAJE DE ACEITES VEGETALES Y GRASAS ANIMALES RESIDUALES PARA EL ESTADO DE MORELOS', url: `${MORELOS_BASE}/LBIOADIEM.pdf` },
        { nombre: 'LEY DE BÚSQUEDA DE PERSONAS PARA EL ESTADO DE MORELOS', url: `${MORELOS_BASE}/LEYBUSPEREDOMOR23.pdf` },
        { nombre: 'LEY DE CATASTRO MUNICIPAL PARA EL ESTADO DE MORELOS', url: `${MORELOS_BASE}/LCATASTROEM.pdf` },
        { nombre: 'LEY DE CONTRATOS DE COLABORACIÓN PÚBLICO PRIVADA PARA EL ESTADO DE MORELOS', url: `${MORELOS_BASE}/LCONTRATOEM.pdf` },
        { nombre: 'LEY DE COORDINACIÓN HACENDARIA DEL ESTADO DE MORELOS', url: `${MORELOS_BASE}/LCOORDHACEM.pdf` },
        { nombre: 'LEY DE COORDINACIÓN PARA EL DESARROLLO METROPOLITANO DEL ESTADO DE MORELOS', url: `${MORELOS_BASE}/LDESMETROEM.pdf` },
        { nombre: 'LEY DE CULTURA CÍVICA DEL ESTADO DE MORELOS', url: `${MORELOS_BASE}/LCIVICAEM.pdf` },
        { nombre: 'LEY DE CULTURA Y DERECHOS CULTURALES PARA EL ESTADO DE MORELOS', url: `${MORELOS_BASE}/LEYCULTDERMO24.pdf` },
        { nombre: 'LEY DE DESARROLLO ECONÓMICO SUSTENTABLE DEL ESTADO LIBRE Y SOBERANO DE MORELOS', url: `${MORELOS_BASE}/LDESECONEM.pdf` },
        { nombre: 'LEY DE DESARROLLO FORESTAL SUSTENTABLE DEL ESTADO DE MORELOS', url: `${MORELOS_BASE}/LFORESTALEM.pdf` },
        { nombre: 'LEY DE DESARROLLO RURAL SUSTENTABLE DEL ESTADO DE MORELOS', url: `${MORELOS_BASE}/LRURALEMO.pdf` },
        { nombre: 'LEY DE DESARROLLO SOCIAL PARA EL ESTADO DE MORELOS', url: `${MORELOS_BASE}/LDSOCIALEM.pdf` },
        { nombre: 'LEY DE DESARROLLO, PROTECCIÓN E INTEGRACIÓN DE LAS PERSONAS ADULTAS MAYORES PARA EL ESTADO LIBRE Y SOBERANO DE MORELOS', url: `${MORELOS_BASE}/LADULTOSEM.pdf` },
        { nombre: 'LEY DE DEUDA PÚBLICA PARA EL ESTADO DE MORELOS', url: `${MORELOS_BASE}/LDEUDAMOR.pdf` },
        { nombre: 'LEY DE EDUCACIÓN DEL ESTADO DE MORELOS', url: `${MORELOS_BASE}/LEYEDUCACION2021.pdf` },
        { nombre: 'LEY DE ENTREGA RECEPCIÓN DE LA ADMINISTRACIÓN PÚBLICA PARA EL ESTADO DE MORELOS Y SUS MUNICIPIOS', url: `${MORELOS_BASE}/LENTREGAEM.pdf` },
        { nombre: 'LEY DE ESPACIOS CARDIOPROTEGIDOS PARA EL ESTADO DE MORELOS', url: `${MORELOS_BASE}/LCARDIOPROTEGIDOSMO.pdf` },
        { nombre: 'LEY DE EXPROPIACIÓN POR CAUSAS DE UTILIDAD PÚBLICA', url: `${MORELOS_BASE}/LEXPROPIAEM.pdf` },
        { nombre: 'LEY DE FILMACIONES DEL ESTADO DE MORELOS', url: `${MORELOS_BASE}/LFILMAEM.pdf` },
        { nombre: 'LEY DE FISCALIZACIÓN Y RENDICIÓN DE CUENTAS DEL ESTADO DE MORELOS', url: `${MORELOS_BASE}/LFISCACUENTAEMO.pdf` },
        { nombre: 'LEY DE FOMENTO A LAS ACTIVIDADES DE LAS ORGANIZACIONES DE LA SOCIEDAD CIVIL DEL ESTADO DE MORELOS', url: `${MORELOS_BASE}/LSOCIVILEM.pdf` },
        { nombre: 'LEY DE FOMENTO APÍCOLA Y PROTECCIÓN DEL PROCESO DE POLINIZACIÓN PARA EL ESTADO DE MORELOS', url: `${MORELOS_BASE}/LAPICOLAPROTPOLIMO.pdf` },
        { nombre: 'LEY DE FOMENTO DE LA CULTURA DEL CUIDADO DEL AGUA EN EL ESTADO DE MORELOS', url: `${MORELOS_BASE}/LFCAGUAEM.pdf` },
        { nombre: 'LEY DE FOMENTO Y DESARROLLO DE LOS DERECHOS Y CULTURA DE LAS COMUNIDADES Y PUEBLOS INDIGENAS DEL ESTADO DE MORELOS', url: `${MORELOS_BASE}/LINDIGENAEM.pdf` },
        { nombre: 'LEY DE FOMENTO Y PROTECCIÓN PECUARIA DEL ESTADO DE MORELOS', url: `${MORELOS_BASE}/LPECUARIAEM.pdf` },
        { nombre: 'LEY DE GUARDERÍAS Y ESTABLECIMIENTOS INFANTILES DEL ESTADO DE MORELOS', url: `${MORELOS_BASE}/LGEIEM.pdf` },
        { nombre: 'LEY DE IGUALDAD DE DERECHOS Y OPORTUNIDADES ENTRE MUJERES Y HOMBRES PARA EL ESTADO DE MORELOS', url: `${MORELOS_BASE}/LHOMYMUJEM.pdf` },
        { nombre: 'LEY DE INGRESOS DEL GOBIERNO DEL ESTADO DE MORELOS PARA EL EJERCICIO FISCAL DEL 1 DE ENERO AL 31 DE DICIEMBRE DE 2026', url: `${MORELOS_BASE}/LINGRESOSGOB26.pdf` },
        { nombre: 'LEY DE INNOVACIÓN, CIENCIA Y TECNOLOGÍA PARA EL ESTADO DE MORELOS', url: `${MORELOS_BASE}/LCIENCIAEM.pdf` },
        { nombre: 'LEY DE JUSTICIA ADMINISTRATIVA DEL ESTADO DE MORELOS', url: `${MORELOS_BASE}/LJUSTICIAADVMAEMO.pdf` },
        { nombre: 'LEY DE JUSTICIA ALTERNATIVA EN MATERIA PENAL PARA EL ESTADO DE MORELOS', url: `${MORELOS_BASE}/LJUSALTEREM.pdf` },
        { nombre: 'LEY DE JUSTICIA PARA ADOLESCENTES DEL ESTADO DE MORELOS', url: `${MORELOS_BASE}/LJUSADOLEM.pdf` },
        { nombre: 'LEY DE JÓVENES EMPRENDEDORES DEL ESTADO DE MORELOS', url: `${MORELOS_BASE}/LJOVENESEM.pdf` },
        { nombre: 'LEY DE LA COMISIÓN DE DERECHOS HUMANOS DEL ESTADO DE MORELOS', url: `${MORELOS_BASE}/LCDERHUMEM.pdf` },
        { nombre: 'LEY DE LA DEFENSORÍA PÚBLICA DEL ESTADO DE MORELOS', url: `${MORELOS_BASE}/LDEFENPUBEM.pdf` },
        { nombre: 'LEY DE LA DIVISIÓN TERRITORIAL DEL ESTADO DE MORELOS', url: `${MORELOS_BASE}/LDIVISIONEM.pdf` },
        { nombre: 'LEY DE LAS PERSONAS ADOLESCENTES Y JÓVENES EN EL ESTADO DE MORELOS', url: `${MORELOS_BASE}/LPERSONASMO.pdf` },
        { nombre: 'LEY DE LOS DERECHOS DE LAS NIÑAS, NIÑOS Y ADOLESCENTES DEL ESTADO DE MORELOS', url: `${MORELOS_BASE}/LDERECHOSNINOSMO.pdf` },
        { nombre: 'LEY DE MERCADOS DEL ESTADO DE MORELOS', url: `${MORELOS_BASE}/LMERCADOEM.pdf` },
        { nombre: 'LEY DE MOVILIDAD, TRANSPORTE Y SEGURIDAD VIAL DEL ESTADO DE MORELOS', url: `${MORELOS_BASE}/LMOVILIDADTSVEM.pdf` },
        { nombre: 'LEY DE NOMENCLATURA DE LOS BIENES DEL ESTADO DE MORELOS Y DE SUS MUNICIPIOS', url: `${MORELOS_BASE}/LNOMENEM.pdf` },
        { nombre: 'LEY DE OBRA PÚBLICA Y SERVICIOS RELACIONADOS CON LA MISMA DEL ESTADO DE MORELOS', url: `${MORELOS_BASE}/LOBRAPUBEM.pdf` },
        { nombre: 'LEY DE ORDENAMIENTO TERRITORIAL Y DESARROLLO URBANO SUSTENTABLE DEL ESTADO DE MORELOS', url: `${MORELOS_BASE}/LORDENAEM.pdf` },
        { nombre: 'LEY DE PARTICIPACIÓN CIUDADANA PARA EL ESTADO DE MORELOS', url: `${MORELOS_BASE}/LPARTCIUDADANA.pdf` },
        { nombre: 'LEY DE PLANEACIÓN PARA EL ESTADO DE MORELOS', url: `${MORELOS_BASE}/LPLANEACIONMO.pdf` },
        { nombre: 'LEY DE PREDIOS BALDÍOS DEL ESTADO DE MORELOS', url: `${MORELOS_BASE}/LPREDIOSEM.pdf` },
        { nombre: 'LEY DE PRESTACIONES DE SEGURIDAD SOCIAL DE LAS INSTITUCIONES POLICIALES Y DE PROCURACIÓN DE JUSTICIA DEL SISTEMA ESTATAL DE SEGURIDAD PÚBLICA', url: `${MORELOS_BASE}/LSEGSOCSPEM.pdf` },
        { nombre: 'LEY DE PRESTACIÓN DE SERVICIOS DE ATENCIÓN, CUIDADO Y DESARROLLO INTEGRAL INFANTIL DEL ESTADO DE MORELOS', url: `${MORELOS_BASE}/LPRESSERDIFMO.pdf` },
        { nombre: 'LEY DE PRESUPUESTO PARTICIPATIVO DEL ESTADO DE MORELOS', url: `${MORELOS_BASE}/LPRESUPARTICIMO.pdf` },
        { nombre: 'LEY DE PRESUPUESTO, CONTABILIDAD Y GASTO PÚBLICO DEL ESTADO DE MORELOS', url: `${MORELOS_BASE}/LPGASTOPEM.pdf` },
        { nombre: 'LEY DE PROCEDIMIENTO ADMINISTRATIVO PARA EL ESTADO DE MORELOS', url: `${MORELOS_BASE}/LPADMVOEM.pdf` },
        { nombre: 'LEY DE PROTECCIÓN A PERIODISTAS Y DEFENSORES DE DERECHOS HUMANOS DEL ESTADO DE MORELOS', url: `${MORELOS_BASE}/LPROTPERIODISTAS.pdf` },
        { nombre: 'LEY DE PROTECCIÓN DE DATOS PERSONALES EN POSESIÓN DE SUJETOS OBLIGADOS DEL ESTADO DE MORELOS', url: `${MORELOS_BASE}/LSUJETOSOBLIGADOSMO.pdf` },
        { nombre: 'LEY DE PROTECCIÓN Y CONSERVACIÓN DEL MAÍZ CRIOLLO EN SU ESTADO GENÉTICO PARA EL ESTADO DE MORELOS', url: `${MORELOS_BASE}/LMAIZCRIOEM.pdf` },
        { nombre: 'LEY DE PROTECCIÓN, APOYO Y PROMOCIÓN DE LA LACTANCIA MATERNA PARA EL ESTADO DE MORELOS', url: `${MORELOS_BASE}/LPROTAPROLACMAMO.pdf` },
        { nombre: 'LEY DE REINSERCIÓN SOCIAL Y SEGUIMIENTO DE MEDIDAS CAUTELARES', url: `${MORELOS_BASE}/LREINSEREM.pdf` },
        { nombre: 'LEY DE RESIDUOS SÓLIDOS Y DE ECONOMÍA CIRCULAR PARA EL ESTADO DE MORELOS', url: `${MORELOS_BASE}/LRESIDUOSEM.pdf` },
        { nombre: 'LEY DE RESPONSABILIDAD PATRIMONIAL DEL ESTADO DE MORELOS', url: `${MORELOS_BASE}/LRESPATEM.pdf` },
        { nombre: 'LEY DE RESPONSABILIDADES ADMINISTRATIVAS PARA EL ESTADO DE MORELOS', url: `${MORELOS_BASE}/LRESADMVASEMO.pdf` },
        { nombre: 'LEY DE SALUD DEL ESTADO DE MORELOS', url: `${MORELOS_BASE}/LSALUDEM.pdf` },
        { nombre: 'LEY DE SALUD MENTAL DEL ESTADO DE MORELOS', url: `${MORELOS_BASE}/LMENTALEM.pdf` },
        { nombre: 'LEY DE SEGURIDAD PRIVADA PARA EL ESTADO DE MORELOS', url: `${MORELOS_BASE}/LEYSEGURIPRIVADA.pdf` },
        { nombre: 'LEY DE SUJETOS PROTEGIDOS PARA EL ESTADO DE MORELOS', url: `${MORELOS_BASE}/LSUJETOSEM.pdf` },
        { nombre: 'LEY DE TRANSFORMACIÓN DIGITAL DEL ESTADO DE MORELOS', url: `${MORELOS_BASE}/LTDIGITALEM.pdf` },
        { nombre: 'LEY DE TRANSPARENCIA Y ACCESO A LA INFORMACIÓN PÚBLICA DEL ESTADO DE MORELOS', url: `${MORELOS_BASE}/LTRANSPARENCIAMO.pdf` },
        { nombre: 'LEY DE TRÁNSITO DEL ESTADO DE MORELOS', url: `${MORELOS_BASE}/LTRANSITOEM.pdf` },
        { nombre: 'LEY DE TURISMO PARA EL ESTADO DE MORELOS', url: `${MORELOS_BASE}/LEYTURISMOEM.pdf` },
        { nombre: 'LEY DE UNIFORMES GRATUITOS PARA LOS ESTUDIANTES DE EDUCACIÓN BÁSICA DEL ESTADO DE MORELOS', url: `${MORELOS_BASE}/LUNIFORMESEMO.pdf` },
        { nombre: 'LEY DE VIDEOVIGILANCIA PARA EL ESTADO DE MORELOS', url: `${MORELOS_BASE}/LVIDEOVIGILANCIAMO.pdf` },
        { nombre: 'LEY DE VIVIENDA DEL ESTADO LIBRE Y SOBERANO DE MORELOS', url: `${MORELOS_BASE}/LVIVIENDAEM.pdf` },
        { nombre: 'LEY DE VOLUNTAD ANTICIPADA EN MATERIA DE SALUD PARA LAS PERSONAS EN SITUACIÓN TERMINAL EN EL ESTADO DE MORELOS', url: `${MORELOS_BASE}/LVOLUNTADSALUD.pdf` },
        { nombre: 'LEY DE VÍCTIMAS DEL ESTADO DE MORELOS', url: `${MORELOS_BASE}/LREPARAEM.pdf` },
        { nombre: 'LEY DEL DEPORTE Y CULTURA FÍSICA DEL ESTADO DE MORELOS', url: `${MORELOS_BASE}/LDEPORTEM.pdf` },
        { nombre: 'LEY DEL EQUILIBRIO ECOLÓGICO Y LA PROTECCIÓN AL AMBIENTE DEL ESTADO DE MORELOS', url: `${MORELOS_BASE}/LEYECOAMBIENMOR.pdf` },
        { nombre: 'LEY DEL FONDO MORELOS', url: `${MORELOS_BASE}/LFONDOMOR.pdf` },
        { nombre: 'LEY DEL FONDO PARA EL DESARROLLO Y FORTALECIMIENTO MUNICIPAL DEL ESTADO DE MORELOS', url: `${MORELOS_BASE}/LFONDODESMO.pdf` },
        { nombre: 'LEY DEL INSTITUTO DE CAPACITACIÓN PARA EL TRABAJO DEL ESTADO DE MORELOS', url: `${MORELOS_BASE}/LICATMOREM.pdf` },
        { nombre: 'LEY DEL INSTITUTO DE CREDITO PARA LOS TRABAJADORES AL SERVICIO DEL GOBIERNO DEL ESTADO DE MORELOS', url: `${MORELOS_BASE}/LCREDITOEM.pdf` },
        { nombre: 'LEY DEL NOTARIADO DEL ESTADO DE MORELOS', url: `${MORELOS_BASE}/LNOTARIADOEMO.pdf` },
        { nombre: 'LEY DEL REGISTRO PÚBLICO DE LA PROPIEDAD Y DEL COMERCIO DEL ESTADO DE MORELOS', url: `${MORELOS_BASE}/LREGPUBPEM.pdf` },
        { nombre: 'LEY DEL SERVICIO CIVIL DEL ESTADO DE MORELOS', url: `${MORELOS_BASE}/LSERCIVILEM.pdf` },
        { nombre: 'LEY DEL SISTEMA ANTICORRUPCIÓN DEL ESTADO DE MORELOS', url: `${MORELOS_BASE}/LANTICORRUPCIONEMO.pdf` },
        { nombre: 'LEY DEL SISTEMA DE SEGURIDAD PÚBLICA DEL ESTADO DE MORELOS', url: `${MORELOS_BASE}/LEYSSPEM.pdf` },
        { nombre: 'LEY ESTATAL CONTRA LA DELICUENCIA ORGANIZADA PARA EL ESTADO DE MORELOS', url: `${MORELOS_BASE}/LDELINORGEM.pdf` },
        { nombre: 'LEY ESTATAL DE AGUA POTABLE', url: `${MORELOS_BASE}/LAGUAPOTEM.pdf` },
        { nombre: 'LEY ESTATAL DE APOYOS A JEFAS DE FAMILIA', url: `${MORELOS_BASE}/LJEFASFAMEM.pdf` },
        { nombre: 'LEY ESTATAL DE DOCUMENTACIÓN Y ARCHIVOS DE MORELOS', url: `${MORELOS_BASE}/LDOCARCHEM.pdf` },
        { nombre: 'LEY ESTATAL DE FAUNA', url: `${MORELOS_BASE}/LFAUNAEM.pdf` },
        { nombre: 'LEY ESTATAL DE PROTECCIÓN CIVIL DE MORELOS', url: `${MORELOS_BASE}/LPROTECIONCIVILMO.pdf` },
        { nombre: 'LEY ESTATAL DE RESPONSABILIDADES DE LOS SERVIDORES PÚBLICOS', url: `${MORELOS_BASE}/LSERVIDOREM.pdf` },
        { nombre: 'LEY ESTATAL PARA LA ASUNCIÓN DEL GOBIERNO DE LA FUNCIÓN DE SEGURIDAD PÚBLICA DE LOS MUNICIPIOS Y LAS POLICÍAS PREVENTIVAS MUNICIPALES Y DE TRÁNSITO MUNICIPAL', url: `${MORELOS_BASE}/LASUNCIONEM.pdf` },
        { nombre: 'LEY ESTATAL PARA LA CONVIVENCIA Y SEGURIDAD DE LA COMUNIDAD ESCOLAR', url: `${MORELOS_BASE}/LESCOLAREM.pdf` },
        { nombre: 'LEY GENERAL DE BIENES DEL ESTADO DE MORELOS', url: `${MORELOS_BASE}/LBIENESEM.pdf` },
        { nombre: 'LEY GENERAL DE HACIENDA DEL ESTADO DE MORELOS', url: `${MORELOS_BASE}/LGHEM.pdf` },
        { nombre: 'LEY GENERAL DE HACIENDA MUNICIPAL DEL ESTADO DE MORELOS', url: `${MORELOS_BASE}/LGHMPALEM.pdf` },
        { nombre: 'LEY ORGÁNICA DE LA ADMINISTRACIÓN PÚBLICA PARA EL ESTADO LIBRE Y SOBERANO DE MORELOS', url: `${MORELOS_BASE}/LORGADMPUBMO2024.pdf` },
        { nombre: 'LEY ORGÁNICA DE LA FISCALÍA GENERAL DEL ESTADO DE MORELOS', url: `${MORELOS_BASE}/LORGFISCMO.pdf` },
        { nombre: 'LEY ORGÁNICA DE LA UNIVERSIDAD AUTÓNOMA DEL ESTADO DE MORELOS', url: `${MORELOS_BASE}/LORGUAEMEM.pdf` },
        { nombre: 'LEY ORGÁNICA DE "EL COLEGIO DE MORELOS"', url: `${MORELOS_BASE}/LORGCOLMORELOS.pdf` },
        { nombre: 'LEY ORGÁNICA DEL CENTRO DE CONCILIACIÓN LABORAL DEL ESTADO DE MORELOS', url: `${MORELOS_BASE}/LORGACENTROLABORAL.pdf` },
        { nombre: 'LEY ORGÁNICA DEL INSTITUTO DE DESARROLLO Y FORTALECIMIENTO MUNICIPAL DEL ESTADO DE MORELOS', url: `${MORELOS_BASE}/LFORTAMUNEM.pdf` },
        { nombre: 'LEY ORGÁNICA DEL PODER JUDICIAL', url: `${MORELOS_BASE}/LPODERJUDEM.pdf` },
        { nombre: 'LEY ORGÁNICA DEL TRIBUNAL DE JUSTICIA ADMINISTRATIVA DEL ESTADO DE MORELOS', url: `${MORELOS_BASE}/LORGTJAEMO.pdf` },
        { nombre: 'LEY ORGÁNICA DEL TRIBUNAL UNITARIO DE JUSTICIA PENAL PARA ADOLESCENTES DEL ESTADO DE MORELOS', url: `${MORELOS_BASE}/LORGTJADOLESCENTES2021.pdf` },
        { nombre: 'LEY ORGÁNICA MUNICIPAL DEL ESTADO DE MORELOS', url: `${MORELOS_BASE}/LORGMPALMO.pdf` },
        { nombre: 'LEY ORGÁNICA PARA EL CONGRESO DEL ESTADO DE MORELOS', url: `${MORELOS_BASE}/LCONGRESOEM.pdf` },
        { nombre: 'LEY PARA EL IMPULSO DE LA CULTURA DE LA LEGALIDAD DEL ESTADO DE MORELOS', url: `${MORELOS_BASE}/LEGALIDADEM.pdf` },
        { nombre: 'LEY PARA LA ADMINISTRACIÓN DE BIENES ASEGURADOS DE LA FISCALÍA GENERAL DEL ESTADO DE MORELOS', url: `${MORELOS_BASE}/LBIENASEGEM.pdf` },
        { nombre: 'LEY PARA LA ATENCIÓN DE LAS PERSONAS CON LA CONDICIÓN DEL ESPECTRO AUTISTA DEL ESTADO DE MORELOS', url: `${MORELOS_BASE}/LESPAUTISTA.pdf` },
        { nombre: 'LEY PARA LA DECLARACIÓN ESPECIAL DE AUSENCIA DE PERSONAS DESAPARECIDAS EN EL ESTADO DE MORELOS', url: `${MORELOS_BASE}/LAUSENCIAPERSONAS.pdf` },
        { nombre: 'LEY PARA LA INCLUSIÓN AL DESARROLLO DE LAS PERSONAS CON DISCAPACIDAD DEL ESTADO DE MORELOS', url: `${MORELOS_BASE}/LEYINCLUPERDISCAMO.pdf` },
        { nombre: 'LEY PARA LA PREVENCIÓN Y COMBATE AL ABUSO DE BEBIDAS ALCOHOLICAS Y DE REGULACIÓN PARA SU VENTA Y CONSUMO EN EL ESTADO DE MORELOS', url: `${MORELOS_BASE}/LALCOHOLEM.pdf` },
        { nombre: 'LEY PARA LA PREVENCIÓN Y CONTROL DEL DENGUE, ZIKA Y CHIKUNGUNYA EN EL ESTADO DE MORELOS', url: `${MORELOS_BASE}/LEYDENGUEDOMO.pdf` },
        { nombre: 'LEY PARA LA PREVENCIÓN Y TRATAMIENTO CONTRA LA OBESIDAD Y SOBREPESO', url: `${MORELOS_BASE}/LTRASALIMEM.pdf` },
        { nombre: 'LEY PARA LA PREVENCIÓN, PROTECCIÓN, ATENCIÓN Y ASISTENCIA A LAS VÍCTIMAS DE LOS DELITOS EN MATERIA DE TRATA DE PERSONAS DEL ESTADO DE MORELOS', url: `${MORELOS_BASE}/LEYTRATAPERSONASVICTIMAS.pdf` },
        { nombre: 'LEY PARA LA PROTECCIÓN DE LA INTEGRIDAD Y DERECHOS DE LAS Y LOS TRABAJADORES DE LA EDUCACIÓN EN EL ESTADO DE MORELOS', url: `${MORELOS_BASE}/LPROTEDUMOR.pdf` },
        { nombre: 'LEY PARA LA PROTECCIÓN FRENTE AL CONSUMO DE TABACO EN EL ESTADO DE MORELOS', url: `${MORELOS_BASE}/LHUMOTABEM.pdf` },
        { nombre: 'LEY PARA PREVENIR Y ELIMINAR LA DISCRIMINACIÓN EN EL ESTADO DE MORELOS', url: `${MORELOS_BASE}/LPDISCRIMINAMO.pdf` },
        { nombre: 'LEY PARA PREVENIR Y SANCIONAR LA TORTURA EN EL ESTADO DE MORELOS', url: `${MORELOS_BASE}/LTORTURAEM.pdf` },
        { nombre: 'LEY PARA PREVENIR, ATENDER, SANCIONAR Y ERRADICAR LA VIOLENCIA FAMILIAR EN EL ESTADO DE MORELOS', url: `${MORELOS_BASE}/LVIOLENCEM.pdf` },
        { nombre: 'LEY PARA REGULAR EL USO DE LA FUERZA POR PARTE DE LOS ELEMENTOS DE LAS INSTITUCIONES POLICIALES DEL SISTEMA DE SEGURIDAD PÚBLICA DEL ESTADO DE MORELOS', url: `${MORELOS_BASE}/LRFIPEM.pdf` },
        { nombre: 'LEY QUE CREA EL CENTRO MORELENSE DE LAS ARTES DEL ESTADO DE MORELOS', url: `${MORELOS_BASE}/LCMARTESEM.pdf` },
        { nombre: 'LEY QUE CREA EL ORGANISMO DESCENTRALIZADO DENOMINADO "HOSPITAL DEL NIÑO MORELENSE"', url: `${MORELOS_BASE}/LNINOEM.pdf` },
        { nombre: 'LEY QUE CREA LA COMISIÓN ESTATAL DEL AGUA COMO ORGANISMO PÚBLICO DESCENTRALIZADO DEL PODER EJECUTIVO DEL ESTADO DE MORELOS', url: `${MORELOS_BASE}/LCREACEAEM.pdf` },
        { nombre: 'LEY QUE REGULA EL FONDO AUXILIAR PARA LA ADMINISTRACIÓN DE JUSTICIA DEL ESTADO DE MORELOS', url: `${MORELOS_BASE}/LFONDOAUXEM.pdf` },
        { nombre: 'LEY QUE REGULA EL FUNCIONAMIENTO Y OPERACIÓN DE LOS DESGUACES Y RECICLADORAS DE MATERIALES DERIVADOS DE VEHÍCULOS EN EL ESTADO DE MORELOS', url: `${MORELOS_BASE}/LDESGUACESMO.pdf` },
        { nombre: 'LEY QUE REGULA EL USO DE CUBREBOCAS Y DEMÁS MEDIDAS PARA PREVENIR LA TRANSMISIÓN DE LA ENFERMEDAD POR COVID-19 EN EL ESTADO DE MORELOS', url: `${MORELOS_BASE}/LEYCUBREBOCASEDOMO.pdf` },
        { nombre: 'LEY QUE REGULA EL USO DE TECNOLOGÍAS DE LA INFORMACIÓN Y COMUNICACIÓN PARA LA SEGURIDAD PÚBLICA DEL ESTADO DE MORELOS', url: `${MORELOS_BASE}/LEYTECNOLOGIASMO.pdf` },
        { nombre: 'LEY QUE REGULA LA OPERACIÓN DE LAS COOPERATIVAS ESCOLARES EN ESCUELAS DE NIVEL BÁSICO EN EL ESTADO DE MORELOS', url: `${MORELOS_BASE}/LCOOPERAEM.pdf` },
        { nombre: 'LEY SOBRE ADQUISICIONES, ENAJENACIONES, ARRENDAMIENTOS Y PRESTACIÓN DE SERVICIOS DEL PODER EJECUTIVO DEL ESTADO LIBRE Y SOBERANO DE MORELOS', url: `${MORELOS_BASE}/LENAJENAEM.pdf` },
        { nombre: 'LEY SOBRE EL EJERCICIO DE LAS PROFESIONES EN EL ESTADO DE MORELOS', url: `${MORELOS_BASE}/LEJERPROFEM.pdf` },
        { nombre: 'LEY SOBRE EL REGIMEN DE CONDOMINIO DE INMUEBLES PARA EL ESTADO DE MORELOS', url: `${MORELOS_BASE}/LREGIMENEM.pdf` },
    ],
    codigos: [
        { nombre: 'CÓDIGO CIVIL PARA EL ESTADO LIBRE Y SOBERANO DE MORELOS', url: `${MORELOS_BASE}/CCIVILEM2023.pdf` },
        { nombre: 'CÓDIGO DE INSTITUCIONES Y PROCEDIMIENTOS ELECTORALES PARA EL ESTADO DE MORELOS', url: `${MORELOS_BASE}/CIELECTORMO23.pdf` },
        { nombre: 'CÓDIGO FAMILIAR PARA EL ESTADO LIBRE Y SOBERANO DE MORELOS', url: `${MORELOS_BASE}/CFAMILIAREM.pdf` },
        { nombre: 'CÓDIGO FISCAL PARA EL ESTADO DE MORELOS', url: `${MORELOS_BASE}/CFISCALEMO.pdf` },
        { nombre: 'CÓDIGO PENAL PARA EL ESTADO DE MORELOS', url: `${MORELOS_BASE}/CPENALEM.pdf` },
        { nombre: 'CÓDIGO PROCESAL CIVIL PARA EL ESTADO LIBRE Y SOBERANO DE MORELOS', url: `${MORELOS_BASE}/CPROCIVILEM.pdf` },
        { nombre: 'CÓDIGO PROCESAL FAMILIAR PARA EL ESTADO LIBRE Y SOBERANO DE MORELOS', url: `${MORELOS_BASE}/CPROFAMEM.pdf` },
    ],
    reglamentos: [],
    otros: [],
};


// ─── All 32 States ────────────────────────────────────────────
export const FEDERAL_LEYES: CategoriaLeyes = {
    constitucion: [
        { nombre: 'LEY Federal de los Trabajadores al Servicio del Estado, Reglamentaria del Apartado B) del Artículo 123 Constitucional', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/Federal/LFTSE.pdf' },
        { nombre: 'LEY Reglamentaria de la Fracción V del Artículo 76 de la Constitución General de la República', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/Federal/202.pdf' },
        { nombre: 'LEY Reglamentaria de la fracción VI del artículo 76 de la Constitución Política de los Estados Unidos Mexicanos', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/Federal/CPEUM.pdf' },
        { nombre: 'LEY Reglamentaria de la Fracción XIII Bis del Apartado B, del Artículo 123 de la Constitución Política de los Estados Unidos Mexicanos', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/Federal/CPEUM.pdf' },
        { nombre: 'LEY Reglamentaria de las Fracciones I y II del Artículo 105 de la Constitución Política de los Estados Unidos Mexicanos', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/Federal/CPEUM.pdf' },
        { nombre: 'LEY Reglamentaria del Artículo 27 Constitucional en Materia Nuclear', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/Federal/207.pdf' },
    ],
    leyes: [
        { nombre: 'Ley Agraria', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/Federal/LAgra.pdf' },
        { nombre: 'Ley de Amparo', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/Federal/LAmp.pdf' },
        { nombre: 'Ley de Aviación Civil', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/Federal/LAC.pdf' },
        { nombre: 'LEY de Carrera Judicial del Poder Judicial de la Federación', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/Federal/LCJPJF.pdf' },
        { nombre: 'LEY de Concursos Mercantiles', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/Federal/LCM.pdf' },
        { nombre: 'LEY de Cooperación Internacional para el Desarrollo', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/Federal/LCID_061120.pdf' },
        { nombre: 'LEY de Disciplina del Ejército, Fuerza Aérea y Guardia Nacional', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/Federal/LDEFAGN.pdf' },
        { nombre: 'LEY de Expropiación', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/Federal/35.pdf' },
        { nombre: 'LEY de Instituciones de Crédito', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/Federal/LIC.pdf' },
        { nombre: 'LEY de Instituciones de Seguros y de Fianzas', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/Federal/LISF.pdf' },
        { nombre: 'LEY de los Derechos de las Personas Adultas Mayores', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/Federal/LDPAM.pdf' },
        { nombre: 'LEY de Vivienda', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/Federal/LViv.pdf' },
        { nombre: 'Ley del Banco de México', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/Federal/74.pdf' },
        { nombre: 'LEY DEL IMPUESTO AL VALOR AGREGADO', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/Federal/LIVA.pdf' },
        { nombre: 'LEY del Impuesto sobre la Renta', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/Federal/LISR.pdf' },
        { nombre: 'LEY del Instituto de Seguridad y Servicios Sociales de los Trabajadores del Estado', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/Federal/LISSSTE.pdf' },
        { nombre: 'LEY del Instituto del Fondo Nacional de la Vivienda para los Trabajadores', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/Federal/LIFNVT.pdf' },
        { nombre: 'LEY del Seguro Social', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/Federal/LSS.pdf' },
        { nombre: 'Ley Federal contra la Delincuencia Organizada', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/Federal/LFCDO.pdf' },
        { nombre: 'Ley Federal de Armas de Fuego y Explosivos', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/Federal/LFAFE.pdf' },
        { nombre: 'Ley Federal de Procedimiento Administrativo', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/Federal/LFPA.pdf' },
        { nombre: 'LEY Federal de Procedimiento Contencioso Administrativo', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/Federal/LFPCA.pdf' },
        { nombre: 'LEY Federal de Protección a la Propiedad Industrial', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/Federal/LFPPI.pdf' },
        { nombre: 'LEY Federal de Protección al Consumidor', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/Federal/LFPC.pdf' },
        { nombre: 'LEY Federal de Protección de Datos Personales en Posesión de los Particulares', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/Federal/LFPDPPP.pdf' },
        { nombre: 'Ley Federal de Protección del Patrimonio Cultural de los Pueblos y Comunidades Indígenas y Afromexicanas', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/Federal/LFPPCPCIA.pdf' },
        { nombre: 'LEY Federal de Remuneraciones de los Servidores Públicos', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/Federal/LFRemSP_190521.pdf' },
        { nombre: 'LEY Federal de Responsabilidad Patrimonial del Estado', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/Federal/LFRPE.pdf' },
        { nombre: 'LEY Federal de Responsabilidades de los Servidores Públicos', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/Federal/LFRSP.pdf' },
        { nombre: 'LEY Federal de Revocación de Mandato', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/Federal/LFRM.pdf' },
        { nombre: 'LEY Federal del Derecho de Autor', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/Federal/LFDA.pdf' },
        { nombre: 'LEY Federal del Impuesto sobre Automóviles Nuevos', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/Federal/LFISAN.pdf' },
        { nombre: 'LEY Federal del Trabajo', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/Federal/LFT.pdf' },
        { nombre: 'LEY Federal para la Prevención e Identificación de Operaciones con Recursos de Procedencia Ilícita', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/Federal/LFPIORPI.pdf' },
        { nombre: 'ley Federal para la Protección a Personas que Intervienen en el Procedimiento Penal', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/Federal/LFPPIPP_200521.pdf' },
        { nombre: 'LEY General de Asentamientos Humanos, Ordenamiento Territorial y Desarrollo Urbano', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/Federal/LGAHOTDU.pdf' },
        { nombre: 'LEY General de Bienes Nacionales', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/Federal/LGBN.pdf' },
        { nombre: 'LEY General de Educación Superior', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/Federal/LGE.pdf' },
        { nombre: 'LEY General de Educación', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/Federal/LGE.pdf' },
        { nombre: 'LEY General de los Derechos de Niñas, Niños y Adolescentes', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/Federal/LGDNNA.pdf' },
        { nombre: 'LEY General de Partidos Políticos', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/Federal/LGPP.pdf' },
        { nombre: 'LEY General de Responsabilidades Administrativas', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/Federal/LGRA.pdf' },
        { nombre: 'LEY General de Salud', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/Federal/LGS.pdf' },
        { nombre: 'LEY General de Sociedades Mercantiles', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/Federal/LGSM.pdf' },
        { nombre: 'LEY GENERAL DE TITULOS Y OPERACIONES DE CREDITO', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/Federal/LGTOC.pdf' },
        { nombre: 'LEY General del Equilibrio Ecológico y la Protección al Ambiente', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/Federal/LGEEPA.pdf' },
        { nombre: 'LEY Nacional de Extinción de Dominio', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/Federal/LNED.pdf' },
        { nombre: 'LEY Nacional para Eliminar Trámites Burocráticos', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/Federal/LNETB.pdf' },
        { nombre: 'LEY Nacional sobre el Uso de la Fuerza', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/Federal/LNUF.pdf' },
        { nombre: 'LEY Orgánica de la Administración Pública Federal', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/Federal/LOAPF.pdf' },
        { nombre: 'LEY Orgánica de la Armada de México', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/Federal/LOAM.pdf' },
        { nombre: 'LEY Orgánica de la Procuraduría de la Defensa del Contribuyente', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/Federal/LOPDC.pdf' },
        { nombre: 'LEY Orgánica de los Tribunales Agrarios', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/Federal/159.pdf' },
        { nombre: 'LEY Orgánica de Sociedad Hipotecaria Federal', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/Federal/LOSHF.pdf' },
        { nombre: 'LEY Orgánica del Congreso General de los Estados Unidos Mexicanos', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/Federal/LOCGEUM.pdf' },
        { nombre: 'LEY Orgánica del Poder Judicial de la Federación', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/Federal/LOPJF.pdf' },
        { nombre: 'LEY Orgánica del Tribunal Federal de Justicia Administrativa', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/Federal/LOTFJA.pdf' },
        { nombre: 'LEY Sobre el Contrato de Seguro', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/Federal/211.pdf' },
    ],
    codigos: [
        { nombre: 'CODIGO NACIONAL DE PROCEDIMIENTOS PENALES', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/Federal/CNPP.pdf' },
        { nombre: 'Código Civil Federal', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/Federal/CCF.pdf' },
        { nombre: 'CÓDIGO de Comercio', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/Federal/CCom.pdf' },
        { nombre: 'Código Federal de Procedimientos Civiles', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/Federal/CFPC.pdf' },
        { nombre: 'Código Fiscal de la Federación', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/Federal/CFF.pdf' },
        { nombre: 'CÓDIGO Nacional de Procedimientos Civiles y Familiares', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/Federal/CNPCF.pdf' },
        { nombre: 'Código Penal Federal', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/Federal/CPF.pdf' },
    ],
    reglamentos: [
    ],
    otros: [
        { nombre: 'General para Prevenir, Sancionar y Erradicar los Delitos en Materia de Trata de Personas y para la Protección y Asistencia a las Víctimas de estos Delitos', url: 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/Federal/LGPSEDMTP.pdf' },
    ]
};


export const ESTADOS: Estado[] = [
    { slug: 'aguascalientes', nombre: 'Aguascalientes', nombreCorto: 'Aguascalientes', abreviatura: 'AGS', region: 'centro', leyesCount: 0, leyes: LEYES_PLACEHOLDER },
    { slug: 'baja-california', nombre: 'Baja California', nombreCorto: 'Baja California', abreviatura: 'BC', region: 'norte', leyesCount: 0, leyes: LEYES_PLACEHOLDER },
    { slug: 'baja-california-sur', nombre: 'Baja California Sur', nombreCorto: 'Baja California Sur', abreviatura: 'BCS', region: 'norte', leyesCount: 0, leyes: LEYES_PLACEHOLDER },
    { slug: 'campeche', nombre: 'Campeche', nombreCorto: 'Campeche', abreviatura: 'CAMP', region: 'sur', leyesCount: 0, leyes: LEYES_PLACEHOLDER },
    { slug: 'chiapas', nombre: 'Chiapas', nombreCorto: 'Chiapas', abreviatura: 'CHIS', region: 'sur', leyesCount: 0, leyes: LEYES_PLACEHOLDER },
    { slug: 'chihuahua', nombre: 'Chihuahua', nombreCorto: 'Chihuahua', abreviatura: 'CHIH', region: 'norte', leyesCount: 0, leyes: LEYES_PLACEHOLDER },
    { slug: 'cdmx', nombre: 'Ciudad de México', nombreCorto: 'CDMX', abreviatura: 'CDMX', region: 'centro', leyesCount: 139, ultimaActualizacion: '2026-02-15', leyes: CDMX_LEYES },
    { slug: 'coahuila', nombre: 'Coahuila', nombreCorto: 'Coahuila', abreviatura: 'COAH', region: 'norte', leyesCount: 0, leyes: LEYES_PLACEHOLDER },
    { slug: 'colima', nombre: 'Colima', nombreCorto: 'Colima', abreviatura: 'COL', region: 'occidente', leyesCount: 0, leyes: LEYES_PLACEHOLDER },
    { slug: 'durango', nombre: 'Durango', nombreCorto: 'Durango', abreviatura: 'DGO', region: 'norte', leyesCount: 0, leyes: LEYES_PLACEHOLDER },
    { slug: 'guanajuato', nombre: 'Guanajuato', nombreCorto: 'Guanajuato', abreviatura: 'GTO', region: 'centro', leyesCount: 119, ultimaActualizacion: '2026-03-01', leyes: GUANAJUATO_LEYES },
    { slug: 'guerrero', nombre: 'Guerrero', nombreCorto: 'Guerrero', abreviatura: 'GRO', region: 'sur', leyesCount: 241, ultimaActualizacion: '2026-03-10', leyes: GUERRERO_LEYES },
    { slug: 'hidalgo', nombre: 'Hidalgo', nombreCorto: 'Hidalgo', abreviatura: 'HGO', region: 'centro', leyesCount: 0, leyes: LEYES_PLACEHOLDER },
    { slug: 'jalisco', nombre: 'Jalisco', nombreCorto: 'Jalisco', abreviatura: 'JAL', region: 'occidente', leyesCount: 185, ultimaActualizacion: '2026-03-10', leyes: JALISCO_LEYES },
    { slug: 'estado-de-mexico', nombre: 'Estado de México', nombreCorto: 'Estado de México', abreviatura: 'MEX', region: 'centro', leyesCount: 252, ultimaActualizacion: '2026-03-10', leyes: EDOMEX_LEYES },
    { slug: 'michoacan', nombre: 'Michoacán', nombreCorto: 'Michoacán', abreviatura: 'MICH', region: 'occidente', leyesCount: 152, ultimaActualizacion: '2026-03-11', leyes: MICHOACAN_LEYES },
    { slug: 'morelos', nombre: 'Morelos', nombreCorto: 'Morelos', abreviatura: 'MOR', region: 'centro', leyesCount: 149, ultimaActualizacion: '2026-03-16', leyes: MORELOS_LEYES },
    { slug: 'nayarit', nombre: 'Nayarit', nombreCorto: 'Nayarit', abreviatura: 'NAY', region: 'occidente', leyesCount: 0, leyes: LEYES_PLACEHOLDER },
    { slug: 'nuevo-leon', nombre: 'Nuevo León', nombreCorto: 'Nuevo León', abreviatura: 'NL', region: 'norte', leyesCount: 233, ultimaActualizacion: '2026-03-10', leyes: NL_LEYES },
    { slug: 'oaxaca', nombre: 'Oaxaca', nombreCorto: 'Oaxaca', abreviatura: 'OAX', region: 'sur', leyesCount: 0, leyes: LEYES_PLACEHOLDER },
    { slug: 'puebla', nombre: 'Puebla', nombreCorto: 'Puebla', abreviatura: 'PUE', region: 'centro', leyesCount: 128, ultimaActualizacion: '2026-03-10', leyes: PUEBLA_LEYES },
    { slug: 'queretaro', nombre: 'Querétaro', nombreCorto: 'Querétaro', abreviatura: 'QRO', region: 'centro', leyesCount: 138, ultimaActualizacion: '2026-02-14', leyes: QUERETARO_LEYES },
    { slug: 'quintana-roo', nombre: 'Quintana Roo', nombreCorto: 'Quintana Roo', abreviatura: 'QROO', region: 'sur', leyesCount: 0, leyes: LEYES_PLACEHOLDER },
    { slug: 'san-luis-potosi', nombre: 'San Luis Potosí', nombreCorto: 'San Luis Potosí', abreviatura: 'SLP', region: 'centro', leyesCount: 0, leyes: LEYES_PLACEHOLDER },
    { slug: 'sinaloa', nombre: 'Sinaloa', nombreCorto: 'Sinaloa', abreviatura: 'SIN', region: 'norte', leyesCount: 0, leyes: LEYES_PLACEHOLDER },
    { slug: 'sonora', nombre: 'Sonora', nombreCorto: 'Sonora', abreviatura: 'SON', region: 'norte', leyesCount: 0, leyes: LEYES_PLACEHOLDER },
    { slug: 'tabasco', nombre: 'Tabasco', nombreCorto: 'Tabasco', abreviatura: 'TAB', region: 'sur', leyesCount: 0, leyes: LEYES_PLACEHOLDER },
    { slug: 'tamaulipas', nombre: 'Tamaulipas', nombreCorto: 'Tamaulipas', abreviatura: 'TAMPS', region: 'norte', leyesCount: 0, leyes: LEYES_PLACEHOLDER },
    { slug: 'tlaxcala', nombre: 'Tlaxcala', nombreCorto: 'Tlaxcala', abreviatura: 'TLAX', region: 'centro', leyesCount: 0, leyes: LEYES_PLACEHOLDER },
    { slug: 'veracruz', nombre: 'Veracruz', nombreCorto: 'Veracruz', abreviatura: 'VER', region: 'oriente', leyesCount: 342, ultimaActualizacion: '2026-03-11', leyes: VER_LEYES },
    { slug: 'yucatan', nombre: 'Yucatán', nombreCorto: 'Yucatán', abreviatura: 'YUC', region: 'sur', leyesCount: 0, leyes: LEYES_PLACEHOLDER },
    { slug: 'zacatecas', nombre: 'Zacatecas', nombreCorto: 'Zacatecas', abreviatura: 'ZAC', region: 'norte', leyesCount: 0, leyes: LEYES_PLACEHOLDER },
];

// ─── Helpers ──────────────────────────────────────────────────
export function getEstadoBySlug(slug: string): Estado | undefined {
    if (slug === 'federal') return { slug: 'federal', nombre: 'Legislación Federal y Nacional', nombreCorto: 'Federal', abreviatura: 'FED', region: 'centro', leyesCount: 72, ultimaActualizacion: '2026-03-03', leyes: FEDERAL_LEYES };
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

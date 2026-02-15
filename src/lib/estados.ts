// Shared list of Mexican states for jurisdiction selector
// Used by StateSelectorModal, chat page, and anywhere else that needs state lists

export interface EstadoOption {
    value: string;
    label: string;
    icon: string;
}

export const ESTADOS_MEXICO: EstadoOption[] = [
    { value: '', label: 'Todos los estados', icon: '🇲🇽' },
    { value: 'AGUASCALIENTES', label: 'Aguascalientes', icon: '🏛️' },
    { value: 'BAJA_CALIFORNIA', label: 'Baja California', icon: '🏛️' },
    { value: 'BAJA_CALIFORNIA_SUR', label: 'Baja California Sur', icon: '🏛️' },
    { value: 'CAMPECHE', label: 'Campeche', icon: '🏛️' },
    { value: 'CHIAPAS', label: 'Chiapas', icon: '🏛️' },
    { value: 'CHIHUAHUA', label: 'Chihuahua', icon: '🏛️' },
    { value: 'CIUDAD_DE_MEXICO', label: 'Ciudad de México', icon: '🏛️' },
    { value: 'COAHUILA', label: 'Coahuila', icon: '🏛️' },
    { value: 'COLIMA', label: 'Colima', icon: '🏛️' },
    { value: 'DURANGO', label: 'Durango', icon: '🏛️' },
    { value: 'GUANAJUATO', label: 'Guanajuato', icon: '🏛️' },
    { value: 'GUERRERO', label: 'Guerrero', icon: '🏛️' },
    { value: 'HIDALGO', label: 'Hidalgo', icon: '🏛️' },
    { value: 'JALISCO', label: 'Jalisco', icon: '🏛️' },
    { value: 'MEXICO', label: 'Estado de México', icon: '🏛️' },
    { value: 'MICHOACAN', label: 'Michoacán', icon: '🏛️' },
    { value: 'MORELOS', label: 'Morelos', icon: '🏛️' },
    { value: 'NAYARIT', label: 'Nayarit', icon: '🏛️' },
    { value: 'NUEVO_LEON', label: 'Nuevo León', icon: '🏛️' },
    { value: 'OAXACA', label: 'Oaxaca', icon: '🏛️' },
    { value: 'PUEBLA', label: 'Puebla', icon: '🏛️' },
    { value: 'QUERETARO', label: 'Querétaro', icon: '🏛️' },
    { value: 'QUINTANA_ROO', label: 'Quintana Roo', icon: '🏛️' },
    { value: 'SAN_LUIS_POTOSI', label: 'San Luis Potosí', icon: '🏛️' },
    { value: 'SINALOA', label: 'Sinaloa', icon: '🏛️' },
    { value: 'SONORA', label: 'Sonora', icon: '🏛️' },
    { value: 'TABASCO', label: 'Tabasco', icon: '🏛️' },
    { value: 'TAMAULIPAS', label: 'Tamaulipas', icon: '🏛️' },
    { value: 'TLAXCALA', label: 'Tlaxcala', icon: '🏛️' },
    { value: 'VERACRUZ', label: 'Veracruz', icon: '🏛️' },
    { value: 'YUCATAN', label: 'Yucatán', icon: '🏛️' },
    { value: 'ZACATECAS', label: 'Zacatecas', icon: '🏛️' },
];

// Only actual states (excludes "Todos los estados" option)
export const ESTADOS_SOLO = ESTADOS_MEXICO.filter(e => e.value !== '');

// Helper to get label from value
export function getEstadoLabel(value: string): string {
    return ESTADOS_MEXICO.find(e => e.value === value)?.label || 'Todos los estados';
}

'use client';

import { useState, useCallback } from 'react';
import { MapPin, Check, Scale, AlertTriangle } from 'lucide-react';
import { ESTADOS_SOLO, getEstadoLabel } from '@/lib/estados';
import { updateUserEstado } from '@/lib/supabase';

interface StateSelectorModalProps {
    userId: string;
    onSelectEstado: (estado: string) => void;
    onClose?: () => void;
    isConfig?: boolean;
    currentEstado?: string;
}

export default function StateSelectorModal({ userId, onSelectEstado, onClose, isConfig = false, currentEstado }: StateSelectorModalProps) {
    const [selected, setSelected] = useState<string>(currentEstado || '');
    const [saving, setSaving] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const filteredEstados = ESTADOS_SOLO.filter(e =>
        e.label.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleConfirm = useCallback(async () => {
        if (!selected) return;
        setSaving(true);
        try {
            await updateUserEstado(userId, selected);
            onSelectEstado(selected);
        } catch (err) {
            console.error('Error saving estado:', err);
            setSaving(false);
        }
    }, [selected, userId, onSelectEstado]);

    return (
        <div className="state-selector-overlay" onClick={isConfig ? onClose : undefined}>
            <div className="state-selector-modal" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="state-selector-header">
                    <div className="state-selector-icon-wrapper">
                        {isConfig ? <AlertTriangle className="state-selector-icon" /> : <Scale className="state-selector-icon" />}
                    </div>
                    <h2 className="state-selector-title">
                        {isConfig ? 'Cambiar estado predeterminado' : '¡Bienvenido a Iurexia!'}
                    </h2>
                    <p className="state-selector-subtitle">
                        {isConfig ? (
                            <>
                                Al cambiar tu estado, <strong>todas tus consultas futuras</strong>
                                <br />
                                se filtrarán por la nueva jurisdicción seleccionada
                            </>
                        ) : (
                            <>
                                Selecciona tu estado para personalizar
                                <br />
                                tus consultas legales
                            </>
                        )}
                    </p>
                    {isConfig && (
                        <p className="state-selector-config-warning">
                            ⚠️ Puedes consultar leyes de otros estados mencionándolos en tu pregunta
                        </p>
                    )}
                </div>

                {/* Search */}
                <div className="state-selector-search-wrapper">
                    <MapPin className="state-selector-search-icon" />
                    <input
                        type="text"
                        placeholder="Buscar estado..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="state-selector-search-input"
                    />
                </div>

                {/* Grid */}
                <div className="state-selector-grid">
                    {filteredEstados.map((estado) => (
                        <button
                            key={estado.value}
                            onClick={() => setSelected(estado.value)}
                            className={`state-selector-item ${selected === estado.value ? 'state-selector-item-selected' : ''}`}
                        >
                            <span className="state-selector-item-label">{estado.label}</span>
                            {selected === estado.value && (
                                <Check className="state-selector-item-check" />
                            )}
                        </button>
                    ))}
                </div>

                {/* Footer */}
                <div className="state-selector-footer">
                    <p className="state-selector-note">
                        {isConfig
                            ? 'Este cambio se aplicará a todas tus consultas futuras'
                            : 'Podrás cambiar de estado o consultar otras legislaciones en cualquier momento'
                        }
                    </p>
                    <div className="state-selector-buttons">
                        {isConfig && onClose && (
                            <button onClick={onClose} className="state-selector-cancel">
                                Cancelar
                            </button>
                        )}
                        <button
                            onClick={handleConfirm}
                            disabled={!selected || saving || (isConfig && selected === currentEstado)}
                            className="state-selector-confirm"
                        >
                            {saving ? (
                                <span className="state-selector-confirm-loading">
                                    Guardando...
                                </span>
                            ) : (
                                <>
                                    <MapPin className="w-5 h-5" />
                                    <span>
                                        {selected ? `Continuar con ${getEstadoLabel(selected)}` : 'Selecciona un estado'}
                                    </span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

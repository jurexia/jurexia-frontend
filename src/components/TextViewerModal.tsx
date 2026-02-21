'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
    X, BookOpen, ChevronRight, ChevronDown, List,
    Loader2, ExternalLink, Search, ArrowUp
} from 'lucide-react';
import { getFullDocument, FullDocumentResponse } from '@/lib/api';

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

interface TextViewerModalProps {
    origen: string;
    highlightChunkId?: string;
    onClose: () => void;
}

interface TocEntry {
    level: number;        // 1, 2, 3
    title: string;
    id: string;           // anchor id
    children: TocEntry[];
}

interface ParsedSection {
    id: string;
    level: number;
    title: string;
    content: string;      // raw text content after the heading
}

// ═══════════════════════════════════════════════════════════════════
// TEXT PARSER — Converts markdown-style text to structured sections
// ═══════════════════════════════════════════════════════════════════

function parseDocument(text: string): ParsedSection[] {
    const lines = text.split('\n');
    const sections: ParsedSection[] = [];
    let currentSection: ParsedSection | null = null;
    let contentLines: string[] = [];
    let sectionIndex = 0;

    const flushSection = () => {
        if (currentSection) {
            currentSection.content = contentLines.join('\n').trim();
            sections.push(currentSection);
            contentLines = [];
        }
    };

    for (const line of lines) {
        const h1Match = line.match(/^# (.+)$/);
        const h2Match = line.match(/^## (.+)$/);
        const h3Match = line.match(/^### (.+)$/);

        if (h1Match || h2Match || h3Match) {
            flushSection();
            const level = h1Match ? 1 : h2Match ? 2 : 3;
            const title = (h1Match?.[1] || h2Match?.[1] || h3Match?.[1] || '').trim();
            const id = `section-${sectionIndex++}`;
            currentSection = { id, level, title, content: '' };
        } else {
            contentLines.push(line);
        }
    }
    flushSection();

    // If no sections found, treat entire text as one section
    if (sections.length === 0 && text.trim()) {
        sections.push({
            id: 'section-0',
            level: 1,
            title: '',
            content: text.trim(),
        });
    }

    return sections;
}

function buildToc(sections: ParsedSection[]): TocEntry[] {
    const toc: TocEntry[] = [];
    const stack: TocEntry[] = [];

    for (const section of sections) {
        if (!section.title) continue;

        const entry: TocEntry = {
            level: section.level,
            title: section.title,
            id: section.id,
            children: [],
        };

        while (stack.length > 0 && stack[stack.length - 1].level >= section.level) {
            stack.pop();
        }

        if (stack.length === 0) {
            toc.push(entry);
        } else {
            stack[stack.length - 1].children.push(entry);
        }

        stack.push(entry);
    }

    return toc;
}

// ═══════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════

function TocItem({
    entry,
    activeId,
    onNavigate,
    depth = 0,
}: {
    entry: TocEntry;
    activeId: string;
    onNavigate: (id: string) => void;
    depth?: number;
}) {
    const [expanded, setExpanded] = useState(depth < 2);
    const isActive = activeId === entry.id;
    const hasChildren = entry.children.length > 0;

    // Truncate long titles
    const displayTitle = entry.title.length > 50
        ? entry.title.substring(0, 47) + '...'
        : entry.title;

    return (
        <div>
            <button
                onClick={() => {
                    onNavigate(entry.id);
                    if (hasChildren) setExpanded(!expanded);
                }}
                className={`w-full text-left flex items-start gap-1.5 py-1.5 px-2 rounded-lg text-xs transition-all duration-200 group ${isActive
                    ? 'bg-accent-brown/15 text-accent-brown font-medium'
                    : 'text-charcoal-600 hover:bg-cream-200 hover:text-charcoal-800'
                    }`}
                style={{ paddingLeft: `${depth * 12 + 8}px` }}
                title={entry.title}
            >
                {hasChildren ? (
                    expanded ? (
                        <ChevronDown className="w-3 h-3 mt-0.5 flex-shrink-0 opacity-50" />
                    ) : (
                        <ChevronRight className="w-3 h-3 mt-0.5 flex-shrink-0 opacity-50" />
                    )
                ) : (
                    <span className="w-3 flex-shrink-0" />
                )}
                <span className="leading-snug">{displayTitle}</span>
            </button>
            {expanded && hasChildren && (
                <div>
                    {entry.children.map((child) => (
                        <TocItem
                            key={child.id}
                            entry={child}
                            activeId={activeId}
                            onNavigate={onNavigate}
                            depth={depth + 1}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════

export default function TextViewerModal({
    origen,
    highlightChunkId,
    onClose,
}: TextViewerModalProps) {
    const [document, setDocument] = useState<FullDocumentResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeSection, setActiveSection] = useState('');
    const [showToc, setShowToc] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showSearch, setShowSearch] = useState(false);
    const [showScrollTop, setShowScrollTop] = useState(false);
    const contentRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Fetch document
    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(null);

        getFullDocument(origen, highlightChunkId)
            .then((doc) => {
                if (!cancelled) {
                    // If external URL, redirect immediately
                    if (doc.external_url) {
                        window.open(doc.external_url, '_blank');
                        onClose();
                        return;
                    }
                    setDocument(doc);
                }
            })
            .catch((err) => {
                if (!cancelled) setError(err.message);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => { cancelled = true; };
    }, [origen, highlightChunkId, onClose]);

    // Parse document into sections
    const sections = useMemo(() => {
        if (!document?.texto_completo) return [];
        return parseDocument(document.texto_completo);
    }, [document]);

    const toc = useMemo(() => buildToc(sections), [sections]);

    // Scroll to highlighted chunk on load
    useEffect(() => {
        if (document?.highlight_chunk_index != null && contentRef.current) {
            // The highlighted chunk's text is embedded in the content.
            // Use a small delay to ensure content is rendered
            setTimeout(() => {
                const highlight = contentRef.current?.querySelector('[data-highlight="true"]');
                if (highlight) {
                    highlight.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 300);
        }
    }, [document, sections]);

    // Track scroll position for active section and scroll-to-top button
    useEffect(() => {
        const container = contentRef.current;
        if (!container) return;

        const handleScroll = () => {
            setShowScrollTop(container.scrollTop > 500);

            // Find active section by scroll position
            const sectionElements = Array.from(container.querySelectorAll('[data-section-id]'));
            let current = '';
            for (const el of sectionElements) {
                const rect = el.getBoundingClientRect();
                const containerRect = container.getBoundingClientRect();
                if (rect.top - containerRect.top < 120) {
                    current = el.getAttribute('data-section-id') || '';
                }
            }
            if (current) setActiveSection(current);
        };

        container.addEventListener('scroll', handleScroll);
        return () => container.removeEventListener('scroll', handleScroll);
    }, [sections]);

    // Navigate to section
    const navigateToSection = useCallback((id: string) => {
        const el = contentRef.current?.querySelector(`[data-section-id="${id}"]`);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            setActiveSection(id);
        }
    }, []);

    // Search filtering
    const searchResults = useMemo(() => {
        if (!searchQuery || searchQuery.length < 3) return null;
        const query = searchQuery.toLowerCase();
        return sections.filter(
            (s) =>
                s.title.toLowerCase().includes(query) ||
                s.content.toLowerCase().includes(query)
        );
    }, [searchQuery, sections]);

    // Close on Escape
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'f' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                setShowSearch(true);
                setTimeout(() => searchInputRef.current?.focus(), 100);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    // ── Render helpers ──

    const renderSectionContent = (section: ParsedSection, isHighlighted: boolean) => {
        const paragraphs = section.content.split(/\n\n+/);

        return (
            <div
                key={section.id}
                data-section-id={section.id}
                data-highlight={isHighlighted ? 'true' : undefined}
                className={`mb-6 ${isHighlighted ? 'relative' : ''}`}
            >
                {isHighlighted && (
                    <div className="absolute -left-4 top-0 bottom-0 w-1 bg-accent-gold rounded-full" />
                )}
                <div className={isHighlighted
                    ? 'bg-accent-gold/8 border border-accent-gold/20 rounded-xl px-5 py-4 -mx-1'
                    : ''
                }>
                    {section.title && (
                        <>
                            {section.level === 1 && (
                                <h2 className="font-serif text-xl font-bold text-charcoal-900 mt-8 mb-3 tracking-tight">
                                    {section.title}
                                </h2>
                            )}
                            {section.level === 2 && (
                                <h3 className="font-serif text-lg font-semibold text-charcoal-800 mt-6 mb-2">
                                    {section.title}
                                </h3>
                            )}
                            {section.level === 3 && (
                                <h4 className="font-serif text-base font-semibold text-charcoal-700 mt-4 mb-2">
                                    {section.title}
                                </h4>
                            )}
                        </>
                    )}
                    {paragraphs.map((para, i) => {
                        const trimmed = para.trim();
                        if (!trimmed) return null;

                        // Detect Roman numeral or letter list items
                        const isListItem = /^[IVXLCDM]+\.\s|^[A-Z]\.\s|^[a-z]\)\s/.test(trimmed);

                        return (
                            <p
                                key={i}
                                className={`text-sm leading-relaxed text-charcoal-700 mb-3 ${isListItem ? 'pl-6 -indent-2' : ''
                                    }`}
                            >
                                {trimmed}
                            </p>
                        );
                    })}
                    {isHighlighted && (
                        <div className="flex items-center gap-1.5 mt-2 text-xs text-accent-gold font-medium">
                            <Search className="w-3 h-3" />
                            Fragmento citado en tu búsqueda
                        </div>
                    )}
                </div>
            </div>
        );
    };

    // Determine which sections to highlight (fuzzy: chunk index maps to sections)
    const highlightedSectionIds = useMemo(() => {
        if (document?.highlight_chunk_index == null || sections.length === 0) return new Set<string>();
        // Simple heuristic: map chunk_index to section index
        const idx = Math.min(document.highlight_chunk_index, sections.length - 1);
        return new Set([sections[idx].id]);
    }, [document, sections]);

    // ── LOADING STATE ──
    if (loading) {
        return (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
                <div className="bg-cream-100 rounded-2xl shadow-2xl p-8 flex flex-col items-center gap-4">
                    <Loader2 className="w-10 h-10 animate-spin text-accent-brown" />
                    <p className="text-charcoal-600 text-sm font-medium">Reconstruyendo documento...</p>
                    <p className="text-charcoal-400 text-xs">{origen}</p>
                </div>
            </div>
        );
    }

    // ── ERROR STATE ──
    if (error || !document) {
        return (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
                <div className="bg-cream-100 rounded-2xl shadow-2xl p-8 max-w-md text-center">
                    <p className="text-red-600 font-medium mb-2">Error al cargar documento</p>
                    <p className="text-charcoal-500 text-sm mb-4">{error}</p>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-charcoal-800 text-white rounded-lg hover:bg-charcoal-700 transition-colors text-sm"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 bg-black/60 backdrop-blur-sm">
            <div className="bg-cream-50 rounded-2xl shadow-2xl w-full max-w-7xl h-[95vh] flex flex-col overflow-hidden">
                {/* ── HEADER ── */}
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-cream-300 flex-shrink-0 bg-cream-100">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-9 h-9 rounded-xl bg-accent-brown/10 flex items-center justify-center flex-shrink-0">
                            <BookOpen className="w-5 h-5 text-accent-brown" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <h2 className="font-serif text-base font-semibold text-charcoal-900 truncate">
                                {document.titulo}
                            </h2>
                            <div className="flex items-center gap-2 text-xs text-charcoal-500">
                                {document.tipo && (
                                    <span className="px-1.5 py-0.5 bg-accent-brown/10 rounded text-accent-brown font-medium capitalize">
                                        {document.tipo.replace('_', ' ')}
                                    </span>
                                )}
                                <span>{document.total_chunks} fragmentos</span>
                                {document.metadata?.instrumento && (
                                    <span>· {document.metadata.instrumento}</span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                        {/* Search toggle */}
                        <button
                            onClick={() => {
                                setShowSearch(!showSearch);
                                if (!showSearch) setTimeout(() => searchInputRef.current?.focus(), 100);
                            }}
                            className={`p-2 rounded-lg transition-colors ${showSearch
                                ? 'bg-accent-brown/10 text-accent-brown'
                                : 'text-charcoal-500 hover:text-charcoal-700 hover:bg-cream-200'
                                }`}
                            title="Buscar (Ctrl+F)"
                        >
                            <Search className="w-4 h-4" />
                        </button>

                        {/* TOC toggle */}
                        <button
                            onClick={() => setShowToc(!showToc)}
                            className={`p-2 rounded-lg transition-colors ${showToc
                                ? 'bg-accent-brown/10 text-accent-brown'
                                : 'text-charcoal-500 hover:text-charcoal-700 hover:bg-cream-200'
                                }`}
                            title="Índice"
                        >
                            <List className="w-4 h-4" />
                        </button>

                        {/* PDF source link */}
                        {document.source_doc_url && (
                            <a
                                href={document.source_doc_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-accent-brown text-white rounded-lg hover:bg-accent-gold transition-colors"
                            >
                                <ExternalLink className="w-3.5 h-3.5" />
                                PDF
                            </a>
                        )}

                        <button
                            onClick={onClose}
                            className="p-2 text-charcoal-500 hover:text-charcoal-800 hover:bg-cream-200 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* ── SEARCH BAR ── */}
                {showSearch && (
                    <div className="px-5 py-2.5 border-b border-cream-200 bg-cream-100/50">
                        <div className="relative max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-400" />
                            <input
                                ref={searchInputRef}
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Buscar en el documento..."
                                className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-cream-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-brown/30 focus:border-accent-brown text-charcoal-800 placeholder:text-charcoal-400"
                            />
                            {searchResults && (
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-charcoal-400">
                                    {searchResults.length} resultados
                                </span>
                            )}
                        </div>
                    </div>
                )}

                {/* ── BODY: TOC + CONTENT ── */}
                <div className="flex flex-1 overflow-hidden">
                    {/* Sidebar TOC */}
                    {showToc && toc.length > 0 && (
                        <div className="w-64 flex-shrink-0 border-r border-cream-200 bg-cream-100/50 overflow-y-auto hidden md:block">
                            <div className="p-3">
                                <h3 className="text-xs font-semibold text-charcoal-500 uppercase tracking-wider mb-2 px-2">
                                    Índice
                                </h3>
                                <nav className="space-y-0.5">
                                    {toc.map((entry) => (
                                        <TocItem
                                            key={entry.id}
                                            entry={entry}
                                            activeId={activeSection}
                                            onNavigate={navigateToSection}
                                        />
                                    ))}
                                </nav>
                            </div>
                        </div>
                    )}

                    {/* Main content */}
                    <div
                        ref={contentRef}
                        className="flex-1 overflow-y-auto scroll-smooth"
                    >
                        <div className="max-w-3xl mx-auto px-8 py-6">
                            {/* Document title header */}
                            <div className="mb-8 pb-6 border-b border-cream-300">
                                <h1 className="font-serif text-2xl font-bold text-charcoal-900 mb-2 leading-tight">
                                    {document.titulo}
                                </h1>
                                {document.metadata?.caso && (
                                    <p className="text-sm text-charcoal-500">
                                        {document.metadata.caso}
                                        {document.metadata.vs && ` Vs. ${document.metadata.vs}`}
                                        {document.metadata.serie_c && ` · Serie C No. ${document.metadata.serie_c}`}
                                    </p>
                                )}
                                {document.metadata?.cuadernillo_tema && (
                                    <p className="text-sm text-charcoal-500">
                                        Cuadernillo No. {document.metadata.cuadernillo_num} · {document.metadata.cuadernillo_tema}
                                    </p>
                                )}
                            </div>

                            {/* Render search results or full document */}
                            {searchResults ? (
                                <div>
                                    <p className="text-xs text-charcoal-400 mb-4">
                                        Mostrando {searchResults.length} secciones que coinciden con &ldquo;{searchQuery}&rdquo;
                                    </p>
                                    {searchResults.map((section) =>
                                        renderSectionContent(section, highlightedSectionIds.has(section.id))
                                    )}
                                </div>
                            ) : (
                                sections.map((section) =>
                                    renderSectionContent(section, highlightedSectionIds.has(section.id))
                                )
                            )}

                            {/* Bottom spacer */}
                            <div className="h-24" />
                        </div>
                    </div>
                </div>

                {/* Scroll to top FAB */}
                {showScrollTop && (
                    <button
                        onClick={() => contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
                        className="absolute bottom-6 right-6 p-3 bg-accent-brown text-white rounded-full shadow-lg hover:bg-accent-gold transition-all duration-200 hover:scale-105"
                        title="Volver arriba"
                    >
                        <ArrowUp className="w-4 h-4" />
                    </button>
                )}
            </div>
        </div>
    );
}

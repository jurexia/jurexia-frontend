'use client';

import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { ReactNode } from 'react';

interface AnimatedSectionProps {
    children: ReactNode;
    animation?: 'fade-in' | 'slide-up' | 'scale-in' | 'slide-in-left' | 'slide-in-right';
    delay?: number;
    className?: string;
}

export function AnimatedSection({
    children,
    animation = 'slide-up',
    delay = 0,
    className = ''
}: AnimatedSectionProps) {
    const { ref, isVisible } = useScrollAnimation();

    const delayClass = delay > 0 ? `delay-${delay}` : '';
    const animationClass = isVisible ? animation : '';

    return (
        <div
            ref={ref}
            className={`animate-on-scroll ${animationClass} ${delayClass} ${className}`}
        >
            {children}
        </div>
    );
}

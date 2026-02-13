'use client';

import { useState, useEffect, useRef } from 'react';

export function useScrollAnimation(threshold = 0.15) {
    const ref = useRef<HTMLDivElement>(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    observer.unobserve(el);
                }
            },
            { threshold }
        );

        observer.observe(el);
        return () => observer.disconnect();
    }, [threshold]);

    return { ref, isVisible };
}

export function AnimateOnScroll({
    children,
    delay = 0,
    direction = 'up',
    className = '',
}: {
    children: React.ReactNode;
    delay?: number;
    direction?: 'up' | 'left' | 'right' | 'scale';
    className?: string;
}) {
    const { ref, isVisible } = useScrollAnimation(0.1);

    const transforms: Record<string, string> = {
        up: 'translateY(40px)',
        left: 'translateX(-40px)',
        right: 'translateX(40px)',
        scale: 'scale(0.95)',
    };

    return (
        <div
            ref={ref}
            className={className}
            style={{
                opacity: isVisible ? 1 : 0,
                transform: isVisible ? 'none' : transforms[direction],
                transition: `opacity 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}s, transform 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}s`,
            }}
        >
            {children}
        </div>
    );
}

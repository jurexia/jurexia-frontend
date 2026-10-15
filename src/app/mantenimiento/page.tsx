import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Iurexia · En actualización',
    robots: { index: false, follow: false },
}

// La pantalla del modo mantenimiento (ver src/middleware.ts).
export default function Mantenimiento() {
    return (
        <main className="min-h-screen flex items-center justify-center bg-white px-6">
            <div className="max-w-md text-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo-iurexia.png" alt="Iurexia" className="mx-auto mb-8 h-14 w-auto" />
                <p className="text-lg leading-relaxed text-neutral-800">
                    Te pedimos una disculpa, estamos en proceso de actualización, los servicios de
                    Iurexia volverán a habilitarse a la brevedad posible.
                </p>
            </div>
        </main>
    )
}

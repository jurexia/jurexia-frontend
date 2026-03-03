import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Sálvame Legal | Iurexia - Asesoría Temprana",
    description: "Obtén orientación legal y los siguientes pasos recomendados para tu caso al instante con nuestra IA entrenada en leyes mexicanas.",
};

export default function SalvameLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}

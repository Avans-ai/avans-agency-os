import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Avans Agency OS", template: "%s · Avans OS" },
  description: "El sistema operativo interno de Avans para captación, estrategia, producción y control.",
  applicationName: "Avans Agency OS",
  icons: { icon: "/icon.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}

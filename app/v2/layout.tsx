import type { Metadata } from "next";
import { Figtree } from "next/font/google";
import "./design-tokens.css";
import "./theme-overrides.css";
import "./depth-theme.css";

const figtree = Figtree({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-figtree",
});

export const metadata: Metadata = {
  title: { absolute: "Avans OS" },
  description: "Sistema operativo interno de Avans para centralizar clientes, operaciones, ventas, finanzas, RRHH y gerencia.",
  applicationName: "Avans OS",
};

export default function V2Layout({ children }: { children: React.ReactNode }) {
  return <div className={figtree.className}>{children}</div>;
}

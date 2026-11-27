/* Diseño de marca · componentes visuales renderizados con los tokens CSS del cliente
 * (variables --b-*). No usan imágenes externas: son HTML y SVG generados en la app. */
import { BrandArt } from "./design-art";
import type { BrandTokens } from "./design-system-model";
import d from "./design-workspace.module.css";

export function ComponentPreview({ kind, t, name }: { kind: string; t: BrandTokens; name: string }) {
  switch (kind) {
    case "Botón": return <div className={d.cmpRow}><span className={d.cmpBtn}>Pedí asistencia</span><span className={d.cmpBtnLine}>Ver beneficios</span><span className={d.cmpBtnText}>Más info →</span></div>;
    case "Tarjeta": return <div className={d.cmpCard}><div className={d.cmpCardImg}><BrandArt art="rec-duotono" t={t} label="" /></div><div className={d.cmpCardBody}><small>Turismo</small><strong>20 % en hoteles de ruta</strong><span className={d.cmpBtn}>Usar beneficio</span></div></div>;
    case "Placa": return <div className={d.cmpPlate}><strong>24 h</strong><span>Asistencia en todo el país</span></div>;
    case "Carrusel": return <div className={d.cmpCarousel}>{["¿Cómo pido auxilio?", "1 · Abrí la app", "2 · Compartí tu ubicación"].map((text, i) => <div key={i} data-i={i}><span>{text}</span><em>{i + 1}/3</em></div>)}</div>;
    case "Composición": return <div className={d.cmpComposition}><div><BrandArt art="rec-estilo" t={t} label="" /></div><div><strong>Viajá tranquilo</strong><p>Una idea por bloque, aire generoso y una sola acción.</p></div></div>;
    case "Plantilla": return <div className={d.cmpStory}><div className={d.cmpSafe}>Zona segura</div><strong>Historia</strong><span>9:16</span><div className={d.cmpSafe}>Zona segura</div></div>;
    case "Recurso para redes": return <div className={d.cmpSocial}>{["Beneficios", "Viajes", "Ayuda"].map((label, i) => <span key={label}><i data-i={i} />{label}</span>)}</div>;
    case "Banner": return <div className={d.cmpBanner}><strong>Asistencia 24 h</strong><span className={d.cmpBtnInverse}>Más info</span></div>;
    case "Aplicación comercial": return <div className={d.cmpFlyer}><div><small>Beneficio de socio</small><strong>15 % en estaciones adheridas</strong></div><div className={d.cmpQr} aria-hidden="true">{Array.from({ length: 16 }, (_, i) => <i key={i} data-on={(i * 7) % 3 !== 0} />)}</div></div>;
    default: return <div className={d.cmpPlate}><strong>{name}</strong><span>Componente reutilizable</span></div>;
  }
}

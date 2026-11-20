/* Diseño de marca · visuales generados en la app (SVG), sin imágenes de internet.
 * Se dibujan con los tokens del cliente (paleta y tipografías del Design System).
 * Para los datos de demostración representan un monograma genérico «ACA DEMO»:
 * no reproducen ninguna marca real. */
import type { ReactNode } from "react";
import { readableInk, type BrandTokens } from "./design-system-model";

type ArtProps = { art: string; t: BrandTokens; label: string; title?: string; variant?: number };

function Mono({ x, y, s, bg, fg, accent }: { x: number; y: number; s: number; bg: string; fg: string; accent: string }) {
  return <g>
    <rect x={x} y={y} width={s} height={s} fill={bg} />
    <path d={`M${x + 0.22 * s} ${y + 0.72 * s}L${x + 0.5 * s} ${y + 0.2 * s}L${x + 0.78 * s} ${y + 0.72 * s}`} stroke={fg} strokeWidth={0.1 * s} fill="none" strokeLinejoin="miter" />
    <path d={`M${x + 0.12 * s} ${y + 0.88 * s}Q${x + 0.5 * s} ${y + 0.6 * s} ${x + 0.88 * s} ${y + 0.88 * s}`} stroke={accent} strokeWidth={0.07 * s} fill="none" />
  </g>;
}

function Wordmark({ x, y, size, color, tag, anchor = "start", font, weight }: { x: number; y: number; size: number; color: string; tag: string; anchor?: "start" | "middle"; font: string; weight: number }) {
  return <g fontFamily={font} textAnchor={anchor}>
    <text x={x} y={y} fontSize={size} fontWeight={weight} fill={color} letterSpacing={size * 0.04}>ACA</text>
    <text x={anchor === "middle" ? x : x + 2} y={y + size * 0.62} fontSize={size * 0.32} fontWeight={600} fill={tag} letterSpacing={size * 0.14}>DEMO</text>
  </g>;
}

function lines(text: string, max = 14, count = 3) {
  const words = text.split(/\s+/).filter(Boolean);
  const out: string[] = [];
  for (const word of words) {
    const last = out[out.length - 1];
    if (last && `${last} ${word}`.length <= max) out[out.length - 1] = `${last} ${word}`;
    else out.push(word);
  }
  return out.slice(0, count).map((line, i, all) => i === count - 1 && words.join(" ").length > all.join(" ").length ? `${line.slice(0, max - 1)}…` : line);
}

function Headline({ x, y, text, size, color, font, weight, max = 14, count = 3 }: { x: number; y: number; text: string; size: number; color: string; font: string; weight: number; max?: number; count?: number }) {
  return <text x={x} y={y} fontFamily={font} fontSize={size} fontWeight={weight} fill={color}>{lines(text, max, count).map((line, i) => <tspan key={i} x={x} dy={i ? size * 1.08 : 0}>{line}</tspan>)}</text>;
}

const rand = (seed: number) => { const x = Math.sin(seed * 99.13) * 43758.5453; return x - Math.floor(x); };

function Svg({ w, h, label, children, bg }: { w: number; h: number; label: string; children: ReactNode; bg?: string }) {
  return <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label={label} preserveAspectRatio="xMidYMid meet" style={{ width: "100%", height: "100%", display: "block" }}>
    {bg ? <rect width={w} height={h} fill={bg} /> : null}{children}
  </svg>;
}

function logo(art: string, t: BrandTokens, label: string) {
  const H = { font: t.heading, weight: t.headingWeight };
  const principal = (fg = t.primary, tag = t.secondary, accent = t.secondary, monoFg = readableInk(t.primary)) => <g>
    <Mono x={16} y={20} s={60} bg={fg} fg={monoFg} accent={accent} />
    <Wordmark x={90} y={58} size={34} color={fg} tag={tag} {...H} />
  </g>;
  switch (art) {
    case "logo-secundario": return <Svg w={160} h={160} label={label} bg={t.paper}><Mono x={50} y={18} s={60} bg={t.primary} fg={readableInk(t.primary)} accent={t.secondary} /><Wordmark x={80} y={114} size={30} color={t.primary} tag={t.secondary} anchor="middle" {...H} /></Svg>;
    case "logo-isotipo": return <Svg w={100} h={100} label={label} bg={t.paper}><Mono x={18} y={18} s={64} bg={t.primary} fg={readableInk(t.primary)} accent={t.secondary} /></Svg>;
    case "logo-mono": return <Svg w={240} h={100} label={label} bg="#ffffff">{principal(t.ink, t.ink, "#ffffff", "#ffffff")}</Svg>;
    case "logo-negativo": return <Svg w={240} h={100} label={label} bg={t.primary}>{principal(readableInk(t.primary), t.secondary, t.secondary, t.primary)}</Svg>;
    case "logo-mal-deformado": return <Svg w={240} h={100} label={label} bg={t.paper}><g transform="translate(-6 24) scale(1.12 0.56)">{principal()}</g></Svg>;
    case "logo-mal-color": return <Svg w={240} h={100} label={label} bg={t.paper}>{principal("#7b3fd0", "#d0c83f", "#3fd0c0")}</Svg>;
    case "logo-mal-rotado": return <Svg w={240} h={100} label={label} bg={t.paper}><g transform="rotate(-14 120 50)">{principal()}</g></Svg>;
    case "logo-mal-contraste": return <Svg w={240} h={100} label={label} bg={t.accent}>{principal(t.paper, t.paper, t.paper, t.accent)}</Svg>;
    default: return <Svg w={240} h={100} label={label} bg={t.paper}>{principal()}</Svg>;
  }
}

function icons(t: BrandTokens, color: string) {
  const s = { stroke: color, strokeWidth: 2.4, fill: "none" } as const;
  return [
    <g key="grua" {...s}><rect x={4} y={14} width={18} height={9} /><path d="M22 23V12l6-6M28 6v8" /><circle cx={9} cy={25} r={2.5} /><circle cx={19} cy={25} r={2.5} /></g>,
    <g key="bateria" {...s}><rect x={5} y={9} width={22} height={15} /><path d="M10 9V6M22 9V6M11 16h4M13 14v4M19 16h4" /></g>,
    <g key="llave" {...s}><circle cx={11} cy={16} r={6} /><path d="M17 16h11M24 16v4M28 16v3" /></g>,
    <g key="combustible" {...s}><rect x={6} y={6} width={13} height={20} /><path d="M9 11h7M19 12l5 3v8a2 2 0 0 0 4 0V12l-3-3" /></g>,
    <g key="rueda" {...s}><circle cx={16} cy={16} r={11} /><circle cx={16} cy={16} r={4} /></g>,
    <g key="ubicacion" {...s}><path d="M16 28s9-8 9-14a9 9 0 0 0-18 0c0 6 9 14 9 14z" /><circle cx={16} cy={14} r={3} fill={t.secondary} stroke="none" /></g>,
  ];
}

function landscape(w: number, h: number, t: BrandTokens, id: string, road = false) {
  return <g>
    <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={t.secondary} /><stop offset="1" stopColor={t.primary} /></linearGradient></defs>
    <rect width={w} height={h} fill={`url(#${id})`} />
    <circle cx={w * 0.7} cy={h * 0.36} r={h * 0.12} fill={t.paper} opacity={0.85} />
    <path d={`M0 ${h * 0.68}L${w * 0.22} ${h * 0.5}L${w * 0.4} ${h * 0.64}L${w * 0.62} ${h * 0.44}L${w} ${h * 0.66}V${h}H0Z`} fill={t.primary} opacity={0.75} />
    <path d={`M0 ${h * 0.82}Q${w * 0.5} ${h * 0.62} ${w} ${h * 0.84}V${h}H0Z`} fill={t.ink} opacity={0.55} />
    {road ? <><path d={`M${w * 0.44} ${h}L${w * 0.5} ${h * 0.66}L${w * 0.56} ${h}Z`} fill={t.ink} /><path d={`M${w * 0.5} ${h * 0.7}V${h}`} stroke={t.secondary} strokeWidth={2} strokeDasharray="6 6" /></> : null}
  </g>;
}

function resource(art: string, t: BrandTokens, label: string) {
  const W = 240, H = 150;
  switch (art) {
    case "rec-iconos": return <Svg w={W} h={H} label={label} bg={t.paper}>{icons(t, t.ink).map((icon, i) => <g key={i} transform={`translate(${24 + (i % 3) * 72} ${18 + Math.floor(i / 3) * 62}) scale(1.4)`}>{icon}</g>)}</Svg>;
    case "rec-patron": return <Svg w={W} h={H} label={label} bg={t.paper}>{Array.from({ length: 9 }, (_, i) => <path key={i} d={`M${-40 + i * 34} ${H}Q${i * 34} ${H * 0.2} ${40 + i * 34} 0`} stroke={i % 3 === 0 ? t.secondary : t.primary} strokeWidth={i % 3 === 0 ? 5 : 2} fill="none" />)}</Svg>;
    case "rec-textura": return <Svg w={W} h={H} label={label} bg={t.primary}>{Array.from({ length: 420 }, (_, i) => <rect key={i} x={rand(i) * W} y={rand(i + 500) * H} width={1.6} height={1.6} fill={t.paper} opacity={0.1 + rand(i + 900) * 0.25} />)}</Svg>;
    case "rec-ilustracion": return <Svg w={W} h={H} label={label} bg={t.paper}><circle cx={170} cy={50} r={22} fill={t.secondary} /><path d="M0 120L60 60L110 105L160 70L240 125V150H0Z" fill={t.primary} /><path d="M0 135Q120 100 240 140V150H0Z" fill={t.ink} /></Svg>;
    case "rec-duotono": return <Svg w={W} h={H} label={label}>{landscape(W, H, t, "duo-rec")}</Svg>;
    case "rec-estilo": return <Svg w={W} h={H} label={label}>{landscape(W, H, t, "duo-estilo", true)}<g stroke={t.paper} strokeDasharray="4 4" opacity={0.8}><path d={`M${W / 3} 0V${H}M${(2 * W) / 3} 0V${H}M0 ${H / 3}H${W}M0 ${(2 * H) / 3}H${W}`} /></g></Svg>;
    case "rec-curva": return <Svg w={W} h={H} label={label} bg={t.paper}><path d="M-10 130Q120 10 250 120" stroke={t.secondary} strokeWidth={18} fill="none" /><path d="M-10 130Q120 10 250 120" stroke={t.paper} strokeWidth={2} strokeDasharray="10 8" fill="none" /><Mono x={100} y={86} s={40} bg={t.primary} fg={readableInk(t.primary)} accent={t.secondary} /></Svg>;
    default: return null;
  }
}

function mood(art: string, t: BrandTokens, label: string) {
  const W = 240, H = 180;
  const head = { fontFamily: t.heading, fontWeight: t.headingWeight };
  switch (art) {
    case "mb-bloques": return <Svg w={W} h={H} label={label}><rect width={W} height={H} fill={t.secondary} /><rect width={W * 0.62} height={H} fill={t.primary} /><rect x={W * 0.62} y={H * 0.6} width={W * 0.38} height={H * 0.4} fill={t.accent} /><text x={18} y={110} {...head} fontSize={46} fill={readableInk(t.primary)}>Ruta</text></Svg>;
    case "mb-duotono": return <Svg w={W} h={H} label={label}>{landscape(W, H, t, "duo-mb", true)}</Svg>;
    case "mb-tipo": return <Svg w={W} h={H} label={label} bg={t.paper}><text x={14} y={120} {...head} fontSize={104} fill={t.primary}>24h</text><rect x={14} y={140} width={90} height={8} fill={t.secondary} /></Svg>;
    case "mb-grilla": return <Svg w={W} h={H} label={label} bg={t.paper}>{Array.from({ length: 6 }, (_, i) => { const x = 10 + (i % 3) * 76, y = 10 + Math.floor(i / 3) * 82; const fill = [t.primary, t.secondary, t.accent, t.ink, t.paper, t.primary][i]; return <g key={i}><rect x={x} y={y} width={70} height={76} fill={fill} stroke={t.ink} strokeOpacity={0.15} /><g transform={`translate(${x + 19} ${y + 22}) scale(1)`}>{icons(t, readableInk(fill))[i]}</g></g>; })}</Svg>;
    case "mb-grano": return <Svg w={W} h={H} label={label} bg={t.accent}>{Array.from({ length: 520 }, (_, i) => <rect key={i} x={rand(i + 3) * W} y={rand(i + 700) * H} width={1.5} height={1.5} fill={t.ink} opacity={0.08 + rand(i + 40) * 0.2} />)}<circle cx={W / 2} cy={H / 2} r={46} fill={t.secondary} /></Svg>;
    case "mb-senal": return <Svg w={W} h={H} label={label} bg={t.primary}><path d="M40 70h110v-26l50 46-50 46v-26H40z" fill={t.paper} /><rect x={40} y={146} width={160} height={10} fill={t.secondary} /></Svg>;
    case "mb-kit": return <Svg w={W} h={H} label={label} bg={t.paper}><path d="M60 70L130 40L200 70L130 100Z" fill={t.secondary} /><path d="M60 70V140L130 170V100Z" fill={t.primary} /><path d="M200 70V140L130 170V100Z" fill={t.ink} /><path d="M70 128Q100 100 126 140" stroke={t.secondary} strokeWidth={6} fill="none" /></Svg>;
    default: return null;
  }
}

function application(art: string, t: BrandTokens, label: string) {
  const W = 240, H = 150;
  switch (art) {
    case "app-credencial": return <Svg w={W} h={H} label={label} bg={t.accent}><rect x={30} y={22} width={180} height={108} fill={t.paper} /><rect x={30} y={22} width={54} height={108} fill={t.primary} /><Mono x={39} y={34} s={36} bg={t.primary} fg={readableInk(t.primary)} accent={t.secondary} /><g fontFamily={t.body} fill={t.ink}><text x={96} y={52} fontSize={12} fontWeight={700}>Socio demo</text><text x={96} y={70} fontSize={9}>N.º 0000 0000 0000</text><text x={96} y={84} fontSize={9}>Vence 12/27</text></g>{Array.from({ length: 22 }, (_, i) => <rect key={i} x={96 + i * 4.6} y={98} width={i % 3 ? 2 : 3} height={20} fill={t.ink} />)}</Svg>;
    case "app-senal": return <Svg w={W} h={H} label={label} bg={t.paper}><rect x={114} y={86} width={12} height={64} fill={t.ink} /><rect x={36} y={18} width={168} height={74} fill={t.primary} /><Mono x={48} y={30} s={50} bg={t.primary} fg={readableInk(t.primary)} accent={t.secondary} /><Wordmark x={108} y={62} size={26} color={readableInk(t.primary)} tag={t.secondary} font={t.heading} weight={t.headingWeight} /></Svg>;
    case "app-vehiculo": return <Svg w={W} h={H} label={label} bg={t.paper}><path d="M20 112V58h132l40 22h28v32z" fill="#ffffff" stroke={t.ink} strokeWidth={2} /><path d="M20 104Q110 70 220 104" stroke={t.secondary} strokeWidth={8} fill="none" /><Mono x={34} y={66} s={28} bg={t.primary} fg={readableInk(t.primary)} accent={t.secondary} /><circle cx={60} cy={114} r={14} fill={t.ink} /><circle cx={186} cy={114} r={14} fill={t.ink} /><rect x={160} y={64} width={26} height={16} fill={t.accent} /></Svg>;
    default: return null;
  }
}

function piece(art: string, t: BrandTokens, label: string, title: string, variant: number) {
  const swap = variant % 2 === 0;
  const bg = swap ? t.secondary : t.primary, fg = readableInk(bg), accent = swap ? t.primary : t.secondary;
  const H = { font: t.heading, weight: t.headingWeight };
  const mono = (x: number, y: number, s: number) => <Mono x={x} y={y} s={s} bg={t.primary} fg={readableInk(t.primary)} accent={t.secondary} />;
  switch (art) {
    case "pz-carrusel": return <Svg w={240} h={180} label={label} bg={t.paper}>{[0, 1, 2].map((i) => { const fill = [bg, t.accent, accent][i]; return <g key={i} transform={`translate(${16 + i * 70} ${24 + i * 6})`}><rect width={96} height={120} fill={fill} stroke={t.ink} strokeOpacity={0.12} />{i === 0 ? <Headline x={8} y={30} text={title} size={12} color={readableInk(fill)} {...H} max={12} count={4} /> : <><rect x={10} y={16} width={40} height={6} fill={readableInk(fill)} /><rect x={10} y={30} width={70} height={4} fill={readableInk(fill)} opacity={0.5} /><rect x={10} y={40} width={60} height={4} fill={readableInk(fill)} opacity={0.5} /></>}</g>; })}</Svg>;
    case "pz-publicidad": return <Svg w={180} h={225} label={label} bg={bg}><text x={14} y={96} fontFamily={t.heading} fontWeight={t.headingWeight} fontSize={64} fill={fg}>24h</text><Headline x={14} y={132} text={title} size={12} color={fg} {...H} max={22} count={3} /><rect x={14} y={180} width={86} height={26} fill={accent} /><text x={22} y={197} fontFamily={t.body} fontSize={11} fontWeight={600} fill={readableInk(accent)}>Sumate hoy</text>{mono(136, 14, 30)}</Svg>;
    case "pz-presentacion": return <Svg w={256} h={144} label={label} bg={t.paper}><rect width={92} height={144} fill={bg} />{mono(16, 16, 30)}<Headline x={108} y={44} text={title} size={14} color={t.ink} {...H} max={18} count={3} /><rect x={108} y={104} width={60} height={22} fill={t.secondary} /><rect x={176} y={92} width={22} height={34} fill={t.accent} /><rect x={206} y={78} width={22} height={48} fill={t.primary} /></Svg>;
    case "pz-comercial": return <Svg w={170} h={240} label={label} bg={t.paper}><rect width={170} height={110} fill={bg} /><Headline x={14} y={40} text={title} size={14} color={fg} {...H} max={16} count={3} /><g fill={t.ink}>{Array.from({ length: 25 }, (_, i) => (rand(i + variant) > 0.45 ? <rect key={i} x={100 + (i % 5) * 10} y={150 + Math.floor(i / 5) * 10} width={9} height={9} /> : null))}</g><rect x={14} y={130} width={70} height={6} fill={t.ink} /><rect x={14} y={146} width={60} height={4} fill={t.ink} opacity={0.4} /><rect x={14} y={156} width={66} height={4} fill={t.ink} opacity={0.4} />{mono(14, 196, 30)}</Svg>;
    case "pz-banner": return <Svg w={320} h={100} label={label} bg={bg}><path d="M150 100Q230 10 320 60V100Z" fill={accent} opacity={0.9} /><Headline x={70} y={42} text={title} size={13} color={fg} {...H} max={20} count={2} />{mono(14, 26, 44)}<rect x={236} y={34} width={70} height={24} fill={t.paper} /><text x={244} y={50} fontFamily={t.body} fontSize={10} fontWeight={600} fill={t.ink}>Más info</text></Svg>;
    case "pz-packaging": return <Svg w={240} h={180} label={label} bg={t.paper}><path d="M50 60L130 28L210 60L130 92Z" fill={accent} /><path d="M50 60V140L130 172V92Z" fill={bg} /><path d="M210 60V140L130 172V92Z" fill={t.ink} /><path d="M58 120Q92 92 124 132" stroke={accent} strokeWidth={6} fill="none" /><g transform="matrix(1 0.4 0 1 0 0)"><text x={150} y={60} fontFamily={t.heading} fontWeight={t.headingWeight} fontSize={11} fill={readableInk(t.ink)}>ACA DEMO</text></g></Svg>;
    case "pz-video": return <Svg w={135} h={240} label={label}>{landscape(135, 240, t, `vid-${variant}`)}<rect x={0} y={170} width={135} height={70} fill={bg} opacity={0.92} />{mono(12, 182, 36)}<Headline x={56} y={198} text={title} size={9} color={fg} {...H} max={14} count={3} /><path d="M54 84L88 104L54 124Z" fill={t.paper} /></Svg>;
    case "pz-motion": return <Svg w={240} h={150} label={label} bg={t.ink}>{[0, 1, 2, 3].map((i) => <g key={i} transform={`translate(${12 + i * 56} 34)`}><rect width={48} height={82} fill={t.paper} opacity={0.08 + i * 0.05} /><path d={`M4 74Q24 ${70 - i * 18} 44 74`} stroke={t.secondary} strokeWidth={4} fill="none" />{i === 3 ? mono(10, 18, 28) : null}</g>)}<text x={12} y={138} fontFamily={t.body} fontSize={10} fill={t.paper}>0 s · 2 s · 4 s · 6 s</text></Svg>;
    case "pz-identidad": return <Svg w={200} h={200} label={label} bg={t.paper}><circle cx={100} cy={100} r={80} fill={bg} /><circle cx={100} cy={100} r={68} fill="none" stroke={fg} strokeWidth={2} strokeDasharray="3 5" /><Mono x={70} y={58} s={60} bg={bg} fg={fg} accent={accent} /><text x={100} y={150} textAnchor="middle" fontFamily={t.heading} fontWeight={t.headingWeight} fontSize={18} fill={fg}>{variant >= 3 ? "10 AÑOS" : "10"}</text></Svg>;
    case "pz-otros": return <Svg w={240} h={150} label={label}>{landscape(240, 150, t, `otros-${variant}`)}<rect x={60} y={30} width={120} height={78} fill={t.paper} opacity={0.18} stroke={t.paper} />{mono(190, 108, 30)}</Svg>;
    case "pz-redes":
    default: return <Svg w={200} h={200} label={label} bg={bg}><path d="M0 170Q100 120 200 168V200H0Z" fill={accent} /><Headline x={16} y={52} text={title} size={18} color={fg} {...H} max={14} count={3} />{mono(150, 14, 34)}<rect x={16} y={126} width={80} height={22} fill={t.paper} /><text x={24} y={141} fontFamily={t.body} fontSize={10} fontWeight={600} fill={t.ink}>Ver beneficios</text></Svg>;
  }
}

const CATEGORY_ART: Record<string, string> = {
  Identidad: "pz-identidad", "Redes sociales": "pz-redes", Carruseles: "pz-carrusel", Publicidad: "pz-publicidad", Presentaciones: "pz-presentacion",
  "Material comercial": "pz-comercial", Banners: "pz-banner", Packaging: "pz-packaging", Videos: "pz-video", Motion: "pz-motion", Otros: "pz-otros",
};
export function artForCategory(category: string) { return CATEGORY_ART[category] ?? "pz-redes"; }

/** Visual generado para logos, recursos, referencias, aplicaciones y piezas. */
export function BrandArt({ art, t, label, title = "", variant = 1 }: ArtProps) {
  if (art.startsWith("logo-")) return logo(art, t, label);
  if (art.startsWith("rec-")) return resource(art, t, label);
  if (art.startsWith("mb-")) return mood(art, t, label);
  if (art.startsWith("app-")) return application(art, t, label);
  return piece(art, t, label, title || label, variant);
}

export const ART_OPTIONS: { id: string; label: string }[] = [
  { id: "", label: "Sin visual generado" },
  { id: "logo-principal", label: "Logo horizontal" }, { id: "logo-secundario", label: "Logo apilado" }, { id: "logo-isotipo", label: "Isotipo" },
  { id: "logo-mono", label: "Logo monocromático" }, { id: "logo-negativo", label: "Logo negativo" },
  { id: "rec-iconos", label: "Íconos" }, { id: "rec-patron", label: "Patrón" }, { id: "rec-textura", label: "Textura" }, { id: "rec-ilustracion", label: "Ilustración" },
  { id: "rec-duotono", label: "Duotono" }, { id: "rec-estilo", label: "Encuadre" }, { id: "rec-curva", label: "Curva de ruta" },
  { id: "mb-bloques", label: "Bloques de color" }, { id: "mb-duotono", label: "Paisaje duotono" }, { id: "mb-tipo", label: "Tipografía grande" },
  { id: "mb-grilla", label: "Grilla modular" }, { id: "mb-grano", label: "Grano" }, { id: "mb-senal", label: "Señalización" }, { id: "mb-kit", label: "Objeto / packaging" },
  { id: "app-credencial", label: "Credencial" }, { id: "app-senal", label: "Cartel" }, { id: "app-vehiculo", label: "Vehículo" },
];

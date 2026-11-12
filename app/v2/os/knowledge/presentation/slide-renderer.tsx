"use client";
/**
 * Renders the slides of a generated PPTX (parsed by lib/pptx/render-model)
 * as absolutely positioned HTML/SVG. What is drawn is read from the file
 * itself — geometry, colours, text runs, pictures — so the preview shows the
 * actual content and design of the download, not a summary.
 */
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Syne } from "next/font/google";
import type {
  RenderDeck,
  RenderElement,
  RenderParagraph,
  RenderSlide,
} from "../../../../../lib/pptx/render-model";
import s from "./presentation.module.css";

// Figtree is loaded app-wide (--font-figtree). Syne is only needed here.
const syne = Syne({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "700"],
  display: "swap",
  variable: "--font-syne",
});

const EMU = 12700;
const LINE_HEIGHT = 1.2; // ascent + descent of Figtree and Syne (em)

const families: Record<string, string> = {
  Figtree: 'var(--font-figtree), "Figtree", system-ui, sans-serif',
  Syne: 'var(--font-syne), "Syne", system-ui, sans-serif',
};
const fontFamily = (typeface: string) =>
  families[typeface] ?? `"${typeface}", var(--font-figtree), system-ui, sans-serif`;

type MediaEntry = { urls: Map<string, string>; users: number; timer?: ReturnType<typeof setTimeout> };
const mediaCache = new WeakMap<RenderDeck, MediaEntry>();
function mediaEntry(deck: RenderDeck): MediaEntry {
  let entry = mediaCache.get(deck);
  if (!entry) {
    const urls = new Map<string, string>();
    if (typeof URL !== "undefined" && typeof Blob !== "undefined")
      for (const [path, m] of deck.media)
        urls.set(path, URL.createObjectURL(new Blob([m.bytes as BlobPart], { type: m.type })));
    entry = { urls, users: 0 };
    mediaCache.set(deck, entry);
  }
  return entry;
}

/** Object URLs for the media of a deck, revoked once no viewer uses it. */
export function useMediaUrls(deck: RenderDeck | null) {
  const urls = useMemo(() => (deck ? mediaEntry(deck).urls : new Map<string, string>()), [deck]);
  useEffect(() => {
    if (!deck) return;
    const entry = mediaEntry(deck);
    entry.users++;
    clearTimeout(entry.timer);
    return () => {
      entry.users--;
      if (entry.users <= 0)
        entry.timer = setTimeout(() => {
          for (const url of entry.urls.values()) URL.revokeObjectURL(url);
          mediaCache.delete(deck);
        }, 2000);
    };
  }, [deck]);
  return urls;
}

function Paragraph({ p }: { p: RenderParagraph }) {
  const size = p.runs.length ? Math.max(...p.runs.map((r) => r.size)) : p.emptySize;
  const lineHeight =
    p.lineSpacing.pts !== undefined
      ? `${p.lineSpacing.pts}px`
      : `${size * LINE_HEIGHT * (p.lineSpacing.pct ?? 1)}px`;
  const style: CSSProperties = {
    marginTop: p.spaceBefore,
    marginBottom: p.spaceAfter,
    marginLeft: 0,
    marginRight: 0,
    paddingLeft: p.marginLeft || undefined,
    textIndent: p.indent || undefined,
    textAlign: p.align,
    lineHeight,
    fontSize: size,
    fontFamily: fontFamily(p.runs[0]?.typeface ?? "Figtree"),
  };
  if (!p.runs.length || p.runs.every((r) => !r.text))
    return <p style={style}>{" "}</p>;
  return (
    <p style={style}>
      {p.bullet ? <span aria-hidden="true">{p.bullet} </span> : null}
      {p.runs.map((r, i) => (
        <span key={i}>
          {r.breakBefore ? <br /> : null}
          <span
            style={{
              fontSize: r.size,
              fontWeight: r.bold ? 700 : 400,
              fontStyle: r.italic ? "italic" : undefined,
              textDecoration:
                [r.underline && "underline", r.strike && "line-through"].filter(Boolean).join(" ") ||
                undefined,
              textTransform: r.caps ? "uppercase" : undefined,
              letterSpacing: r.spacing || undefined,
              color: r.color ?? undefined,
              opacity: r.opacity < 1 ? r.opacity : undefined,
              fontFamily: fontFamily(r.typeface),
            }}
          >
            {r.text}
          </span>
        </span>
      ))}
    </p>
  );
}

function Element({ e, media }: { e: RenderElement; media: Map<string, string> }) {
  const x = e.box.x / EMU,
    y = e.box.y / EMU,
    w = e.box.cx / EMU,
    h = e.box.cy / EMU;
  const frame: CSSProperties = {
    position: "absolute",
    left: x,
    top: y,
    width: w,
    height: h,
    transform: e.rotation ? `rotate(${e.rotation}deg)` : undefined,
  };
  if (e.kind === "picture") {
    const url = e.media ? media.get(e.media) : undefined;
    const iw = w / Math.max(0.01, 1 - e.crop.l - e.crop.r);
    const ih = h / Math.max(0.01, 1 - e.crop.t - e.crop.b);
    return (
      <div style={{ ...frame, overflow: "hidden", opacity: e.opacity }} data-object={e.id}>
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt=""
            draggable={false}
            style={{
              position: "absolute",
              left: -e.crop.l * iw,
              top: -e.crop.t * ih,
              width: iw,
              height: ih,
              maxWidth: "none",
            }}
          />
        ) : null}
      </div>
    );
  }
  let geometry: ReactNode = null;
  const stroke = e.line ? { stroke: e.line.color, strokeWidth: e.line.width, strokeOpacity: e.line.opacity } : {};
  const fill = e.fill ? { fill: e.fill.color, fillOpacity: e.fill.opacity } : { fill: "none" };
  if (e.geometry === "line" || ((w < 0.5 || h < 0.5) && (e.line || e.fill))) {
    const color = e.line?.color ?? e.fill?.color;
    geometry = (
      <line
        x1={e.flipH ? w : 0}
        y1={e.flipV ? h : 0}
        x2={e.flipH ? 0 : w}
        y2={e.flipV ? 0 : h}
        stroke={color}
        strokeWidth={e.line?.width ?? 0.75}
      />
    );
  } else if (e.fill || e.line) {
    geometry =
      e.geometry === "ellipse" ? (
        <ellipse cx={w / 2} cy={h / 2} rx={w / 2} ry={h / 2} {...fill} {...stroke} />
      ) : (
        <rect
          x={0}
          y={0}
          width={w}
          height={h}
          rx={e.geometry === "roundRect" ? Math.min(w, h) * 0.1667 : 0}
          {...fill}
          {...stroke}
        />
      );
  }
  const t = e.text;
  const hasText = t?.paragraphs.some((p) => p.runs.some((r) => r.text));
  return (
    <div style={frame} data-object={e.id}>
      {geometry ? (
        <svg
          width={Math.max(w, 1)}
          height={Math.max(h, 1)}
          style={{ position: "absolute", inset: 0, overflow: "visible" }}
          aria-hidden="true"
        >
          {geometry}
        </svg>
      ) : null}
      {t && hasText ? (
        <div
          className={s.textBody}
          style={{
            padding: `${t.insets.t}px ${t.insets.r}px ${t.insets.b}px ${t.insets.l}px`,
            justifyContent:
              t.anchor === "middle" ? "center" : t.anchor === "bottom" ? "flex-end" : "flex-start",
            whiteSpace: t.wrap ? "pre-wrap" : "pre",
          }}
        >
          {t.paragraphs.map((p, i) => (
            <Paragraph key={i} p={p} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

/**
 * One slide at its native size in points (1 pt = 1 CSS px), scaled to the
 * width of its container.
 */
export function SlideCanvas({
  deck,
  slide,
  media,
  label,
}: {
  deck: RenderDeck;
  slide: RenderSlide;
  media: Map<string, string>;
  label?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  const W = deck.width / EMU,
    H = deck.height / EMU;
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const update = () => setScale(node.clientWidth / W);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, [W]);
  return (
    <div
      ref={ref}
      className={`${s.canvas} ${syne.variable}`}
      style={{ aspectRatio: `${W} / ${H}` }}
      role="img"
      aria-label={label ?? `Slide ${slide.index}`}
    >
      {scale > 0 ? (
        <div
          className={s.stage}
          style={{
            width: W,
            height: H,
            background: slide.background,
            transform: `scale(${scale})`,
          }}
        >
          {slide.elements.map((e, i) => (
            <Element key={`${e.id}-${i}`} e={e} media={media} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

/** Renders the slide only once it scrolls near the viewport (thumbnails, long documents). */
export function LazySlide(props: Parameters<typeof SlideCanvas>[0]) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(() => typeof IntersectionObserver === "undefined");
  const W = props.deck.width,
    H = props.deck.height;
  useEffect(() => {
    const node = ref.current;
    if (!node || visible) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "600px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [visible]);
  return (
    <div ref={ref} style={{ aspectRatio: `${W} / ${H}` }} className={s.lazy}>
      {visible ? <SlideCanvas {...props} /> : null}
    </div>
  );
}

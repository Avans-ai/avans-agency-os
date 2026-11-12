/* Utility glyphs (OS stroke SVGs). The Avans system only ships abstract marks,
 * so close / chevron / bell / lock / search / check live here, not in the system. */
type GlyphName =
  | "close" | "chevron-right" | "chevron-left" | "chevron-down" | "bell" | "lock" | "search"
  | "check" | "arrow-right" | "blocked" | "kanban" | "list" | "more" | "menu" | "retry" | "sort-up" | "sort-down" | "alert" | "archive";

const PATHS: Record<GlyphName, string> = {
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  "chevron-right": '<path d="M9 6l6 6-6 6"/>',
  "chevron-left": '<path d="M15 6l-6 6 6 6"/>',
  "chevron-down": '<path d="M6 9l6 6 6-6"/>',
  bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 21h4"/>',
  lock: '<rect x="5" y="11" width="14" height="10"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  "arrow-right": '<path d="M5 12h14M13 6l6 6-6 6"/>',
  blocked: '<circle cx="12" cy="12" r="8"/><path d="M6.5 17.5l11-11"/>',
  kanban: '<path d="M4 5h16v14H4z"/><path d="M9.5 5v10M14.5 5v7"/>',
  list: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  more: '<circle cx="5" cy="12" r="1.4" fill="currentColor"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/><circle cx="19" cy="12" r="1.4" fill="currentColor"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  retry: '<path d="M20 12a8 8 0 1 1-2.3-5.7"/><path d="M20 4v5h-5"/>',
  "sort-up": '<path d="M12 19V5M6 11l6-6 6 6"/>',
  "sort-down": '<path d="M12 5v14M6 13l6 6 6-6"/>',
  alert: '<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 17.5v.5"/>',
  archive: '<path d="M4 7h16v13H4z"/><path d="M3 4h18v4H3zM9 12h6"/>',
};

export function Glyph({ name, size = 16, strokeWidth = 2.2, label }: { name: GlyphName; size?: number; strokeWidth?: number; label?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      style={{ display: "block", flex: "none" }}
      dangerouslySetInnerHTML={{ __html: PATHS[name] }}
    />
  );
}

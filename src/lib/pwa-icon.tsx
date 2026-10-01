import { ImageResponse } from "next/og";
import { MARK_BG, MARK_CHECK, MARK_LEAF, MARK_LEAF_FILL, MARK_VEIN } from "@/lib/brand-mark";

/**
 * Raster version of src/app/icon.svg for home-screen / splash icons.
 * `maskable` keeps the mark inside the 80% safe zone and fills the full square,
 * so Android launchers can crop it to any shape.
 */
export function renderAppIcon(size: number, { maskable = false }: { maskable?: boolean } = {}) {
  const mark = Math.round(size * (maskable ? 0.62 : 0.8));
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: MARK_BG,
          borderRadius: maskable ? 0 : Math.round(size * 0.3),
        }}
      >
        {/* Same geometry as lib/brand-mark.ts (check rising into a leaf), cropped to the glyph */}
        <svg width={mark} height={mark} viewBox="4 1 25 25">
          <path d={MARK_CHECK} fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
          <path d={MARK_LEAF} fill={MARK_LEAF_FILL} />
          <path d={MARK_VEIN} stroke={MARK_BG} strokeWidth="0.9" strokeLinecap="round" />
        </svg>
      </div>
    ),
    { width: size, height: size },
  );
}

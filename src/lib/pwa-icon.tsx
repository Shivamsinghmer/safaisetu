import { ImageResponse } from "next/og";

/**
 * Raster version of src/app/icon.svg for home-screen / splash icons.
 * `maskable` keeps the mark inside the 80% safe zone and fills the full square,
 * so Android launchers can crop it to any shape.
 */
export function renderAppIcon(size: number, { maskable = false }: { maskable?: boolean } = {}) {
  const mark = Math.round(size * (maskable ? 0.62 : 0.78));
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#3f7a28",
          borderRadius: maskable ? 0 : Math.round(size * 0.22),
        }}
      >
        <svg width={mark} height={mark} viewBox="4 4 24 24">
          <path d="M7 20c2.5-6 15.5-6 18 0" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
          <path d="M10 20v3.5M16 17v6.5M22 20v3.5" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
          <circle cx="16" cy="9.5" r="2.4" fill="#6ee7b7" />
        </svg>
      </div>
    ),
    { width: size, height: size },
  );
}

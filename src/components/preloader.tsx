"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { MARK_BG, MARK_CHECK, MARK_LEAF, MARK_LEAF_FILL, MARK_VEIN } from "@/lib/brand-mark";

/**
 * First-load preloader: "from one photo to a clean street".
 * Waste fragments in the four bin colours are pulled into the centre, become the mark, the check draws itself and the
 * leaf grows from its tip, then the mark flies onto the nav logo while the page opens in a circle around it, so the
 * hand-off is seamless. 2.5s in all: a 1.48s intro and a 1.02s exit.
 *
 * The intro is pure CSS (globals.css, "Preloader"), so it plays from first paint, before hydration. This component
 * only decides when to leave. It shows once per tab: the inline script in the root layout sets
 * html[data-preloader="on" | "skip"] before paint, and without JavaScript it never shows at all.
 */

// Sixteen fragments on a jittered ring. (x, y) is where each appears, (x2, y2) a point on the swirl into the centre.
const COUNT = 16;
const FRAGMENTS = Array.from({ length: COUNT }, (_, i) => {
  const a = (i / COUNT) * Math.PI * 2 + (i % 2 ? 0.16 : -0.1);
  const r = 150 + ((i * 37) % 5) * 16;
  const a2 = a + 0.8;
  const r2 = r * 0.4;
  const kinds = [
    { w: 15, h: 15, radius: 4 }, // carton
    { w: 12, h: 12, radius: 999 }, // bottle cap
    { w: 22, h: 8, radius: 3 }, // paper strip
    { w: 9, h: 17, radius: 3 }, // can
  ];
  const k = kinds[i % 4]!;
  return {
    x: Math.round(Math.cos(a) * r),
    y: Math.round(Math.sin(a) * r * 0.78),
    x2: Math.round(Math.cos(a2) * r2),
    y2: Math.round(Math.sin(a2) * r2 * 0.78),
    rot: (i * 47) % 180,
    delay: (i * 29) % 90,
    // Bin colours, offset from the shapes so every colour gets every shape
    color: ["var(--color-emerald)", "var(--color-blue)", "var(--color-coral)", "var(--color-ink)"][(i + Math.floor(i / 4)) % 4]!,
    ...k,
  };
});

const INTRO_END_MS = 1480; // the mark and caption are complete (matches the CSS timeline)
const FONT_WAIT_MS = 1500; // never hold the exit for a slow web font
const REDUCED_MIN_MS = 300;

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, Math.max(0, ms)));
}

/**
 * Resolves when the CSS intro has really played out. Tied to the animations themselves rather than the clock, so
 * a late hydration or a throttled tab never cuts the mark off halfway.
 */
function introFinished(root: HTMLElement) {
  const intro = [...root.querySelectorAll(".pl-square, .pl-check, .pl-leaf, .pl-vein, .pl-caption")]
    .flatMap((el) => el.getAnimations())
    .filter((a) => a.effect?.getComputedTiming().iterations !== Infinity);
  return Promise.all(intro.map((a) => a.finished)).then(
    () => undefined,
    () => undefined,
  );
}

/** The nav logo the mark lands on: the first brand mark visible in the viewport */
function findTarget(): DOMRect | null {
  const marks = [...document.querySelectorAll<SVGElement>("[data-brand-mark]")];
  for (const m of marks) {
    const r = m.getBoundingClientRect();
    if (r.width > 0 && r.top >= 0 && r.bottom <= window.innerHeight && r.left >= 0 && r.right <= window.innerWidth) return r;
  }
  return null;
}

export function Preloader() {
  const [done, setDone] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const html = document.documentElement;
    const root = rootRef.current;
    // Already shown in this tab (or storage blocked): CSS keeps it hidden; nothing to run
    if (html.dataset.preloader !== "on" || !root) return;
    try {
      sessionStorage.setItem("ss-preloaded", "1");
    } catch {
      // private mode: it may show again on reload, which is fine
    }

    let cancelled = false;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const app = document.getElementById("app-root");
    app?.setAttribute("inert", "");

    const finish = () => {
      if (cancelled) return;
      html.dataset.preloader = "done";
      app?.removeAttribute("inert");
      setDone(true);
    };

    (async () => {
      const fonts = Promise.race([document.fonts?.ready ?? Promise.resolve(), sleep(FONT_WAIT_MS)]);
      if (reduce) await Promise.all([fonts, sleep(REDUCED_MIN_MS - performance.now())]);
      else await Promise.all([fonts, introFinished(root), sleep(INTRO_END_MS - performance.now())]);
      if (cancelled) return;
      // Development aid: ?preloader=hold keeps the intro on screen to inspect it
      if (process.env.NODE_ENV !== "production" && new URLSearchParams(location.search).get("preloader") === "hold") return;

      if (reduce) {
        await root.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, easing: "ease-out", fill: "forwards" }).finished;
        return finish();
      }

      root.classList.add("is-exiting");
      const stage = root.querySelector<HTMLElement>(".pl-mark")!;
      const bg = root.querySelector<HTMLElement>(".pl-bg")!;
      const from = stage.getBoundingClientRect();
      const target = findTarget();
      const fx = from.left + from.width / 2;
      const fy = from.top + from.height / 2;
      const tx = target ? target.left + target.width / 2 : fx;
      const ty = target ? target.top + target.height / 2 : fy;
      const scale = target ? target.width / from.width : 0.35;

      // The page opens in a circle from where the mark lands
      bg.style.setProperty("--pl-cx", `${tx}px`);
      bg.style.setProperty("--pl-cy", `${ty}px`);
      const reach = Math.hypot(Math.max(tx, window.innerWidth - tx), Math.max(ty, window.innerHeight - ty));

      const fly = stage.animate(
        [
          { transform: "translate(0, 0) scale(1)" },
          { transform: `translate(${tx - fx}px, ${ty - fy}px) scale(${scale})`, ...(target ? {} : { opacity: 0 }) },
        ],
        { duration: 720, easing: "cubic-bezier(0.7, 0, 0.18, 1)", fill: "forwards" },
      );
      const open = bg.animate([{ "--pl-r": "0px" }, { "--pl-r": `${Math.ceil(reach) + 2}px` }] as Keyframe[], {
        duration: 760,
        delay: 260,
        easing: "cubic-bezier(0.55, 0, 0.15, 1)",
        fill: "forwards",
      });
      await Promise.all([fly.finished, open.finished]).catch(() => {});
      finish();
    })();

    return () => {
      cancelled = true;
      app?.removeAttribute("inert");
    };
  }, []);

  if (done) return null;

  return (
    <div ref={rootRef} className="ss-preloader" role="status" aria-live="polite" aria-label="Loading SafaiSetu">
      <div className="pl-bg" />
      <div className="pl-stage" aria-hidden>
        {FRAGMENTS.map((f, i) => (
          <span
            key={i}
            className="pl-frag"
            style={
              {
                "--x": `${f.x}px`,
                "--y": `${f.y}px`,
                "--x2": `${f.x2}px`,
                "--y2": `${f.y2}px`,
                "--r": `${f.rot}deg`,
                "--d": `${f.delay}ms`,
                width: f.w,
                height: f.h,
                marginLeft: -f.w / 2,
                marginTop: -f.h / 2,
                borderRadius: f.radius,
                background: f.color,
              } as CSSProperties
            }
          />
        ))}

        <span className="pl-wave" />
        <div className="pl-mark">
          <svg viewBox="0 0 32 32" overflow="visible">
            {/* Waiting ring: only appears if the page takes longer than the intro */}
            <rect className="pl-ring-track" x="-4.5" y="-4.5" width="41" height="41" rx="13.5" fill="none" />
            <rect className="pl-ring" x="-4.5" y="-4.5" width="41" height="41" rx="13.5" fill="none" pathLength={100} />
            <g className="pl-square">
              <rect width="32" height="32" rx="9.5" fill={MARK_BG} />
              <rect x="0.5" y="0.5" width="31" height="31" rx="9" fill="none" stroke="#ffffff" strokeOpacity="0.14" />
            </g>
            <path
              className="pl-check"
              d={MARK_CHECK}
              pathLength={1}
              fill="none"
              stroke="#ffffff"
              strokeWidth="3.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <g className="pl-leaf">
              <path d={MARK_LEAF} fill={MARK_LEAF_FILL} />
              <path className="pl-vein" d={MARK_VEIN} pathLength={1} stroke={MARK_BG} strokeWidth="0.9" strokeLinecap="round" />
            </g>
          </svg>
        </div>

        <div className="pl-caption" lang="en">
          Safai<span>Setu</span>
        </div>
      </div>
    </div>
  );
}

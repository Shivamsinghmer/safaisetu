import { renderAppIcon } from "@/lib/pwa-icon";

// /pwa-icon/192, /pwa-icon/512, /pwa-icon/maskable
const VARIANTS = {
  "192": { size: 192, maskable: false },
  "512": { size: 512, maskable: false },
  maskable: { size: 512, maskable: true },
} as const;

export const dynamic = "force-static";

export function generateStaticParams() {
  return Object.keys(VARIANTS).map((variant) => ({ variant }));
}

export async function GET(_req: Request, { params }: RouteContext<"/pwa-icon/[variant]">) {
  const { variant } = await params;
  const v = VARIANTS[variant as keyof typeof VARIANTS];
  if (!v) return new Response("Not found", { status: 404 });
  return renderAppIcon(v.size, { maskable: v.maskable });
}

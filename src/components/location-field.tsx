"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Crosshair, Loader2, MapPin } from "lucide-react";
import { PickerMap } from "@/components/maps";
import { Input } from "@/components/ui";

const DEFAULT: [number, number] = [23.2599, 77.4126];

async function reverseGeocode(lat: number, lng: number) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=18&lat=${lat}&lon=${lng}`,
      { headers: { "Accept-Language": "en" } },
    );
    if (!res.ok) return null;
    const json = (await res.json()) as { display_name?: string };
    return json.display_name?.split(", ").slice(0, 4).join(", ") ?? null;
  } catch {
    return null;
  }
}

/**
 * GPS-first location input with a draggable pin. Emits hidden lat/lng/address
 * fields for the surrounding <form>.
 */
export function LocationField({
  initial,
  locked,
  autoLocate = true,
  addressName = "address",
}: {
  initial?: { lat: number; lng: number; address?: string | null };
  locked?: boolean;
  autoLocate?: boolean;
  addressName?: string;
}) {
  const [pos, setPos] = useState<[number, number]>(initial ? [initial.lat, initial.lng] : DEFAULT);
  const [address, setAddress] = useState(initial?.address ?? "");
  const [note, setNote] = useState<string | null>(null);
  const addressTouched = useRef(Boolean(initial?.address));
  const geoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const move = useCallback((lat: number, lng: number) => {
    setPos([lat, lng]);
    if (geoTimer.current) clearTimeout(geoTimer.current);
    geoTimer.current = setTimeout(async () => {
      const a = await reverseGeocode(lat, lng);
      if (a && !addressTouched.current) setAddress(a);
    }, 500);
  }, []);

  const autoOnMount = !initial && autoLocate && !locked;
  const [locating, setLocating] = useState(autoOnMount);

  // Asks the browser for a GPS fix; state changes only happen in the callbacks.
  const requestPosition = useCallback(() => {
    if (!navigator.geolocation) {
      setTimeout(() => {
        setLocating(false);
        setNote("Location isn't available on this device. Drag the pin instead.");
      });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setLocating(false);
        addressTouched.current = false;
        move(p.coords.latitude, p.coords.longitude);
      },
      () => {
        setLocating(false);
        setNote("Couldn't get your location. Drag the pin or tap the map.");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, [move]);

  const locate = () => {
    setLocating(true);
    setNote(null);
    requestPosition();
  };

  useEffect(() => {
    if (autoOnMount) requestPosition();
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col gap-3">
      <input type="hidden" name="lat" value={pos[0].toFixed(6)} />
      <input type="hidden" name="lng" value={pos[1].toFixed(6)} />
      {!locked && (
        <div className="overflow-hidden rounded-xl border border-bone">
          <PickerMap lat={pos[0]} lng={pos[1]} onMove={move} />
        </div>
      )}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <MapPin className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-ash" />
          <Input
            name={addressName}
            value={address}
            onChange={(e) => {
              addressTouched.current = true;
              setAddress(e.target.value);
            }}
            placeholder="Landmark or address"
            className="pl-9"
            readOnly={locked}
          />
        </div>
        {!locked && (
          <button
            type="button"
            onClick={locate}
            className="inline-flex h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-blue px-3.5 text-[13px] font-bold text-blue hover:bg-blue/5"
          >
            {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crosshair className="h-4 w-4" />}
            <span className="hidden sm:inline">Use my location</span>
          </button>
        )}
      </div>
      {note && <p className="text-xs text-amber">{note}</p>}
      {!locked && <p className="text-xs text-ash">Tap the map or drag the pin to the exact spot.</p>}
    </div>
  );
}

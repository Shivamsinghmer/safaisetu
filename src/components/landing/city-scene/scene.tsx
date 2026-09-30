"use client";

import { useMemo, useRef, useState, type ReactNode } from "react";
import * as THREE from "three";
import { Canvas, useFrame, type ThreeEvent } from "@react-three/fiber";
import { ContactShadows, Html, OrbitControls, RoundedBox } from "@react-three/drei";

/* ------------------------------------------------------------------ */
/* Palette: a calm, municipal low-poly look                             */
/* ------------------------------------------------------------------ */
const C = {
  plinthTop: "#eef1ea",
  plinthSide: "#dfe4d8",
  grass: "#b9d7a1",
  road: "#3c434f",
  roadLine: "#f4f3ec",
  kerb: "#d6dbd0",
  wall: "#f6f3ec",
  wallAlt: "#e8e2d6",
  window: "#a9bfd4",
  roof: "#6f9a52",
  roofAlt: "#c9a27a",
  truck: "#2e7d4f",
  truckDark: "#23613c",
  cab: "#f7f7f5",
  glass: "#9cc3de",
  stripe: "#f2c230",
  tyre: "#24272c",
  beacon: "#ff9f1c",
  vest: "#f28c28",
  reflect: "#f7f7f2",
  skin: "#b9825a",
  pants: "#34404f",
  cap: "#2e7d4f",
  binWet: "#2f9e5b",
  binDry: "#2f6fd6",
  binHaz: "#d9534f",
  trunk: "#7a5a3a",
  leaf: "#5f9e4a",
  leafAlt: "#7db35e",
  lamp: "#5b6470",
};

/* Road loop: rounded square around the central park */
const HALF = 4.2; // centerline half-size
const CORNER = 1.3; // centerline corner radius
const ROAD_W = 1.35;
const PLINTH = 13.2;

function roundedRectShape(half: number, r: number) {
  const s = new THREE.Shape();
  s.moveTo(-half + r, -half);
  s.lineTo(half - r, -half);
  s.absarc(half - r, -half + r, r, -Math.PI / 2, 0, false);
  s.lineTo(half, half - r);
  s.absarc(half - r, half - r, r, 0, Math.PI / 2, false);
  s.lineTo(-half + r, half);
  s.absarc(-half + r, half - r, r, Math.PI / 2, Math.PI, false);
  s.lineTo(-half, -half + r);
  s.absarc(-half + r, -half + r, r, Math.PI, Math.PI * 1.5, false);
  return s;
}

/** Closed centerline curve the truck drives along (world XZ). */
function useRoadCurve() {
  return useMemo(() => {
    const pts = roundedRectShape(HALF, CORNER).getSpacedPoints(160);
    // shape XY lies flat after rotating -90° about X: shape y → world -z
    return new THREE.CatmullRomCurve3(
      pts.map((p) => new THREE.Vector3(p.x, 0, -p.y)),
      true,
      "centripetal",
    );
  }, []);
}

/* ------------------------------------------------------------------ */
/* Hover label                                                          */
/* ------------------------------------------------------------------ */
function useHover() {
  const [hovered, setHovered] = useState(false);
  const bind = {
    onPointerOver: (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      setHovered(true);
      document.body.style.cursor = "pointer";
    },
    onPointerOut: () => {
      setHovered(false);
      document.body.style.cursor = "";
    },
  };
  return [hovered, bind] as const;
}

function Label({ show, y, title, sub }: { show: boolean; y: number; title: string; sub: string }) {
  if (!show) return null;
  return (
    <Html position={[0, y, 0]} center distanceFactor={11} zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
      <div className="whitespace-nowrap rounded-lg border border-border bg-card/95 px-2.5 py-1.5 text-left shadow-md backdrop-blur">
        <div className="text-[12px] font-semibold text-foreground">{title}</div>
        <div className="text-[11px] text-muted-foreground">{sub}</div>
      </div>
    </Html>
  );
}

/* ------------------------------------------------------------------ */
/* Ground, road, park                                                   */
/* ------------------------------------------------------------------ */
function Ground() {
  const curve = useRoadCurve();
  const road = useMemo(() => {
    const outer = roundedRectShape(HALF + ROAD_W / 2, CORNER + ROAD_W / 2);
    const inner = roundedRectShape(HALF - ROAD_W / 2, Math.max(CORNER - ROAD_W / 2, 0.05));
    outer.holes.push(inner);
    return new THREE.ExtrudeGeometry(outer, { depth: 0.04, bevelEnabled: false, curveSegments: 24 });
  }, []);
  const park = useMemo(
    () =>
      new THREE.ExtrudeGeometry(roundedRectShape(HALF - ROAD_W / 2 - 0.12, Math.max(CORNER - ROAD_W / 2 - 0.1, 0.05)), {
        depth: 0.06,
        bevelEnabled: false,
        curveSegments: 20,
      }),
    [],
  );
  // Dashed centre line
  const dashes = useMemo(() => {
    const n = 44;
    return Array.from({ length: n }, (_, i) => {
      const u = i / n;
      const p = curve.getPointAt(u);
      const t = curve.getTangentAt(u);
      return { p, angle: Math.atan2(-t.z, t.x) };
    });
  }, [curve]);

  return (
    <group>
      {/* floating city tile */}
      <RoundedBox args={[PLINTH, 0.7, PLINTH]} radius={0.28} smoothness={4} position={[0, -0.35, 0]} receiveShadow>
        <meshStandardMaterial color={C.plinthSide} roughness={0.95} />
      </RoundedBox>
      <mesh position={[0, 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[PLINTH - 0.5, PLINTH - 0.5]} />
        <meshStandardMaterial color={C.plinthTop} roughness={0.95} />
      </mesh>
      <mesh geometry={road} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]} receiveShadow>
        <meshStandardMaterial color={C.road} roughness={0.9} />
      </mesh>
      <mesh geometry={park} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]} receiveShadow>
        <meshStandardMaterial color={C.grass} roughness={1} />
      </mesh>
      {dashes.map(({ p, angle }, i) => (
        <mesh key={i} position={[p.x, 0.05, p.z]} rotation={[0, angle, 0]}>
          <boxGeometry args={[0.32, 0.01, 0.06]} />
          <meshStandardMaterial color={C.roadLine} />
        </mesh>
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Buildings, trees, lamps                                              */
/* ------------------------------------------------------------------ */
function Building({
  position,
  size,
  floors,
  color = C.wall,
  roof = C.roof,
}: {
  position: [number, number, number];
  size: [number, number, number];
  floors: number;
  color?: string;
  roof?: string;
}) {
  const [w, h, d] = size;
  const floorH = h / floors;
  const colsX = Math.max(2, Math.round(w / 0.55));
  const colsZ = Math.max(2, Math.round(d / 0.55));
  return (
    <group position={position}>
      <RoundedBox args={[w, h, d]} radius={0.06} smoothness={2} position={[0, h / 2, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={color} roughness={0.85} />
      </RoundedBox>
      {/* window bands on the two camera-facing sides */}
      {Array.from({ length: floors }, (_, f) => (
        <group key={f}>
          {Array.from({ length: colsX }, (_, i) => (
            <mesh key={`x${i}`} position={[-w / 2 + (w / colsX) * (i + 0.5), floorH * (f + 0.55), d / 2 + 0.005]}>
              <planeGeometry args={[0.26, floorH * 0.42]} />
              <meshStandardMaterial color={C.window} roughness={0.3} metalness={0.1} />
            </mesh>
          ))}
          {Array.from({ length: colsZ }, (_, i) => (
            <mesh
              key={`z${i}`}
              position={[w / 2 + 0.005, floorH * (f + 0.55), -d / 2 + (d / colsZ) * (i + 0.5)]}
              rotation={[0, Math.PI / 2, 0]}
            >
              <planeGeometry args={[0.26, floorH * 0.42]} />
              <meshStandardMaterial color={C.window} roughness={0.3} metalness={0.1} />
            </mesh>
          ))}
        </group>
      ))}
      <mesh position={[0, h + 0.06, 0]} castShadow>
        <boxGeometry args={[w + 0.1, 0.12, d + 0.1]} />
        <meshStandardMaterial color={roof} roughness={0.9} />
      </mesh>
    </group>
  );
}

function Tree({ position, scale = 1, alt = false }: { position: [number, number, number]; scale?: number; alt?: boolean }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.3, 0]} castShadow>
        <cylinderGeometry args={[0.06, 0.09, 0.6, 6]} />
        <meshStandardMaterial color={C.trunk} roughness={1} />
      </mesh>
      <mesh position={[0, 0.85, 0]} castShadow>
        <icosahedronGeometry args={[0.46, 0]} />
        <meshStandardMaterial color={alt ? C.leafAlt : C.leaf} roughness={0.9} flatShading />
      </mesh>
      <mesh position={[0.12, 1.18, 0.05]} castShadow>
        <icosahedronGeometry args={[0.3, 0]} />
        <meshStandardMaterial color={alt ? C.leaf : C.leafAlt} roughness={0.9} flatShading />
      </mesh>
    </group>
  );
}

function Lamp({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.6, 0]} castShadow>
        <cylinderGeometry args={[0.03, 0.04, 1.2, 6]} />
        <meshStandardMaterial color={C.lamp} />
      </mesh>
      <mesh position={[0, 1.22, 0]}>
        <sphereGeometry args={[0.09, 10, 8]} />
        <meshStandardMaterial color="#fff6d6" emissive="#ffe8a3" emissiveIntensity={0.6} />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Segregated bins (the pickup point)                                   */
/* ------------------------------------------------------------------ */
const BIN_SPOT: [number, number, number] = [0.9, 0, HALF + ROAD_W / 2 + 0.75];

function Bin({ position, color, lidTilt = 0 }: { position: [number, number, number]; color: string; lidTilt?: number }) {
  return (
    <group position={position}>
      <RoundedBox args={[0.34, 0.46, 0.34]} radius={0.04} smoothness={2} position={[0, 0.23, 0]} castShadow>
        <meshStandardMaterial color={color} roughness={0.6} />
      </RoundedBox>
      <mesh position={[0, 0.48, -0.17]} rotation={[-lidTilt, 0, 0]}>
        <boxGeometry args={[0.38, 0.04, 0.38]} />
        <meshStandardMaterial color={color} roughness={0.5} />
      </mesh>
    </group>
  );
}

function Bins({ pickupRef }: { pickupRef: React.RefObject<number> }) {
  const [hovered, bind] = useHover();
  const lid = useRef(0);
  const [tilt, setTilt] = useState(0);
  useFrame((_, dt) => {
    const target = (pickupRef.current ?? 0) > 0 ? 0.9 : 0;
    lid.current += (target - lid.current) * Math.min(1, dt * 4);
    if (Math.abs(lid.current - tilt) > 0.02) setTilt(lid.current);
  });
  return (
    <group position={BIN_SPOT} {...bind}>
      <Bin position={[-0.42, 0, 0]} color={C.binWet} lidTilt={tilt} />
      <Bin position={[0, 0, 0]} color={C.binDry} lidTilt={tilt} />
      <Bin position={[0.42, 0, 0]} color={C.binHaz} lidTilt={tilt} />
      <Label show={hovered} y={1.05} title="Segregated bins" sub="Wet · Dry · Hazardous" />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Garbage truck: drives the loop, stops at the bins                    */
/* ------------------------------------------------------------------ */
const STOP_U = 0.125; // where the loop passes the bins (bottom edge)
const STOP_SECONDS = 2.6;

function Truck({ animate, pickupRef }: { animate: boolean; pickupRef: React.RefObject<number> }) {
  const curve = useRoadCurve();
  const group = useRef<THREE.Group>(null);
  const wheels = useRef<THREE.Mesh[]>([]);
  const beacon = useRef<THREE.MeshStandardMaterial>(null);
  const state = useRef({ u: 0.62, stop: 0, stoppedThisLap: false });
  const length = useMemo(() => curve.getLength(), [curve]);
  const [hovered, bind] = useHover();
  const offset = useMemo(() => new THREE.Vector3(), []);

  useFrame((clock, dt) => {
    const s = state.current;
    const step = Math.min(dt, 0.05);
    if (animate) {
      if (s.stop > 0) {
        s.stop -= step;
        pickupRef.current = s.stop;
      } else {
        const prev = s.u;
        s.u = (s.u + (step * 1.35) / length) % 1;
        if (!s.stoppedThisLap && prev < STOP_U && s.u >= STOP_U) {
          s.stop = STOP_SECONDS;
          s.stoppedThisLap = true;
        }
        if (s.u < prev) s.stoppedThisLap = false; // wrapped
        wheels.current.forEach((w) => w && (w.rotation.y -= (step * 1.35) / 0.2));
      }
    }
    const p = curve.getPointAt(s.u);
    const t = curve.getTangentAt(s.u);
    // drive in the outer lane (left-hand traffic)
    offset.set(-t.z, 0, t.x).multiplyScalar(0.3);
    group.current?.position.set(p.x + offset.x, 0.04, p.z + offset.z);
    if (group.current) group.current.rotation.y = Math.atan2(-t.z, t.x);
    if (beacon.current) {
      const pulse = s.stop > 0 ? 6 : 2.2;
      beacon.current.emissiveIntensity = 0.4 + Math.max(0, Math.sin(clock.clock.elapsedTime * pulse)) * 1.6;
    }
  });

  const wheel = (x: number, z: number, i: number) => (
    <mesh
      key={i}
      ref={(m) => {
        if (m) wheels.current[i] = m;
      }}
      position={[x, 0.2, z]}
      rotation={[Math.PI / 2, 0, 0]}
      castShadow
    >
      <cylinderGeometry args={[0.2, 0.2, 0.16, 14]} />
      <meshStandardMaterial color={C.tyre} roughness={0.8} />
    </mesh>
  );

  return (
    <group ref={group} {...bind}>
      <group scale={0.82}>
        {/* chassis */}
        <mesh position={[0, 0.34, 0]} castShadow>
          <boxGeometry args={[2.2, 0.18, 0.86]} />
          <meshStandardMaterial color={C.tyre} roughness={0.7} />
        </mesh>
        {/* cab */}
        <RoundedBox args={[0.72, 0.72, 0.9]} radius={0.08} smoothness={3} position={[0.76, 0.78, 0]} castShadow>
          <meshStandardMaterial color={C.cab} roughness={0.5} />
        </RoundedBox>
        <mesh position={[1.125, 0.88, 0]}>
          <boxGeometry args={[0.02, 0.3, 0.76]} />
          <meshStandardMaterial color={C.glass} roughness={0.15} metalness={0.3} />
        </mesh>
        {[0.456, -0.456].map((z) => (
          <mesh key={z} position={[0.82, 0.9, z]}>
            <boxGeometry args={[0.36, 0.26, 0.01]} />
            <meshStandardMaterial color={C.glass} roughness={0.15} metalness={0.3} />
          </mesh>
        ))}
        {/* beacon */}
        <mesh position={[0.7, 1.2, 0]}>
          <boxGeometry args={[0.18, 0.08, 0.3]} />
          <meshStandardMaterial ref={beacon} color={C.beacon} emissive={C.beacon} emissiveIntensity={1} />
        </mesh>
        {/* compactor body */}
        <RoundedBox args={[1.48, 0.98, 0.96]} radius={0.1} smoothness={3} position={[-0.36, 0.9, 0]} castShadow>
          <meshStandardMaterial color={C.truck} roughness={0.55} />
        </RoundedBox>
        <mesh position={[-1.12, 0.86, 0]} castShadow>
          <boxGeometry args={[0.1, 0.9, 0.9]} />
          <meshStandardMaterial color={C.truckDark} roughness={0.6} />
        </mesh>
        {/* hazard stripe + recycle panel */}
        <mesh position={[-0.36, 0.56, 0]}>
          <boxGeometry args={[1.5, 0.1, 0.98]} />
          <meshStandardMaterial color={C.stripe} roughness={0.5} />
        </mesh>
        {[0.49, -0.49].map((z) => (
          <mesh key={z} position={[-0.36, 1.02, z]}>
            <boxGeometry args={[0.7, 0.36, 0.01]} />
            <meshStandardMaterial color={C.cab} roughness={0.6} />
          </mesh>
        ))}
        {wheel(0.72, 0.43, 0)}
        {wheel(0.72, -0.43, 1)}
        {wheel(-0.62, 0.43, 2)}
        {wheel(-0.62, -0.43, 3)}
      </group>
      <Label show={hovered} y={1.7} title="Municipal collection truck" sub="Route W-12 · stops at every bin point" />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Sanitation workers                                                   */
/* ------------------------------------------------------------------ */
type Route = (time: number) => { x: number; z: number; heading: number; moving: boolean };

function Worker({
  route,
  animate,
  label,
  phase = 0,
}: {
  route: Route;
  animate: boolean;
  label: { title: string; sub: string };
  phase?: number;
}) {
  const group = useRef<THREE.Group>(null);
  const legL = useRef<THREE.Group>(null);
  const legR = useRef<THREE.Group>(null);
  const armL = useRef<THREE.Group>(null);
  const armR = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const time = useRef(phase);
  const [hovered, bind] = useHover();

  useFrame((_, dt) => {
    if (animate) time.current += Math.min(dt, 0.05);
    const { x, z, heading, moving } = route(time.current);
    if (group.current) {
      group.current.position.set(x, 0, z);
      group.current.rotation.y = heading;
    }
    const swing = moving ? Math.sin(time.current * 7) * 0.55 : 0;
    if (legL.current) legL.current.rotation.z = swing;
    if (legR.current) legR.current.rotation.z = -swing;
    if (armL.current) armL.current.rotation.z = -swing * 0.8;
    if (armR.current) armR.current.rotation.z = swing * 0.8;
    if (body.current) body.current.position.y = moving ? Math.abs(Math.sin(time.current * 7)) * 0.025 : 0;
  });

  const limb = (len: number, color: string) => (
    <mesh position={[0, -len / 2, 0]} castShadow>
      <capsuleGeometry args={[0.055, len - 0.1, 4, 8]} />
      <meshStandardMaterial color={color} roughness={0.8} />
    </mesh>
  );

  return (
    <group ref={group} {...bind}>
      <group ref={body} scale={1.35}>
        {/* legs pivot at the hips; local +x is forward */}
        <group ref={legL} position={[0, 0.42, 0.07]}>
          {limb(0.42, C.pants)}
        </group>
        <group ref={legR} position={[0, 0.42, -0.07]}>
          {limb(0.42, C.pants)}
        </group>
        {/* torso in hi-vis vest */}
        <mesh position={[0, 0.66, 0]} castShadow>
          <capsuleGeometry args={[0.13, 0.26, 4, 10]} />
          <meshStandardMaterial color={C.vest} roughness={0.6} />
        </mesh>
        <mesh position={[0, 0.62, 0]}>
          <cylinderGeometry args={[0.137, 0.137, 0.05, 12]} />
          <meshStandardMaterial color={C.reflect} emissive={C.reflect} emissiveIntensity={0.25} />
        </mesh>
        <group ref={armL} position={[0, 0.8, 0.17]}>
          {limb(0.34, C.vest)}
        </group>
        <group ref={armR} position={[0, 0.8, -0.17]}>
          {limb(0.34, C.vest)}
        </group>
        {/* head + cap */}
        <mesh position={[0, 1.0, 0]} castShadow>
          <sphereGeometry args={[0.1, 14, 12]} />
          <meshStandardMaterial color={C.skin} roughness={0.7} />
        </mesh>
        <mesh position={[0, 1.07, 0]}>
          <sphereGeometry args={[0.105, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color={C.cap} roughness={0.6} />
        </mesh>
        <mesh position={[0.08, 1.06, 0]}>
          <boxGeometry args={[0.1, 0.015, 0.14]} />
          <meshStandardMaterial color={C.cap} roughness={0.6} />
        </mesh>
      </group>
      <Label show={hovered} y={1.9} title={label.title} sub={label.sub} />
    </group>
  );
}

/** Walks back and forth along a straight path, pausing at each end. */
function pingPong(a: [number, number], b: [number, number], speed: number, pause: number): Route {
  const dx = b[0] - a[0];
  const dz = b[1] - a[1];
  const dist = Math.hypot(dx, dz);
  const walk = dist / speed;
  const cycle = 2 * (walk + pause);
  return (t) => {
    const c = ((t % cycle) + cycle) % cycle;
    let f: number;
    let dir = 1;
    let moving = true;
    if (c < walk) f = c / walk;
    else if (c < walk + pause) {
      f = 1;
      moving = false;
    } else if (c < 2 * walk + pause) {
      f = 1 - (c - walk - pause) / walk;
      dir = -1;
    } else {
      f = 0;
      moving = false;
      dir = -1;
    }
    const heading = Math.atan2(-dz * dir, dx * dir);
    return { x: a[0] + dx * f, z: a[1] + dz * f, heading, moving };
  };
}

/** Strolls around a circle. */
function circle(cx: number, cz: number, r: number, speed: number): Route {
  return (t) => {
    const a = (t * speed) / r;
    const x = cx + Math.cos(a) * r;
    const z = cz + Math.sin(a) * r;
    // tangent direction of travel
    return { x, z, heading: Math.atan2(-Math.cos(a), -Math.sin(a)), moving: true };
  };
}

/* ------------------------------------------------------------------ */
/* Scene                                                                */
/* ------------------------------------------------------------------ */
function Diorama({ animate }: { animate: boolean }) {
  const root = useRef<THREE.Group>(null);
  const pickupRef = useRef<number>(0);
  const sidewalkZ = HALF + ROAD_W / 2 + 0.35;

  const routes = useMemo(
    () => ({
      a: pingPong([-2.6, sidewalkZ], [BIN_SPOT[0] - 0.9, sidewalkZ], 0.7, 1.4),
      b: circle(1.35, 0.1, 0.95, 0.45),
      c: pingPong([HALF + ROAD_W / 2 + 0.45, -2.8], [HALF + ROAD_W / 2 + 0.45, 1.6], 0.55, 2),
    }),
    [sidewalkZ],
  );

  // Gentle parallax toward the pointer
  useFrame((state, dt) => {
    if (!root.current || !animate) return;
    const k = Math.min(1, dt * 2.5);
    root.current.rotation.y += (state.pointer.x * 0.12 - root.current.rotation.y) * k;
    root.current.rotation.x += (-state.pointer.y * 0.04 - root.current.rotation.x) * k;
  });

  return (
    <group ref={root}>
      <Ground />

      {/* central park: society buildings + trees */}
      <Building position={[-1.45, 0.06, -1.1]} size={[2.1, 2.7, 1.7]} floors={4} />
      <Building position={[-1.55, 0.06, 1.55]} size={[1.7, 1.5, 1.3]} floors={2} color={C.wallAlt} roof={C.roofAlt} />
      <Tree position={[1.9, 0.06, 1.9]} scale={1.05} />
      <Tree position={[2.55, 0.06, 0.95]} scale={0.85} alt />
      <Tree position={[1.25, 0.06, -2.25]} scale={0.95} alt />
      <Tree position={[2.5, 0.06, -1.7]} scale={1.1} />
      <Tree position={[0.4, 0.06, 2.6]} scale={0.75} />

      {/* outer sidewalk */}
      <Building position={[-5.55, 0, -4.8]} size={[1.3, 1.9, 1.6]} floors={3} color={C.wallAlt} roof={C.roofAlt} />
      <Building position={[5.45, 0, 4.9]} size={[1.4, 1.2, 1.5]} floors={2} />
      <Tree position={[-5.7, 0, 2.2]} scale={0.95} />
      <Tree position={[-5.6, 0, 4.9]} scale={0.8} alt />
      <Tree position={[5.7, 0, -4.9]} scale={1} alt />
      <Tree position={[3.6, 0, -5.8]} scale={0.8} />
      <Lamp position={[-2.8, 0, HALF + ROAD_W / 2 + 0.2]} />
      <Lamp position={[3.2, 0, HALF + ROAD_W / 2 + 0.2]} />
      <Lamp position={[HALF + ROAD_W / 2 + 0.2, 0, -0.6]} />
      <Lamp position={[-(HALF + ROAD_W / 2 + 0.2), 0, -1.4]} />

      <Bins pickupRef={pickupRef} />
      <Truck animate={animate} pickupRef={pickupRef} />
      <Worker route={routes.a} animate={animate} label={{ title: "Field worker", sub: "Clearing the bin point · Ward 12" }} />
      <Worker route={routes.b} animate={animate} phase={3} label={{ title: "Housekeeping staff", sub: "Society park round" }} />
      <Worker route={routes.c} animate={animate} phase={1.5} label={{ title: "Sweeper", sub: "East sidewalk · morning shift" }} />
    </group>
  );
}

export default function CityScene({ active, reduced }: { active: boolean; reduced: boolean }): ReactNode {
  const animate = active && !reduced;
  return (
    <Canvas
      shadows
      dpr={[1, 1.75]}
      frameloop={active ? (reduced ? "demand" : "always") : "never"}
      camera={{ position: [15, 12.5, 15], fov: 30, near: 0.5, far: 90 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      style={{ touchAction: "pan-y" }}
    >
      <hemisphereLight args={["#ffffff", "#b9c7ab", 0.95]} />
      <directionalLight
        position={[7, 12, 5]}
        intensity={1.7}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-9}
        shadow-camera-right={9}
        shadow-camera-top={9}
        shadow-camera-bottom={-9}
        shadow-bias={-0.0005}
      />
      <directionalLight position={[-6, 5, -8]} intensity={0.35} />

      <Diorama animate={animate} />

      <ContactShadows position={[0, -0.72, 0]} opacity={0.3} scale={20} blur={2.6} far={3} />
      <OrbitControls
        enablePan={false}
        enableZoom={false}
        enableDamping
        target={[0, -0.2, 0]}
        minPolarAngle={0.65}
        maxPolarAngle={1.15}
        minAzimuthAngle={Math.PI / 4 - 1}
        maxAzimuthAngle={Math.PI / 4 + 1}
        rotateSpeed={0.6}
      />
    </Canvas>
  );
}

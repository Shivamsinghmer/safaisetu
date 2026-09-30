/**
 * Demo data for SafaiSetu. Safe to re-run: it removes previous demo data first.
 *   npm run seed
 * Requires NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY and DEMO_PASSWORD in .env.local
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });
config();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
const password = process.env.DEMO_PASSWORD;
if (!url || !key || !password) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY and DEMO_PASSWORD in .env.local");
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const DOMAIN = "demo.safaisetu.in";
const MUNI_NAME = "Bhopal Municipal Corporation (Demo)";

// Deterministic PRNG so every seed looks the same
let s = 42;
const rand = () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296);
const pick = <T>(arr: readonly T[]) => arr[Math.floor(rand() * arr.length)]!;
const weighted = <T>(items: [T, number][]) => {
  const total = items.reduce((a, [, w]) => a + w, 0);
  let r = rand() * total;
  for (const [v, w] of items) if ((r -= w) <= 0) return v;
  return items[0]![0];
};
const jitter = (v: number, d: number) => v + (rand() - 0.5) * 2 * d;
const hours = (h: number) => h * 3600_000;

async function must<T>(p: PromiseLike<{ data: T; error: unknown }>, what: string): Promise<NonNullable<T>> {
  const { data, error } = await p;
  if (error || data === null) {
    console.error(`✗ ${what}`, error);
    process.exit(1);
  }
  return data as NonNullable<T>;
}

async function ok(p: PromiseLike<{ error: unknown }>, what: string) {
  const { error } = await p;
  if (error) {
    console.error(`✗ ${what}`, error);
    process.exit(1);
  }
}

async function cleanup() {
  const { data: list } = await db.auth.admin.listUsers({ perPage: 1000 });
  const demoUsers = (list?.users ?? []).filter((u) => u.email?.endsWith(`@${DOMAIN}`) || u.email?.endsWith("@demo-institute.edu.in"));
  const ids = demoUsers.map((u) => u.id);
  if (ids.length) {
    await db.from("tickets").delete().in("reporter_id", ids);
    await db.from("organizations").delete().in("created_by", ids);
  }
  await db.from("municipalities").delete().eq("name", MUNI_NAME);
  let removed = 0;
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data: again } = await db.auth.admin.listUsers({ perPage: 1000 });
    const left = (again?.users ?? []).filter((u) => u.email?.endsWith(`@${DOMAIN}`) || u.email?.endsWith("@demo-institute.edu.in"));
    if (!left.length) break;
    for (const u of left) {
      const { error } = await db.auth.admin.deleteUser(u.id);
      if (error) console.warn(`  could not delete ${u.email}: ${error.message}`);
      else removed++;
    }
  }
  console.log(`• removed ${removed} previous demo users`);
}

async function createUser(email: string, full_name: string, phone: string | null, extra: Record<string, unknown> = {}) {
  const { data, error } = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name, phone },
  });
  if (error || !data.user) {
    console.error(`✗ create user ${email}`, error);
    process.exit(1);
  }
  const id = data.user.id;
  await ok(db.from("profiles").upsert({ id, email, full_name, phone, ...extra }), `profile ${email}`);
  return id;
}

async function main() {
  await cleanup();

  // ---------------- Municipality & wards ----------------
  const muni = await must(
    db.from("municipalities").insert({ name: MUNI_NAME, city: "Bhopal", state: "Madhya Pradesh" }).select().single(),
    "municipality",
  );
  const wardDefs = [
    { code: "W-03", name: "Ward 3 · Old City", center_lat: 23.2685, center_lng: 77.4012 },
    { code: "W-12", name: "Ward 12 · MP Nagar", center_lat: 23.2332, center_lng: 77.4343 },
    { code: "W-19", name: "Ward 19 · Arera Colony", center_lat: 23.2156, center_lng: 77.4304 },
    { code: "W-24", name: "Ward 24 · Kolar Road", center_lat: 23.1789, center_lng: 77.4198 },
    { code: "W-31", name: "Ward 31 · Habibganj", center_lat: 23.2276, center_lng: 77.4415 },
    { code: "W-40", name: "Ward 40 · TT Nagar", center_lat: 23.2404, center_lng: 77.3989 },
  ];
  const wards = await must(
    db.from("wards").insert(wardDefs.map((w) => ({ ...w, municipality_id: muni.id }))).select(),
    "wards",
  );
  const wardByCode = new Map(wards.map((w) => [w.code, w]));
  console.log(`• municipality + ${wards.length} wards`);

  // ---------------- People ----------------
  const officer = await createUser(`officer@${DOMAIN}`, "Anjali Verma", "+91 98260 11001", {
    platform_role: "municipal_admin",
    municipality_id: muni.id,
  });
  const workers = [
    await createUser(`worker@${DOMAIN}`, "Ramesh Yadav", "+91 98260 22001", { platform_role: "worker", municipality_id: muni.id }),
    await createUser(`worker2@${DOMAIN}`, "Sunita Bai", "+91 98260 22002", { platform_role: "worker", municipality_id: muni.id }),
    await createUser(`worker3@${DOMAIN}`, "Imran Khan", "+91 98260 22003", { platform_role: "worker", municipality_id: muni.id }),
  ];
  const secretary = await createUser(`secretary@${DOMAIN}`, "Vikram Mehta", "+91 98930 33001");
  const campus = await createUser(`campus@${DOMAIN}`, "Dr. Neha Joshi", "+91 98930 33002");
  const market = await createUser(`market@${DOMAIN}`, "Suresh Agrawal", "+91 98930 33003");
  const citizen = await createUser(`citizen@${DOMAIN}`, "Aarav Sharma", "+91 99070 44001");
  const pendingAdmin = await createUser(`newsociety@${DOMAIN}`, "Kavita Rao", "+91 99070 44002");
  const residentNames = [
    "Priya Nair", "Rohit Gupta", "Fatima Sheikh", "Arjun Patel", "Sneha Iyer", "Manoj Tiwari",
    "Divya Kulkarni", "Karan Malhotra", "Pooja Dubey", "Harsh Vardhan", "Ayesha Siddiqui", "Nikhil Jain",
  ];
  const residents: string[] = [];
  for (const [i, n] of residentNames.entries()) {
    residents.push(await createUser(`resident${i + 1}@${DOMAIN}`, n, null));
  }
  const students: string[] = [];
  for (const [i, n] of ["Ishaan Rao", "Tanya Singh", "Mohit Chauhan"].entries()) {
    students.push(await createUser(`student${i + 1}@demo-institute.edu.in`, n, null));
  }
  console.log(`• ${1 + workers.length + 6 + residents.length + students.length} users`);

  // ---------------- Organizations ----------------
  type OrgSeed = { key: string; type: "society" | "college" | "public_place"; name: string; address: string; ward: string; lat: number; lng: number; admin: string; status?: "approved" | "pending"; email_domain?: string; reg?: string; units?: number };
  const orgSeeds: OrgSeed[] = [
    { key: "gv", type: "society", name: "Green Valley Residency", address: "E-7, Arera Colony, Bhopal", ward: "W-19", lat: 23.2149, lng: 77.4321, admin: secretary, reg: "MP/BPL/SOC/2014/0871", units: 240 },
    { key: "lv", type: "society", name: "Lakeview Apartments", address: "Shyamla Hills, Bhopal", ward: "W-40", lat: 23.2441, lng: 77.3962, admin: residents[0]!, reg: "MP/BPL/SOC/2011/0342", units: 120 },
    { key: "sn", type: "society", name: "Shanti Nagar Housing Society", address: "Kolar Road, Bhopal", ward: "W-24", lat: 23.1802, lng: 77.4176, admin: residents[1]!, reg: "MP/BPL/SOC/2018/1190", units: 310 },
    { key: "rk", type: "society", name: "Royal Kingsway Enclave", address: "Hoshangabad Road, Bhopal", ward: "W-31", lat: 23.2251, lng: 77.4452, admin: residents[2]!, reg: "MP/BPL/SOC/2020/1433", units: 180 },
    { key: "it", type: "college", name: "Demo Institute of Technology", address: "Raisen Road, Bhopal", ward: "W-12", lat: 23.2361, lng: 77.4389, admin: campus, email_domain: "demo-institute.edu.in", reg: "AICTE/DIT/1998", units: 14 },
    { key: "mc", type: "college", name: "City Medical College Campus", address: "Royal Market, Bhopal", ward: "W-03", lat: 23.2662, lng: 77.4035, admin: residents[3]!, reg: "NMC/CMC/1955", units: 9 },
    { key: "nm", type: "public_place", name: "New Market Traders' Association", address: "New Market, TT Nagar, Bhopal", ward: "W-40", lat: 23.2386, lng: 77.4007, admin: market, reg: "TA/BPL/1987/22", units: 6 },
    { key: "bs", type: "public_place", name: "Habibganj Railway Station Concourse", address: "Habibganj, Bhopal", ward: "W-31", lat: 23.2297, lng: 77.4388, admin: residents[4]!, units: 4 },
    { key: "up", type: "public_place", name: "Upper Lake Boat Club Promenade", address: "Lake View Road, Bhopal", ward: "W-03", lat: 23.2519, lng: 77.3871, admin: residents[5]!, units: 5 },
    { key: "pd", type: "society", name: "Sunrise Heights (awaiting approval)", address: "Bawadia Kalan, Bhopal", ward: "W-24", lat: 23.1745, lng: 77.4265, admin: pendingAdmin, status: "pending", reg: "MP/BPL/SOC/2026/0012", units: 96 },
  ];
  const orgs = new Map<string, { id: string; seed: OrgSeed; ward_id: string }>();
  for (const o of orgSeeds) {
    const row = await must(
      db
        .from("organizations")
        .insert({
          type: o.type,
          name: o.name.replace(" (awaiting approval)", ""),
          address: o.address,
          lat: o.lat,
          lng: o.lng,
          ward_id: wardByCode.get(o.ward)!.id,
          status: o.status ?? "approved",
          reviewed_by: o.status === "pending" ? null : officer,
          reviewed_at: o.status === "pending" ? null : new Date(Date.now() - hours(24 * 40)).toISOString(),
          email_domain: o.email_domain ?? null,
          reg_number: o.reg ?? null,
          unit_count: o.units ?? null,
          created_by: o.admin,
          invite_code: o.key === "gv" ? "GV4K2P" : undefined,
        })
        .select("id, ward_id")
        .single(),
      `org ${o.name}`,
    );
    orgs.set(o.key, { id: row.id, seed: o, ward_id: row.ward_id });
  }
  console.log(`• ${orgs.size} organizations`);

  // Memberships (admins were added by trigger)
  const gv = orgs.get("gv")!;
  const memberRows = [
    { org_id: gv.id, user_id: citizen, role: "member", status: "active", unit_label: "B-204" },
    ...residents.slice(7, 11).map((u, i) => ({ org_id: gv.id, user_id: u, role: "member", status: "active", unit_label: `${"ABC"[i % 3]}-${101 + i * 7}` })),
    { org_id: gv.id, user_id: residents[11]!, role: "member", status: "pending", unit_label: "C-310" },
    { org_id: gv.id, user_id: residents[6]!, role: "staff", status: "active", unit_label: "Housekeeping" },
    ...students.map((u, i) => ({ org_id: orgs.get("it")!.id, user_id: u, role: "member", status: "active", unit_label: `Hostel ${i + 1}` })),
    { org_id: orgs.get("lv")!.id, user_id: residents[7]!, role: "member", status: "active", unit_label: "Tower 2, 804" },
    { org_id: orgs.get("sn")!.id, user_id: residents[8]!, role: "member", status: "active", unit_label: "Plot 45" },
  ];
  await ok(db.from("memberships").upsert(memberRows, { onConflict: "org_id,user_id" }), "memberships");

  // QR points
  const qrRows = [
    { org_id: orgs.get("nm")!.id, label: "Food lane bins", lat: 23.2388, lng: 77.4011 },
    { org_id: orgs.get("nm")!.id, label: "Main gate, Plaza side", lat: 23.2382, lng: 77.4002 },
    { org_id: orgs.get("bs")!.id, label: "Platform 1 entrance", lat: 23.2299, lng: 77.4383 },
    { org_id: orgs.get("up")!.id, label: "Boat Club ticket counter", lat: 23.2521, lng: 77.3876 },
    { org_id: orgs.get("it")!.id, label: "Central canteen", lat: 23.2365, lng: 77.4392 },
  ];
  const qrs = await must(db.from("qr_points").insert(qrRows).select("id, org_id, lat, lng"), "qr points");

  // ---------------- Tickets ----------------
  const issueCats: [string, number][] = [
    ["overflowing_bin", 30], ["road_garbage", 26], ["illegal_dumping", 14], ["missed_collection", 16], ["unsegregated", 8], ["burning", 6],
  ];
  const internalCats: [string, number][] = [["overflowing_bin", 40], ["unsegregated", 25], ["road_garbage", 20], ["other", 8]];
  const descriptions: Record<string, string[]> = {
    overflowing_bin: ["Community bin full since two days, waste spilling onto the road.", "Bin near the gate overflowing, dogs spreading garbage.", "Dustbin lid broken and bin overflowing."],
    road_garbage: ["Heap of garbage on the footpath near the bus stop.", "Plastic and food waste scattered along the service lane.", "Garbage pile outside the vegetable market."],
    illegal_dumping: ["Construction debris dumped on the open plot overnight.", "Someone dumps waste into the nallah every morning.", "Truck unloaded mixed waste behind the park."],
    missed_collection: ["Collection vehicle has not come for 3 days.", "Door-to-door pickup skipped our lane this week.", "Van came but didn't take dry waste."],
    unsegregated: ["Wet and dry waste mixed in all bins.", "Residents not segregating, housekeeping mixes it anyway."],
    burning: ["Garbage being burnt in the open, heavy smoke.", "Leaves and plastic burnt near the school every evening."],
    other: ["Bin stand broken and needs replacement.", "Bad smell from the waste storage area."],
    bulk: ["Old sofa and two mattresses.", "Broken wardrobe and chairs, ~80 kg."],
    e_waste: ["Old CRT TV, 2 phones, a bag of batteries.", "Printer, cables and a dead UPS."],
    construction_debris: ["Bathroom renovation rubble, around 15 bags.", "Tiles and cement bags from repair work."],
    garden: ["Pruned branches from society trees.", "Dry leaves, around 10 sacks."],
  };
  // Hotspots drive the heatmap
  const hotspots = [
    { ward: "W-03", lat: 23.2702, lng: 77.3995, w: 5 },
    { ward: "W-31", lat: 23.2265, lng: 77.4431, w: 4 },
    { ward: "W-12", lat: 23.2318, lng: 77.4331, w: 3 },
    { ward: "W-40", lat: 23.2395, lng: 77.4015, w: 3 },
    { ward: "W-24", lat: 23.1775, lng: 77.4221, w: 2 },
    { ward: "W-19", lat: 23.2168, lng: 77.4289, w: 1 },
  ];
  const reporters = [citizen, ...residents, ...students];
  const now = Date.now();

  type Seeded = Record<string, unknown> & { _events: { status: string; at: number; actor: string | null; note?: string }[] };
  const tickets: Seeded[] = [];

  function lifecycle(t: Record<string, unknown>, createdAt: number, scope: "internal" | "municipal", reporter: string, handler: string, forceOpen = false) {
    const ageH = (now - createdAt) / 3600_000;
    const events: Seeded["_events"] = [{ status: "submitted", at: createdAt, actor: reporter, note: "Reported" }];
    let status = "submitted";
    let assigned: string | null = null;
    let resolvedAt: number | null = null;
    let closedAt: number | null = null;
    const r = rand();
    const target = forceOpen
      ? "submitted"
      : ageH > 96
        ? weighted([["closed", 60], ["resolved", 18], ["rejected", 5], ["in_progress", 7], ["assigned", 6], ["reopened", 4]])
        : ageH > 24
          ? weighted([["closed", 25], ["resolved", 25], ["in_progress", 20], ["assigned", 18], ["submitted", 12]])
          : weighted([["submitted", 45], ["assigned", 30], ["in_progress", 15], ["resolved", 10]]);
    let tt = createdAt + hours(0.5 + r * 6);
    const step = (st: string, actor: string | null, note?: string) => {
      events.push({ status: st, at: Math.min(tt, now - hours(0.2)), actor, note });
      status = st;
      tt += hours(2 + rand() * 20);
    };
    if (target === "rejected") step("rejected", handler, "Duplicate of an existing complaint");
    else if (target !== "submitted") {
      if (scope === "municipal") {
        assigned = pick(workers);
        step("assigned", handler);
        if (target !== "assigned") step("in_progress", assigned);
        if (["resolved", "closed", "reopened"].includes(target)) {
          step("resolved", assigned, "Area cleaned and bin emptied");
          resolvedAt = events.at(-1)!.at;
        }
      } else {
        step("in_progress", handler);
        if (["resolved", "closed", "reopened"].includes(target)) {
          step("resolved", handler, "Housekeeping cleared it");
          resolvedAt = events.at(-1)!.at;
        }
      }
      if (target === "closed") {
        step("closed", reporter);
        closedAt = events.at(-1)!.at;
      }
      if (target === "reopened") {
        step("reopened", reporter, "Still dirty, only half cleared");
        resolvedAt = null;
      }
    }
    Object.assign(t, {
      status,
      assigned_to: assigned,
      resolved_at: resolvedAt ? new Date(resolvedAt).toISOString() : null,
      closed_at: closedAt ? new Date(closedAt).toISOString() : null,
      rating: closedAt ? weighted([[5, 5], [4, 4], [3, 2], [2, 1]]) : null,
      updated_at: new Date(events.at(-1)!.at).toISOString(),
    });
    return events;
  }

  const slaFor = (sev: string, created: number) => new Date(created + hours(sev === "high" ? 24 : sev === "medium" ? 48 : 72)).toISOString();

  // Public / municipal issues
  for (let i = 0; i < 105; i++) {
    const hs = weighted(hotspots.map((h) => [h, h.w] as [typeof h, number]));
    const category = weighted(issueCats);
    const severity = weighted([["high", 25], ["medium", 50], ["low", 25]]) as string;
    const created = now - hours(Math.pow(rand(), 1.4) * 24 * 30);
    const reporter = pick(reporters);
    const t: Record<string, unknown> = {
      kind: "issue",
      category,
      description: pick(descriptions[category] ?? descriptions.other!),
      severity,
      scope: "municipal",
      lat: jitter(hs.lat, 0.012),
      lng: jitter(hs.lng, 0.012),
      address: `${pick(["Near", "Opposite", "Behind", "Next to"])} ${pick(["bus stop", "temple", "market gate", "school", "petrol pump", "park entrance", "water tank"])}, ${wardByCode.get(hs.ward)!.name.split(" · ")[1]}`,
      ward_id: wardByCode.get(hs.ward)!.id,
      reporter_id: reporter,
      created_at: new Date(created).toISOString(),
      sla_due_at: slaFor(severity, created),
      source: "app",
      ai: rand() > 0.3 ? { is_waste: true, category, severity, waste_types: [pick(["dry", "wet"]), pick(["dry", "wet", "hazardous"])], description: pick(descriptions[category] ?? descriptions.other!), confidence: 0.7 + rand() * 0.28 } : null,
    };
    const events = lifecycle(t, created, "municipal", reporter, officer);
    tickets.push({ ...t, _events: events });
  }

  // Internal organization issues (+ some escalated, + QR reports)
  const orgKeys = ["gv", "gv", "gv", "lv", "sn", "rk", "it", "it", "mc", "nm", "nm", "bs", "up"];
  for (let i = 0; i < 48; i++) {
    const o = orgs.get(pick(orgKeys))!;
    const category = weighted(internalCats);
    const severity = weighted([["high", 15], ["medium", 55], ["low", 30]]) as string;
    const created = now - hours(Math.pow(rand(), 1.3) * 24 * 30);
    const qr = o.seed.type !== "society" && rand() > 0.4 ? qrs.find((q) => q.org_id === o.id) : undefined;
    const reporter = o.seed.key === "gv" ? pick([citizen, ...residents.slice(7, 11)]) : o.seed.key === "it" ? pick(students) : pick(reporters);
    const escalate = rand() < 0.18;
    const t: Record<string, unknown> = {
      kind: "issue",
      category,
      description: pick(descriptions[category] ?? descriptions.other!),
      severity,
      scope: escalate ? "municipal" : "internal",
      escalated: escalate,
      escalated_at: escalate ? new Date(created + hours(8)).toISOString() : null,
      lat: qr ? qr.lat : jitter(o.seed.lat, 0.0015),
      lng: qr ? qr.lng : jitter(o.seed.lng, 0.0015),
      address: o.seed.address,
      org_id: o.id,
      qr_point_id: qr?.id ?? null,
      source: qr ? "qr" : "app",
      unit_label: o.seed.type === "society" ? `${pick(["A", "B", "C"])}-${100 + Math.floor(rand() * 300)}` : null,
      ward_id: o.ward_id,
      reporter_id: reporter,
      created_at: new Date(created).toISOString(),
      sla_due_at: slaFor(severity, created),
    };
    const events = lifecycle(t, created, escalate ? "municipal" : "internal", reporter, escalate ? officer : o.seed.admin);
    if (escalate) events.splice(1, 0, { status: "submitted", at: created + hours(8), actor: o.seed.admin, note: "Escalated to municipality: needs a municipal vehicle" });
    tickets.push({ ...t, _events: events });
  }

  // Pickups: a batch waiting at Green Valley + some already with the municipality
  const pickupTypes = ["bulk", "e_waste", "construction_debris", "garden"];
  for (let i = 0; i < 20; i++) {
    const pending = i < 5;
    const o = pending ? gv : orgs.get(pick(["gv", "lv", "sn", "rk"]))!;
    const category = pick(pickupTypes);
    const created = pending ? now - hours(2 + rand() * 40) : now - hours(24 + rand() * 24 * 25);
    const reporter = o === gv ? pick([citizen, ...residents.slice(7, 11)]) : pick(reporters);
    const t: Record<string, unknown> = {
      kind: "pickup",
      category,
      description: pick(descriptions[category]!),
      severity: "low",
      scope: pending ? "internal" : "municipal",
      escalated: !pending,
      escalated_at: pending ? null : new Date(created + hours(12)).toISOString(),
      lat: jitter(o.seed.lat, 0.001),
      lng: jitter(o.seed.lng, 0.001),
      address: o.seed.address,
      org_id: o.id,
      unit_label: `${pick(["A", "B", "C"])}-${100 + Math.floor(rand() * 300)}`,
      ward_id: o.ward_id,
      reporter_id: reporter,
      preferred_date: new Date(created + hours(24 * (2 + Math.floor(rand() * 4)))).toISOString().slice(0, 10),
      created_at: new Date(created).toISOString(),
      sla_due_at: slaFor("low", created),
    };
    const events = lifecycle(t, created, pending ? "internal" : "municipal", reporter, pending ? secretary : officer, pending);
    if (!pending) events.splice(1, 0, { status: "submitted", at: created + hours(12), actor: o.seed.admin, note: "Forwarded in a batch of pickup requests" });
    tickets.push({ ...t, _events: events });
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const ticketRows = tickets.map(({ _events, ...t }) => t);
  const inserted: { id: string }[] = [];
  for (let i = 0; i < ticketRows.length; i += 50) {
    inserted.push(...(await must(db.from("tickets").insert(ticketRows.slice(i, i + 50), { defaultToNull: false }).select("id"), "tickets")));
  }
  const ids = inserted.map((r) => r.id);

  // Replace trigger-generated events with the historical timeline
  await ok(db.from("ticket_events").delete().in("ticket_id", ids), "clear events");
  const eventRows = tickets.flatMap((t, i) => {
    let prev: string | null = null;
    return t._events.map((e) => {
      const row = { ticket_id: ids[i], actor_id: e.actor, from_status: prev, to_status: e.status, note: e.note ?? null, created_at: new Date(e.at).toISOString() };
      prev = e.status;
      return row;
    });
  });
  for (let i = 0; i < eventRows.length; i += 200) {
    await ok(db.from("ticket_events").insert(eventRows.slice(i, i + 200)), "events");
  }
  console.log(`• ${ids.length} tickets, ${eventRows.length} timeline events`);

  // ---------------- Notices ----------------
  await ok(
    db.from("notices").insert([
      { org_id: gv.id, title: "Dry waste days changed", body: "From Monday, dry waste is collected on Wednesday and Saturday mornings. Please keep blue bins at your door by 8am.", author_id: secretary, created_at: new Date(now - hours(30)).toISOString() },
      { org_id: gv.id, title: "Composting pit is live", body: "The new compost pit behind Block C accepts vegetable and fruit peels. No plastic, meat or cooked oily food.", author_id: secretary, created_at: new Date(now - hours(24 * 6)).toISOString() },
      { org_id: orgs.get("it")!.id, title: "E-waste drive on campus", body: "Drop old chargers, batteries and phones at the Central Library entrance this Friday, 10am–4pm.", author_id: campus, created_at: new Date(now - hours(50)).toISOString() },
      { municipality_id: muni.id, title: "Special e-waste collection drive", body: "All ward offices accept household e-waste this Sunday, 10am–4pm. Societies can request a bulk pickup through SafaiSetu.", author_id: officer, created_at: new Date(now - hours(20)).toISOString() },
      { municipality_id: muni.id, title: "No open burning of waste", body: "Burning garbage is a punishable offence under SWM Rules 2016. Report burning incidents with a photo.", author_id: officer, created_at: new Date(now - hours(24 * 9)).toISOString() },
    ]),
    "notices",
  );

  console.log("\n✓ Demo data ready. Log in with any of these (password = DEMO_PASSWORD):");
  for (const e of ["citizen", "secretary", "campus", "market", "officer", "worker"]) console.log(`   ${e}@${DOMAIN}`);
  console.log(`   Green Valley invite code: GV4K2P`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

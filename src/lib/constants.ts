import type { OrgType, Severity, TicketStatus } from "./types";

export const APP_NAME = "SafaiSetu";

export const ISSUE_CATEGORIES = [
  { value: "overflowing_bin", label: "Overflowing bin", hint: "Bin full, waste spilling around it" },
  { value: "road_garbage", label: "Garbage on road", hint: "Litter or heaps on a road or footpath" },
  { value: "illegal_dumping", label: "Illegal dumping", hint: "Waste dumped on open plots or drains" },
  { value: "missed_collection", label: "Missed collection", hint: "Collection vehicle did not come" },
  { value: "unsegregated", label: "Improper segregation", hint: "Wet and dry waste mixed" },
  { value: "burning", label: "Waste burning", hint: "Garbage being burnt in the open" },
  { value: "other", label: "Other", hint: "Anything else waste-related" },
] as const;

export const PICKUP_TYPES = [
  { value: "bulk", label: "Bulk household waste", hint: "Old furniture, mattresses, large items" },
  { value: "e_waste", label: "E-waste", hint: "Phones, batteries, chargers, appliances" },
  { value: "construction_debris", label: "Construction debris", hint: "Rubble, tiles, sand, cement bags" },
  { value: "garden", label: "Garden waste", hint: "Leaves, branches, grass clippings" },
  { value: "hazardous", label: "Hazardous waste", hint: "Paint, chemicals, medical waste" },
] as const;

const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  [...ISSUE_CATEGORIES, ...PICKUP_TYPES].map((c) => [c.value, c.label]),
);

export function categoryLabel(value: string) {
  return CATEGORY_LABELS[value] ?? value.replaceAll("_", " ");
}

export const STATUS_META: Record<TicketStatus, { label: string; className: string; dot: string }> = {
  submitted: { label: "Submitted", className: "bg-mercury text-carbon", dot: "bg-fog" },
  assigned: { label: "Assigned", className: "bg-violet/10 text-violet", dot: "bg-violet" },
  in_progress: { label: "In progress", className: "bg-blue text-snow", dot: "bg-blue" },
  resolved: { label: "Resolved", className: "bg-mint text-night", dot: "bg-mint" },
  closed: { label: "Closed", className: "bg-white text-emerald ring-1 ring-inset ring-emerald", dot: "bg-emerald" },
  reopened: { label: "Reopened", className: "bg-pink text-snow", dot: "bg-pink" },
  rejected: { label: "Rejected", className: "bg-mist text-ash", dot: "bg-cloud" },
};

export const OPEN_STATUSES: TicketStatus[] = ["submitted", "assigned", "in_progress", "reopened"];

export const SEVERITY_META: Record<Severity, { label: string; dot: string; text: string }> = {
  low: { label: "Low", dot: "bg-teal", text: "text-teal" },
  medium: { label: "Medium", dot: "bg-amber", text: "text-amber" },
  high: { label: "High", dot: "bg-coral", text: "text-coral" },
};

export const ORG_TYPE_META: Record<
  OrgType,
  { label: string; plural: string; admin: string; members: string; unit: string; unitPlaceholder: string }
> = {
  society: {
    label: "Residential society",
    plural: "Societies",
    admin: "Secretary",
    members: "Residents",
    unit: "Flat",
    unitPlaceholder: "B-204",
  },
  college: {
    label: "College / campus",
    plural: "Colleges",
    admin: "Facilities manager",
    members: "Students & staff",
    unit: "Hostel / building",
    unitPlaceholder: "Hostel 3, Room 112",
  },
  public_place: {
    label: "Public place",
    plural: "Public places",
    admin: "Place manager",
    members: "Staff",
    unit: "Zone",
    unitPlaceholder: "Gate 2 food court",
  },
};

// Indian SWM Rules 2016 color code
export const WASTE_STREAMS = {
  wet: { label: "Wet waste", bin: "Green bin", swatch: "bg-emerald" },
  dry: { label: "Dry waste", bin: "Blue bin", swatch: "bg-blue" },
  hazardous: { label: "Domestic hazardous", bin: "Red bin", swatch: "bg-coral" },
  e_waste: { label: "E-waste", bin: "Black bin / e-waste drop point", swatch: "bg-night ring-1 ring-cloud" },
} as const;

export type WasteStream = keyof typeof WASTE_STREAMS;

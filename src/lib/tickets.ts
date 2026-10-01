import type { AfterCheck, Severity, TicketKind, TicketScope, TicketStatus } from "./types";

export const TICKET_LIST_SELECT =
  "id, code, kind, category, status, severity, scope, address, unit_label, created_at, updated_at, sla_due_at, escalated, source, lat, lng, org_id, ward_id, assigned_to, photo_path, after_photo_path, rating, after_check, org:organizations(name, type), ward:wards(name, code)";

export interface TicketListRow {
  id: string;
  code: string;
  kind: TicketKind;
  category: string;
  status: TicketStatus;
  severity: Severity;
  scope: TicketScope;
  address: string | null;
  unit_label: string | null;
  created_at: string;
  updated_at: string;
  sla_due_at: string | null;
  escalated: boolean;
  source: "app" | "qr" | "guest";
  lat: number;
  lng: number;
  org_id: string | null;
  ward_id: string | null;
  assigned_to: string | null;
  photo_path: string | null;
  after_photo_path: string | null;
  rating: number | null;
  after_check: AfterCheck | null;
  org: { name: string; type: string } | null;
  ward: { name: string; code: string } | null;
}

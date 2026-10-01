export type PlatformRole = "citizen" | "worker" | "municipal_admin" | "super_admin";
export type OrgType = "society" | "college" | "public_place";
export type OrgStatus = "pending" | "approved" | "rejected";
export type MemberRole = "admin" | "member" | "staff";
export type MemberStatus = "pending" | "active" | "removed";
export type TicketKind = "issue" | "pickup";
export type TicketScope = "internal" | "municipal";
export type TicketStatus =
  | "submitted"
  | "assigned"
  | "in_progress"
  | "resolved"
  | "closed"
  | "reopened"
  | "rejected";
export type Severity = "low" | "medium" | "high";

export interface Profile {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  platform_role: PlatformRole;
  municipality_id: string | null;
  email_updates: boolean;
  email_notices: boolean;
  locale: "en" | "hi";
  created_at: string;
}

export interface Municipality {
  id: string;
  name: string;
  city: string;
  state: string;
}

export interface Ward {
  id: string;
  municipality_id: string;
  name: string;
  code: string;
  center_lat: number;
  center_lng: number;
}

export interface Organization {
  id: string;
  type: OrgType;
  name: string;
  address: string;
  lat: number;
  lng: number;
  ward_id: string | null;
  status: OrgStatus;
  reg_number: string | null;
  proof_path: string | null;
  email_domain: string | null;
  unit_count: number | null;
  invite_code: string;
  created_by: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  created_at: string;
}

export interface Membership {
  id: string;
  org_id: string;
  user_id: string;
  role: MemberRole;
  status: MemberStatus;
  unit_label: string | null;
  created_at: string;
}

export interface Invitation {
  id: string;
  org_id: string;
  email: string;
  unit_label: string | null;
  token: string;
  status: "pending" | "accepted" | "revoked";
  invited_by: string | null;
  expires_at: string;
  created_at: string;
}

export interface QrPoint {
  id: string;
  org_id: string;
  label: string;
  lat: number;
  lng: number;
  created_at: string;
}

export interface AiAnalysis {
  is_waste: boolean;
  category: string;
  severity: Severity;
  waste_types: string[];
  description: string;
  confidence: number;
}

export interface Ticket {
  id: string;
  code: string;
  kind: TicketKind;
  category: string;
  description: string;
  severity: Severity;
  scope: TicketScope;
  status: TicketStatus;
  source: "app" | "qr" | "guest";
  lat: number;
  lng: number;
  address: string | null;
  ward_id: string | null;
  org_id: string | null;
  qr_point_id: string | null;
  unit_label: string | null;
  reporter_id: string | null;
  assigned_to: string | null;
  photo_path: string | null;
  after_photo_path: string | null;
  ai: AiAnalysis | null;
  preferred_date: string | null;
  escalated: boolean;
  escalated_at: string | null;
  sla_due_at: string | null;
  resolved_at: string | null;
  closed_at: string | null;
  rating: number | null;
  scheduled_for: string | null;
  guest_contact: string | null;
  public_token: string;
  created_at: string;
  updated_at: string;
}

export interface TicketEvent {
  id: number;
  ticket_id: string;
  actor_id: string | null;
  from_status: TicketStatus | null;
  to_status: TicketStatus;
  note: string | null;
  created_at: string;
}

export interface Notice {
  id: string;
  org_id: string | null;
  municipality_id: string | null;
  title: string;
  body: string;
  author_id: string | null;
  created_at: string;
}

export type ActionState = { ok?: boolean; error?: string; message?: string } | null;

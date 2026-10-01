import "server-only";
import { Resend } from "resend";

const FROM = () => process.env.MAIL_FROM || "SafaiSetu <onboarding@resend.dev>";

/** Content of one email in the SafaiSetu layout. Every string is plain text; it is escaped here. */
export interface EmailContent {
  subject: string;
  heading: string;
  /** Paragraphs under the heading */
  body: string[];
  /** Label/value rows shown as a small table, e.g. Ticket · SS-1042 */
  details?: [label: string, value: string][];
  /** A quoted note from a person (reopen reason, rejection reason…) */
  quote?: { by: string; text: string };
  cta?: { label: string; url: string };
  footer?: string;
}

export interface OutgoingEmail extends EmailContent {
  to: string;
}

export function renderEmail(c: EmailContent) {
  const details = c.details?.length
    ? `<table role="presentation" style="width:100%;border-collapse:collapse;margin:0 0 24px;font-size:14px">${c.details
        .map(
          ([k, v]) =>
            `<tr><td style="padding:8px 0;border-top:1px solid #e6ebe0;color:#6b7a6c;width:38%">${escapeHtml(k)}</td><td style="padding:8px 0;border-top:1px solid #e6ebe0;color:#14201a;font-weight:600">${escapeHtml(v)}</td></tr>`,
        )
        .join("")}</table>`
    : "";
  const quote = c.quote
    ? `<div style="margin:0 0 24px;padding:12px 16px;border-left:3px solid #3f7a28;background:#f3f7ee;border-radius:6px"><div style="font-size:12px;color:#6b7a6c;margin-bottom:4px">${escapeHtml(c.quote.by)}</div><div style="font-size:15px;line-height:1.5;color:#14201a">${escapeHtml(c.quote.text)}</div></div>`
    : "";
  const cta = c.cta
    ? `<a href="${escapeHtml(c.cta.url)}" style="display:inline-block;background:#3f7a28;color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 24px;border-radius:9999px">${escapeHtml(c.cta.label)}</a>`
    : "";
  const footer = c.footer ?? "You're getting this because of your activity on SafaiSetu.";

  const html = `<div style="font-family:Inter,system-ui,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;color:#202020">
  <div style="font-weight:800;font-size:18px;letter-spacing:-0.03em;color:#3f7a28">SafaiSetu</div>
  <h1 style="font-size:24px;line-height:1.25;letter-spacing:-0.03em;margin:24px 0 12px;color:#090c1d">${escapeHtml(c.heading)}</h1>
  ${c.body.map((p) => `<p style="font-size:15px;line-height:1.55;color:#4b5b4e;margin:0 0 16px">${escapeHtml(p)}</p>`).join("")}
  ${quote}${details}${cta}
  <p style="font-size:12px;color:#838383;margin-top:32px">${escapeHtml(footer)}</p>
</div>`;

  const text = [
    c.heading,
    "",
    ...c.body,
    ...(c.quote ? ["", `${c.quote.by}: "${c.quote.text}"`] : []),
    ...(c.details?.length ? ["", ...c.details.map(([k, v]) => `${k}: ${v}`)] : []),
    ...(c.cta ? ["", `${c.cta.label}: ${c.cta.url}`] : []),
    "",
    footer,
  ].join("\n");

  return { html, text };
}

/**
 * Sends many emails with Resend's batch API (100 per request), so a notification to a
 * whole society is one API call, not one per person. Never throws: failures are logged.
 */
export async function sendEmails(emails: OutgoingEmail[]) {
  if (!emails.length) return { sent: 0 };
  if (!process.env.RESEND_API_KEY) {
    console.warn(`[email] RESEND_API_KEY not set; skipped ${emails.length} email(s)`);
    return { sent: 0 };
  }
  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = FROM();
  let sent = 0;
  for (let i = 0; i < emails.length; i += 100) {
    const chunk = emails.slice(i, i + 100);
    try {
      const { error } = await resend.batch.send(
        chunk.map((e) => ({ from, to: e.to, subject: e.subject, ...renderEmail(e) })),
      );
      if (error) console.error("[email] batch failed:", error.message);
      else {
        sent += chunk.length;
        if (process.env.NODE_ENV === "development")
          console.info(`[email] sent ${chunk.length}: ${chunk.map((e) => `${e.subject} → ${e.to}`).join("; ")}`);
      }
    } catch (e) {
      console.error("[email] batch failed:", e instanceof Error ? e.message : e);
    }
  }
  return { sent };
}

export async function sendInviteEmail(opts: {
  to: string;
  orgName: string;
  orgTypeLabel: string;
  inviterName: string;
  link: string;
}) {
  if (!process.env.RESEND_API_KEY) return { ok: false as const, error: "RESEND_API_KEY not set" };
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: FROM(),
    to: opts.to,
    subject: `${opts.inviterName} invited you to ${opts.orgName} on SafaiSetu`,
    ...renderEmail({
      subject: "",
      heading: `You're invited to ${opts.orgName}`,
      body: [
        `${opts.inviterName} added you to their ${opts.orgTypeLabel.toLowerCase()} on SafaiSetu. Report waste issues, request pickups and get collection notices in one place.`,
      ],
      cta: { label: "Accept invitation", url: opts.link },
      footer: "This link expires in 14 days. If you weren't expecting it, ignore this email.",
    }),
  });
  return error ? { ok: false as const, error: error.message } : { ok: true as const };
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

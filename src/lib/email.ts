import "server-only";
import { Resend } from "resend";

export async function sendInviteEmail(opts: {
  to: string;
  orgName: string;
  orgTypeLabel: string;
  inviterName: string;
  link: string;
}) {
  if (!process.env.RESEND_API_KEY) return { ok: false as const, error: "RESEND_API_KEY not set" };
  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = process.env.MAIL_FROM || "SafaiSetu <onboarding@resend.dev>";

  const { error } = await resend.emails.send({
    from,
    to: opts.to,
    subject: `${opts.inviterName} invited you to ${opts.orgName} on SafaiSetu`,
    text: `${opts.inviterName} invited you to join ${opts.orgName} (${opts.orgTypeLabel}) on SafaiSetu.\n\nReport waste issues, request pickups and follow notices from your ${opts.orgTypeLabel.toLowerCase()}.\n\nAccept the invitation: ${opts.link}\n\nThis link expires in 14 days.`,
    html: `<div style="font-family:Inter,system-ui,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#202020">
  <div style="font-family:Inter,system-ui,sans-serif;font-weight:800;font-size:18px;letter-spacing:-0.03em;color:#3f7a28">SafaiSetu</div>
  <h1 style="font-family:Inter,system-ui,sans-serif;font-size:26px;line-height:1.2;letter-spacing:-0.035em;margin:24px 0 12px;color:#090c1d">You're invited to ${escapeHtml(opts.orgName)}</h1>
  <p style="font-size:15px;line-height:1.5;color:#646464;margin:0 0 24px">${escapeHtml(opts.inviterName)} added you to their ${escapeHtml(opts.orgTypeLabel.toLowerCase())} on SafaiSetu. Report waste issues, request pickups and get collection notices in one place.</p>
  <a href="${opts.link}" style="display:inline-block;background:#3f7a28;color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 24px;border-radius:9999px">Accept invitation</a>
  <p style="font-size:12px;color:#838383;margin-top:32px">This link expires in 14 days. If you weren't expecting it, ignore this email.</p>
</div>`,
  });
  return error ? { ok: false as const, error: error.message } : { ok: true as const };
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

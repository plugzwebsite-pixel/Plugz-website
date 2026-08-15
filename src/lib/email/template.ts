import "server-only";

/** Minimal branded HTML email, with inline styles for client compatibility. */
export function renderEmail({
  heading,
  body,
  cta,
}: {
  heading: string;
  body: string;
  cta?: { label: string; url: string };
}): string {
  const button = cta
    ? `<a href="${cta.url}" style="display:inline-block;padding:14px 28px;border-radius:999px;background:linear-gradient(120deg,#FF2D9B,#A438FF,#FF8A2B);color:#fff;font-weight:700;text-decoration:none;font-size:15px">${cta.label}</a>`
    : "";
  const fallback = cta
    ? `<p style="color:#8a857e;font-size:13px;line-height:1.6;margin:24px 0 0">Or paste this link into your browser:<br><a href="${cta.url}" style="color:#A438FF;word-break:break-all">${cta.url}</a></p>`
    : "";

  return `<!doctype html><html><body style="margin:0;background:#0a0a0b;padding:40px 16px;font-family:'Hanken Grotesk',Helvetica,Arial,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;background:#17131a;border:1px solid rgba(255,255,255,0.08);border-radius:22px;overflow:hidden">
      <tr><td style="padding:36px 36px 8px">
        <div style="font-family:Georgia,serif;font-size:26px;font-weight:700;color:#fff">Plugg<span style="font-style:italic;background:linear-gradient(120deg,#FF2D9B,#A438FF,#FF8A2B);-webkit-background-clip:text;background-clip:text;color:transparent">z</span></div>
      </td></tr>
      <tr><td style="padding:16px 36px 0">
        <h1 style="font-family:Georgia,serif;font-size:24px;color:#fff;margin:0 0 12px">${heading}</h1>
        <p style="color:#b9b3ac;font-size:15px;line-height:1.7;margin:0 0 28px">${body}</p>
        ${button}
        ${fallback}
      </td></tr>
      <tr><td style="padding:32px 36px 36px">
        <hr style="border:none;border-top:1px solid rgba(255,255,255,0.08);margin:0 0 16px">
        <p style="color:#6b6660;font-size:12px;margin:0">Pluggz Ltd · The UK's curated creator directory</p>
      </td></tr>
    </table>
  </td></tr></table>
  </body></html>`;
}

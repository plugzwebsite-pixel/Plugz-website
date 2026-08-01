import "server-only";
import { randomUUID } from "crypto";
import { saveDevMail } from "./dev-store";
import { renderEmail } from "./template";

type SendArgs = {
  to: string;
  subject: string;
  heading: string;
  body: string;
  cta?: { label: string; url: string };
};

const provider = process.env.EMAIL_PROVIDER ?? "dev";
const from = process.env.EMAIL_FROM ?? "Pluggz <hello@pluggz.com>";

async function sendEmail({ to, subject, heading, body, cta }: SendArgs) {
  const html = renderEmail({ heading, body, cta });

  if (provider === "resend" && process.env.RESEND_API_KEY) {
    // Production path — Resend per the infrastructure proposal.
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({ from, to, subject, html });
    return;
  }

  // Dev path — log the link and capture it in the on-screen dev mailbox.
  if (cta?.url) {
    console.log(`\n📧 [dev email] ${subject} → ${to}\n   ${cta.url}\n`);
  }
  await saveDevMail({
    id: randomUUID(),
    to,
    subject,
    preview: body,
    link: cta?.url,
    sentAt: new Date().toISOString(),
  });
}

function appUrl(pathname: string) {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${base}${pathname}`;
}

export function sendVerificationEmail(to: string, name: string, token: string) {
  return sendEmail({
    to,
    subject: "Verify your Pluggz email",
    heading: `Welcome to Pluggz, ${name.split(" ")[0]}`,
    body: "Confirm your email address to activate your Pluggz account. This link expires in 24 hours.",
    cta: { label: "Verify email", url: appUrl(`/verify-email?token=${token}`) },
  });
}

export function sendPasswordResetEmail(to: string, name: string, token: string) {
  return sendEmail({
    to,
    subject: "Reset your Pluggz password",
    heading: `Password reset`,
    body: `Hi ${name.split(" ")[0]}, we received a request to reset your password. This link expires in 1 hour. If it wasn't you, you can safely ignore this email.`,
    cta: { label: "Reset password", url: appUrl(`/reset-password?token=${token}`) },
  });
}

export function sendCreatorInviteEmail(to: string, name: string, token: string) {
  return sendEmail({
    to,
    subject: "You've been invited to Pluggz",
    heading: `Rachel added you to Pluggz`,
    body: `Hi ${name.split(" ")[0]}, the Pluggz team has set up a creator profile for you. Set your password and release your profile to take it live. This link expires in 24 hours.`,
    cta: {
      label: "Set password & release profile",
      url: appUrl(`/reset-password?token=${token}&invite=1`),
    },
  });
}

export function sendWaitlistConfirmation(to: string, name: string) {
  return sendEmail({
    to,
    subject: "You're on the Pluggz waitlist",
    heading: `You're in, ${name.split(" ")[0]}`,
    body: "Thanks for registering your interest in Pluggz. We'll be in touch as soon as your spot opens up.",
  });
}

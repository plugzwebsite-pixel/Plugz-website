import "server-only";
import { promises as fs } from "fs";
import path from "path";
import os from "os";

export type DevMail = {
  id: string;
  to: string;
  subject: string;
  preview: string;
  link?: string;
  sentAt: string;
};

// Use the OS temp dir — writable everywhere, including serverless hosts whose
// project filesystem is read-only.
const FILE = path.join(os.tmpdir(), "pluggz-dev-mail.json");
const MAX = 50;

async function readAll(): Promise<DevMail[]> {
  try {
    const raw = await fs.readFile(FILE, "utf8");
    return JSON.parse(raw) as DevMail[];
  } catch {
    return [];
  }
}

export async function saveDevMail(mail: DevMail): Promise<void> {
  try {
    const all = await readAll();
    all.unshift(mail);
    await fs.writeFile(FILE, JSON.stringify(all.slice(0, MAX), null, 2), "utf8");
  } catch {
    // Non-fatal: capturing dev mail is best-effort only.
  }
}

export async function listDevMail(): Promise<DevMail[]> {
  return readAll();
}

export async function clearDevMail(): Promise<void> {
  await fs.writeFile(FILE, "[]", "utf8");
}

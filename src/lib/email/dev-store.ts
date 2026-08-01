import "server-only";
import { promises as fs } from "fs";
import path from "path";

export type DevMail = {
  id: string;
  to: string;
  subject: string;
  preview: string;
  link?: string;
  sentAt: string;
};

const FILE = path.join(process.cwd(), ".pluggz-dev-mail.json");
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
  const all = await readAll();
  all.unshift(mail);
  await fs.writeFile(FILE, JSON.stringify(all.slice(0, MAX), null, 2), "utf8");
}

export async function listDevMail(): Promise<DevMail[]> {
  return readAll();
}

export async function clearDevMail(): Promise<void> {
  await fs.writeFile(FILE, "[]", "utf8");
}

import fs from "fs/promises";
import path from "path";

export const VAULT_SEO_DIR = "/home/dscalez/vault/DSA_Dashboard/maquifit-seo";
export const STATE_FILE = path.join(VAULT_SEO_DIR, "workflow_state.json");
export const STATUS_FILE = path.join(VAULT_SEO_DIR, "status.json");
export const SETTINGS_FILE = path.join(VAULT_SEO_DIR, "settings.json");

export interface SeoStatus {
  status: "idle" | "running" | "completed" | "failed";
  step: string;
  progress: number;
  error?: string | null;
  lastRun?: string;
}

export interface SeoSettings {
  categories: string[]; // "product", "page", "post"
  schedule: string; // "daily" | "weekly" | "manual"
  dailyHour?: number; // 0-23
}

export async function ensureSeoDir() {
  await fs.mkdir(VAULT_SEO_DIR, { recursive: true });
}

export async function loadSeoState(): Promise<any> {
  await ensureSeoDir();
  try {
    const data = await fs.readFile(STATE_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return {
      generated_at: "",
      counts: { items: 0, recommendations: 0, changed: 0 },
      recommendations: []
    };
  }
}

export async function saveSeoState(state: any): Promise<void> {
  await ensureSeoDir();
  await fs.writeFile(STATE_FILE, JSON.stringify(state, null, 2), "utf-8");
}

export async function loadSeoStatus(): Promise<SeoStatus> {
  await ensureSeoDir();
  try {
    const data = await fs.readFile(STATUS_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return {
      status: "idle",
      step: "Idle",
      progress: 0
    };
  }
}

export async function saveSeoStatus(status: SeoStatus): Promise<void> {
  await ensureSeoDir();
  await fs.writeFile(STATUS_FILE, JSON.stringify(status, null, 2), "utf-8");
}

export async function loadSeoSettings(): Promise<SeoSettings> {
  await ensureSeoDir();
  try {
    const data = await fs.readFile(SETTINGS_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return {
      categories: ["product"],
      schedule: "daily",
      dailyHour: 2
    };
  }
}

export async function saveSeoSettings(settings: SeoSettings): Promise<void> {
  await ensureSeoDir();
  await fs.writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2), "utf-8");
}

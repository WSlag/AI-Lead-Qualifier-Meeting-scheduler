import type { LeadFormPayload } from "../types/lead";

const N8N_WEBHOOK_URL = import.meta.env.VITE_N8N_WEBHOOK_URL;
const N8N_SCHEDULE_WEBHOOK_URL = import.meta.env.VITE_N8N_SCHEDULE_WEBHOOK_URL;
const N8N_WEBHOOK_TOKEN = import.meta.env.VITE_N8N_WEBHOOK_TOKEN;

export function isN8nConfigured(): boolean {
  return Boolean(N8N_WEBHOOK_URL);
}

export interface SubmissionResult {
  ok: boolean;
  message: string;
  leadId?: string;
}

export async function submitLead(payload: LeadFormPayload): Promise<SubmissionResult> {
  if (!N8N_WEBHOOK_URL) {
    throw new Error(
      "n8n is not configured. Set the VITE_N8N_WEBHOOK_URL environment variable."
    );
  }
  const res = await fetch(N8N_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, token: N8N_WEBHOOK_TOKEN }),
  });
  if (!res.ok) {
    throw new Error(`The workflow rejected the request (${res.status}).`);
  }
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  const leadId = typeof data.leadId === "string" ? data.leadId : undefined;
  const message =
    typeof data.message === "string" ? data.message : "Lead qualification complete.";
  return { ok: true, message, leadId };
}

export interface SchedulePayload {
  leadId: string;
  meetingStart: string;
  meetingDurationMinutes?: number;
  name: string;
  email: string;
  company?: string;
  score: number;
  priority: string;
  intent: string;
  summary: string;
  recommendedAction: string;
  source: string;
}

export async function scheduleDiscoveryCall(
  payload: SchedulePayload
): Promise<SubmissionResult> {
  if (!N8N_SCHEDULE_WEBHOOK_URL) {
    throw new Error(
      "Scheduling is not configured. Set the VITE_N8N_SCHEDULE_WEBHOOK_URL environment variable."
    );
  }
  const res = await fetch(N8N_SCHEDULE_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, token: N8N_WEBHOOK_TOKEN }),
  });
  if (!res.ok) {
    throw new Error(`The scheduling workflow rejected the request (${res.status}).`);
  }
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  const message =
    typeof data.message === "string" ? data.message : "Discovery call scheduled.";
  return { ok: true, message };
}
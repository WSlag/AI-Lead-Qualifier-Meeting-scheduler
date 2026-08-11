export const PRIORITIES = ["LOW", "MEDIUM", "HIGH"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const STATUSES = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "DISQUALIFIED",
] as const;
export type LeadStatus = (typeof STATUSES)[number];

export const MEETING_STATUSES = [
  "NONE",
  "SCHEDULED",
  "FAILED",
  "NOT_REQUIRED",
] as const;
export type MeetingStatus = (typeof MEETING_STATUSES)[number];

export interface Lead {
  id: string;
  name: string;
  email: string;
  company?: string;
  message: string;
  score: number;
  priority: Priority;
  intent: string;
  summary: string;
  recommendedAction: string;
  status: LeadStatus;
  source?: string;
  createdAt: string;
  updatedAt: string;

  activityLogged?: boolean;
  calendarEventCreated?: boolean;
  calendarEventId?: string | null;
  calendarEventUrl?: string | null;
  meetingStatus?: MeetingStatus;
}

export interface LeadFormPayload {
  name: string;
  email: string;
  company?: string;
  message: string;
}

export interface LeadQualification {
  score: number;
  priority: Priority;
  intent: string;
  summary: string;
  recommendedAction: string;
}

export function isPriority(value: string): value is Priority {
  return (PRIORITIES as readonly string[]).includes(value);
}

export function isMeetingStatus(value: string): value is MeetingStatus {
  return (MEETING_STATUSES as readonly string[]).includes(value);
}

export function isLeadStatus(value: string): value is LeadStatus {
  return (STATUSES as readonly string[]).includes(value);
}
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  doc,
  getDoc,
  updateDoc,
  limit,
  getDocs,
  type DocumentData,
} from "firebase/firestore";
import { getDb, isFirebaseConfigured } from "./firebase";
import { isMeetingStatus, isPriority, isLeadStatus, type Lead, type LeadStatus, type MeetingStatus } from "../types/lead";

const LEADS = "leads";

function asDate(data: Record<string, unknown>, key: string): string {
  const v = data[key];
  if (v != null && typeof v === "object" && "toDate" in v) {
    return String((v as { toDate: () => Date }).toDate().toISOString());
  }
  return String(v ?? new Date().toISOString());
}

function toLead(id: string, data: DocumentData): Lead {
  const priority = String(data.priority ?? "LOW").toUpperCase();
  const status = String(data.status ?? "NEW").toUpperCase();
  const meetingStatus = String(data.meetingStatus ?? "NONE").toUpperCase();
  return {
    id,
    name: String(data.name ?? ""),
    email: String(data.email ?? ""),
    company: data.company ? String(data.company) : undefined,
    message: String(data.message ?? ""),
    score: Number(data.score ?? 0),
    priority: isPriority(priority) ? priority : "LOW",
    intent: String(data.intent ?? ""),
    summary: String(data.summary ?? ""),
    recommendedAction: String(data.recommendedAction ?? ""),
    status: isLeadStatus(status) ? (status as LeadStatus) : "NEW",
    source: data.source ? String(data.source) : undefined,
    createdAt: asDate(data, "createdAt"),
    updatedAt: asDate(data, "updatedAt"),
    activityLogged: Boolean(data.activityLogged),
    calendarEventCreated: Boolean(data.calendarEventCreated),
    calendarEventId: data.calendarEventId ? String(data.calendarEventId) : null,
    calendarEventUrl: data.calendarEventUrl ? String(data.calendarEventUrl) : null,
    meetingStatus: isMeetingStatus(meetingStatus) ? (meetingStatus as MeetingStatus) : "NONE",
  };
}

export function subscribeLeads(onLeads: (leads: Lead[]) => void, onError: (err: Error) => void) {
  if (!isFirebaseConfigured()) {
    onError(new Error("Firebase is not configured."));
    return () => undefined;
  }
  const q = query(
    collection(getDb(), LEADS),
    orderBy("createdAt", "desc"),
    limit(200)
  );
  return onSnapshot(
    q,
    (snap) => {
      const leads = snap.docs.map((d) =>
        toLead(d.id, d.data())
      );
      onLeads(leads);
    },
    onError
  );
}

export async function fetchLead(id: string): Promise<Lead | null> {
  if (!isFirebaseConfigured()) return null;
  const ref = doc(collection(getDb(), LEADS), id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return toLead(snap.id, snap.data());
}

export async function updateLeadStatus(id: string, status: LeadStatus): Promise<void> {
  if (!isFirebaseConfigured()) throw new Error("Firebase is not configured.");
  await updateDoc(doc(collection(getDb(), LEADS), id), {
    status,
    updatedAt: new Date(),
  });
}

export async function listLeads(): Promise<Lead[]> {
  if (!isFirebaseConfigured()) return [];
  const q = query(
    collection(getDb(), LEADS),
    orderBy("createdAt", "desc"),
    limit(200)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => toLead(d.id, d.data()));
}
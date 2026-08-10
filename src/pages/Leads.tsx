import { useEffect, useState } from "react";
import { subscribeLeads } from "../services/leads";
import type { Lead } from "../types/lead";
import { LeadTable } from "../components/LeadTable";
import { LoadingState } from "../components/LoadingState";
import { EmptyState, ErrorState } from "../components/EmptyState";

export function Leads() {
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const unsub = subscribeLeads(
      (next) => {
        setLeads(next);
        setError(null);
      },
      (err) => setError(err)
    );
    return unsub;
  }, []);

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink">Leads</h1>
        <p className="mt-0.5 text-sm text-muted">
          All qualified leads with AI scoring and meeting status.
        </p>
      </div>

      {error ? (
        <ErrorState
          title="Leads unavailable"
          description="Firebase is not configured. Add the VITE_FIREBASE_* variables to connect to Firestore."
        />
      ) : leads === null ? (
        <LoadingState rows={8} />
      ) : leads.length === 0 ? (
        <EmptyState
          title="No leads yet"
          description="Qualified leads will appear here once submitted."
        />
      ) : (
        <LeadTable leads={leads} />
      )}
    </div>
  );
}
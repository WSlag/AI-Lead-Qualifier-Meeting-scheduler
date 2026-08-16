import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Loader2 } from "lucide-react";
import { isN8nConfigured, submitLead } from "../services/api";
import type { LeadFormPayload } from "../types/lead";

type FormState =
  | { phase: "idle" | "submitting" }
  | { phase: "success"; message: string; leadId?: string }
  | { phase: "error"; message: string };

interface FieldErrors {
  name?: string;
  email?: string;
  message?: string;
}

function validate(payload: LeadFormPayload): FieldErrors {
  const errors: FieldErrors = {};
  if (!payload.name.trim()) errors.name = "Name is required.";
  if (!payload.email.trim()) {
    errors.email = "Email is required.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email.trim())) {
    errors.email = "Enter a valid email address.";
  }
  if (!payload.message.trim()) errors.message = "Message is required.";
  return errors;
}

export function NewLead() {
  const [state, setState] = useState<FormState>({ phase: "idle" });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [form, setForm] = useState<LeadFormPayload>({
    name: "",
    email: "",
    company: "",
    message: "",
  });
  const formRef = useRef<HTMLFormElement>(null);

  const submitting = state.phase === "submitting";

  function handleChange(field: keyof LeadFormPayload) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const fieldErrors = validate(form);
    setErrors(fieldErrors);
    if (Object.values(fieldErrors).some(Boolean)) return;

    setState({ phase: "submitting" });
    try {
      const result = await submitLead(form);
      setState({ phase: "success", message: result.message, leadId: result.leadId });
      formRef.current?.reset();
    } catch (err) {
      setState({
        phase: "error",
        message:
          err instanceof Error ? err.message : "Unable to qualify this lead.",
      });
    }
  }

  const inputClass = (invalid?: string) =>
    `w-full rounded-lg border bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted focus:outline-none ${
      invalid ? "border-danger" : "border-line"
    }`;

  if (state.phase === "success") {
    return (
      <div className="animate-fade-in mx-auto max-w-xl space-y-6">
        <div className="flex flex-col items-center rounded-xl border border-line bg-surface px-6 py-12 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-success-soft text-success">
            <CheckCircle2 className="h-6 w-6" aria-hidden />
          </span>
          <h1 className="mt-4 text-lg font-semibold text-ink">
            Lead qualified successfully.
          </h1>
          <p className="mt-1 text-sm text-muted">{state.message}</p>
          {state.leadId ? (
            <Link
              to={`/leads/${state.leadId}`}
              className="mt-6 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90"
            >
              View Lead
            </Link>
          ) : (
            <Link
              to="/leads"
              className="mt-6 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90"
            >
              View Leads
            </Link>
          )}
          <button
            type="button"
            onClick={() => setState({ phase: "idle" })}
            className="mt-3 text-sm font-medium text-primary hover:underline"
          >
            Add another lead
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink">Customer Form</h1>
        <p className="mt-0.5 text-sm text-muted">
          Capture a lead and qualify it with AI.
        </p>
      </div>

      <form
        ref={formRef}
        onSubmit={handleSubmit}
        noValidate
        className="space-y-5 rounded-xl border border-line bg-surface p-6"
      >
        <div className="space-y-1.5">
          <label htmlFor="name" className="block text-sm font-medium text-ink">
            Name <span className="text-danger">*</span>
          </label>
          <input
            id="name"
            type="text"
            value={form.name}
            onChange={handleChange("name")}
            className={inputClass(errors.name)}
            placeholder="Jane Smith"
            aria-invalid={Boolean(errors.name)}
          />
          {errors.name ? (
            <p className="text-xs text-danger">{errors.name}</p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="email" className="block text-sm font-medium text-ink">
            Email <span className="text-danger">*</span>
          </label>
          <input
            id="email"
            type="email"
            value={form.email}
            onChange={handleChange("email")}
            className={inputClass(errors.email)}
            placeholder="jane@acme.com"
            aria-invalid={Boolean(errors.email)}
          />
          {errors.email ? (
            <p className="text-xs text-danger">{errors.email}</p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="company" className="block text-sm font-medium text-ink">
            Company
          </label>
          <input
            id="company"
            type="text"
            value={form.company}
            onChange={handleChange("company")}
            className={inputClass()}
            placeholder="Acme Corp"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="message" className="block text-sm font-medium text-ink">
            Message <span className="text-danger">*</span>
          </label>
          <textarea
            id="message"
            rows={4}
            value={form.message}
            onChange={handleChange("message")}
            className={inputClass(errors.message)}
            placeholder="We need help automating our sales process."
            aria-invalid={Boolean(errors.message)}
          />
          {errors.message ? (
            <p className="text-xs text-danger">{errors.message}</p>
          ) : null}
        </div>

        {state.phase === "error" ? (
          <div className="rounded-lg border border-line bg-canvas px-4 py-3 text-sm text-danger">
            Unable to qualify this lead. {state.message === "Unable to qualify this lead." ? "" : state.message}{" "}
            Please try again.
          </div>
        ) : null}

        {!isN8nConfigured() ? (
          <p className="rounded-lg border border-warning/40 bg-warning-soft px-4 py-3 text-sm text-warning">
            n8n is not configured. Set VITE_N8N_WEBHOOK_URL to enable submissions.
          </p>
        ) : null}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {submitting ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Qualifying…
            </span>
          ) : (
            "Send"
          )}
        </button>

        {submitting ? (
          <ul className="space-y-1 text-xs text-muted">
            <li>• Sending lead…</li>
            <li>• Analyzing with AI…</li>
            <li>• Saving result…</li>
          </ul>
        ) : null}
      </form>
    </div>
  );
}
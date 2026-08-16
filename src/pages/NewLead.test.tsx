import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { NewLead } from "./NewLead";
import { isMeetingStatus, isPriority, isLeadStatus } from "../types/lead";

function renderPage() {
  return render(
    <MemoryRouter>
      <NewLead />
    </MemoryRouter>
  );
}

describe("NewLead form validation", () => {
  it("shows validation errors for an empty form", async () => {
    renderPage();
    await userEvent.click(screen.getByRole("button", { name: "Send" }));
    expect(await screen.findByText("Name is required.")).toBeInTheDocument();
    expect(screen.getByText("Email is required.")).toBeInTheDocument();
    expect(screen.getByText("Message is required.")).toBeInTheDocument();
  });

  it("rejects an invalid email", async () => {
    renderPage();
    await userEvent.type(screen.getByLabelText("Name *"), "John Smith");
    await userEvent.type(screen.getByLabelText("Email *"), "not-an-email");
    await userEvent.type(screen.getByLabelText("Message *"), "We need automation.");
    await userEvent.click(screen.getByRole("button", { name: "Send" }));
    expect(await screen.findByText("Enter a valid email address.")).toBeInTheDocument();
  });

  it("clears a field error once corrected", async () => {
    renderPage();
    await userEvent.click(screen.getByRole("button", { name: "Send" }));
    expect(await screen.findByText("Name is required.")).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("Name *"), "John Smith");
    expect(screen.queryByText("Name is required.")).not.toBeInTheDocument();
  });
});

describe("lead type guards", () => {
  it("recognizes valid priorities and rejects invalid ones", () => {
    expect(isPriority("HIGH")).toBe(true);
    expect(isPriority("MEDIUM")).toBe(true);
    expect(isPriority("LOW")).toBe(true);
    expect(isPriority("URGENT")).toBe(false);
  });

  it("recognizes valid statuses and meeting statuses", () => {
    expect(isLeadStatus("NEW")).toBe(true);
    expect(isLeadStatus("CONTACTED")).toBe(true);
    expect(isLeadStatus("SOMETHING")).toBe(false);
    expect(isMeetingStatus("SCHEDULED")).toBe(true);
    expect(isMeetingStatus("NOT_REQUIRED")).toBe(true);
    expect(isMeetingStatus("X")).toBe(false);
  });
});
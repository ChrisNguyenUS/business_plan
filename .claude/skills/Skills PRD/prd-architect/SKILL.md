---
name: the1ight:prd-architect
author: The1ight
description: Use when writing a PRD, product spec, or system architecture document. Triggers on: PRD, product requirement, feature spec, viết PRD, tạo PRD, system design, L0-L4 flows, "I have an idea for", "help me spec out", "write requirements for".
---

# PRD Architect

Three phases: Brainstorm → PRD with Architecture Flows (L0–L3) → L4 Technical Workflows (conditional).

## Phase 1: Brainstorm

Ask only what you genuinely can't infer — max 1 message, max 4 questions:

1. **Problem & User**: Who has this problem and why does it hurt?
2. **Core magic**: The ONE thing that makes this special?
3. **Scope**: MVP/V1 or full product vision?
4. **Language**: Vietnamese, English, or other?

Fill the rest yourself: infer personas, generate user stories, propose tech constraints, suggest KPIs. Present a brief summary back before writing — "Here's what I'm thinking, does this capture it?" Keep it conversational, not a wall of text.

## Phase 2: PRD + Architecture Flows (L0–L3)

Follow `references/prd-template.md` for full structure.

For each major feature flow, include an **Architecture Flows** section inside the PRD:

| Level | What | Format |
|-------|------|--------|
| L0 | Intent & Outcome — pure business, zero tech language | Bullet text |
| L1 | Business Flow — actors, process steps in sequence | Numbered list |
| L2 | User Flow — screens, user actions, happy path | **Mermaid flowchart** |
| L3 | System Flow — components, services, data stores, APIs | **Mermaid flowchart** |

**L2 and L3 must always be Mermaid diagrams — never text-only.**
One diagram replaces 20 lines of prose and can be verified at a glance. Text-only L2/L3 is an incomplete deliverable.

## Phase 3: L4 Technical Workflows (conditional)

L4 is **required** when any flow contains at least one of:

| Trigger | Examples |
|---------|----------|
| Async / background processing | Cron jobs, queues, background workers |
| External service with failure modes | Push notifications, payments, email/SMS, webhooks |
| Idempotency requirements | Prevent duplicate jobs, double-charges |
| Concurrent writes | Real-time sync, multi-user sessions |
| Multi-step state machine | pending → processing → sent → failed |

**Skip L4 when:** simple CRUD (no side effects), read-only displays (charts, history), pure UI flows (settings, profile edit).

When triggered, create a separate `[feature-name]-L4.md` with exactly four workflows — each as a `flowchart TD` Mermaid diagram:

1. **Happy Path** — normal end-to-end execution
2. **Error & Retry** — failure handling, retry logic, status updates
3. **Idempotency & Concurrency** — duplicate prevention, race condition guards
4. **Edge Cases** — pause, cancel, edit-after-create, timeout, empty result

See `references/l4-guide.md` for Mermaid patterns and structure conventions.

## Output

| File | When |
|------|------|
| `[product-name]-prd.md` | Always |
| `[feature-name]-L4.md` | Only when L4 triggers apply |

After writing, highlight Open Questions that need user input. No document summary — they can read it themselves.

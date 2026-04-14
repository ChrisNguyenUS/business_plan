# L4 Technical Workflows — Guide & Patterns

L4 zooms into the technical engine of a single feature. It answers:
**"When things go wrong at the code level, what exactly happens?"**

---

## When L4 Is Required

Required when any flow in the PRD has at least one of:

| Trigger | Signal |
|---------|--------|
| Async / background processing | Cron, queue, worker, scheduler |
| External service with failure modes | Push, payment, email/SMS, webhook |
| Idempotency requirements | Must not run twice / charge twice |
| Concurrent writes | Two users or processes writing same record |
| Multi-step state machine | Row transitions: pending → sent → failed |

Skip for: CRUD screens, read-only views, settings pages, profile forms.

---

## File Structure

One `[feature-name]-L4.md` per major feature that triggers L4.

Each file contains exactly **four flowcharts** in order:

1. Happy Path
2. Error & Retry
3. Idempotency & Concurrency
4. Edge Cases

---

## Flow 1 — Happy Path

Normal execution from trigger to success. No errors, no edge cases.
Shows: trigger → processing steps → success state.

```mermaid
flowchart TD
    Trigger["Trigger\n(e.g., Cron / API call / User action)"]
        --> Process["Core Process\n(e.g., Edge Function name)"]

    Process --> DataSource[("Data Source\n(e.g., table name)")]
    Process --> Check{"Pre-condition check\n(e.g., already exists?)"}

    Check -->|Pass| Execute["Execute main action\n(e.g., send notification)"]
    Check -->|Skip| Done["No-op — skip"]

    Execute -->|Success| UpdateState["Update state\n(e.g., status = sent)"]
    UpdateState --> End["Done"]
```

---

## Flow 2 — Error & Retry

What happens on failure. Shows: failure detection → retry logic → terminal states.

```mermaid
flowchart TD
    Pending["Job / Task\nstatus = pending"]
        --> Attempt["Attempt execution"]

    Attempt -->|Success| Sent["status = sent / completed"]
    Attempt -->|Fail| CheckRetry{"attempts < max_retries?"}

    CheckRetry -->|Yes| Increment["attempts += 1\nschedule retry"]
    CheckRetry -->|No| Failed["status = failed\nlog error"]

    Increment --> WaitNext["Wait for next trigger cycle"]
```

Key decisions to show:
- What counts as a failure (timeout, error code, exception)
- Retry limit and backoff strategy
- Terminal failure state and alerting

---

## Flow 3 — Idempotency & Concurrency

Prevents duplicate execution when two processes run simultaneously or when a trigger fires twice.

```mermaid
flowchart TD
    InstanceA["Process Instance A"]
        --> TryInsert1["Attempt: insert job record"]

    InstanceB["Process Instance B"]
        --> TryInsert2["Attempt: insert job record"]

    TryInsert1 --> UniqueConstraint[("DB: unique constraint\n(e.g., schedule_id + trigger_time)")]
    TryInsert2 --> UniqueConstraint

    UniqueConstraint -->|First write wins| Created["Record created — proceed"]
    UniqueConstraint -->|Duplicate rejected| Ignored["Duplicate — silently skip"]

    Created --> Lock["Acquire row-level lock\n(SELECT FOR UPDATE)"]
    Lock --> Execute["Execute once"]
```

Key mechanisms to show:
- Unique constraint definition (which fields form the natural key)
- Row-level locking if needed
- Duplicate detection and silent skip pattern

---

## Flow 4 — Edge Cases

User-initiated state changes that affect in-flight jobs. The cases that cause the most bugs in production.

Show each relevant case as a separate subflow within the same diagram, or split into multiple diagrams if the file gets long.

**Common edge cases:**

```mermaid
flowchart TD
    %% --- Case: User edits active record ---
    UserEdits["User edits schedule / config"]
        --> UpdateRecord["Update source record"]
    UpdateRecord --> Recalculate["Recalculate future trigger times"]
    Recalculate --> NewJobs["Create new jobs (future only)"]

    ExistingJobs["Existing pending jobs"]
        --> KeepOrCancel{"Policy: keep or cancel?"}
    KeepOrCancel -->|MVP: keep| StillRun["Jobs may still execute"]
    KeepOrCancel -->|Strict: cancel| Cancel["Mark jobs as cancelled"]

    %% --- Case: User disables / pauses ---
    UserDisables["User toggles OFF"]
        --> SetInactive["Set is_active = false"]
    SetInactive --> CronSkips["Cron skips this record"]
    CronSkips --> NoNewJobs["No new jobs created"]

    OldPending["Existing pending jobs"]
        --> MVPBehavior["MVP: may still execute\n(accepted tradeoff)"]
```

---

## Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| L4 file | `[feature-name]-L4.md` | `reminder-system-L4.md` |
| Diagram comment header | `%% Flow N — [name]` | `%% Flow 1 — Happy Path` |
| Node labels | `["Short description\n(detail)"]` | `["Edge Function:\ngenerate_jobs"]` |
| Database nodes | `[("table name")]` | `[("reminder_jobs")]` |
| Decision nodes | `{"Question?"}` | `{"attempts < max?"}` |

---

## Mermaid Quick Reference

```
flowchart TD               — top-down layout (default for L4)
flowchart LR               — left-right (use for wide state machines)

Node["Label"]              — rectangle (process / action)
Node[("Label")]            — cylinder (database / data store)
Node{"Label"}              — diamond (decision)
Node(["Label"])            — rounded rect (start / end)

-->                        — arrow
-->|"label"|               — labeled arrow
%% comment                 — inline comment
```

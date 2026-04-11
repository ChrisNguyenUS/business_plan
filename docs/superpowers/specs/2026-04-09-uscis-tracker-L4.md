# USCIS Case Status Tracker — L4 Technical Workflows

**Feature:** Daily USCIS polling — Playwright browser automation bot
**Parent PRD:** `2026-04-09-mos-internal-staff-app-prd.md`
**Date:** April 9, 2026

L4 is required because this feature contains:
- Async / background processing (daily cron job on dedicated VPS)
- External service with failure modes (USCIS website — UI may change, CAPTCHA risk)
- Multi-step state machine (`case_forms.current_uscis_status` transitions)
- Idempotency requirement (same receipt number must not log duplicate status entries for the same poll cycle)

**Implementation:** Playwright (Node.js) bot on a ~$5/mo DigitalOcean VPS with a static IP. Navigates `egov.uscis.gov/casestatus/mycasestatus.do`, fills in each receipt number, scrapes the status text from the result page. All scraping logic lives behind a `USCISClient` interface so the official Torch API can be swapped in as a drop-in replacement later.

---

## Flow 1 — Happy Path

Normal execution: cron fires, Playwright opens USCIS site, checks each receipt number, logs any status changes, notifies staff.

```mermaid
flowchart TD
    Cron["Cron Trigger\n(daily, 6:00 AM CT)\nNode.js cron on VPS"]
        --> Auth["Verify internal cron secret\n(prevent unauthorized triggers)"]

    Auth --> FetchActive["SELECT case_forms\nWHERE receipt_number IS NOT NULL\nAND current_uscis_status NOT IN\n(approved, denied, archived)"]

    FetchActive --> ActiveList[("DB: case_forms\n(active records)")]
    ActiveList --> LaunchBrowser["Playwright: launch Chromium\n(headless)"]

    LaunchBrowser --> Loop["For each case_form record\n(2–5s random delay between requests)"]

    Loop --> CheckLock{"Poll lock exists\nfor today?"}
    CheckLock -->|Already polled today| Skip["Skip — idempotency guard"]
    CheckLock -->|Not yet| AcquireLock["INSERT poll_log\n(case_form_id, poll_date=today)\nON CONFLICT DO NOTHING\nRETURNING id"]

    AcquireLock --> Navigate["Playwright: goto\negov.uscis.gov/casestatus/mycasestatus.do"]
    Navigate --> FillForm["Playwright: fill #receipt-number input\nwith receipt_number\nclick #check-status button"]
    FillForm --> WaitResult["Playwright: waitForSelector\n#receipt-status or .error-code"]

    WaitResult --> DetectCaptcha{"CAPTCHA\ndetected?"}
    DetectCaptcha -->|Yes| CaptchaAlert["Log: poll_log.error = captcha\nINSERT system_alert notification\nto admin\nSkip remaining records for today"]
    DetectCaptcha -->|No| ScrapeStatus["Playwright: extract innerText\nfrom status element"]

    ScrapeStatus --> Compare{"scraped_status\n== current_uscis_status?"}

    Compare -->|No change| LogChecked["INSERT status_history\n(status, source=playwright, changed=false)"]
    Compare -->|Changed| WriteHistory["INSERT status_history\n(new status, checked_at,\nsource=playwright, changed=true)"]

    WriteHistory --> UpdateForm["UPDATE case_forms\nSET current_uscis_status = new_status"]
    UpdateForm --> CreateNotif["INSERT notifications\n(staff_id, case_id, message, read=false)"]

    CreateNotif --> Terminal{"new_status IN\n(approved, denied)?"}
    Terminal -->|Yes| ArchiveCase["UPDATE cases\nSET status = archived"]
    Terminal -->|No| NextRecord["Process next case_form"]

    LogChecked --> NextRecord
    ArchiveCase --> NextRecord
    NextRecord --> AllDone["Close browser\nCron job complete"]
```

---

## Flow 2 — Error & Retry

Playwright failure handling: USCIS page changes, network errors, CAPTCHA, unexpected page content.

```mermaid
flowchart TD
    PollAttempt["Playwright attempt:\nnavigate → fill → submit → waitForSelector"]

    PollAttempt -->|Status element found, text extracted| ParseSuccess["Extract status text — proceed to Flow 1"]

    PollAttempt -->|Navigation timeout > 15s| Timeout["Log: poll_log.error = 'navigation_timeout'\nDo NOT update status_history"]
    PollAttempt -->|Expected selector not found| SelectorMiss["Log: poll_log.error = 'selector_not_found'\nStore page HTML snapshot for debugging"]
    PollAttempt -->|CAPTCHA detected| CaptchaBlock["Log: poll_log.error = 'captcha'\nINSERT system_alert to admin\nAbort remaining records today"]
    PollAttempt -->|'Case Not Found' text in result| NotFound["Log: status = 'not_found'\nINSERT notification: 'Receipt not found — verify with client'"]

    Timeout --> IncrementFails["UPDATE poll_log\nSET fail_count += 1"]
    SelectorMiss --> IncrementFails

    IncrementFails --> CheckFailCount{"fail_count\n>= 3 consecutive days?"}

    CheckFailCount -->|No| WaitNext["Skip today — retry next cron cycle\n(natural 24h retry)"]
    CheckFailCount -->|Yes| StructureAlert["INSERT system_alert notification to admin:\n'USCIS page structure may have changed —\ncheck scraper selectors'\nLink to HTML snapshot in Supabase Storage"]

    StructureAlert --> ContinueOtherRecords["Continue processing other receipt numbers"]
    WaitNext --> ContinueOtherRecords
    NotFound --> ContinueOtherRecords
```

**Retry strategy:** No same-day retry. The cron fires once daily. Transient failures self-heal on the next cycle. After 3 consecutive failures on the same receipt number, admin is alerted with an HTML snapshot to diagnose whether the USCIS page structure changed. CAPTCHA aborts the entire run immediately (all records safe — no partial state).

---

## Flow 3 — Idempotency & Concurrency

Prevents duplicate status log entries if the cron fires twice, or if a VPS restart causes the job to re-run mid-execution.

```mermaid
flowchart TD
    InstanceA["Cron Run A\n(normal daily trigger)"]
        --> TryInsertA["INSERT INTO poll_log\n(case_form_id, poll_date=today)\nON CONFLICT (case_form_id, poll_date)\nDO NOTHING\nRETURNING id"]

    InstanceB["Cron Run B\n(duplicate trigger / restart)"]
        --> TryInsertB["INSERT INTO poll_log\n(case_form_id, poll_date=today)\nON CONFLICT (case_form_id, poll_date)\nDO NOTHING\nRETURNING id"]

    PollLogTable[("DB: poll_log\nUNIQUE (case_form_id, poll_date)")]

    TryInsertA --> PollLogTable
    TryInsertB --> PollLogTable

    PollLogTable -->|Run A wins — row created| ProceedA["Run A: launch Playwright\npoll USCIS for this receipt"]
    PollLogTable -->|Run B — conflict, RETURNING empty| SkipB["Run B: RETURNING id = null\n→ silently skip this receipt\n(already polled today)"]

    ProceedA --> WriteStatusHistory[("DB: status_history\nINSERT — append only\npoll_log prevents duplicate writes")]
```

**Natural key:** `(case_form_id, poll_date)` in `poll_log`.
**Mechanism:** PostgreSQL `ON CONFLICT DO NOTHING` — atomic at the DB level, no application-level lock needed. Works correctly even if the VPS restarts mid-run.

---

## Flow 4 — Edge Cases

User-initiated changes that affect in-flight polling: no receipt yet, manual archive, corrected receipt number, USCIS page returning unexpected states.

```mermaid
flowchart TD
    %% --- Edge Case A: No receipt number yet ---
    CaseSubmitted["Case status = Submitted\n(awaiting physical receipt notice)"]
        --> NoReceipt{"receipt_number\nIS NULL?"}

    NoReceipt -->|Yes| SkipPoll["Cron skips — nothing to check\nNo error, no log entry"]
    NoReceipt -->|No| PollNormally["Poll normally (Flow 1)"]

    %% --- Edge Case B: Staff manually archives case ---
    StaffArchive["Staff sets case status = archived\n(e.g., client withdrew, case dismissed)"]
        --> SetArchived["UPDATE cases SET status = archived\nUPDATE case_forms SET current_uscis_status = archived"]

    SetArchived --> CronSkips["Next cron run:\nrecord excluded from SELECT\n(status = archived)\n→ Playwright never opens this receipt again"]

    %% --- Edge Case C: Staff corrects wrong receipt number ---
    WrongReceipt["Staff entered wrong receipt number\n(typo or wrong case)"]
        --> EditReceipt["Staff edits receipt_number on case_form"]

    EditReceipt --> DeletePollLog["DELETE FROM poll_log\nWHERE case_form_id = :id AND poll_date = today\n(reset today's idempotency guard)"]
    DeletePollLog --> ValidateFormat{"New receipt passes\n3-letter + 10 digit check?"}
    ValidateFormat -->|No| FormatError["Show error — do not save"]
    ValidateFormat -->|Yes| SaveReceipt["Save new receipt_number\nPolled on next cron cycle"]

    %% --- Edge Case D: USCIS shows 'Case Not Found' ---
    PlaywrightSees["Playwright reads result page:\n'Case Not Found' or error banner"]
        --> LogNotFound["INSERT status_history\n(status='not_found', source=playwright)"]
    LogNotFound --> NotifyStaff["INSERT notification:\n'Receipt :number returned Not Found —\nverify with client or wait if recently filed'"]
    NotifyStaff --> KeepPolling["Continue polling next cycle\n(may be too early post-submission)"]
```

---

*Manna One Solution — One Stop, All Solutions.*

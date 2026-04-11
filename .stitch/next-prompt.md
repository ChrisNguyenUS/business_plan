---
page: audit-log
---
An audit log viewer screen for the Manna One Solution Internal Staff App — Ultimate Admin only. Searchable, filterable table of all system changes (PRD Story 13). Desktop-first layout.

**DESIGN SYSTEM (REQUIRED):**
- Platform: Web, Desktop-first (min-width 1280px)
- Palette: Manna Teal (#3AAFB9) for primary actions, Deep Teal (#2D8E96) for hover, Charcoal (#2C2C2C) for sidebar/headings, White (#FFFFFF) card surfaces on Light Gray (#F1F3F5) backgrounds, Near Black (#212529) for text, Green (#16A34A) for success, Amber (#D97706) for warnings, Red (#DC2626) for errors
- Typography: Inter font family, Semi-Bold for headings, Regular for body, clean geometric forms
- Styles: 8px rounded corners on cards/buttons/inputs, 1px #E5E7EB borders, subtle box-shadow on hover, minimal elevation
- Layout: Dark charcoal sidebar navigation with white text and teal active indicator, logo at sidebar top, light gray content area with white card containers
- Personality: Premium, trustworthy, efficient — clean surfaces, purposeful whitespace, teal used sparingly for focus. Professional corporate aesthetic.

**Page Structure:**
1. Left sidebar: Settings > Audit Log active. Admin nav.
2. Top bar: "Audit Log" title with lock icon (append-only indicator). Right: search bar "Search actions, entities, users..."
3. Filter Bar: Dropdowns — User: "All Users ▼", Action: "All Actions ▼" (options: Created, Updated, Deleted, Exported, Logged Payment, Logged Expense, Changed Status, Changed Fee), Entity: "All Entities ▼" (Client, Case, Job, Payment, Expense, Fee Schedule, Checklist Template, Staff Account), Date Range: date pickers. "Apply Filters" teal button, "Clear" ghost.
4. Summary: "1,247 entries" count with "Showing most recent"
5. Log Table (white card): Columns: Timestamp | User | Action (colored pill: Created=teal, Updated=amber, Deleted=red, Exported=charcoal) | Entity Type | Entity | Details (expandable).
   Show 10 rows with realistic entries:
   - "Apr 10, 2:45 PM | Maria G. | Logged Payment | Payment | MOS-2026-0042 | $700 via Card for Document Collection milestone"
   - "Apr 10, 1:30 PM | Chris N. | Updated | Fee Schedule | I-485 USCIS Fee | $1,140.00 → $1,225.00"
   - "Apr 10, 11:15 AM | Maria G. | Changed Status | Case | MOS-2026-0042 | Documents Pending → Ready to File"
   - "Apr 9, 4:00 PM | Chris N. | Updated | Checklist Template | I-485 | Added item: Medical Exam (I-693)"
   - "Apr 9, 3:30 PM | System | Created | Expense | MOS-2026-0042 | Auto-populated: USCIS I-485 filing fee $1,225.00"
   - Mix of: payment logs, fee changes, checklist edits, client profile updates, case status changes, staff account changes, financial exports
   Each row expandable to show old_value → new_value JSON diff.
6. Pagination: "Showing 1-10 of 1,247" with page controls.
7. Footer note: "Audit log is append-only. Entries cannot be edited or deleted." in small gray.

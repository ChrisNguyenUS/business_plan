# PRD Template

Use this template as the structure for every PRD. Adapt depth based on product complexity — not every section needs the same level of detail for every product.

---

```markdown
# [Product Name] — [Tagline or subtitle if applicable]

## 1. Overview & Goals

### Problem Statement
- Describe the specific pain points. Be grounded in real user behavior, not assumptions.
- Frame each problem as: [User type] doing [activity] has [problem] because [root cause].
- Explain why current solutions (if any) are inadequate.

### Product Goals
- 3-5 clear, measurable goals using action verbs
- Each goal should directly address a problem listed above
- Good: "Reduce quiz creation time from 30 minutes to under 5 minutes"
- Bad: "Make it easier to create quizzes"

### Target Users
- Primary persona: role, age range, technical comfort level
- Context of use: when, where, how often, on what devices
- Key motivation: what drives them to seek a solution

### Scope & Non-Scope

**In Scope (this version):**
- Feature/capability 1
- Feature/capability 2
- ...

**Out of Scope:**
- Feature X — reason it's deferred (e.g., "V2 after validating core loop")
- Feature Y — reason it's excluded
- This section prevents scope creep. Be explicit.

### Success Metrics
| Metric | Target | How to Measure |
|--------|--------|----------------|
| [Metric 1] | [Target value] | [Measurement method] |
| [Metric 2] | [Target value] | [Measurement method] |

Include both leading indicators (e.g., daily active users, quiz creation rate) and lagging indicators (e.g., 30-day retention, NPS).

## 2. User Stories

### Story 1: [Short descriptive title]
- **User Role**: [Who]
- **Goal**: [What they want to achieve and why it matters]
- **User Flow**:
  1. [Step-by-step interaction, specific enough for a designer to wireframe]
  2. [Include what the system does at each step]
  3. [Cover the happy path completely]
- **Acceptance Criteria**:
  - [Testable condition — a QA engineer should be able to verify this]
  - [Include performance requirements: "responds within 2s"]
  - [Include edge cases: "shows error if file exceeds 10MB"]
  - [Include data validation: "rejects files that aren't PDF or DOCX"]

### Story 2: [Title]
...

### Story 3: [Title]
...

Write 3-5 stories covering core use cases. Order by user journey priority.

## 3. Functional Requirements

### Feature Breakdown

| Feature | Description | Priority | Dependencies |
|---------|-------------|----------|--------------|
| [Feature 1] | [What it does] | Must-have | [None / Feature X] |
| [Feature 2] | [What it does] | Should-have | [Feature 1] |
| [Feature 3] | [What it does] | Nice-to-have | [None] |

Use MoSCoW prioritization:
- **Must-have**: Product doesn't work without this
- **Should-have**: Important but can ship without
- **Nice-to-have**: Enhances experience, defer if needed

### Information Architecture
- List key screens/pages and their purpose
- Describe navigation flow between screens
- Identify main data entities and their relationships

## 4. Non-Functional Requirements

- **Performance**: Target response times, concurrent user capacity, throughput
- **Security**: Authentication method, data encryption, privacy compliance (GDPR, etc.)
- **Scalability**: Expected user growth, infrastructure approach
- **Accessibility**: Mobile responsiveness, WCAG level, supported browsers
- **Localization**: Supported languages, regional considerations

## 5. Technical Considerations

- Suggested tech stack (frontend, backend, database, hosting)
- Key API integrations and third-party services
- Data model overview (main entities and relationships)
- AI/ML components (if applicable): model, provider, expected accuracy
- Infrastructure: hosting, CDN, monitoring

Only include this section at a level of detail appropriate for the audience. If the user is non-technical, keep it high-level.

## 6. UI/UX Direction

### Design Language
- Color palette (include hex codes for each color):
  - Primary: #XXXXXX — usage
  - Secondary: #XXXXXX — usage
  - Accent: #XXXXXX — usage
  - Background: #XXXXXX — usage
  - Text: #XXXXXX — usage
- Typography preferences
- Brand personality keywords (3-5 words)

### Key Interaction Patterns
- Mobile-first or desktop-first
- Key animations/transitions
- Loading states and empty states

This section is optional — include only if the user provides design direction or asks for it.

## 7. Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| [Technical risk] | High/Med/Low | High/Med/Low | [Strategy] |
| [Market risk] | High/Med/Low | High/Med/Low | [Strategy] |
| [Dependency risk] | High/Med/Low | High/Med/Low | [Strategy] |

Include at least 3 risks. Think about: technical feasibility, third-party dependencies, market timing, team capacity, regulatory issues.

## 8. Timeline & Milestones

| Phase | Scope | Duration | Target Date |
|-------|-------|----------|-------------|
| Phase 1 (MVP) | [Core features] | [X weeks] | [Date] |
| Phase 2 | [Enhanced features] | [X weeks] | [Date] |
| Phase 3 | [Scale & optimization] | [X weeks] | [Date] |

This section is optional — include if the user wants phasing or has timeline constraints.

## 9. Open Questions

- [ ] [Question that needs stakeholder decision]
- [ ] [Question that needs user research]
- [ ] [Technical question that needs investigation]

Be honest about unknowns. This section shows maturity — it's better to flag questions than to pretend you have all the answers.
```

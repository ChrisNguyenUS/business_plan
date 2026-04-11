# MOS Internal Staff App — Design System

## 1. Brand Identity

**Product:** Manna One Solution Internal Staff App
**Domain:** Immigration case management tool for 2–5 staff
**Personality:** Premium, trustworthy, efficient — the brushed-metal logo conveys craftsmanship, mirrored in the UI via clean surfaces, purposeful whitespace, and teal accent color used sparingly to guide the eye. No decorative elements; every pixel serves the workflow.

## 2. Color Palette

| Role | Name | Hex | Usage |
|------|------|-----|-------|
| Primary | Manna Teal | `#3AAFB9` | Primary buttons, active nav, links, progress bars |
| Primary Dark | Deep Teal | `#2D8E96` | Hover / pressed states, sidebar active indicator |
| Accent | Charcoal | `#2C2C2C` | Top bar background, headings, high-contrast text |
| Neutral 100 | White | `#FFFFFF` | Page backgrounds, card surfaces |
| Neutral 200 | Light Gray | `#F1F3F5` | Table stripes, input backgrounds, section dividers |
| Neutral 300 | Mid Gray | `#ADB5BD` | Placeholder text, borders, disabled states |
| Neutral 700 | Dark Gray | `#495057` | Body text, secondary labels |
| Neutral 900 | Near Black | `#212529` | Primary text, sidebar text |
| Success | Green | `#16A34A` | Copied ✓ state, completed items, approved status |
| Warning | Amber | `#D97706` | Missing field warnings, approaching deadlines |
| Danger | Red | `#DC2626` | Errors, denied status, destructive actions |

## 3. Typography

- **Font Family:** Inter (Google Fonts)
- **Fallback:** system-ui, -apple-system, sans-serif
- **Headings:** Inter Semi-Bold, Near Black (#212529)
- **Body:** Inter Regular, Dark Gray (#495057)
- **Small / Labels:** Inter Medium, Mid Gray (#ADB5BD)

## 4. Shape & Surfaces

- **Border Radius:** 8px on cards, buttons, inputs
- **Card Style:** White (#FFFFFF) cards on Light Gray (#F1F3F5) page background; 1px #E5E7EB border; subtle box-shadow on hover
- **Elevation:** Minimal — one level of shadow for interactive cards only

## 5. Layout Patterns

- **Platform:** Web, Desktop-first (min-width 1280px)
- **Navigation:** Dark Charcoal (#2C2C2C) sidebar with white text; active item highlighted with teal (#3AAFB9) left-border accent
- **Logo:** Transparent-background MOS logo at top of sidebar, max height 40px
- **Content Area:** Light Gray (#F1F3F5) background, max-width contained cards
- **Sticky Elements:** Filing screen section tabs fixed at top; progress bar sticky at bottom

## 6. Design System Notes for Stitch Generation

**DESIGN SYSTEM (REQUIRED):**
- Platform: Web, Desktop-first (min-width 1280px)
- Palette: Manna Teal (#3AAFB9) for primary actions, Deep Teal (#2D8E96) for hover, Charcoal (#2C2C2C) for sidebar/headings, White (#FFFFFF) card surfaces on Light Gray (#F1F3F5) backgrounds, Near Black (#212529) for text, Green (#16A34A) for success, Amber (#D97706) for warnings, Red (#DC2626) for errors
- Typography: Inter font family, Semi-Bold for headings, Regular for body, clean geometric forms
- Styles: 8px rounded corners on cards/buttons/inputs, 1px #E5E7EB borders, subtle box-shadow on hover, minimal elevation
- Layout: Dark charcoal sidebar navigation with white text and teal active indicator, logo at sidebar top, light gray content area with white card containers
- Personality: Premium, trustworthy, efficient — clean surfaces, purposeful whitespace, teal used sparingly for focus. Professional corporate aesthetic, structured and organized hierarchy. No decorative elements.

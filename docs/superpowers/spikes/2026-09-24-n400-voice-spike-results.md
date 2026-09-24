# N400 Voice Spike — Results

**Preview URL:** <fill in>
**Tester / date:** <fill in>
**Spec:** docs/superpowers/specs/2026-09-24-n400-civics-oral-answers-design.md §12

## Script (per environment)

1. Open `<preview>/voice-spike.html` fresh (first run must show the mic permission prompt).
2. Press 🎤 Speak and say the prompt shown; repeat until 5 answers.
3. Second run: start answering, switch to another app mid-answer, come back, finish 5 answers without reloading.
4. Press "Copy results" (or screenshot the log) and paste below.

**GO for an environment:** all 10 answers produce a transcript, no stuck state, no reload needed.

## Matrix

| Environment | Device / OS | API present | Permission granted | Transcript returned | 2nd+ answer works without reload | Survives background | GO? |
|---|---|---|---|---|---|---|---|
| iPhone Safari | | | | | | | |
| Android Chrome | | | | | | | |
| Desktop Chrome | | | | | | | |
| Facebook in-app iOS | | | | | | | |
| Facebook in-app Android | | | | | | | |

## Facebook in-app traffic share

<fill in: GA4 → Tech → Browser (look for "Safari (in-app)" / "Android Webview") and the share of first-touch attributions carrying `fbclid` / `utm_source=facebook`>

## Raw logs

<paste per environment>

## Decision (owner)

- Slice 0 pass (iPhone Safari, Android Chrome, desktop Chrome all GO)? <yes/no>
- Facebook in-app strategy: (a) open-in-browser prompt / (b) keyboard-dictation fallback / (c) revisit server STT — <choice + reason>

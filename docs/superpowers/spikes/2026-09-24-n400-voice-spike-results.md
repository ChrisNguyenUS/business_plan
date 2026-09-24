# N400 Voice Spike — Results

**Preview URL:** https://mannaonesolutionwebs-git-2cb8c6-chrisnguyendevus-6573s-projects.vercel.app/voice-spike.html (Vercel-protected; share token deliberately not committed)
**Tester / date:** owner, 2026-09-24
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
| iPhone Safari | iOS 18.7, Safari 27.0 | yes | yes | run 1: 2/6 · run 2 (after reload): 5/6, the 1 miss was a deliberate mid-answer switch | yes | **intermittent**: run 1 went mic-dead after 2nd background (reload fixed it); run 2 survived 5 backgrounds incl. one mid-answer | CONDITIONAL (stall detector + recovery required in Slice 2) |
| Android Chrome | not tested (no device) | | | | | | **risk accepted by owner** |
| Desktop Chrome | macOS, Chrome 153 | yes | yes (after header fix + fresh cache) | blocked runs 0/3, 0/5 (header / cached header) · after fix: 5/5 + 5/6 | yes | yes (2 switches, both recovered) | **GO** |
| Facebook in-app iOS | iPhone18,2, iOS 27.0, FBAV 579 | yes | yes | run 1: 1/3 · run 2 (Refresh): 0/2 · run 3 (fresh open, no switching): 1/3 | **no: only the 1st recognition per WebView session works, even with no app switch** | no | **NO-GO** |
| Facebook in-app Android | not tested (no device) | | | | | | **risk accepted by owner** |

## Finding: our Permissions-Policy blocks the mic

`apps/website/next.config.ts:24` sends `Permissions-Policy: microphone=()`, which disables the mic for every page on the site. Chrome enforces it: `SpeechRecognition.start()` fails at once with `error=not-allowed` and no prompt. Safari ignores the header, which is why iPhone/Mac Safari worked. Android Chrome and the Android in-app WebView would fail the same way.

- Spike branch: changed to `microphone=(self)` (commit 0c6d5ae5); owner approved keeping it for the spike.
- **Cache trap:** voice-spike.html did not change, so Chrome revalidated, got `304` (Vercel's 304 carries no Permissions-Policy) and kept the cached `microphone=()` → still `not-allowed`. Fresh Incognito fixed it. A header-only deploy does not reach users with a cached copy of an unchanged page. Next.js app pages are mostly dynamic, but check whatever page hosts the mic.
- **Slice 2 must ship the same change on main** (owner confirms before it lands); without it the feature is dead on every Chromium browser.

## Facebook in-app traffic share

Not measured (owner skipped). <GA4 → Tech → Browser (look for "Safari (in-app)" / "Android Webview") and the share of first-touch attributions carrying `fbclid` / `utm_source=facebook`>

## Raw logs

### iPhone Safari — run 1

Observations:
- Answers 1–2 fine ("The constitution" 0.99, "27" 0.993). Safari returns digits for "Twenty-seven".
- 1st background (10.9s→19.6s, idle): recovered, answer 2 worked.
- 2nd background (28.1s→36.2s, idle): every later start reaches `listening` + `audiostart` but never `speechstart`; ends only via 15s hard stop / Stop with `error=aborted No speech detected`. Mic is silently dead: no error at start, looks like it's listening.
- Repeated "already running — ignored": user re-tapped Speak while it was (apparently) listening.

```
UA: Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/27.0 Mobile/15E148 Safari/604.1
API: webkitSpeechRecognition
ok 2/6

0.00s state=requesting/starting
4.32s state=listening
4.78s audiostart
6.58s speechstart
6.58s result final=false conf=0 "The"
6.85s result final=false conf=0 "The con"
7.04s result final=false conf=0 "The cons"
7.30s result final=false conf=0 "The constitution"
9.22s result final=true conf=0.9900000095367432 "The constitution"
9.23s state=processing
9.25s end gotText=true
9.25s state=idle
10.90s visibility=hidden
19.61s visibility=visible
21.30s state=requesting/starting
21.32s state=listening
21.75s audiostart
23.28s speechstart
23.28s result final=false conf=0 "20"
23.51s result final=false conf=0 "27"
25.20s result final=true conf=0.9929999709129333 "27"
25.20s state=processing
25.22s end gotText=true
25.22s state=idle
28.13s visibility=hidden
36.24s visibility=visible
38.09s state=requesting/starting
39.62s state=listening
39.62s audiostart
44.58s already running — ignored
53.09s 15s hard stop
53.15s error=aborted No speech detected
53.15s end gotText=false
53.15s state=idle
53.30s state=requesting/starting
53.32s state=listening
53.32s audiostart
55.48s already running — ignored
59.27s already running — ignored
64.90s stop pressed
64.95s error=aborted No speech detected
64.95s end gotText=false
64.95s state=idle
67.50s state=requesting/starting
67.58s state=listening
67.58s audiostart
72.98s already running — ignored
80.30s already running — ignored
81.73s stop pressed
81.78s error=aborted No speech detected
81.78s end gotText=false
81.78s state=idle
83.65s state=requesting/starting
83.67s state=listening
83.71s audiostart
```

### iPhone Safari — run 2 (after reload)

Observations:
- Reload fixed the dead mic from run 1.
- 5 app switches, all recovered, including one mid-answer (17.78s): `aborted on hide`, the next answer worked.
- "Freedom of speech" came back as **"Freedom speech"**: "of" dropped. Grading must not need stopwords.
- "Checks and balances" final had conf **0.32** though the text was right: don't gate on `confidence`.
- Interim results wobble ("The cons" → "The con" → "The cons"): grade finals only.

```
UA: Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/27.0 Mobile/15E148 Safari/604.1
API: webkitSpeechRecognition
ok 5/6

0.32s visibility=visible
0.00s state=requesting/starting
1.37s state=listening
1.37s audiostart
3.43s speechstart
3.43s result final=false conf=0 "The"
3.90s result final=false conf=0 "The con"
3.90s result final=false conf=0 "The cons"
3.90s result final=false conf=0 "The con"
3.91s result final=false conf=0 "The cons"
4.11s result final=false conf=0 "The constitution"
6.03s result final=true conf=0.9890000224113464 "The constitution"
6.04s state=processing
6.04s end gotText=true
6.04s state=idle
6.81s visibility=hidden
11.89s visibility=visible
14.30s state=requesting/starting
14.33s state=listening
14.33s audiostart
15.87s speechstart
15.87s result final=false conf=0 "20"
16.13s result final=false conf=0 "27"
17.78s visibility=hidden
17.78s aborted on hide
17.79s state=processing
17.80s error=aborted No speech detected
17.80s end gotText=false
17.80s state=idle
20.93s visibility=visible
22.68s state=requesting/starting
22.70s state=listening
22.70s audiostart
26.15s speechstart
26.15s result final=false conf=0 "20"
26.41s result final=false conf=0 "27"
28.32s result final=true conf=0.9950000047683716 "27"
28.32s state=processing
28.34s end gotText=true
28.34s state=idle
29.38s visibility=hidden
33.22s visibility=visible
35.57s state=requesting/starting
35.59s state=listening
35.59s audiostart
37.16s speechstart
37.16s result final=false conf=0 "Check"
37.68s result final=false conf=0 "Check balance"
37.89s result final=false conf=0 "Check balance balances"
38.12s result final=false conf=0 "Checks and balances"
39.78s result final=true conf=0.3211657702922821 "Checks and balances"
39.78s state=processing
39.80s end gotText=true
39.80s state=idle
42.08s visibility=hidden
54.17s visibility=visible
55.07s state=requesting/starting
55.10s state=listening
55.10s audiostart
57.13s speechstart
57.13s result final=false conf=0 "Con"
57.59s result final=false conf=0 "Congress"
58.12s result final=false conf=0 "Congress president"
58.58s result final=false conf=0 "Congress president and"
58.80s result final=false conf=0 "Congress president and the"
59.08s result final=false conf=0 "Congress president and the court"
59.30s result final=false conf=0 "Congress president and the courts"
60.97s result final=true conf=0.8629999756813049 "Congress president and the courts"
60.97s state=processing
60.99s end gotText=true
60.99s state=idle
68.20s visibility=hidden
74.34s visibility=visible
76.35s state=requesting/starting
76.38s state=listening
76.38s audiostart
78.45s speechstart
78.45s result final=false conf=0 "Free"
78.90s result final=false conf=0 "Freedom"
79.13s result final=false conf=0 "Freedom speech"
80.83s result final=true conf=0.861083984375 "Freedom speech"
80.83s state=processing
80.84s end gotText=true
80.85s state=idle
```

### Desktop Chrome — run 2 (Incognito, after header fix)

Observations:
- 5/5, fast (speechstart → final ≈ 1s).
- Chrome also returns digits ("27").
- "Freedom of speech" was misheard as **"videos of speech"** (conf 0.51). If the generated keywords require "freedom", this grades wrong or near. Slice 1 decides that. Either way it's a recognizer error, not a grading bug. Slice 2's echo ("App nghe được: …") + retry is what covers it. Don't alias it (D10).
- Chrome sends interim results as fragments (" and the courts") and sometimes the final **after** `speechend`/processing (20.86s): the hook must wait for the final result / `end`, not act on `speechend`.
- Interim `confidence` is junk (0.01); final confidences 0.51–0.97.

```
UA: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36
API: SpeechRecognition
ok 5/5

0.00s state=requesting/starting
2.94s state=listening
3.31s audiostart
4.48s already running — ignored
5.70s speechstart
6.15s result final=false conf=0.009999999776482582 "the"
6.37s result final=false conf=0.009999999776482582 "the Khan"
6.39s result final=false conf=0.009999999776482582 "the constit"
6.46s result final=false conf=0.009999999776482582 "the Constitution"
6.80s result final=false conf=0.009999999776482582 " Constitution"
6.98s result final=true conf=0.9698973894119263 "the Constitution"
6.98s state=processing
7.11s end gotText=true
7.11s state=idle
10.02s state=requesting/starting
10.03s state=listening
10.36s audiostart
11.13s speechstart
11.56s result final=false conf=0.009999999776482582 "2"
11.66s result final=false conf=0.009999999776482582 "27"
11.91s result final=true conf=0.9334055781364441 "27"
12.06s state=processing
12.11s end gotText=true
12.11s state=idle
13.64s state=requesting/starting
13.64s state=listening
13.96s audiostart
14.56s speechstart
15.18s result final=false conf=0.009999999776482582 "check"
15.28s result final=false conf=0.009999999776482582 "checks"
15.50s result final=false conf=0.009999999776482582 "checks and"
15.60s result final=false conf=0.009999999776482582 "checks and Bal"
15.63s result final=false conf=0.009999999776482582 "checks and balances"
15.84s result final=false conf=0.009999999776482582 " and balances"
15.91s result final=true conf=0.8004835247993469 "checks and balances"
15.93s state=processing
16.06s end gotText=true
16.06s state=idle
17.29s state=requesting/starting
17.29s state=listening
17.62s audiostart
18.21s speechstart
18.72s result final=false conf=0.009999999776482582 "Cong"
18.74s result final=false conf=0.009999999776482582 "Congress"
19.24s result final=false conf=0.8999999761581421 "Congress"
19.50s result final=false conf=0.009999999776482582 " president"
20.22s result final=false conf=0.8999999761581421 "Congress president"
20.22s result final=false conf=0.009999999776482582 " and"
20.29s result final=false conf=0.009999999776482582 " and the"
20.44s result final=false conf=0.009999999776482582 " and the court"
20.74s result final=false conf=0.009999999776482582 " and the courts"
20.85s result final=false conf=0.009999999776482582 " the courts"
20.86s state=processing
20.86s result final=true conf=0.8802429437637329 "Congress president and the courts"
20.86s end gotText=true
20.86s state=idle
25.03s state=requesting/starting
25.03s state=listening
25.36s audiostart
26.22s speechstart
26.91s result final=false conf=0.009999999776482582 "videos"
27.16s state=processing
27.16s result final=false conf=0.009999999776482582 "videos of"
27.25s result final=false conf=0.009999999776482582 "videos Beach"
27.28s result final=false conf=0.009999999776482582 "videos of speech"
27.30s result final=true conf=0.5059029459953308 "videos of speech"
27.30s end gotText=true
27.30s state=idle
```

### Desktop Chrome — run 3 (app switching)

Observations:
- 5/6, 2 app switches (both while idle), both recovered with no reload.
- The 1 miss (0–5.65s): speechstart → processing → end with **no result at all**. It was not stuck: the next try worked. Slice 2 must treat "ended with no transcript" as a soft retry ("Không nghe rõ, nói lại nhé"), not as a graded wrong answer.
- Misrecognitions the normalizer must absorb: "check **Zen** balances" (checks and balances), "Congress **presidents** and the courts". Stemming covers check/checks and presidents/president. The extra "zen" is noise the keyword matcher ignores.

```
UA: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36
API: SpeechRecognition
ok 5/6

0.00s state=requesting/starting
1.10s state=listening
1.49s audiostart
4.22s speechstart
5.14s already running — ignored
5.51s state=processing
5.65s end gotText=false
5.65s state=idle
17.37s state=requesting/starting
17.37s state=listening
17.70s audiostart
20.44s speechstart
21.27s result final=false conf=0.009999999776482582 "the"
21.44s result final=false conf=0.009999999776482582 "the Khan"
21.57s result final=false conf=0.009999999776482582 "the const"
21.57s result final=false conf=0.009999999776482582 "the Constitution"
21.87s result final=false conf=0.009999999776482582 " Constitution"
21.97s result final=true conf=0.9313062429428101 "the Constitution"
21.97s state=processing
22.00s end gotText=true
22.01s state=idle
28.32s visibility=hidden
29.73s visibility=visible
33.45s state=requesting/starting
33.47s state=listening
33.86s audiostart
34.46s speechstart
35.30s result final=false conf=0.009999999776482582 "2"
35.40s result final=false conf=0.009999999776482582 "27"
35.81s result final=true conf=0.9136788249015808 "27"
35.83s state=processing
35.87s end gotText=true
35.87s state=idle
49.85s state=requesting/starting
49.87s state=listening
50.26s audiostart
50.94s speechstart
51.53s result final=false conf=0.009999999776482582 "check"
51.87s result final=false conf=0.009999999776482582 "check the"
52.07s result final=false conf=0.009999999776482582 " the"
52.17s result final=false conf=0.009999999776482582 " zimbel"
52.20s result final=false conf=0.009999999776482582 " the balance"
52.30s result final=false conf=0.009999999776482582 " the balances"
52.51s result final=true conf=0.6957370638847351 "check Zen balances"
52.56s state=processing
52.60s end gotText=true
52.60s state=idle
68.97s state=requesting/starting
69.01s state=listening
69.44s audiostart
70.03s speechstart
70.66s result final=false conf=0.009999999776482582 "Cong"
70.72s result final=false conf=0.009999999776482582 "Congress"
71.38s result final=false conf=0.8999999761581421 "Congress"
71.48s result final=false conf=0.009999999776482582 " president"
71.98s result final=false conf=0.009999999776482582 " presidents"
72.53s result final=false conf=0.009999999776482582 " presidents and"
72.55s result final=false conf=0.009999999776482582 " and"
72.58s result final=false conf=0.009999999776482582 " and the"
72.95s result final=false conf=0.009999999776482582 " and the court"
73.02s result final=false conf=0.009999999776482582 " and the courts"
73.09s result final=false conf=0.009999999776482582 " the courts"
73.17s result final=false conf=0.009999999776482582 " courts"
73.30s result final=true conf=0.820467472076416 "Congress presidents and the courts"
73.45s state=processing
73.51s end gotText=true
73.51s state=idle
85.45s visibility=hidden
87.77s visibility=visible
89.07s state=requesting/starting
89.10s state=listening
89.48s audiostart
90.16s speechstart
91.02s result final=false conf=0.009999999776482582 "freed"
91.06s result final=false conf=0.009999999776482582 "freedom"
91.30s result final=false conf=0.009999999776482582 "freedom of"
91.39s result final=false conf=0.009999999776482582 "freedom of speech"
91.67s result final=false conf=0.009999999776482582 " of speech"
91.87s state=processing
91.89s result final=false conf=0.009999999776482582 " speech"
91.89s result final=true conf=0.9406144022941589 "freedom of speech"
91.89s end gotText=true
91.89s state=idle
```

### Facebook in-app iOS — run 1

Observations:
- The API exists in the FB in-app WebView (WKWebView), permission works, answer 1 was fine (0.98).
- After the **first** app switch (8.83s→10.09s, idle), same failure as iPhone Safari run 1: `listening` + `audiostart`, never `speechstart`. It failed on the first switch here, where Safari lasted until the second.

```
UA: Mozilla/5.0 (iPhone; CPU iPhone OS 27_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/24A437 [FBAN/FBIOS;FBAV/579.0.0.23.106;FBBV/1068430635;FBDV/iPhone18,2;FBMD/iPhone;FBSN/iOS;FBSV/27.0;FBSS/3;FBCR/;FBID/phone;FBLC/en_US;FBOP/80]
API: webkitSpeechRecognition
ok 1/3

0.00s state=requesting/starting
2.82s state=listening
3.21s audiostart
4.59s speechstart
4.59s result final=false conf=0 "The"
4.82s result final=false conf=0 "The con"
4.82s result final=false conf=0 "The cons"
5.06s result final=false conf=0 "The constitution"
6.98s result final=true conf=0.9789999723434448 "The constitution"
6.98s state=processing
6.99s end gotText=true
6.99s state=idle
8.83s visibility=hidden
10.09s visibility=visible
11.33s state=requesting/starting
12.67s state=listening
12.68s audiostart
17.11s already running — ignored
22.26s visibility=hidden
22.26s aborted on hide
22.29s error=aborted No speech detected
22.29s end gotText=false
22.29s state=idle
23.34s visibility=visible
23.94s state=requesting/starting
23.94s state=listening
24.04s audiostart
26.61s already running — ignored
```

### Facebook in-app iOS — run 2 (after ⋯ → Refresh)

Observations:
- Refresh does **not** recover the dead mic (unlike iPhone Safari, where a reload fixed it). The broken audio session belongs to the FB WebView, not to the page.
- So in-app, a stall detector cannot offer "reload" as the recovery path.

```
UA: Mozilla/5.0 (iPhone; CPU iPhone OS 27_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/24A437 [FBAN/FBIOS;FBAV/579.0.0.23.106;FBBV/1068430635;FBDV/iPhone18,2;FBMD/iPhone;FBSN/iOS;FBSV/27.0;FBSS/3;FBCR/;FBID/phone;FBLC/en_US;FBOP/80]
API: webkitSpeechRecognition
ok 0/2

0.00s state=requesting/starting
1.26s state=listening
1.26s audiostart
4.43s already running — ignored
7.74s already running — ignored
11.02s stop pressed
11.07s error=aborted No speech detected
11.07s end gotText=false
11.07s state=idle
11.74s state=requesting/starting
11.74s state=listening
11.79s audiostart
13.84s stop pressed
13.87s error=aborted No speech detected
13.87s end gotText=false
13.87s state=idle
```

### Facebook in-app iOS — run 3 (fresh open after closing the FB browser, no app switching)

Observations:
- Answer 1 fine (0.99). Answer 2, **with no visibility change at all**, went mic-dead (audiostart, never speechstart).
- Conclusion: in the FB iOS WebView only the **first** recognition per WebView session works. Backgrounding is not the trigger. Neither Refresh nor a stall detector can fix it in-app.

```
UA: Mozilla/5.0 (iPhone; CPU iPhone OS 27_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/24A437 [FBAN/FBIOS;FBAV/579.0.0.23.106;FBBV/1068430635;FBDV/iPhone18,2;FBMD/iPhone;FBSN/iOS;FBSV/27.0;FBSS/3;FBCR/;FBID/phone;FBLC/en_US;FBOP/80]
API: webkitSpeechRecognition
ok 1/3

0.00s state=requesting/starting
1.56s state=listening
1.56s audiostart
4.15s speechstart
4.15s result final=false conf=0 "The"
4.37s result final=false conf=0 "The con"
4.87s result final=false conf=0 "The constitution"
6.52s already running — ignored
6.78s result final=true conf=0.9890000224113464 "The constitution"
6.78s state=processing
6.80s end gotText=true
6.80s state=idle
8.57s state=requesting/starting
9.91s state=listening
9.91s audiostart
13.27s already running — ignored
17.50s already running — ignored
18.99s stop pressed
19.03s error=aborted No speech detected
19.03s end gotText=false
19.03s state=idle
20.75s state=requesting/starting
20.76s state=listening
20.80s audiostart
27.54s copied
35.36s copied
35.76s 15s hard stop
35.80s error=aborted No speech detected
35.80s end gotText=false
35.80s state=idle
```


## Decision (owner)

- Slice 0 pass (iPhone Safari, Android Chrome, desktop Chrome all GO)? **yes**, owner 2026-09-24:
  - iPhone Safari: GO with a condition. Slice 2 needs a stall detector (audiostart, no speechstart within ~5s) plus a reload/restart recovery.
  - Desktop Chrome: GO.
  - Android Chrome: **not tested, risk accepted**. Slice 2 gates the mic on Android behind its own flag.
  - Blocker found and carried to Slice 2: `Permissions-Policy: microphone=()` must become `microphone=(self)` on main (owner confirms first).
- Facebook in-app strategy: **(a) + (b)**. Inside FB in-app (UA contains `FBAN`/`FBAV`), hide the mic and show "open in Safari/browser" guidance; keep the text answer box so keyboard dictation works. Reason: FB iOS WebView allows only the first recognition per session, and Refresh does not recover it. (c) is rejected: cost, and Web Speech was chosen because it is free.

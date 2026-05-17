# Streak System — L4 Technical Workflows

**Feature:** Daily study streak tracking across all quiz modes
**Phase:** 6 (Streak System)
**Trigger:** Idempotency requirements + concurrent writes (multi-device same-day submit)

---

## Workflow 1: Happy Path

```flowchart TD
    A([finalizeAttempt / finalizePractice\n/ saveFlashcardSession completes]) --> B[updateStreak attemptId]
    B --> C[COUNT n400_question_attempts\nWHERE attempt_id = ?]
    C -->|count >= 5| D[SELECT started_at\nFROM n400_quiz_attempts\nWHERE id = attemptId]
    D --> E[getActivityDay started_at\ntoLocaleDateString en-CA\ntimeZone: America/Chicago\nreturns YYYY-MM-DD]
    E --> F[SELECT current_streak\nlongest_streak\nlast_activity_date\nFROM n400_user_profile]
    F --> G[computeStreakUpdate\npure function\nno side effects]
    G -->|StreakUpdate returned| H[UPDATE n400_user_profile\ncurrent_streak, longest_streak\nlast_activity_date\nWHERE user_id = ?\nAND last_activity_date = prev_value]
    H -->|1 row updated| I{milestone\n3/7/14/30/100?}
    I -->|yes| J[return milestoneReached]
    I -->|no| K([return null])
    J --> L([Client shows toast + modal])
```

---

## Workflow 2: Error & Retry

```flowchart TD
    A([updateStreak called]) --> B[COUNT question_attempts]
    B -->|Supabase error| C[return null\nnon-blocking — streak failure\nnever breaks quiz flow]

    B -->|count < 5| D[return null\nno streak update\nattempt too short]

    B -->|count >= 5| E[SELECT started_at]
    E -->|attempt not found| F[return null]

    E -->|found| G[SELECT profile]
    G -->|profile not found| H[return null\nuser has no n400 profile yet]

    G -->|found| I[computeStreakUpdate]
    I -->|returns null\nsame day already counted| J([no-op — idempotent])

    I -->|StreakUpdate| K[UPDATE n400_user_profile\nidempotency WHERE guard]
    K -->|DB error| L[return null\nswallow — analytics-style\nstreak will self-correct\non next session]
```

---

## Workflow 3: Idempotency & Concurrency

```flowchart TD
    A([Two devices complete sessions\non the same day]) --> B1[Device 1: updateStreak]
    A --> B2[Device 2: updateStreak]

    B1 --> C1[Read profile\nlast_activity_date = 2026-05-15\ncurrent_streak = 4]
    B2 --> C2[Read profile\nlast_activity_date = 2026-05-15\ncurrent_streak = 4]

    C1 --> D1[computeStreakUpdate\nactivityDay = 2026-05-16\ndiff = 1 day\nnewStreak = 5]
    C2 --> D2[computeStreakUpdate\nactivityDay = 2026-05-16\ndiff = 1 day\nnewStreak = 5]

    D1 --> E1[UPDATE ... WHERE\nlast_activity_date = '2026-05-15'\nPostgres row lock]
    D2 --> E2[UPDATE ... WHERE\nlast_activity_date = '2026-05-15'\nPostgres row lock]

    E1 -->|wins lock\n1 row updated| F1[streak = 5\nlast_activity_date = 2026-05-16]
    E2 -->|loses — WHERE no longer matches\n0 rows updated| F2[no-op\nstreak already correct]

    F1 --> G([streak = 5, counted once])
    F2 --> G

    note1[Key: WHERE guard uses prev last_activity_date\nnot a timestamp — so same-day re-submit\nalso hits 0 rows updated safely]
```

---

## Workflow 4: Edge Cases

```flowchart TD
    A([Edge case inputs]) --> B{Which case?}

    B -->|Session started 11:55 PM\ncompleted 12:05 AM next day| C[getActivityDay uses started_at\nnot completed_at\nreturns 2026-05-15\ncounts for the start day]
    C --> D([Streak not lost\nfor midnight crossover])

    B -->|Backdated session\nstarted_at < last_activity_date| E[computeStreakUpdate\nactivityDay < lastActivityDate\nreturns null — no regression\nspec §4.7: do not regress current streak]
    E --> F([No streak change])

    B -->|First-ever session\nlast_activity_date = null| G[computeStreakUpdate\nlastActivityDate = null\nnewStreak = 1]
    G --> H[UPDATE WHERE\nlast_activity_date IS NULL\nnot eq null — Postgres NULL != NULL]
    H -->|1 row updated| I([streak = 1])

    B -->|Flashcard session\nstartedAt captured at mount| J[saveFlashcardSession\nreceives startedAt from client\nuses it for started_at column\nnot new Date at save time]
    J --> K[updateStreak reads\ncorrect started_at\nday attribution accurate]
    K --> L([Streak correct for\nmidnight-crossing flashcard sessions])

    B -->|Milestone exactly hit| M[computeStreakUpdate\nMILESTONES.find m === newStreak\nreturns milestoneReached = 7]
    M --> N[finalizeAttempt returns\nmilestoneReached to client]
    N --> O[localStorage.setItem\nmilestone-attemptId = 7]
    O --> P[Result page MilestoneToast\nreads + clears localStorage]
    P --> Q([Modal shown once\nnot on refresh])
```

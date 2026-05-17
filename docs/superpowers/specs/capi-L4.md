# Meta CAPI Conversion Events — L4 Technical Workflows

**Feature:** Server-side Meta Conversions API for `n400_mock_test_pass` and `n400_setup_complete`
**Phase:** 8 (Analytics + Monitoring)
**Trigger:** External service with failure modes + retry-safety + deduplication (deterministic event_id)

---

## Workflow 1: Happy Path

```flowchart TD
    A([finalizeAttempt: passed = true]) --> B[Compute deterministic event_id\nsha256 'n400-pass:attemptId'\nslice 0-32 hex chars]
    B --> C[sendCapiEvent\neventName: n400_mock_test_pass\neventId: deterministic hash\neventSourceUrl: referer header\nuser: email hash + IP + UA\ncustomData: score, total]
    C --> D[Build CAPI payload\nevent_time: unix seconds\naction_source: website\nuser_data: hashed email + IP + UA]
    D --> E[POST graph.facebook.com\n/pixelId/events\naccess_token in query string\nContent-Type: application/json]
    E -->|200 OK| F([Event received by Meta\ndeduped by event_id])

    G([saveSetupProfile: profile saved]) --> H[Compute deterministic event_id\nsha256 'n400-setup:userId:state:district'\nslice 0-32 hex chars]
    H --> I[sendCapiEvent\neventName: n400_setup_complete\neventId: deterministic hash\neventSourceUrl: /n400app/setup\nuser: email + IP + UA\ncustomData: state_code, district_resolved]
    I --> D
```

---

## Workflow 2: Error & Retry

```flowchart TD
    A([sendCapiEvent called]) --> B[fetch Meta Graph API]
    B -->|network error\nfetch throws| C[catch block\nconsole.error only\nNO throw — non-blocking]
    C --> D([User flow continues\nCAPI failure silent])

    B -->|non-200 response| E[log status + body\nconsole.error\nNO throw]
    E --> D

    B -->|200 OK| F([Event sent])

    G([finalizeAttempt retried\ne.g. flaky network\nclient calls twice]) --> H[Same attemptId\nsame deterministic event_id\nsha256 'n400-pass:attemptId']
    H --> I[Meta receives duplicate\nevent_id matches previous]
    I --> J([Meta deduplicates\ncounts as 1 conversion\nnot 2])

    K([saveSetupProfile retried\nuser re-submits setup form\nsame state + district]) --> L[Same userId + state + district\nsame deterministic event_id]
    L --> I
```

---

## Workflow 3: Idempotency & Concurrency

```flowchart TD
    A([event_id derivation strategy]) --> B{Event type}

    B -->|n400_mock_test_pass| C[sha256 'n400-pass:attemptId'\nattemptId is UUID — globally unique\nsame attempt always same event_id\ndifferent attempts always different]
    C --> D[Meta deduplication window: 48h\nRetries within 48h are safe\nNew attempts get new IDs]

    B -->|n400_setup_complete| E[sha256 'n400-setup:userId:stateCode:districtNumber'\nSame user + same resolved location\n= same event_id\nUser changing address to new district\n= new event_id = new conversion counted]
    E --> F[Edge: district_number = null\nidInput uses 'na' as placeholder\nnull district always same event_id\nfor same user + state]

    G([Client-side Pixel also fires\nfor non-conversion events]) --> H[n400_mock_test_start\nn400_practice_complete\nn400_flashcard_session\nn400_streak_milestone]
    H --> I[These use random UUID event_ids\nno server-side dedup needed\nnot conversion events]

    J([n400_mock_test_pass\nNEVER fired client-side]) --> K[Only server CAPI\nprevents user spoofing\n'Pass' status to pollute\nretargeting audience]
```

---

## Workflow 4: Edge Cases

```flowchart TD
    A([Edge case inputs]) --> B{Which case?}

    B -->|META_CAPI_ACCESS_TOKEN not set| C[sendCapiEvent early return\nif not pixelId or not accessToken\nno fetch attempted\nsilent no-op]
    C --> D([Safe in local dev\nwhere env vars absent])

    B -->|META_CAPI_TEST_EVENT_CODE set| E[Payload includes\ntest_event_code field\nMeta routes to Test Events tab\nnot live data]
    E --> F([Safe for staging verification\nwithout polluting production])

    B -->|user.email is null\nGoogle OAuth without email scope| G[sendCapiEvent\nuser.emails = undefined\nbuildHashedUserData skips email hash\nstill sends IP + UA for matching]
    G --> H([Partial match — acceptable\nbetter than no event])

    B -->|referer header missing\non finalizeAttempt| I[eventSourceUrl falls back to\n'https://mannaos.com/n400app'\nhardcoded fallback]
    I --> J([Event still fires\nURL slightly imprecise])

    B -->|n400_setup_complete fires\nbut user later changes address| K[New district → new event_id\nMeta counts as new lead\nOld event_id already consumed\nno double-count on same district]
    K --> L([Each unique district resolution\ncounts as one lead conversion])
```

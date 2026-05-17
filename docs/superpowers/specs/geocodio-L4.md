# Geocodio District Lookup — L4 Technical Workflows

**Feature:** Setup form address → congressional district resolution
**Phase:** 3 (Auth + Setup Flow)
**Trigger:** External service with failure modes (timeout, 404, ambiguous, rate limit)

---

## Workflow 1: Happy Path

```flowchart TD
    A([User submits setup form]) --> B[Server Action: saveSetupProfile]
    B --> C[Extract IP from x-forwarded-for\nfirst comma-separated token]
    C --> D[geocodioIpLimiter.limit\nkey: ip:userId]
    D -->|success| E[geocodioUserLimiter.limit\nkey: userId]
    E -->|success| F[Validate form fields\nstreet, city, state, zip]
    F -->|valid| G[geocodeAddress\nfetch geocod.io/v1.7/geocode\nAuthorization: Bearer key\nfields=cd]
    G -->|200 OK| H[parseGeocodioResponse\ncongressional_districts array]
    H -->|length === 1| I[Extract district_number\nand state_abbreviation]
    I --> J[UPSERT n400_user_profile\ncity, state_code, zipcode\ndistrict_number, district_resolved_at\nNO street_address]
    J -->|success| K[sendCapiEvent\nn400_setup_complete\ndeterministic event_id]
    K --> L([redirect /n400app])
```

---

## Workflow 2: Error & Retry

```flowchart TD
    A([geocodeAddress called]) --> B{HTTP response}
    B -->|non-2xx| C[throw GeocodioError status\nNO address in message]
    B -->|network timeout| D[fetch throws\nAbortError or TypeError]
    B -->|200 OK| E[parseGeocodioResponse]

    C --> F[catch in saveSetupProfile]
    D --> F
    F --> G[Sentry.captureException\nGeocodioError only\nextra: empty object\nno PII]
    G --> H[return error to client\n'Không thể xác định khu vực.\nVui lòng kiểm tra lại địa chỉ.']
    H --> I([User sees error + Retry button])
    I --> J([User re-submits form])

    E -->|results empty| K[return null from parser]
    K --> L[Save profile\ndistrict_number = null\ndistrict_resolved_at = null]
    L --> M[return error to client\n'Địa chỉ không tìm thấy.\nVui lòng kiểm tra lại.']
    M --> I
```

---

## Workflow 3: Idempotency & Concurrency

```flowchart TD
    A([Two rapid form submits\nor two devices]) --> B1[Request 1\nrate limit check]
    A --> B2[Request 2\nrate limit check]

    B1 -->|IP+user key| C1[Upstash sliding window\n5 req/IP/hour\n10 req/user/day]
    B2 -->|same IP+user key| C2[Upstash sliding window\nsame counters]

    C1 -->|count = 1, ok| D1[Geocodio call 1]
    C2 -->|count = 2, ok| D2[Geocodio call 2]

    D1 --> E1[UPSERT n400_user_profile\nonConflict: user_id]
    D2 --> E2[UPSERT n400_user_profile\nonConflict: user_id]

    E1 -->|last-write-wins| F([Profile saved])
    E2 -->|last-write-wins| F

    C1 -->|count > 5 in 1h| G1[429 response\n'Quá nhiều yêu cầu.\nThử lại sau X phút.']
    C2 -->|count > 10 in 24h| G2[429 response\n'Đã vượt quá giới hạn hôm nay.']
```

---

## Workflow 4: Edge Cases

```flowchart TD
    A([Edge case inputs]) --> B{Which case?}

    B -->|>1 district returned| C[parseGeocodioResponse\nreturns null\nNEVER pick first silently]
    C --> D[UPSERT profile\ndistrict_number = null\ndistrict_resolved_at = null]
    D --> E[Dashboard: Q29 shows\n'Chưa xác định được đại biểu.\nVui lòng liên hệ admin.']

    B -->|GEOCODIO_API_KEY missing| F[fetch sends\nAuthorization: Bearer undefined]
    F --> G[Geocodio returns 401]
    G --> H[GeocodioError 401\nSentry capture\nUser sees generic error]

    B -->|Address in DC or territory| I[Geocodio returns\nno congressional_districts field\nor empty array]
    I --> J[parseGeocodioResponse\nreturns null]
    J --> D

    B -->|User re-runs setup\nto change address| K[UPSERT with onConflict: user_id\noverwrites previous district]
    K --> L[district_resolved_at updated\nto new timestamp]
    L --> M([Profile updated])
```

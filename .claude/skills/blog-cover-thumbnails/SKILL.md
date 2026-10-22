---
name: blog-cover-thumbnails
description: Use when making or prompting a cover thumbnail for a mannaos.com blog post in any of the 6 categories (Immigration, Documents, Tax, Business, Insurance, AI), so every cover shares one style and each category keeps its own color family
---

# Blog cover thumbnails (mannaos.com)

One style for every cover, one color family per category. Never invent a new prompt structure or a new palette: fill the template below.

## The 6 categories and their color families

Shared on every cover: cream background `#F3EADC`, one warm gold accent `#E8A838`, soft paper grain. Only the three category colors change, and no two categories share a family.

| Category (blog key) | Service group | Deep | Mid | Light | Ground motif |
|---|---|---|---|---|---|
| Immigration (`immigration`) | Di trú | teal `#1F7A70` | teal `#2A9D8F` | mint `#CFEAE4` | layered teal sea waves, dashed path, paper airplane |
| Business (`business`) | Doanh nghiệp | navy `#123F6E` | ocean blue `#3A86C8` | pale sky `#CFE6F5` | layered blue paper hills |
| Tax (`tax`) | Thuế | burnt sienna `#8A3F1F` | terracotta `#C8643C` | peach `#F2C9A8` | rolling terracotta paper hills |
| Documents (`documents`) | Giấy tờ & Thủ tục Cá nhân | forest green `#2F6B3A` | leaf green `#6FAF4F` | pale sage `#E0EFCF` | layered green paper hills with leaves |
| Insurance (`insurance`) | Bảo hiểm & Bảo vệ Tài chính | plum `#5B3A7A` | orchid `#9B72B8` | lavender `#E6DCEF` | layered plum paper hills |
| AI (`ai`) | AI, Tự động hóa | graphite `#2E3A46` | slate `#6B7F92` | mist `#DDE4EA` | layered slate paper hills |

Status: Immigration, Business and Tax are in production. Documents (switched from teal to green on 2026-10-22 so it differs from Immigration), Insurance and AI are defined here and not yet confirmed by the owner. Do not mix families on one cover.

## Prompt template (fill the braces, change nothing else)

```
Layered paper-cut illustration, editorial style, warm cream background (#F3EADC) with soft paper grain. {SCENE}. {GROUND MOTIF from the table}. Palette: {deep name + hex}, {mid name + hex}, {light name + hex}, cream, one warm gold accent #E8A838{ (on the X) optional}. Soft short shadows between paper layers. Keep the top-left quarter calm and empty (plain cream sky) for a logo. No text, no letters, no numbers, no flags, no people, no logos. Landscape 1.9:1.
```

Rules for the scene:
- Right of center or centered, 3 to 6 objects, blank documents only (no words, no numbers).
- Small paper clouds and leaves are allowed; nothing in the top-left quarter.
- No currency symbols, flags, faces, real brands or logos. The logo is added afterwards.
- Gold appears once or twice, on a small object that fits the topic.

## Scenes already used (reuse the idea for similar posts)

Documents (8 posts):
1. SSN: a blank card with a shield and a keyhole, a pencil and a small clipboard.
2. REAL ID: a license-shaped card with a gold star badge, a small paper airplane and a car silhouette.
3. Birth certificate: a blank certificate with a round gold ribbon seal, a pair of baby footprints, a folder tab.
4. Newborn: a crib with a gold rattle, a folded blanket, a card with a cross symbol, three document sheets fanned out.
5. Passport: a closed passport with a plain cover and a gold star, a globe outline, a boarding-pass shaped card.
6. Name change: two blank ID cards joined by a curved arrow, a pen, two interlocking gold rings.
7. Bank account: a debit card, a stack of gold coins, a small bank building with columns.
8. Credit score: a gauge dial with a gold needle rising low to high, a credit card, a small three-bar chart.

Tax, Immigration and Business scenes are in the existing covers under `apps/website/public/images/blog/`; look at one of the same category before writing a new scene.

## Workflow

1. Pick the category from the post's `category`. Take the row of the table above.
2. Write one prompt per post from the template. Give the owner the prompts in code blocks, numbered in a fixed order, each labeled with the `slug_vi`.
3. Image source, in this order:
   - Owner generates the images from your prompts and sends them in the stated order (default, KIE credits ran out before).
   - Or generate with KIE.ai: `KIE_KEY=<key the owner pastes in chat> python3 -I scripts/kie_generate.py <out_dir> <spec.json>` where the spec is `{name: {"prompt": "...", "aspect_ratio": "16:9"}}`. Model `gpt-image-2-text-to-image`, resolution 1K. Never write the key to a file or commit it. A 402 means no credits: fall back to the owner.
4. Composite the logo card top-left and crop to 1200x630 webp:
   `node scripts/compose_cover.cjs <src.png> apps/website/public/images/logo-transparent.png apps/website/public/images/blog/<slug_vi>.webp apps/website`
   (last argument is the folder where `sharp` resolves).
5. Look at each result. The top-left logo card must not hide a drawn object; if it does, regenerate.
6. Cover path in the database is `/images/blog/<slug_vi>.webp`. Commit and push the images, wait for the deploy (cover URL returns 200), then insert the posts.

## Consistency checks before sending prompts

- Same template, same cream `#F3EADC`, same gold `#E8A838` as every earlier cover.
- The three category colors come from the table, none from another row.
- "Top-left quarter calm and empty" and "No text, no letters, no numbers, no flags, no people, no logos" are present.
- Prompts for one batch only differ in the scene.

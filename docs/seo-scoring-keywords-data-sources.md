# MaquiFit SEO — Scoring, Keywords & Data Sources

> **Status**: Current implementation uses simulated scoring and LLM-guessed keywords.  
> **Recommendation**: Integrate Google Search Console for data-driven optimization.

---

## 1. How the Dashboard Score Is Calculated Today

The dashboard displays an **estimated score** computed by `calculateSimulatedScore()` — a local heuristic defined in both:

- [`scripts/agent-seo-optimize.js` (lines 26–77)](../scripts/agent-seo-optimize.js)
- [`src/components/SeoDashboardContent.tsx` (lines 81–132)](../src/components/SeoDashboardContent.tsx)

### Point Breakdown

| Check                                        | Points Awarded |
| -------------------------------------------- | -------------- |
| Base score (always given)                    | **+30**        |
| Focus keyword found in SEO title             | **+20**        |
| Keyword appears in first half of title       | **+10**        |
| Focus keyword found in meta description      | **+20**        |
| Any word from the keyword found in the slug  | **+10**        |
| Title length 45–60 characters                | **+15**        |
| Title length 30–44 characters                | +8             |
| Title length >60 characters                  | +5             |
| Description length 120–160 characters        | **+15**        |
| Description length 80–119 characters         | +8             |
| Description length >160 characters           | +5             |

**Maximum raw total**: 120 → **capped at 100**.

### Known Weaknesses

- **Slug word matching is too generous**: matching a 2-letter word like `"de"` from the keyword against the slug awards +10 points. This is why many entries show inflated scores.
- **Ignores everything the real RankMath checks**: body content, internal links, external links, image alt text, heading structure, readability, schema markup, content length.
- **Not the actual RankMath score**: the real score stored in WordPress (`rank_math_seo_score` in `wp_postmeta`) is computed by the RankMath plugin inside the WordPress editor and is typically much lower.

### Example Trace — "Infusión de boldo 21 bolsitas"

```
Inputs:
  title    = "Infusión de boldo 21 bolsitas | MaquiFit"  (40 chars)
  desc     = "Compra infusión de boldo 21 bolsitas en MaquiFit. Una opción
              natural para apoyar tu bienestar diario y tu rutina saludable."  (~122 chars)
  keyword  = "infusión de boldo"
  slug     = "infusion-de-boldo-21-bolsitas-peumus-boldus"

Score buildup:
  Base                               +30  →  30
  Keyword in title                   +20  →  50
  Keyword in first half of title     +10  →  60
  Keyword in description             +20  →  80
  Slug word match ("de" matches)     +10  →  90
  Title length 40 (30–44 range)       +8  →  98
  Description length ~122 (120–160)  +15  → 113 → capped at 100

Dashboard displays: 100
Actual RankMath DB score: 71
```

---

## 2. How the Real RankMath Score Works

RankMath runs **inside WordPress** and evaluates ~40 on-page SEO signals when a post is saved or analyzed in the editor. It does **not** require any external API calls or Google integrations to compute its basic score.

### What RankMath Checks

| Category           | Specific Checks                                                              |
| ------------------ | ---------------------------------------------------------------------------- |
| **Focus Keyword**  | Present in title, URL, first paragraph, meta description, headings, alt text |
| **Title Tag**       | Length (optimal 50–60 chars), keyword position (front-loaded is better)       |
| **Meta Description**| Length (120–160 chars), contains keyword                                     |
| **Content Body**    | Word count (minimum ~300–600 words), keyword density (0.5–1.5%)             |
| **Readability**     | Paragraph length, subheadings every 300 words, passive voice, transition words|
| **Links**           | Internal links present, external links present, no broken links              |
| **Images**          | At least one image, alt text contains keyword                                |
| **URL / Slug**      | Short, contains keyword, no stop words                                       |
| **Schema**          | Structured data present (Product, Article, etc.)                             |

### Why Our Push Doesn't Change the RankMath Score

When we update `rank_math_title`, `rank_math_description`, and `rank_math_focus_keyword` via SSH + WP-CLI, we write directly to `wp_postmeta`. However, RankMath only recalculates `rank_math_seo_score` when:

1. A post is opened in the WordPress editor, OR
2. RankMath's SEO Analyzer is triggered manually, OR  
3. The post is saved through the WordPress admin UI

So after a push, the DB score remains stale until the post is re-analyzed inside WordPress.

---

## 3. How Keywords Are Currently Selected

Keywords are chosen by the Hermes LLM agent in [`scripts/agent-seo-optimize.js`](../scripts/agent-seo-optimize.js).

### The Prompt

```
You are an expert SEO copywriter and strategist. Optimize the metadata
for the website MaquiFit (an e-commerce brand for activewear, fitness
gear, and lifestyle).

For the provided page/product/post, select the most appropriate
trending focus keyword.
```

### What the LLM Receives

- Post title
- URL slug
- Language (fr/en/es)
- Content type (product/page/post)
- Current SEO title, description, and keyword

### What the LLM Does NOT Have Access To

| Missing Data                         | Impact                                                              |
| ------------------------------------ | ------------------------------------------------------------------- |
| Google Search Console query data     | Cannot see what people actually search for                          |
| Search volume / keyword difficulty   | Cannot prioritize high-volume, low-competition keywords             |
| Google Trends                        | Cannot identify rising or seasonal queries                          |
| Competitor keyword data              | Cannot find gaps or opportunities vs. competitors                   |
| Page body content                    | Cannot optimize keyword density or content relevance                |
| Click-through rate (CTR) data        | Cannot tell which titles/descriptions actually attract clicks       |
| Conversion data                      | Cannot prioritize pages that drive revenue                          |

The keywords are essentially the LLM's educated guesses based on its training data. They are not validated against any real search data.

---

## 4. Google Search Console (GSC) — What It Would Provide

Google Search Console is a **free** tool that shows how your site appears in Google Search results.

### Key Data Points

| Metric              | Description                                                                 |
| -------------------- | --------------------------------------------------------------------------- |
| **Queries**          | Exact search terms people used that triggered your pages                    |
| **Impressions**      | How many times each page appeared in search results                         |
| **Clicks**           | How many times people clicked through to your site                          |
| **CTR**              | Click-through rate (clicks ÷ impressions)                                   |
| **Average Position** | Where your page ranks on average for each query                            |
| **Index Coverage**   | Which pages are indexed, which have errors                                  |
| **Core Web Vitals**  | Page speed and user experience metrics                                     |

### How GSC Would Improve the SEO Workflow

1. **Data-driven keyword selection**: Instead of the LLM guessing, feed it the top queries from GSC for each page → optimize for keywords people *actually* search for.

2. **"Low-hanging fruit" identification**: Pages ranking in positions 8–20 (bottom of page 1, top of page 2) are the best optimization targets. A small improvement can jump them to the top of page 1.

3. **CTR optimization**: If a page has high impressions but low CTR, the title/description need work — exactly what this dashboard does.

4. **Before/after measurement**: After pushing SEO changes, track whether impressions and clicks improved over the following weeks.

### Integration Path

```
GSC API → query data per URL
    ↓
Agent receives: "This page ranks #14 for 'infusion boldo bienfaits',
                 800 impressions/month, 2% CTR"
    ↓
Agent optimizes title/description around THAT keyword
    ↓
Push via SSH → track position change over 2–4 weeks
```

GSC API access requires:
- A Google Cloud project with Search Console API enabled
- OAuth2 service account credentials OR user consent flow
- The site must be verified in Google Search Console

---

## 5. Google Analytics (GA4) — What It Would Provide

Google Analytics tracks **on-site behavior** after users arrive.

### Key Data Points

| Metric               | Description                                                          |
| --------------------- | -------------------------------------------------------------------- |
| **Page views**        | Which pages get the most traffic                                     |
| **Bounce rate**       | Percentage of visitors who leave without interacting                 |
| **Session duration**  | How long visitors stay on each page                                  |
| **Conversions**       | Purchases, add-to-cart events, form submissions                      |
| **Traffic sources**   | Organic vs. paid vs. direct vs. referral                             |
| **User demographics** | Location, language, device type                                      |

### How GA4 Would Improve the SEO Workflow

1. **Revenue-aware prioritization**: Optimize product pages that actually drive sales, not just ones with low scores.

2. **Bounce rate signals**: High bounce rate + low SEO score = highest priority fix (users arrive but immediately leave).

3. **Language targeting**: See which language versions get the most organic traffic → allocate optimization effort accordingly.

### Priority

GA4 is **lower priority** than GSC for SEO optimization. GSC tells you how to get more traffic; GA4 tells you what happens after they arrive. Start with GSC.

---

## 6. Recommendations

### Immediate (no external data needed)

- [ ] **Label the dashboard score as "Estimated"** — make it visually distinct from the real RankMath score to avoid confusion.
- [ ] **Show the actual RankMath DB score** alongside the estimate (it's already in the data as `rank_math_seo_score`).
- [ ] **Fix the slug word matching** in `calculateSimulatedScore()` — require the full keyword to match, not individual short words like "de".

### Short-term (requires GSC setup)

- [ ] **Connect Google Search Console API** — pull query data for each URL.
- [ ] **Feed real keyword data to the Hermes agent** — include top queries, impressions, and position in the optimization prompt.
- [ ] **Add a "Search Performance" column** to the dashboard showing impressions, clicks, and position from GSC.

### Medium-term (requires GA4 setup)

- [ ] **Connect Google Analytics Data API** — pull page-level traffic and conversion data.
- [ ] **Add revenue/conversion priority scoring** — weight optimization effort toward pages that drive sales.
- [ ] **Track post-push impact** — compare traffic metrics before and after SEO changes.

---

## 7. Current Data Flow (for reference)

```
WordPress DB (remote)
    ↓ SSH + WP-CLI pull
Local inventory.json + workflow_state.json
    ↓ Hermes LLM (no external search data)
Proposed SEO metadata (title, description, keyword)
    ↓ calculateSimulatedScore() (local heuristic)
Dashboard shows "Estimated Score"
    ↓ User approves
SSH + WP-CLI push → wp_postmeta updated
    ↓
RankMath score NOT recalculated (requires editor save)
```

### Improved Flow (with GSC)

```
WordPress DB (remote) + Google Search Console API
    ↓ SSH pull + GSC query pull
Local inventory + real search performance data
    ↓ Hermes LLM (WITH real keyword data, volumes, positions)
Data-driven SEO metadata proposals
    ↓ Real RankMath score shown alongside estimate
Dashboard shows both scores + search performance
    ↓ User approves
SSH push → wp_postmeta updated
    ↓ 2–4 weeks later
GSC data shows position/CTR improvement (or not)
```

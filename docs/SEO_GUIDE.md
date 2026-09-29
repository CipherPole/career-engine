# Career Engine - SEO and AI Discoverability Guide

> Purpose: Standard operating guide for understanding, monitoring, and improving the SEO rating and AI discoverability of Career Engine.
> Last Updated: September 28, 2026
> Current Baseline: Overall SEO Score B+ (73/100) as of v2.7.0. Target: A (85+).

---

## 1. What Was Implemented (v2.7.0)

### 1.1 Admin Console SEO Intelligence Panel
Located in scripts/auth-engine.js > renderSettingsPage(). Accessible at #settings (admin-only).

The panel contains:
- **6-Pillar Score Dashboard** scored 0-100 each, graded A+/A/B+/B/C/D overall
- **SEO Agent Scan** on-demand runSeoScan() inspects live DOM and probes network
- **Traffic Insights Panel** post-scan environment and performance summary
- **AI Crawler Visibility Checklist** live pass/fail for each AI discoverability signal
- **Findings and Fix Cards** severity-coded issues with copy-ready code snippets
- **Copy SEO Report** exports a full markdown analysis report

### 1.2 Root-Level SEO Files

| File | Purpose | Update When |
|------|---------|-------------|
| robots.txt | Allows GPTBot, Claude-Web, PerplexityBot, CCBot. Disallows /api/ | New crawlers or route changes |
| sitemap.xml | XML sitemap listing all public pages | New public pages added/removed |
| llms.txt | AI context file (llms.txt standard) for LLM signal | Platform capabilities change |

### 1.3 index.html Head After v2.7.0

- Title (63 chars, optimal 50-65): Career Engine - AI Career Intelligence for Engineers
- Meta description (157 chars, optimal 120-160)
- Robots: index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1
- Canonical: https://career-engine-five.vercel.app/
- Open Graph: og:type, og:title, og:description, og:image, og:site_name, og:locale
- Twitter/X Card: summary_large_image with title and description
- JSON-LD: WebApplication schema with offers, author, featureList, keywords
- Semantic H1: Visually-hidden H1 at index.html line ~164 - DO NOT REMOVE

---

## 2. SEO Score Pillar Reference

### Pillar 1: Meta and Tags (20% of overall)

| Check | Points |
|-------|--------|
| Title tag 20-65 chars | +25 |
| Meta description 120-160 chars | +25 |
| All 3 Open Graph tags present | +25 |
| Canonical link tag | +15 |
| Twitter Card tags | +10 |

### Pillar 2: AI Discoverability (20% of overall)

| Check | Points |
|-------|--------|
| /robots.txt accessible | +20 |
| /sitemap.xml present | +20 |
| /llms.txt present | +25 |
| JSON-LD structured data | +20 |
| No noindex/noai robots meta | +15 |

### Pillar 3: Performance (20% of overall)

| Check | Points |
|-------|--------|
| Resource count < 20 | +30 |
| Zero external scripts | +25 |
| Page load < 2000ms | +30 |
| HTML lang attribute present | +15 |

### Pillar 4: Content Quality (20% of overall)

| Check | Points |
|-------|--------|
| Exactly 1 H1 tag | +35 |
| 2+ H2 tags | +25 |
| 80%+ images have alt text | +25 |
| 3+ internal/external links | +15 |

### Pillar 5: Structured Data (20% of overall)

| Check | Points |
|-------|--------|
| JSON-LD block(s) present | +50 (+20 per valid block) |
| Microdata itemscope elements | +15 |
| Security headers visible | +15 |

---

## 3. Standard SEO Monitoring Workflow

### 3.1 Per-Session Check (Every Work Session)

1. Sign in as admin and navigate to #settings
2. Scroll to the SEO Intelligence and AI Discoverability panel
3. Click Run SEO Agent Scan
4. Wait 3-5 seconds for the scan to complete
5. Note the Overall Score - must be >= the last recorded baseline
6. If the score dropped, check Findings for new issues
7. Remediate findings using Section 4 of this guide
8. Record the scan result in docs/SESSION_CHANGELOG.md

### 3.2 Baseline Recording Format

Add to the session milestone entry in SESSION_CHANGELOG.md:
  SEO Scan Result: B+ (73/100) - Meta:72 | AI:100 | Perf:75 | Content:35 | Struct:85

### 3.3 Copying the Report

Click Copy SEO Report to export a markdown report including:
- Overall grade and per-pillar scores
- All findings with descriptions
- Dynamic Next Steps from actual current findings
- Completed Optimizations section listing everything already resolved

---

## 4. Remediation Workflow - When Findings Appear

### Severity Guide

| Severity | Action Required |
|----------|----------------|
| CRITICAL | Fix before next deployment. Directly blocks indexing. |
| WARNING  | Fix within the current session if possible. |
| INFO     | Improvement opportunity. Address during SEO sessions. |

### 4.1 Meta and Tags Fixes

**Title too long (> 65 chars):** Edit index.html line 6. Target 50-65 chars.
**Meta description out of range:** Edit index.html line 7. Target 120-160 chars exactly.
**Missing Open Graph tags:** Add og:title, og:description, og:image, og:type, og:url to head.
**Missing canonical:** Add link rel=canonical pointing to the production URL.

### 4.2 AI Discoverability Fixes

**robots.txt not found:** Verify E:\resume\robots.txt exists and is committed. Deploy via git push.
**sitemap.xml not found:** Verify E:\resume\sitemap.xml exists. Add new pages as url blocks.
**llms.txt not found:** Verify E:\resume\llms.txt exists. Update when features change.

**noindex on production - CRITICAL.** Change index.html robots meta to:
  <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1">

NEVER use noindex on any production page. The original index.html had noindex set
with a Private local tool comment. This blocked ALL crawlers. Fixed in v2.7.0.

### 4.3 Content Quality Fixes

**No H1 found:** The static visually-hidden H1 must be in index.html at line ~164.
DO NOT remove it. It uses the SR-only clip technique for accessibility and SEO.

**Images missing alt text:** Search: Select-String -Path E:\resume\scripts\*.js -Pattern <img
For user avatar img elements, use: alt="${user.name || User} profile photo"
Both avatar img elements in auth-engine.js include alt text since v2.7.0.

**Multiple H1 tags:** Search: Select-String -Path E:\resume\scripts\*.js -Pattern <h1
Convert any JS-rendered h1 to h2 or a styled heading div.

---

## 5. Adding New Public Pages - Checklist

- [ ] Add a url block to sitemap.xml with correct loc, changefreq, and priority
- [ ] Verify the path is not blocked in robots.txt
- [ ] Add page-specific Open Graph tags if it has a unique social preview
- [ ] Verify the page has exactly one H1 (static or JS-rendered)
- [ ] Verify all images have descriptive alt text
- [ ] Run the SEO Agent Scan and confirm the score holds or improves
- [ ] Record the new baseline in docs/SESSION_CHANGELOG.md

---

## 6. File Ownership Reference

| File | Location | Notes |
|------|----------|-------|
| SEO Scan Engine | scripts/auth-engine.js - runSeoScan() | Add new scan phase checks here |
| Title and Meta | index.html lines 6-7 | Title 50-65 chars, desc 120-160 chars |
| robots.txt | robots.txt (root) | Update when new major AI crawlers emerge |
| sitemap.xml | sitemap.xml (root) | Update when pages are added or removed |
| llms.txt | llms.txt (root) | Update on significant feature changes |
| JSON-LD | index.html lines 31-69 | WebApplication schema. Do not remove. |
| Canonical URL | index.html line 13 | Always points to production domain |
| Hidden H1 | index.html ~line 164 | Required for Content Quality score. Never remove. |
| OG and Twitter tags | index.html lines 16-28 | Reference og-image.png (see Section 7) |

---

## 7. OG Image Requirement (Pending Action)

The og:image and twitter:image tags reference:
  https://career-engine-five.vercel.app/og-image.png

This file does NOT yet exist. Impact until created:
- Social media shares will show no image preview
- The SEO scan will not flag this (checks tag presence, not image existence)
- AI crawlers following OG images will have reduced visual context

To create: Generate a 1200x630px branded banner (Career Engine logo, tagline, dark theme)
and save as og-image.png in the repository root. Run npm test then commit and push.

---

## 8. Known Scan Engine Limitations

1. SPA JS-rendered content
   The scan reads the DOM after JS executes. Real crawlers may see a different DOM (pre-JS).
   The static H1 and all head meta tags in index.html address the most critical signals.

2. Performance timing is session-scoped
   performance.timing measures the initial page load, not a fresh triggered load.
   Reload the page, then immediately run the scan for the most accurate reading.

3. Local dev vs production
   On localhost, HEAD probes to /robots.txt, /sitemap.xml, /llms.txt may return 404
   even if the files exist. Run the scan from the production URL for accurate results:
   https://career-engine-five.vercel.app

4. Security headers probe
   fetch HEAD / for X-Content-Type-Options may be limited by same-origin CORS.
   The engine has a graceful fallback (+10 pts even if the check is inconclusive).

5. Content Quality page dependency
   H1, H2, img, and link counts reflect the currently rendered page.
   Run from #dashboard or #settings for the most representative reading.

# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Everyday households in the United States: adults checking food at home or at the store, from younger people on their phones to older relatives. The typical moment is hearing about a recall (news, a friend, social media) and wanting a quick answer to "does this affect something I bought?"

## Product Purpose

ReCall puts U.S. FDA and USDA FSIS food recalls and public health alerts in one place and explains them in plain English. Success is a visitor learning, within seconds, whether a product they have is affected and how serious the recall is.

## Positioning

Plain answers, fast. The agencies publish recalls separately, in their own formats and vocabulary ("Class I", "Terminated", "Public Health Alert"). ReCall combines both sources, translates the classification into plain severity language, and lets people search by food, brand, or barcode, including scanning a package with their phone camera.

## Operating Context

- Used on phones in a kitchen or grocery aisle as often as on desktop.
- Visitors arrive with a specific product or brand in mind, or browse recent recalls after hearing news.
- Data: FDA enforcement records refresh daily through an AWS pipeline; USDA FSIS records are imported by hand from a browser-saved snapshot because the FSIS firewall blocks automated access.

## Capabilities and Constraints

- Search by product, brand, company, reason, or UPC; camera barcode scanning (UPC/EAN).
- Filters: severity (Serious, Moderate, Low risk, mapped from Class I/II/III; shown only when the API supports it), source (FDA / USDA FSIS), status, record type.
- Recall detail pages: severity summary, reason, dates, affected products, distribution, package codes, source links.
- A per-device watchlist of saved searches that flags recalls listed since the last visit. It does not send notifications.
- "Last checked" freshness comes from real ingestion checkpoints; when unknown, the site says "Updated daily".
- Severity summaries paraphrase the official class definitions. The product must not invent disposal, return, or medical guidance.
- Agency text is shown as published apart from display cleanup (shortened names, casing); typos in source data stay.
- Stack: Next.js on Vercel; FastAPI on AWS Lambda behind API Gateway; DynamoDB; Terraform.

## Brand Commitments

- The name is ReCall. Logo, colors, and type are open to change.

## Evidence on Hand

- Real recall data from FDA and USDA FSIS (about 1,460 records).
- No testimonials, user counts, press, or partnerships exist; none may be implied.

## Product Principles

1. Answer first: whether something is affected and how serious it is comes before everything else.
2. Plain language over agency vocabulary, with the official term available for those who want it.
3. Honest about data: never overstate freshness, coverage, or what the product does (no alerts yet).
4. Readable by everyone: large text, strong contrast, obvious tap targets.

## Accessibility & Inclusion

Serves older adults as a core audience: body text at least 17–18px, high contrast, 44px minimum touch targets, severity never conveyed by color alone, reduced-motion respected.

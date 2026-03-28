# Mautic — AI Features Deep Technical Report

> Researched against mautic/mautic `5.x` branch and Mautic 7 RC (March 2026).
> Source: GitHub, official docs, developer docs, community forums, plugin registry.

---

## 1. Overview

| Property | Value |
|---|---|
| Repository | https://github.com/mautic/mautic |
| Stars | ~9,400 |
| Forks | ~3,200 |
| License | GPL v3 |
| Total commits | 35,490+ |
| Open PRs | 225+ |
| Contributors | 152+ code + thousands of community volunteers |
| Active users | 200,000+ organizations |
| Current stable | Mautic 5.2 |
| Next major | Mautic 7 (RC released 2025, stable Q4 2025) |

**What it does.** Mautic is the world's largest open-source marketing automation platform. It covers the full B2B/B2C lifecycle: contact capture, behavioral tracking, lead scoring, segmentation, multi-channel campaign automation (email, SMS, push, web), and CRM sync. Everything runs self-hosted.

**Tech stack.**

| Layer | Technology |
|---|---|
| Language | PHP 8.2+ |
| Framework | Symfony 6.4 (Mautic 5) / Symfony 7.3 (Mautic 7 RC) |
| ORM | Doctrine DBAL + ORM |
| Database | MySQL 8+ / MariaDB 10.3+ |
| Frontend | Twig templates, GrapesJS email/page builder, MJML |
| Queue | Database-backed queue (optional RabbitMQ for scale) |
| Packaging | Composer (PHP), npm (assets) |
| Deployment | Apache/Nginx + PHP-FPM, Docker/DDEV |

**Last major activity.** The 7.x branch was actively accepting PRs at the time of this research. Mautic 7 RC dropped PHP 8.0/8.1 support, moved to Symfony 7.3, and removed large amounts of legacy code.

**No native AI.** The core product ships with zero machine learning. Every "AI feature" either arrives via third-party integration platforms (n8n, Zapier, Latenode) or community/commercial plugins. The Mautic World Conference 2025 featured multiple AI sessions, indicating the community is actively building toward this direction but nothing has merged into core yet.

---

## 2. AI Architecture

### 2.1 Lead Scoring — Rule-Based, Not ML

Mautic's scoring engine is a **purely rule-based, additive integer accumulator**. There is no statistical model, no training loop, no feature vector. Here is the actual execution path:

```
Event fires (email open, form submit, page hit, …)
  → PointModel::triggerAction($type, $lead, $request)
    → getPublishedByType($type)          // load matching Point rules
    → foreach rule:
        checkLeadLog($lead, $rule)       // deduplicate if !repeatable
        executeCallback($rule, $lead)    // optional custom logic
        lead->adjustPoints($rule->getDelta())
        log = new PointsChangeLog()
        log->setDelta($delta)
        log->setLead($lead)
        log->setType($type)
        log->setIpAddress($ip)
        dispatch(PointEvents::POINT_ON_ACTION)
```

**Key entity: `Point`**

```php
// app/bundles/PointBundle/Entity/Point.php
private string $type;       // "email.open", "url.hit", "form.submit", …
private int    $delta;      // signed integer — can be negative
private bool   $repeatable; // award every time vs first time only
private array  $properties; // type-specific config (URL pattern, form ID, …)
private ?Group $group;      // optional Point Group (Mautic 5+)
```

**Key entity: `Lead` (contact)**

```php
// app/bundles/LeadBundle/Entity/Lead.php
private int $points = 0;                     // global score
private Collection $pointChanges;            // change queue (request lifecycle)
private Collection $pointsChangeLog;         // persistent audit log
private Collection $groupContactScore;       // per-group scores (Mautic 5+)
```

### 2.2 Point Groups (Mautic 5+ Multi-Dimensional Scoring)

Mautic 5 introduced **Point Groups**, the most significant scoring upgrade to date. Instead of one integer per contact, you can define multiple scoring dimensions — product interest, engagement level, content consumption, funnel stage readiness — each tracked as a separate `GroupContactScore` record.

Groups can be used as filter criteria in segments and as conditions in campaign decision nodes. This enables multi-variate qualification logic without ML, e.g., "contact has score > 50 in group 'Product Interest' AND score > 30 in group 'Engagement'".

Mautic 5.1 added a UI modal to manually edit per-group scores directly on the contact profile.

### 2.3 Segmentation Intelligence

Segmentation is **SQL-driven dynamic filtering**, not clustering. The `ContactSegmentQueryBuilder` converts a stored filter graph into Doctrine DBAL SQL at rebuild time:

```php
// app/bundles/LeadBundle/Segment/Query/ContactSegmentQueryBuilder.php
foreach ($contactSegmentFilters as $filter) {
    dispatch(LeadEvents::LIST_FILTERS_ON_FILTERING, $filterEvent);
    if ($filterEvent->isFilteringDone()) continue; // plugin override hook
    $qb->applyFilter($filter);  // Doctrine DBAL expression
}
$qb->applyStackLogic();         // AND/OR combinator resolution
```

Supported filter operators: `=`, `!=`, `like`, `!like`, `in`, `!in`, `empty`, `!empty`, `regexp`, date relative expressions (e.g., `"last 30 days"`), and cross-segment references (with circular dependency validation).

Segment rebuild runs as a cron job (`mautic:segments:update`) on a configurable schedule. Membership changes fire `LeadEvents::LEAD_LIST_CHANGE`, which triggers campaign enrollment downstream.

### 2.4 No Predictive Features in Core

As of Mautic 5.2, core ships with **zero predictive features**:

- No churn prediction
- No next-best-action recommendations
- No send-time optimization algorithms (the feature exists only as static scheduling)
- No NLP-based lead qualification
- No embedding-based similarity search

The Leuchtfeuer study (referenced in community docs) measured traditional Mautic scoring at ~77% accuracy vs ~95% for an ML model trained on the same data, a gap the community is aware of but has not addressed in core.

---

## 3. Key AI Features (What Actually Exists)

### 3.1 Lead Scoring Methodology

**Behavioral signals (additive)**

| Action | Typical delta | Repeatable |
|---|---|---|
| Page view | +1–5 | Yes |
| Email open | +5–10 | No (first open) |
| Email click | +10 | No |
| Form submission | +10–20 | No |
| Asset download | +15–30 | No |
| Webinar attendance | +40 | No |
| Pricing page visit | +25 | Yes |
| Careers page visit | −15 | Yes |
| Unsubscribe | −50 | — |

**Demographic/firmographic signals** are scored via campaign actions, not the native point engine. The `PointBundle` only scores events. Demographic qualification (job title, company size, industry) is applied as a campaign-level `adjustPoints` action or via negative suppression segments.

**Decay model** (implemented via campaign, not native engine):
```
Segment: contacts with points > 0
  Wait: 7 days
  Action: Adjust Points by −10
  Condition: if points < 10 → set to 0
  Loop back to Wait
```
This is a manually constructed workflow. There is no native decay scheduler.

**Score ceiling** is enforced similarly — a campaign-based ceiling cap prevents runaway accumulation (typical ceiling: 70–100 points).

### 3.2 Dynamic Content Personalization

Mautic's personalization is **token substitution + conditional block rendering**, not generative AI.

**Token system:**
```
{contactfield=firstname}
{contactfield=company}
{contactfield=city|default=there}
```
Tokens are resolved at send time by hydrating the contact entity. Company data is fetched via `getContactCompanies()` for account-level tokens.

**Dynamic content blocks** (email + web):
```html
<!-- Web page markup -->
<div data-slot="dwc" data-param-slot-name="hero-message">
  Default content (anonymous visitors)
</div>
```
Mautic's JS (`mtc.js`) POSTs the slot name to `/dwc/slot/{name}`, which evaluates the contact's stored segment/field conditions server-side and returns the matching variant HTML. Filter logic is identical to segment filters (Doctrine DBAL conditions).

**Campaign-driven dynamic content** allows A/B splits at the campaign level without filters — direct condition branches per variant.

### 3.3 A/B Testing

Email-level A/B test implementation (from `EmailModel`):

```php
// Weight-based distribution
"weight_deficit" = $weight - ($variantCount / $totalSent);
"send_weight"    = $weight_deficit + $weight;
// Contacts are shuffled then assigned to variants
// by descending weight_deficit order
```

- Variant reads/clicks tracked separately via `incrementRead(isVariant: true)`
- Statistics exposed in the email detail report
- **No automatic winner declaration** — this is a GitHub open issue (#1752) since 2015. Winner selection is manual.
- **Known reporting bug** (#12798): A/B stat graphs show CTR (clicks/reads) in both columns instead of reads/sent in one — misleading read rate display.
- **No campaign-level A/B testing** natively. Workaround: probabilistic condition node with random split via the Keller plugin or manual campaign duplication.

### 3.4 Campaign Engine

The campaign execution model is **event-sourced, cron-driven**:

```
mautic:campaigns:update   → enroll contacts matching segment triggers
mautic:campaigns:trigger  → process pending event actions/decisions
  Recommended schedule: every 15 minutes (10,25,40,55 * * * * php bin/console …)
  Batch default: 300 contacts
  Since Mautic 5.1: processes newest campaigns first (priority inversion fix)
```

Campaign nodes fall into three categories:
- **Actions**: send email, adjust points, change stage, update field, send webhook, add to segment
- **Decisions**: email open, email click, page visit, form submit, point threshold
- **Conditions**: contact field value, segment membership, point group score, stage

The decision graph is a tree of `CampaignEvent` entities with `decision_path` (`yes`/`no`) and parent/child relationships. Execution ordering is computed by `buildOrder()` — a recursive depth-first traversal.

### 3.5 Email Scheduling

There is **no send-time optimization** in core. Mautic supports:
- Immediate send
- Scheduled send (specific datetime)
- Campaign-based delays (static: "wait 3 days"; dynamic: "wait until Monday 9am")

The `MessageQueueModel` handles frequency rule enforcement (max N emails per time window per contact) and batching, but makes no timing predictions.

### 3.6 Contact Tracking Pipeline

```
1. First visit:
   mtc.js loads → POST /mtc/event → anonymous contact created
   fingerprint hash computed from: screen resolution, timezone, platform,
   adblock presence, DNT flag (Fingerprint2 library)
   cookie set: 1-year lifetime on Mautic domain

2. Form submission / email click:
   Contact identified → anonymous merged with known record
   date_identified timestamp set

3. Ongoing:
   Every page hit → LeadEventLog entry + UTM tag capture
   IP address recorded → geolocation lookup → city/country/timezone fields
   "Last Active" timestamp updated

4. Score engine:
   mautic:contacts:deduplicate (cron) → merge duplicate contacts
   PointModel::triggerAction fires synchronously on identified events
```

---

## 4. Data Pipeline

The full behavioral data → action pipeline:

```
[Contact touches channel]
       |
       v
[mtc.js / tracking pixel / email pixel / API]
       |
       v
[LeadEventLog: page_hit, email_open, form_submit, ...]
       |
       v -- PointModel::triggerAction() (synchronous)
       |
[Lead.points += delta] --> [PointsChangeLog]
[GroupContactScore.score += delta] (if group assigned)
       |
       v -- mautic:segments:update (cron, 1-15 min)
       |
[ContactSegmentQueryBuilder runs SQL]
[lead_lists_leads table updated]
[LeadEvents::LEAD_LIST_CHANGE dispatched]
       |
       v -- mautic:campaigns:update (cron, 15 min)
       |
[MembershipBuilder enrolls new contacts in campaigns]
       |
       v -- mautic:campaigns:trigger (cron, 15 min)
       |
[CampaignEventDispatcher evaluates pending events]
[Actions execute: send email, webhook, CRM push, ...]
       |
       v
[EmailModel::sendEmail() → Mailer transport → delivery]
[WebhookModel::fireWebhooks() → HMAC-signed POST to endpoint]
```

**Latency characteristics.** Because everything runs on a poll/batch cron schedule, the minimum end-to-end latency from a contact behavior to a campaign action is approximately 15–30 minutes. Real-time response requires either: (a) shortening all crons to 1-minute intervals (resource-intensive), or (b) using the "immediate" webhook mode that fires synchronously during the HTTP request.

**State accumulation.** All behavioral data persists in MySQL. The `lead_event_log` table grows unboundedly — high-traffic installations accumulate millions of rows. Mautic provides no built-in archival or time-windowed scoring. All score calculations reference the full log history.

---

## 5. Evaluation / Quality

### 5.1 Campaign Analytics

Mautic tracks per-email:
- Sent, delivered, bounced (hard/soft), unsubscribed counts
- Open rate (pixel fire), click rate (redirect URL)
- Read-to-click rate
- A/B variant comparison (see bug note in section 3.3)

Campaign-level reporting shows:
- Contact progression through campaign nodes
- Conversion events per node
- Active vs completed contacts

Reports are generated as SQL aggregations at view time — no pre-computed OLAP layer.

### 5.2 A/B Test Accuracy

- No statistical significance calculation is built in. There is no p-value display or minimum sample size recommendation.
- Issue #1752 (open since 2015) requests automatic winner selection. As of 5.2, winner selection requires a manual "Select Winner" button click.
- No multivariate testing (MVT) — only binary A vs B.

### 5.3 Score Accuracy Measurement

Mautic provides no native MQL accuracy measurement. The community-recommended approach is a 4-quadrant feedback loop implemented as a campaign:

```
MQL alert fires → send feedback form to sales rep
  3-day wait → if no response → resend
  Sales rep clicks: Good / Bad Timing / Bad Fit / Junk
    → response submitted via auto-submit kiosk form
    → Mautic updates contact custom field "MQL Feedback"
    → segment + campaign routes contact to appropriate track
```

Summary reporting: filter `LeadEventLog` by MQL campaign event, group by feedback field, count per category. This is a manual setup — no built-in MQL quality dashboard exists.

---

## 6. Rust/ML Relevance

### 6.1 Could the Scoring Engine Be Replaced with an ML Model?

Yes, and the architecture makes it relatively straightforward. The `PointModel::triggerAction()` method is the single chokepoint. A replacement could intercept at two levels:

**Option A — Sidecar scoring service (recommended).**
Deploy a Rust inference service (ONNX via `tract`, or `candle`-based gradient boosting) that exposes a `/score` endpoint. Mautic calls it via a custom `PointType` plugin callback:

```php
// Custom PointType callback
public function validateAction(array $eventDetails, Lead $lead): bool {
    $features = $this->featureExtractor->extract($lead);
    $score = $this->rustScoringClient->predict($features); // HTTP/gRPC
    $lead->adjustPoints($score - $lead->getPoints());
    return true;
}
```

**Feature vector for ML scoring model:**

| Feature | Source |
|---|---|
| `days_since_first_touch` | `Lead.date_added` |
| `days_since_last_active` | `Lead.last_active` |
| `total_page_views_30d` | `lead_event_log` count |
| `email_open_rate` | `email_stats` |
| `email_click_rate` | `email_stats` |
| `form_submissions` | `lead_event_log` |
| `asset_downloads` | `lead_event_log` |
| `pricing_page_visits` | `lead_event_log` (URL filter) |
| `job_title_seniority` | NLP-classified `title` field |
| `company_size_bucket` | `lead_fields.company_size` |
| `industry_icp_match` | lookup table |
| `utm_source_quality` | `utm_tags` |

The Leuchtfeuer benchmark showed 77% (rule-based) → 95% (ML) on identical data, confirming the model improvement ceiling is substantial.

**Option B — Export/import batch scoring.**
Mautic's REST API (`GET /api/contacts` with filters) exports contacts as JSON. An external Python/Rust process scores them, then `PATCH /api/contacts/{id}` updates the `points` field. This is the current de facto community approach but adds a full cron cycle of latency.

### 6.2 PHP → Modern Stack Migration Considerations

| Concern | Details |
|---|---|
| **Campaign execution** | The cron-based trigger model is a fundamental design constraint, not an implementation detail. A modern platform should use an event-driven queue (Kafka, NATS) instead. |
| **Scoring latency** | 15–30 min minimum latency is acceptable for B2B email campaigns but unacceptable for real-time web personalization. |
| **Segment rebuild cost** | `rebuildListLeads()` runs full-table SQL scans at cron time. At 100k+ contacts, this dominates DB load. A proper platform would maintain segment membership incrementally via CDC (change data capture). |
| **PHP's concurrency model** | Single-threaded PHP-FPM means no parallel campaign processing. Mautic works around this with `ContactLimiter` batch splitting across cron invocations. |
| **No streaming** | All data is batch-pulled, never streamed. Behavioral events are not published to a message bus. |
| **Type safety** | Doctrine entity hydration is implicit. No compile-time guarantees on field types — bugs emerge at runtime. |
| **ML serving** | PHP has no viable ML inference libraries. Every ML integration requires an out-of-process call. A Rust/Go sidecar is mandatory for non-trivial models. |

---

## 7. Integration Points

### 7.1 REST API

Mautic exposes a full CRUD REST API (OAuth2 + Basic Auth):

Key contact endpoints:
```
GET    /api/contacts
GET    /api/contacts/{id}
POST   /api/contacts/new
PATCH  /api/contacts/{id}/edit
DELETE /api/contacts/{id}
POST   /api/contacts/{id}/points/plus/{delta}
POST   /api/contacts/{id}/points/minus/{delta}
POST   /api/contacts/{id}/segments/{segmentId}/add
GET    /api/contacts/{id}/activity
```

No GraphQL. REST only. No rate limiting by default (a documented security gap).

### 7.2 Webhooks

Seven event types fire webhooks:

| Event | Trigger |
|---|---|
| `lead.create` | New contact created |
| `lead.update` | Contact field updated |
| `lead.delete` | Contact deleted |
| `lead.identified` | Anonymous contact identified |
| `lead.point_change` | Score delta applied |
| `email.read` | Email opened |
| `form.submitted` | Form submission received |
| `page.hit` | Page hit recorded (high volume) |
| `stage.changed` | Pipeline stage changed |

Payload format:
```json
{
  "mautic.lead_post_save_new": [{
    "lead": {
      "id": 1234,
      "points": 55,
      "fields": { "core": { "email": "...", "firstname": "..." } },
      "tags": ["prospect", "webinar-attended"]
    },
    "timestamp": "2025-03-01T10:00:00+00:00"
  }]
}
```

Security: HMAC-SHA256 signature in `Webhook-Signature` header. Shared secret configured per webhook.

Two delivery modes:
- **Immediate**: synchronous, blocks request, 10s timeout
- **Queued**: async via `mautic:webhooks:process` cron (batches of 10)

### 7.3 Native CRM Integrations

| CRM | Sync type | Notes |
|---|---|---|
| Salesforce | Bidirectional | Lead/Contact push on MQL trigger, field mapping UI |
| HubSpot | Push (Mautic → HubSpot) | Contact push on point trigger or campaign action |
| Zoho CRM | Bidirectional | Standard contact sync |
| SugarCRM | Bidirectional | Legacy, community-maintained |
| MS Dynamics | Bidirectional | Plugin maintained by community |
| ConnectWise | Push | Ticket/company sync |

CRM sync is **not real-time** — it runs through the campaign/point trigger mechanism, so minimum latency is one cron cycle.

### 7.4 Plugin Ecosystem for AI Extensions

The Mautic Marketplace (installable from UI or CLI) hosts community plugins. AI-relevant entries:

| Plugin | Source | Capability |
|---|---|---|
| ChatGPT Email Wizard | Community | GPT-4 subject line + body generation inside email editor |
| GrapesJS + GPT | Community | Text generation inside GrapesJS drag-drop builder |
| Twig Templates (mtcextendee) | Commercial | Jinja2-level template logic for hyper-personalization |
| Unlimited SQL (mtcextendee) | Commercial | Arbitrary SQL as segment filter — enables ML score import |
| Multiple Email Transport | Commercial | Routing rules across ESPs (not AI, but pipeline-relevant) |

Integration via automation platforms:
- **n8n**: Mautic triggers → OpenAI/Anthropic calls → write back via Mautic API
- **Zapier MCP**: Mautic actions exposed as MCP tools for AI agents
- **Latenode**: No-code Mautic + LLM (Mistral, GPT-4) content generation
- **Lindy AI**: AI agent workflows with Mautic as action target

No plugin exists as of March 2026 for: predictive lead scoring, churn prediction, automated send-time optimization, or embedding-based segmentation.

---

## 8. Gaps and Weaknesses

### 8.1 PHP / Legacy Tech Debt

- **Single-threaded execution model**: campaign processing is sequential per cron run, bounded by PHP-FPM process count
- **ORM impedance mismatch**: Doctrine's entity hydration on large `lead_event_log` tables causes memory pressure; installations report needing 512MB+ PHP memory limits for large batch runs
- **No streaming processing**: no CDC, no event bus, no reactive pipeline
- **Global mutable state**: scoring is applied directly to the `Lead` entity within the HTTP request, making it impossible to parallelize without locks
- **Mautic 7 improvements**: Symfony 7.3 + PHP 8.4 removes a lot of legacy code, but the fundamental execution model remains unchanged

### 8.2 Lack of Modern ML-Based Features

| Missing capability | Competing platform that has it |
|---|---|
| Predictive lead scoring | HubSpot (Predictive Lead Scoring), Salesforce (Einstein) |
| Send-time optimization | ActiveCampaign, Klaviyo, Brevo |
| Automatic winner selection in A/B tests | Mailchimp, ActiveCampaign |
| Behavioral clustering / AI segmentation | Klaviyo, Customer.io |
| LLM-based subject line optimization | HubSpot, Mailchimp |
| Churn/re-engagement prediction | Salesforce Marketing Cloud |
| Product recommendation engine | Klaviyo, Salesforce Commerce |
| Natural language segment builder | HubSpot Breeze |

### 8.3 Architectural Limitations vs Modern Alternatives

| Dimension | Mautic | Modern B2B Platform |
|---|---|---|
| Scoring latency | 15–30 min (cron) | Sub-second (event-driven) |
| Segment update | Batch SQL rebuild | Incremental CDC |
| ML scoring | Not available natively | Real-time inference |
| API | REST only | REST + GraphQL + webhooks + gRPC |
| Rate limiting | None (security gap) | Per-key rate limiting |
| Multi-tenancy | Single-tenant | Multi-tenant SaaS option |
| Observability | Basic email stats | Full funnel attribution, revenue influence |
| A/B winner | Manual | Statistical auto-declare |

### 8.4 Scoring System-Specific Gaps

- **No demographic scoring in native point engine**: company size, job title, industry must be handled via campaign workarounds
- **No negative score floor**: without a manual campaign, scores can go negative
- **No score expiry**: old scores from years-ago engagement pollute qualification
- **No account-based scoring**: all scoring is contact-level; no Company-level aggregate scoring (though company score field exists, it is manually maintained)
- **No ML feedback loop**: scored contacts are never used to retrain any model
- **No confidence score**: every rule-triggered point change has the same epistemic status — no signal quality weighting

---

## 9. Takeaways for a B2B Lead Gen Platform

### 9.1 Lead Scoring Patterns Worth Stealing

**Multi-dimensional scoring (Point Groups pattern)**
Don't store a single integer. Store a score vector per contact. Minimum useful dimensions for B2B:
```
{
  product_interest:  int,   // scores on product-specific content
  engagement:        int,   // frequency/recency of interactions
  intent:            int,   // high-signal actions (pricing, demo, ROI calc)
  fit:               int,   // demographic/firmographic match
  relationship:      int,   // sales team touchpoints
}
```
Qualification logic becomes: `intent > 40 AND fit > 60`, which is far more accurate than a single threshold.

**Decay model as a first-class scheduler**
Do not rely on manual campaign workarounds. Build decay directly into the scoring engine as a configurable half-life parameter per dimension:
```
score(t) = score(t0) * e^(-λ * days_elapsed)
```
where `λ` is dimension-specific (engagement decays faster than fit).

**Suppression as a scoring axiom**
Build suppression lists (employees, competitors, students, low-seniority contacts) into the scoring pipeline as zero-weight multipliers, not as separate campaigns.

**Feedback loop architecture**
Implement MQL quality feedback as a structured table, not a contact custom field. Enable SQL queries across the feedback corpus to retrain scoring weights iteratively.

### 9.2 Campaign Automation Patterns

**Event-driven execution instead of cron batching**
Every behavioral event should publish to an internal event bus. Campaign evaluation should be triggered per-contact in real time, not polled in batches. This drops the action latency from 15–30 minutes to under one second.

**Decision node types to implement natively**
The Mautic campaign node taxonomy is solid. These decision types are the minimum viable set:
- Point threshold (global and per-group)
- Segment membership
- Field condition (with regex support)
- Time-since-last-action
- Stage transition
- Company field condition (account-based logic)

**Condition branching with probability**
Add a `Random Split` node type (Mautic lacks this natively, it's a plugin). Enables true A/B testing within campaigns, not just email variants.

**Frequency rules as a pipeline primitive**
Mautic's `FrequencyRule` (max N emails per M days per channel) is a critical anti-spam safeguard. Implement this at the contact level, not campaign level, so it applies globally across all active campaigns.

### 9.3 Data Pipeline Patterns

**Incremental segment evaluation**
Replace full-scan SQL rebuilds with a CDC approach: when a contact field changes, evaluate only the segments whose filter definitions reference that field. Store a `field → segment dependency map` and invalidate selectively.

**Behavioral feature store**
Pre-aggregate behavioral events into a feature table refreshed on a short interval (1–5 min):
```sql
CREATE TABLE contact_features (
  contact_id       bigint PRIMARY KEY,
  page_views_30d   int,
  email_opens_30d  int,
  email_clicks_30d int,
  last_intent_at   timestamptz,
  days_since_active int,
  intent_score     float,
  fit_score        float,
  updated_at       timestamptz
);
```
This makes ML scoring fast (no live aggregation) and makes segment queries cheap (indexed integer comparisons).

**ML scoring integration pattern**
The cleanest architecture for dropping an ML model into a Mautic-style pipeline:

```
behavioral events → feature store (rolling aggregations)
                  → ML scoring service (Rust + ONNX/candle)
                      → returns { score: float, confidence: float, features: {...} }
                  → contact score update (write to DB)
                  → segment membership re-evaluation (triggered by score change)
                  → campaign actions (triggered by segment change)
```

The Rust inference service should serve ONNX models for gradient boosting (XGBoost/LightGBM exported to ONNX) or use `candle` for neural models. Target p99 latency: < 5ms per contact scoring call.

### 9.4 What Not to Copy

- **Cron-based execution**: the fundamental architecture bottleneck. Design around an event bus from day one.
- **Single `points` integer**: immediately limiting. Use a score map.
- **No rate limiting on the API**: a security requirement, not a nice-to-have.
- **Sync-only webhook delivery**: build async-first with at-least-once delivery guarantees from the start.
- **No statistical significance in A/B**: any modern platform should auto-declare winners at configurable confidence levels (typically p < 0.05).

---

## References

- mautic/mautic GitHub: https://github.com/mautic/mautic
- PointBundle source (5.x): `app/bundles/PointBundle/`
- LeadBundle source (5.x): `app/bundles/LeadBundle/`
- EmailBundle source (5.x): `app/bundles/EmailBundle/`
- Mautic World Conference 2025 coverage: https://www.droptica.com/blog/mautic-world-conference-2025-ai-deliverability-and-future-marketing-automation/
- Lead Scoring & ML in Mautic (Leuchtfeuer): https://leuchtfeuer.com/en/mautic/know-how/mautic/lead-scoring-machine-learning-in-mautic/
- Lead Scoring Best Practices: https://kb.mautic.org/article/lead-scoring-best-practices-with-mautic.html
- Segment Filter Engine (DeepWiki): https://deepwiki.com/mautic/mautic/2.3-segments-(lists)-and-dynamic-filtering
- Mautic 5 Point Groups: https://docs.mautic.org/en/5.x/points/point_groups.html
- Webhook developer docs: https://raw.githubusercontent.com/mautic/developer-documentation/main/source/includes/_webhooks.md
- HubSpot vs Mautic technical comparison: https://crafting.email/hubspot-vs-mautic/
- Mautic 7 RC changelog: https://www.thedroptimes.com/56157/mautic-70-release-candidate-introduces-symfony-73-php-84-support-and-core-enhancements
- Mautic Extendee plugins: https://mtcextendee.com/plugins
- Dynamic content personalization: https://www.droptica.com/blog/content-personalisation-mautic-tutorial-mautic-dynamic-content/
- Cron job documentation: https://joeykeller.com/ultimate-guide-to-mautic-cronjobs/
- AI use cases forum thread: https://forum.mautic.org/t/question-mautic-use-case-with-ai/26732

---

## 10. Deep ML Analysis

### 10.1 Leuchtfeuer Benchmark — Technical Reconstruction

**Source:** Blog post "Lead Scoring & Machine Learning in Mautic" (leuchtfeuer.com) and accompanying Mauticast episode #47 featuring Jonas Ludwig. The benchmark originates from a **master's thesis**: "Developing a lead scoring model for simple and advanced use cases using the example of the Mautic software." No DOI, no conference proceedings — it is an internal academic thesis referenced by a commercial implementation blog.

**Accuracy numbers:**
- Traditional Mautic rule-based scoring: **77% accuracy** (predicting which leads would become customers)
- ML-based predictive lead scoring: **95% accuracy**
- Dataset: "data from an online store" — e-commerce conversion data, not enterprise B2B SaaS. This is an important caveat: e-commerce purchase prediction has cleaner binary labels and more behavioral signals (cart, browse, checkout) than B2B SaaS where conversion cycles are months long.

**What the blog post does NOT disclose:**
- The ML algorithm used (gradient boosting? logistic regression? neural network? not stated)
- The exact feature vector (only "action data and data on lead characteristics")
- Dataset size, train/test split, time period
- Whether the 77%/95% are accuracy, F1, AUC, or precision — the metric name "accuracy" is used but not defined (likely binary classification accuracy, not F1 or AUC)
- Cross-validation methodology

**Likely algorithm based on domain literature:** The lead scoring research consensus (Pham et al., 2023; Araujo et al., 2025) strongly favors gradient boosting methods (XGBoost, LightGBM, CatBoost) for tabular behavioral data. A 2025 B2B CRM study (16,600 records, Microsoft Dynamics source) found Gradient Boosting Classifier achieved 98.39% accuracy / AUC 0.989 — consistent with the Leuchtfeuer 95% claim. The most plausible reconstruction is that the Leuchtfeuer thesis used XGBoost or LightGBM with behavioral + demographic features.

### 10.2 `LIST_FILTERS_ON_FILTERING` Hook — Exact Specification

**Event class:** `Symfony\Component\EventDispatcher\GenericEvent` (wrapped by Mautic's event system)
**Constant:** `Mautic\LeadBundle\LeadEvents::LIST_FILTERS_ON_FILTERING` (string value: `"mautic.lead_list_filter_on_filtering"`)
**File:** `app/bundles/LeadBundle/Segment/Query/ContactSegmentQueryBuilder.php`

**Payload (what the event carries):**
```php
$filterEvent = new LeadListFilteringEvent(
    $filter,          // ContactSegmentFilterCrate: the current filter being processed
    $lead,            // optional Lead entity (null during bulk rebuild)
    $alias,           // table alias used in the DBAL query
    $queryBuilder     // Doctrine QueryBuilder instance — mutable!
);
```

**How a plugin intercepts:**
```php
// In a Mautic plugin's EventSubscriber:
public static function getSubscribedEvents(): array {
    return [LeadEvents::LIST_FILTERS_ON_FILTERING => 'onFiltering'];
}

public function onFiltering(LeadListFilteringEvent $event): void {
    if ($event->getFilter()->getField() === 'ml_score') {
        // Inject a DBAL expression using the pre-computed ML score
        $event->getQueryBuilder()
            ->andWhere('contact.ml_score >= :ml_threshold')
            ->setParameter('ml_threshold', 75);
        $event->setFilteringDone(true); // prevents further default processing
    }
}
```

**How a Rust sidecar calls back into PHP for segment scoring:**

The Rust sidecar cannot directly call PHP. The integration pattern is:

1. Rust scoring service runs on a schedule (e.g., every 5 minutes), reads `lead_event_log` + demographic fields via direct MySQL read
2. Rust writes ML scores into a custom contact field (`ml_score` float) via Mautic REST API: `PATCH /api/contacts/{id}/edit` with `{"ml_score": 0.87}`
3. The `LIST_FILTERS_ON_FILTERING` plugin reads the pre-computed `ml_score` from the contact record (already in the query builder's table scope) without any PHP→Rust call at segment rebuild time
4. No synchronous PHP→Rust HTTP call needed — the score is materialized in the DB; the event hook simply reads it

This is the correct architectural pattern: compute-on-write (Rust), filter-on-read (PHP plugin). Any synchronous PHP→Rust HTTP call during `mautic:segments:update` would serialize and add HTTP latency to every contact in the rebuild batch.

### 10.3 The 12-Feature Contact Vector — Literature Validation

The 12 features proposed in section 6.1 for a Rust ONNX sidecar are evaluated against the academic literature:

| Feature | Source in Schema | Literature Validation |
|---|---|---|
| `days_since_first_touch` | `Lead.date_added` | Validated: tenure/recency is a strong predictor in RFM models; feature importance rank 2–4 in most B2B studies |
| `days_since_last_active` | `Lead.last_active` | Validated: recency is the single strongest RFM predictor; included in every published lead scoring feature set |
| `total_page_views_30d` | `lead_event_log` count | Validated: frequency (F in RFM); strong signal for engagement; 30-day window is standard |
| `email_open_rate` | `email_stats` | Validated: behavioral engagement signal; but open rates degraded post-iOS 15 (Apple Mail Privacy Protection) — unreliable since 2021 |
| `email_click_rate` | `email_stats` | Validated: more reliable than open rate post-iOS 15; click-through is a genuine behavioral signal |
| `form_submissions` | `lead_event_log` | Validated: high-intent signal; form submission is a standard conversion event |
| `asset_downloads` | `lead_event_log` | Validated: intent signal; commonly used in B2B content-led scoring |
| `pricing_page_visits` | `lead_event_log` (URL filter) | Validated: strong purchase-intent signal; pricing page visits are among the top-ranked features in SaaS lead scoring models |
| `job_title_seniority` | NLP-classified `title` | Validated: firmographic fit signal; seniority classification (C-suite=5, VP=4, Director=3, Manager=2, IC=1) is standard ICP matching |
| `company_size_bucket` | `lead_fields.company_size` | Validated: firmographic fit; company size is a top feature in B2B propensity models |
| `industry_icp_match` | lookup table | Validated: vertical fit is a strong ICP signal; typically encoded as binary (in-ICP=1, out=0) or ordinal (3-level) |
| `utm_source_quality` | `utm_tags` | Partially validated: source quality (e.g., organic search > paid social > cold outreach) is used in multi-touch attribution but rarely as a direct scoring feature; signal quality depends on UTM discipline |

**Overall assessment:** 10 of 12 features are well-supported in the academic literature. The two caveats are: (1) `email_open_rate` is unreliable post-iOS 15 and should be weighted down or replaced with `email_click_rate`; (2) `utm_source_quality` requires a reliable UTM taxonomy and should be validated empirically on your specific data before including as a feature. The feature set is adequate for a gradient boosting model; neural models would benefit from adding raw event counts with finer time windows (7d, 14d, 90d) as separate features.

**Missing features not in the 12 that literature recommends adding:**
- `number_of_website_sessions` (distinct sessions, not page views — captures return visits)
- `days_since_last_email_click` (recency of highest-quality engagement event)
- `lead_source` (original acquisition channel — top feature in the Araujo et al. 2025 B2B study: rank 1 of 22 features)
- `stage_velocity` (how fast the lead moved through pipeline stages — a strong B2B-specific signal)

### 10.4 Send-Time Optimization — ML Architecture for Mautic Integration

Mautic has no native send-time optimization (Section 3.5). The academic literature provides two viable ML architectures:

**Architecture 1: RNN-Survival Model (Chapelle & Zhang pattern, arxiv:2004.09900)**
- Models the time-to-open as a survival distribution conditioned on historical email interaction sequences
- LSTM (hidden size 32) + fully connected layer with exponential activation
- Input: sequence of (email_sent_time, opened: bool, time_to_open: float) tuples per user
- Output: probability distribution over future open times
- Predict the send time that maximizes `P(open within 24h | send at time t)`
- Validated at LinkedIn scale; this is the state-of-the-art for personalized send-time optimization

**Architecture 2: Random Forest regression (MDPI Applied Sciences 2022)**
- Features: hour of day, day of week, user's historical open rates by time bucket (24h × 7d = 168 bins), recency of last open, total lifetime opens
- Target: binary open (opened within 4h of send)
- Output: best-hour prediction per user

**Mautic integration pattern:**
```
Weekly batch job (Rust):
  1. Query lead_event_log for email opens (event_type='email_open') per contact
  2. Build feature matrix: 168-bin historical open distribution + recency features
  3. Run ONNX model (XGBoost or LSTM) → optimal_send_hour per contact
  4. Write to custom contact field: optimal_send_hour (0-167)
  5. Mautic campaign uses this field in a "wait until {optimal_send_hour}" action
```

The Rust inference side can use `tract` (for ONNX XGBoost/RF models) or `candle` (for LSTM). Target latency: < 1ms per contact for tree models, 5–10ms for LSTM.

---

## 11. Research Papers & Prior Art

| Paper | Authors | Year | Venue | Relevance | Key Finding |
|-------|---------|------|-------|-----------|-------------|
| The relevance of lead prioritization: a B2B lead scoring model based on machine learning (PMC:11925937) | Araujo et al. | 2025 | PMC / Springer | Closest peer-reviewed study to the Leuchtfeuer benchmark; validates the 12-feature vector | 16,600 records from Microsoft Dynamics CRM (Jan 2020–Apr 2024); Gradient Boosting achieves 98.39% accuracy / AUC 0.989 / F1 93.38%; top features: Lead Source (rank 1), Reason for Status, Lead Classification, Product, Number of Responses — validates demographic + behavioral combination |
| The state of lead scoring models and their impact on sales performance (PMC:9890437) | Pham et al. | 2023 | Information Technology and Management (Springer) | Systematic review of 18 lead scoring ML approaches; provides the research baseline for Mautic's gap | Classification dominates (decision tree + logistic regression most common); predictive models achieve ~3x higher conversion rate vs. rule-based (15% vs 5%); GE Capital: 30–50% productivity improvement; 26% avg increase in lead conversion; recommends combining implicit behavioral signals with explicit firmographic data |
| An RNN-Survival Model to Decide Email Send Times (arXiv:2004.09900) | Chapelle, Zhang (LinkedIn) | 2020 | arXiv (industry paper) | Architecture for send-time optimization — the missing Mautic feature | LSTM (hidden 32) + exponential activation FC; models time-to-open as survival distribution conditioned on user's email history sequence; output: probability distribution over future open times; enables personalized (not just aggregate-best-hour) send-time optimization; validates that sequential modeling outperforms per-bucket histogram approaches |
| A Novel Approach for Send Time Prediction on Email Marketing (MDPI:10.3390/app12168310) | Various | 2022 | Applied Sciences (MDPI) | Random Forest baseline for send-time prediction; simpler Mautic-compatible architecture | Random Forest on 168-bin open-rate histogram per user + recency features; binary target: opened within 4h; demonstrates that tree models are competitive with LSTM for send-time prediction at lower inference cost |
| Customer Churn Prediction: A Systematic Review (MDPI:2504-4990/7/3/105) | Various | 2025 | Machine Learning and Knowledge Extraction (MDPI) | Context for building re-engagement prediction on top of Mautic's behavioral data | XGBoost + deep learning ensemble achieves 91.66% accuracy on churn prediction; behavioral features (service duration, responsiveness to emails, self-care usage) are strongest signals; unstructured text features improve performance vs structured only — directly applicable to Mautic's `lead_event_log` data |
| Benchmarking state-of-the-art gradient boosting algorithms for classification (arXiv:2305.17094) | Various | 2023 | arXiv | Comparative benchmark of XGBoost vs LightGBM vs CatBoost on tabular data | On tabular classification tasks of the type used in lead scoring, LightGBM achieves best speed/accuracy trade-off; CatBoost handles categorical features natively (relevant for `lead_source`, `industry`, `utm_source`); XGBoost is the most ONNX-portable for Rust `tract` inference |
| Leuchtfeuer: Lead Scoring & Machine Learning in Mautic (blog + Mauticast #47) | Ludwig, Jonas | 2023 | Leuchtfeuer blog / podcast | Primary source for the 77% (rule-based) vs 95% (ML) benchmark on Mautic data | Master's thesis: "Developing a lead scoring model for simple and advanced use cases using the example of the Mautic software"; dataset: online store e-commerce data (not B2B SaaS); ML algorithm and features not publicly disclosed; 18 percentage-point accuracy gap establishes the business case for ML replacement of Mautic's point engine |
| Enhancing customer repurchase prediction: Integrating classification algorithms with RFM analysis (ScienceDirect) | Various | 2025 | Expert Systems with Applications (Elsevier) | RFM integration with ML; validates the recency/frequency/monetary features in the 12-feature vector | Handcrafted features from RFM (recency, frequency, monetary value) combined with supervised ML outperforms raw RFM segmentation; confirms that the `days_since_last_active`, `total_page_views_30d`, and form submission count features in the proposed vector are RFM-equivalent and literature-validated |

### Annotation notes

**Araujo et al. (2025, PMC:11925937):** The most directly applicable paper to a Mautic ML replacement. The dataset (16,600 records from Microsoft Dynamics, 22 selected features from original 67, 4-year time window) mirrors a realistic Mautic installation. The Gradient Boosting Classifier's 98.39% accuracy with 70/30 split is not directly comparable to the Leuchtfeuer 95% (different dataset, metric definition unclear in the blog post), but both independently confirm that gradient boosting on CRM behavioral + demographic features achieves 95–98% accuracy on binary conversion prediction. The top feature — Lead Source — is not currently one of the 12 proposed features for the Rust sidecar and should be added.

**Pham et al. (2023, PMC:9890437):** Systematic review of 18 published lead scoring models. The most important finding for Mautic: the field overwhelmingly uses classification (not regression or clustering) for B2B lead scoring. Decision trees and logistic regression are preferred for interpretability — this is relevant because Mautic operators need to understand why a contact was scored high. A pure gradient boosting black-box model may be accurate but will require SHAP explanations to be operationally trusted. The Rust sidecar should output both a score and the top-3 contributing features.

**Chapelle & Zhang (2020, arXiv:2004.09900 — LinkedIn):** The gold standard for send-time optimization ML. The survival model formulation is elegant: instead of predicting "will this person open at 9am Tuesday," it predicts a continuous-time distribution over when the person next opens email, then samples from that distribution to select the optimal send time. This requires storing each user's email interaction sequence (timestamp, opened bool), which Mautic's `lead_event_log` already captures. The LSTM is small (32 hidden units) and exports cleanly to ONNX — Rust inference with `tract` is straightforward.

**Leuchtfeuer blog (2023):** The accuracy numbers (77%/95%) are marketing copy backed by an unpublished master's thesis. Without knowing the algorithm, features, dataset size, metric definition, or validation methodology, the numbers should be treated as directionally correct (ML > rule-based) but not precisely reproducible. The correct academic benchmark for the same claim is the Pham et al. systematic review which shows 3x conversion rate improvement (5% → 15%) — a more conservative and better-validated estimate of the uplift from ML over rule-based scoring.

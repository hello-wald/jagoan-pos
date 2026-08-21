# Functional Requirements Document (FRD)

**Project:** POS Jagoan — Multi-Actor POS & Business Intelligence Platform
**Case:** Scaling Without Overspending — Access-Pattern-Aware Architecture
**Status:** Draft v0.1 · living document

---

## 1. Overview

### 1.1 Purpose

This document defines _what_ Application K does: its actors, permissions, features, and workflows. Non-functional targets (latency, availability, scalability) live in the NFR document; the architecture that satisfies them lives in the LLA document. Where a functional decision exists specifically to serve the scaling argument, it is flagged with **[AP]** (access-pattern rationale).

### 1.2 Scope of this iteration

A single deployment serving many merchants, with a centrally-administered product catalog, per-merchant inventory and sales, merchant-facing reporting, and asynchronous AI-generated business insights.

### 1.3 Glossary

| Term         | Meaning                                                                          |
| ------------ | -------------------------------------------------------------------------------- |
| Merchant     | A single business/store on the platform. The tenant boundary.                    |
| Catalog Item | A product record owned by the platform Administrator, shared by all merchants.   |
| Price        | Attribute of a Catalog Item, set centrally. Merchants cannot override it.        |
| Stock Record | Per-merchant quantity on hand for one Catalog Item.                              |
| Transaction  | One completed checkout: header + line items + payment. Immutable once created.   |
| Insight      | An LLM-generated recommendation scoped to one merchant, produced asynchronously. |
| Insight Job  | A queued unit of work that produces an Insight.                                  |

### 1.4 Tenancy model

One platform, many merchants. **Catalog and pricing are global and admin-owned.** Sales, stock, users, reports, and insights are scoped to exactly one merchant.

**[AP]** This split is the foundation of the whole design: the catalog is read by every cashier on every checkout but written by one actor a handful of times per day, so it is the ideal candidate for aggressive caching. Transactional and analytical data is per-merchant and naturally partitionable.

---

## 2. Actors

| Actor                    | Scope                | Primary operations                                               | Access pattern                                            | Consistency need                                      |
| ------------------------ | -------------------- | ---------------------------------------------------------------- | --------------------------------------------------------- | ----------------------------------------------------- |
| **Cashier**              | One merchant         | Scan, checkout                                                   | Frequent small writes + very frequent catalog reads       | Strong on stock & transactions                        |
| **Administrator**        | Platform-wide        | Manage catalog, prices, merchants, owner accounts                | Rare writes with platform-wide fan-out                    | Strong on write; bounded-stale propagation acceptable |
| **Merchant Owner**       | One merchant         | View dashboard, reports, insights; manage cashiers; adjust stock | Bursty, expensive aggregate reads over history            | Eventual — seconds to minutes of staleness acceptable |
| **AI Analytics Service** | One merchant per job | Read transaction history, call LLM, write Insight                | Long sequential reads, occasional writes, no user waiting | Eventual; explicitly not real-time                    |

**[AP]** The four actors differ on two axes that matter: read-vs-write ratio, and latency sensitivity. Cashier is the only actor that is both latency-critical and continuous. Every functional decision below is made so the other three cannot contend with it.

---

## 3. Role-Based Access Control

### 3.1 Permission matrix

| Resource                    | Cashier                        | Merchant Owner                               | Administrator                |
| --------------------------- | ------------------------------ | -------------------------------------------- | ---------------------------- |
| Catalog item & price        | read                           | read                                         | create · update · deactivate |
| Stock record (own merchant) | read · auto-decrement via sale | read · adjust                                | read (all merchants)         |
| Transaction                 | create · read own transactions | read (own merchant)                          | read (all merchants)         |
| Report / dashboard          | —                              | read (own merchant)                          | read (all merchants)         |
| Insight                     | —                              | request · read (own merchant)                | read (all merchants)         |
| User account                | read own profile               | create · deactivate cashiers of own merchant | manage owners & admins       |
| Merchant                    | read own                       | read own                                     | create · suspend             |

### 3.2 Access rules

- **AR-1** Every request carries an authenticated identity resolving to `{user_id, role, merchant_id}`. `merchant_id` is null only for Administrators.
- **AR-2** Tenant scoping is enforced at the data-access layer, not in controllers. A query for merchant data without a `merchant_id` filter must be impossible to express.
- **AR-3** A Cashier may only act within the merchant they belong to. Cross-merchant access returns 404, not 403 (no existence leakage).
- **AR-4** Administrators cannot create transactions or adjust stock; they are catalog and platform operators, not merchant operators.

<!-- - **AR-5** A deactivated user's active sessions are invalidated at next request. -->

---

## 4. Epics

| ID  | Epic                             | Primary actor      | Workload class                  |
| --- | -------------------------------- | ------------------ | ------------------------------- |
| E1  | Authentication & user management | All                | Light write, light read         |
| E2  | Global catalog & pricing         | Administrator      | Rare write, global fan-out read |
| E3  | Checkout & transactions          | Cashier            | **Hot write path — protected**  |
| E4  | Per-merchant inventory           | Cashier, Owner     | Contended write                 |
| E5  | Merchant reporting dashboard     | Owner              | Heavy aggregate read            |
| E6  | Asynchronous AI insights         | Owner → AI service | Async batch                     |
| E7  | Merchant lifecycle               | Administrator      | Rare write                      |

---

## 5. User Stories & Acceptance Criteria

### E1 — Authentication & user management

**US-1.1** As a user, I want to log in with email and password, so that I can access features for my role.

- Given valid credentials, when I submit, then I receive a session token encoding my role and merchant, and I land on the view for my role.
- Given invalid credentials, then the error message does not reveal whether the email exists.
  <!-- - Given 5 failed attempts within 15 minutes, then further attempts for that account are throttled. -->

**US-1.2** As a user, I want to log out, so that my session cannot be reused on a shared terminal.

- Given I log out, when the same token is replayed, then it is rejected.

**US-1.3** As a Merchant Owner, I want to register my merchant and my own account, so that I can start using the platform.

- Given a unique email and merchant name, when I register, then a Merchant and an Owner account are created together and I am logged in.

**US-1.4** As a Merchant Owner, I want to create cashier accounts for my staff, so that each cashier has their own identity.

- Given I create a cashier, then the account is bound to my merchant and cannot be reassigned.
- Given a cashier of another merchant, then they never appear in my user list.

**US-1.5** As a Merchant Owner, I want to deactivate a cashier, so that a departing employee loses access immediately.

- Given deactivation, then their transactions remain intact and attributed to them.

**US-1.6** As an Administrator, I want to manage owner and administrator accounts, so that platform access stays controlled.

### E2 — Global catalog & pricing

**US-2.1** As an Administrator, I want to create a catalog item with SKU, name, category, and price, so that all merchants can sell it.

- Given a duplicate SKU, then creation is rejected.
- Given creation succeeds, then the item becomes visible to all merchants within the defined propagation window.

**US-2.2** As an Administrator, I want to change an item's price, so that pricing stays current across the platform.

- Given a price change, then transactions already completed are unaffected and retain their historical price.
- Given a checkout in progress, then it completes at the price captured when the line was added.
- Given the change is saved, then merchants see the new price within the propagation window, and the window is stated to the Administrator in the UI.

**US-2.3** As an Administrator, I want to deactivate an item, so that it can no longer be sold.

- Given deactivation, then the item disappears from cashier search but remains resolvable in historical transactions and reports.

**US-2.4** As a Cashier, I want to search the catalog by name or SKU, so that I can add items quickly.

- Given a search, then results return fast enough to keep checkout flowing, and are served without querying the primary transactional store on every keystroke. **[AP]**

### E3 — Checkout & transactions

**US-3.1** As a Cashier, I want to build a cart of catalog items with quantities, so that I can process a customer's purchase.

- Given an item is added, then its unit price is captured onto the line at that moment.
- Given cart state, then it is held client-side until submission — no server round trip per scan. **[AP]**

**US-3.2** As a Cashier, I want to submit a sale, so that it is recorded and stock is reduced.

- Given sufficient stock for every line, when I submit, then a Transaction is persisted, stock decrements atomically in the same commit, and I receive a transaction number.
- Given insufficient stock on any line, then the whole submission is rejected with the offending line identified, and no partial write occurs.
- Given the same idempotency key is submitted twice (retry, double-tap), then exactly one Transaction exists and both calls return the same result.
- Given analytical, reporting, or admin activity is running concurrently, then submission latency is unaffected. **[AP]**

**US-3.3** As a Cashier, I want to see the transactions from my current shift, so that I can verify my work.

- Given the query, then it is bounded to my own recent transactions and cannot be widened into a full-history scan. **[AP]**

**US-3.4** As a Cashier, I want checkout to record the payment amount and compute change, so that cash handling is correct.

_Business rule:_ Transactions are append-only. Corrections are out of scope this iteration (see §8).

### E4 — Per-merchant inventory

**US-4.1** As a Merchant Owner, I want to record received goods, so that stock reflects the delivery.

- Given a positive quantity, then the stock record increases and a stock movement is logged with actor, timestamp, and reason.

**US-4.2** As a Merchant Owner, I want to correct a stock quantity, so that the system matches a physical count.

- Given an adjustment, then the delta and a reason are recorded; the prior value is never silently overwritten.

**US-4.3** As a Cashier or Owner, I want to see current stock for my merchant, so that I know what is sellable.

- Given a catalog item never stocked by my merchant, then it shows quantity zero rather than being absent.

**US-4.4** As a Merchant Owner, I want to see items below a threshold, so that I can reorder.

_Business rule:_ Stock is only ever mutated through sale, receive, or adjustment — each producing a movement record. **[AP]** The stock record is the one row cashiers contend on, so all reporting reads derive from movements rather than locking the current-quantity row.

### E5 — Merchant reporting dashboard

**US-5.1** As a Merchant Owner, I want to see today's revenue, transaction count, and average basket, so that I can gauge the day.

- Given the dashboard loads, then figures may lag live transactions by a bounded, disclosed interval. **[AP]**
- Given the figures are stale, then the UI shows "as of HH:MM" so staleness is explicit rather than misleading.

**US-5.2** As a Merchant Owner, I want revenue over a chosen date range, so that I can compare periods.

- Given any range, then the report is served from pre-aggregated data, not by scanning raw transactions on request. **[AP]**

**US-5.3** As a Merchant Owner, I want my best- and worst-selling items for a period, so that I can adjust what I stock.

**US-5.4** As a Merchant Owner, I want sales grouped by hour of day, so that I can staff around peaks.

**US-5.5** As an Administrator, I want platform-level totals across merchants, so that I can monitor adoption.

- Given this query, then it never executes against the checkout path. **[AP]**

### E6 — Asynchronous AI insights

**US-6.1** As a Merchant Owner, I want to request an insight report on demand, so that I get advice when I actually want it.

- Given I press Generate, then a job is enqueued and the UI returns immediately with status `queued` — the request never blocks on the LLM. **[AP]**
- Given a job for my merchant is already `queued` or `running`, then pressing Generate again does not enqueue a second job.
- Given I requested an insight within the cooldown window, then the button is disabled with the remaining time shown. **[AP]** This caps LLM spend and bounds worst-case queue depth — a cost control, not just UX.

**US-6.2** As a Merchant Owner, I want to see the job's progress, so that I know it is working.

- Given a running job, then status polling shows `queued` → `running` → `succeeded` / `failed`.
- Given a failure, then I see a plain-language reason and can retry.

**US-6.3** As the AI Analytics Service, I need to read a merchant's recent transaction history, so that I can build the LLM prompt.

- Given a job runs, then it reads from the analytical store only, never the transactional primary. **[AP]**
- Given the data is minutes stale, then this is acceptable and does not invalidate the insight.

**US-6.4** As a Merchant Owner, I want the finished insight rendered as readable recommendations, so that I can act on it.

- Given success, then the Insight is persisted with its generation timestamp and the data window it covered.
- Given I reopen the page later, then the stored insight is served directly with no new LLM call.

**US-6.5** As a Merchant Owner, I want past insights listed, so that I can compare advice over time.

**US-6.6** As the system, I need LLM failures contained, so that they never affect checkout.

- Given the LLM API is down, times out, or returns malformed output, then the job is marked `failed`, retried with backoff up to a limit, and no other workload is affected.

### E7 — Merchant lifecycle

**US-7.1** As an Administrator, I want to view all merchants, so that I can oversee the platform.
**US-7.2** As an Administrator, I want to suspend a merchant, so that access stops without data loss.

- Given suspension, then all users of that merchant are denied access while transactions and reports are retained.

---

## 6. Use Cases (detailed)

### UC-1 Process a sale

- **Actor:** Cashier · **Precondition:** authenticated, assigned to an active merchant
- **Main flow:** search catalog → add lines with captured prices → enter payment → submit with idempotency key → server validates stock for all lines → persists transaction and stock decrements in one atomic commit → emits a transaction-recorded event → returns transaction number.
- **Alt A — insufficient stock:** whole submission rejected, offending line named, nothing written.
- **Alt B — duplicate submission:** idempotency key matches an existing transaction; original result returned.
- **Alt C — price changed between add and submit:** captured line price wins; the transaction records what the customer was quoted.
- **Postcondition:** transaction is immutable and durable; downstream aggregation and insight data are updated asynchronously.

### UC-2 Change a catalog price

- **Actor:** Administrator
- **Main flow:** select item → enter new price → confirm → new price persisted with effective timestamp → change propagated to merchant-facing reads → prior price retained for historical accuracy.
- **Alt A — item is in an in-flight cart:** that cart is unaffected (see UC-1 Alt C).
- **Postcondition:** all merchants observe the new price within the propagation window; no historical figure is retroactively altered.

### UC-3 Generate an AI insight

- **Actor:** Merchant Owner → AI Analytics Service
- **Main flow:** Owner requests → cooldown and in-flight checks pass → job enqueued, immediate response → worker picks up job → reads merchant history from the analytical store → composes prompt → calls LLM → parses and validates response → persists Insight → status `succeeded` → Owner's polling reveals the result.
- **Alt A — cooldown active or job in flight:** no enqueue; existing job surfaced.
- **Alt B — LLM error/timeout:** retry with backoff; after final attempt, `failed` with a readable reason.
- **Alt C — insufficient history:** job completes with an explanatory message instead of a fabricated recommendation.
- **Postcondition:** checkout latency unchanged throughout; insight is durable and reusable.

### UC-4 View the dashboard

- **Actor:** Merchant Owner
- **Main flow:** open dashboard → server serves pre-aggregated figures for the merchant → UI displays values with an "as of" timestamp.
- **Alt A — aggregates not yet built for a new merchant:** empty state shown, not an error.

### UC-5 Receive stock

- **Actor:** Cashier or Owner · Main flow: select item → enter received quantity and reason → stock record increases → movement logged.

### UC-6 Create a cashier account

- **Actor:** Merchant Owner · Main flow: enter name and email → account created bound to the owner's merchant → temporary credential issued → cashier must set a password on first login.

---

## 7. Workflow Descriptions

### 7.1 What happens when a sale is processed

The cashier assembles the cart entirely client-side; no server call occurs per scanned item, so the number of server writes per sale is exactly one. On submit, a single short transaction validates stock, writes the transaction header and lines, and decrements stock — all in one commit against the transactional store, touching only rows belonging to that merchant. The commit is deliberately narrow: no reporting rollups, no analytics, no LLM work happens inside it. After commit, the sale is published for downstream consumption; aggregation and analytics catch up on their own schedule. **[AP]** This is the core isolation guarantee — the write path is short, bounded, and never widens under load from other actors.

### 7.2 What happens when a price changes

An administrator's price change is one write with platform-wide read impact. Rather than making every checkout read prices from the primary store, merchant-facing catalog reads are served from a cached view, and a price change invalidates or refreshes it. The propagation window is a deliberate, disclosed trade-off: a brief period where a merchant may still see the old price. Two rules make it safe — line prices are captured at add-time, and historical transactions store the price actually charged. So the worst case is a short-lived stale display, never a corrupted sale or a rewritten report. **[AP]**

### 7.3 What happens when an insight is generated

The Owner's request writes a job row and returns immediately; the LLM call happens in a worker outside the request path. The worker reads from the analytical store — never the transactional primary — so a long-running analysis cannot contend with checkout writes. Cooldown and single-in-flight rules bound both queue depth and LLM spend. The result is persisted, so repeated viewing costs nothing. Every failure mode terminates inside the job. **[AP]** Async is not a convenience here; it is what makes an unbounded-latency, unbounded-cost dependency safe to have in a latency-critical system.

### 7.4 What happens when the owner opens the dashboard

Dashboard queries are the natural enemy of checkout: wide date ranges, aggregations, unpredictable timing. They are therefore served from pre-aggregated, merchant-scoped data rather than computed on demand over raw transactions. Aggregates are refreshed from the transaction stream on a schedule. The UI states its "as of" time, so eventual consistency is a visible product decision rather than a hidden defect. **[AP]**

---

## 8. Business Rules

- **BR-1** Transactions are immutable and append-only.
- **BR-2** A transaction line stores the unit price charged; it is never recomputed from the current catalog.
- **BR-3** Stock may not go negative through a sale.
- **BR-4** Every stock change produces a movement record with actor, delta, reason, and timestamp.
- **BR-5** Prices are platform-global; merchants have no pricing autonomy in this iteration.
- **BR-6** Deactivated catalog items remain resolvable for history but are unsellable.
- **BR-7** At most one insight job per merchant may be queued or running at a time.
- **BR-8** Insights are advisory only and are never used to mutate catalog, price, or stock automatically.
- **BR-9** Reporting and insight data may lag the transactional record; the lag must be shown to the user.

---

## 9. Assumptions & Dependencies

**Assumptions**

- One merchant operates one outlet.
- Cash payment only; no payment gateway integration.
- Merchants accept a centrally-controlled catalog and price list.
- Merchants operate online; offline capability is a different case study.

**Dependencies**

- An external LLM provider, treated as unreliable and rate-limited by design.

**Out of scope this iteration** (detailed in the separate Out-of-Scope document)

- Refunds, voids, and returns
- Multi-outlet merchants
- Shift and cash-drawer reconciliation
- Merchant-specific pricing or promotions
- Mobile application
- Supplier and purchase-order management

---

## 10. Open Items

| #   | Question                                                           | Blocks         |
| --- | ------------------------------------------------------------------ | -------------- |
| 1   | Target propagation window for a price change — seconds or minutes? | §7.2, NFR      |
| 2   | Insight cooldown duration and history depth fed to the LLM         | E6, cost model |
| 3   | Dashboard staleness budget (drives aggregate refresh interval)     | §7.4, NFR      |
| 4   | Whether cashier receive-stock needs owner approval                 | E4             |

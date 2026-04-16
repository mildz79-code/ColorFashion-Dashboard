# Database Schema

## `public.pl_line_items`

Chart of accounts. 49 rows organized into 4 categories.

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `label` | text, unique | e.g., "Direct Labor - Samuel Hale" |
| `category` | text | One of: `REVENUE`, `COGS`, `OPEX`, `OTHER` |
| `sort_order` | int | Display order (10, 20, 30, …). Gaps leave room to insert new lines. |

## `public.pl_monthly`

Fact table. One row per (line_item, year, month, source).

| Column | Type | Notes |
|---|---|---|
| `id` | bigserial PK | |
| `line_item_id` | int FK → pl_line_items | |
| `year` | int | e.g., 2026 |
| `month` | int | 1..12 |
| `amount` | numeric(14,2) | Can be negative |
| `source` | text | `actual`, `budget`, or `forecast` |
| `notes` | text, nullable | |
| `created_at`, `updated_at` | timestamptz | |

**Unique constraint:** `(line_item_id, year, month, source)` — enforces one value per cell.

**Indexes:** `(year, month)`, `(source)`.

## Views

### `pl_monthly_wide`
Pivots month → columns. One row per `(line_item_id, year, source)`.

### `pl_category_summary`
Aggregates by category. One row per `(year, source, month)` with columns: `revenue`, `cogs`, `opex`, `other`, `gross_profit`, `net_income`.

## Source value semantics

- **`actual`** — real numbers from QuickBooks exports. Only load for months that have closed.
- **`budget`** — the originally approved budget for the year. Static; shouldn't change mid-year.
- **`forecast`** — rolling forecast (Q1 actuals trend + budget blend for unrealized months). Updates as new months close.

A single year can (and typically does) have all three sources populated for the same line item. Queries select by `source` to compare.

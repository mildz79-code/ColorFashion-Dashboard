# CF Financial Dashboard

Financial reporting and P&L analysis for **Color Fashion Dye & Finishing**.

## Structure

```
.
├── 2026_monthly_budget.xlsx          # Original 2026 budget (Jan baseline populated)
├── 2026_monthly_budget_korean.xlsx   # Korean-language parallel version
├── prompt_to_recreate_2026_budget.md # Reusable prompt for regenerating the budget
├── data/
│   └── 2026/
│       ├── Jan_PL.csv                # January 2026 QuickBooks P&L export
│       ├── Feb_PL.csv                # February 2026 QuickBooks P&L export
│       ├── Mar_PL.csv                # March 2026 QuickBooks P&L export
│       └── 2026_YTD_Forecast.xlsx    # Q1 actuals + Apr–Dec forecast model
├── scripts/
│   └── build_ytd_forecast.py         # Regenerates 2026_YTD_Forecast.xlsx
├── supabase/
│   └── migrations/
│       ├── 001_create_pl_tables.sql      # pl_line_items + pl_monthly
│       ├── 002_create_pl_views.sql       # pl_monthly_wide + pl_category_summary
│       ├── 003_create_storage_bucket.sql # private 'financials' bucket
│       └── 004_seed_2026_data.sql        # 2026 line items + Q1 actuals + budget
├── docs/
│   └── SCHEMA.md                     # Database schema reference
├── .gitignore
├── requirements.txt
└── README.md
```

## Supabase

**Project:** `ColorFashion Dashboard` (ref: `cgsmzkafagnmsuzzkfnv`)

### Tables

| Table | Purpose |
|---|---|
| `public.pl_line_items` | Chart of accounts — 49 rows across REVENUE / COGS / OPEX / OTHER categories |
| `public.pl_monthly` | Fact table in long format: `(line_item_id, year, month, amount, source)` where source ∈ `actual`, `budget`, `forecast` |

### Views

- `public.pl_monthly_wide` — pivoted (Jan…Dec columns per row)
- `public.pl_category_summary` — per-month Revenue / COGS / OpEx / Gross Profit / Net Income

### Example queries

```sql
-- Full-year actuals vs budget, by line item
select li.label, li.category,
       sum(case when source = 'actual' then amount else 0 end) as actual,
       sum(case when source = 'budget' then amount else 0 end) as budget,
       sum(case when source = 'actual' then amount else 0 end)
         - sum(case when source = 'budget' then amount else 0 end) as variance
from pl_monthly pm
join pl_line_items li on li.id = pm.line_item_id
where pm.year = 2026
group by li.id, li.label, li.category, li.sort_order
order by li.sort_order;

-- Monthly P&L rollup
select * from pl_category_summary
where year = 2026 and source = 'actual'
order by month;
```

## Regenerating the YTD Forecast spreadsheet

```bash
pip install -r requirements.txt
python3 scripts/build_ytd_forecast.py
```

Inputs: `data/2026/*.csv` + `2026_monthly_budget.xlsx` (at repo root)
Output: `data/2026/2026_YTD_Forecast.xlsx`

## Uploading the xlsx to Supabase Storage

```bash
# Install Supabase CLI:  brew install supabase/tap/supabase
supabase storage cp data/2026/2026_YTD_Forecast.xlsx \
  supabase://financials/2026/2026_YTD_Forecast.xlsx \
  --project-ref cgsmzkafagnmsuzzkfnv
```

Or via the dashboard: Storage → `financials` bucket → Upload file.

## 2026 Q1 Snapshot

| Metric | Amount |
|---|---:|
| Q1 Revenue | $2,521,671 |
| Q1 COGS | $1,704,289 |
| Q1 Gross Profit | $817,382 |
| Q1 Operating Expenses | $702,218 |
| Q1 Other Income | $3,808 |
| **Q1 Net Income** | **$118,972** |

Monthly Net Income: Jan $31,555 · Feb ($64,318) · Mar $151,735.

Reconciles to the 2026 Q1 Balance Sheet Net Income line exactly.

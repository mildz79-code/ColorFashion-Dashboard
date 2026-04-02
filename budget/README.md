# Color Fashion — Budget Dashboard

Budget tracking, calendar scheduling, and financial forecasting for the Anaheim plant.

## Components

### cf-budget-dashboard.jsx
Interactive React dashboard with two pages:

**Calendar** — Full month calendar with color-coded event markers for payments,
orders, payroll, budget reviews, and maintenance. Tap any date to expand detail.
KPI cards show MTD expenses, budget remaining, cost-to-revenue, and weekly run rate.
Upcoming sidebar lists the next 8 scheduled items.

**Analytics** — Four sub-tabs:
- Spending Trends: 6-month bar chart (actual vs budget) + revenue vs expenses
- Categories: Per-category budget utilization bars + pie distribution
- Forecast: Historical + 3-month projected spend with trend lines
- Weekly: Weekly spend vs target chart + variance table

Design: Light theme, Inter typeface, navy/slate palette. No emojis. Professional.

### cf-budget-measures.dax
22 DAX measures for Power BI organized into four display folders:
- Budget\Spending — MTD, MoM change, weekly rate, daily avg, 3-month rolling, YTD
- Budget\Targets — Monthly/weekly targets, remaining, utilization, variance
- Budget\Forecast — Projected EOM, next month forecast, cost-per-order, cost/revenue
- Budget\Categories — Top category, per-category utilization

### quickbooks-import-template.csv
Column format reference for QuickBooks expense exports.

### expenses-schema.sql
Supabase Postgres tables for optional web-based expense tracking.

## Setup

### Power BI (primary)
1. Export QuickBooks Profit & Loss Detail (12–24 months) as Excel/CSV
2. In CF POWER BI file: Get Data > Excel, load as "Expenses" table
3. Create a "Budget" table (BudgetMonth, Category, MonthlyBudget)
4. Add DAX measures from cf-budget-measures.dax
5. Use cf-budget-dashboard.jsx as layout reference for Power BI visuals

### Supabase (optional web version)
1. Run expenses-schema.sql in Supabase SQL Editor
2. Import QuickBooks data into the expenses table
3. Connect cf-budget-dashboard.jsx to Supabase queries

## Data Sources
- Expenses: QuickBooks export (CSV/Excel)
- Orders: SQL Server (IDSERVER/dye) — existing connection
- Budget targets: Manual Excel table

## Existing Measures Referenced
- Total Orders (Orders folder)
- Order Amount MTD (Orders folder)

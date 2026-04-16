-- Wide (pivoted) view: one row per line item per (year, source) with month columns
create or replace view public.pl_monthly_wide as
select
  li.id as line_item_id,
  li.label,
  li.category,
  li.sort_order,
  pm.year,
  pm.source,
  sum(case when pm.month = 1  then pm.amount else 0 end) as jan,
  sum(case when pm.month = 2  then pm.amount else 0 end) as feb,
  sum(case when pm.month = 3  then pm.amount else 0 end) as mar,
  sum(case when pm.month = 4  then pm.amount else 0 end) as apr,
  sum(case when pm.month = 5  then pm.amount else 0 end) as may,
  sum(case when pm.month = 6  then pm.amount else 0 end) as jun,
  sum(case when pm.month = 7  then pm.amount else 0 end) as jul,
  sum(case when pm.month = 8  then pm.amount else 0 end) as aug,
  sum(case when pm.month = 9  then pm.amount else 0 end) as sep,
  sum(case when pm.month = 10 then pm.amount else 0 end) as oct,
  sum(case when pm.month = 11 then pm.amount else 0 end) as nov,
  sum(case when pm.month = 12 then pm.amount else 0 end) as dec,
  sum(pm.amount) as total
from public.pl_line_items li
join public.pl_monthly pm on pm.line_item_id = li.id
group by li.id, li.label, li.category, li.sort_order, pm.year, pm.source;

-- Category rollup: one row per (year, source, month) with category totals + computed margins
create or replace view public.pl_category_summary as
select
  pm.year,
  pm.source,
  pm.month,
  sum(case when li.category = 'REVENUE' then pm.amount else 0 end) as revenue,
  sum(case when li.category = 'COGS'    then pm.amount else 0 end) as cogs,
  sum(case when li.category = 'OPEX'    then pm.amount else 0 end) as opex,
  sum(case when li.category = 'OTHER'   then pm.amount else 0 end) as other,
  sum(case when li.category = 'REVENUE' then pm.amount else 0 end)
    - sum(case when li.category = 'COGS' then pm.amount else 0 end) as gross_profit,
  sum(case when li.category = 'REVENUE' then pm.amount else 0 end)
    - sum(case when li.category = 'COGS' then pm.amount else 0 end)
    - sum(case when li.category = 'OPEX' then pm.amount else 0 end)
    + sum(case when li.category = 'OTHER' then pm.amount else 0 end) as net_income
from public.pl_monthly pm
join public.pl_line_items li on li.id = pm.line_item_id
group by pm.year, pm.source, pm.month
order by pm.year, pm.source, pm.month;

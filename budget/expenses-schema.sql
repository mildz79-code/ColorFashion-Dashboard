-- Color Fashion Budget — Supabase Expense Tables
-- Run in Supabase SQL Editor after main schema

CREATE TABLE IF NOT EXISTS expense_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    gl_account TEXT,
    monthly_budget NUMERIC(12,2) DEFAULT 0,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO expense_categories (name, gl_account, monthly_budget, sort_order) VALUES
    ('Raw Materials',        '5000', 68000, 1),
    ('Dye Chemicals',        '5100', 28000, 2),
    ('Labor & Payroll',      '6100', 30000, 3),
    ('Energy & Utilities',   '6200', 16000, 4),
    ('Shipping & Freight',   '5200', 10000, 5),
    ('Maintenance',          '6300',  8000, 6)
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS expenses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    expense_date DATE NOT NULL,
    category_id UUID REFERENCES expense_categories(id),
    category_name TEXT NOT NULL,
    vendor TEXT,
    amount NUMERIC(12,2) NOT NULL,
    account TEXT,
    memo TEXT,
    qb_txn_id TEXT UNIQUE,
    import_batch TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS budget_targets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    budget_month DATE NOT NULL,
    category_id UUID REFERENCES expense_categories(id),
    category_name TEXT NOT NULL,
    monthly_budget NUMERIC(12,2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(budget_month, category_name)
);

CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category_name);
CREATE INDEX IF NOT EXISTS idx_expenses_vendor ON expenses(vendor);
CREATE INDEX IF NOT EXISTS idx_budget_targets_month ON budget_targets(budget_month);

CREATE OR REPLACE VIEW budget_summary AS
SELECT
    date_trunc('month', e.expense_date)::date AS month,
    e.category_name,
    SUM(e.amount) AS total_spent,
    COALESCE(bt.monthly_budget, ec.monthly_budget) AS budget_target,
    COALESCE(bt.monthly_budget, ec.monthly_budget) - SUM(e.amount) AS variance
FROM expenses e
LEFT JOIN expense_categories ec ON ec.name = e.category_name
LEFT JOIN budget_targets bt
    ON bt.budget_month = date_trunc('month', e.expense_date)::date
    AND bt.category_name = e.category_name
GROUP BY 1, 2, bt.monthly_budget, ec.monthly_budget
ORDER BY 1 DESC, 2;

ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated full access" ON expense_categories FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access" ON expenses FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access" ON budget_targets FOR ALL TO authenticated USING (true) WITH CHECK (true);

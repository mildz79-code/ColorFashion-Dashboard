# OpsMaster — Employee Tracking Module

## What's in this package

```
opsmaster-employee/
├── supabase/
│   └── schema.sql              ← Run this in Supabase SQL editor first
├── importer/
│   ├── importer.js             ← Wasp CSV watcher + importer (Node.js)
│   ├── package.json
│   └── .env.example            ← Copy to .env and fill in your values
└── dashboard/
    └── employee-tracking.html  ← Full React dashboard page
```

---

## Step 1 — Set up Supabase schema

1. Go to your Supabase project → SQL Editor
2. Paste the contents of `supabase/schema.sql`
3. Run it — creates 5 tables, 2 views, indexes, and RLS policies

Tables created:
- `employees`        — master record per person (keyed by Wasp employee ID)
- `shifts`           — clock in/out per employee per day
- `payroll_runs`     — log of each CSV import batch
- `payroll_entries`  — individual pay lines per employee per run
- `import_errors`    — bad rows from failed imports

---

## Step 2 — Configure the importer

```bash
cd importer
npm install
cp .env.example .env
# Edit .env with your Supabase URL, service key, and Wasp folder path
```

Your `.env` needs:
```
SUPABASE_URL=https://mtxokbgpmkggolyfeehz.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key   # Settings > API in Supabase
WASP_EXPORT_FOLDER=C:/WaspExports/Payroll    # Path Wasp writes CSVs to
```

---

## Step 3 — Map your Wasp CSV columns

Open `importer.js` and find the `COL` object near the top.
Run one real Wasp export and check the column headers, then update:

```js
const COL = {
  wasp_id:    'Employee ID',   // ← change to match your actual column name
  first_name: 'First Name',
  // ...etc
};
```

To see your real column names, temporarily add this after `parse()`:
```js
console.log('Columns:', Object.keys(rows[0]));
```

---

## Step 4 — Run the importer

**Development (watch mode):**
```bash
node importer.js
```

**Production (as a Windows service or cron):**

Windows — Task Scheduler:
- Action: `node C:\opsmaster\importer\importer.js`
- Trigger: Every 15 minutes, or on file creation in the Wasp folder

Linux/Mac — crontab:
```
*/15 * * * * /usr/bin/node /path/to/importer/importer.js >> /var/log/opsmaster.log 2>&1
```

The importer will:
1. Watch for new `.csv` files in your Wasp export folder
2. Parse and validate each row
3. Upsert employee records (won't create duplicates)
4. Insert shift records and payroll entries
5. Log any bad rows to `import_errors` table
6. Move processed files to `_processed/` subfolder
7. Move failed files to `_errors/` subfolder

---

## Step 5 — Connect the dashboard to Supabase

In `employee-tracking.html`, replace the mock data section with real Supabase queries.
Add to the `<head>`:
```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js"></script>
```

Then replace `MOCK_EMPLOYEES` load with:
```js
const { data } = await supabase
  .from('employees')
  .select('*, shifts(clock_in, clock_out, shift_date, shift_label)')
  .eq('status', 'active');
```

For real-time updates as new imports land:
```js
supabase
  .channel('employees')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'employees' }, 
      payload => refetchData())
  .subscribe();
```

---

## Wasp payroll export tips

In Wasp payroll:
- Go to Reports → Export → Payroll Detail
- Set format: CSV
- Set destination: your shared network folder
- Schedule: nightly or per pay period

The importer handles the rest automatically.

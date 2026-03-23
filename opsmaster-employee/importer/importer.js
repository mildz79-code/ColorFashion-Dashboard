'use strict';

require('dotenv').config();
const path    = require('path');
const fs      = require('fs');
const { parse }    = require('csv-parse/sync');
const chokidar     = require('chokidar');
const { createClient } = require('@supabase/supabase-js');

// ============================================================
// CONFIG — edit COL values to match your actual Wasp CSV headers
// ============================================================
const COL = {
  wasp_id:          'Employee ID',
  first_name:       'First Name',
  last_name:        'Last Name',
  department:       'Department',
  job_title:        'Job Title',
  pay_rate:         'Pay Rate',
  pay_type:         'Pay Type',
  shift_date:       'Work Date',
  clock_in:         'Clock In',
  clock_out:        'Clock Out',
  shift_label:      'Shift',
  regular_hours:    'Regular Hours',
  overtime_hours:   'OT Hours',
  total_hours:      'Total Hours',
  gross_pay:        'Gross Pay',
  pay_period_start: 'Period Start',
  pay_period_end:   'Period End',
};

// ============================================================
// ENV VALIDATION
// ============================================================
const SUPABASE_URL        = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const WATCH_FOLDER        = process.env.WASP_EXPORT_FOLDER;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !WATCH_FOLDER) {
  console.error('[ERROR] Missing required env vars. Copy .env.example to .env and fill it in.');
  process.exit(1);
}

// ============================================================
// SUPABASE CLIENT
// ============================================================
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

// ============================================================
// LOGGING
// ============================================================
function log(msg) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

// ============================================================
// HELPER: ensure subdirectory exists
// ============================================================
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

// ============================================================
// HELPER: parse numeric value from CSV string
// ============================================================
function toNum(val) {
  if (val === undefined || val === null || val === '') return null;
  const n = parseFloat(String(val).replace(/[^0-9.\-]/g, ''));
  return isNaN(n) ? null : n;
}

// ============================================================
// HELPER: parse date/timestamp or return null
// ============================================================
function toDate(val) {
  if (!val) return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

function toDateOnly(val) {
  if (!val) return null;
  const d = new Date(val);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().split('T')[0];
}

// ============================================================
// MAIN IMPORT FUNCTION
// ============================================================
async function importFile(filePath) {
  const fileName = path.basename(filePath);
  const processedDir = path.join(WATCH_FOLDER, '_processed');
  const errorsDir    = path.join(WATCH_FOLDER, '_errors');
  ensureDir(processedDir);
  ensureDir(errorsDir);

  log(`Processing: ${fileName}`);

  // ── 1. Create payroll_run record ──────────────────────────
  const { data: runData, error: runErr } = await supabase
    .from('payroll_runs')
    .insert({ file_name: fileName, status: 'processing' })
    .select('id')
    .single();

  if (runErr) {
    log(`[ERROR] Could not create payroll_run for ${fileName}: ${runErr.message}`);
    _moveFile(filePath, path.join(errorsDir, fileName));
    return;
  }
  const runId = runData.id;
  log(`Created payroll_run ${runId}`);

  let rows;
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    rows = parse(raw, {
      columns:           true,
      skip_empty_lines:  true,
      trim:              true,
    });
  } catch (parseErr) {
    log(`[ERROR] Failed to parse CSV ${fileName}: ${parseErr.message}`);
    await _failRun(runId, `CSV parse error: ${parseErr.message}`);
    _moveFile(filePath, path.join(errorsDir, fileName));
    return;
  }

  log(`Parsed ${rows.length} rows from ${fileName}`);

  const goodRows   = [];
  const errorRows  = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const waspId = row[COL.wasp_id];
    if (!waspId || !waspId.trim()) {
      errorRows.push({ rowIndex: i + 2, raw: row, msg: `Missing ${COL.wasp_id}` });
    } else {
      goodRows.push(row);
    }
  }

  // ── 2. Log bad rows ───────────────────────────────────────
  if (errorRows.length > 0) {
    const errInserts = errorRows.map(e => ({
      payroll_run_id: runId,
      row_number:     e.rowIndex,
      raw_data:       e.raw,
      error_message:  e.msg,
    }));
    const { error: errInsertErr } = await supabase
      .from('import_errors')
      .insert(errInserts);
    if (errInsertErr) log(`[WARN] Could not log import errors: ${errInsertErr.message}`);
    else log(`Logged ${errorRows.length} bad rows to import_errors`);
  }

  if (goodRows.length === 0) {
    log(`[WARN] No valid rows in ${fileName}. Marking as failed.`);
    await _failRun(runId, 'No valid rows found', errorRows.length, rows.length);
    _moveFile(filePath, path.join(errorsDir, fileName));
    return;
  }

  // ── 3. Deduplicate + upsert employees ─────────────────────
  const empMap = new Map();
  for (const row of goodRows) {
    const wid = row[COL.wasp_id].trim();
    if (!empMap.has(wid)) {
      empMap.set(wid, {
        wasp_id:    wid,
        first_name: row[COL.first_name] || '',
        last_name:  row[COL.last_name]  || '',
        department: row[COL.department] || null,
        job_title:  row[COL.job_title]  || null,
        pay_rate:   toNum(row[COL.pay_rate]),
        pay_type:   row[COL.pay_type]   || null,
        updated_at: new Date().toISOString(),
      });
    }
  }

  const employeeUpserts = Array.from(empMap.values());
  const { error: empErr } = await supabase
    .from('employees')
    .upsert(employeeUpserts, { onConflict: 'wasp_id', ignoreDuplicates: false });

  if (empErr) {
    log(`[ERROR] Employee upsert failed: ${empErr.message}`);
    await _failRun(runId, `Employee upsert error: ${empErr.message}`, errorRows.length, rows.length);
    _moveFile(filePath, path.join(errorsDir, fileName));
    return;
  }
  log(`Upserted ${employeeUpserts.length} employees`);

  // ── 4. Fetch UUID map: wasp_id → UUID ─────────────────────
  const waspIds = Array.from(empMap.keys());
  const { data: empRecords, error: fetchErr } = await supabase
    .from('employees')
    .select('id, wasp_id')
    .in('wasp_id', waspIds);

  if (fetchErr) {
    log(`[ERROR] Could not fetch employee UUIDs: ${fetchErr.message}`);
    await _failRun(runId, `UUID fetch error: ${fetchErr.message}`, errorRows.length, rows.length);
    _moveFile(filePath, path.join(errorsDir, fileName));
    return;
  }

  const waspToUuid = {};
  for (const rec of empRecords) {
    waspToUuid[rec.wasp_id] = rec.id;
  }

  // ── 5. Build + insert shift records ───────────────────────
  const shiftInserts = [];
  for (const row of goodRows) {
    const wid = row[COL.wasp_id].trim();
    const empId = waspToUuid[wid];
    if (!empId) continue;
    shiftInserts.push({
      employee_id:  empId,
      wasp_id:      wid,
      shift_date:   toDateOnly(row[COL.shift_date]),
      clock_in:     toDate(row[COL.clock_in]),
      clock_out:    toDate(row[COL.clock_out]),
      shift_label:  row[COL.shift_label]  || null,
      hours_worked: toNum(row[COL.total_hours]),
      department:   row[COL.department]   || null,
      status:       'completed',
    });
  }

  if (shiftInserts.length > 0) {
    const { error: shiftErr } = await supabase
      .from('shifts')
      .insert(shiftInserts);
    if (shiftErr) log(`[WARN] Shift insert error: ${shiftErr.message}`);
    else log(`Inserted ${shiftInserts.length} shift records`);
  }

  // ── 6. Build + insert payroll_entry records ───────────────
  // Determine pay period from first valid row
  const firstRow         = goodRows[0];
  const payPeriodStart   = toDateOnly(firstRow[COL.pay_period_start]);
  const payPeriodEnd     = toDateOnly(firstRow[COL.pay_period_end]);

  const entryInserts = [];
  let totalHoursSum  = 0;
  let totalPaySum    = 0;

  for (const row of goodRows) {
    const wid   = row[COL.wasp_id].trim();
    const empId = waspToUuid[wid];
    if (!empId) continue;

    const totHrs = toNum(row[COL.total_hours]) || 0;
    const gPay   = toNum(row[COL.gross_pay])   || 0;
    totalHoursSum += totHrs;
    totalPaySum   += gPay;

    entryInserts.push({
      payroll_run_id:   runId,
      employee_id:      empId,
      wasp_id:          wid,
      pay_period_start: payPeriodStart || toDateOnly(row[COL.pay_period_start]),
      pay_period_end:   payPeriodEnd   || toDateOnly(row[COL.pay_period_end]),
      regular_hours:    toNum(row[COL.regular_hours])  || 0,
      overtime_hours:   toNum(row[COL.overtime_hours]) || 0,
      total_hours:      totHrs,
      gross_pay:        gPay,
      department:       row[COL.department] || null,
    });
  }

  if (entryInserts.length > 0) {
    const { error: entryErr } = await supabase
      .from('payroll_entries')
      .insert(entryInserts);
    if (entryErr) log(`[WARN] Payroll entry insert error: ${entryErr.message}`);
    else log(`Inserted ${entryInserts.length} payroll entries`);
  }

  // ── 7. Update payroll_run with final totals ───────────────
  const finalStatus = errorRows.length === 0 ? 'completed' : 'partial';
  const { error: updateErr } = await supabase
    .from('payroll_runs')
    .update({
      pay_period_start: payPeriodStart,
      pay_period_end:   payPeriodEnd,
      total_employees:  employeeUpserts.length,
      total_hours:      Math.round(totalHoursSum * 100) / 100,
      total_gross_pay:  Math.round(totalPaySum   * 100) / 100,
      row_count:        rows.length,
      error_count:      errorRows.length,
      status:           finalStatus,
    })
    .eq('id', runId);

  if (updateErr) log(`[WARN] Could not update payroll_run: ${updateErr.message}`);
  else log(`Run ${runId} marked ${finalStatus} — ${employeeUpserts.length} employees, ${totalHoursSum.toFixed(2)} hrs, $${totalPaySum.toFixed(2)}`);

  // ── 8. Move file to _processed ────────────────────────────
  _moveFile(filePath, path.join(processedDir, `${Date.now()}_${fileName}`));
  log(`Done: ${fileName}`);
}

// ============================================================
// HELPERS
// ============================================================
async function _failRun(runId, notes, errorCount = 0, rowCount = 0) {
  await supabase
    .from('payroll_runs')
    .update({ status: 'failed', notes, error_count: errorCount, row_count: rowCount })
    .eq('id', runId);
}

function _moveFile(src, dest) {
  try {
    fs.renameSync(src, dest);
    log(`Moved → ${dest}`);
  } catch (e) {
    log(`[WARN] Could not move ${src}: ${e.message}`);
  }
}

// ============================================================
// CHOKIDAR WATCHER
// ============================================================
log(`OpsMaster Wasp Importer starting…`);
log(`Watching: ${WATCH_FOLDER}`);

ensureDir(WATCH_FOLDER);

const watcher = chokidar.watch(path.join(WATCH_FOLDER, '*.csv'), {
  ignored:        /(^|[/\\])\../,   // ignore dot files
  persistent:     true,
  ignoreInitial:  false,            // process existing files on startup
  awaitWriteFinish: {
    stabilityThreshold: 2000,
    pollInterval:       100,
  },
});

watcher
  .on('add', async (filePath) => {
    // Skip files already in _processed or _errors subdirs
    const rel = path.relative(WATCH_FOLDER, filePath);
    if (rel.startsWith('_processed') || rel.startsWith('_errors')) return;
    try {
      await importFile(filePath);
    } catch (err) {
      log(`[ERROR] Unhandled error for ${filePath}: ${err.message}`);
    }
  })
  .on('error', (err) => {
    log(`[ERROR] Watcher error: ${err.message}`);
  });

log('Watcher ready. Waiting for CSV files…');

// ============================================================
// GRACEFUL SHUTDOWN
// ============================================================
async function shutdown(signal) {
  log(`Received ${signal}. Shutting down…`);
  await watcher.close();
  log('Watcher closed. Goodbye.');
  process.exit(0);
}

process.on('SIGINT',  () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

#!/usr/bin/env node
/**
 * OpsMaster — Wasp Payroll CSV Importer
 *
 * Watches a shared network folder for new CSV exports from Wasp payroll.
 * Parses, validates, and upserts data into Supabase.
 *
 * Setup:
 *   npm install @supabase/supabase-js chokidar csv-parse dotenv
 *
 * Run:
 *   node importer.js
 *
 * Or as a cron job (every 15 min):
 *   *\/15 * * * * /usr/bin/node /path/to/importer.js >> /var/log/opsmaster-import.log 2>&1
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const chokidar = require('chokidar');
const { createClient } = require('@supabase/supabase-js');

// ── Config ────────────────────────────────────────────────────────────────────
const WATCH_FOLDER = process.env.WASP_EXPORT_FOLDER || 'C:/WaspExports/Payroll';
const PROCESSED_DIR = path.join(WATCH_FOLDER, '_processed');
const ERROR_DIR = path.join(WATCH_FOLDER, '_errors');
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY; // use service role key for server-side

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('ERROR: Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Ensure subdirectories exist
[PROCESSED_DIR, ERROR_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// ── CSV Column Mapping ────────────────────────────────────────────────────────
// Wasp payroll exports vary — adjust these to match YOUR export column headers.
// Run one file through and console.log(rows[0]) to see the real column names.
const COL = {
  wasp_id: 'Employee ID',
  first_name: 'First Name',
  last_name: 'Last Name',
  department: 'Department',
  job_title: 'Job Title',
  pay_rate: 'Pay Rate',
  pay_type: 'Pay Type',
  shift_date: 'Work Date',
  clock_in: 'Clock In',
  clock_out: 'Clock Out',
  shift_label: 'Shift',
  regular_hours: 'Regular Hours',
  overtime_hours: 'OT Hours',
  total_hours: 'Total Hours',
  gross_pay: 'Gross Pay',
  pay_period_start: 'Period Start',
  pay_period_end: 'Period End',
};

// ── Utilities ─────────────────────────────────────────────────────────────────
const log = (msg) => console.log(`[${new Date().toISOString()}] ${msg}`);

function parseDate(str) {
  if (!str || str.trim() === '') return null;
  const d = new Date(str.trim());
  return isNaN(d) ? null : d.toISOString().split('T')[0];
}

function parseDateTime(dateStr, timeStr) {
  if (!dateStr || !timeStr) return null;
  const combined = `${dateStr.trim()} ${timeStr.trim()}`;
  const d = new Date(combined);
  return isNaN(d) ? null : d.toISOString();
}

function parseNum(str) {
  if (!str || str.trim() === '') return 0;
  return parseFloat(str.replace(/[$,]/g, '').trim()) || 0;
}

// ── Core Import Logic ─────────────────────────────────────────────────────────
async function importFile(filePath) {
  const fileName = path.basename(filePath);
  log(`Processing: ${fileName}`);

  // Read and parse CSV
  let rawContent;
  try {
    rawContent = fs.readFileSync(filePath, 'utf-8');
  } catch (err) {
    log(`ERROR reading file: ${err.message}`);
    return;
  }

  let rows;
  try {
    rows = parse(rawContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });
  } catch (err) {
    log(`ERROR parsing CSV: ${err.message}`);
    moveFile(filePath, ERROR_DIR);
    return;
  }

  if (rows.length === 0) {
    log(`SKIP: Empty file ${fileName}`);
    moveFile(filePath, PROCESSED_DIR);
    return;
  }

  log(`Parsed ${rows.length} rows from ${fileName}`);

  // Detect pay period from first row
  const firstRow = rows[0];
  const periodStart = parseDate(firstRow[COL.pay_period_start]);
  const periodEnd = parseDate(firstRow[COL.pay_period_end]);

  // Create payroll_run record
  const { data: runData, error: runError } = await supabase
    .from('payroll_runs')
    .insert({
      file_name: fileName,
      pay_period_start: periodStart,
      pay_period_end: periodEnd,
      row_count: rows.length,
      status: 'processing',
    })
    .select('id')
    .single();

  if (runError) {
    log(`ERROR creating payroll_run: ${runError.message}`);
    moveFile(filePath, ERROR_DIR);
    return;
  }

  const runId = runData.id;
  log(`Created payroll_run ${runId}`);

  // Process rows
  const employees = new Map(); // wasp_id → employee upsert data
  const shiftRecords = [];
  const payRecords = [];
  const errorRecords = [];
  let totalHours = 0;
  let totalGross = 0;

  rows.forEach((row, i) => {
    const waspId = row[COL.wasp_id]?.trim();
    if (!waspId) {
      errorRecords.push({
        payroll_run_id: runId,
        row_number: i + 2,
        raw_data: JSON.stringify(row),
        error_message: 'Missing Employee ID',
      });
      return;
    }

    // Build employee upsert (deduped by wasp_id)
    if (!employees.has(waspId)) {
      employees.set(waspId, {
        wasp_id: waspId,
        first_name: row[COL.first_name]?.trim() || 'Unknown',
        last_name: row[COL.last_name]?.trim() || '',
        department: row[COL.department]?.trim() || 'Unassigned',
        job_title: row[COL.job_title]?.trim() || null,
        pay_rate: parseNum(row[COL.pay_rate]),
        pay_type: row[COL.pay_type]?.trim().toLowerCase() || 'hourly',
        status: 'active',
        updated_at: new Date().toISOString(),
      });
    }

    // Build shift record
    const shiftDate = parseDate(row[COL.shift_date]);
    const clockIn = parseDateTime(row[COL.shift_date], row[COL.clock_in]);
    const clockOut = parseDateTime(row[COL.shift_date], row[COL.clock_out]);
    const hrs = parseNum(row[COL.total_hours]);

    if (shiftDate) {
      shiftRecords.push({
        wasp_id: waspId,
        shift_date: shiftDate,
        clock_in: clockIn,
        clock_out: clockOut,
        shift_label: row[COL.shift_label]?.trim() || null,
        hours_worked: hrs,
        department: row[COL.department]?.trim() || null,
        status: clockOut ? 'completed' : 'active',
      });
    }

    // Build payroll entry
    const gross = parseNum(row[COL.gross_pay]);
    totalHours += hrs;
    totalGross += gross;

    payRecords.push({
      payroll_run_id: runId,
      wasp_id: waspId,
      pay_period_start: periodStart,
      pay_period_end: periodEnd,
      regular_hours: parseNum(row[COL.regular_hours]),
      overtime_hours: parseNum(row[COL.overtime_hours]),
      total_hours: hrs,
      gross_pay: gross,
      department: row[COL.department]?.trim() || null,
    });
  });

  // 1. Upsert employees
  const employeeList = Array.from(employees.values());
  const { error: empError } = await supabase
    .from('employees')
    .upsert(employeeList, { onConflict: 'wasp_id' });

  if (empError) {
    log(`ERROR upserting employees: ${empError.message}`);
  } else {
    log(`Upserted ${employeeList.length} employees`);
  }

  // 2. Fetch employee UUID map (wasp_id → UUID)
  const { data: empRows } = await supabase
    .from('employees')
    .select('id, wasp_id')
    .in(
      'wasp_id',
      employeeList.map((e) => e.wasp_id),
    );

  const idMap = new Map((empRows || []).map((e) => [e.wasp_id, e.id]));

  // 3. Insert shifts (with employee_id resolved)
  const shiftsWithIds = shiftRecords.map((s) => ({
    ...s,
    employee_id: idMap.get(s.wasp_id) || null,
  }));

  if (shiftsWithIds.length > 0) {
    const { error: shiftError } = await supabase.from('shifts').insert(shiftsWithIds);
    if (shiftError) log(`ERROR inserting shifts: ${shiftError.message}`);
    else log(`Inserted ${shiftsWithIds.length} shift records`);
  }

  // 4. Insert payroll entries
  const payWithIds = payRecords.map((p) => ({
    ...p,
    employee_id: idMap.get(p.wasp_id) || null,
  }));

  if (payWithIds.length > 0) {
    const { error: payError } = await supabase.from('payroll_entries').insert(payWithIds);
    if (payError) log(`ERROR inserting payroll entries: ${payError.message}`);
    else log(`Inserted ${payWithIds.length} payroll entries`);
  }

  // 5. Insert error rows
  if (errorRecords.length > 0) {
    await supabase.from('import_errors').insert(errorRecords);
    log(`Logged ${errorRecords.length} row errors`);
  }

  // 6. Update payroll_run with final totals
  await supabase
    .from('payroll_runs')
    .update({
      total_employees: employeeList.length,
      total_hours: Math.round(totalHours * 100) / 100,
      total_gross_pay: Math.round(totalGross * 100) / 100,
      error_count: errorRecords.length,
      status:
        errorRecords.length === rows.length
          ? 'failed'
          : errorRecords.length > 0
            ? 'partial'
            : 'completed',
    })
    .eq('id', runId);

  log(
    `Import complete — ${employeeList.length} employees, ${shiftsWithIds.length} shifts, $${totalGross.toFixed(2)} gross pay`,
  );

  // Move file to processed folder
  moveFile(filePath, PROCESSED_DIR);
}

function moveFile(src, destDir) {
  const destPath = path.join(destDir, path.basename(src));
  try {
    fs.renameSync(src, destPath);
    log(`Moved to ${destDir}`);
  } catch (err) {
    log(`WARN: Could not move file: ${err.message}`);
  }
}

// ── File Watcher ──────────────────────────────────────────────────────────────
log('OpsMaster Wasp Importer started');
log(`Watching: ${WATCH_FOLDER}`);

const watcher = chokidar.watch(path.join(WATCH_FOLDER, '*.csv'), {
  ignored: /(^|[/\\])[\._]/, // ignore dotfiles and _processed/_errors
  persistent: true,
  ignoreInitial: false, // process any existing CSVs on startup
  awaitWriteFinish: {
    stabilityThreshold: 2000, // wait 2s after last write (file fully copied)
    pollInterval: 500,
  },
});

watcher.on('add', (filePath) => importFile(filePath)).on('error', (err) => log(`Watcher error: ${err}`));

// Graceful shutdown
process.on('SIGINT', () => {
  log('Shutting down');
  watcher.close();
  process.exit(0);
});
process.on('SIGTERM', () => {
  log('Shutting down');
  watcher.close();
  process.exit(0);
});

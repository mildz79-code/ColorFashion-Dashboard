/**
 * OpsMaster — Supabase Data Layer
 * 
 * Handles all database queries, real-time subscriptions,
 * and data transformation for every dashboard screen.
 * 
 * Setup:
 *   1. Add your Supabase project URL and anon key below
 *   2. Make sure schema.sql has been run in your Supabase SQL editor
 *   3. Include this file BEFORE opsmaster.html's closing </body>:
 *      <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js"></script>
 *      <script src="supabase-data.js"></script>
 */

// ── CONFIG — fill in your values ─────────────────────────────────────────────
const SUPABASE_URL  = 'https://mtxokbgpmkggolyfeehz.supabase.co';
const SUPABASE_ANON = 'YOUR_ANON_KEY_HERE'; // Settings > API > anon public

// ── Init client ───────────────────────────────────────────────────────────────
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON);

// ── Active real-time subscriptions (track for cleanup) ────────────────────────
const _subs = {};

// ── Utility helpers ───────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const fmt$ = n => '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtNum = n => Number(n).toLocaleString('en-US');

function setEl(id, val) {
  const el = $(id);
  if (el) el.textContent = val;
}

function showError(msg) {
  console.error('[OpsMaster]', msg);
}

// ── Loading state helpers ─────────────────────────────────────────────────────
function setLoading(ids, on) {
  ids.forEach(id => {
    const el = $(id);
    if (!el) return;
    if (on) {
      el.dataset.original = el.textContent;
      el.textContent = '—';
      el.style.opacity = '.4';
    } else {
      el.style.opacity = '1';
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// MASTER DASH
// ═══════════════════════════════════════════════════════════════════════════════
async function loadMasterDash() {
  setLoading(['kpi-total-sales','kpi-energy-cost','kpi-employees'], true);

  try {
    // Total sales — sum of gross_pay from payroll_entries (current period)
    // In production replace with your actual orders/sales table
    const [salesRes, energyRes, empRes, ordersRes, shiftsRes] = await Promise.all([
      db.from('payroll_entries')
        .select('gross_pay')
        .gte('pay_period_start', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]),

      // Energy cost — sum from a cost analysis or manual entry
      // Placeholder: pull latest payroll_run totals as proxy
      db.from('payroll_runs')
        .select('total_gross_pay, imported_at')
        .order('imported_at', { ascending: false })
        .limit(1)
        .single(),

      // Active employee count
      db.from('employees')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active'),

      // Recent orders (top 5)
      db.from('payroll_entries')
        .select('wasp_id, department, gross_pay, total_hours, pay_period_start, pay_period_end')
        .order('created_at', { ascending: false })
        .limit(5),

      // Active shifts today
      db.from('today_shifts')
        .select('employee_name, department, hours_worked, is_clocked_in')
        .eq('is_clocked_in', true)
        .limit(3),
    ]);

    // Total sales KPI
    const totalSales = (salesRes.data || []).reduce((s, r) => s + Number(r.gross_pay || 0), 0);
    setEl('kpi-total-sales', fmt$(totalSales));

    // Employee count
    if (!empRes.error) {
      setEl('kpi-employees', fmtNum(empRes.count) + ' employees');
    }

    // Energy cost — use last payroll run as placeholder until energy table exists
    if (energyRes.data) {
      setEl('kpi-energy-cost', '€' + Number(energyRes.data.total_gross_pay || 12340).toLocaleString('en-US', { minimumFractionDigits: 2 }));
    }

    // Active shift employees panel
    renderMasterShifts(shiftsRes.data || []);

    // Orders chart data — group payroll entries by period for trend
    renderOrdersChart(ordersRes.data || []);

  } catch (err) {
    showError('Master dash load failed: ' + err.message);
  }

  setLoading(['kpi-total-sales','kpi-energy-cost','kpi-employees'], false);
}

function renderMasterShifts(shifts) {
  const container = $('master-shifts');
  if (!container || !shifts.length) return;
  const AV = ['#388bfd','#3fb950','#a371f7','#d29922','#f78166','#4ac6b7'];
  container.innerHTML = shifts.map((s, i) => {
    const init = (s.employee_name || 'UN').split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase();
    const pct = Math.round((s.hours_worked / 8) * 100);
    return `
    <div class="emp-row">
      <div class="avatar" style="background:${AV[i]}">${init}</div>
      <div class="emp-info">
        <div class="emp-name">${s.employee_name}</div>
        <div class="emp-meta">${s.department}</div>
      </div>
      <div style="flex:1;max-width:80px"><div class="prog-wrap" style="margin-top:0"><div class="prog-fill" style="width:${pct}%;background:var(--blue)"></div></div></div>
      <div class="emp-shift-pct">${pct}%</div>
    </div>`;
  }).join('');
}

function renderOrdersChart(entries) {
  // Group by department for the area chart
  // Chart.js instance rebuilt by buildCharts() — just update data if chart exists
  const chart = Chart.getChart('ordersChart');
  if (!chart || !entries.length) return;

  const byDept = {};
  entries.forEach(e => {
    byDept[e.department] = (byDept[e.department] || 0) + Number(e.gross_pay);
  });

  const labels = Object.keys(byDept);
  const values = Object.values(byDept);

  chart.data.labels = labels;
  chart.data.datasets[0].data = values;
  chart.update();
}

// ═══════════════════════════════════════════════════════════════════════════════
// ORDER / PRODUCTION
// ═══════════════════════════════════════════════════════════════════════════════
async function loadOrders() {
  setLoading(['kpi-order-today','kpi-order-yesterday','kpi-order-mtd','kpi-revenue','kpi-order-count','kpi-avg-order'], true);

  try {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

    const [todayRes, yestRes, mtdRes, recentRes, trendRes] = await Promise.all([
      // Today's volume (hours as proxy for production volume)
      db.from('shifts').select('hours_worked').eq('shift_date', today),
      db.from('shifts').select('hours_worked').eq('shift_date', yesterday),
      db.from('shifts').select('hours_worked').gte('shift_date', monthStart),

      // Recent payroll entries as order proxies
      db.from('payroll_entries')
        .select('wasp_id, department, gross_pay, total_hours, pay_period_end, payroll_run_id')
        .order('created_at', { ascending: false })
        .limit(10),

      // 7-day revenue trend from payroll runs
      db.from('payroll_runs')
        .select('imported_at, total_gross_pay')
        .order('imported_at', { ascending: true })
        .limit(7),
    ]);

    const sumHrs = arr => (arr || []).reduce((s, r) => s + Number(r.hours_worked || 0), 0);

    setEl('kpi-order-today',     (sumHrs(todayRes.data) * 18.5).toFixed(1) + ' lbs');
    setEl('kpi-order-yesterday', (sumHrs(yestRes.data) * 18.5).toFixed(1) + ' lbs');
    setEl('kpi-order-mtd',       (sumHrs(mtdRes.data) * 18.5).toFixed(1) + ' lbs');

    // Revenue KPIs
    const totalRev = (recentRes.data || []).reduce((s, r) => s + Number(r.gross_pay || 0), 0);
    setEl('kpi-revenue',      fmt$(totalRev));
    setEl('kpi-order-count',  (recentRes.data || []).length + ' orders');
    const avg = (recentRes.data || []).length ? totalRev / recentRes.data.length : 0;
    setEl('kpi-avg-order',    fmt$(avg));

    // Render recent orders table
    renderOrdersTable(recentRes.data || []);

    // Sales trend chart
    renderSalesTrend(trendRes.data || []);

  } catch (err) {
    showError('Orders load failed: ' + err.message);
  }

  setLoading(['kpi-order-today','kpi-order-yesterday','kpi-order-mtd','kpi-revenue','kpi-order-count','kpi-avg-order'], false);
}

function renderOrdersTable(entries) {
  const tbody = $('orders-table');
  if (!tbody) return;
  const statuses = ['On Hold','Shipped','Processing','In Review','Pending'];
  const badgeCls = ['badge-amber','badge-teal','badge-blue','badge-purple','badge-gray'];
  tbody.innerHTML = entries.slice(0,8).map((e, i) => {
    const si = i % statuses.length;
    return `<tr>
      <td style="font-family:var(--mono);color:var(--t2)">#ORD-${String(e.wasp_id).padStart(4,'0')}</td>
      <td>${e.department}</td>
      <td>${e.total_hours}h production run</td>
      <td style="text-align:right;font-family:var(--mono)">${fmtNum(Math.round(e.total_hours * 18.5))}</td>
      <td><span class="badge ${badgeCls[si]}">${statuses[si]}</span></td>
    </tr>`;
  }).join('');
}

function renderSalesTrend(runs) {
  const chart = Chart.getChart('salesTrendChart');
  if (!chart || !runs.length) return;
  chart.data.labels = runs.map(r => {
    const d = new Date(r.imported_at);
    return d.toLocaleDateString('en-US', { weekday: 'short' });
  });
  chart.data.datasets[0].data = runs.map(r => Number(r.total_gross_pay || 0));
  chart.update();
}

// ═══════════════════════════════════════════════════════════════════════════════
// ENERGY DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════
async function loadEnergy() {
  // Energy data comes from CSV imports (Powerlink) stored in a dedicated table.
  // Until that table exists, we read from payroll_runs as a cost proxy.
  try {
    const { data: runs } = await db
      .from('payroll_runs')
      .select('total_gross_pay, total_hours, imported_at, status')
      .order('imported_at', { ascending: false })
      .limit(8);

    if (!runs || !runs.length) return;

    // Derive utility figures from payroll totals as placeholder
    // Replace with real energy table queries when available
    const latest = runs[0];
    const totalPay = Number(latest.total_gross_pay || 0);

    setEl('kpi-electricity', Math.round(totalPay * 0.15) + '');
    setEl('kpi-water',       Math.round(totalPay * 0.12) + '');
    setEl('kpi-gas',         Math.round(totalPay * 0.08) + '');
    setEl('cost-electricity', fmt$(totalPay * 0.15));
    setEl('cost-water',       fmt$(totalPay * 0.12));
    setEl('cost-gas',         fmt$(totalPay * 0.08));
    setEl('cost-total',       fmt$(totalPay * 0.35));

    // Utility bar chart — weekly breakdown
    renderUtilityChart(runs.slice(0,7).reverse());

  } catch (err) {
    showError('Energy load failed: ' + err.message);
  }
}

function renderUtilityChart(runs) {
  const chart = Chart.getChart('utilityChart');
  if (!chart) return;
  const labels = runs.map(r => new Date(r.imported_at).toLocaleDateString('en-US', { weekday: 'short' }));
  const base   = runs.map(r => Number(r.total_gross_pay || 0));
  chart.data.labels = labels;
  chart.data.datasets[0].data = base.map(v => Math.round(v * 0.15));  // electricity
  chart.data.datasets[1].data = base.map(v => Math.round(v * 0.10));  // water
  chart.data.datasets[2].data = base.map(v => Math.round(v * 0.07));  // gas
  chart.update();
}

// ═══════════════════════════════════════════════════════════════════════════════
// EMPLOYEE TRACKING
// ═══════════════════════════════════════════════════════════════════════════════
async function loadEmployees() {
  setLoading(['kpi-emp-active','kpi-emp-clocked','kpi-emp-hours','kpi-emp-leave'], true);

  try {
    const today = new Date().toISOString().split('T')[0];

    const [empRes, todayShiftsRes, deptRes, importRes] = await Promise.all([
      // All employees
      db.from('employees').select('*').order('last_name'),

      // Today's shifts with clock-in status
      db.from('today_shifts').select('*'),

      // Department headcount view
      db.from('dept_headcount').select('*'),

      // Recent payroll imports
      db.from('payroll_runs')
        .select('id, file_name, imported_at, total_employees, total_hours, status')
        .order('imported_at', { ascending: false })
        .limit(5),
    ]);

    const employees    = empRes.data || [];
    const todayShifts  = todayShiftsRes.data || [];
    const departments  = deptRes.data || [];
    const imports      = importRes.data || [];

    const active     = employees.filter(e => e.status === 'active').length;
    const onLeave    = employees.filter(e => e.status === 'on_leave').length;
    const clockedIn  = todayShifts.filter(s => s.is_clocked_in).length;

    // Week's hours — sum from shifts this week
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const { data: weekShifts } = await db
      .from('shifts')
      .select('hours_worked')
      .gte('shift_date', weekStart.toISOString().split('T')[0]);
    const totalHrsWk = (weekShifts || []).reduce((s, r) => s + Number(r.hours_worked || 0), 0);

    setEl('kpi-emp-active',  active + '');
    setEl('kpi-emp-clocked', clockedIn + '');
    setEl('kpi-emp-hours',   Math.round(totalHrsWk) + '');
    setEl('kpi-emp-leave',   onLeave + '');

    // Floor presence %
    const floorPct = active ? Math.round((clockedIn / active) * 100) : 0;
    setEl('presence-pct', floorPct + '%');
    updatePresenceDonut(floorPct);

    // Dept headcount bars
    renderDeptBars(departments);

    // Shift tiles
    renderShiftTiles(departments, todayShifts);

    // Import history
    renderImportHistory(imports);

    // Employee table — merge with today's shift data
    const empWithShifts = employees.map(e => {
      const shift = todayShifts.find(s => s.employee_id === e.id);
      return { ...e, is_clocked_in: shift ? shift.is_clocked_in : false, shift_label: shift ? shift.shift_label : null };
    });
    renderEmpTableFromDB(empWithShifts);

    // Update headcount chart
    updateHeadcountChart(departments);

    // Real-time: employees table
    if (!_subs.employees) {
      _subs.employees = db.channel('rt-employees')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'employees' }, () => loadEmployees())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'shifts' },    () => loadEmployees())
        .subscribe();
    }

  } catch (err) {
    showError('Employees load failed: ' + err.message);
  }

  setLoading(['kpi-emp-active','kpi-emp-clocked','kpi-emp-hours','kpi-emp-leave'], false);
}

function updatePresenceDonut(pct) {
  const chart = Chart.getChart('presenceDonut');
  if (!chart) return;
  chart.data.datasets[0].data = [pct, 100 - pct];
  chart.update();
}

function updateHeadcountChart(departments) {
  const chart = Chart.getChart('headcountChart');
  if (!chart || !departments.length) return;
  chart.data.labels   = departments.map(d => d.department);
  chart.data.datasets[0].data = departments.map(d => d.active_count);
  chart.update();
}

function renderDeptBars(departments) {
  const container = $('dept-bars');
  if (!container || !departments.length) return;
  const COLORS = { Dyeing:'#388bfd', Shipping:'#3fb950', Finishing:'#a371f7', Office:'#d29922', Maintenance:'#f78166' };
  const max = Math.max(...departments.map(d => d.active_count), 1);
  container.innerHTML = departments.map((d, i) => {
    const color = COLORS[d.department] || '#888';
    const pct   = Math.round((d.active_count / max) * 100);
    const last  = i === departments.length - 1;
    return `<div style="display:flex;align-items:center;gap:10px;padding:7px 0;${last ? '' : 'border-bottom:1px solid var(--brd)'}">
      <span style="width:8px;height:8px;border-radius:50%;background:${color};flex-shrink:0;display:inline-block"></span>
      <span style="flex:1;font-size:12px">${d.department}</span>
      <div style="width:90px;height:5px;background:var(--brd);border-radius:3px;overflow:hidden">
        <div style="height:100%;width:${pct}%;background:${color};border-radius:3px"></div>
      </div>
      <span style="font-size:12px;color:var(--t2);width:18px;text-align:right">${d.active_count}</span>
    </div>`;
  }).join('');
}

function renderShiftTiles(departments, todayShifts) {
  const container = $('shift-tiles');
  if (!container) return;
  const COLORS = { Dyeing:'#388bfd', Shipping:'#3fb950', Finishing:'#a371f7', Office:'#d29922', Maintenance:'#f78166' };
  container.innerHTML = departments.map(d => {
    const clocked = todayShifts.filter(s => s.department === d.department && s.is_clocked_in).length;
    const color   = COLORS[d.department] || '#888';
    return `<div class="shift-tile">
      <div class="shift-dept" style="color:${color}">${d.department}</div>
      <div class="shift-count">${clocked}</div>
      <div class="shift-of">of ${d.active_count} active</div>
    </div>`;
  }).join('');
}

function renderImportHistory(imports) {
  const container = $('import-history');
  if (!container) return;
  const badgeCls = { completed:'badge-teal', partial:'badge-amber', failed:'badge-red', processing:'badge-blue' };
  container.innerHTML = imports.map(imp => `
    <div style="display:flex;align-items:center;gap:8px;padding:7px 10px;background:var(--surf);border:1px solid var(--brd);border-radius:var(--r);font-size:11px">
      <span style="font-family:var(--mono);color:var(--t1);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${imp.file_name}</span>
      <span style="color:var(--t2)">${imp.total_hours ? Math.round(imp.total_hours) + 'h' : ''}</span>
      <span class="badge ${badgeCls[imp.status] || 'badge-gray'}" style="font-size:10px">${imp.status}</span>
    </div>`).join('');
}

function renderEmpTableFromDB(employees) {
  const tbody = $('empTable');
  if (!tbody) return;
  const AV_COLORS  = ['#388bfd','#3fb950','#a371f7','#d29922','#f78166','#4ac6b7','#e06c75','#61afef'];
  const DEPT_CLR   = { Dyeing:'#388bfd', Shipping:'#3fb950', Finishing:'#a371f7', Office:'#d29922', Maintenance:'#f78166' };

  tbody.innerHTML = employees.map((e, i) => {
    const fullName   = (e.first_name + ' ' + e.last_name).trim();
    const init       = ((e.first_name||'')[0] + (e.last_name||'')[0]).toUpperCase();
    const shiftLbl   = e.shift_label || '—';
    const shiftBadge = shiftLbl.includes('A') ? 'badge-blue' : 'badge-purple';
    const statusBadge = e.status === 'active' ? 'badge-teal' : e.status === 'on_leave' ? 'badge-amber' : 'badge-gray';
    const statusLabel = e.status === 'on_leave' ? 'On leave' : e.status === 'inactive' ? 'Inactive' : 'Active';
    const hrsW        = Math.min(((e.hours_this_week || 0) / 40) * 100, 100);
    const dotColor    = e.is_clocked_in ? 'var(--teal)' : 'var(--t3)';
    const dotShadow   = e.is_clocked_in ? '0 0 5px rgba(63,185,80,.55)' : 'none';
    return `<tr>
      <td><div style="display:flex;align-items:center;gap:9px">
        <div class="avatar" style="background:${AV_COLORS[i % AV_COLORS.length]}">${init}</div>
        <div>
          <div style="font-weight:500;font-size:12.5px">${fullName}</div>
          <div style="font-size:11px;color:var(--t2);font-family:var(--mono)">${e.wasp_id} · ${e.job_title || ''}</div>
        </div>
      </div></td>
      <td><span style="display:flex;align-items:center;gap:6px">
        <span style="width:7px;height:7px;border-radius:50%;background:${DEPT_CLR[e.department]||'#888'};display:inline-block"></span>
        ${e.department}
      </span></td>
      <td><span class="badge ${shiftBadge}">${shiftLbl}</span></td>
      <td style="font-family:var(--mono);font-size:12px">$${Number(e.pay_rate||0).toFixed(2)}/hr</td>
      <td><div style="display:flex;align-items:center;gap:8px">
        <div style="width:60px;height:4px;background:var(--brd);border-radius:2px;overflow:hidden">
          <div style="height:100%;width:${hrsW}%;background:var(--blue);border-radius:2px"></div>
        </div>
        <span style="font-size:12px;color:var(--t2)">${e.hours_this_week || 0}h</span>
      </div></td>
      <td><span class="badge ${statusBadge}">${statusLabel}</span></td>
      <td><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${dotColor};box-shadow:${dotShadow}"></span></td>
    </tr>`;
  }).join('');
}

// ═══════════════════════════════════════════════════════════════════════════════
// COST STRUCTURE
// ═══════════════════════════════════════════════════════════════════════════════
async function loadCosts() {
  setLoading(['kpi-cost-total','kpi-cost-materials','kpi-cost-labor','kpi-cost-overhead'], true);

  try {
    const [runsRes, entriesRes] = await Promise.all([
      db.from('payroll_runs')
        .select('*')
        .order('imported_at', { ascending: false })
        .limit(20),

      db.from('payroll_entries')
        .select('department, gross_pay, regular_hours, overtime_hours, total_hours')
        .order('created_at', { ascending: false })
        .limit(100),
    ]);

    const runs    = runsRes.data    || [];
    const entries = entriesRes.data || [];

    const totalGross = entries.reduce((s, e) => s + Number(e.gross_pay    || 0), 0);
    const totalHours = entries.reduce((s, e) => s + Number(e.total_hours  || 0), 0);
    const otHours    = entries.reduce((s, e) => s + Number(e.overtime_hours || 0), 0);

    // Cost breakdown estimate
    const materials = totalGross * 0.38;  // 38% materials
    const labor     = totalGross * 0.45;  // 45% labor
    const overhead  = totalGross * 0.17;  // 17% overhead

    setEl('kpi-cost-total',     fmt$(totalGross));
    setEl('kpi-cost-materials', fmt$(materials));
    setEl('kpi-cost-labor',     fmt$(labor));
    setEl('kpi-cost-overhead',  fmt$(overhead));

    // Cost trend chart
    renderCostTrend(runs);

    // Cost breakdown table — use payroll entries
    renderCostTable(entries);

  } catch (err) {
    showError('Costs load failed: ' + err.message);
  }

  setLoading(['kpi-cost-total','kpi-cost-materials','kpi-cost-labor','kpi-cost-overhead'], false);
}

function renderCostTrend(runs) {
  const chart = Chart.getChart('costTrendChart');
  if (!chart || !runs.length) return;
  const sorted = [...runs].reverse();
  chart.data.labels = sorted.map((r, i) => i + 1);
  chart.data.datasets[0].data = sorted.map(r => Number(r.total_gross_pay || 0));
  chart.data.datasets[1].data = sorted.map(r => Number(r.total_hours || 0) * 22);
  chart.update();
}

function renderCostTable(entries) {
  const tbody = $('cost-table');
  if (!tbody) return;
  const depts    = [...new Set(entries.map(e => e.department))];
  const roleCls  = ['badge-purple','badge-teal','badge-red','badge-amber'];
  const roles    = ['Viewer','Editor','Admin','Manager'];
  const teamSets = [
    [['Workplace','badge-cyan'],['Infrastructure','badge-blue']],
    [['Product','badge-blue'],['Sales','badge-amber']],
    [['Dyeing','badge-blue']],
    [['Shipping','badge-teal'],['Finance','badge-purple']],
  ];
  tbody.innerHTML = entries.slice(0,8).map((e, i) => {
    const ri     = i % roles.length;
    const teams  = teamSets[i % teamSets.length];
    return `<tr>
      <td style="color:var(--t2);font-family:var(--mono)">${i}</td>
      <td><div style="display:flex;align-items:center;gap:8px">
        <div class="avatar" style="background:${['#388bfd','#3fb950','#a371f7','#d29922','#f78166','#e06c75','#61afef','#4ac6b7'][i % 8]}">${e.department.slice(0,2).toUpperCase()}</div>
        <div>
          <div style="font-weight:500">${e.department} Dept</div>
          <div style="font-size:11px;color:var(--t2)">${e.total_hours}h · ${e.department.toLowerCase()}@opsmaster.co</div>
        </div>
      </div></td>
      <td><span class="badge ${roleCls[ri]}">${roles[ri]}</span></td>
      <td style="color:var(--teal)">${e.overtime_hours > 0 ? '✓' : ''}</td>
      <td style="font-family:var(--mono);font-size:11px;color:var(--t2)">${new Date().toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' })}</td>
      <td>${teams.map(([name, cls]) => `<span class="badge ${cls}" style="margin-right:4px">${name}</span>`).join('')}</td>
    </tr>`;
  }).join('');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SHIPPING
// ═══════════════════════════════════════════════════════════════════════════════
async function loadShipping() {
  // Shipping data comes from your orders/shipping table.
  // Until that table exists, derive from payroll_entries by department.
  try {
    const { data: entries } = await db
      .from('payroll_entries')
      .select('wasp_id, department, gross_pay, total_hours, pay_period_end')
      .eq('department', 'Shipping')
      .order('created_at', { ascending: false })
      .limit(20);

    renderShippingTable(entries || []);

  } catch (err) {
    showError('Shipping load failed: ' + err.message);
  }
}

function renderShippingTable(entries) {
  const tbody = $('shipping-table');
  if (!tbody) return;
  const carriers = ['FedEx','UPS','DHL','USPS'];
  const dests    = ['Los Angeles, CA','San Diego, CA','Phoenix, AZ','Las Vegas, NV','Riverside, CA'];
  const stats    = [['In Transit','badge-teal'],['Processing','badge-blue'],['Delayed','badge-red'],['Pending Pickup','badge-amber']];
  tbody.innerHTML = entries.slice(0,8).map((e, i) => {
    const [sl, sc] = stats[i % stats.length];
    const eta = new Date(Date.now() + (i+1) * 86400000).toLocaleDateString('en-US', { month:'short', day:'numeric' });
    return `<tr>
      <td style="font-family:var(--mono);color:var(--t2)">#SH-${String(e.wasp_id).padStart(4,'0')}</td>
      <td>${e.department}</td>
      <td>${carriers[i % carriers.length]}</td>
      <td>${dests[i % dests.length]}</td>
      <td style="text-align:right;font-family:var(--mono)">${Math.round(e.total_hours * 18.5)} lbs</td>
      <td style="font-family:var(--mono)">${eta}</td>
      <td><span class="badge ${sc}">${sl}</span></td>
    </tr>`;
  }).join('');
}

// ═══════════════════════════════════════════════════════════════════════════════
// CSV FILE UPLOAD HANDLER
// ═══════════════════════════════════════════════════════════════════════════════
async function handleCsvUpload(file, screen) {
  if (!file || !file.name.endsWith('.csv')) {
    showUploadStatus(screen, 'error', 'Please select a .csv file.');
    return;
  }

  showUploadStatus(screen, 'loading', 'Uploading ' + file.name + '...');

  try {
    // Upload to Supabase Storage
    const path = `payroll-imports/${Date.now()}-${file.name}`;
    const { error: upErr } = await db.storage
      .from('payroll-csvs')
      .upload(path, file, { cacheControl: '3600', upsert: false });

    if (upErr) throw new Error('Upload failed: ' + upErr.message);

    // Create a payroll_run record for tracking
    const { error: runErr } = await db.from('payroll_runs').insert({
      file_name: file.name,
      status:    'processing',
      notes:     'Uploaded via dashboard — pending server-side processing',
    });

    if (runErr) throw new Error('Run record failed: ' + runErr.message);

    showUploadStatus(screen, 'success', file.name + ' uploaded. Importer will process shortly.');

    // Refresh import history after a short delay
    setTimeout(() => {
      if (screen === 'energy') loadEnergy();
      if (screen === 'employees') loadEmployees();
    }, 2000);

  } catch (err) {
    showUploadStatus(screen, 'error', err.message);
  }
}

function showUploadStatus(screen, type, msg) {
  const id  = screen + '-upload-status';
  let el    = $(id);
  if (!el) {
    el = document.createElement('div');
    el.id = id;
    const zone = document.querySelector('#screen-' + screen + ' .import-zone');
    if (zone) zone.parentNode.insertBefore(el, zone.nextSibling);
  }
  const colors = { success: ['var(--teal2)','var(--teal)'], error: ['var(--red2)','var(--red)'], loading: ['var(--blue2)','var(--blue)'] };
  const [bg, color] = colors[type] || colors.loading;
  el.style.cssText = `margin-top:10px;padding:8px 12px;border-radius:6px;font-size:12px;background:${bg};color:${color};border:1px solid ${color}33`;
  el.textContent = msg;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN SCREEN LOADER — called by nav() after charts are built
// ═══════════════════════════════════════════════════════════════════════════════
const LOADERS = {
  master:    loadMasterDash,
  orders:    loadOrders,
  energy:    loadEnergy,
  employees: loadEmployees,
  costs:     loadCosts,
  shipping:  loadShipping,
};

async function loadScreen(screen) {
  const loader = LOADERS[screen];
  if (loader) await loader();
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORT: expose to opsmaster.html
// ═══════════════════════════════════════════════════════════════════════════════
window.OPS = {
  loadScreen,
  handleCsvUpload,
  db,              // expose db client for ad-hoc queries
};

import { useState } from "react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend, ComposedChart, Area } from "recharts";

const C = {
  bg: "#f4f5f7",
  card: "#ffffff",
  cardAlt: "#f9fafb",
  border: "#e0e3eb",
  borderLight: "#eceef4",
  text: "#111827",
  textMid: "#374151",
  textMuted: "#6b7280",
  textFaint: "#9ca3af",
  accent: "#1e40af",
  accentMid: "#2563eb",
  accentBg: "rgba(30,64,175,0.06)",
  accentBorder: "rgba(30,64,175,0.15)",
  green: "#047857",
  greenBg: "rgba(4,120,87,0.06)",
  red: "#b91c1c",
  redBg: "rgba(185,28,28,0.06)",
  amber: "#92400e",
  amberBg: "rgba(146,64,14,0.06)",
  blue: "#1d4ed8",
  slate: "#475569",
  navy: "#1e293b",
};

const FONT = "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif";

const historicalData = [
  { month: "Oct", expenses: 142300, budget: 150000, orders: 89, revenue: 312000 },
  { month: "Nov", expenses: 158700, budget: 150000, orders: 102, revenue: 345000 },
  { month: "Dec", expenses: 134200, budget: 145000, orders: 78, revenue: 278000 },
  { month: "Jan", expenses: 161400, budget: 155000, orders: 95, revenue: 328000 },
  { month: "Feb", expenses: 147800, budget: 155000, orders: 88, revenue: 301000 },
  { month: "Mar", expenses: 153600, budget: 160000, orders: 104, revenue: 367000 },
];

const categoryData = [
  { name: "Raw Materials", spent: 62400, budget: 68000, color: C.accent },
  { name: "Dye Chemicals", spent: 31200, budget: 28000, color: C.red },
  { name: "Labor & Payroll", spent: 28900, budget: 30000, color: C.green },
  { name: "Energy & Utilities", spent: 15800, budget: 16000, color: C.amber },
  { name: "Shipping & Freight", spent: 8400, budget: 10000, color: "#0369a1" },
  { name: "Maintenance", spent: 6900, budget: 8000, color: C.slate },
];

const weeklyData = [
  { week: "Week 1", actual: 36200, target: 36900 },
  { week: "Week 2", actual: 41300, target: 36900 },
  { week: "Week 3", actual: 38700, target: 36900 },
  { week: "Week 4", actual: 37400, target: 36900 },
];

const forecastData = [
  ...historicalData,
  { month: "Apr", expenses: null, budget: 160000, forecast: 156800 },
  { month: "May", expenses: null, budget: 160000, forecast: 159200 },
  { month: "Jun", expenses: null, budget: 165000, forecast: 162400 },
];

const calendarEvents = [
  { date: 3, type: "payment", label: "Vendor Payment — Pacific Textiles" },
  { date: 5, type: "order", label: "PO #8842 — Dye Chemicals Restock" },
  { date: 7, type: "payroll", label: "Bi-Weekly Payroll Run" },
  { date: 10, type: "review", label: "Q2 Budget Review Meeting" },
  { date: 12, type: "payment", label: "SoCal Edison — Utility Payment" },
  { date: 14, type: "order", label: "Greige Fabric Delivery — #4590" },
  { date: 15, type: "review", label: "Monthly Budget Reconciliation" },
  { date: 18, type: "payment", label: "FedEx Freight — Invoice Due" },
  { date: 21, type: "payroll", label: "Bi-Weekly Payroll Run" },
  { date: 22, type: "order", label: "Customer Shipment — Ross Stores" },
  { date: 25, type: "maintenance", label: "Scheduled Maintenance — Line 3" },
  { date: 28, type: "review", label: "Month-End Expense Report Deadline" },
  { date: 30, type: "order", label: "PO #8901 — Finishing Chemicals" },
];

const eventTypes = {
  payment:     { label: "Payment",     color: C.red,    bg: C.redBg },
  order:       { label: "Order",       color: C.accent, bg: C.accentBg },
  payroll:     { label: "Payroll",     color: C.green,  bg: C.greenBg },
  review:      { label: "Review",      color: C.amber,  bg: C.amberBg },
  maintenance: { label: "Maintenance", color: C.slate,  bg: "rgba(71,85,105,0.06)" },
};

function fmt(n) {
  if (n == null) return "\u2014";
  if (n >= 1000000) return "$" + (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return "$" + (n / 1000).toFixed(1) + "K";
  return "$" + n.toFixed(0);
}
function pct(n) { return (n * 100).toFixed(1) + "%"; }

function KpiCard({ title, value, subtitle, badge, badgeType }) {
  const badgeColor = badgeType === "positive" ? C.green : badgeType === "negative" ? C.red : C.amber;
  const badgeBg = badgeType === "positive" ? C.greenBg : badgeType === "negative" ? C.redBg : C.amberBg;
  return (
    <div style={{ background: C.card, borderRadius: 10, padding: "18px 20px", border: `1px solid ${C.border}`, flex: 1, minWidth: 175 }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: C.textMuted, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color: C.text, letterSpacing: -0.5, marginBottom: 6, fontVariantNumeric: "tabular-nums" }}>{value}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {badge && <span style={{ fontSize: 10, fontWeight: 600, color: badgeColor, background: badgeBg, padding: "2px 8px", borderRadius: 4, letterSpacing: 0.2 }}>{badge}</span>}
        <span style={{ color: C.textFaint, fontSize: 11 }}>{subtitle}</span>
      </div>
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <h2 style={{ fontSize: 13, fontWeight: 700, color: C.textMid, margin: "28px 0 12px", textTransform: "uppercase", letterSpacing: 0.8 }}>{children}</h2>
  );
}

function Calendar({ year, month, events, selectedDate, onSelectDate }) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
  const dayNames = ["S", "M", "T", "W", "T", "F", "S"];
  const monthName = new Date(year, month).toLocaleString("default", { month: "long", year: "numeric" });

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const eventsByDate = {};
  events.forEach(e => { if (!eventsByDate[e.date]) eventsByDate[e.date] = []; eventsByDate[e.date].push(e); });

  return (
    <div style={{ background: C.card, borderRadius: 10, border: `1px solid ${C.border}`, overflow: "hidden" }}>
      <div style={{ padding: "20px 24px 14px", borderBottom: `1px solid ${C.borderLight}`, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: C.text, letterSpacing: -0.2 }}>{monthName}</div>
        <div style={{ fontSize: 11, color: C.textFaint }}>Select a date to view details</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", padding: "14px 20px 4px" }}>
        {dayNames.map((d, i) => (
          <div key={i} style={{ textAlign: "center", fontSize: 10, fontWeight: 700, color: C.textFaint, textTransform: "uppercase", letterSpacing: 1, padding: "6px 0" }}>{d}</div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", padding: "2px 20px 20px", gap: 2 }}>
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const dayEvts = eventsByDate[day] || [];
          const isToday = isCurrentMonth && today.getDate() === day;
          const isSel = selectedDate === day;
          const hasEvts = dayEvts.length > 0;
          return (
            <div key={i} onClick={() => hasEvts && onSelectDate(day === selectedDate ? null : day)} style={{
              textAlign: "center", padding: "10px 2px 14px", borderRadius: 8,
              cursor: hasEvts ? "pointer" : "default", transition: "all 0.12s",
              background: isSel ? C.accentBg : isToday ? C.cardAlt : "transparent",
              border: isSel ? `1.5px solid ${C.accentBorder}` : isToday ? `1.5px solid ${C.borderLight}` : "1.5px solid transparent",
            }}>
              <div style={{
                fontSize: 14, fontWeight: isToday || isSel ? 700 : 400,
                color: isSel ? C.accent : isToday ? C.accent : hasEvts ? C.text : C.textFaint,
              }}>{day}</div>
              {hasEvts && (
                <div style={{ display: "flex", justifyContent: "center", gap: 3, marginTop: 5 }}>
                  {dayEvts.slice(0, 3).map((ev, j) => (
                    <div key={j} style={{ width: 5, height: 5, borderRadius: "50%", background: eventTypes[ev.type]?.color || C.textFaint }} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {selectedDate && eventsByDate[selectedDate] && (
        <div style={{ borderTop: `1px solid ${C.borderLight}`, padding: "16px 24px 20px", background: C.cardAlt }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>
            April {selectedDate} — {eventsByDate[selectedDate].length} scheduled {eventsByDate[selectedDate].length === 1 ? "item" : "items"}
          </div>
          {eventsByDate[selectedDate].map((ev, i) => {
            const t = eventTypes[ev.type];
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: C.card, borderRadius: 8, marginBottom: 6, borderLeft: `3px solid ${t?.color || C.border}` }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{ev.label}</div>
                  <div style={{ fontSize: 10, color: C.textMuted, marginTop: 1, textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 600 }}>{t?.label}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function UpcomingList({ events }) {
  const upcoming = [...events].sort((a, b) => a.date - b.date).slice(0, 8);
  return (
    <div style={{ background: C.card, borderRadius: 10, border: `1px solid ${C.border}`, overflow: "hidden" }}>
      <div style={{ padding: "16px 20px 12px", borderBottom: `1px solid ${C.borderLight}` }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.text, textTransform: "uppercase", letterSpacing: 0.5 }}>Upcoming</div>
      </div>
      <div style={{ padding: "6px 12px 12px" }}>
        {upcoming.map((ev, i) => {
          const t = eventTypes[ev.type];
          return (
            <div key={i} style={{ display: "flex", gap: 12, padding: "10px 8px", borderBottom: i < upcoming.length - 1 ? `1px solid ${C.borderLight}` : "none" }}>
              <div style={{
                width: 38, height: 38, borderRadius: 6, display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center", flexShrink: 0,
                background: t?.bg || C.cardAlt, border: `1px solid ${C.borderLight}`,
              }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: t?.color || C.text, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{ev.date}</div>
                <div style={{ fontSize: 7, fontWeight: 700, color: C.textFaint, textTransform: "uppercase", letterSpacing: 0.5, marginTop: 1 }}>Apr</div>
              </div>
              <div style={{ minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{ev.label}</div>
                <div style={{ fontSize: 10, color: C.textFaint, marginTop: 2, textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 600 }}>{t?.label}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EventLegend() {
  return (
    <div style={{ background: C.card, borderRadius: 10, border: `1px solid ${C.border}`, padding: "14px 18px", display: "flex", flexWrap: "wrap", gap: 16 }}>
      {Object.entries(eventTypes).map(([key, t]) => (
        <div key={key} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11, color: C.textMid, fontWeight: 500 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: t.color, flexShrink: 0 }} />
          {t.label}
        </div>
      ))}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 14px", fontSize: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.06)" }}>
      <div style={{ fontWeight: 700, marginBottom: 4, color: C.text }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, display: "flex", gap: 12, justifyContent: "space-between", marginTop: 2 }}>
          <span style={{ color: C.textMid }}>{p.name}</span><span style={{ fontWeight: 600 }}>{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

export default function BudgetDashboard() {
  const [page, setPage] = useState("calendar");
  const [selectedDate, setSelectedDate] = useState(null);
  const [analyticsTab, setAnalyticsTab] = useState("trends");

  const cur = historicalData[historicalData.length - 1];
  const prev = historicalData[historicalData.length - 2];
  const momChange = (cur.expenses - prev.expenses) / prev.expenses;
  const budgetUtil = cur.expenses / cur.budget;
  const budgetRemaining = cur.budget - cur.expenses;
  const costRevRatio = cur.expenses / cur.revenue;
  const weeklyRate = cur.expenses / 4.33;
  const projectedEnd = (cur.expenses / 25) * 31;

  return (
    <div style={{ fontFamily: FONT, background: C.bg, color: C.text, minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ background: C.card, borderBottom: `1px solid ${C.border}`, padding: "0 28px", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 10, height: 56 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 28, height: 28, borderRadius: 6, background: C.navy, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 10, fontWeight: 800, letterSpacing: 0.5 }}>CF</div>
          <div style={{ borderLeft: `1px solid ${C.borderLight}`, paddingLeft: 14, height: 28, display: "flex", alignItems: "center" }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: C.text, letterSpacing: -0.2 }}>Budget Dashboard</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
          {[{ id: "calendar", label: "Calendar" }, { id: "analytics", label: "Analytics" }].map((p, i) => (
            <button key={p.id} onClick={() => setPage(p.id)} style={{
              padding: "0 20px", height: 56, border: "none", cursor: "pointer",
              fontSize: 12, fontWeight: 600, transition: "all 0.15s", background: "transparent",
              color: page === p.id ? C.accent : C.textMuted,
              borderBottom: page === p.id ? `2px solid ${C.accent}` : "2px solid transparent",
              letterSpacing: 0.2,
            }}>{p.label}</button>
          ))}
        </div>
        <div style={{ fontSize: 11, color: C.textFaint }}>Anaheim Plant</div>
      </div>

      <div style={{ padding: "24px 28px 48px", maxWidth: 1180, margin: "0 auto" }}>

        {/* CALENDAR PAGE */}
        {page === "calendar" && (
          <>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 8 }}>
              <KpiCard title="Month-to-Date" value={fmt(cur.expenses)} subtitle="vs prior month" badge={pct(Math.abs(momChange)) + (momChange > 0 ? " up" : " down")} badgeType={momChange > 0 ? "negative" : "positive"} />
              <KpiCard title="Budget Remaining" value={fmt(budgetRemaining)} subtitle={"of " + fmt(cur.budget) + " target"} badge={budgetUtil > 0.95 ? "At Risk" : budgetUtil > 0.8 ? "Monitor" : "On Track"} badgeType={budgetUtil > 0.95 ? "negative" : budgetUtil > 0.8 ? "neutral" : "positive"} />
              <KpiCard title="Cost-to-Revenue" value={pct(costRevRatio)} subtitle="operating efficiency" badge={costRevRatio < 0.45 ? "Favorable" : "Elevated"} badgeType={costRevRatio < 0.45 ? "positive" : "negative"} />
              <KpiCard title="Weekly Run Rate" value={fmt(weeklyRate)} subtitle="based on MTD spend" badge={"~" + fmt(weeklyRate * 4.33) + " projected"} badgeType="neutral" />
            </div>

            <SectionLabel>April 2026</SectionLabel>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 16, alignItems: "start" }}>
              <div>
                <Calendar year={2026} month={3} events={calendarEvents} selectedDate={selectedDate} onSelectDate={setSelectedDate} />
                <div style={{ marginTop: 12 }}><EventLegend /></div>
              </div>
              <UpcomingList events={calendarEvents} />
            </div>
          </>
        )}

        {/* ANALYTICS PAGE */}
        {page === "analytics" && (
          <>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 8 }}>
              <KpiCard title="Month-to-Date" value={fmt(cur.expenses)} subtitle="March total" badge={pct(Math.abs(momChange)) + (momChange > 0 ? " up" : " down")} badgeType={momChange > 0 ? "negative" : "positive"} />
              <KpiCard title="Projected Month-End" value={fmt(projectedEnd)} subtitle="linear projection" badge={projectedEnd > cur.budget ? "Over Budget" : "On Track"} badgeType={projectedEnd > cur.budget ? "negative" : "positive"} />
              <KpiCard title="3-Month Average" value={fmt((historicalData.slice(-3).reduce((s, d) => s + d.expenses, 0)) / 3)} subtitle="rolling baseline" badge="Baseline" badgeType="neutral" />
              <KpiCard title="Cost-to-Revenue" value={pct(costRevRatio)} subtitle="operating efficiency" badge={costRevRatio < 0.45 ? "Favorable" : "Elevated"} badgeType={costRevRatio < 0.45 ? "positive" : "negative"} />
            </div>

            <div style={{ display: "flex", gap: 2, marginTop: 24, marginBottom: 24, borderBottom: `1px solid ${C.border}` }}>
              {[{ id: "trends", label: "Spending Trends" }, { id: "categories", label: "Categories" }, { id: "forecast", label: "Forecast" }, { id: "weekly", label: "Weekly" }].map(t => (
                <button key={t.id} onClick={() => setAnalyticsTab(t.id)} style={{
                  padding: "10px 20px", border: "none", cursor: "pointer",
                  fontSize: 12, fontWeight: 600, transition: "all 0.12s", background: "transparent",
                  color: analyticsTab === t.id ? C.accent : C.textMuted,
                  borderBottom: analyticsTab === t.id ? `2px solid ${C.accent}` : "2px solid transparent",
                  marginBottom: -1, letterSpacing: 0.2,
                }}>{t.label}</button>
              ))}
            </div>

            {analyticsTab === "trends" && (
              <>
                <SectionLabel>Spending vs Budget — 6 Months</SectionLabel>
                <div style={{ background: C.card, borderRadius: 10, border: `1px solid ${C.border}`, padding: "20px 16px 10px" }}>
                  <ResponsiveContainer width="100%" height={300}>
                    <ComposedChart data={historicalData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={C.borderLight} />
                      <XAxis dataKey="month" tick={{ fill: C.textMuted, fontSize: 11 }} axisLine={{ stroke: C.border }} />
                      <YAxis tick={{ fill: C.textMuted, fontSize: 10 }} axisLine={{ stroke: C.border }} tickFormatter={v => fmt(v)} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="budget" fill={C.accentBg} stroke="none" />
                      <Line type="monotone" dataKey="budget" stroke={C.accent} strokeWidth={1.5} strokeDasharray="6 4" dot={false} name="Budget Target" />
                      <Bar dataKey="expenses" radius={[4, 4, 0, 0]} name="Actual Spend" barSize={34}>
                        {historicalData.map((e, i) => <Cell key={i} fill={e.expenses > e.budget ? C.red : C.green} fillOpacity={0.7} />)}
                      </Bar>
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
                <SectionLabel>Revenue vs Expenses</SectionLabel>
                <div style={{ background: C.card, borderRadius: 10, border: `1px solid ${C.border}`, padding: "20px 16px 10px" }}>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={historicalData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={C.borderLight} />
                      <XAxis dataKey="month" tick={{ fill: C.textMuted, fontSize: 11 }} axisLine={{ stroke: C.border }} />
                      <YAxis tick={{ fill: C.textMuted, fontSize: 10 }} axisLine={{ stroke: C.border }} tickFormatter={v => fmt(v)} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="revenue" fill={C.blue} radius={[4, 4, 0, 0]} name="Revenue" fillOpacity={0.6} barSize={28} />
                      <Bar dataKey="expenses" fill={C.slate} radius={[4, 4, 0, 0]} name="Expenses" fillOpacity={0.6} barSize={28} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}

            {analyticsTab === "categories" && (
              <>
                <SectionLabel>Budget Utilization by Category — March 2026</SectionLabel>
                {categoryData.map((cat, i) => {
                  const pctUsed = cat.spent / cat.budget; const over = pctUsed > 1;
                  return (
                    <div key={i} style={{ background: C.card, borderRadius: 8, border: `1px solid ${C.border}`, padding: "14px 18px", marginBottom: 8 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <div>
                          <span style={{ fontWeight: 600, fontSize: 13, color: C.text }}>{cat.name}</span>
                          <span style={{ color: C.textFaint, fontSize: 11, marginLeft: 12 }}>{fmt(cat.spent)} of {fmt(cat.budget)}</span>
                        </div>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4, letterSpacing: 0.3, color: over ? C.red : pctUsed > 0.85 ? C.amber : C.green, background: over ? C.redBg : pctUsed > 0.85 ? C.amberBg : C.greenBg }}>{pct(pctUsed)}</span>
                      </div>
                      <div style={{ height: 6, background: C.cardAlt, borderRadius: 3, overflow: "hidden", border: `1px solid ${C.borderLight}` }}>
                        <div style={{ height: "100%", borderRadius: 3, width: pct(Math.min(pctUsed, 1)), background: over ? C.red : pctUsed > 0.85 ? C.amber : cat.color, opacity: 0.7, transition: "width 0.4s ease" }} />
                      </div>
                    </div>
                  );
                })}
                <SectionLabel>Expense Distribution</SectionLabel>
                <div style={{ background: C.card, borderRadius: 10, border: `1px solid ${C.border}`, padding: 16 }}>
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart><Pie data={categoryData} dataKey="spent" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={95} paddingAngle={2} strokeWidth={0}>{categoryData.map((e, i) => <Cell key={i} fill={e.color} fillOpacity={0.7} />)}</Pie><Tooltip formatter={v => fmt(v)} contentStyle={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12 }} /><Legend iconType="circle" wrapperStyle={{ fontSize: 11, color: C.textMid }} /></PieChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}

            {analyticsTab === "forecast" && (
              <>
                <SectionLabel>Historical + 3-Month Forecast</SectionLabel>
                <div style={{ background: C.card, borderRadius: 10, border: `1px solid ${C.border}`, padding: "20px 16px 10px" }}>
                  <ResponsiveContainer width="100%" height={320}>
                    <ComposedChart data={forecastData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={C.borderLight} />
                      <XAxis dataKey="month" tick={{ fill: C.textMuted, fontSize: 11 }} axisLine={{ stroke: C.border }} />
                      <YAxis tick={{ fill: C.textMuted, fontSize: 10 }} axisLine={{ stroke: C.border }} tickFormatter={v => fmt(v)} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="budget" fill={C.accentBg} stroke="none" />
                      <Line type="monotone" dataKey="budget" stroke={C.accent} strokeWidth={1.5} strokeDasharray="6 4" dot={false} name="Budget Target" />
                      <Line type="monotone" dataKey="expenses" stroke={C.green} strokeWidth={2} dot={{ r: 3, fill: C.green }} name="Actual" connectNulls={false} />
                      <Line type="monotone" dataKey="forecast" stroke={C.amber} strokeWidth={2} strokeDasharray="8 4" dot={{ r: 3, fill: C.amber, strokeDasharray: "none" }} name="Forecast" connectNulls={false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                  <div style={{ display: "flex", gap: 24, justifyContent: "center", padding: "8px 0 4px" }}>
                    {[{ label: "Actual", color: C.green, dash: false }, { label: "Forecast", color: C.amber, dash: true }, { label: "Budget Target", color: C.accent, dash: true }].map(l => (
                      <span key={l.label} style={{ fontSize: 10, color: C.textMuted, display: "flex", alignItems: "center", gap: 6, fontWeight: 500 }}>
                        <span style={{ width: 16, height: 2, background: l.color, display: "inline-block", borderTop: l.dash ? `2px dashed ${l.color}` : "none" }} />{l.label}
                      </span>
                    ))}
                  </div>
                </div>
              </>
            )}

            {analyticsTab === "weekly" && (
              <>
                <SectionLabel>Weekly Spending vs Target — March 2026</SectionLabel>
                <div style={{ background: C.card, borderRadius: 10, border: `1px solid ${C.border}`, padding: "20px 16px 10px" }}>
                  <ResponsiveContainer width="100%" height={260}>
                    <ComposedChart data={weeklyData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={C.borderLight} />
                      <XAxis dataKey="week" tick={{ fill: C.textMuted, fontSize: 11 }} axisLine={{ stroke: C.border }} />
                      <YAxis tick={{ fill: C.textMuted, fontSize: 10 }} axisLine={{ stroke: C.border }} tickFormatter={v => fmt(v)} />
                      <Tooltip content={<CustomTooltip />} />
                      <Line type="monotone" dataKey="target" stroke={C.accent} strokeWidth={1.5} strokeDasharray="6 4" dot={false} name="Target" />
                      <Bar dataKey="actual" radius={[4, 4, 0, 0]} name="Actual" barSize={40}>{weeklyData.map((e, i) => <Cell key={i} fill={e.actual > e.target ? C.red : C.green} fillOpacity={0.65} />)}</Bar>
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
                <SectionLabel>Weekly Detail</SectionLabel>
                <div style={{ background: C.card, borderRadius: 10, border: `1px solid ${C.border}`, overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead><tr style={{ borderBottom: `1px solid ${C.border}` }}>{["Period", "Actual", "Target", "Variance", "Status"].map(h => (
                      <th key={h} style={{ padding: "11px 16px", textAlign: "left", color: C.textMuted, fontWeight: 600, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.8, background: C.cardAlt }}>{h}</th>
                    ))}</tr></thead>
                    <tbody>{weeklyData.map((w, i) => { const v = w.target - w.actual; const over = v < 0; return (
                      <tr key={i} style={{ borderBottom: `1px solid ${C.borderLight}` }}>
                        <td style={{ padding: "11px 16px", fontWeight: 600, color: C.text }}>{w.week}</td>
                        <td style={{ padding: "11px 16px", fontVariantNumeric: "tabular-nums" }}>{fmt(w.actual)}</td>
                        <td style={{ padding: "11px 16px", color: C.textFaint, fontVariantNumeric: "tabular-nums" }}>{fmt(w.target)}</td>
                        <td style={{ padding: "11px 16px", color: over ? C.red : C.green, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{over ? "-" : "+"}{fmt(Math.abs(v))}</td>
                        <td style={{ padding: "11px 16px" }}><span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4, color: over ? C.red : C.green, background: over ? C.redBg : C.greenBg, letterSpacing: 0.3 }}>{over ? "OVER" : "UNDER"}</span></td>
                      </tr>); })}</tbody>
                  </table>
                </div>
              </>
            )}
          </>
        )}

        <div style={{ marginTop: 36, padding: "14px 0", borderTop: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", color: C.textFaint, fontSize: 10, letterSpacing: 0.3 }}>
          <span>Color Fashion Inc. — Anaheim Plant — Budget Operations</span>
          <span>Sample data — connect QuickBooks export to populate</span>
        </div>
      </div>
    </div>
  );
}

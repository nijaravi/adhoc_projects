/* ============================================================
   Intelligence Platform — Dashboard Controller
   ============================================================ */

const CONFIG = {
  refreshIntervalMs: 5 * 60 * 1000,    // 5 minutes
  tickIntervalMs: 1000,                // 1 second for clocks/countdowns
  retryDelayMinutes: 30,
};

const STATE = {
  data: null,
  lastFetch: null,
  nextRefresh: null,
};

/* ────────────── ICONS (inline SVG) ────────────── */
const ICONS = {
  completed: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
  running:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>`,
  pending:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><line x1="12" y1="7" x2="12" y2="12"/><line x1="12" y1="12" x2="15" y2="14"/></svg>`,
  failed:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
  retry:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10"/><path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14"/></svg>`,
  eta:       `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 15"/></svg>`,
};

/* ────────────── UTILITIES ────────────── */
function parseTs(s) {
  if (!s) return null;
  // "2026-05-12 20:00:00" → ISO local
  return new Date(s.replace(' ', 'T'));
}

function fmtTime(date) {
  if (!date) return '—';
  return date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function fmtDate(date) {
  const d = date.getDate().toString().padStart(2, '0');
  const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  return `${d} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

function fmtClockTime(date) {
  return date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

function fmtDuration(seconds) {
  const abs = Math.abs(Math.floor(seconds));
  const m = Math.floor(abs / 60);
  const s = abs % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/* ────────────── DATA LOADING ────────────── */
/* We load dashboard_data.js by injecting a <script> tag with a cache-buster.
   This works on both http:// and file:// (fetch() is blocked on file://).
   The script defines window.DASHBOARD_DATA which we then consume. */
function loadDataScript() {
  return new Promise((resolve, reject) => {
    const url = `dashboard_data.js?t=${Date.now()}`;
    const tag = document.createElement('script');
    tag.src = url;
    tag.onload = () => { tag.remove(); resolve(); };
    tag.onerror = (e) => { tag.remove(); reject(e); };
    document.head.appendChild(tag);
  });
}

async function fetchData() {
  try {
    await loadDataScript();
    const raw = window.DASHBOARD_DATA;
    if (!raw) throw new Error('window.DASHBOARD_DATA not defined in dashboard_data.js');
    // Use timestamps exactly as supplied by the data file. Your producer
    // is responsible for writing current/correct timestamps; the dashboard
    // never silently shifts them. Likewise, statuses are taken verbatim —
    // we never infer or fall back to a default status string.
    STATE.data = raw;
    STATE.lastFetch = new Date();
    STATE.nextRefresh = new Date(Date.now() + CONFIG.refreshIntervalMs);
    setSystemStatus('nominal', 'SYSTEM NOMINAL');
    render();
  } catch (err) {
    console.error('[ACE] Failed to load dashboard_data.js:', err);
    setSystemStatus('alert', 'DATA SYNC ERROR');
  }
}

/* ────────────── RENDER ────────────── */
function render() {
  if (!STATE.data) return;
  // Derive summary from the actual DAG arrays so it can never drift from
  // the cards below. The JSON's `summary` field (if present) is ignored —
  // counts are always recomputed from ground truth.
  const summary = computeSummary(STATE.data);
  renderKpis(summary);
  renderZone('consumption', STATE.data.ace_consumption);
  renderZone('analytics', STATE.data.ace_analytics);
  renderTicker();
  updateRefreshMeta();
}

function computeSummary(data) {
  const all = [...(data.ace_consumption || []), ...(data.ace_analytics || [])];
  const counts = {
    completed:  0,   // SUCCESS
    running:    0,   // RUNNING
    pending:    0,   // NOT_STARTED + QUEUED  (states that will run)
    failed:     0,   // FAILED                (true failures — operator action required)
    reschedule: 0,   // UP_FOR_RESCHEDULE
  };
  // Statuses intentionally NOT counted in KPIs:
  //   UPSTREAM_FAILED / SKIPPED / REMOVED — visible on the card, but
  //   they're not "pending work" so don't pollute the headline counts.
  for (const d of all) {
    switch (d.status) {
      case 'SUCCESS':            counts.completed++;  break;
      case 'RUNNING':            counts.running++;    break;
      case 'FAILED':             counts.failed++;     break;
      case 'UP_FOR_RESCHEDULE':  counts.reschedule++; break;
      case 'NOT_STARTED':        counts.pending++;    break;
      case 'QUEUED':             counts.pending++;    break;
    }
  }
  return { ...counts, overall_eta_minutes: computeOverallEta(data) };
}

/* Parallel-aware ETA. Models three independent paths and returns the longest:
   1. Running DAGs: remaining time on the slowest currently-running job.
   2. Reschedule queue: retry delay (30m) + runtime of slowest waiting job.
   3. Pending wave: assumes ace_consumption pending DAGs run in parallel
      (max of their runtimes), then ace_analytics pending DAGs run in parallel
      after consumption finishes (their max added on top).
   The dashboard finishes when the slowest of these three paths finishes. */
function computeOverallEta(data) {
  const now = Date.now();
  const consumption = data.ace_consumption || [];
  const analytics   = data.ace_analytics || [];

  // ── Path 1: running, take the slowest remaining time
  let runningRemaining = 0;
  for (const d of [...consumption, ...analytics]) {
    if (d.status !== 'RUNNING' || !d.start_time) continue;
    const start = parseTs(d.start_time);
    if (!start) continue;
    const elapsedMin = (now - start.getTime()) / 60000;
    const remaining = Math.max(0, (d.avg_runtime_minutes || 0) - elapsedMin);
    if (remaining > runningRemaining) runningRemaining = remaining;
  }

  // ── Path 2: reschedule queue — retry delay + runtime, take the slowest
  let rescheduleRemaining = 0;
  for (const d of [...consumption, ...analytics]) {
    if (d.status !== 'UP_FOR_RESCHEDULE' || !d.start_time) continue;
    const start = parseTs(d.start_time);
    if (!start) continue;
    const retryAtMin = Math.max(0,
      (start.getTime() + CONFIG.retryDelayMinutes * 60000 - now) / 60000);
    const total = retryAtMin + (d.avg_runtime_minutes || 0);
    if (total > rescheduleRemaining) rescheduleRemaining = total;
  }

  // ── Path 3: pending wave — consumption pending in parallel, then analytics
  // We assume infinite worker concurrency (best-case parallelism within zone).
  // If consumption has any pending, analytics waiters can't start until it's done.
  const consumptionPending = consumption.filter(isPending);
  const analyticsPending   = analytics.filter(isPending);

  const consumptionWaveMin = consumptionPending.length
    ? Math.max(...consumptionPending.map(d => d.avg_runtime_minutes || 0))
    : 0;
  const analyticsWaveMin = analyticsPending.length
    ? Math.max(...analyticsPending.map(d => d.avg_runtime_minutes || 0))
    : 0;

  // Analytics waiters that depend on consumption add on top; analytics
  // that are merely NOT_STARTED (independent) can run in parallel with
  // consumption, so they're already absorbed into consumptionWaveMin via max.
  const pendingPath = consumption.some(d => d.status === 'RUNNING' || isPending(d))
    ? consumptionWaveMin + analyticsWaveMin
    : analyticsWaveMin;

  const overallMin = Math.max(runningRemaining, rescheduleRemaining, pendingPath);
  return Math.round(overallMin);
}

function isPending(dag) {
  // "Pending" for ETA purposes = states that will eventually run this batch.
  // UPSTREAM_FAILED / SKIPPED / REMOVED won't run, so they're excluded.
  return dag.status === 'NOT_STARTED' || dag.status === 'QUEUED';
}

function renderKpis(summary) {
  const bar = document.getElementById('kpiBar');
  const cards = [
    { id: 'completed',  label: 'Completed',   value: summary.completed,  icon: ICONS.completed },
    { id: 'running',    label: 'Running',     value: summary.running,    icon: ICONS.running },
    { id: 'pending',    label: 'Yet To Start',value: summary.pending,    icon: ICONS.pending },
    { id: 'failed',     label: 'Failed',      value: summary.failed,     icon: ICONS.failed },
    { id: 'reschedule', label: 'Reschedule',  value: summary.reschedule, icon: ICONS.retry },
    { id: 'eta',        label: 'Overall ETA', value: fmtEta(summary.overall_eta_minutes), icon: ICONS.eta, isEta: true },
  ];

  bar.innerHTML = cards.map((c, i) => `
    <div class="kpi-card kpi-${c.id}" style="animation-delay:${i * 60}ms">
      <div class="kpi-icon">${c.icon}</div>
      <div class="kpi-value${c.isEta ? ' eta' : ''}">${c.value}</div>
      <div class="kpi-label">${c.label}</div>
    </div>
  `).join('');
}

function fmtEta(minutes) {
  if (minutes == null) return '—';
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

function renderZone(key, dags) {
  const grid = document.getElementById(`${key}Grid`);
  const countEl = document.getElementById(`${key === 'consumption' ? 'consumption' : 'analytics'}Count`);
  const progressEl = document.getElementById(`${key === 'consumption' ? 'consumption' : 'analytics'}Progress`);
  const pctEl = document.getElementById(`${key === 'consumption' ? 'consumption' : 'analytics'}Pct`);

  countEl.textContent = `${dags.length} DAGs`;

  const completed = dags.filter(d => d.status === 'SUCCESS').length;
  const pct = Math.round((completed / dags.length) * 100);
  progressEl.style.width = `${pct}%`;
  pctEl.textContent = `${pct}%`;

  grid.innerHTML = dags.map((d, i) => renderCard(d, i)).join('');
}

function renderCard(dag, index) {
  // dag.status is taken verbatim from dashboard_data.js — no normalization.
  // The class produced is `status-` + status.toLowerCase(), so:
  //   SUCCESS              → status-success
  //   RUNNING              → status-running
  //   FAILED               → status-failed
  //   UP_FOR_RESCHEDULE    → status-up_for_reschedule
  //   NOT_STARTED          → status-not_started
  //   QUEUED               → status-queued
  //   UPSTREAM_FAILED      → status-upstream_failed
  //   SKIPPED              → status-skipped
  //   REMOVED              → status-removed
  const statusClass = `status-${dag.status.toLowerCase()}`;
  const start = parseTs(dag.start_time);
  const end = parseTs(dag.end_time);

  // Display name without the t0_ prefix (data preserves the original)
  const displayName = dag.dag_name.replace(/^t0_/, '');

  // SLA breach: only meaningful while a DAG is actively running past its avg
  let slaBreach = false;
  if (dag.status === 'RUNNING' && start) {
    const expectedEnd = new Date(start.getTime() + dag.avg_runtime_minutes * 60000);
    slaBreach = Date.now() > expectedEnd.getTime();
  }

  const slaCls = slaBreach ? ' sla-breach' : '';

  return `
    <div class="dag-card ${statusClass}${slaCls}"
         data-dag="${dag.dag_name}"
         data-status="${dag.status}"
         data-start="${dag.start_time || ''}"
         data-avg="${dag.avg_runtime_minutes}"
         style="animation-delay:${index * 30}ms">

      <div class="dag-card-top">
        <div class="dag-name" title="${dag.dag_name}">${displayName}</div>
        <div class="dag-indicator"></div>
      </div>

      ${dag.status === 'RUNNING' ? `
        <div class="dag-progress">
          <div class="dag-progress-fill" data-progress-fill style="width:0%"></div>
        </div>
      ` : ''}

      <div class="dag-card-bottom">
        ${renderTimeBlocks(dag, start, end, slaBreach)}
      </div>
    </div>
  `;
}

/* Every production status has its own explicit branch. There is no default
   fallthrough that silently invents a label (the old code used to label
   NOT_STARTED cards as "Queued" — that auto-inference is gone). If an
   unknown status string arrives, we render it verbatim so the data issue
   is visible rather than hidden. */
function renderTimeBlocks(dag, start, end, slaBreach) {
  switch (dag.status) {
    case 'SUCCESS':
      return `
        <div class="dag-time-block">
          <span class="dag-time-label">Started</span>
          <span class="dag-time-value">${fmtTime(start)}</span>
        </div>
        <div class="dag-time-block right">
          <span class="dag-time-label">Ended</span>
          <span class="dag-time-value highlight">${fmtTime(end)}</span>
        </div>
      `;

    case 'FAILED':
      return `
        <div class="dag-time-block">
          <span class="dag-time-label">Started</span>
          <span class="dag-time-value">${fmtTime(start)}</span>
        </div>
        <div class="dag-time-block right">
          <span class="dag-time-label">Failed At</span>
          <span class="dag-time-value highlight">${fmtTime(end)}</span>
        </div>
      `;

    case 'RUNNING':
      return `
        <div class="dag-time-block">
          <span class="dag-time-label">Started</span>
          <span class="dag-time-value">${fmtTime(start)}</span>
        </div>
        <div class="dag-time-block right">
          <span class="dag-time-label">${slaBreach ? 'Overrun' : 'ETA'}</span>
          <span class="dag-time-value highlight" data-countdown="eta">…</span>
        </div>
      `;

    case 'UP_FOR_RESCHEDULE':
      // 3-column layout: Last Run · Attempt · Retry In
      // attempt_number is supplied by the producer only on UP_FOR_RESCHEDULE
      // rows; if missing we render an em-dash rather than inventing a value.
      return `
        <div class="dag-time-block">
          <span class="dag-time-label">Last Run</span>
          <span class="dag-time-value">${fmtTime(start)}</span>
        </div>
        <div class="dag-time-block center">
          <span class="dag-time-label">Attempt</span>
          <span class="dag-time-value">${dag.attempt_number ?? '—'}</span>
        </div>
        <div class="dag-time-block right">
          <span class="dag-time-label">Retry In</span>
          <span class="dag-time-value highlight" data-countdown="retry">…</span>
        </div>
      `;

    case 'NOT_STARTED':
      return staticBlock(dag, 'Not Started');

    case 'QUEUED':
      return staticBlock(dag, 'Queued');

    case 'UPSTREAM_FAILED':
      return staticBlock(dag, 'Upstream Failed');

    case 'SKIPPED':
      return staticBlock(dag, 'Skipped');

    case 'REMOVED':
      return staticBlock(dag, 'Removed');

    default:
      // Unknown status — render literally so the operator notices the
      // data issue. Do not invent a friendly label.
      return staticBlock(dag, dag.status);
  }
}

function staticBlock(dag, label) {
  return `
    <div class="dag-time-block">
      <span class="dag-time-label">Avg Runtime</span>
      <span class="dag-time-value">${dag.avg_runtime_minutes}m</span>
    </div>
    <div class="dag-time-block right">
      <span class="dag-time-label">Status</span>
      <span class="dag-time-value highlight">${escapeHtml(label)}</span>
    </div>
  `;
}

/* ────────────── COUNTDOWN TICK (1Hz) ────────────── */
function tick() {
  // Update clock
  const now = new Date();
  document.getElementById('clockTime').textContent = `${fmtClockTime(now)} GST`;

  // Update next-sync countdown
  if (STATE.nextRefresh) {
    const remaining = Math.max(0, STATE.nextRefresh.getTime() - now.getTime());
    const m = Math.floor(remaining / 60000);
    const s = Math.floor((remaining % 60000) / 1000);
    document.getElementById('nextSync').textContent =
      `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  // Update countdowns on each card
  document.querySelectorAll('.dag-card').forEach(card => {
    const status = card.dataset.status;
    const startStr = card.dataset.start;
    const avg = parseFloat(card.dataset.avg);
    const start = parseTs(startStr);

    if (status === 'RUNNING' && start) {
      const expectedEnd = new Date(start.getTime() + avg * 60000);
      const remainingSec = (expectedEnd.getTime() - now.getTime()) / 1000;
      const etaEl = card.querySelector('[data-countdown="eta"]');

      if (etaEl) {
        if (remainingSec >= 0) {
          etaEl.textContent = fmtDuration(remainingSec);
        } else {
          etaEl.textContent = `+${fmtDuration(remainingSec)}`;
        }
      }

      // Update progress bar
      const elapsedMin = (now.getTime() - start.getTime()) / 60000;
      const pct = Math.min(100, (elapsedMin / avg) * 100);
      const fill = card.querySelector('[data-progress-fill]');
      if (fill) fill.style.width = `${pct}%`;
    }

    if (status === 'UP_FOR_RESCHEDULE' && start) {
      const retryAt = new Date(start.getTime() + CONFIG.retryDelayMinutes * 60000);
      const remainingSec = (retryAt.getTime() - now.getTime()) / 1000;
      const retryEl = card.querySelector('[data-countdown="retry"]');
      if (retryEl) {
        retryEl.textContent = remainingSec >= 0
          ? fmtDuration(remainingSec)
          : 'IMMINENT';
      }
    }
  });
}

/* ────────────── REFRESH META & TICKER ────────────── */
function updateRefreshMeta() {
  // Partition ID and refresh date come straight from the JSON payload
  const partitionEl = document.getElementById('partitionId');
  if (partitionEl) partitionEl.textContent = STATE.data.partition_id || '—';

  const refreshDateEl = document.getElementById('refreshDate');
  if (refreshDateEl) refreshDateEl.textContent = STATE.data.refresh_date || '—';
}

function renderTicker() {
  const tickerEl = document.getElementById('tickerContent');
  const callout = STATE.data.callout;
  const allDags = [...STATE.data.ace_consumption, ...STATE.data.ace_analytics];
  const failed = allDags.filter(d => d.status === 'FAILED');
  const overruns = allDags
    .filter(d => d.status === 'RUNNING' && d.start_time)
    .filter(d => {
      const start = parseTs(d.start_time);
      const expected = new Date(start.getTime() + d.avg_runtime_minutes * 60000);
      return Date.now() > expected.getTime();
    });

  // Callout text from JSON drives the ticker — operator-controlled.
  // Repeat content twice for seamless scroll wrap.
  if (callout && callout.trim().length) {
    const safe = escapeHtml(callout);
    tickerEl.innerHTML = `<span class="callout-text">${safe}</span>` +
      `&nbsp;&nbsp;◆&nbsp;&nbsp;<span class="callout-text">${safe}</span>`;
  } else {
    tickerEl.innerHTML = `<span class="callout-muted">No active call-outs · all systems nominal</span>`;
  }

  // Right-side system status pill is still computed from DAG telemetry
  if (failed.length) {
    setSystemStatus('alert', `${failed.length} FAILURE${failed.length > 1 ? 'S' : ''} DETECTED`);
  } else if (overruns.length) {
    setSystemStatus('warning', `${overruns.length} SLA WARNING${overruns.length > 1 ? 'S' : ''}`);
  } else {
    setSystemStatus('nominal', 'SYSTEM NOMINAL');
  }
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function setSystemStatus(level, text) {
  const el = document.querySelector('.ticker-status');
  const txt = document.getElementById('systemStatus');
  if (!el || !txt) return;
  el.classList.remove('alert', 'warning');
  if (level === 'alert')   el.classList.add('alert');
  if (level === 'warning') el.classList.add('warning');
  txt.textContent = text;
}

/* ────────────── BOOT ────────────── */
async function boot() {
  await fetchData();
  // 1 Hz tick for clock + countdowns
  setInterval(tick, CONFIG.tickIntervalMs);
  tick();
  // Auto-refresh data every 5 minutes
  setInterval(fetchData, CONFIG.refreshIntervalMs);
}

document.addEventListener('DOMContentLoaded', boot);

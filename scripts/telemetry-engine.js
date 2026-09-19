/* ============================================================
   TELEMETRY-ENGINE.JS — Enterprise Action Logs & Diagnostics
   Structured ring buffer, trace route, error monitoring & RBAC telemetry.
   ============================================================ */

'use strict';

const STORAGE_KEY = 'careerEngine_telemetry_logs_v1';
const MAX_LOGS = 150;

export const LOG_LEVELS = {
  INFO:     'INFO',
  WARN:     'WARN',
  ERROR:    'ERROR',
  SECURITY: 'SECURITY',
};

export const LOG_CATEGORIES = {
  AUTH:     'AUTH',
  NETWORK:  'NETWORK',
  ROUTER:   'ROUTER',
  RBAC:     'RBAC',
  SYSTEM:   'SYSTEM',
};

// In-memory ring buffer
let logBuffer = [];

// Load existing logs from localStorage
try {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    logBuffer = JSON.parse(saved);
  }
} catch {
  logBuffer = [];
}

function persistLogs() {
  try {
    if (logBuffer.length > MAX_LOGS) {
      logBuffer = logBuffer.slice(-MAX_LOGS);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logBuffer));
  } catch (e) {
    console.warn('Telemetry persist warning:', e);
  }
}

/**
 * Core logging method
 */
export function logEvent(level, category, message, metadata = {}) {
  const entry = {
    id: 'evt_' + Math.random().toString(36).substring(2, 9),
    timestamp: new Date().toISOString(),
    localTime: new Date().toLocaleTimeString(),
    level: level || LOG_LEVELS.INFO,
    category: category || LOG_CATEGORIES.SYSTEM,
    message: message || '',
    metadata: {
      url: window.location.href,
      path: window.location.hash || '#dashboard',
      ...metadata,
    },
  };

  logBuffer.push(entry);
  persistLogs();

  // Also log to console in development
  const styleMap = {
    [LOG_LEVELS.INFO]:     'color: #38bdf8;',
    [LOG_LEVELS.WARN]:     'color: #f59e0b;',
    [LOG_LEVELS.ERROR]:    'color: #ef4444; font-weight: bold;',
    [LOG_LEVELS.SECURITY]: 'color: #a855f7; font-weight: bold;',
  };
  console.log(`%c[${entry.level}][${entry.category}] ${entry.message}`, styleMap[entry.level] || '', entry.metadata);

  return entry;
}

// Specialized helpers
export function logAuth(action, details = {}) {
  return logEvent(LOG_LEVELS.INFO, LOG_CATEGORIES.AUTH, action, details);
}

export function logSecurity(action, details = {}) {
  return logEvent(LOG_LEVELS.SECURITY, LOG_CATEGORIES.RBAC, action, details);
}

export function logNetwork(url, status, latencyMs, payload = {}) {
  const level = status >= 400 ? LOG_LEVELS.ERROR : LOG_LEVELS.INFO;
  return logEvent(level, LOG_CATEGORIES.NETWORK, `HTTP ${status} ${url} (${latencyMs}ms)`, { url, status, latencyMs, payload });
}

export function logError(error, context = '') {
  return logEvent(LOG_LEVELS.ERROR, LOG_CATEGORIES.SYSTEM, `${context ? context + ': ' : ''}${error?.message || error}`, {
    stack: error?.stack || null,
    name: error?.name || 'Error',
  });
}

export function getLogs(filterCategory = null, filterLevel = null) {
  let list = [...logBuffer];
  if (filterCategory) {
    list = list.filter(l => l.category === filterCategory);
  }
  if (filterLevel) {
    list = list.filter(l => l.level === filterLevel);
  }
  return list.reverse(); // Most recent first
}

export function clearLogs() {
  logBuffer = [];
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

/**
 * Generates an executive diagnostic trace report for agent / admin review
 */
export function generateDiagnosticsReport() {
  const userAgent = navigator.userAgent;
  const viewport = `${window.innerWidth}x${window.innerHeight}`;
  const origin = window.location.origin;
  const currentHash = window.location.hash || '#dashboard';

  let clientIdStatus = 'Not set';
  try {
    const rawId = localStorage.getItem('careerEngine_google_client_id') || sessionStorage.getItem('careerEngine_runtime_client_id') || '';
    clientIdStatus = rawId ? `Configured (${rawId.substring(0, 15)}...${rawId.slice(-8)})` : 'Missing';
  } catch {}

  let sessionStatus = 'Guest / Logged Out';
  try {
    const sess = JSON.parse(sessionStorage.getItem('careerEngine_session_v2') || localStorage.getItem('careerEngine_session_v2') || '{}');
    if (sess?.isLoggedIn) {
      sessionStatus = `${sess.role?.toUpperCase()} (${sess.user?.email || 'unknown'}) - Fingerprint: ${sess.fingerprint || 'none'}`;
    }
  } catch {}

  const recentLogs = getLogs().slice(0, 40).map(l => 
    `[${l.localTime}] [${l.level}] [${l.category}] ${l.message} ${Object.keys(l.metadata).length ? JSON.stringify(l.metadata) : ''}`
  ).join('\n');

  return `
=============================================================
  CAREER ENGINE — SYSTEM DIAGNOSTICS & TRACE ROUTE REPORT
=============================================================
Timestamp:     ${new Date().toISOString()}
Origin:        ${origin}
Active Route:  ${currentHash}
Viewport:      ${viewport}
User Agent:    ${userAgent}
Session:       ${sessionStatus}
OAuth Client:  ${clientIdStatus}
Total Events:  ${logBuffer.length}

─────────────────────────────────────────────────────────────
RECENT ACTION LOGS (Last 40 Events):
─────────────────────────────────────────────────────────────
${recentLogs || 'No events recorded.'}
=============================================================
`.trim();
}

// ── Global Error Listeners ────────────────────────────────────
if (typeof window !== 'undefined') {
  window.addEventListener('error', (evt) => {
    logError(evt.error || evt.message, 'Uncaught Exception');
  });

  window.addEventListener('unhandledrejection', (evt) => {
    logError(evt.reason, 'Unhandled Promise Rejection');
  });

  window.telemetry = {
    logEvent,
    logAuth,
    logSecurity,
    logNetwork,
    logError,
    getLogs,
    clearLogs,
    generateDiagnosticsReport,
    downloadLogsJson,
    LOG_LEVELS,
    LOG_CATEGORIES,
  };
}

export function downloadLogsJson() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(logBuffer, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `career-engine-telemetry-${Date.now()}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

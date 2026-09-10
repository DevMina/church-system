// ================================================================
//  CHURCH MANAGEMENT SYSTEM — Core JS (Secured)
//  Config, API layer with session tokens, Auth, Utilities
// ================================================================

// ── CONFIG ────────────────────────────────────────────────────────
// Both values must match exactly what's in google-apps-script.js
const CONFIG = {
  API_URL:    'YOUR_GOOGLE_APPS_SCRIPT_URL',     // ← paste deployed URL
  API_SECRET: 'CHANGE_THIS_TO_A_LONG_RANDOM_STRING_LIKE_x9kP2mQr7vLw4nZj', // ← same as in script
  APP_NAME:   'Church Management',
};

// ── State ─────────────────────────────────────────────────────────
const State = {
  user: null,
  sessionToken: null,
  khodam: [],
  makhdomen: [],
  khodamAttendance: [],
  makhdomenAttendance: [],
};

// ── API ───────────────────────────────────────────────────────────
const API = {
  async call(action, payload = {}) {
    try {
      const body = {
        action,
        payload,
        apiSecret: CONFIG.API_SECRET,
      };

      // Attach session token for all authenticated calls
      if (State.sessionToken) {
        body.sessionToken = State.sessionToken;
      }

      const res = await fetch(CONFIG.API_URL, {
        method: 'POST',
        body: JSON.stringify(body),
      });

      const data = await res.json();

      // If server says session expired, force logout
      if (data.code === 'SESSION_EXPIRED') {
        toast('انتهت مدة الجلسة، يرجى تسجيل الدخول مجدداً.', 'error');
        Auth.logout(false); // false = don't call server logout (token already invalid)
        return data;
      }

      return data;
    } catch (err) {
      if (err.name === 'TimeoutError' || err.name === 'AbortError') {
        return { success: false, error: 'انتهت مهلة الاتصال. تحقق من الإنترنت وحاول مجدداً.' };
      }
      return { success: false, error: 'خطأ في الاتصال. تحقق من الإنترنت وحاول مجدداً.' };
    }
  },

  // Auth (no session token needed for these)
  login:          (p) => API.call('login', p),
  forgotPassword: (p) => API.call('forgotPassword', p),
  logout:         ()  => API.call('logout'),

  // Khodam — stage-aware
  getKhodam:      (stage)  => API.call('getKhodam',    { stage }),
  getAllKhodam:    ()       => API.call('getAllKhodam',  {}),
  addKhodam:      (p)      => API.call('addKhodam',    p),
  updateKhodam:   (p)      => API.call('updateKhodam', p),
  deleteKhodam:   (id, stage) => API.call('deleteKhodam', { id, stage }),

  // Makhdomen — stage-aware
  getMakhdomen:      (stage)       => API.call('getMakhdomen',    { stage }),
  getAllMakhdomen:   ()             => API.call('getAllMakhdomen',  {}),
  addMakhdomen:      (p)           => API.call('addMakhdomen',    p),
  updateMakhdomen:   (p)           => API.call('updateMakhdomen', p),
  deleteMakhdomen:   (id, stage)   => API.call('deleteMakhdomen', { id, stage }),

  // إدارة المستخدمين (للمدير)
  getPendingUsers: ()  => API.call('getPendingUsers'),
  approveUser:     (p) => API.call('approveUser', p),
  rejectUser:      (p) => API.call('rejectUser',  p),
  getUsers:        ()  => API.call('getUsers'),
  updateUser:      (p) => API.call('updateUser',  p),
  deleteUser:      (p) => API.call('deleteUser',  p),

  // برنامج الخدمة
  getProgram:  ()  => API.call('getProgram'),
  saveProgram: (p) => API.call('saveProgram', p),

  // Attendance — stage-aware
  getKhodamAttendance:       (stage) => API.call('getKhodamAttendance',    { stage }),
  addKhodamAttendance:       (p)     => API.call('addKhodamAttendance',    p),
  updateKhodamAttendance:    (p)     => API.call('updateKhodamAttendance', p),
  getMakhdomenAttendance:    (stage) => API.call('getMakhdomenAttendance',    { stage }),
  addMakhdomenAttendance:    (p)     => API.call('addMakhdomenAttendance',    p),
  updateMakhdomenAttendance: (p)     => API.call('updateMakhdomenAttendance', p),
};

// ── Auth ──────────────────────────────────────────────────────────
const Auth = {
  isLoggedIn() {
    try {
      const stored = sessionStorage.getItem('cms_session');
      if (!stored) return false;
      const { user, token, expiresAt } = JSON.parse(stored);
      if (!user || !token) { this._clear(); return false; }
      if (Date.now() > expiresAt) { this._clear(); return false; }
      State.user = user;
      State.sessionToken = token;
      return true;
    } catch {
      this._clear();
      return false;
    }
  },

  login(user, token) {
    State.user = user;
    State.sessionToken = token;
    this._saveSession(user, token);
  },

  // Update the stored session (call after each successful API round-trip to keep expiry fresh)
  _saveSession(user, token) {
    const expiresAt = Date.now() + 8 * 60 * 60 * 1000; // mirrors SESSION_HOURS on server
    try {
      sessionStorage.setItem('cms_session', JSON.stringify({ user, token, expiresAt }));
    } catch { /* storage full or blocked */ }
  },

  async logout(callServer = true) {
    // Stop QR scanner if running
    if (typeof stopQrScan === 'function') stopQrScan();
    if (callServer && State.sessionToken) {
      await API.logout();
    }
    this._clear();
    // Clear data state
    State.khodam = []; State.makhdomen = [];
    State.khodamAttendance = []; State.makhdomenAttendance = [];
    if (window._sessionTimerId) {
      clearInterval(window._sessionTimerId);
      window._sessionTimerId = null;
    }
    window._sessionWarnShown = false;
    showPage('auth');
  },

  _clear() {
    State.user = null;
    State.sessionToken = null;
    sessionStorage.removeItem('cms_session');
  },
};

// ── Toast ─────────────────────────────────────────────────────────
function toast(msg, type = 'info') {
  const icons = { success: '✓', error: '✕', info: 'ℹ' };
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.innerHTML = `<span>${icons[type]}</span> ${esc(String(msg))}`;
  container.appendChild(el);
  setTimeout(() => { if (el.parentNode) el.remove(); }, 3800);
}

// ── Modal ─────────────────────────────────────────────────────────
function openModal(id)  { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('open');
  }
});

// ── Page Router ───────────────────────────────────────────────────
function showPage(name) {
  // Stop QR scanner if navigating away from qrscan page
  const currentActive = document.querySelector('.page-section.active');
  if (currentActive?.id === 'page-qrscan' && name !== 'qrscan') {
    if (typeof stopQrScan === 'function') stopQrScan();
  }

  document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
  const el = document.getElementById(`page-${name}`);
  if (el) el.classList.add('active');

  if (name === 'auth') {
    document.getElementById('appShell').style.display = 'none';
    document.getElementById('authShell').style.display = 'flex';
  } else {
    document.getElementById('appShell').style.display = 'flex';
    document.getElementById('authShell').style.display = 'none';
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const active = document.querySelector(`.nav-item[data-page="${name}"]`);
    if (active) active.classList.add('active');
    const titles = {
      dashboard:  'لوحة التحكم',
      khodam:     'الخدام',
      makhdomen:  'المخدومين',
      attendance: 'تسجيل الحضور',
      absent:     'سجل الغياب',
      birthdays:  'أعياد الميلاد',
      qrscan:     'مسح QR — تسجيل الحضور',
      mydata:     'بياناتي',
      users:      'إدارة المستخدمين',
    };
    document.getElementById('pageTitle').textContent = titles[name] || '';
  }
}

// ── Date Utilities ────────────────────────────────────────────────
const DateUtil = {
  getWeekStart(dateStr) {
    const d = new Date(String(dateStr));
    if (isNaN(d.getTime())) return '';
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    return d.toISOString().split('T')[0];
  },
  getWeekEnd(startStr) {
    const d = new Date(startStr);
    d.setDate(d.getDate() + 6);
    return d.toISOString().split('T')[0];
  },
  formatDate(str) {
    if (!str && str !== 0) return '';
    let d;
    if (typeof str === 'number') {
      // Google Sheets serial date: days since Dec 30 1899
      d = new Date(Math.round((str - 25569) * 86400 * 1000));
    } else {
      d = new Date(String(str));
    }
    if (isNaN(d.getTime())) return String(str);
    return d.toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' });
  },
  getMonthYear(str) {
    if (!str) return '';
    return new Date(str + '-01').toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' });
  },
  isSameMonth(dateStr, monthStr) {
    if (!dateStr || !monthStr) return false;
    return String(dateStr).startsWith(monthStr);
  },
  isSameWeek(dateStr, weekStart) {
    if (!dateStr || !weekStart) return false;
    const d  = new Date(String(dateStr));
    const ws = new Date(String(weekStart));
    const we = new Date(String(weekStart));
    if (isNaN(d.getTime()) || isNaN(ws.getTime())) return false;
    we.setDate(we.getDate() + 6);
    return d >= ws && d <= we;
  },
  initials(name) {
    if (!name) return '؟';
    return String(name).split(' ').slice(0, 2).map(w => w[0] || '').join('').toUpperCase() || '؟';
  },
};

// ── Helpers ───────────────────────────────────────────────────────
function confirmAction(msg, cb) { if (confirm(msg)) cb(); }

// Sanitize text for safe insertion into innerHTML — prevents XSS
function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getFormData(formId) {
  const form = document.getElementById(formId);
  const data = {};
  // FormData skips disabled fields — read all elements directly
  Array.from(form.elements).forEach(el => {
    if (!el.name) return;
    if (el.type === 'checkbox') { data[el.name] = el.checked ? el.value : ''; return; }
    if (el.type === 'radio')    { if (el.checked) data[el.name] = el.value; return; }
    data[el.name] = (el.value || '').trim();
  });
  return data;
}

function resetForm(formId)      { document.getElementById(formId).reset(); }

function setFormData(formId, data) {
  const form = document.getElementById(formId);
  Object.keys(data).forEach(k => {
    const el = form.elements[k];
    if (!el) return;
    const val = data[k] || '';
    if (el.tagName === 'SELECT') {
      // Try to find matching option
      const opt = [...el.options].find(o => o.value === val);
      if (opt) el.value = val;
      else el.selectedIndex = 0;
    } else {
      el.value = val;
    }
  });
}

// ================================================================
//  وحدة لوحة التحكم — شعار الخدمة، التاريخ القبطي، البرنامج
// ================================================================

// ── التقويم القبطي ────────────────────────────────────────────────
const COPTIC_MONTHS = [
  'توت','بابه','هاتور','كيهك','طوبه','أمشير',
  'برمهات','برموده','بشنس','بؤونه','أبيب','مسرى','النسيء'
];

function gregorianToCoptic(date) {
  // خوارزمية التحويل من الميلادي للقبطي
  const jdn = gregorianToJDN(date.getFullYear(), date.getMonth() + 1, date.getDate());
  return jdnToCoptic(jdn);
}

function gregorianToJDN(y, m, d) {
  return Math.floor((1461 * (y + 4800 + Math.floor((m - 14) / 12))) / 4) +
    Math.floor((367 * (m - 2 - 12 * Math.floor((m - 14) / 12))) / 12) -
    Math.floor((3 * Math.floor((y + 4900 + Math.floor((m - 14) / 12)) / 100)) / 4) +
    d - 32075;
}

function jdnToCoptic(jdn) {
  const r = jdn - 1824665;
  const n = Math.floor(r / 1461);
  const r2 = r % 1461;
  const y = 4 * n + Math.floor(r2 / 365) - (r2 === 1460 ? 1 : 0);
  const r3 = r2 % 365;
  const m = Math.floor(r3 / 30);
  const d = r3 % 30 + 1;
  return { year: y, month: m, day: d };
}

function formatCopticDate(date) {
  const c = gregorianToCoptic(date);
  const monthName = COPTIC_MONTHS[c.month] || 'النسيء';
  return `${c.day} ${monthName} ${c.year} ش`;
}

// ── شعار الخدمة (ثابت — عدّله هنا مباشرةً) ─────────────────────
// لتغيير الشعار: عدّل النص والموضع في السطرين أدناه ثم ارفع الملف
const VERSE = {
  text: '"لاَحِظْ نَفْسَكَ وَالتَّعْلِيمَ وَدَاوِمْ عَلَى ذلِكَ، لأَنَّكَ إِذَا فَعَلْتَ هذَا، تُخَلِّصُ نَفْسَكَ وَالَّذِينَ يَسْمَعُونَكَ أَيْضًا."',
  ref:  '1 تي 4 : 16',
};

function getSavedVerse() { return VERSE; }

// ── برنامج يوم الخدمة (محفوظ في Google Sheets) ─────────────────
// البيانات تُجلب من Sheets وتُحفظ فيها — يراها جميع المستخدمين
let _programCache = null; // { date, items[] }

async function loadProgramFromSheets() {
  const result = await API.getProgram();
  if (result.success && result.data) {
    _programCache = result.data;
  } else {
    _programCache = { date: '', items: [] };
  }
  return _programCache;
}

// ── رندر لوحة التحكم ─────────────────────────────────────────────
async function renderDashboardTop() {
  const today  = new Date();
  const verse  = getSavedVerse();
  const program = await loadProgramFromSheets() || { date: '', items: [] };

  const gregStr = today.toLocaleDateString('ar-EG', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });
  const copticStr = formatCopticDate(today);

  const el = document.getElementById('dashTopGrid');
  if (!el) return;

  el.innerHTML = `
    <!-- شعار الخدمة -->
    <div class="dash-banner">
      <div class="dash-banner-header" style="justify-content:space-between">
        <div style="display:flex;align-items:center;gap:6px">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 6h16M4 10h16M4 14h10"/>
          </svg>
          شعار الخدمة
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 6h16M4 10h16M4 14h10"/>
          </svg>
        </div>

      </div>
      <div class="dash-banner-body">
        <div class="verse-text">${verse.text}</div>
        <div class="verse-ref">${verse.ref}</div>
      </div>
    </div>

    <!-- التاريخ -->
    <div class="dash-banner">
      <div class="dash-banner-header">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="4" width="18" height="18" rx="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
        تاريخ اليوم
      </div>
      <div class="dash-banner-body" style="display:flex;flex-direction:column;justify-content:center;min-height:120px">
        <div class="date-greg">${gregStr}</div>
        <div class="date-coptic">${copticStr}</div>
      </div>
    </div>

    <!-- برنامج اليوم -->
    <div class="dash-banner">
      <div class="dash-banner-header" style="justify-content:space-between">
        <div style="display:flex;align-items:center;gap:6px">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="4" width="18" height="18" rx="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          برنامج يوم الخدمة
          ${program.date ? `<span id="programDateLabel" style="font-size:.72rem;opacity:.75;margin-right:4px">${DateUtil.formatDate(program.date)}</span>` : '<span id="programDateLabel"></span>'}
        </div>
        <button onclick="openProgramEditor()" style="background:rgba(255,255,255,.2);border:none;
          color:white;border-radius:6px;padding:3px 8px;cursor:pointer;font-family:var(--font-body);
          font-size:.75rem;font-weight:700">تعديل</button>
      </div>
      <div class="dash-banner-body" id="programBody">
        ${renderProgramBody(program.items || [])}
      </div>
    </div>`;
}

function renderProgramBody(program) {
  if (!program.length) {
    return `<div class="program-empty">لا يوجد برنامج</div>`;
  }
  return `<div class="program-list">
    ${program.map(p => `
      <div class="program-item">
        <span class="program-time">${p.time}</span>
        <span class="program-desc">${p.desc}</span>
      </div>`).join('')}
  </div>`;
}

function openProgramEditor() {
  const program = await loadProgramFromSheets() || { date: '', items: [] };
  document.getElementById('programEditorList').innerHTML = program.map((p, i) => `
    <div class="prog-edit-row" id="progrow_${i}" style="display:flex;gap:8px;align-items:center;margin-bottom:8px">
      <input type="text" value="${p.time}" placeholder="9:00" class="form-control"
        style="width:80px;padding:7px 10px;font-size:.85rem;direction:ltr;text-align:center"
        onchange="updateProgramRow(${i},'time',this.value)">
      <input type="text" value="${p.desc}" placeholder="وصف البند" class="form-control"
        style="flex:1;padding:7px 10px;font-size:.85rem"
        onchange="updateProgramRow(${i},'desc',this.value)">
      <button onclick="removeProgramRow(${i})" class="btn-icon danger">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>`).join('') || `<div style="color:var(--slate-light);font-size:.88rem;padding:8px 0">لا يوجد بنود — اضغط "إضافة" لبدء البرنامج</div>`;
  openModal('programModal');
}

let _editProgram = [];
let _editProgramDate = '';

function openProgramEditor() {
  const cache = _programCache || { date: '', items: [] };
  // Ensure date is a proper string (Sheets may return a serial number)
  const rawDate = cache.date;
  if (rawDate && typeof rawDate === 'number') {
    const d = new Date(Math.round((rawDate - 25569) * 86400 * 1000));
    _editProgramDate = d.toISOString().split('T')[0];
  } else {
    _editProgramDate = (rawDate && String(rawDate).match(/^\d{4}-\d{2}-\d{2}/))
      ? String(rawDate).slice(0, 10)
      : new Date().toISOString().split('T')[0];
  }
  _editProgram = [...(cache.items || [])];
  // Set date input
  const dateEl = document.getElementById('programDateInput');
  if (dateEl) dateEl.value = _editProgramDate;
  renderProgramEditor();
  openModal('programModal');
}

function renderProgramEditor() {
  document.getElementById('programEditorList').innerHTML = _editProgram.map((p, i) => `
    <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px">
      <input type="text" value="${p.time}" placeholder="9:00"
        class="form-control" style="width:80px;padding:7px 10px;font-size:.85rem;direction:ltr;text-align:center"
        oninput="_editProgram[${i}].time=this.value">
      <input type="text" value="${p.desc}" placeholder="وصف البند"
        class="form-control" style="flex:1;padding:7px 10px;font-size:.85rem"
        oninput="_editProgram[${i}].desc=this.value">
      <button onclick="_editProgram.splice(${i},1);renderProgramEditor()" class="btn-icon danger">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>`).join('') ||
    `<div style="color:var(--slate-light);font-size:.88rem;padding:8px 0;text-align:center">لا يوجد بنود</div>`;
}

function addProgramRow() {
  _editProgram.push({ time: '', desc: '' });
  renderProgramEditor();
  // focus last desc input
  setTimeout(() => {
    const inputs = document.querySelectorAll('#programEditorList input[type="text"]:nth-child(2)');
    if (inputs.length) inputs[inputs.length - 1]?.focus();
  }, 50);
}

async function saveProgramChanges() {
  const dateEl = document.getElementById('programDateInput');
  const date   = dateEl?.value || new Date().toISOString().split('T')[0];
  const valid  = _editProgram.filter(p => p.desc && p.desc.trim());

  const btn = document.getElementById('saveProgramBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'جارٍ الحفظ…'; }

  const result = await API.saveProgram({
    date,
    items: valid,
    username: State.user?.username || '',
  });

  if (btn) { btn.disabled = false; btn.textContent = 'حفظ البرنامج'; }

  if (result.success) {
    _programCache = { date, items: valid };
    // Update the display
    const body = document.getElementById('programBody');
    if (body) body.innerHTML = renderProgramBody(valid);
    // Update date label in header
    const header = document.getElementById('programDateLabel');
    if (header) header.textContent = DateUtil.formatDate(date);
    closeModal('programModal');
    toast('تم حفظ البرنامج للجميع', 'success');
  } else {
    toast(result.error || 'فشل الحفظ', 'error');
  }
}

// ── إحصائيات لوحة التحكم ─────────────────────────────────────────
function updateDashboardStats() {
  renderDashboardTop(); // async — no await, updates #dashTopGrid when ready

  const khodam         = State.khodam    || [];
  const makhdomen      = State.makhdomen  || [];
  const khodamAtt      = State.khodamAttendance    || [];
  const makhdomenAtt   = State.makhdomenAttendance || [];

  const totalKhodam    = khodam.length;
  const totalMakhdomen = makhdomen.length;
  const activeK        = khodam.filter(m => m.status !== 'inactive').length;

  const today = new Date().toISOString().split('T')[0];
  const ws    = DateUtil.getWeekStart(today);

  const kAtt = khodamAtt.filter(a => DateUtil.isSameWeek(a.date, ws));
  const mAtt = makhdomenAtt.filter(a => DateUtil.isSameWeek(a.date, ws));

  const activeM = makhdomen.filter(m => m.status !== 'inactive').length;

  const calcRate = (arr, total) => {
    if (!total || !arr.length) return '—';
    const attended = arr.filter(a => a.mass === 'present' || a.khedma === 'present').length;
    return Math.round(attended / total * 100) + '%';
  };

  setStat('statTotalKhodam',    totalKhodam);
  setStat('statTotalMakhdomen', totalMakhdomen);
  setStat('statActiveKhodam',   activeK);
  setStat('statKhodamRate',     calcRate(kAtt, activeK));
  setStat('statMakhdomenRate',  calcRate(mAtt, activeM));

  const thisMonth  = new Date().toISOString().slice(5, 7);
  const bdays      = [...State.khodam, ...State.makhdomen]
    .filter(m => m.birthDate && m.birthDate.slice(5, 7) === thisMonth);
  setStat('statBirthdays', bdays.length);

  renderDashboardBirthdays();
  renderDashboardRecentAttendance();
}



function setStat(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function renderDashboardBirthdays() {
  const thisMonth = new Date().toISOString().slice(5, 7);
  const all = [
    ...(State.khodam    || []).map(m => ({ ...m, _type: 'خادم' })),
    ...(State.makhdomen || []).map(m => ({ ...m, _type: 'مخدوم' })),
  ].filter(m => m.birthDate && String(m.birthDate).slice(5, 7) === thisMonth)
   .sort((a, b) => parseInt(String(a.birthDate).slice(8,10)) - parseInt(String(b.birthDate).slice(8,10)));

  const el = document.getElementById('dashBirthdays');
  if (!el) return;

  if (!all.length) {
    el.innerHTML = `<div class="empty-state" style="padding:24px"><p>لا توجد أعياد ميلاد هذا الشهر</p></div>`;
    return;
  }

  el.innerHTML = all.slice(0, 6).map(m => `
    <div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--sage)">
      <div class="birthday-avatar" style="width:34px;height:34px;font-size:.78rem">${DateUtil.initials(m.name)}</div>
      <div style="flex:1">
        <div style="font-weight:700;font-size:.88rem;color:var(--navy)">${esc(m.name)}</div>
        <div style="font-size:.75rem;color:var(--slate-light)">${DateUtil.formatDate(m.birthDate)}</div>
      </div>
      <span class="badge" style="background:rgba(201,168,76,.12);color:var(--gold);font-size:.68rem">${m._type}</span>
    </div>`).join('');
}

function renderDashboardRecentAttendance() {
  const el = document.getElementById('dashRecentAtt');
  if (!el) return;

  const all = [
    ...(State.khodamAttendance    || []).map(a => ({ ...a, _type: 'خادم' })),
    ...(State.makhdomenAttendance || []).map(a => ({ ...a, _type: 'مخدوم' })),
  ].sort((a, b) => new Date(String(b.date)) - new Date(String(a.date))).slice(0, 10);

  if (!all.length) {
    el.innerHTML = `<div class="empty-state" style="padding:24px"><p>لا توجد سجلات حضور بعد</p></div>`;
    return;
  }

  const cell = v => v === 'present'
    ? `<span style="color:var(--success);font-weight:700">✓</span>`
    : `<span style="color:var(--danger)">✕</span>`;

  el.innerHTML = `
    <table style="width:100%;font-size:.85rem;border-collapse:collapse">
      <thead><tr>
        ${['الاسم','النوع','التاريخ','قداس','خدمة'].map(h =>
          `<th style="padding:8px 12px;text-align:right;background:var(--sage);color:var(--slate);font-size:.72rem;font-weight:700">${h}</th>`
        ).join('')}
      </tr></thead>
      <tbody>
        ${all.map(a => `<tr style="border-bottom:1px solid var(--sage)">
          <td style="padding:8px 12px;font-weight:700">${esc(a.memberName)}</td>
          <td style="padding:8px 12px;font-size:.75rem;color:var(--slate-light)">${a._type}</td>
          <td style="padding:8px 12px;color:var(--slate-light)">${DateUtil.formatDate(a.date)}</td>
          <td style="padding:8px 12px;text-align:center">${cell(a.mass)}</td>
          <td style="padding:8px 12px;text-align:center">${cell(a.khedma)}</td>
        </tr>`).join('')}
      </tbody>
    </table>`;
}

// ── أعياد الميلاد ────────────────────────────────────────────────
function renderBirthdays() {
  const monthInput = document.getElementById('birthdayMonthPicker');
  if (!monthInput?.value) return;

  const month      = monthInput.value.slice(5, 7);
  const typeFilter = document.getElementById('birthdayTypeFilter')?.value || '';

  let all = [];
  if (!typeFilter || typeFilter === 'khodam')
    all.push(...(State.khodam    || []).map(m => ({ ...m, _type: 'خادم' })));
  if (!typeFilter || typeFilter === 'makhdomen')
    all.push(...(State.makhdomen || []).map(m => ({ ...m, _type: 'مخدوم' })));

  const filtered = all
    .filter(m => m.birthDate && String(m.birthDate).slice(5, 7) === month)
    .sort((a, b) => parseInt(String(a.birthDate).slice(8,10)) - parseInt(String(b.birthDate).slice(8,10)));

  const container = document.getElementById('birthdayGrid');
  const count     = document.getElementById('birthdayCount');
  if (count) count.textContent = `${filtered.length} عيد ميلاد`;

  if (!filtered.length) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1;padding:60px 24px">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" style="opacity:.25;margin-bottom:14px">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
          <path d="M12 2v2M8 4l1 1M16 4l-1 1"/>
        </svg>
        <p>لا توجد أعياد ميلاد في هذا الشهر</p>
      </div>`;
    return;
  }

  const today = new Date();

  container.innerHTML = `
    <div class="bday-table-wrap">
      <table class="bday-table">
        <thead>
          <tr>
            <th style="width:50px;text-align:center">رقم</th>
            <th>الاسم</th>
            <th>النوع</th>
            <th>المرحلة</th>
            <th>تاريخ الميلاد</th>
            <th style="text-align:center">اليوم</th>
          </tr>
        </thead>
        <tbody>
          ${filtered.map((m, i) => {
            const bDay    = parseInt(m.birthDate.slice(8,10));
            const bMon    = parseInt(m.birthDate.slice(5,7));
            const isToday = today.getDate() === bDay && today.getMonth() + 1 === bMon;
            return `
            <tr class="${isToday ? 'bday-today-row' : ''}">
              <td style="text-align:center;font-weight:700;color:var(--slate-light)">${i + 1}</td>
              <td>
                <div style="display:flex;align-items:center;gap:10px">
                  <div class="birthday-avatar" style="width:34px;height:34px;font-size:.8rem;flex-shrink:0">
                    ${DateUtil.initials(m.name)}
                  </div>
                  <span style="font-weight:700;color:var(--navy)">
                    ${esc(m.name)}${isToday ? ' 🎂' : ''}
                  </span>
                </div>
              </td>
              <td>
                <span class="badge ${m._type === 'خادم' ? 'badge-khodam' : 'badge-makhdomen'}">
                  ${m._type}
                </span>
              </td>
              <td style="color:var(--slate);font-size:.88rem">${m.stage || '—'}</td>
              <td style="font-weight:600;color:var(--navy)">${DateUtil.formatDate(m.birthDate)}</td>
              <td style="text-align:center">
                ${isToday
                  ? `<span class="badge" style="background:rgba(39,174,96,.12);color:var(--success)">اليوم 🎉</span>`
                  : `<span style="color:var(--slate-light);font-size:.85rem">${bDay} / ${String(bMon).padStart(2,'0')}</span>`
                }
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>`;
}

function initBirthdays() {
  const picker = document.getElementById('birthdayMonthPicker');
  if (picker && !picker.value) {
    picker.value = new Date().toISOString().slice(0, 7);
    renderBirthdays();
  }
  document.getElementById('birthdayMonthPicker')?.addEventListener('change', renderBirthdays);
  document.getElementById('birthdayTypeFilter')?.addEventListener('change',  renderBirthdays);
}

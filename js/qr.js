// ================================================================
//  وحدة QR Code — توليد وقراءة رموز QR للحضور
//  المكتبات: qrcode.js (توليد) + html5-qrcode (مسح)
// ================================================================

// ── توليد QR Code لعضو ──────────────────────────────────────────

function showMemberQR(type, id) {
  currentQrType = type;
  currentQrId   = id;

  const list   = type === 'khodam' ? State.khodam : State.makhdomen;
  const member = list.find(m => m.id === id);
  if (!member) return;

  const qrData = JSON.stringify({ id: member.id, name: member.name, type });

  document.getElementById('qrMemberName').textContent  = member.name;
  document.getElementById('qrMemberType').textContent  = type === 'khodam' ? 'خادم' : 'مخدوم';
  document.getElementById('qrMemberStage').textContent = member.stage || '—';
  document.getElementById('qrContainer').innerHTML     = '';

  openModal('qrModal');

  // توليد QR بعد فتح المودال
  setTimeout(() => {
    if (typeof QRCode === 'undefined') {
      document.getElementById('qrContainer').innerHTML =
        `<div class="empty-state"><p>جارٍ تحميل مكتبة QR…</p></div>`;
      return;
    }
    new QRCode(document.getElementById('qrContainer'), {
      text:          qrData,
      width:         220,
      height:        220,
      colorDark:     '#1E2A4A',
      colorLight:    '#ffffff',
      correctLevel:  QRCode.CorrectLevel.H,
    });
  }, 100);
}

function downloadQR(type, id) {
  const list   = type === 'khodam' ? State.khodam : State.makhdomen;
  const member = list.find(m => m.id === id);
  if (!member) return;

  setTimeout(() => {
    const img = document.querySelector('#qrContainer img');
    if (!img) { toast('جارٍ توليد QR…', 'info'); return; }
    const a  = document.createElement('a');
    a.href   = img.src;
    a.download = `QR_${(member.name || 'member').replace(/\s+/g, '_').replace(/[<>:"/\\|?*]/g, '')}.png`;
    a.click();
  }, 200);
}

function printQR() {
  const name  = document.getElementById('qrMemberName').textContent;
  const type  = document.getElementById('qrMemberType').textContent;
  const stage = document.getElementById('qrMemberStage').textContent;
  const img   = document.querySelector('#qrContainer img');
  if (!img) { toast('جارٍ توليد QR…', 'info'); return; }

  const win = window.open('', '_blank');
  win.document.write(`
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <title>QR - ${name}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700;800&display=swap');
        body { font-family: Tajawal, sans-serif; display: flex; justify-content: center;
               align-items: center; min-height: 100vh; margin: 0; background: #f8f6f1; }
        .card { background: white; border-radius: 16px; padding: 32px 28px; text-align: center;
                box-shadow: 0 4px 24px rgba(0,0,0,.12); width: 280px; }
        .cross { width: 32px; height: 32px; position: relative; margin: 0 auto 10px; }
        .cross::before, .cross::after { content:''; position:absolute; background:#C9A84C; border-radius:2px; }
        .cross::before { width:5px; height:32px; left:13px; }
        .cross::after  { width:26px; height:5px; top:13px; left:3px; }
        h2 { font-size: 1.1rem; color: #1E2A4A; margin: 0 0 4px; font-weight: 800; }
        .type { font-size: .78rem; color: #C9A84C; font-weight: 700; margin-bottom: 4px; }
        .stage { font-size: .78rem; color: #718096; margin-bottom: 16px; }
        img { width: 200px; height: 200px; }
        .footer { font-size: .72rem; color: #A0AEC0; margin-top: 12px; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="cross"></div>
        <h2>${name}</h2>
        <div class="type">${type}</div>
        <div class="stage">${stage}</div>
        <img src="${img.src}" alt="QR Code">
        <div class="footer">امسح للتسجيل</div>
      </div>
    </body>
    </html>`);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); win.close(); }, 500);
}

// ── صفحة مسح QR ─────────────────────────────────────────────────

let html5QrScanner = null;

function initQrScanPage() {
  // تعيين تاريخ اليوم تلقائياً
  const dateEl = document.getElementById('scanDate');
  if (dateEl && !dateEl.value) {
    dateEl.value = new Date().toISOString().split('T')[0];
  }
  resetScanResult();
}

function startQrScan() {
  if (typeof Html5Qrcode === 'undefined') {
    toast('جارٍ تحميل مكتبة المسح…', 'info');
    return;
  }

  document.getElementById('scannerBox').style.display    = 'block';
  document.getElementById('startScanBtn').style.display  = 'none';
  document.getElementById('stopScanBtn').style.display   = 'inline-flex';
  document.getElementById('scanResult').style.display    = 'none';

  html5QrScanner = new Html5Qrcode('qrReader');
  html5QrScanner.start(
    { facingMode: 'environment' },
    { fps: 10, qrbox: { width: 250, height: 250 } },
    (decodedText) => onQrScanned(decodedText),
    () => {}
  ).catch(err => {
    toast('تعذّر الوصول للكاميرا: ' + err, 'error');
    stopQrScan();
  });
}

function stopQrScan() {
  if (html5QrScanner) {
    html5QrScanner.stop().catch(() => {});
    html5QrScanner = null;
  }
  document.getElementById('scannerBox').style.display   = 'none';
  document.getElementById('startScanBtn').style.display = 'inline-flex';
  document.getElementById('stopScanBtn').style.display  = 'none';
}

async function onQrScanned(text) {
  // إيقاف المسح فوراً بعد قراءة ناجحة
  stopQrScan();

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    showScanError('QR غير صالح أو تالف');
    return;
  }

  const { id, name, type } = data;
  if (!id || !type) { showScanError('بيانات QR غير مكتملة أو تالفة'); return; }
  if (type !== 'khodam' && type !== 'makhdomen') { showScanError('نوع العضو في QR غير معروف'); return; }

  const list   = (type === 'khodam' ? State.khodam : State.makhdomen) || [];
  const member = list.find(m => m.id === id);
  if (!member) { showScanError(`العضو "${esc(name || '')}" غير موجود — تأكد من تحميل بيانات المرحلة`); return; }

  // عرض بيانات العضو وخيارات التسجيل
  showScanSuccess(member, type);
}

function showScanSuccess(member, type) {
  const dateVal = document.getElementById('scanDate')?.value || new Date().toISOString().split('T')[0];

  document.getElementById('scanResult').style.display = 'block';
  document.getElementById('scanResult').innerHTML = `
    <div class="scan-success-card">
      <div style="display:flex;align-items:center;gap:14px;margin-bottom:20px">
        <div class="birthday-avatar" style="width:52px;height:52px;font-size:1.1rem;flex-shrink:0">
          ${DateUtil.initials(member.name)}
        </div>
        <div>
          <div style="font-family:var(--font-display);font-size:1.15rem;color:var(--navy);font-weight:700">
            ${esc(member.name)}
          </div>
          <div style="font-size:.82rem;color:var(--slate-light);margin-top:2px">
            ${type === 'khodam' ? 'خادم' : 'مخدوم'}
            ${member.stage ? ' · ' + member.stage : ''}
          </div>
        </div>
        <div style="margin-right:auto">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--success)" stroke-width="2.5">
            <circle cx="12" cy="12" r="10"/><path d="M8 12l3 3 5-5"/>
          </svg>
        </div>
      </div>

      <div style="background:var(--sage);border-radius:var(--radius);padding:14px 16px;margin-bottom:16px;
                  display:flex;align-items:center;gap:10px">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--slate)" stroke-width="2">
          <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
        <span style="font-size:.88rem;color:var(--slate);font-weight:600">
          التاريخ: ${DateUtil.formatDate(dateVal)}
        </span>
      </div>

      <p style="font-size:.88rem;color:var(--slate);margin-bottom:12px;font-weight:700">اختر نوع الحضور:</p>

      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:16px">
        <button class="scan-att-btn" onclick="registerQrAttendance('${member.id}','${type}','mass','${dateVal}',this)"
          style="background:rgba(30,42,74,.06);border:2px solid var(--sage);border-radius:var(--radius);
                 padding:14px 8px;cursor:pointer;font-family:var(--font-body);transition:all .2s">
          <div style="font-size:1.4rem;margin-bottom:6px">⛪</div>
          <div style="font-weight:700;color:var(--navy);font-size:.88rem">قداس فقط</div>
        </button>
        <button class="scan-att-btn" onclick="registerQrAttendance('${member.id}','${type}','khedma','${dateVal}',this)"
          style="background:rgba(30,42,74,.06);border:2px solid var(--sage);border-radius:var(--radius);
                 padding:14px 8px;cursor:pointer;font-family:var(--font-body);transition:all .2s">
          <div style="font-size:1.4rem;margin-bottom:6px">🤝</div>
          <div style="font-weight:700;color:var(--navy);font-size:.88rem">خدمة فقط</div>
        </button>
        <button class="scan-att-btn" onclick="registerQrAttendance('${member.id}','${type}','both','${dateVal}',this)"
          style="background:rgba(201,168,76,.08);border:2px solid var(--gold);border-radius:var(--radius);
                 padding:14px 8px;cursor:pointer;font-family:var(--font-body);transition:all .2s">
          <div style="font-size:1.4rem;margin-bottom:6px">✨</div>
          <div style="font-weight:700;color:var(--navy);font-size:.88rem">قداس + خدمة</div>
        </button>
      </div>

      <button onclick="resetScanResult()" class="btn btn-outline btn-sm" style="width:100%;justify-content:center">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
        </svg>
        مسح آخر
      </button>
    </div>`;
}

async function registerQrAttendance(memberId, type, attType, dateVal, btn) {
  const attendance = type === 'khodam' ? State.khodamAttendance : State.makhdomenAttendance;
  const members    = type === 'khodam' ? State.khodam : State.makhdomen;
  const member     = members.find(m => m.id === memberId);
  if (!member) return;

  const weekStart = DateUtil.getWeekStart(dateVal);

  // هل يوجد سجل لهذا الأسبوع؟
  const existing = attendance.find(a =>
    a.memberId === memberId && DateUtil.isSameWeek(a.date, weekStart));

  const mass   = attType === 'mass'   || attType === 'both' ? 'present' : (existing?.mass   || 'absent');
  const khedma = attType === 'khedma' || attType === 'both' ? 'present' : (existing?.khedma || 'absent');

  // تعطيل الأزرار أثناء الحفظ
  document.querySelectorAll('.scan-att-btn').forEach(b => {
    b.disabled = true;
    b.style.opacity = '.5';
  });

  const payload = { memberId, memberName: member.name, date: dateVal, week: weekStart, mass, khedma };

  let result;
  if (existing) {
    payload.id = existing.id;
    result = type === 'khodam'
      ? await API.updateKhodamAttendance(payload)
      : await API.updateMakhdomenAttendance(payload);
  } else {
    result = type === 'khodam'
      ? await API.addKhodamAttendance(payload)
      : await API.addMakhdomenAttendance(payload);
  }

  if (result.success) {
    await loadAllAttendance();

    const attLabel = attType === 'both' ? 'قداس وخدمة'
                   : attType === 'mass'  ? 'القداس'
                   : 'الخدمة';

    document.getElementById('scanResult').innerHTML = `
      <div class="scan-done-card">
        <div style="text-align:center;padding:24px 16px">
          <div style="font-size:3rem;margin-bottom:12px">✅</div>
          <div style="font-family:var(--font-display);font-size:1.2rem;color:var(--navy);font-weight:700;margin-bottom:6px">
            تم تسجيل الحضور!
          </div>
          <div style="font-size:.9rem;color:var(--slate-light);margin-bottom:4px">
            <strong style="color:var(--navy)">${esc(member.name)}</strong>
          </div>
          <div style="font-size:.85rem;color:var(--success);font-weight:700;margin-bottom:20px">
            ${attLabel} · ${DateUtil.formatDate(dateVal)}
          </div>
          <button onclick="resetScanResult()" class="btn btn-primary">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
            </svg>
            مسح عضو آخر
          </button>
        </div>
      </div>`;

    toast(`✓ تم تسجيل ${member.name}`, 'success');
  } else {
    toast(result.error || 'فشل التسجيل', 'error');
    document.querySelectorAll('.scan-att-btn').forEach(b => {
      b.disabled = false;
      b.style.opacity = '1';
    });
  }
}

function showScanError(msg) {
  document.getElementById('scanResult').style.display = 'block';
  document.getElementById('scanResult').innerHTML = `
    <div style="text-align:center;padding:24px;background:#fdecea;border-radius:var(--radius);
                border:1px solid rgba(192,57,43,.2)">
      <div style="font-size:2.5rem;margin-bottom:10px">❌</div>
      <div style="color:var(--danger);font-weight:700;margin-bottom:12px">${msg}</div>
      <button onclick="resetScanResult()" class="btn btn-outline btn-sm">حاول مرة أخرى</button>
    </div>`;
}

function resetScanResult() {
  const el = document.getElementById('scanResult');
  if (el) { el.style.display = 'none'; el.innerHTML = ''; }
}

// ── عرض QR لكل أعضاء مجموعة ─────────────────────────────────────
function printAllQR(type) {
  const list  = type === 'khodam' ? State.khodam : State.makhdomen;
  const label = type === 'khodam' ? 'الخدام' : 'المخدومين';

  if (!list || !list.length) { toast(`لا يوجد ${label} لطباعة QR`, 'error'); return; }

  // فتح نافذة طباعة QR جماعي
  openModal('bulkQrModal');
  document.getElementById('bulkQrTitle').textContent = `رموز QR — ${label}`;
  document.getElementById('bulkQrGrid').innerHTML =
    `<div class="loading"><div class="spinner"></div> جارٍ توليد الرموز…</div>`;

  setTimeout(() => {
    if (typeof QRCode === 'undefined') {
      document.getElementById('bulkQrGrid').innerHTML =
        `<div class="empty-state"><p>تعذّر تحميل مكتبة QR</p></div>`;
      return;
    }

    document.getElementById('bulkQrGrid').innerHTML = list.map(m => `
      <div class="bulk-qr-item" id="bqr_${m.id}">
        <div class="bulk-qr-box" id="bqrbox_${m.id}"></div>
        <div class="bulk-qr-name">${esc(m.name)}</div>
        <div class="bulk-qr-sub">${type === 'khodam' ? 'خادم' : 'مخدوم'}${m.stage ? ' · ' + m.stage : ''}</div>
      </div>`).join('');

    list.forEach(m => {
      const qrData = JSON.stringify({ id: m.id, name: m.name, type });
      new QRCode(document.getElementById(`bqrbox_${m.id}`), {
        text:         qrData,
        width:        140,
        height:       140,
        colorDark:    '#1E2A4A',
        colorLight:   '#ffffff',
        correctLevel: QRCode.CorrectLevel.H,
      });
    });
  }, 150);
}

function printBulkQR() {
  const grid  = document.getElementById('bulkQrGrid');
  const title = document.getElementById('bulkQrTitle').textContent;
  const items = grid.querySelectorAll('.bulk-qr-item');

  const cardsHTML = [...items].map(item => {
    const img   = item.querySelector('img');
    const name  = item.querySelector('.bulk-qr-name').textContent;
    const sub   = item.querySelector('.bulk-qr-sub').textContent;
    return `<div class="qr-print-card">
      ${img ? `<img src="${img.src}" alt="QR">` : ''}
      <div class="qr-print-name">${name}</div>
      <div class="qr-print-sub">${sub}</div>
    </div>`;
  }).join('');

  const win = window.open('', '_blank');
  win.document.write(`<!DOCTYPE html><html dir="rtl" lang="ar"><head>
    <meta charset="UTF-8"><title>${title}</title>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700&display=swap');
      body { font-family: Tajawal, sans-serif; margin: 0; padding: 16px; background: white; }
      h2   { text-align:center; color: #1E2A4A; margin-bottom: 20px; font-size: 1.2rem; }
      .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
      .qr-print-card { border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px;
                       text-align: center; page-break-inside: avoid; }
      .qr-print-card img { width: 120px; height: 120px; }
      .qr-print-name { font-weight: 700; color: #1E2A4A; font-size: .85rem; margin-top: 8px; }
      .qr-print-sub  { font-size: .72rem; color: #718096; margin-top: 2px; }
      @media print { @page { margin: 12mm; } }
    </style></head><body>
    <h2>${title}</h2>
    <div class="grid">${cardsHTML}</div>
  </body></html>`);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); win.close(); }, 600);
}

// ── حضور اليوم في صفحة المسح ─────────────────────────────────────
function renderTodayAttendance() {
  const today = new Date().toISOString().split('T')[0];
  const el    = document.getElementById('todayAttList');
  if (!el) return;

  const all = [
    ...(State.khodamAttendance    || []).filter(a => String(a.date).slice(0,10) === today).map(a => ({ ...a, _type: 'خادم' })),
    ...(State.makhdomenAttendance || []).filter(a => String(a.date).slice(0,10) === today).map(a => ({ ...a, _type: 'مخدوم' })),
  ];

  if (!all.length) {
    el.innerHTML = `<div class="empty-state" style="padding:24px"><p>لم يُسجَّل حضور اليوم بعد</p></div>`;
    return;
  }

  const cell = v => v === 'present'
    ? `<span style="color:var(--success);font-weight:700">✓</span>`
    : `<span style="color:var(--danger)">✕</span>`;

  el.innerHTML = `
    <table style="width:100%;font-size:.85rem;border-collapse:collapse">
      <thead><tr>
        ${['الاسم','النوع','قداس','خدمة'].map(h =>
          `<th style="padding:8px 12px;text-align:right;background:var(--sage);color:var(--slate);font-size:.72rem;font-weight:700">${h}</th>`
        ).join('')}
      </tr></thead>
      <tbody>
        ${all.map(a => `<tr style="border-bottom:1px solid var(--sage)">
          <td style="padding:8px 12px;font-weight:700">${esc(a.memberName)}</td>
          <td style="padding:8px 12px;font-size:.75rem;color:var(--slate-light)">${a._type}</td>
          <td style="padding:8px 12px;text-align:center">${cell(a.mass)}</td>
          <td style="padding:8px 12px;text-align:center">${cell(a.khedma)}</td>
        </tr>`).join('')}
      </tbody>
    </table>`;
}

// متغيرات عامة للـ QR المفرد
let currentQrType = '';
let currentQrId   = '';

// currentQrType/Id stored by showMemberQR at top of file

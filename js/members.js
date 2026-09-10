// ================================================================
//  وحدة الأعضاء — الخدام والمخدومين
// ================================================================

// مراحل الخدام
const KHODAM_STAGES = [
  'حضانة',
  'أولى وتانية ابتدائي',
  'تالتة ورابعة ابتدائي',
  'خامسة وسادسة ابتدائي',
  'إعدادي',
  'ثانوي',
  'شباب',
  'خريجين',
];

// مراحل المخدومين (15 مرحلة دقيقة — تُحفظ في 8 تابات مجمّعة)
const MAKHDOMEN_STAGES = [
  'حضانة',
  'أولى ابتدائي','تانية ابتدائي','تالتة ابتدائي',
  'رابعة ابتدائي','خامسة ابتدائي','سادسة ابتدائي',
  'أولى إعدادي','تانية إعدادي','تالتة إعدادي',
  'أولى ثانوي','تانية ثانوي','تالتة ثانوي',
  'شباب','خريجين',
];

// (stage mapping handled server-side)

function renderMembersTable(type) {
  const data   = (type === 'khodam' ? State.khodam : State.makhdomen) || [];
  const tbody  = document.getElementById(`${type}Tbody`);
  if (!tbody) return;
  const search = document.getElementById(`${type}Search`)?.value?.toLowerCase() || '';
  const statusFilter = document.getElementById(`${type}StatusFilter`)?.value || '';
  const label  = type === 'khodam' ? 'خدام' : 'مخدومين';

  const stageFilter = document.getElementById(`${type}StageFilter`)?.value || '';

  const filtered = data.filter(m => {
    const matchSearch = !search ||
      m.name?.toLowerCase().includes(search) ||
      m.phone?.includes(search) ||
      m.area?.toLowerCase().includes(search) ||
      m.confessionFather?.toLowerCase().includes(search) ||
      m.stage?.toLowerCase().includes(search);
    const matchStatus = !statusFilter || m.status === statusFilter;
    const matchStage  = !stageFilter  || m.stage  === stageFilter;
    return matchSearch && matchStatus && matchStage;
  });

  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="${type === 'khodam' ? 9 : 12}">
      <div class="empty-state">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
        </svg>
        <p>لا يوجد ${label}</p>
      </div></td></tr>`;
    return;
  }

  if (type === 'khodam') {
    tbody.innerHTML = filtered.map((m, idx) => `
      <tr>
        <td style="font-weight:700;color:var(--slate-light);text-align:center">${idx + 1}</td>
        <td>
          <div style="display:flex;align-items:center;gap:8px">
            <div class="birthday-avatar" style="width:30px;height:30px;font-size:.72rem">${DateUtil.initials(m.name)}</div>
            <span style="font-weight:700">${esc(m.name)}</span>
          </div>
        </td>
        <td>${esc(m.address) || '—'}</td>
        <td dir="ltr" style="text-align:right">${esc(m.phone) || '—'}</td>
        <td>${DateUtil.formatDate(m.birthDate)}</td>
        <td>${esc(m.stage) || '—'}</td>
        <td>${esc(m.confessionFather) || '—'}</td>
        <td>${esc(m.notes) || '—'}</td>
        <td>
          <div class="actions-cell">
            <button class="btn-icon" title="عرض" onclick="viewMember('khodam','${m.id}')">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
            <button class="btn-icon" title="تعديل" onclick="editMember('khodam','${m.id}')">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button class="btn-icon danger" title="حذف" onclick="deleteMember('khodam','${m.id}')">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
            </button>
            <button class="btn-icon" title="رمز QR" onclick="showMemberQR('khodam','${m.id}')" style="color:var(--gold)">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="5" height="5"/><rect x="16" y="3" width="5" height="5"/><rect x="3" y="16" width="5" height="5"/><path d="M21 16h-3v3M21 21v.01M16 13h2"/></svg>
            </button>
          </div>
        </td>
      </tr>`).join('');
  } else {
    tbody.innerHTML = filtered.map((m, idx) => `
      <tr>
        <td style="font-weight:700;color:var(--slate-light);text-align:center">${idx + 1}</td>
        <td>
          <div style="display:flex;align-items:center;gap:8px">
            <div class="birthday-avatar" style="width:30px;height:30px;font-size:.72rem">${DateUtil.initials(m.name)}</div>
            <span style="font-weight:700">${esc(m.name)}</span>
          </div>
        </td>
        <td>${esc(m.area) || '—'}</td>
        <td>${esc(m.address) || '—'}</td>
        <td dir="ltr" style="text-align:right">${esc(m.fatherPhone) || '—'}</td>
        <td dir="ltr" style="text-align:right">${esc(m.motherPhone) || '—'}</td>
        <td dir="ltr" style="text-align:right">${esc(m.phone) || '—'}</td>
        <td>${DateUtil.formatDate(m.birthDate)}</td>
        <td>${esc(m.stage) || '—'}</td>
        <td>${esc(m.confessionFather) || '—'}</td>
        <td>${esc(m.notes) || '—'}</td>
        <td style="text-align:center">
          ${m.absent === 'yes'
            ? '<span class="badge badge-absent">غير متواجد</span>'
            : '<span class="badge badge-present">متواجد</span>'}
        </td>
        <td>
          <div class="actions-cell">
            <button class="btn-icon" title="عرض" onclick="viewMember('makhdomen','${m.id}')">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
            <button class="btn-icon" title="تعديل" onclick="editMember('makhdomen','${m.id}')">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button class="btn-icon danger" title="حذف" onclick="deleteMember('makhdomen','${m.id}')">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
            </button>
            <button class="btn-icon" title="رمز QR" onclick="showMemberQR('makhdomen','${m.id}')" style="color:var(--gold)">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="5" height="5"/><rect x="16" y="3" width="5" height="5"/><rect x="3" y="16" width="5" height="5"/><path d="M21 16h-3v3M21 21v.01M16 13h2"/></svg>
            </button>
          </div>
        </td>
      </tr>`).join('');
  }
}

function openAddMember(type) {
  resetForm(`${type}Form`);
  document.getElementById(`${type}FormId`).value = '';
  document.getElementById(`${type}ModalTitle`).textContent =
    type === 'khodam' ? 'إضافة خادم' : 'إضافة مخدوم';

  const stageEl = document.querySelector(`#${type}Form [name="stage"]`);
  if (stageEl) {
    if (type === 'khodam' && State.user?.role !== 'admin') {
      // للخادم: مرحلته محددة مسبقاً ومقفولة
      stageEl.value    = State.user.stage || '';
      stageEl.disabled = true;
    } else {
      // المدير، أو إضافة مخدوم: يختار بحرية
      stageEl.disabled = false;
      if (type === 'makhdomen') stageEl.value = '';
    }
  }
  openModal(`${type}Modal`);
}

function editMember(type, id) {
  const list   = type === 'khodam' ? State.khodam : State.makhdomen;
  const member = list.find(m => m.id === id);
  if (!member) return;
  document.getElementById(`${type}ModalTitle`).textContent =
    type === 'khodam' ? 'تعديل بيانات الخادم' : 'تعديل بيانات المخدوم';
  document.getElementById(`${type}FormId`).value = member.id;
  setFormData(`${type}Form`, member);
  openModal(`${type}Modal`);
}

function viewMember(type, id) {
  const list = type === 'khodam' ? State.khodam : State.makhdomen;
  const m    = list.find(x => x.id === id);
  if (!m) return;

  document.getElementById('viewModalTitle').textContent =
    type === 'khodam' ? 'بيانات الخادم' : 'بيانات المخدوم';

  let fields = '';
  if (type === 'khodam') {
    fields = `
      ${vf('الاسم', m.name, true)}
      ${vf('العنوان', m.address, true)}
      ${vf('موبايل', m.phone)}
      ${vf('تاريخ الميلاد', DateUtil.formatDate(m.birthDate))}
      ${vf('المرحلة', m.stage)}
      ${vf('أب الاعتراف', m.confessionFather)}
      ${vf('ملاحظات', m.notes, true)}`;
  } else {
    fields = `
      ${vf('الاسم', m.name, true)}
      ${vf('المنطقة', m.area)}
      ${vf('العنوان', m.address, true)}
      ${vf('تليفون الأب', m.fatherPhone)}
      ${vf('تليفون الأم', m.motherPhone)}
      ${vf('تليفون المخدوم', m.phone)}
      ${vf('تاريخ الميلاد', DateUtil.formatDate(m.birthDate))}
      ${vf('المرحلة', m.stage)}
      ${vf('أب الاعتراف', m.confessionFather)}
      ${vf('الحالة', m.absent === 'yes' ? '<span class="badge badge-absent">غير متواجد</span>' : '<span class="badge badge-present">متواجد</span>')}
      ${vf('ملاحظات', m.notes, true)}`;
  }

  document.getElementById('viewModalBody').innerHTML = `
    <div style="display:flex;align-items:center;gap:16px;margin-bottom:24px;padding-bottom:16px;border-bottom:1px solid var(--sage)">
      <div class="birthday-avatar" style="width:52px;height:52px;font-size:1.1rem">${DateUtil.initials(m.name)}</div>
      <div>
        <div style="font-family:var(--font-display);font-size:1.2rem;color:var(--navy);font-weight:700">${esc(m.name)}</div>
        <div style="font-size:.8rem;color:var(--slate-light);margin-top:2px">${esc(m.stage) || ''}</div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">${fields}</div>`;
  openModal('viewModal');
}

function vf(label, value, full = false) {
  return `<div style="${full ? 'grid-column:1/-1' : ''}">
    <div style="font-size:.72rem;font-weight:700;color:var(--slate-light);margin-bottom:3px">${esc(label)}</div>
    <div style="color:var(--navy);font-size:.9rem">${esc(value) || '—'}</div>
  </div>`;
}

async function saveMember(type) {
  const data       = getFormData(`${type}Form`);
  const existingId = document.getElementById(`${type}FormId`).value;
  if (!data.name)  { toast('الاسم مطلوب', 'error'); return; }
  if (!data.stage) { toast('المرحلة مطلوبة', 'error'); return; }

  // التحقق من رقم الهاتف (اختياري لكن يجب أن يكون مصري صحيح إذا أُدخل)
  if (data.phone && !/^01[0-9]{9}$/.test(data.phone.replace(/\s/g,''))) {
    toast('رقم الموبايل غير صحيح — يجب أن يبدأ بـ 01 ويتكون من 11 رقم', 'error'); return;
  }
  if (data.fatherPhone && !/^01[0-9]{9}$/.test(data.fatherPhone.replace(/\s/g,''))) {
    toast('رقم تليفون الأب غير صحيح', 'error'); return;
  }
  if (data.motherPhone && !/^01[0-9]{9}$/.test(data.motherPhone.replace(/\s/g,''))) {
    toast('رقم تليفون الأم غير صحيح', 'error'); return;
  }

  // التحقق من تاريخ الميلاد (لا يمكن أن يكون في المستقبل)
  if (data.birthDate && new Date(data.birthDate) > new Date()) {
    toast('تاريخ الميلاد لا يمكن أن يكون في المستقبل', 'error'); return;
  }

  const btn = document.querySelector(`#${type}Modal .btn-primary`);
  btn.disabled = true; btn.textContent = 'جارٍ الحفظ…';

  let result;
  if (existingId) {
    data.id = existingId;
    result  = type === 'khodam' ? await API.updateKhodam(data) : await API.updateMakhdomen(data);
  } else {
    result  = type === 'khodam' ? await API.addKhodam(data) : await API.addMakhdomen(data);
  }

  btn.disabled = false; btn.textContent = 'حفظ';

  if (result.success) {
    toast(existingId ? 'تم التعديل بنجاح' : 'تمت الإضافة بنجاح', 'success');
    closeModal(`${type}Modal`);
    await loadMembers(type);
  } else {
    toast(result.error || 'فشل الحفظ', 'error');
  }
}

function deleteMember(type, id) {
  const list   = type === 'khodam' ? State.khodam : State.makhdomen;
  const member = list.find(m => m.id === id);
  confirmAction(`هل تريد حذف "${member?.name || ''}"؟ لا يمكن التراجع عن هذا الإجراء.`, async () => {
    const result = type === 'khodam'
      ? await API.deleteKhodam(id, member?.stage || '')
      : await API.deleteMakhdomen(id, member?.stage || '');
    if (result.success) {
      toast('تم الحذف بنجاح', 'success');
      await loadMembers(type);
    } else {
      toast(result.error || 'فشل الحذف', 'error');
    }
  });
}

async function loadMembers(type) {
  const user  = State.user;
  const stage = user?.stage || '';
  let result;

  if (user?.role === 'admin') {
    result = type === 'khodam' ? await API.getAllKhodam() : await API.getAllMakhdomen();
  } else {
    // الخادم يرسل مرحلته — السيرفر يعرف التاب المجمّع
    result = type === 'khodam'
      ? await API.getKhodam(stage)
      : await API.getMakhdomen(stage); // السيرفر يحوّل مرحلة الخادم → تاب مخدومين
  }

  if (result.success) {
    if (type === 'khodam') State.khodam = result.data || [];
    else State.makhdomen = result.data || [];
    renderMembersTable(type);
    updateDashboardStats();
  } else {
    toast(result.error || 'فشل تحميل البيانات', 'error');
  }
}

async function loadAllMembers() {
  // Use allSettled so one failure doesn't block the other
  await Promise.allSettled([loadMembers('khodam'), loadMembers('makhdomen')]);
}

function initMembersPage(type) {
  // Use a flag to avoid duplicate listeners on bootApp re-run
  const searchEl  = document.getElementById(`${type}Search`);
  const statusEl  = document.getElementById(`${type}StatusFilter`);
  const stageEl   = document.getElementById(`${type}StageFilter`);
  if (searchEl  && !searchEl._init)  { searchEl.addEventListener('input',  () => renderMembersTable(type)); searchEl._init  = true; }
  if (statusEl  && !statusEl._init)  { statusEl.addEventListener('change', () => renderMembersTable(type)); statusEl._init  = true; }
  if (stageEl   && !stageEl._init)   { stageEl.addEventListener('change',  () => renderMembersTable(type)); stageEl._init   = true; }
}

// ── صفحة "بياناتي" للخادم غير المدير ────────────────────────────
async function renderMyData() {
  const user  = State.user;
  const el    = document.getElementById('myDataContent');
  if (!el) return;

  el.innerHTML = `<div class="loading"><div class="spinner"></div> جارٍ التحميل…</div>`;

  // جلب بيانات مرحلة المستخدم
  const result = await API.getKhodam(user.stage || '');
  if (!result.success) {
    el.innerHTML = `<div class="empty-state"><p>${esc(result.error || 'فشل التحميل')}</p></div>`;
    return;
  }

  const members = result.data || [];
  const today   = new Date().toISOString().split('T')[0];
  const ws      = DateUtil.getWeekStart(today);

  // جلب سجلات الحضور
  const attResult = await API.getKhodamAttendance(user.stage || '');
  const att       = attResult.success ? (attResult.data || []) : [];

  // حساب الإحصائيات
  const thisMonth = today.slice(0, 7);
  const monthAtt  = att.filter(a => DateUtil.isSameMonth(a.date, thisMonth));
  const weeks     = [...new Set(monthAtt.map(a => a.week))].sort();

  el.innerHTML = `
    <!-- رأس الصفحة -->
    <div class="card" style="margin-bottom:20px">
      <div class="card-body" style="display:flex;align-items:center;gap:16px">
        <div class="birthday-avatar" style="width:56px;height:56px;font-size:1.2rem">
          ${DateUtil.initials(user.username)}
        </div>
        <div>
          <div style="font-family:var(--font-display);font-size:1.2rem;color:var(--navy);font-weight:700">
            ${user.username}
          </div>
          <div style="font-size:.85rem;color:var(--gold);font-weight:700;margin-top:2px">
            مرحلة ${user.stage || '—'}
          </div>
          <div style="font-size:.78rem;color:var(--slate-light);margin-top:2px">
            ${members.length} خادم في مرحلتك
          </div>
        </div>
      </div>
    </div>

    <!-- إحصائيات سريعة -->
    <div class="stats-grid" style="margin-bottom:20px">
      <div class="stat-card">
        <div class="stat-icon navy">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
        </div>
        <div>
          <div class="stat-value">${members.length}</div>
          <div class="stat-label">عدد الخدام</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon green">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
          </svg>
        </div>
        <div>
          <div class="stat-value">
            ${weeks.length ? Math.round(monthAtt.filter(a=>a.mass==='present').length / (members.length * weeks.length) * 100) + '%' : '—'}
          </div>
          <div class="stat-label">نسبة حضور القداس (الشهر)</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon gold">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
          </svg>
        </div>
        <div>
          <div class="stat-value">
            ${weeks.length ? Math.round(monthAtt.filter(a=>a.khedma==='present').length / (members.length * weeks.length) * 100) + '%' : '—'}
          </div>
          <div class="stat-label">نسبة حضور الخدمة (الشهر)</div>
        </div>
      </div>
    </div>

    <!-- جدول الخدام -->
    <div class="card" style="margin-bottom:20px">
      <div class="card-header">
        <h3>خدام مرحلة ${user.stage || ''}</h3>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th style="text-align:center;width:50px">رقم</th>
              <th>الاسم</th>
              <th>موبايل</th>
              <th>تاريخ الميلاد</th>
              <th>أب الاعتراف</th>
              <th style="text-align:center">QR</th>
            </tr>
          </thead>
          <tbody>
            ${members.length ? members.map((m, i) => `
              <tr style="border-bottom:1px solid var(--sage)">
                <td style="text-align:center;font-weight:700;color:var(--slate-light)">${i+1}</td>
                <td>
                  <div style="display:flex;align-items:center;gap:8px">
                    <div class="birthday-avatar" style="width:28px;height:28px;font-size:.7rem">${DateUtil.initials(m.name)}</div>
                    <span style="font-weight:700">${esc(m.name)}</span>
                  </div>
                </td>
                <td dir="ltr" style="text-align:right">${m.phone || '—'}</td>
                <td>${DateUtil.formatDate(m.birthDate)}</td>
                <td>${m.confessionFather || '—'}</td>
                <td style="text-align:center">
                  <button class="btn-icon" style="color:var(--gold)" onclick="showMemberQR('khodam','${m.id}')">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="3" y="3" width="5" height="5"/><rect x="16" y="3" width="5" height="5"/>
                      <rect x="3" y="16" width="5" height="5"/><path d="M21 16h-3v3M21 21v.01M16 13h2"/>
                    </svg>
                  </button>
                </td>
              </tr>`).join('') : `<tr><td colspan="6"><div class="empty-state"><p>لا يوجد خدام في مرحلتك بعد</p></div></td></tr>`}
          </tbody>
        </table>
      </div>
    </div>

    <!-- سجل الحضور الشهري -->
    <div class="card">
      <div class="card-header">
        <h3>الحضور الشهري — ${new Date().toLocaleDateString('ar-EG',{month:'long',year:'numeric'})}</h3>
      </div>
      <div class="card-body" id="myMonthlyAtt">
        ${weeks.length ? renderMyMonthlyTable(members, monthAtt, weeks) : '<div class="empty-state"><p>لا توجد سجلات حضور هذا الشهر</p></div>'}
      </div>
    </div>`;
}

function renderMyMonthlyTable(members, monthAtt, weeks) {
  const cell = v => v === 'present'
    ? `<div style="width:24px;height:24px;border-radius:50%;background:rgba(39,174,96,.12);color:var(--success);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:.85rem;margin:auto">✓</div>`
    : `<div style="width:24px;height:24px;border-radius:50%;background:rgba(192,57,43,.08);color:var(--danger);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:.85rem;margin:auto">✕</div>`;

  return `<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:.85rem">
    <thead>
      <tr>
        <th style="padding:8px 12px;background:var(--sage);text-align:right">الاسم</th>
        ${weeks.map(w => `<th colspan="2" style="padding:8px 6px;background:var(--sage);text-align:center;border-right:2px solid var(--ivory)">${DateUtil.formatDate(w).split(' ').slice(0,2).join(' ')}</th>`).join('')}
        <th colspan="2" style="padding:8px 10px;background:rgba(30,42,74,.08);text-align:center">الإجمالي</th>
      </tr>
      <tr>
        <th style="padding:5px 12px;background:var(--sage)"></th>
        ${weeks.map(() => `
          <th style="padding:5px 8px;background:var(--sage);font-size:.7rem;text-align:center">قداس</th>
          <th style="padding:5px 8px;background:var(--sage);font-size:.7rem;text-align:center;border-right:2px solid var(--ivory)">خدمة</th>`).join('')}
        <th style="padding:5px 8px;background:rgba(30,42,74,.08);font-size:.7rem;text-align:center">قداس</th>
        <th style="padding:5px 8px;background:rgba(30,42,74,.08);font-size:.7rem;text-align:center">خدمة</th>
      </tr>
    </thead>
    <tbody>
      ${members.map(m => {
        const recs = monthAtt.filter(a => a.memberId === m.id);
        const mp   = recs.filter(r => r.mass   === 'present').length;
        const kp   = recs.filter(r => r.khedma === 'present').length;
        return `<tr style="border-bottom:1px solid var(--sage)">
          <td style="padding:8px 12px;font-weight:700">${esc(m.name)}</td>
          ${weeks.map(w => {
            const rec = monthAtt.find(a => a.memberId === m.id && a.week === w);
            return `<td style="padding:8px 4px;text-align:center">${cell(rec?.mass)}</td>
                    <td style="padding:8px 4px;text-align:center;border-right:2px solid var(--sage)">${cell(rec?.khedma)}</td>`;
          }).join('')}
          <td style="padding:8px 10px;text-align:center;background:rgba(30,42,74,.03);font-weight:700;color:${mp>=weeks.length*.75?'var(--success)':'var(--danger)'}">${mp}/${weeks.length}</td>
          <td style="padding:8px 10px;text-align:center;background:rgba(30,42,74,.03);font-weight:700;color:${kp>=weeks.length*.75?'var(--success)':'var(--danger)'}">${kp}/${weeks.length}</td>
        </tr>`;
      }).join('')}
    </tbody>
  </table></div>`;
}

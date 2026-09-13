// ================================================================
//  وحدة الحضور — تسجيل أسبوعي وعرض شهري
//  الحقول: رقم | اسم الخادم/المخدوم | تاريخ الحضور | قداس | خدمة
// ================================================================

async function loadAllAttendance() {
  const user  = State.user;
  let kaResult;
  if (user?.role === 'admin') {
    // المدير: جلب حضور كل المراحل
    const stages = ['حضانة','أولى وتانية ابتدائي','تالتة ورابعة ابتدائي',
                    'خامسة وسادسة ابتدائي','إعدادي','ثانوي','شباب','خريجين'];
    const results = await Promise.allSettled(stages.map(s => API.getKhodamAttendance(s)));
    const allAtt  = results.flatMap(r => r.status === 'fulfilled' && r.value?.success ? (r.value.data || []) : []);
    State.khodamAttendance = allAtt;
  } else {
    kaResult = await API.getKhodamAttendance(stage);
    if (kaResult.success) State.khodamAttendance = kaResult.data || [];
  }

  // تعيين علامة التحميل
  State._attendanceLoaded = true;

  // حضور المخدومين — حسب المرحلة
  if (user?.role === 'admin') {
    // المدير: يجلب من كل التابات المجمّعة الثمانية
    const tabs = ['حضانة','أولى وتانية ابتدائي','تالتة ورابعة ابتدائي',
                  'خامسة وسادسة ابتدائي','إعدادي','ثانوي','شباب','خريجين'];
    const mResults = await Promise.allSettled(tabs.map(s => API.getMakhdomenAttendance(s)));
    State.makhdomenAttendance = mResults.flatMap(r => r.status === 'fulfilled' && r.value?.success ? (r.value.data || []) : []);
  } else {
    // الخادم: يرسل مرحلته، السيرفر يحوّلها لتاب المخدومين المجمّع
    const ma = await API.getMakhdomenAttendance(user?.stage || '');
    if (ma.success) State.makhdomenAttendance = ma.data || [];
  }
}

// ── كشف الحضور الأسبوعي ──────────────────────────────────────────
function renderWeeklyEntry(type) {
  const dateInput  = document.getElementById(`${type}AttDate`);
  if (!dateInput?.value) return;

  const weekStart  = DateUtil.getWeekStart(dateInput.value);
  const weekEnd    = DateUtil.getWeekEnd(weekStart);
  const members    = type === 'khodam' ? State.khodam : State.makhdomen;
  const attendance = type === 'khodam' ? State.khodamAttendance : State.makhdomenAttendance;
  const label      = type === 'khodam' ? 'الخدام' : 'المخدومين';

  document.getElementById(`${type}WeekLabel`).textContent =
    `الأسبوع: ${DateUtil.formatDate(weekStart)} — ${DateUtil.formatDate(weekEnd)}`;

  const active = (members || []).filter(m => m.status !== 'inactive');

  if (!active.length) {
    document.getElementById(`${type}AttGrid`).innerHTML =
      `<div class="empty-state" style="padding:32px">
        <p>لا يوجد ${label} نشطون في هذه المرحلة</p>
        <p style="font-size:.78rem;color:var(--slate-light);margin-top:6px">يمكن إضافة أعضاء من قسم ${label}</p>
       </div>`;
    return;
  }

  // سجلات هذا الأسبوع
  const existing = {};
  attendance.forEach(a => {
    if (DateUtil.isSameWeek(a.date, weekStart)) existing[a.memberId] = a;
  });

  const nameLabel = type === 'khodam' ? 'اسم الخادم' : 'اسم المخدوم';

  document.getElementById(`${type}AttGrid`).innerHTML = `
    <div style="overflow-x:auto">
      <table style="width:100%;border-collapse:collapse;font-size:.88rem">
        <thead>
          <tr>
            <th style="padding:10px 14px;background:var(--sage);color:var(--slate);font-weight:700;
                       text-align:center;width:50px;border-radius:8px 0 0 0">رقم</th>
            <th style="padding:10px 14px;background:var(--sage);color:var(--slate);font-weight:700;text-align:right">${nameLabel}</th>
            <th style="padding:10px 14px;background:var(--sage);color:var(--slate);font-weight:700;text-align:center;width:160px">تاريخ الحضور</th>
            <th style="padding:10px 14px;background:var(--sage);color:var(--slate);font-weight:700;text-align:center;width:120px">
              <div style="display:flex;align-items:center;justify-content:center;gap:6px">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
                </svg>
                قداس
              </div>
            </th>
            <th style="padding:10px 14px;background:var(--sage);color:var(--slate);font-weight:700;text-align:center;width:120px;border-radius:0 8px 0 0">
              <div style="display:flex;align-items:center;justify-content:center;gap:6px">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
                خدمة
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          ${active.map((m, idx) => {
            const rec    = existing[m.id] || {};
            const mass   = rec.mass   || 'absent';
            const khedma = rec.khedma || 'absent';
            return `
            <tr style="border-bottom:1px solid var(--sage);transition:background .15s"
                onmouseover="this.style.background='#f5f8ff'"
                onmouseout="this.style.background=''">
              <td style="padding:10px 14px;text-align:center;font-weight:700;color:var(--slate-light)">${idx + 1}</td>
              <td style="padding:10px 14px">
                <div style="display:flex;align-items:center;gap:8px">
                  <div class="birthday-avatar" style="width:28px;height:28px;font-size:.7rem;flex-shrink:0">
                    ${DateUtil.initials(m.name)}
                  </div>
                  <span style="font-weight:700">${m.name}</span>
                </div>
              </td>
              <td style="padding:10px 14px;text-align:center">
                <input type="date" id="attDate_${type}_${m.id}"
                  value="${rec.date || dateInput.value}"
                  class="form-control" style="padding:5px 8px;font-size:.82rem;width:140px;margin:auto">
              </td>
              <td style="padding:10px 14px;text-align:center">
                <div class="toggle-check">
                  <label class="check-label">
                    <input type="checkbox" id="mass_${type}_${m.id}"
                      ${mass === 'present' ? 'checked' : ''}
                      onchange="updateCheckStyle(this,'mass')">
                    <span class="check-box mass-check ${mass === 'present' ? 'checked' : ''}">
                      ${mass === 'present' ? '✓' : '—'}
                    </span>
                  </label>
                </div>
              </td>
              <td style="padding:10px 14px;text-align:center">
                <div class="toggle-check">
                  <label class="check-label">
                    <input type="checkbox" id="khedma_${type}_${m.id}"
                      ${khedma === 'present' ? 'checked' : ''}
                      onchange="updateCheckStyle(this,'khedma')">
                    <span class="check-box khedma-check ${khedma === 'present' ? 'checked' : ''}">
                      ${khedma === 'present' ? '✓' : '—'}
                    </span>
                  </label>
                </div>
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>`;
}

function updateCheckStyle(checkbox, type) {
  const span = checkbox.nextElementSibling;
  if (checkbox.checked) {
    span.classList.add('checked');
    span.textContent = '✓';
  } else {
    span.classList.remove('checked');
    span.textContent = '—';
  }
}

async function saveWeeklyAttendance(type) {
  const dateInput = document.getElementById(`${type}AttDate`);
  if (!dateInput?.value) { toast('يرجى اختيار تاريخ أولاً', 'error'); return; }

  const members    = type === 'khodam' ? State.khodam : State.makhdomen;
  const attendance = type === 'khodam' ? State.khodamAttendance : State.makhdomenAttendance;
  const weekStart  = DateUtil.getWeekStart(dateInput.value);
  const active     = members.filter(m => m.status !== 'inactive');

  if (!active.length) { toast('لا يوجد أعضاء نشطون', 'error'); return; }

  const btn = document.getElementById(`${type}SaveAttBtn`);
  btn.disabled = true; btn.textContent = 'جارٍ الحفظ…';

  const promises = active.map(async m => {
    const massEl   = document.getElementById(`mass_${type}_${m.id}`);
    const khedmaEl = document.getElementById(`khedma_${type}_${m.id}`);
    const dateEl   = document.getElementById(`attDate_${type}_${m.id}`);

    const mass   = massEl?.checked   ? 'present' : 'absent';
    const khedma = khedmaEl?.checked ? 'present' : 'absent';
    const date   = dateEl?.value || dateInput.value;

    const existing = attendance.find(a =>
      a.memberId === m.id && DateUtil.isSameWeek(a.date, weekStart));

    const payload = {
      memberId:   m.id,
      memberName: m.name,
      stage:      m.stage || '',
      date,
      week:   weekStart,
      mass,
      khedma,
    };

    if (existing) {
      payload.id = existing.id;
      return type === 'khodam'
        ? API.updateKhodamAttendance(payload)
        : API.updateMakhdomenAttendance(payload);
    } else {
      return type === 'khodam'
        ? API.addKhodamAttendance(payload)
        : API.addMakhdomenAttendance(payload);
    }
  });

  const results = await Promise.allSettled(promises);
  const failed  = results.filter(r => r.status === 'rejected' || r.value?.success === false).length;
  if (failed > 0) toast(`تحذير: فشل حفظ ${failed} سجل — حاول مجدداً`, 'error');
  await loadAllAttendance();
  renderMonthlyView(type);

  btn.disabled = false; btn.textContent = 'حفظ الحضور';
  toast(`تم حفظ حضور ${active.length} عضو بنجاح`, 'success');
}

// ── العرض الشهري ─────────────────────────────────────────────────
function renderMonthlyView(type) {
  const monthInput = document.getElementById(`${type}MonthPicker`);
  if (!monthInput?.value) return;

  const month      = monthInput.value;
  const members    = type === 'khodam' ? State.khodam : State.makhdomen;
  const attendance = type === 'khodam' ? State.khodamAttendance : State.makhdomenAttendance;
  const nameLabel  = type === 'khodam' ? 'اسم الخادم' : 'اسم المخدوم';

  const monthAtt = attendance.filter(a => DateUtil.isSameMonth(a.date, month));
  const weeks    = [...new Set(monthAtt.map(a => a.week))].sort();

  if (!members.length) {
    document.getElementById(`${type}MonthlyTable`).innerHTML =
      `<div class="empty-state"><p>لا يوجد أعضاء</p></div>`;
    return;
  }

  if (!weeks.length) {
    document.getElementById(`${type}MonthlyTable`).innerHTML =
      `<div class="empty-state"><p>لا توجد سجلات حضور لهذا الشهر</p></div>`;
    return;
  }

  // ملخص لكل عضو
  const summary = members.map((m, idx) => {
    const records     = monthAtt.filter(a => a.memberId === m.id);
    const massPresent = records.filter(r => r.mass   === 'present').length;
    const khedmaPresent = records.filter(r => r.khedma === 'present').length;
    const total       = weeks.length;
    return { ...m, idx: idx + 1, records, massPresent, khedmaPresent, total,
      massPct:   total ? Math.round(massPresent   / total * 100) : 0,
      khedmaPct: total ? Math.round(khedmaPresent / total * 100) : 0,
    };
  });

  document.getElementById(`${type}MonthlyTable`).innerHTML = `
    <div style="overflow-x:auto">
      <table style="width:100%;border-collapse:collapse;font-size:.85rem">
        <thead>
          <tr>
            <th style="padding:10px 14px;background:var(--sage);color:var(--slate);font-weight:700;text-align:center;width:50px">رقم</th>
            <th style="padding:10px 14px;background:var(--sage);color:var(--slate);font-weight:700;text-align:right">${nameLabel}</th>
            ${weeks.map(w => `
              <th colspan="2" style="padding:10px 8px;background:var(--sage);color:var(--slate);
                  font-weight:700;text-align:center;border-right:2px solid var(--ivory)">
                ${DateUtil.formatDate(w).split(' ').slice(0,2).join(' ')}
              </th>`).join('')}
            <th colspan="2" style="padding:10px 12px;background:rgba(30,42,74,.08);color:var(--navy);font-weight:700;text-align:center">
              الإجمالي
            </th>
          </tr>
          <tr>
            <th style="padding:6px;background:var(--sage)"></th>
            <th style="padding:6px;background:var(--sage)"></th>
            ${weeks.map(() => `
              <th style="padding:6px 10px;background:var(--sage);color:var(--slate-light);font-size:.72rem;font-weight:700;text-align:center">قداس</th>
              <th style="padding:6px 10px;background:var(--sage);color:var(--slate-light);font-size:.72rem;font-weight:700;text-align:center;border-right:2px solid var(--ivory)">خدمة</th>
            `).join('')}
            <th style="padding:6px 10px;background:rgba(30,42,74,.08);color:var(--navy);font-size:.72rem;font-weight:700;text-align:center">قداس</th>
            <th style="padding:6px 10px;background:rgba(30,42,74,.08);color:var(--navy);font-size:.72rem;font-weight:700;text-align:center">خدمة</th>
          </tr>
        </thead>
        <tbody>
          ${summary.map(m => `
            <tr style="border-bottom:1px solid var(--sage)">
              <td style="padding:10px 14px;text-align:center;font-weight:700;color:var(--slate-light)">${m.idx}</td>
              <td style="padding:10px 14px">
                <div style="display:flex;align-items:center;gap:8px">
                  <div class="birthday-avatar" style="width:26px;height:26px;font-size:.65rem">${DateUtil.initials(m.name)}</div>
                  <span style="font-weight:700">${m.name}</span>
                </div>
              </td>
              ${weeks.map(w => {
                const rec = monthAtt.find(a => a.memberId === m.id && a.week === w);
                const massVal   = rec?.mass   || 'absent';
                const khedmaVal = rec?.khedma || 'absent';
                return `
                  <td style="padding:10px 8px;text-align:center">
                    ${attCell(massVal)}
                  </td>
                  <td style="padding:10px 8px;text-align:center;border-right:2px solid var(--sage)">
                    ${attCell(khedmaVal)}
                  </td>`;
              }).join('')}
              <td style="padding:10px 12px;text-align:center;background:rgba(30,42,74,.03)">
                <div style="font-weight:700;color:${m.massPct>=75?'var(--success)':m.massPct>=50?'var(--warning)':'var(--danger)'}">
                  ${m.massPresent}/${m.total}
                </div>
                <div style="font-size:.72rem;color:var(--slate-light)">${m.massPct}%</div>
              </td>
              <td style="padding:10px 12px;text-align:center;background:rgba(30,42,74,.03)">
                <div style="font-weight:700;color:${m.khedmaPct>=75?'var(--success)':m.khedmaPct>=50?'var(--warning)':'var(--danger)'}">
                  ${m.khedmaPresent}/${m.total}
                </div>
                <div style="font-size:.72rem;color:var(--slate-light)">${m.khedmaPct}%</div>
              </td>
            </tr>`).join('')}
        </tbody>
        <tfoot>
          <tr style="background:var(--sage)">
            <td colspan="2" style="padding:10px 14px;font-weight:700;color:var(--navy)">الإجمالي</td>
            ${weeks.map(w => {
              const wRecs = monthAtt.filter(a => a.week === w);
              const mTotal = members.length;
              const mMass   = wRecs.filter(r => r.mass   === 'present').length;
              const mKhedma = wRecs.filter(r => r.khedma === 'present').length;
              return `
                <td style="padding:10px 8px;text-align:center">
                  <div style="font-weight:700;color:var(--navy)">${mMass}</div>
                  <div style="font-size:.7rem;color:var(--slate-light)">${mTotal?Math.round(mMass/mTotal*100):0}%</div>
                </td>
                <td style="padding:10px 8px;text-align:center;border-right:2px solid var(--ivory)">
                  <div style="font-weight:700;color:var(--navy)">${mKhedma}</div>
                  <div style="font-size:.7rem;color:var(--slate-light)">${mTotal?Math.round(mKhedma/mTotal*100):0}%</div>
                </td>`;
            }).join('')}
            <td colspan="2" style="padding:10px 12px;text-align:center;background:rgba(30,42,74,.06)">
              <div style="font-size:.78rem;color:var(--slate-light);font-weight:600">${weeks.length} أسبوع</div>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>`;
}

function attCell(val) {
  if (val === 'present') {
    return `<div style="width:28px;height:28px;border-radius:50%;background:rgba(39,174,96,.12);
              color:var(--success);display:flex;align-items:center;justify-content:center;
              font-weight:700;font-size:.9rem;margin:auto">✓</div>`;
  }
  return `<div style="width:28px;height:28px;border-radius:50%;background:rgba(192,57,43,.08);
            color:var(--danger);display:flex;align-items:center;justify-content:center;
            font-weight:700;font-size:.9rem;margin:auto">✕</div>`;
}

// ── سجل الغياب ───────────────────────────────────────────────────
function renderAbsentRecords(mode) {
  const type       = document.getElementById('absentTypeFilter')?.value || 'khodam';
  const attendance = type === 'khodam' ? State.khodamAttendance : State.makhdomenAttendance;
  const typeLabel  = type === 'khodam' ? 'خادم' : 'مخدوم';

  let filtered = [];

  if (mode === 'weekly') {
    const dateVal = document.getElementById('absentWeekPicker')?.value;
    if (!dateVal) return;
    const ws = DateUtil.getWeekStart(dateVal);
    // غياب = لم يحضر قداساً ولا خدمة
    filtered = attendance.filter(a =>
      DateUtil.isSameWeek(a.date, ws) &&
      (a.mass !== 'present' || a.khedma !== 'present'));
    document.getElementById('absentWeekLabel').textContent =
      `أسبوع: ${DateUtil.formatDate(ws)}`;
  } else {
    const monthVal = document.getElementById('absentMonthPicker')?.value;
    if (!monthVal) return;
    filtered = attendance.filter(a =>
      DateUtil.isSameMonth(a.date, monthVal) &&
      (a.mass !== 'present' || a.khedma !== 'present'));
    document.getElementById('absentMonthLabel').textContent =
      DateUtil.getMonthYear(monthVal);
  }

  const tbody = document.getElementById('absentTbody');

  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="6">
      <div class="empty-state">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M9 11l3 3L22 4"/>
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
        </svg>
        <p>لا توجد سجلات غياب</p>
      </div></td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map((a, idx) => `
    <tr style="border-bottom:1px solid var(--sage)">
      <td style="text-align:center;font-weight:700;color:var(--slate-light)">${idx + 1}</td>
      <td>
        <div style="display:flex;align-items:center;gap:8px">
          <div class="birthday-avatar" style="width:28px;height:28px;font-size:.7rem">
            ${DateUtil.initials(a.memberName)}
          </div>
          <span style="font-weight:700">${esc(a.memberName) || '—'}</span>
        </div>
      </td>
      <td><span class="badge" style="background:rgba(30,42,74,.08);color:var(--navy)">${typeLabel}</span></td>
      <td>${DateUtil.formatDate(a.date)}</td>
      <td style="text-align:center">
        ${a.mass === 'present'
          ? '<span class="badge badge-present">حاضر</span>'
          : '<span class="badge badge-absent">غائب</span>'}
      </td>
      <td style="text-align:center">
        ${a.khedma === 'present'
          ? '<span class="badge badge-present">حاضر</span>'
          : '<span class="badge badge-absent">غائب</span>'}
      </td>
    </tr>`).join('');
}

// ── تهيئة الأحداث ────────────────────────────────────────────────
function initAttendance() {
  // Guard against duplicate listeners on re-init
  const addListener = (id, event, fn) => {
    const el = document.getElementById(id);
    if (el && !el[`_att_${event}`]) {
      el.addEventListener(event, fn);
      el[`_att_${event}`] = true;
    }
  };

  ['khodam','makhdomen'].forEach(type => {
    addListener(`${type}AttDate`,     'change', () => renderWeeklyEntry(type));
    addListener(`${type}MonthPicker`, 'change', () => renderMonthlyView(type));
  });

  addListener('absentTypeFilter', 'change', () => {
    const mode = document.querySelector('[data-group="absent"] .section-tab.active')?.dataset.tab === 'absentWeekly'
      ? 'weekly' : 'monthly';
    renderAbsentRecords(mode);
  });
  addListener('absentWeekPicker',  'change', () => renderAbsentRecords('weekly'));
  addListener('absentMonthPicker', 'change', () => renderAbsentRecords('monthly'));
}

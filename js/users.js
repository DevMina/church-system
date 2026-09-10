// ================================================================
//  وحدة إدارة المستخدمين — الطلبات المعلقة + المستخدمين النشطين
// ================================================================

// Cache للمستخدمين — يُستخدم للبحث الآمن بدل تمرير JSON في onclick
let _cachedUsers   = [];
let _cachedPending = [];

async function loadUsersPage() {
  const el = document.getElementById('usersPageContent');
  if (!el) return;
  el.innerHTML = `<div class="loading"><div class="spinner"></div> جارٍ التحميل…</div>`;

  const [pendingRes, usersRes] = await Promise.allSettled([
    API.getPendingUsers(),
    API.getUsers(),
  ]);

  const pending = pendingRes.status === 'fulfilled' ? pendingRes.value : { success: false };
  const users   = usersRes.status   === 'fulfilled' ? usersRes.value   : { success: false };

  if (!pending.success) toast('تعذّر تحميل طلبات التسجيل', 'error');
  if (!users.success)   toast('تعذّر تحميل المستخدمين', 'error');

  const pendingData = pending.success ? (pending.data || []) : [];
  const usersData   = users.success   ? (users.data   || []) : [];

  _cachedUsers   = usersData;
  _cachedPending = pendingData;

  el.innerHTML = `
    <!-- طلبات التسجيل المعلقة -->
    <div class="card" style="margin-bottom:24px">
      <div class="card-header">
        <h3 style="display:flex;align-items:center;gap:10px">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          طلبات التسجيل المعلقة
          ${pendingData.length
            ? `<span style="background:var(--danger);color:white;border-radius:20px;
                            padding:2px 9px;font-size:.75rem;font-weight:700">${pendingData.length}</span>`
            : ''}
        </h3>
      </div>
      <div id="pendingList">
        ${pendingData.length ? renderPendingTable(pendingData) : `
          <div class="empty-state" style="padding:32px">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="opacity:.3;margin-bottom:10px">
              <path d="M9 11l3 3L22 4"/>
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
            </svg>
            <p>لا توجد طلبات معلقة</p>
          </div>`}
      </div>
    </div>

    <!-- المستخدمون النشطون -->
    <div class="card">
      <div class="card-header">
        <h3>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle;margin-left:6px">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          المستخدمون النشطون
        </h3>
        <button class="btn btn-gold btn-sm" onclick="openAddUserModal()">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          إضافة مستخدم
        </button>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th style="width:50px;text-align:center">رقم</th>
              <th>اسم المستخدم</th>
              <th>البريد الإلكتروني</th>
              <th>الصلاحية</th>
              <th>المرحلة</th>
              <th>تاريخ الإنشاء</th>
              <th style="text-align:center">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            ${usersData.length ? usersData.map((u, i) => `
              <tr style="border-bottom:1px solid var(--sage)">
                <td style="text-align:center;font-weight:700;color:var(--slate-light)">${i+1}</td>
                <td>
                  <div style="display:flex;align-items:center;gap:8px">
                    <div class="user-avatar" style="width:30px;height:30px;font-size:.75rem;background:var(--navy)">
                      ${(u.username||'م')[0].toUpperCase()}
                    </div>
                    <span style="font-weight:700">${esc(u.username)}</span>
                    ${u.id === State.user?.id ? '<span style="font-size:.7rem;color:var(--gold);font-weight:700">(أنت)</span>' : ''}
                  </div>
                </td>
                <td style="color:var(--slate);font-size:.85rem" dir="ltr">${esc(u.email) || '—'}</td>
                <td>
                  <span class="badge ${u.role === 'admin' ? 'badge-active' : 'badge-excuse'}">
                    ${u.role === 'admin' ? 'مدير' : 'خادم'}
                  </span>
                </td>
                <td style="font-size:.85rem;color:var(--slate)">${esc(u.stage) || '—'}</td>
                <td style="font-size:.82rem;color:var(--slate-light)">${DateUtil.formatDate(u.createdAt)}</td>
                <td style="text-align:center">
                  <div class="actions-cell" style="justify-content:center">
                    <button class="btn-icon" title="تعديل" onclick="openEditUserModalById('${u.id}')">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>
                    ${u.id !== State.user?.id ? `
                    <button class="btn-icon danger" title="حذف" onclick="deleteUserConfirm('${u.id}','${u.username}')">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                        <path d="M10 11v6M14 11v6"/>
                      </svg>
                    </button>` : ''}
                  </div>
                </td>
              </tr>`).join('') : `
              <tr><td colspan="7"><div class="empty-state" style="padding:32px"><p>لا يوجد مستخدمون</p></div></td></tr>`}
          </tbody>
        </table>
      </div>
    </div>`;
}

// ── جدول الطلبات المعلقة ──────────────────────────────────────────
function renderPendingTable(data) {
  return `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th style="width:50px;text-align:center">رقم</th>
            <th>اسم المستخدم</th>
            <th>البريد الإلكتروني</th>
            <th>الصلاحية المطلوبة</th>
            <th>المرحلة</th>
            <th>تاريخ الطلب</th>
            <th style="text-align:center">الإجراء</th>
          </tr>
        </thead>
        <tbody>
          ${data.map((u, i) => `
            <tr style="border-bottom:1px solid var(--sage);background:rgba(230,126,34,.03)">
              <td style="text-align:center;font-weight:700;color:var(--slate-light)">${i+1}</td>
              <td>
                <div style="display:flex;align-items:center;gap:8px">
                  <div class="user-avatar" style="width:30px;height:30px;font-size:.75rem;background:var(--warning)">
                    ${esc((u.username||'م')[0].toUpperCase())}
                  </div>
                  <span style="font-weight:700">${esc(u.username)}</span>
                </div>
              </td>
              <td style="color:var(--slate);font-size:.85rem" dir="ltr">${esc(u.email) || '—'}</td>
              <td>
                <span class="badge badge-excuse">
                  ${u.role === 'admin' ? 'مدير' : 'خادم'}
                </span>
              </td>
              <td style="font-size:.85rem;color:var(--slate)">${esc(u.stage) || '—'}</td>
              <td style="font-size:.82rem;color:var(--slate-light)">${DateUtil.formatDate(u.requestedAt)}</td>
              <td>
                <div class="actions-cell" style="justify-content:center;gap:6px">
                  <button class="btn btn-sm" onclick="approvePending('${u.id}','${u.username}','${u.role}','${u.stage}')"
                    style="background:var(--success);color:white;padding:5px 12px">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    موافقة
                  </button>
                  <button class="btn btn-sm btn-danger" onclick="rejectPending('${u.id}','${u.username}')">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                    رفض
                  </button>
                </div>
              </td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

// ── الموافقة على طلب ──────────────────────────────────────────────
async function approvePending(id, username, role, stage) {
  // فتح مودال الموافقة للتأكيد وتعديل الصلاحية/المرحلة إن لزم
  document.getElementById('approveUserId').value       = id;
  document.getElementById('approveUsername').textContent = username;
  document.getElementById('approveRole').value         = role || 'user';
  document.getElementById('approveStage').value        = stage || '';
  toggleApproveStage();
  openModal('approveModal');
}

function toggleApproveStage() {
  const role  = document.getElementById('approveRole')?.value;
  const wrap  = document.getElementById('approveStageWrap');
  if (wrap) wrap.style.display = role === 'admin' ? 'none' : 'block';
}

async function confirmApprove() {
  const id    = document.getElementById('approveUserId').value;
  const role  = document.getElementById('approveRole').value;
  const stage = document.getElementById('approveStage').value;

  if (role !== 'admin' && !stage) {
    toast('يرجى اختيار المرحلة', 'error');
    return;
  }

  const btn = document.getElementById('confirmApproveBtn');
  btn.disabled = true; btn.textContent = 'جارٍ الموافقة…';

  const result = await API.approveUser({ id, role, stage });
  btn.disabled = false; btn.textContent = 'تأكيد الموافقة';

  if (result.success) {
    toast(result.message || 'تمت الموافقة', 'success');
    closeModal('approveModal');
    loadUsersPage();
  } else {
    toast(result.error || 'فشلت العملية', 'error');
  }
}

// ── رفض طلب ──────────────────────────────────────────────────────
async function rejectPending(id, username) {
  confirmAction(`هل تريد رفض طلب "${username}"؟`, async () => {
    const result = await API.rejectUser({ id });
    if (result.success) {
      toast(result.message || 'تم الرفض', 'success');
      loadUsersPage();
    } else {
      toast(result.error || 'فشلت العملية', 'error');
    }
  });
}

// ── إضافة مستخدم مباشر ───────────────────────────────────────────
function openAddUserModal() {
  document.getElementById('userFormMode').value = 'add';
  document.getElementById('userFormId').value   = '';
  document.getElementById('userModalTitle').textContent = 'إضافة مستخدم';
  document.getElementById('userNewPassword').placeholder = 'كلمة المرور (مطلوبة)';
  document.getElementById('userNewPassword').required    = true;
  resetForm('userForm');
  toggleUserStage();
  openModal('userModal');
}

function openEditUserModalById(id) {
  const user = _cachedUsers.find(u => u.id === id);
  if (!user) { toast('المستخدم غير موجود', 'error'); return; }
  openEditUserModal(user);
}

function openEditUserModal(user) {
  document.getElementById('userFormMode').value = 'edit';
  document.getElementById('userFormId').value   = user.id;
  document.getElementById('userModalTitle').textContent = 'تعديل مستخدم';
  document.getElementById('userNewPassword').placeholder = 'اتركه فارغاً للإبقاء على كلمة المرور الحالية';
  document.getElementById('userNewPassword').required    = false;

  document.getElementById('userUsername').value = user.username || '';
  document.getElementById('userEmail').value    = user.email    || '';
  document.getElementById('userRole').value     = user.role     || 'user';
  document.getElementById('userStage').value    = user.stage    || '';
  document.getElementById('userNewPassword').value = '';
  toggleUserStage();
  openModal('userModal');
}

function toggleUserStage() {
  const role = document.getElementById('userRole')?.value;
  const wrap = document.getElementById('userStageWrap');
  if (wrap) wrap.style.display = role === 'admin' ? 'none' : 'block';
}

async function saveUser() {
  const mode     = document.getElementById('userFormMode').value;
  const id       = document.getElementById('userFormId').value;
  const username = document.getElementById('userUsername').value.trim();
  const email    = document.getElementById('userEmail').value.trim();
  const role     = document.getElementById('userRole').value;
  const stage    = document.getElementById('userStage').value;
  const pwd      = document.getElementById('userNewPassword').value;

  if (!username || username.length < 3) { toast('اسم المستخدم يجب أن يكون 3 أحرف على الأقل', 'error'); return; }
  if (!email || !email.includes('@'))  { toast('يرجى إدخال بريد إلكتروني صحيح', 'error'); return; }
  if (mode === 'add' && pwd.length < 6) { toast('كلمة المرور يجب أن تكون 6 أحرف على الأقل', 'error'); return; }
  if (mode === 'add' && !pwd)           { toast('كلمة المرور مطلوبة', 'error'); return; }
  if (role !== 'admin' && !stage)       { toast('يرجى اختيار المرحلة', 'error'); return; }

  const btn = document.getElementById('saveUserBtn');
  btn.disabled = true; btn.textContent = 'جارٍ الحفظ…';

  let result;
  if (mode === 'add') {
    result = await API.call('register', { username, email, password: pwd, role, stage });
  } else {
    const payload = { id, username, email, role, stage };
    if (pwd) payload.newPassword = pwd;
    result = await API.updateUser(payload);
  }

  btn.disabled = false; btn.textContent = 'حفظ';

  if (result.success) {
    toast(mode === 'add' ? 'تم إضافة المستخدم' : 'تم التعديل', 'success');
    closeModal('userModal');
    loadUsersPage();
  } else {
    toast(result.error || 'فشل الحفظ', 'error');
  }
}

async function deleteUserConfirm(id, username) {
  confirmAction(`هل تريد حذف المستخدم "${username}"؟ لا يمكن التراجع.`, async () => {
    const result = await API.deleteUser({ id });
    if (result.success) {
      toast('تم حذف المستخدم', 'success');
      loadUsersPage();
    } else {
      toast(result.error || 'فشل الحذف', 'error');
    }
  });
}

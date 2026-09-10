// ================================================================
//  وحدة التطبيق الرئيسية — التوجيه والمصادقة والتهيئة
// ================================================================

// ── مصادقة المستخدم ───────────────────────────────────────────────
function switchAuthTab(tab) {
  const tabs = ['login','register','forgot'];
  document.querySelectorAll('.auth-tab').forEach((t, i) => {
    t.classList.toggle('active', tabs[i] === tab);
  });
  document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
  document.getElementById(`${tab}Form`).classList.add('active');
  document.querySelectorAll('.alert').forEach(a => a.classList.remove('show'));
}

async function handleLogin(e) {
  e.preventDefault();
  const username = e.target.username.value.trim();
  const password = e.target.password.value;
  const errEl    = document.getElementById('loginError');
  errEl.classList.remove('show');

  if (!username || !password) {
    errEl.textContent = 'يرجى إدخال اسم المستخدم وكلمة المرور';
    errEl.classList.add('show');
    return;
  }

  const btn = document.getElementById('loginBtn');
  btn.disabled = true; btn.textContent = 'جارٍ تسجيل الدخول…';

  const result = await API.login({ username, password });
  btn.disabled = false; btn.textContent = 'تسجيل الدخول';

  if (result.success) {
    const { sessionToken, ...user } = result.data;
    Auth.login(user, sessionToken);
    window._sessionWarnShown = false;
    await bootApp();
  } else {
    errEl.textContent = result.error || 'اسم المستخدم أو كلمة المرور غير صحيحة';
    errEl.classList.add('show');
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const role  = e.target.role.value;
  const stage = e.target.stage?.value || '';
  const data  = {
    username: e.target.username.value.trim(),
    email:    e.target.email.value.trim(),
    password: e.target.password.value,
    role,
    stage,
  };
  const errEl = document.getElementById('registerError');
  const sucEl = document.getElementById('registerSuccess');
  errEl.classList.remove('show'); sucEl.classList.remove('show');

  if (data.password.length < 6) {
    errEl.textContent = 'كلمة المرور يجب أن تكون 6 أحرف على الأقل';
    errEl.classList.add('show');
    return;
  }
  if (role !== 'admin' && !stage) {
    errEl.textContent = 'يرجى اختيار مرحلة الخدمة';
    errEl.classList.add('show');
    return;
  }

  const btn = document.getElementById('registerBtn');
  btn.disabled = true; btn.textContent = 'جارٍ الإرسال…';

  const result = await API.call('registerRequest', data);
  btn.disabled = false; btn.textContent = 'إرسال طلب التسجيل';

  if (result.success) {
    sucEl.textContent = 'تم إرسال طلب التسجيل بنجاح ✓ سيتم تفعيل حسابك بعد موافقة المدير.';
    sucEl.classList.add('show');
    e.target.reset();
    toggleStageField();
    setTimeout(() => switchAuthTab('login'), 2000);
  } else {
    errEl.textContent = result.error || 'فشل إنشاء الحساب';
    errEl.classList.add('show');
  }
}

// إظهار/إخفاء حقل المرحلة حسب الصلاحية
function toggleStageField() {
  const role = document.getElementById('registerRole')?.value;
  const wrap = document.getElementById('stageFieldWrap');
  if (wrap) wrap.style.display = role === 'admin' ? 'none' : 'block';
}

async function handleForgot(e) {
  e.preventDefault();
  const email = e.target.email.value.trim();
  const errEl = document.getElementById('forgotError');
  const sucEl = document.getElementById('forgotSuccess');
  errEl.classList.remove('show'); sucEl.classList.remove('show');

  const btn = document.getElementById('forgotBtn');
  btn.disabled = true; btn.textContent = 'جارٍ البحث…';

  const result = await API.forgotPassword({ email });
  btn.disabled = false; btn.textContent = 'إرسال';

  if (result.success) {
    sucEl.textContent = result.message;
    sucEl.classList.add('show');
  } else {
    errEl.textContent = result.error || 'البريد الإلكتروني غير موجود';
    errEl.classList.add('show');
  }
}

// ── التنقل بين الصفحات ───────────────────────────────────────────
async function navigate(page) {
  showPage(page);
  closeSidebar();
  switch (page) {
    case 'dashboard': updateDashboardStats(); break;
    case 'khodam':    renderMembersTable('khodam'); break;
    case 'makhdomen': renderMembersTable('makhdomen'); break;
    case 'attendance': break; // user selects date to load
    case 'absent':     break; // user selects date/month to load
    case 'birthdays':  renderBirthdays(); break;
    case 'qrscan': initQrScanPage(); renderTodayAttendance(); break;
    case 'mydata': renderMyData(); break; // async — intentionally not awaited in navigate
    case 'users': loadUsersPage(); break;
  }
}

// ── الشريط الجانبي (موبايل) ──────────────────────────────────────
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebarOverlay').classList.toggle('show');
}

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('show');
}

// ── تحديث البيانات ───────────────────────────────────────────────
async function refreshAllData() {
  toast('جارٍ التحديث…', 'info');
  await Promise.all([loadAllMembers(), loadAllAttendance()]);

  // إعادة رندر الصفحة الحالية
  const activePage = document.querySelector('.page-section.active')?.id?.replace('page-','');
  switch (activePage) {
    case 'dashboard':  updateDashboardStats(); break;
    case 'khodam':     renderMembersTable('khodam'); break;
    case 'makhdomen':  renderMembersTable('makhdomen'); break;
    case 'attendance': break; // user selects date to load
    case 'absent':     break; // user selects date/month to load
    case 'birthdays':  renderBirthdays(); break;
    case 'mydata':     renderMyData(); break;
    case 'attendance': break; // user re-selects date
    default: updateDashboardStats();
  }
  toast('تم تحديث البيانات', 'success');
}

// ── تبويبات الأقسام ──────────────────────────────────────────────
function initAllSectionTabs() {
  document.querySelectorAll('.section-tabs').forEach(tabGroup => {
    tabGroup.querySelectorAll('.section-tab').forEach(tab => {
      if (tab._tabInit) return;
      tab._tabInit = true;
      tab.addEventListener('click', () => {
        const group  = tabGroup.dataset.group;
        const target = tab.dataset.tab;

        tabGroup.querySelectorAll('.section-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        document.querySelectorAll(`[data-tab-content][data-group="${group}"]`).forEach(c => {
          c.style.display = c.dataset.tabContent === target ? 'block' : 'none';
        });

        if (group === 'absent') {
          renderAbsentRecords(target === 'absentWeekly' ? 'weekly' : 'monthly');
        }
      });
    });
  });
}

// ── مؤقت الجلسة ──────────────────────────────────────────────────
function startSessionTimer() {
  if (window._sessionTimerId) clearInterval(window._sessionTimerId);
  window._sessionTimerId = setInterval(() => {
    try {
      const stored = sessionStorage.getItem('cms_session');
      if (!stored) { clearInterval(window._sessionTimerId); return; }
      const { expiresAt } = JSON.parse(stored);
      const remaining = expiresAt - Date.now();
      if (remaining <= 0) {
        clearInterval(window._sessionTimerId);
        toast('انتهت مدة الجلسة. يرجى تسجيل الدخول مجدداً.', 'error');
        Auth.logout(false);
        return;
      }
      if (remaining < 10 * 60 * 1000 && !window._sessionWarnShown) {
        window._sessionWarnShown = true;
        toast('ستنتهي جلستك خلال 10 دقائق — أي تفاعل يجدد الجلسة', 'info');
      }
    } catch { clearInterval(window._sessionTimerId); }
  }, 30 * 1000);
}

// ── تشغيل التطبيق ────────────────────────────────────────────────
async function bootApp() {
  if (!Auth.isLoggedIn()) {
    showPage('auth');
    return;
  }

  const user = State.user;

  // معلومات المستخدم في الشريط الجانبي
  document.getElementById('sidebarUsername').textContent = user.username || 'مستخدم';
  document.getElementById('sidebarRole').textContent =
    user.role === 'admin' ? 'مدير' : (user.stage || 'خادم');
  document.getElementById('sidebarAvatar').textContent =
    (user.username || 'م')[0].toUpperCase();

  // إظهار/إخفاء عناصر حسب الدور
  if (user.role !== 'admin') {
    // إخفاء أزرار الإضافة والحذف
    document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');
    // إظهار "بياناتي" وإخفاء صفحة الخدام العامة
    document.querySelectorAll('.user-only').forEach(el => el.style.display = 'flex');
  } else {
    // المدير يرى كل شيء
    document.querySelectorAll('.admin-only').forEach(el => el.style.display = '');
    document.querySelectorAll('.user-only').forEach(el => el.style.display = 'none');
  }

  // التاريخ
  document.getElementById('pageDate').textContent = new Date().toLocaleDateString('ar-EG', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  toast('جارٍ تحميل البيانات…', 'info');
  await Promise.all([loadAllMembers(), loadAllAttendance()]);

  // عرض الصفحة الصحيحة بعد تحميل البيانات
  if (user.role !== 'admin') {
    showPage('mydata');
    await renderMyData();
  } else {
    showPage('dashboard');
    updateDashboardStats();
  }

  initMembersPage('khodam');
  initMembersPage('makhdomen');
  initAttendance();
  initBirthdays();
  initAllSectionTabs();
  startSessionTimer();
}

// ── شريط تحذير الإعداد ───────────────────────────────────────────
function showConfigBanner(msg) {
  const b = document.createElement('div');
  b.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9999;background:#C0392B;color:#fff;' +
    'padding:10px 20px;display:flex;align-items:center;justify-content:space-between;' +
    'font-family:var(--font-body);font-size:.85rem;gap:12px;direction:rtl;';
  b.innerHTML = `<span>⚠️ ${esc(msg)}</span>
    <button onclick="this.parentElement.remove()" style="background:rgba(255,255,255,.2);border:none;
      color:#fff;padding:4px 12px;border-radius:6px;cursor:pointer;font-size:.8rem">✕</button>`;
  document.body.prepend(b);
}

// ── تحميل الصفحة ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const notConfigured = CONFIG.API_URL === 'YOUR_GOOGLE_APPS_SCRIPT_URL';
  const notSecured    = CONFIG.API_SECRET.startsWith('CHANGE_THIS');
  if (notConfigured || notSecured) {
    const msgs = [];
    if (notConfigured) msgs.push('ضع رابط Apps Script في CONFIG.API_URL');
    if (notSecured)    msgs.push('غيّر CONFIG.API_SECRET إلى مفتاح سري فريد');
    showConfigBanner('⚙️ إعداد مطلوب: ' + msgs.join(' | '));
  }
  bootApp();
});

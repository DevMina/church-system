// ================================================================
//  نظام إدارة الكنيسة — Google Apps Script (المشفّر)
//
//  خطوات الإعداد:
//  1. افتح Google Sheets → Extensions → Apps Script
//  2. الصق هذا الكود كاملاً واحذف أي كود قديم
//  3. غيّر قيمة API_SECRET إلى كلمة سر طويلة من اختيارك
//  4. Deploy → New Deployment → Web App
//     - Execute as: Me
//     - Who has access: Anyone
//  5. انسخ رابط الـ Web App وضعه في js/core.js → CONFIG.API_URL
//  6. ضع نفس API_SECRET في js/core.js → CONFIG.API_SECRET
//  7. في Google Sheet: Share → Restricted
// ================================================================

const API_SECRET = 'XvNm0cgELmBvqqsKs93s';
const SESSION_HOURS = 8;

// ── مراحل الخدام ─────────────────────────────────────────────────
const KHODAM_STAGES = [
  'حضانة','أولى وتانية ابتدائي','تالتة ورابعة ابتدائي',
  'خامسة وسادسة ابتدائي','إعدادي','ثانوي','شباب','خريجين',
];

// ── مراحل المخدومين (15 مرحلة دقيقة) ───────────────────────────
const MAKHDOMEN_STAGES = [
  'حضانة',
  'أولى ابتدائي','تانية ابتدائي','تالتة ابتدائي',
  'رابعة ابتدائي','خامسة ابتدائي','سادسة ابتدائي',
  'أولى إعدادي','تانية إعدادي','تالتة إعدادي',
  'أولى ثانوي','تانية ثانوي','تالتة ثانوي',
  'شباب','خريجين',
];


// ================================================================
//  دالة الإعداد — شغّلها يدوياً مرة واحدة من محرر Apps Script
//  Run → setupAllSheets
// ================================================================
function setupAllSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  Logger.log('بدء إعداد الجداول...');

  // الجداول الأساسية
  const basicSheets = ['Users', 'Sessions', 'PendingUsers', 'ServiceProgram'];
  basicSheets.forEach(name => {
    const sheet = getSheet(name);
    Logger.log('✓ ' + name);
  });

  // تابات الخدام (8 مراحل)
  KHODAM_STAGES.forEach(stage => {
    const sheet = getSheet(stageSheetName(stage));
    Logger.log('✓ ' + stageSheetName(stage));
    // تاب حضور الخدام
    const attSheet = getSheet(attendanceSheetName(stage));
    Logger.log('✓ ' + attendanceSheetName(stage));
  });

  // تابات المخدومين (8 تابات مجمّعة)
  const makhdomenTabs = [
    'حضانة', 'أولى_تانية_ابتدائي', 'تالتة_رابعة_ابتدائي',
    'خامسة_سادسة_ابتدائي', 'إعدادي', 'ثانوي', 'شباب', 'خريجين'
  ];
  makhdomenTabs.forEach(tab => {
    const dataSheet = getSheet('مخدومين_' + tab);
    Logger.log('✓ مخدومين_' + tab);
    const attSheet  = getSheet('حضور_مخدومين_' + tab);
    Logger.log('✓ حضور_مخدومين_' + tab);
  });

  // إضافة أول مدير مؤقت إذا لم يوجد أي مستخدم
  const usersSheet = getSheet('Users');
  const data = usersSheet.getDataRange().getValues();
  if (data.length < 2) {
    Logger.log('لا يوجد مستخدمون — يمكنك إضافة مدير يدوياً من تاب Users');
    Logger.log('الأعمدة: id | username | password | salt | email | role | stage | status | createdAt');
    Logger.log('مثال:    admin1 | admin | admin123 | admin@church.com | admin |  | active | ' + new Date().toISOString());
  }

  // تلخيص
  const allSheets = ss.getSheets().map(s => s.getName());
  Logger.log('');
  Logger.log('تم إنشاء ' + allSheets.length + ' جدول:');
  allSheets.forEach(n => Logger.log('  - ' + n));
  Logger.log('');
  Logger.log('✅ الإعداد اكتمل! افتح View → Logs لرؤية التفاصيل');

  // إصلاح التابات الموجودة التي ليس لها headers
  fixAllHeaders();

  // رسالة منبثقة
  const finalSheets = ss.getSheets().map(s => s.getName());
  SpreadsheetApp.getUi().alert(
    'تم الإعداد بنجاح! ✅\n\n' +
    'تم إنشاء/إصلاح ' + finalSheets.length + ' جدول.\n\n' +
    'الخطوة التالية:\n' +
    'افتح تاب Users وأضف مستخدم مدير يدوياً،\n' +
    'أو سجّل من الموقع وعدّل role=admin وstatus=active في الشيت.'
  );
}

// ── أداة ترحيل كلمات المرور القديمة (شغّلها مرة واحدة) ────────────
// لو كان عندك مستخدمين قبل تحديث التشفير، شغّل هذه الدالة لتشفير كلمات مرورهم
function migratePasswords() {
  const sheet   = getSheet('Users');
  const data    = sheet.getDataRange().getValues();
  if (data.length < 2) { Logger.log('لا يوجد مستخدمون'); return; }
  const headers = data[0];
  const pwdCol  = headers.indexOf('password');
  const saltCol = headers.indexOf('salt');

  if (saltCol < 0) {
    Logger.log('أضف عمود salt أولاً عبر تشغيل setupAllSheets');
    return;
  }

  let migrated = 0;
  for (let i = 1; i < data.length; i++) {
    const currentPwd  = String(data[i][pwdCol]);
    const currentSalt = String(data[i][saltCol]);

    // If salt is empty, the password is plain text — hash it
    if (!currentSalt || currentSalt === 'undefined') {
      const newSalt   = generateSalt();
      const newHashed = hashPassword(currentPwd, newSalt);
      sheet.getRange(i + 1, pwdCol  + 1).setValue(newHashed);
      sheet.getRange(i + 1, saltCol + 1).setValue(newSalt);
      migrated++;
      Logger.log('Migrated: ' + data[i][headers.indexOf('username')]);
    }
  }
  SpreadsheetApp.flush();
  SpreadsheetApp.getUi().alert('تم ترحيل ' + migrated + ' كلمة مرور بنجاح ✓');
}

// ── دالة الإبقاء على النظام نشطاً (تقليل وقت الاستجابة) ────────────
// اضبطها كـ trigger كل 5 دقائق: Triggers → Add Trigger → keepAlive → Time-driven → Minutes → 5
function keepAlive() {
  // طلب بسيط يبقي Apps Script دافئاً ويقلل وقت الاستجابة الأول
  SpreadsheetApp.getActiveSpreadsheet().getName();
  Logger.log('keepAlive: ' + new Date().toISOString());
}

// شغّل هذه الدالة مرة واحدة لإعداد الـ trigger تلقائياً
function setupKeepAliveTrigger() {
  // احذف أي trigger قديم أولاً
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'keepAlive') ScriptApp.deleteTrigger(t);
  });
  // أضف trigger كل 5 دقائق
  ScriptApp.newTrigger('keepAlive')
    .timeBased()
    .everyMinutes(5)
    .create();
  SpreadsheetApp.getUi().alert('تم إعداد الـ trigger! سيتحسن وقت الاستجابة خلال دقائق.');
}

// ── إصلاح headers لجميع التابات الموجودة ─────────────────────────
// تُستدعى من setupAllSheets — تصلح التابات الموجودة التي فُقدت headers منها
function fixAllHeaders() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetHeaderMap = {
    // الخدام
    'خدام_حضانة':           KHODAM_HEADERS,
    'خدام_أولى_تانية':      KHODAM_HEADERS,
    'خدام_تالتة_رابعة':     KHODAM_HEADERS,
    'خدام_خامسة_سادسة':     KHODAM_HEADERS,
    'خدام_إعدادي':          KHODAM_HEADERS,
    'خدام_ثانوي':           KHODAM_HEADERS,
    'خدام_شباب':            KHODAM_HEADERS,
    'خدام_خريجين':          KHODAM_HEADERS,
    'خدام_عام':              KHODAM_HEADERS,  // fallback
    // حضور الخدام
    'حضور_حضانة':           ATT_HEADERS,
    'حضور_أولى_تانية':      ATT_HEADERS,
    'حضور_تالتة_رابعة':     ATT_HEADERS,
    'حضور_خامسة_سادسة':     ATT_HEADERS,
    'حضور_إعدادي':          ATT_HEADERS,
    'حضور_ثانوي':           ATT_HEADERS,
    'حضور_شباب':            ATT_HEADERS,
    'حضور_خريجين':          ATT_HEADERS,
    // المخدومين
    'مخدومين_حضانة':               MAKHDOMEN_HEADERS,
    'مخدومين_أولى_تانية_ابتدائي':  MAKHDOMEN_HEADERS,
    'مخدومين_تالتة_رابعة_ابتدائي': MAKHDOMEN_HEADERS,
    'مخدومين_خامسة_سادسة_ابتدائي': MAKHDOMEN_HEADERS,
    'مخدومين_إعدادي':               MAKHDOMEN_HEADERS,
    'مخدومين_ثانوي':                MAKHDOMEN_HEADERS,
    'مخدومين_شباب':                 MAKHDOMEN_HEADERS,
    'مخدومين_خريجين':               MAKHDOMEN_HEADERS,
    'مخدومين_عام':                  MAKHDOMEN_HEADERS,  // fallback
    // حضور المخدومين
    'حضور_مخدومين_حضانة':               ATT_HEADERS,
    'حضور_مخدومين_أولى_تانية_ابتدائي':  ATT_HEADERS,
    'حضور_مخدومين_تالتة_رابعة_ابتدائي': ATT_HEADERS,
    'حضور_مخدومين_خامسة_سادسة_ابتدائي': ATT_HEADERS,
    'حضور_مخدومين_إعدادي':               ATT_HEADERS,
    'حضور_مخدومين_ثانوي':                ATT_HEADERS,
    'حضور_مخدومين_شباب':                 ATT_HEADERS,
    'حضور_مخدومين_خريجين':               ATT_HEADERS,
    'حضور_مخدومين_عام':                  ATT_HEADERS,  // fallback
    // الجداول الأساسية
    'Users':          ['id','username','password','salt','email','role','stage','status','createdAt'],
    'Sessions':       ['token','userId','username','createdAt','expiresAt','lastUsed'],
    'PendingUsers':   ['id','username','password','salt','email','role','stage','requestedAt','note'],
    'ServiceProgram': ['date','items','updatedBy','updatedAt'],
  };

  const colorMap = {
    'خدام_':          '#1E2A4A',
    'حضور_مخدومين_':  '#4A5568',
    'حضور_':          '#27AE60',
    'مخدومين_':       '#2C3E6B',
  };

  let fixed = 0;
  Object.keys(sheetHeaderMap).forEach(name => {
    const sheet = ss.getSheetByName(name);
    if (!sheet) return; // تاب غير موجود — تجاهل

    const data = sheet.getDataRange().getValues();
    const headers = sheetHeaderMap[name];

    // إذا كان الجدول فارغاً أو أول صف لا يحتوي على 'id'
    if (data.length === 0 || !data[0].includes('id') && !data[0].includes('token') && !data[0].includes('date')) {
      // امسح أي بيانات قديمة وأضف headers
      if (data.length > 0 && data[0].filter(Boolean).length === 0) {
        sheet.clearContents();
      }
      sheet.insertRowBefore(1);
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

      // لون الـ header
      let color = '#1E2A4A';
      for (const prefix of Object.keys(colorMap)) {
        if (name.startsWith(prefix)) { color = colorMap[prefix]; break; }
      }
      sheet.getRange(1, 1, 1, headers.length)
        .setBackground(color).setFontColor('#FFFFFF').setFontWeight('bold');

      fixed++;
      Logger.log('Fixed headers: ' + name);
    } else {
      Logger.log('OK: ' + name);
    }
  });

  Logger.log('Fixed ' + fixed + ' sheets');
}

// ── تحويل مرحلة المخدوم (دقيقة) → تاب Sheet (مجمّع) ─────────────
// كل مجموعة من المراحل الدقيقة تُحفظ في تاب مجمّع واحد
function makhdomenStageToTab(stage) {
  if (stage === 'حضانة')                                           return 'حضانة';
  if (['أولى ابتدائي','تانية ابتدائي'].includes(stage))           return 'أولى_تانية_ابتدائي';
  if (['تالتة ابتدائي','رابعة ابتدائي'].includes(stage))          return 'تالتة_رابعة_ابتدائي';
  if (['خامسة ابتدائي','سادسة ابتدائي'].includes(stage))          return 'خامسة_سادسة_ابتدائي';
  if (['أولى إعدادي','تانية إعدادي','تالتة إعدادي'].includes(stage)) return 'إعدادي';
  if (['أولى ثانوي','تانية ثانوي','تالتة ثانوي'].includes(stage)) return 'ثانوي';
  if (stage === 'شباب')                                            return 'شباب';
  if (stage === 'خريجين')                                          return 'خريجين';
  return 'عام';
}

// اسم تاب Sheets للخدام
function stageSheetName(stage) {
  const map = {
    'حضانة':                   'خدام_حضانة',
    'أولى وتانية ابتدائي':     'خدام_أولى_تانية',
    'تالتة ورابعة ابتدائي':    'خدام_تالتة_رابعة',
    'خامسة وسادسة ابتدائي':    'خدام_خامسة_سادسة',
    'إعدادي':                  'خدام_إعدادي',
    'ثانوي':                   'خدام_ثانوي',
    'شباب':                    'خدام_شباب',
    'خريجين':                  'خدام_خريجين',
  };
  return map[stage] || 'خدام_عام';
}

// اسم تاب Sheets للمخدومين (يُحدَّد بالتاب المجمّع)
function makhdomenSheetName(stage) {
  const tab = makhdomenStageToTab(stage);
  return 'مخدومين_' + tab;
}

// اسم تاب حضور المخدومين
function makhdomenAttSheetName(stage) {
  const tab = makhdomenStageToTab(stage);
  return 'حضور_مخدومين_' + tab;
}

// تاب مرحلة الخادم → التاب المقابل للمخدومين (لعرض الخادم لمخدوميه)
function khodamStageToMakhdomenTab(khodamStage) {
  const map = {
    'حضانة':                   'حضانة',
    'أولى وتانية ابتدائي':     'أولى_تانية_ابتدائي',
    'تالتة ورابعة ابتدائي':    'تالتة_رابعة_ابتدائي',
    'خامسة وسادسة ابتدائي':    'خامسة_سادسة_ابتدائي',
    'إعدادي':                  'إعدادي',
    'ثانوي':                   'ثانوي',
    'شباب':                    'شباب',
    'خريجين':                  'خريجين',
  };
  return map[khodamStage] || 'عام';
}

const SHEETS = {
  USERS:           'Users',
  SESSIONS:        'Sessions',
  PENDING_USERS:   'PendingUsers',   // طلبات التسجيل بانتظار الموافقة
  SERVICE_PROGRAM: 'ServiceProgram',
};

// أسماء تابات حضور الخدام
function attendanceSheetName(stage) {
  return 'حضور_' + stageSheetName(stage).replace('خدام_', '');
}

const PUBLIC_ACTIONS = ['login', 'registerRequest', 'forgotPassword', 'getProgram'];

// ── نقطة الدخول ──────────────────────────────────────────────────
// مساعد التحقق من صلاحية المدير (مع كاش للأداء)
function isAdminSession(token) {
  if (!token) return false;
  try {
    const cache    = CacheService.getScriptCache();
    const cacheKey = 'role_' + token.substring(0, 20);
    const cached   = cache.get(cacheKey);
    if (cached !== null) return cached === 'admin';

    const sessions = sheetToObjects(getSheet('Sessions'));
    const session  = sessions.find(s => s.token === token);
    if (!session) return false;

    const users = sheetToObjects(getSheet('Users'));
    const user  = users.find(u => String(u.id) === String(session.userId));
    const role  = user?.role || 'user';

    cache.put(cacheKey, role, 300); // cache 5 minutes
    return role === 'admin';
  } catch {
    return false;
  }
}

// ── تشفير كلمة المرور (SHA-256 + salt) ──────────────────────────
function generateSalt() {
  return Utilities.getUuid().replace(/-/g, '').substring(0, 16);
}

function hashPassword(password, salt) {
  const raw  = password + salt + API_SECRET; // API_SECRET as pepper
  const hash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,
               raw, Utilities.Charset.UTF_8);
  return hash.map(b => ('0' + (b & 0xFF).toString(16)).slice(-2)).join('');
}

function verifyPassword(password, storedHash, salt) {
  return hashPassword(password, salt) === storedHash;
}

// ── مساعد مسح الكاش عند تغيير البيانات ──────────────────────────
function clearDataCache() {
  try {
    const cache = CacheService.getScriptCache();
    cache.removeAll(['allKhodam', 'allMakhdomen']);
  } catch {}
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const { action, payload, apiSecret, sessionToken } = body;

    if (apiSecret !== API_SECRET) {
      return respond({ success: false, error: 'غير مصرح' });
    }

    let sessionUser = null;
    if (!PUBLIC_ACTIONS.includes(action)) {
      const check = validateSession(sessionToken);
      if (!check.valid) {
        return respond({ success: false, error: check.reason, code: 'SESSION_EXPIRED' });
      }
      sessionUser = { role: check.role, stage: check.stage, userId: check.userId };
    }

    // Actions restricted to admin role only
    const ADMIN_ONLY_ACTIONS = [
      'getPendingUsers','approveUser','rejectUser',
      'getUsers','updateUser','deleteUser',
      'register',
      'getAllKhodam','getAllMakhdomen',
      'saveProgram',   // برنامج الخدمة للمدير فقط
    ];
    if (ADMIN_ONLY_ACTIONS.includes(action)) {
      if (!sessionUser || sessionUser.role !== 'admin') {
        return respond({ success: false, error: 'غير مصرح — هذا الإجراء للمدير فقط', code: 'FORBIDDEN' });
      }
    }

    // Stage authorization: non-admin can only access their own stage
    const STAGE_RESTRICTED = ['getKhodam','addKhodam','updateKhodam','deleteKhodam',
                               'getKhodamAttendance','addKhodamAttendance','updateKhodamAttendance',
                               'getMakhdomen','addMakhdomen','updateMakhdomen','deleteMakhdomen',
                               'getMakhdomenAttendance','addMakhdomenAttendance','updateMakhdomenAttendance'];
    if (sessionUser && sessionUser.role !== 'admin' && STAGE_RESTRICTED.includes(action)) {
      const requestedStage = payload.stage || '';
      if (requestedStage && requestedStage !== sessionUser.stage) {
        return respond({ success: false, error: 'غير مصرح — لا يمكنك الوصول لبيانات مرحلة أخرى', code: 'FORBIDDEN' });
      }
    }

    // Validate stage values against whitelist to prevent sheet-name injection
    const STAGE_ACTIONS = ['addKhodam','updateKhodam','deleteKhodam',
                           'getKhodam','getKhodamAttendance','addKhodamAttendance','updateKhodamAttendance'];
    const MSTAGE_ACTIONS = ['addMakhdomen','updateMakhdomen','deleteMakhdomen',
                            'getMakhdomen','getMakhdomenAttendance','addMakhdomenAttendance','updateMakhdomenAttendance'];
    if (STAGE_ACTIONS.includes(action) && payload.stage && !KHODAM_STAGES.includes(payload.stage)) {
      return respond({ success: false, error: 'قيمة المرحلة غير صالحة' });
    }
    if (MSTAGE_ACTIONS.includes(action) && payload.stage && !MAKHDOMEN_STAGES.includes(payload.stage)) {
      return respond({ success: false, error: 'قيمة المرحلة غير صالحة' });
    }

    let result;
    switch (action) {
      // المصادقة
      case 'login':           result = login(payload); break;
      case 'registerRequest': result = registerRequest(payload); break;  // طلب تسجيل (بانتظار موافقة)
      case 'register':        result = register(payload); break;         // إنشاء مباشر (للمدير)

      // إدارة المستخدمين (للمدير فقط)
      case 'getPendingUsers':  result = getPendingUsers(); break;
      case 'approveUser':      result = approveUser(payload); break;
      case 'rejectUser':       result = rejectUser(payload); break;
      case 'getUsers':         result = getUsers(); break;
      case 'updateUser':       result = updateUser(payload); break;
      case 'deleteUser':       result = deleteUser(payload); break;
      case 'forgotPassword': result = forgotPassword(payload); break;
      case 'logout':         result = logout(sessionToken); break;

      // الخدام — حسب المرحلة
      case 'getKhodam':      result = getKhodamByStage(payload.stage); break;
      case 'getAllKhodam':    result = getAllKhodam(); break;
      case 'addKhodam':      result = addKhodam(payload); break;
      case 'updateKhodam':   result = updateKhodam(payload); break;
      case 'deleteKhodam':   result = deleteKhodam(payload); break;

      // المخدومين — حسب المرحلة
      case 'getMakhdomen':      result = getMakhdomenByStage(payload.stage); break;
      case 'getAllMakhdomen':   result = getAllMakhdomen(); break;
      case 'addMakhdomen':      result = addMakhdomen(payload); break;
      case 'updateMakhdomen':   result = updateMakhdomen(payload); break;
      case 'deleteMakhdomen':   result = deleteMakhdomen(payload); break;

      // حضور الخدام — حسب المرحلة
      case 'getKhodamAttendance':    result = getKhodamAttendance(payload.stage); break;
      case 'addKhodamAttendance':    result = addKhodamAttendance(payload); break;
      case 'updateKhodamAttendance': result = updateKhodamAttendance(payload); break;

      // حضور المخدومين — حسب المرحلة
      case 'getMakhdomenAttendance':    result = getMakhdomenAttendance(payload.stage); break;
      case 'addMakhdomenAttendance':    result = addMakhdomenAttendance(payload); break;
      case 'updateMakhdomenAttendance': result = updateMakhdomenAttendance(payload); break;

      // برنامج الخدمة
      case 'getProgram':  result = getProgram(); break;
      case 'saveProgram': result = saveProgram(payload); break;

      default: result = { success: false, error: 'إجراء غير معروف' };
    }
    // Force pending writes to commit before returning
    const writeActions = ['addKhodam','updateKhodam','deleteKhodam',
                          'addMakhdomen','updateMakhdomen','deleteMakhdomen',
                          'addKhodamAttendance','updateKhodamAttendance',
                          'addMakhdomenAttendance','updateMakhdomenAttendance',
                          'register','registerRequest','approveUser','rejectUser',
                          'updateUser','deleteUser','saveProgram'];
    if (writeActions.includes(action) && result.success) {
      try { SpreadsheetApp.flush(); } catch {}
    }

    return respond(result);
  } catch (err) {
    return respond({ success: false, error: err.message });
  }
}

function doGet(e) {
  // Health check — useful for verifying deployment
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok', version: '2.0' }))
    .setMimeType(ContentService.MimeType.JSON);
}

// Handle CORS preflight OPTIONS requests
function doOptions(e) {
  return ContentService
    .createTextOutput('')
    .setMimeType(ContentService.MimeType.TEXT);
}

function respond(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── مساعدات الجداول ───────────────────────────────────────────────
function getSheet(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    initHeaders(sheet, name);
  }
  return sheet;
}

const KHODAM_HEADERS    = ['id','name','address','phone','birthDate','stage','confessionFather','notes','status'];
const MAKHDOMEN_HEADERS = ['id','name','area','address','fatherPhone','motherPhone','phone','birthDate','stage','confessionFather','notes','absent','status'];
const ATT_HEADERS       = ['id','memberId','memberName','stage','date','week','mass','khedma'];
const ATTENDANCE_HEADERS = ATT_HEADERS; // alias for backward compatibility

function initHeaders(sheet, name) {
  let headers = null;
  let color   = '#1E2A4A';

  if (name.startsWith('خدام_')) {
    // بيانات الخدام
    headers = KHODAM_HEADERS;
    color   = '#1E2A4A';
  } else if (name.startsWith('مخدومين_')) {
    // بيانات المخدومين
    headers = MAKHDOMEN_HEADERS;
    color   = '#2C3E6B';
  } else if (name.startsWith('حضور_مخدومين_')) {
    // حضور المخدومين
    headers = ATT_HEADERS;
    color   = '#4A5568';
  } else if (name.startsWith('حضور_')) {
    // حضور الخدام
    headers = ATT_HEADERS;
    color   = '#27AE60';
  } else {
    // الجداول الثابتة
    const fixed = {
      'Users':          ['id','username','password','salt','email','role','stage','status','createdAt'],
      'Sessions':       ['token','userId','username','createdAt','expiresAt','lastUsed'],
      'PendingUsers':   ['id','username','password','salt','email','role','stage','requestedAt','note'],
      'ServiceProgram': ['date','items','updatedBy','updatedAt'],
    };
    headers = fixed[name] || null;
  }

  if (headers && headers.length > 0) {
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length)
      .setBackground(color).setFontColor('#FFFFFF').setFontWeight('bold');
  }
}

function sheetToObjects(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  const headers = data[0];
  return data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => {
      let val = row[i];
      // Convert Sheets Date objects to ISO string for consistent frontend handling
      if (val instanceof Date) {
        val = val.toISOString().split('T')[0]; // YYYY-MM-DD
      }
      obj[h] = val;
    });
    return obj;
  });
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
}

function getAll(sheetName) {
  return { success: true, data: sheetToObjects(getSheet(sheetName)) };
}

function addRow(sheetName, payload) {
  const sheet = getSheet(sheetName);
  const data  = sheet.getDataRange().getValues();
  // Use existing headers row; if sheet empty, initHeaders already added them
  if (data.length < 1) return { success: false, error: 'الجدول لم يُهيَّأ بعد' };
  const headers = data[0];
  payload.id    = generateId();
  const row     = headers.map(h => payload[h] !== undefined ? payload[h] : '');
  sheet.appendRow(row);
  return { success: true, data: payload };
}

function updateRow(sheetName, payload) {
  const sheet   = getSheet(sheetName);
  const data    = sheet.getDataRange().getValues();
  if (data.length < 2) return { success: false, error: 'السجل غير موجود' };
  const headers = data[0];

  // Verify headers look valid (first cell should be 'id' or 'token' or 'date')
  const validFirstCols = ['id','token','date'];
  if (!validFirstCols.includes(String(headers[0]).trim())) {
    // Headers row is missing or corrupted — auto-repair and try again
    Logger.log('Auto-repairing headers for: ' + sheetName);
    initHeaders(sheet, sheetName);
    return { success: false, error: 'تم إصلاح ترويسة الجدول تلقائياً — أعد المحاولة' };
  }

  const idCol = headers.indexOf('id');
  if (idCol < 0) return { success: false, error: 'بنية الجدول غير صحيحة' };
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idCol]) === String(payload.id)) {
      const row = headers.map((h, j) => payload[h] !== undefined ? payload[h] : data[i][j]);
      sheet.getRange(i + 1, 1, 1, headers.length).setValues([row]);
      return { success: true, data: payload };
    }
  }
  return { success: false, error: 'السجل غير موجود' };
}

function deleteRow(sheetName, id) {
  const sheet   = getSheet(sheetName);
  const data    = sheet.getDataRange().getValues();
  if (data.length < 2) return { success: false, error: 'السجل غير موجود' };
  const headers = data[0];
  const validFirstCols = ['id','token','date'];
  if (!validFirstCols.includes(String(headers[0]).trim())) {
    initHeaders(sheet, sheetName);
    return { success: false, error: 'تم إصلاح ترويسة الجدول تلقائياً — أعد المحاولة' };
  }
  const idCol = headers.indexOf('id');
  if (idCol < 0) return { success: false, error: 'بنية الجدول غير صحيحة' };
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idCol]) === String(id)) {
      sheet.deleteRow(i + 1);
      return { success: true };
    }
  }
  return { success: false, error: 'السجل غير موجود' };
}

// ── الخدام حسب المرحلة ───────────────────────────────────────────
function getKhodamByStage(stage) {
  if (!stage) return { success: false, error: 'المرحلة مطلوبة' };
  const sheetName = stageSheetName(stage);
  return { success: true, data: sheetToObjects(getSheet(sheetName)) };
}

function getAllKhodam() {
  // يجلب كل الخدام من جميع تابات المراحل (للمدير فقط)
  let all = [];
  KHODAM_STAGES.forEach(stage => {
    const sheet = getSheet(stageSheetName(stage));
    const rows  = sheetToObjects(sheet);
    all = all.concat(rows);
  });
  return { success: true, data: all };
}

function addKhodam(payload) {
  if (!payload.stage) return { success: false, error: 'المرحلة مطلوبة' };
  const sheetName = stageSheetName(payload.stage);
  const sheet     = getSheet(sheetName);
  const headers   = KHODAM_HEADERS;
  payload.id      = generateId();
  sheet.appendRow(headers.map(h => payload[h] !== undefined ? payload[h] : ''));
  clearDataCache();
  return { success: true, data: payload };
}

function updateKhodam(payload) {
  if (!payload.stage) return { success: false, error: 'المرحلة مطلوبة' };

  const newSheet = stageSheetName(payload.stage);

  // Check if the record exists in the target sheet
  const targetData = getSheet(newSheet).getDataRange().getValues();
  const targetHeaders = targetData[0] || [];
  const idCol = targetHeaders.indexOf('id');
  const existsInTarget = idCol >= 0 && targetData.slice(1).some(r => String(r[idCol]) === String(payload.id));

  if (existsInTarget) {
    // Same tab — simple update
    return updateRow(newSheet, payload);
  }

  // Safe stage-change: INSERT first (prevents data loss), then DELETE old
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(8000);
    // 1. Insert into new tab first
    getSheet(newSheet).appendRow(KHODAM_HEADERS.map(h => payload[h] !== undefined ? payload[h] : ''));
    SpreadsheetApp.flush();
    // 2. Delete from old tab
    for (const stage of KHODAM_STAGES) {
      const oldSheetName = stageSheetName(stage);
      if (oldSheetName === newSheet) continue;
      const data = getSheet(oldSheetName).getDataRange().getValues();
      const col  = (data[0] || []).indexOf('id');
      if (col < 0) continue;
      for (let i = 1; i < data.length; i++) {
        if (String(data[i][col]) === String(payload.id)) {
          getSheet(oldSheetName).deleteRow(i + 1);
          break;
        }
      }
    }
  } catch(e) {
    return { success: false, error: 'تعذّر نقل السجل: ' + e.message };
  } finally {
    try { lock.releaseLock(); } catch {}
  }
  clearDataCache();
  return { success: true, data: payload };
}

function deleteKhodam(payload) {
  if (!payload.stage) return { success: false, error: 'المرحلة مطلوبة' };
  const sheetName = stageSheetName(payload.stage);
  return deleteRow(sheetName, payload.id);
}

// ── حضور الخدام حسب المرحلة ─────────────────────────────────────
function getKhodamAttendance(stage) {
  if (!stage) return { success: false, error: 'المرحلة مطلوبة' };
  const sheetName = attendanceSheetName(stage);
  return { success: true, data: sheetToObjects(getSheet(sheetName)) };
}

function addKhodamAttendance(payload) {
  if (!payload.stage) return { success: false, error: 'المرحلة مطلوبة' };
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(5000);
    const sheetName = attendanceSheetName(payload.stage);
    const sheet     = getSheet(sheetName);
    const existing  = sheetToObjects(sheet);
    const dup = existing.find(r => String(r.memberId) === String(payload.memberId)
                               && String(r.date).slice(0,10) === String(payload.date).slice(0,10));
    if (dup) return updateRow(sheetName, { ...dup, ...payload, id: dup.id });
    payload.id = generateId();
    sheet.appendRow(ATT_HEADERS.map(h => payload[h] !== undefined ? payload[h] : ''));
    SpreadsheetApp.flush();
    return { success: true, data: payload };
  } catch(e) {
    return { success: false, error: 'تعذّر الحفظ: ' + e.message };
  } finally {
    try { lock.releaseLock(); } catch {}
  }
}

function updateKhodamAttendance(payload) {
  if (!payload.stage) return { success: false, error: 'المرحلة مطلوبة' };
  const sheetName = attendanceSheetName(payload.stage);
  return updateRow(sheetName, payload);
}

// ── المخدومين حسب المرحلة ────────────────────────────────────────
// stage هنا هي مرحلة الخادم (8 مراحل) — نجلب تاب المخدومين المقابل
function getMakhdomenByStage(stage) {
  if (!stage) return { success: false, error: 'المرحلة مطلوبة' };
  const tab       = khodamStageToMakhdomenTab(stage);
  const sheetName = 'مخدومين_' + tab;
  return { success: true, data: sheetToObjects(getSheet(sheetName)) };
}

// جلب كل المخدومين من جميع التابات (للمدير)
function getAllMakhdomen() {
  const cache = CacheService.getScriptCache();
  const cacheKey = 'allMakhdomen';
  const cached = cache.get(cacheKey);
  if (cached) {
    try { return { success: true, data: JSON.parse(cached), _cached: true }; } catch {}
  }
  const tabs = ['حضانة','أولى_تانية_ابتدائي','تالتة_رابعة_ابتدائي',
                'خامسة_سادسة_ابتدائي','إعدادي','ثانوي','شباب','خريجين'];
  let all = [];
  tabs.forEach(tab => {
    all = all.concat(sheetToObjects(getSheet('مخدومين_' + tab)));
  });
  try { cache.put(cacheKey, JSON.stringify(all), 30); } catch {}
  return { success: true, data: all };
}

function addMakhdomen(payload) {
  if (!payload.stage) return { success: false, error: 'المرحلة مطلوبة' };
  const sheetName = makhdomenSheetName(payload.stage);
  const sheet     = getSheet(sheetName);
  const headers   = MAKHDOMEN_HEADERS;
  payload.id      = generateId();
  sheet.appendRow(headers.map(h => payload[h] !== undefined ? payload[h] : ''));
  clearDataCache();
  return { success: true, data: payload };
}

function updateMakhdomen(payload) {
  if (!payload.stage) return { success: false, error: 'المرحلة مطلوبة' };

  const newSheet = makhdomenSheetName(payload.stage);

  const targetData = getSheet(newSheet).getDataRange().getValues();
  const targetHeaders = targetData[0] || [];
  const idCol = targetHeaders.indexOf('id');
  const existsInTarget = idCol >= 0 && targetData.slice(1).some(r => String(r[idCol]) === String(payload.id));

  if (existsInTarget) {
    return updateRow(newSheet, payload);
  }

  // Stage changed — find in any old makhdomen tab and move
  const allTabs = ['حضانة','أولى_تانية_ابتدائي','تالتة_رابعة_ابتدائي',
                   'خامسة_سادسة_ابتدائي','إعدادي','ثانوي','شباب','خريجين'];
  let deleted = false;
  for (const tab of allTabs) {
    const oldSheet = 'مخدومين_' + tab;
    if (oldSheet === newSheet) continue;
    const data    = getSheet(oldSheet).getDataRange().getValues();
    const headers = data[0] || [];
    const col     = headers.indexOf('id');
    if (col < 0) continue;
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][col]) === String(payload.id)) {
        getSheet(oldSheet).deleteRow(i + 1);
        deleted = true;
        break;
      }
    }
    if (deleted) break;
  }

  const sheet   = getSheet(newSheet);
  const headers = MAKHDOMEN_HEADERS;
  const row     = headers.map(h => payload[h] !== undefined ? payload[h] : '');
  sheet.appendRow(row);
  return { success: true, data: payload };
}

function deleteMakhdomen(payload) {
  if (!payload.stage) return { success: false, error: 'المرحلة مطلوبة' };
  clearDataCache();
  return deleteRow(makhdomenSheetName(payload.stage), payload.id);
}

// ── حضور المخدومين حسب المرحلة ───────────────────────────────────
// stage هنا مرحلة الخادم (8) — نجلب تاب حضور المخدومين المقابل
function getMakhdomenAttendance(stage) {
  if (!stage) return { success: false, error: 'المرحلة مطلوبة' };
  const tab       = khodamStageToMakhdomenTab(stage);
  const sheetName = 'حضور_مخدومين_' + tab;
  return { success: true, data: sheetToObjects(getSheet(sheetName)) };
}

function addMakhdomenAttendance(payload) {
  if (!payload.stage) return { success: false, error: 'المرحلة مطلوبة' };
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(5000);
    const sheetName = makhdomenAttSheetName(payload.stage);
    const sheet     = getSheet(sheetName);
    const existing  = sheetToObjects(sheet);
    const dup = existing.find(r => String(r.memberId) === String(payload.memberId)
                               && String(r.date).slice(0,10) === String(payload.date).slice(0,10));
    if (dup) return updateRow(sheetName, { ...dup, ...payload, id: dup.id });
    payload.id = generateId();
    sheet.appendRow(ATT_HEADERS.map(h => payload[h] !== undefined ? payload[h] : ''));
    SpreadsheetApp.flush();
    return { success: true, data: payload };
  } catch(e) {
    return { success: false, error: 'تعذّر الحفظ: ' + e.message };
  } finally {
    try { lock.releaseLock(); } catch {}
  }

}

function updateMakhdomenAttendance(payload) {
  if (!payload.stage) return { success: false, error: 'المرحلة مطلوبة' };
  return updateRow(makhdomenAttSheetName(payload.stage), payload);
}

// ── إدارة الجلسات ─────────────────────────────────────────────────
function generateToken() {
  return Utilities.getUuid().replace(/-/g, '') + generateId();
}

function createSession(user) {
  const sheet   = getSheet('Sessions');
  const now     = new Date();
  const expires = new Date(now.getTime() + SESSION_HOURS * 60 * 60 * 1000);
  const token   = generateToken();
  sheet.appendRow([token, user.id, user.username,
    now.toISOString(), expires.toISOString(), now.toISOString()]);
  return token;
}

function validateSession(token) {
  if (!token) return { valid: false, reason: 'لا يوجد توكن' };
  const sheet      = getSheet('Sessions');
  const data       = sheet.getDataRange().getValues();
  const headers    = data[0];
  const tokenCol   = headers.indexOf('token');
  const expiresCol = headers.indexOf('expiresAt');
  const lastUsedCol= headers.indexOf('lastUsed');
  const userIdCol  = headers.indexOf('userId');

  for (let i = 1; i < data.length; i++) {
    if (data[i][tokenCol] === token) {
      if (new Date() > new Date(data[i][expiresCol])) {
        sheet.deleteRow(i + 1);
        return { valid: false, reason: 'انتهت مدة الجلسة، يرجى تسجيل الدخول مجدداً.' };
      }
      const newExpiry = new Date(Date.now() + SESSION_HOURS * 60 * 60 * 1000);
      sheet.getRange(i + 1, expiresCol + 1).setValue(newExpiry.toISOString());
      sheet.getRange(i + 1, lastUsedCol + 1).setValue(new Date().toISOString());
      // Return user data for authorization use
      const userId = userIdCol >= 0 ? String(data[i][userIdCol]) : null;
      const users  = sheetToObjects(getSheet('Users'));
      const user   = users.find(u => String(u.id) === userId);
      return { valid: true, userId, role: user?.role || 'user', stage: user?.stage || '' };
    }
  }
  return { valid: false, reason: 'جلسة غير صالحة، يرجى تسجيل الدخول مجدداً.' };
}

function logout(token) {
  if (!token) return { success: true };
  const sheet    = getSheet('Sessions');
  const data     = sheet.getDataRange().getValues();
  const tokenCol = data[0].indexOf('token');
  for (let i = 1; i < data.length; i++) {
    if (data[i][tokenCol] === token) { sheet.deleteRow(i + 1); break; }
  }
  return { success: true };
}

function cleanExpiredSessions() {
  try {
    const sheet      = getSheet('Sessions');
    const data       = sheet.getDataRange().getValues();
    if (data.length < 2) return;
    const expiresCol = data[0].indexOf('expiresAt');
    const now        = new Date();
    for (let i = data.length - 1; i >= 1; i--) {
      const exp = new Date(data[i][expiresCol]);
      if (!isNaN(exp.getTime()) && exp < now) sheet.deleteRow(i + 1);
    }
  } catch(e) {
    Logger.log('cleanExpiredSessions error: ' + e.message);
  }
}

// ── المصادقة ──────────────────────────────────────────────────────
function login({ username, password }) {
  if (!username || !password)
    return { success: false, error: 'اسم المستخدم وكلمة المرور مطلوبان' };

  // Rate limiting: max 5 failed attempts per 15 minutes per username
  const cache      = CacheService.getScriptCache();
  const rateKey    = 'login_fail_' + username.toLowerCase().substring(0, 30);
  const attemptsRaw = cache.get(rateKey);
  const attempts   = attemptsRaw ? parseInt(attemptsRaw) : 0;
  if (attempts >= 5) {
    return { success: false, error: 'تم تجاوز عدد المحاولات المسموح بها. حاول مجدداً بعد 15 دقيقة.' };
  }
  const users = sheetToObjects(getSheet('Users'));
  const user  = users.find(u =>
    String(u.username).toLowerCase() === String(username).toLowerCase());
  // Always run verification to prevent timing attacks
  const dummySalt = 'dummy0000000000';
  const isValid   = user ? verifyPassword(password, user.password, user.salt || dummySalt) : false;
  if (!user || !isValid) {
    // Increment failed attempt counter
    cache.put(rateKey, String(attempts + 1), 900); // 15 minutes TTL
    return { success: false, error: 'اسم المستخدم أو كلمة المرور غير صحيحة' };
  }
  if (user.status === 'inactive') return { success: false, error: 'تم تعطيل هذا الحساب. تواصل مع المدير.' };
  // Reset rate limit on successful login
  cache.remove(rateKey);
  const token = createSession(user);
  const { password: _, salt: __, ...safeUser } = user;
  return { success: true, data: { ...safeUser, sessionToken: token } };
}

// ── طلب تسجيل جديد (يحتاج موافقة المدير) ───────────────────────
function registerRequest({ username, password, email, role = 'user', stage = '', note = '' }) {
  if (!username || !password || !email)
    return { success: false, error: 'جميع الحقول مطلوبة' };
  if (username.length < 3)
    return { success: false, error: 'اسم المستخدم يجب أن يكون 3 أحرف على الأقل' };
  if (password.length < 6)
    return { success: false, error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' };
  if (role !== 'admin' && !stage)
    return { success: false, error: 'يرجى اختيار مرحلة الخدمة' };

  // التحقق من عدم تكرار اسم المستخدم في Users أو PendingUsers
  const users   = sheetToObjects(getSheet('Users'));
  const pending = sheetToObjects(getSheet('PendingUsers'));
  const taken   = [...users, ...pending];
  if (taken.find(u => String(u.username).toLowerCase() === String(username).toLowerCase()))
    return { success: false, error: 'اسم المستخدم موجود بالفعل أو في انتظار المراجعة' };

  const sheet   = getSheet('PendingUsers');
  const headers = ['id','username','password','salt','email','role','stage','requestedAt','note'];
  const id      = generateId();
  const salt    = generateSalt();
  const hashed  = hashPassword(password, salt);
  const payload = { id, username, password: hashed, salt, email, role, stage,
                    requestedAt: new Date().toISOString(), note };
  sheet.appendRow(headers.map(h => payload[h] !== undefined ? payload[h] : ''));
  return { success: true, message: 'تم إرسال طلب التسجيل. سيتم إخطارك عند الموافقة.' };
}

// ── إنشاء مستخدم مباشر (المدير فقط) ─────────────────────────────
function register({ username, password, email, role = 'user', stage = '' }) {
  if (!username || !password || !email)
    return { success: false, error: 'جميع الحقول مطلوبة' };
  if (role !== 'admin' && !stage)
    return { success: false, error: 'يرجى اختيار مرحلة الخدمة' };
  const users = sheetToObjects(getSheet('Users'));
  if (users.find(u => String(u.username).toLowerCase() === String(username).toLowerCase()))
    return { success: false, error: 'اسم المستخدم موجود بالفعل' };
  const sheet   = getSheet('Users');
  const headers = ['id','username','password','salt','email','role','stage','status','createdAt'];
  const id      = generateId();
  const salt    = generateSalt();
  const hashed  = hashPassword(password, salt);
  const payload = { id, username, password: hashed, salt, email, role, stage, status: 'active',
                    createdAt: new Date().toISOString() };
  sheet.appendRow(headers.map(h => payload[h] !== undefined ? payload[h] : ''));
  return { success: true, data: { id, username, email, role, stage } };
}

// ── إدارة الطلبات المعلقة ─────────────────────────────────────────
function getPendingUsers() {
  return { success: true, data: sheetToObjects(getSheet('PendingUsers')) };
}

function approveUser(payload) {
  const { id } = payload;
  const sheet   = getSheet('PendingUsers');
  const data    = sheet.getDataRange().getValues();
  const headers = data[0];
  const idCol   = headers.indexOf('id');

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idCol]) === String(id)) {
      // بناء كائن المستخدم من بيانات الطلب
      const obj = {};
      headers.forEach((h, j) => { obj[h] = data[i][j]; });

      // إضافته لـ Users مباشرةً (بدون مرور على register لتجنب تحقق التكرار)
      const approvedRole  = payload.role  || obj.role  || 'user';
      const approvedStage = payload.stage || obj.stage || '';
      const usersSheet    = getSheet('Users');
      const uHeaders      = ['id','username','password','email','role','stage','status','createdAt'];
      // Password is already hashed in PendingUsers — copy hash + salt
      const newUser = {
        id: generateId(), username: obj.username, password: obj.password,
        salt: obj.salt || generateSalt(), email: obj.email,
        role: approvedRole, stage: approvedStage,
        status: 'active', createdAt: new Date().toISOString()
      };
      usersSheet.appendRow(uHeaders.map(h => newUser[h] !== undefined ? newUser[h] : ''));
      const result = { success: true };

      sheet.deleteRow(i + 1);
      return { success: true, message: 'تمت الموافقة على ' + obj.username };
    }
  }
  return { success: false, error: 'الطلب غير موجود' };
}

function rejectUser(payload) {
  const { id } = payload;
  const sheet = getSheet('PendingUsers');
  const data  = sheet.getDataRange().getValues();
  const idCol = data[0].indexOf('id');
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idCol]) === String(id)) {
      const name = data[i][data[0].indexOf('username')];
      sheet.deleteRow(i + 1);
      return { success: true, message: `تم رفض طلب ${name}` };
    }
  }
  return { success: false, error: 'الطلب غير موجود' };
}

// ── إدارة المستخدمين الموافق عليهم ──────────────────────────────
function getUsers() {
  const users = sheetToObjects(getSheet('Users'));
  // إزالة كلمات المرور من النتائج
  return { success: true, data: users.map(u => {
    const { password: _, ...safe } = u;
    return safe;
  })};
}

function updateUser(payload) {
  // Clear role cache for this user's sessions (role may have changed)
  try {
    const cache    = CacheService.getScriptCache();
    const sessions = sheetToObjects(getSheet('Sessions'));
    sessions.filter(s => String(s.userId) === String(payload.id)).forEach(s => {
      cache.remove('role_' + s.token.substring(0, 20));
    });
  } catch {}
  const sheet   = getSheet('Users');
  const data    = sheet.getDataRange().getValues();
  const headers = data[0];
  const idCol   = headers.indexOf('id');
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idCol]) === String(payload.id)) {
      headers.forEach((h, j) => {
        if (payload[h] !== undefined && h !== 'id' && h !== 'password')
          data[i][j] = payload[h];
      });
      // تحديث كلمة المرور فقط إذا أُرسلت
      if (payload.newPassword) {
        const pwdCol  = headers.indexOf('password');
        const saltCol = headers.indexOf('salt');
        if (pwdCol >= 0) {
          const newSalt   = generateSalt();
          const newHashed = hashPassword(payload.newPassword, newSalt);
          data[i][pwdCol] = newHashed;
          if (saltCol >= 0) data[i][saltCol] = newSalt;
        }
        // Invalidate all sessions for this user after password change
        const sessions = getSheet('Sessions');
        const sData    = sessions.getDataRange().getValues();
        const sHeaders = sData[0];
        const uidCol   = sHeaders.indexOf('userId');
        for (let j = sData.length - 1; j >= 1; j--) {
          if (String(sData[j][uidCol]) === String(payload.id)) sessions.deleteRow(j + 1);
        }
      }
      sheet.getRange(i + 1, 1, 1, headers.length).setValues([data[i]]);
      return { success: true };
    }
  }
  return { success: false, error: 'المستخدم غير موجود' };
}

function deleteUser(payload) {
  return deleteRow('Users', payload.id);
}

function forgotPassword({ email }) {
  if (!email) return { success: false, error: 'البريد الإلكتروني مطلوب' };
  // Anti-enumeration: always return the same message regardless of whether email exists
  sheetToObjects(getSheet('Users')).find(u =>
    String(u.email).toLowerCase() === String(email).toLowerCase());
  return { success: true, message: 'إذا كان البريد مسجلاً، تواصل مع المدير لإعادة تعيين كلمة المرور.' };
}

// ── برنامج الخدمة ─────────────────────────────────────────────────
function getProgram() {
  const sheet = getSheet('ServiceProgram');
  const data  = sheet.getDataRange().getValues();
  if (data.length < 2) return { success: true, data: null };
  const headers = data[0];
  const last    = data[data.length - 1];
  const obj     = {};
  headers.forEach((h, i) => { obj[h] = last[i]; });
  let items = [];
  try { items = JSON.parse(obj.items || '[]'); } catch {}
  return { success: true, data: { date: obj.date, items, updatedAt: obj.updatedAt } };
}

function saveProgram(payload) {
  const { date, items, username } = payload;
  if (!date) return { success: false, error: 'التاريخ مطلوب' };
  const sheet     = getSheet('ServiceProgram');
  const now       = new Date().toISOString();
  const itemsJSON = JSON.stringify(items || []);
  const data      = sheet.getDataRange().getValues();
  const headers   = data[0];
  const dateCol   = headers.indexOf('date');
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][dateCol]) === String(date)) {
      const row = headers.map(h => {
        if (h === 'items')     return itemsJSON;
        if (h === 'updatedBy') return username || '';
        if (h === 'updatedAt') return now;
        return data[i][headers.indexOf(h)];
      });
      sheet.getRange(i + 1, 1, 1, headers.length).setValues([row]);
      return { success: true };
    }
  }
  sheet.appendRow([date, itemsJSON, username || '', now]);
  return { success: true };
}

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
    'حضانة', 'أولى وتانية ابتدائي', 'تالتة ورابعة ابتدائي',
    'خامسة وسادسة ابتدائي', 'إعدادي', 'ثانوي', 'شباب', 'خريجين',
];

// ── مراحل المخدومين (15 مرحلة دقيقة) ───────────────────────────
const MAKHDOMEN_STAGES = [
    'حضانة',
    'أولى ابتدائي', 'تانية ابتدائي', 'تالتة ابتدائي',
    'رابعة ابتدائي', 'خامسة ابتدائي', 'سادسة ابتدائي',
    'أولى إعدادي', 'تانية إعدادي', 'تالتة إعدادي',
    'أولى ثانوي', 'تانية ثانوي', 'تالتة ثانوي',
    'شباب', 'خريجين',
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
        const attSheet = getSheet('حضور_مخدومين_' + tab);
        Logger.log('✓ حضور_مخدومين_' + tab);
    });

    // إضافة أول مدير مؤقت إذا لم يوجد أي مستخدم
    const usersSheet = getSheet('Users');
    const data = usersSheet.getDataRange().getValues();
    if (data.length < 2) {
        Logger.log('لا يوجد مستخدمون — يمكنك إضافة مدير يدوياً من تاب Users');
        Logger.log('الأعمدة: id | username | password | email | role | stage | status | createdAt');
        Logger.log('مثال:    admin1 | admin | admin123 | admin@church.com | admin |  | active | ' + new Date().toISOString());
    }

    // تلخيص
    const allSheets = ss.getSheets().map(s => s.getName());
    Logger.log('');
    Logger.log('تم إنشاء ' + allSheets.length + ' جدول:');
    allSheets.forEach(n => Logger.log('  - ' + n));
    Logger.log('');
    Logger.log('✅ الإعداد اكتمل! افتح View → Logs لرؤية التفاصيل');

    // رسالة منبثقة
    SpreadsheetApp.getUi().alert(
        'تم الإعداد بنجاح! ✅\n\n' +
        'تم إنشاء ' + allSheets.length + ' جدول.\n\n' +
        'الخطوة التالية:\n' +
        'افتح تاب Users وأضف مستخدم مدير يدوياً،\n' +
        'أو سجّل من الموقع وعدّل role=admin وstatus=active في الشيت.'
    );
}

// ── تحويل مرحلة المخدوم (دقيقة) → تاب Sheet (مجمّع) ─────────────
// كل مجموعة من المراحل الدقيقة تُحفظ في تاب مجمّع واحد
function makhdomenStageToTab(stage) {
    if (stage === 'حضانة') return 'حضانة';
    if (['أولى ابتدائي', 'تانية ابتدائي'].includes(stage)) return 'أولى_تانية_ابتدائي';
    if (['تالتة ابتدائي', 'رابعة ابتدائي'].includes(stage)) return 'تالتة_رابعة_ابتدائي';
    if (['خامسة ابتدائي', 'سادسة ابتدائي'].includes(stage)) return 'خامسة_سادسة_ابتدائي';
    if (['أولى إعدادي', 'تانية إعدادي', 'تالتة إعدادي'].includes(stage)) return 'إعدادي';
    if (['أولى ثانوي', 'تانية ثانوي', 'تالتة ثانوي'].includes(stage)) return 'ثانوي';
    if (stage === 'شباب') return 'شباب';
    if (stage === 'خريجين') return 'خريجين';
    return 'عام';
}

// اسم تاب Sheets للخدام
function stageSheetName(stage) {
    const map = {
        'حضانة': 'خدام_حضانة',
        'أولى وتانية ابتدائي': 'خدام_أولى_تانية',
        'تالتة ورابعة ابتدائي': 'خدام_تالتة_رابعة',
        'خامسة وسادسة ابتدائي': 'خدام_خامسة_سادسة',
        'إعدادي': 'خدام_إعدادي',
        'ثانوي': 'خدام_ثانوي',
        'شباب': 'خدام_شباب',
        'خريجين': 'خدام_خريجين',
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
        'حضانة': 'حضانة',
        'أولى وتانية ابتدائي': 'أولى_تانية_ابتدائي',
        'تالتة ورابعة ابتدائي': 'تالتة_رابعة_ابتدائي',
        'خامسة وسادسة ابتدائي': 'خامسة_سادسة_ابتدائي',
        'إعدادي': 'إعدادي',
        'ثانوي': 'ثانوي',
        'شباب': 'شباب',
        'خريجين': 'خريجين',
    };
    return map[khodamStage] || 'عام';
}

const SHEETS = {
    USERS: 'Users',
    SESSIONS: 'Sessions',
    PENDING_USERS: 'PendingUsers',   // طلبات التسجيل بانتظار الموافقة
    SERVICE_PROGRAM: 'ServiceProgram',
};

// أسماء تابات حضور الخدام
function attendanceSheetName(stage) {
    return 'حضور_' + stageSheetName(stage).replace('خدام_', '');
}

const PUBLIC_ACTIONS = ['login', 'registerRequest', 'forgotPassword', 'getProgram'];

// ── نقطة الدخول ──────────────────────────────────────────────────
function doPost(e) {
    try {
        const body = JSON.parse(e.postData.contents);
        const { action, payload, apiSecret, sessionToken } = body;

        if (apiSecret !== API_SECRET) {
            return respond({ success: false, error: 'غير مصرح' });
        }

        if (!PUBLIC_ACTIONS.includes(action)) {
            const check = validateSession(sessionToken);
            if (!check.valid) {
                return respond({ success: false, error: check.reason, code: 'SESSION_EXPIRED' });
            }
        }

        let result;
        switch (action) {
            // المصادقة
            case 'login': result = login(payload); break;
            case 'registerRequest': result = registerRequest(payload); break;  // طلب تسجيل (بانتظار موافقة)
            case 'register': result = register(payload); break;         // إنشاء مباشر (للمدير)

            // إدارة المستخدمين (للمدير فقط)
            case 'getPendingUsers': result = getPendingUsers(); break;
            case 'approveUser': result = approveUser(payload); break;
            case 'rejectUser': result = rejectUser(payload); break;
            case 'getUsers': result = getUsers(); break;
            case 'updateUser': result = updateUser(payload); break;
            case 'deleteUser': result = deleteUser(payload); break;
            case 'forgotPassword': result = forgotPassword(payload); break;
            case 'logout': result = logout(sessionToken); break;

            // الخدام — حسب المرحلة
            case 'getKhodam': result = getKhodamByStage(payload.stage); break;
            case 'getAllKhodam': result = getAllKhodam(); break;
            case 'addKhodam': result = addKhodam(payload); break;
            case 'updateKhodam': result = updateKhodam(payload); break;
            case 'deleteKhodam': result = deleteKhodam(payload); break;

            // المخدومين — حسب المرحلة
            case 'getMakhdomen': result = getMakhdomenByStage(payload.stage); break;
            case 'getAllMakhdomen': result = getAllMakhdomen(); break;
            case 'addMakhdomen': result = addMakhdomen(payload); break;
            case 'updateMakhdomen': result = updateMakhdomen(payload); break;
            case 'deleteMakhdomen': result = deleteMakhdomen(payload); break;

            // حضور الخدام — حسب المرحلة
            case 'getKhodamAttendance': result = getKhodamAttendance(payload.stage); break;
            case 'addKhodamAttendance': result = addKhodamAttendance(payload); break;
            case 'updateKhodamAttendance': result = updateKhodamAttendance(payload); break;

            // حضور المخدومين — حسب المرحلة
            case 'getMakhdomenAttendance': result = getMakhdomenAttendance(payload.stage); break;
            case 'addMakhdomenAttendance': result = addMakhdomenAttendance(payload); break;
            case 'updateMakhdomenAttendance': result = updateMakhdomenAttendance(payload); break;

            // برنامج الخدمة
            case 'getProgram': result = getProgram(); break;
            case 'saveProgram': result = saveProgram(payload); break;

            default: result = { success: false, error: 'إجراء غير معروف' };
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

const KHODAM_HEADERS = ['id', 'name', 'address', 'phone', 'birthDate', 'stage', 'confessionFather', 'notes', 'status'];
const ATTENDANCE_HEADERS = ['id', 'memberId', 'memberName', 'stage', 'date', 'week', 'mass', 'khedma'];

function initHeaders(sheet, name) {
    // تابات الخدام الخاصة بالمراحل
    if (name.startsWith('خدام_')) {
        sheet.appendRow(KHODAM_HEADERS);
        // تلوين رأس الجدول
        sheet.getRange(1, 1, 1, KHODAM_HEADERS.length)
            .setBackground('#1E2A4A').setFontColor('#FFFFFF').setFontWeight('bold');
        return;
    }
    // تابات حضور الخدام
    if (name.startsWith('حضور_')) {
        sheet.appendRow(ATTENDANCE_HEADERS);
        sheet.getRange(1, 1, 1, ATTENDANCE_HEADERS.length)
            .setBackground('#1E2A4A').setFontColor('#FFFFFF').setFontWeight('bold');
        return;
    }

    const headers = {
        'Users': ['id', 'username', 'password', 'email', 'role', 'stage', 'createdAt'],
        'Sessions': ['token', 'userId', 'username', 'createdAt', 'expiresAt', 'lastUsed'],
        'Makhdomen': ['id', 'name', 'area', 'address', 'fatherPhone', 'motherPhone', 'phone',
            'birthDate', 'stage', 'confessionFather', 'notes', 'absent', 'status'],
        'MakhdomenAttendance': ['id', 'memberId', 'memberName', 'date', 'week', 'mass', 'khedma'],
        'ServiceProgram': ['date', 'items', 'updatedBy', 'updatedAt'],
    };
    if (headers[name]) {
        sheet.appendRow(headers[name]);
        sheet.getRange(1, 1, 1, headers[name].length)
            .setBackground('#1E2A4A').setFontColor('#FFFFFF').setFontWeight('bold');
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
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    payload.id = generateId();
    const row = headers.map(h => payload[h] !== undefined ? payload[h] : '');
    sheet.appendRow(row);
    return { success: true, data: payload };
}

function updateRow(sheetName, payload) {
    const sheet = getSheet(sheetName);
    const data = sheet.getDataRange().getValues();
    if (data.length < 2) return { success: false, error: 'السجل غير موجود' };
    const headers = data[0];
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
    const sheet = getSheet(sheetName);
    const data = sheet.getDataRange().getValues();
    if (data.length < 2) return { success: false, error: 'السجل غير موجود' };
    const idCol = data[0].indexOf('id');
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
        const rows = sheetToObjects(sheet);
        all = all.concat(rows);
    });
    return { success: true, data: all };
}

function addKhodam(payload) {
    if (!payload.stage) return { success: false, error: 'المرحلة مطلوبة' };
    const sheetName = stageSheetName(payload.stage);
    const sheet = getSheet(sheetName);
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    payload.id = generateId();
    const row = headers.map(h => payload[h] !== undefined ? payload[h] : '');
    sheet.appendRow(row);
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

    // Stage changed — find and delete from old tab, insert in new tab
    let deleted = false;
    for (const stage of KHODAM_STAGES) {
        const oldSheet = stageSheetName(stage);
        if (oldSheet === newSheet) continue;
        const data = getSheet(oldSheet).getDataRange().getValues();
        const headers = data[0] || [];
        const col = headers.indexOf('id');
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

    // Insert into new tab
    const sheet = getSheet(newSheet);
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const row = headers.map(h => payload[h] !== undefined ? payload[h] : '');
    sheet.appendRow(row);
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
    const sheetName = attendanceSheetName(payload.stage);
    const sheet = getSheet(sheetName);
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    payload.id = generateId();
    const row = headers.map(h => payload[h] !== undefined ? payload[h] : '');
    sheet.appendRow(row);
    return { success: true, data: payload };
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
    const tab = khodamStageToMakhdomenTab(stage);
    const sheetName = 'مخدومين_' + tab;
    return { success: true, data: sheetToObjects(getSheet(sheetName)) };
}

// جلب كل المخدومين من جميع التابات (للمدير)
function getAllMakhdomen() {
    const tabs = ['حضانة', 'أولى_تانية_ابتدائي', 'تالتة_رابعة_ابتدائي',
        'خامسة_سادسة_ابتدائي', 'إعدادي', 'ثانوي', 'شباب', 'خريجين'];
    let all = [];
    tabs.forEach(tab => {
        all = all.concat(sheetToObjects(getSheet('مخدومين_' + tab)));
    });
    return { success: true, data: all };
}

function addMakhdomen(payload) {
    if (!payload.stage) return { success: false, error: 'المرحلة مطلوبة' };
    const sheet = getSheet(makhdomenSheetName(payload.stage));
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    payload.id = generateId();
    sheet.appendRow(headers.map(h => payload[h] !== undefined ? payload[h] : ''));
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
    const allTabs = ['حضانة', 'أولى_تانية_ابتدائي', 'تالتة_رابعة_ابتدائي',
        'خامسة_سادسة_ابتدائي', 'إعدادي', 'ثانوي', 'شباب', 'خريجين'];
    let deleted = false;
    for (const tab of allTabs) {
        const oldSheet = 'مخدومين_' + tab;
        if (oldSheet === newSheet) continue;
        const data = getSheet(oldSheet).getDataRange().getValues();
        const headers = data[0] || [];
        const col = headers.indexOf('id');
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

    const sheet = getSheet(newSheet);
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const row = headers.map(h => payload[h] !== undefined ? payload[h] : '');
    sheet.appendRow(row);
    return { success: true, data: payload };
}

function deleteMakhdomen(payload) {
    if (!payload.stage) return { success: false, error: 'المرحلة مطلوبة' };
    return deleteRow(makhdomenSheetName(payload.stage), payload.id);
}

// ── حضور المخدومين حسب المرحلة ───────────────────────────────────
// stage هنا مرحلة الخادم (8) — نجلب تاب حضور المخدومين المقابل
function getMakhdomenAttendance(stage) {
    if (!stage) return { success: false, error: 'المرحلة مطلوبة' };
    const tab = khodamStageToMakhdomenTab(stage);
    const sheetName = 'حضور_مخدومين_' + tab;
    return { success: true, data: sheetToObjects(getSheet(sheetName)) };
}

function addMakhdomenAttendance(payload) {
    // payload.stage = المرحلة الدقيقة للمخدوم — نحوّلها للتاب المجمّع
    if (!payload.stage) return { success: false, error: 'المرحلة مطلوبة' };
    const sheetName = makhdomenAttSheetName(payload.stage);
    const sheet = getSheet(sheetName);
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    payload.id = generateId();
    sheet.appendRow(headers.map(h => payload[h] !== undefined ? payload[h] : ''));
    return { success: true, data: payload };
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
    const sheet = getSheet('Sessions');
    const now = new Date();
    const expires = new Date(now.getTime() + SESSION_HOURS * 60 * 60 * 1000);
    const token = generateToken();
    sheet.appendRow([token, user.id, user.username,
        now.toISOString(), expires.toISOString(), now.toISOString()]);
    return token;
}

function validateSession(token) {
    if (!token) return { valid: false, reason: 'لا يوجد توكن' };
    const sheet = getSheet('Sessions');
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const tokenCol = headers.indexOf('token');
    const expiresCol = headers.indexOf('expiresAt');
    const lastUsedCol = headers.indexOf('lastUsed');

    for (let i = 1; i < data.length; i++) {
        if (data[i][tokenCol] === token) {
            if (new Date() > new Date(data[i][expiresCol])) {
                sheet.deleteRow(i + 1);
                return { valid: false, reason: 'انتهت مدة الجلسة، يرجى تسجيل الدخول مجدداً.' };
            }
            const newExpiry = new Date(Date.now() + SESSION_HOURS * 60 * 60 * 1000);
            sheet.getRange(i + 1, expiresCol + 1).setValue(newExpiry.toISOString());
            sheet.getRange(i + 1, lastUsedCol + 1).setValue(new Date().toISOString());
            return { valid: true };
        }
    }
    return { valid: false, reason: 'جلسة غير صالحة، يرجى تسجيل الدخول مجدداً.' };
}

function logout(token) {
    if (!token) return { success: true };
    const sheet = getSheet('Sessions');
    const data = sheet.getDataRange().getValues();
    const tokenCol = data[0].indexOf('token');
    for (let i = 1; i < data.length; i++) {
        if (data[i][tokenCol] === token) { sheet.deleteRow(i + 1); break; }
    }
    return { success: true };
}

function cleanExpiredSessions() {
    try {
        const sheet = getSheet('Sessions');
        const data = sheet.getDataRange().getValues();
        if (data.length < 2) return;
        const expiresCol = data[0].indexOf('expiresAt');
        const now = new Date();
        for (let i = data.length - 1; i >= 1; i--) {
            const exp = new Date(data[i][expiresCol]);
            if (!isNaN(exp.getTime()) && exp < now) sheet.deleteRow(i + 1);
        }
    } catch (e) {
        Logger.log('cleanExpiredSessions error: ' + e.message);
    }
}

// ── المصادقة ──────────────────────────────────────────────────────
function login({ username, password }) {
    if (!username || !password)
        return { success: false, error: 'اسم المستخدم وكلمة المرور مطلوبان' };
    const users = sheetToObjects(getSheet('Users'));
    const user = users.find(u =>
        String(u.username).toLowerCase() === String(username).toLowerCase() &&
        String(u.password) === String(password));
    if (!user) return { success: false, error: 'اسم المستخدم أو كلمة المرور غير صحيحة' };
    if (user.status === 'inactive') return { success: false, error: 'تم تعطيل هذا الحساب. تواصل مع المدير.' };
    const token = createSession(user);
    const { password: _, ...safeUser } = user;
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
    const users = sheetToObjects(getSheet('Users'));
    const pending = sheetToObjects(getSheet('PendingUsers'));
    const taken = [...users, ...pending];
    if (taken.find(u => String(u.username).toLowerCase() === String(username).toLowerCase()))
        return { success: false, error: 'اسم المستخدم موجود بالفعل أو في انتظار المراجعة' };

    const sheet = getSheet('PendingUsers');
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const id = generateId();
    const payload = {
        id, username, password, email, role, stage,
        requestedAt: new Date().toISOString(), note
    };
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
    const sheet = getSheet('Users');
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const id = generateId();
    const payload = {
        id, username, password, email, role, stage, status: 'active',
        createdAt: new Date().toISOString()
    };
    sheet.appendRow(headers.map(h => payload[h] !== undefined ? payload[h] : ''));
    return { success: true, data: { id, username, email, role, stage } };
}

// ── إدارة الطلبات المعلقة ─────────────────────────────────────────
function getPendingUsers() {
    return { success: true, data: sheetToObjects(getSheet('PendingUsers')) };
}

function approveUser(payload) {
    const { id } = payload;
    const sheet = getSheet('PendingUsers');
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const idCol = headers.indexOf('id');

    for (let i = 1; i < data.length; i++) {
        if (String(data[i][idCol]) === String(id)) {
            // بناء كائن المستخدم من بيانات الطلب
            const obj = {};
            headers.forEach((h, j) => { obj[h] = data[i][j]; });

            // إضافته لـ Users مباشرةً (بدون مرور على register لتجنب تحقق التكرار)
            const approvedRole = payload.role || obj.role || 'user';
            const approvedStage = payload.stage || obj.stage || '';
            const usersSheet = getSheet('Users');
            const uHeaders = usersSheet.getRange(1, 1, 1, usersSheet.getLastColumn()).getValues()[0];
            const newUser = {
                id: generateId(), username: obj.username, password: obj.password,
                email: obj.email, role: approvedRole, stage: approvedStage,
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
    const data = sheet.getDataRange().getValues();
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
    return {
        success: true, data: users.map(u => {
            const { password: _, ...safe } = u;
            return safe;
        })
    };
}

function updateUser(payload) {
    const sheet = getSheet('Users');
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const idCol = headers.indexOf('id');
    for (let i = 1; i < data.length; i++) {
        if (String(data[i][idCol]) === String(payload.id)) {
            headers.forEach((h, j) => {
                if (payload[h] !== undefined && h !== 'id' && h !== 'password')
                    data[i][j] = payload[h];
            });
            // تحديث كلمة المرور فقط إذا أُرسلت
            if (payload.newPassword) {
                const pwdCol = headers.indexOf('password');
                if (pwdCol >= 0) data[i][pwdCol] = payload.newPassword;
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
    const users = sheetToObjects(getSheet('Users'));
    const user = users.find(u => String(u.email).toLowerCase() === String(email).toLowerCase());
    if (!user) return { success: false, error: 'لم يتم العثور على حساب بهذا البريد' };
    return { success: true, message: `يوجد حساب لـ ${email}. تواصل مع المسؤول لإعادة تعيين كلمة المرور.` };
}

// ── برنامج الخدمة ─────────────────────────────────────────────────
function getProgram() {
    const sheet = getSheet('ServiceProgram');
    const data = sheet.getDataRange().getValues();
    if (data.length < 2) return { success: true, data: null };
    const headers = data[0];
    const last = data[data.length - 1];
    const obj = {};
    headers.forEach((h, i) => { obj[h] = last[i]; });
    let items = [];
    try { items = JSON.parse(obj.items || '[]'); } catch { }
    return { success: true, data: { date: obj.date, items, updatedAt: obj.updatedAt } };
}

function saveProgram(payload) {
    const { date, items, username } = payload;
    if (!date) return { success: false, error: 'التاريخ مطلوب' };
    const sheet = getSheet('ServiceProgram');
    const now = new Date().toISOString();
    const itemsJSON = JSON.stringify(items || []);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const dateCol = headers.indexOf('date');
    for (let i = 1; i < data.length; i++) {
        if (String(data[i][dateCol]) === String(date)) {
            const row = headers.map(h => {
                if (h === 'items') return itemsJSON;
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

/* 示範資料：系統日誌歷史紀錄（V2-T04）。日期相對於今天產生（同 A-25）：
   最近 7 天 15 筆、約 2 個月前 8 筆、約 2 年前 5 筆（同一個月）、3 年又 1 天前 1 筆（purge 會刪除）、3 年減 1 天前 1 筆（purge 保留）。
   id 由 LOG-00001 依時間由舊到新編號；Audit 執行期自產的 id 延續最大號。 */
(function () {
  'use strict';
  function p2(n) { return n < 10 ? '0' + n : '' + n; }
  function fmt(d, hh, mm, ss) {
    return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()) + ' ' + p2(hh) + ':' + p2(mm) + ':' + p2(ss);
  }
  var now = new Date();
  var Y = now.getFullYear(), M = now.getMonth(), D = now.getDate();
  function daysAgo(n, hh, mm, ss) { return fmt(new Date(Y, M, D - n), hh, mm, ss); }
  function inMonth(y, m, day, hh, mm, ss) { return fmt(new Date(y, m, day), hh, mm, ss); }

  var U = {
    admin: { userId: 'USR-001', account: 'admin', userName: '王大明', role: '系統管理者' },
    manager: { userId: 'USR-002', account: 'manager', userName: '林美惠', role: '管理者' },
    user: { userId: 'USR-003', account: 'user', userName: '陳建宏', role: '使用者' },
    reader: { userId: 'USR-004', account: 'reader', userName: '張雅婷', role: '唯讀使用者' },
    tsai: { userId: 'USR-009', account: 'che.tsai', userName: '蔡宜君', role: '使用者' }
  };

  Store.registerSeed('auditLogs', 'V2-T04', function () {
    var rows = [];
    function r(at, u, module, action, summary, targetType, targetId, result, extra) {
      var o = {
        schoolId: 'SCH-001', userId: u.userId, account: u.account, userName: u.userName, role: u.role,
        at: at, address: '本機瀏覽器（POC 模擬）', module: module, action: action,
        targetType: targetType || '', targetId: targetId || '', summary: summary, result: result || '成功'
      };
      if (extra) Object.keys(extra).forEach(function (k) { o[k] = extra[k]; });
      rows.push(o);
    }
    var SYS = { userId: '', account: '', userName: '系統', role: '' };

    // 3 年又 1 天前（purge 刪除）／3 年減 1 天前（purge 保留）
    r(fmt(new Date(Y - 3, M, D - 1), 10, 15, 0), U.admin, 'SDS 建置管理', '新增', '新增SDS SDS-090（舊版示範物質）', 'sdsList', 'SDS-090');
    r(fmt(new Date(Y - 3, M, D + 1), 14, 20, 5), U.manager, '化學品管理', '修改', '修改化學品 CH-001（汞）', 'chemicals', 'CH-001');

    // 約 2 年前（同一個月）5 筆
    var y2 = Y - 2;
    r(inMonth(y2, M, 3, 9, 5, 12), U.admin, '系統', '登入', '登入成功（帳號 admin）');
    r(inMonth(y2, M, 8, 10, 30, 41), U.user, '毒化物管理', '新增', '新增毒化物文件 DOC-001', 'toxDocuments', 'DOC-001');
    r(inMonth(y2, M, 12, 13, 2, 9), U.manager, 'SDS 建置管理', '修改', '修改SDS SDS-001', 'sdsList', 'SDS-001');
    r(inMonth(y2, M, 18, 15, 47, 30), U.manager, '申報管理', '匯出', '匯出毒化物月報（毒化物月報_舊.xlsx）');
    r(inMonth(y2, M, 24, 16, 10, 2), U.admin, '系統', '登出', '登出');

    // 約 2 個月前 8 筆
    r(daysAgo(63, 9, 12, 8), U.admin, '系統', '登入', '登入成功（帳號 admin）');
    r(daysAgo(63, 9, 20, 44), U.admin, '基本資料設定', '新增', '新增人員 USR-009（蔡宜君）', 'users', 'USR-009');
    r(daysAgo(61, 11, 3, 15), U.tsai, '化學品管理', '新增', '新增化學品 CH-006（清潔劑 CL-20）', 'chemicals', 'CH-006');
    r(daysAgo(60, 14, 40, 0), U.manager, 'SDS 建置管理', '查詢', '查詢 SDS：關鍵字「汞」、SDS 狀態「有效」');
    r(daysAgo(58, 10, 8, 27), U.user, '毒化物管理', '修改', '修改毒化物文件 DOC-001', 'toxDocuments', 'DOC-001');
    r(daysAgo(57, 16, 55, 3), U.reader, '化學品管理', '查詢', '查詢化學品：關鍵字「酸」');
    r(daysAgo(56, 8, 30, 0), SYS, '系統', '系統作業', '自動結轉期初結餘 OPB-009（化學品 CH-001，本月）', 'openingBalances', 'OPB-009', '系統');
    r(daysAgo(55, 17, 21, 36), U.admin, '系統', '登出', '登出');

    // 最近 7 天 15 筆（不含今天，確保新紀錄在最上）
    r(daysAgo(7, 9, 1, 14), U.admin, '系統', '登入', '登入成功（帳號 admin）');
    r(daysAgo(7, 9, 15, 52), U.admin, 'SDS 建置管理', '修改', '修改SDS SDS-001', 'sdsList', 'SDS-001');
    r(daysAgo(6, 10, 22, 7), U.user, '化學品管理', '查詢', '查詢化學品：組織部門「化學系」、關鍵字「汞」');
    r(daysAgo(6, 10, 40, 18), U.user, '化學品管理', '修改', '修改化學品 CH-001（汞）', 'chemicals', 'CH-001');
    r(daysAgo(5, 13, 5, 0), U.reader, '系統', '登入', '登入成功（帳號 reader）');
    r(daysAgo(5, 13, 12, 33), U.reader, '毒化物管理', '查詢', '查詢政府毒化物清單：關鍵字「汞」');
    r(daysAgo(4, 9, 30, 21), U.manager, '化學品管理', '匯出', '匯出化學品查詢結果 3 筆（化學品查詢結果_demo.xlsx）');
    r(daysAgo(4, 11, 2, 45), U.manager, 'SDS 建置管理', '刪除', '刪除SDS SDS-099（過期示範物質）', 'sdsList', 'SDS-099');
    r(daysAgo(3, 14, 18, 9), U.tsai, '系統', '登入', '登入成功（帳號 che.tsai）');
    r(daysAgo(3, 14, 25, 40), U.tsai, '化學品管理', '修改', '修改化學品 CH-006（清潔劑 CL-20）', 'chemicals', 'CH-006');
    r(daysAgo(2, 8, 45, 2), U.admin, '申報管理', '匯出', '匯出毒化物月報（毒化物月報_demo.xlsx）');
    r(daysAgo(2, 16, 0, 30), U.admin, '基本資料設定', '修改', '修改人員 USR-005（李俊廷）', 'users', 'USR-005');
    r(daysAgo(1, 9, 10, 0), U.manager, '系統', '登入失敗', '登入失敗（帳號 manager，密碼錯誤）', '', '', '失敗', { userId: '', userName: '', role: '' });
    r(daysAgo(1, 9, 11, 3), U.manager, '系統', '登入', '登入成功（帳號 manager）');
    r(daysAgo(1, 17, 33, 19), U.admin, '毒化物管理', '刪除', '刪除毒化物文件 DOC-099（過期示範文件）', 'toxDocuments', 'DOC-099');

    rows.sort(function (a, b) { return a.at < b.at ? -1 : (a.at > b.at ? 1 : 0); });
    rows.forEach(function (o, i) {
      var n = String(i + 1); while (n.length < 5) n = '0' + n;
      o.id = 'LOG-' + n;
    });
    return rows;
  });
})();

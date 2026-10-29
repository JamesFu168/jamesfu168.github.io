/* 操作日誌共用模組（V2-T01，V2 PLAN §3.3、A-30）
   直接操作 Store.get('auditLogs') 並呼叫 Store.save()，不經由 Store.add（避免遞迴）。 */
(function (w) {
  'use strict';

  var ADDRESS = '本機瀏覽器（POC 模擬）';
  var COLL = 'auditLogs';
  var MAX_ROWS = 3000;
  var KEEP_YEARS = 3;

  var COLL_NAME = {
    schools: '學校', users: '人員', orgs: '組織', positions: '位置', sdsList: 'SDS', chemicals: '化學品',
    openingBalances: '期初結餘', dailyRecords: '每日用量', toxDocuments: '毒化物文件', floorplans: '平面圖',
    news: '最新消息', emergencyItems: '緊急應變內容'
  };
  var KIND_ACTION = { add: '新增', update: '修改', remove: '刪除' };

  function p2(n) { return n < 10 ? '0' + n : '' + n; }
  function nowStr() {
    var d = new Date();
    return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()) + ' ' + p2(d.getHours()) + ':' + p2(d.getMinutes()) + ':' + p2(d.getSeconds());
  }
  function str(v) { return (v === undefined || v === null) ? '' : String(v); }

  // 全表掃描取最大號（上限 3000 筆，成本可忽略）；不假設陣列順序
  function nextId(list) {
    var max = 0;
    for (var i = 0; i < list.length; i++) {
      var m = /^LOG-(\d+)$/.exec(list[i] && list[i].id || '');
      if (m) { var v = parseInt(m[1], 10); if (v > max) max = v; }
    }
    var n = String(max + 1);
    while (n.length < 5) n = '0' + n;
    return 'LOG-' + n;
  }

  // 目前登入者（未登入回傳空物件）
  function who() {
    var u = null, s = null;
    try { u = Store.session.currentUser(); s = Store.session.currentSchool(); } catch (e) { u = null; }
    return u ? { schoolId: u.schoolId, userId: u.id, account: u.account, userName: u.name, role: u.role }
             : { schoolId: s ? s.id : '', userId: '', account: '', userName: '', role: '' };
  }

  // 預設模組：目前頁面所屬 Sidebar 群組（首頁為「首頁」），查不到為「系統」
  function curModule() {
    try { return (w.App && w.App.currentModule && w.App.currentModule()) || '系統'; } catch (e) { return '系統'; }
  }

  function itemName(item) {
    if (!item) return '';
    var keys = ['name', 'nameZh', 'indexCode', 'docNo', 'account'];
    for (var i = 0; i < keys.length; i++) { if (item[keys[i]]) return str(item[keys[i]]); }
    return str(item.id);
  }

  var Audit = {
    ADDRESS: ADDRESS,
    MAX_ROWS: MAX_ROWS,
    COLL_NAME: COLL_NAME,

    /* opts：module, action, targetType, targetId, summary, result；
       另可覆寫 schoolId, userId, account, userName, role, at（登入失敗、系統作業用） */
    record: function (opts) {
      try {
        opts = opts || {};
        var base = who();
        var list = Store.get(COLL);
        var rec = {
          id: nextId(list),
          schoolId: opts.schoolId !== undefined ? opts.schoolId : base.schoolId,
          userId: opts.userId !== undefined ? opts.userId : base.userId,
          account: opts.account !== undefined ? opts.account : base.account,
          userName: opts.userName !== undefined ? opts.userName : base.userName,
          role: opts.role !== undefined ? opts.role : base.role,
          at: opts.at || nowStr(),
          address: ADDRESS,
          module: str(opts.module) || curModule(),
          action: str(opts.action),
          targetType: str(opts.targetType),
          targetId: str(opts.targetId),
          summary: str(opts.summary),
          result: str(opts.result) || '成功'
        };
        list.push(rec);
        Store.save(); // 容量不足時回傳 false，靜默忽略
        return rec;
      } catch (e) { return null; }
    },

    /* 目前學校的紀錄，最新在前（at 降冪，同時間以 id 降冪）。
       q：keyword（比對人員姓名、帳號、操作動作、摘要、模組，忽略空白與大小寫）、action（操作動作完全相符）、
       from／to（YYYY-MM-DD，含首尾日，以 at 的日期部分比對）。V2-T04 */
    list: function (q) {
      q = q || {};
      var sid = who().schoolId;
      var kw = str(q.keyword).replace(/\s+/g, '').toLowerCase();
      var rows = Store.get(COLL).filter(function (r) {
        if (sid && r.schoolId !== sid) return false;
        var day = str(r.at).slice(0, 10);
        if (q.from && day < q.from) return false;
        if (q.to && day > q.to) return false;
        if (q.action && r.action !== q.action) return false;
        if (kw) {
          var hay = [r.userName, r.account, r.action, r.summary, r.module].join('').replace(/\s+/g, '').toLowerCase();
          if (hay.indexOf(kw) < 0) return false;
        }
        return true;
      });
      return rows.slice().sort(function (a, b) {
        if (a.at !== b.at) return a.at < b.at ? 1 : -1;
        return a.id < b.id ? 1 : (a.id > b.id ? -1 : 0);
      });
    },

    // 操作人員顯示：「姓名（帳號）」；系統作業只顯示「系統」；未登入（登入失敗）只顯示帳號
    displayUser: function (r) {
      if (r.userName === '系統' && r.action === '系統作業') return '系統';
      if (r.userName && r.account) return r.userName + '（' + r.account + '）';
      return r.userName || r.account || '—';
    },

    EXPORT_HEADERS: ['操作時間', '操作人員', '角色', '位址', '模組', '操作動作', '操作內容', '結果'],

    // 與畫面表格相同的八欄（純文字）；list 為 Audit.list 的結果
    // 匯出用的操作內容：目標集合可查且目標已不存在時，在 id 後加「（已刪除）」，與日誌頁顯示一致（V2-T04）
    summaryText: function (r) {
      var text = r.summary || '';
      if (!r.targetType || !r.targetId || !w.Store || !Array.isArray(Store.get(r.targetType))) return text;
      if (Store.getById(r.targetType, r.targetId)) return text;
      var idx = text.indexOf(r.targetId);
      return idx >= 0 ? text.slice(0, idx) + r.targetId + '（已刪除）' + text.slice(idx + r.targetId.length) : text + ' ' + r.targetId + '（已刪除）';
    },

    exportRows: function (list) {
      return (list || []).map(function (r) {
        return [r.at, Audit.displayUser(r), (r.userName === '系統' && r.action === '系統作業') ? '系統' : (r.role || '—'),
          r.address || ADDRESS, r.module, r.action, Audit.summaryText(r), r.result];
      });
    },

    // 下拉選單目前選取的文字（值為空＝未選，回傳空字串）；供各頁組查詢條件摘要
    selText: function (selector) {
      try {
        var e = document.querySelector(selector);
        if (!e || !e.value) return '';
        var o = e.options && e.options[e.selectedIndex];
        return o ? o.text.replace(/\s+/g, ' ').trim() : e.value;
      } catch (err) { return ''; }
    },

    // 條件摘要：pairs 為 [[標籤, 值], ...]，略過空值；全空回傳「未設條件」。例：關鍵字「汞」、狀態「有效」
    cond: function (pairs) {
      var out = [];
      (pairs || []).forEach(function (p) {
        var v = str(p[1]).trim();
        if (v) out.push(p[0] + '「' + v + '」');
      });
      return out.length ? out.join('、') : '未設條件';
    },

    /* 保存政策（A-30）：刪除 at 的日期早於「今天減三年」（同月同日當日保留）的紀錄；
       之後若仍超過 MAX_ROWS，依 at 由舊到新刪除至剩 MAX_ROWS 筆。回傳刪除筆數。 */
    purge: function () {
      try {
        var list = Store.get(COLL);
        var d = new Date();
        var cut = (d.getFullYear() - KEEP_YEARS) + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate());
        var before = list.length;
        var keep = list.filter(function (r) { return str(r.at).slice(0, 10) >= cut; });
        if (keep.length > MAX_ROWS) {
          var idx = keep.map(function (r, i) { return { i: i, at: str(r.at) }; });
          idx.sort(function (a, b) { return a.at < b.at ? -1 : (a.at > b.at ? 1 : a.i - b.i); });
          var drop = {};
          for (var k = 0; k < keep.length - MAX_ROWS; k++) drop[idx[k].i] = true;
          keep = keep.filter(function (r, i) { return !drop[i]; });
        }
        if (keep.length !== before) {
          list.length = 0;
          Array.prototype.push.apply(list, keep);
          Store.save();
        }
        return before - keep.length;
      } catch (e) { return 0; }
    },

    // Store.add／update／remove 成功後由 store.js 呼叫；kind：add｜update｜remove
    onStoreChange: function (kind, coll, item) {
      try {
        if (coll === COLL || coll === 'closedMonths') return;
        var cname = COLL_NAME[coll];
        if (!cname || !KIND_ACTION[kind]) return;
        var id = item && item.id ? item.id : '';
        var name = itemName(item);
        var label = cname + ' ' + id + (name && name !== id ? '（' + name + '）' : '');
        if (coll === 'openingBalances' && item && item.source === 'carry') {
          Audit.record({ module: '系統', action: '系統作業', result: '系統', userName: '系統', targetType: coll, targetId: id,
            summary: '自動結轉期初結餘 ' + id + '（化學品 ' + str(item.chemicalId) + '，' + str(item.month) + '）' });
          return;
        }
        Audit.record({ action: KIND_ACTION[kind], targetType: coll, targetId: id, summary: KIND_ACTION[kind] + label });
      } catch (e) { /* ignore */ }
    }
  };

  w.Audit = Audit;
})(window);

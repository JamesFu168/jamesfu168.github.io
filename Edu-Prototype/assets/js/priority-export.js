/* 優先管理化學品填報檔組裝（V2-T07，展示假設 A-33）。純函式、不依賴 DOM／Store，Node／瀏覽器皆可載入。
   C 欄危害分類代碼依 HAZARD_CODE_MAP 從嚴對照（見該常數註解）。
   PriorityExport.build(rows, opts)：rows 為 [{chem, sds}]（目前查詢結果）；回傳 {sheets, stats}，sheets 可直接交給 ExportUtil.workbookToFile。 */
(function (root) {
  'use strict';

  var T = (typeof module !== 'undefined' && module.exports) ? require('./priority-template.js') : root.PriorityTemplate;

  var QTY_OPTIONS = [['maxStore', '最大儲存量'], ['avgStore', '平均儲存量'], ['maxUse', '最大使用量'], ['avgUse', '平均使用量']];
  var DEFAULT_YEAR = 'avgUse', DEFAULT_MAX = 'maxStore';
  var NOTE_ROW = '本檔由教育部化學雲 POC 產生（示範資料），非正式申報文件';
  // 單位 → 公噸係數；公升、毫升以密度 1 換算（A-33）
  var FACTOR = { '公斤': 1e-3, '公克': 1e-6, '公升': 1e-3, '毫升': 1e-6 };
  var DENSITY_UNITS = { '公升': 1, '毫升': 1 };

  function str(v) { return (v === undefined || v === null) ? '' : String(v).trim(); }
  function round6(n) { return Math.round(n * 1e6) / 1e6; }
  function p2(n) { return n < 10 ? '0' + n : '' + n; }
  function p4(n) { var s = String(n); while (s.length < 4) s = '0' + s; return s; }

  function optionLabel(key) {
    for (var i = 0; i < QTY_OPTIONS.length; i++) if (QTY_OPTIONS[i][0] === key) return QTY_OPTIONS[i][1];
    return key;
  }

  // 數量 × 單位 → 公噸；無法換算（空白、非數字、未知單位）回 null
  function toTon(qty, unit) {
    var q = parseFloat(qty), f = FACTOR[str(unit)];
    if (str(qty) === '' || !isFinite(q) || f === undefined) return null;
    return q * f;
  }

  /* C 欄危害分類代碼對照（A-33 細化「對照表＋從嚴」）。鍵為 SdsSchema.HAZARD_OPTIONS 的 26 個選項，值為 H 碼或 null（比對不到不捏造）。
     選碼順序：(a) 名稱去空白、去「第」「級」後與代碼表相等；(b) 1A／1B／2A 等子級找不到時退回同類「第 1 級」「第 2 級」；
     (c) 代碼表有 -A／-B／-C 情境變體時取 -C（參考檔填寫說明：從嚴帶入）；(d) 急毒性、水環境括號次序正規化後比對；
     (e) 爆炸物「1.1 級」對表「1.1 組」。依據逐筆列於下，以 PriorityTemplate.CODES 核對後寫死。 */
  var HAZARD_CODE_MAP = {
    '爆炸物 第 1.1 級': 'H201',                          // (e) 表「爆炸物1.1組」
    '易燃氣體 第 1 級': 'H220',                          // (a)
    '加壓氣體': null,                                    // 表內只有壓縮／冷凍液化／液化／溶解四種細分，無法判定
    '氧化性氣體 第 1 級': 'H270',                        // (a)
    '易燃液體 第 1 級': 'H224',                          // (a)
    '易燃液體 第 2 級': 'H225-C',                        // (c) 表有 H225-A/B/C，取 -C
    '易燃液體 第 3 級': 'H226-C',                        // (c) 表有 H226-A/B/C，取 -C
    '易燃固體 第 1 級': 'H228-1',                        // (a) 表「易燃固體第1級」
    '氧化性液體 第 2 級': 'H272-2',                      // (a)
    '金屬腐蝕物 第 1 級': 'H290',                        // (a)
    '急毒性物質 第 2 級（吸入）': 'H330-2',              // (d) 表「急毒性物質（吸入）第2級」
    '急毒性物質 第 3 級（吞食）': 'H301',                // (d) 表「急毒性物質（吞食）第3級」
    '腐蝕／刺激皮膚物質 第 1A 級': 'H314',               // (b) 退回「第1級」
    '腐蝕／刺激皮膚物質 第 2 級': 'H315',                // (a)
    '嚴重眼睛損傷／眼睛刺激物質 第 2A 級': 'H319',       // (b) 表名「嚴重損傷／刺激眼睛物質第2A級」，名稱別名後相等
    '生殖細胞致突變性物質 第 2 級': 'H341',              // (a)
    '致癌物質 第 1A 級': 'H350',                         // (b) 退回「第1級」
    '致癌物質 第 1B 級': 'H350',                         // (b) 退回「第1級」
    '生殖毒性物質 第 1B 級': 'H360',                     // (b) 退回「第1級」
    '皮膚過敏物質 第 1 級': 'H317',                      // (a)
    '水環境之危害物質 急毒性 第 1 級': 'H400',           // (d) 表「水環境之危害物質第1級（急毒性）」
    '水環境之危害物質 急毒性 第 2 級': 'H401',           // (d)
    '水環境之危害物質 慢毒性 第 1 級': 'H410',           // (d)
    '水環境之危害物質 慢毒性 第 2 級': 'H411',           // (d)
    '水環境之危害物質 慢毒性 第 3 級': 'H412',           // (d)
    '臭氧層危害物質 第 1 級': null                       // 代碼表無臭氧層危害類別
  };

  function codeByName(name) {
    var k = str(name).replace(/\s+/g, ' ');
    return Object.prototype.hasOwnProperty.call(HAZARD_CODE_MAP, k) ? (HAZARD_CODE_MAP[k] || '') : '';
  }

  // C 欄：SDS 第二項危害分類 → HAZARD_CODE_MAP 對照者，分號分隔且以分號結尾；無命中回空字串
  function hazardCodes(sds) {
    var s2 = (sds && sds.items && sds.items.s2) || {};
    var out = [];
    [].concat(s2.physicalHazards || [], s2.healthHazards || [], s2.envHazards || []).forEach(function (h) {
      var c = codeByName(h);
      if (c && out.indexOf(c) < 0) out.push(c);
    });
    return out.length ? out.join(';') + ';' : '';
  }

  function sdsName(sds) { return str((((sds || {}).items || {}).s1 || {}).nameZh); }

  function components(sds) {
    var s3 = (sds && sds.items && sds.items.s3) || {};
    var list = (s3.components || []).filter(function (c) { return c && (str(c.nameZh) || str(c.nameEn) || str(c.cas)); });
    if (s3.type === '純物質') list = list.slice(0, 1);
    return list.length ? list : [{}];
  }

  function filename(dateStr) {
    var d = dateStr ? String(dateStr).replace(/-/g, '').slice(0, 8) : (function () {
      var n = new Date(); return n.getFullYear() + p2(n.getMonth() + 1) + p2(n.getDate());
    })();
    return '優先管理化學品填報_' + d + '.ods';
  }

  // opts：{ maxField, yearField, skip, date }
  function build(rows, opts) {
    opts = opts || {};
    var skip = opts.skip === true;
    var maxField = opts.maxField || DEFAULT_MAX, yearField = opts.yearField || DEFAULT_YEAR;

    var groups = [], byId = {};
    (rows || []).forEach(function (r) {
      var id = r.sds.id;
      if (!byId[id]) { byId[id] = { sds: r.sds, chems: [] }; groups.push(byId[id]); }
      byId[id].chems.push(r.chem);
    });
    groups.sort(function (a, b) { return String(a.sds.indexCode || a.sds.id).localeCompare(String(b.sds.indexCode || b.sds.id)); });

    var data = [T.HEADERS.slice()], densityChems = [], unsupported = [];
    groups.forEach(function (g, gi) {
      var maxSum = 0, yearSum = 0, hasMax = false, hasYear = false;
      g.chems.forEach(function (c) {
        var m = toTon(c[maxField], c.unit), y = toTon(c[yearField], c.unit);
        if (m !== null) { maxSum += m; hasMax = true; }
        if (y !== null) { yearSum += y; hasYear = true; }
        if (DENSITY_UNITS[str(c.unit)]) densityChems.push({ name: str(c.nameZh) || str(c.nameEn), unit: str(c.unit) });
        else if (FACTOR[str(c.unit)] === undefined) unsupported.push({ name: str(c.nameZh) || str(c.nameEn), unit: str(c.unit) });
      });
      var F = (skip || !hasMax) ? '' : round6(maxSum);
      var H = (skip || !hasYear) ? '' : round6(yearSum * 12);
      var codes = hazardCodes(g.sds), nm = sdsName(g.sds);
      components(g.sds).forEach(function (comp, ci) {
        data.push([p4(gi + 1) + '_' + p2(ci + 1), nm, codes, '', '', F, '', H, '', '', '',
          str(comp.cas), str(comp.nameZh), str(comp.nameEn), str(comp.percent)]);
      });
    });

    var instr = T.INSTRUCTIONS.map(function (t) { return [t]; });
    instr.push([NOTE_ROW]);
    var sheets = [
      { name: T.SHEET_NAMES[0], aoa: instr, cols: [{ wch: 110 }] },
      { name: T.SHEET_NAMES[1], aoa: data, cols: [10, 24, 24, 12, 14, 14, 14, 16, 14, 12, 14, 14, 20, 22, 14].map(function (w) { return { wch: w }; }) },
      { name: T.SHEET_NAMES[2], aoa: T.CODES.map(function (r) { return r.slice(); }), cols: [{ wch: 12 }, { wch: 80 }] }
    ];
    return {
      sheets: sheets, filename: filename(opts.date),
      stats: { rowCount: data.length - 1, sdsCount: groups.length, chemCount: (rows || []).length, densityChems: densityChems, unsupported: unsupported }
    };
  }

  var api = { QTY_OPTIONS: QTY_OPTIONS, DEFAULT_YEAR: DEFAULT_YEAR, DEFAULT_MAX: DEFAULT_MAX, optionLabel: optionLabel,
    toTon: toTon, hazardCodes: hazardCodes, HAZARD_CODE_MAP: HAZARD_CODE_MAP, filename: filename, build: build };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.PriorityExport = api;
})(typeof window !== 'undefined' ? window : this);

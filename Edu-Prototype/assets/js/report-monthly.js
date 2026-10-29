/* 毒性化學物質運作紀錄表（月報）產生器（T12，T13 可參考）。
   ReportMonthly.build(chemIds, year, month) 為純函式（只讀 Store；Store.getOpening 會依 T07 規則寫入結轉紀錄），
   回傳 { summaryRows, substanceSheets }。summaryRows 為二維陣列，第 1 列為 35 欄表頭。
   展示假設 A-17：14 種行為映射到報表欄，「賣出」欄保留空白；A-18：同 SDS 多份文件取有效期限最晚者。 */
(function (w) {
  'use strict';

  var HEADERS = [
    "列管編號--序號",
    "毒性化學物質中文名稱",
    "濃度(%W/W) ",
    "組織部門",
    "SDS索引碼",
    "SDS 編號",
    "化學品編號",
    "化學品名稱",
    "許可證字號/登記文件字號/核可文件字號",
    "管制編號",
    "物質狀態",
    "上月結餘量",
    "單位",
    "月",
    "日",
    "運作量無變動",
    "製造",
    "輸入",
    "輸出",
    "買入",
    "賣出",
    "轉入",
    "轉出",
    "使用",
    "貯存增加\n(含撥入)",
    "貯存減少\n(含撥出)",
    "廢棄",
    "特殊情形",
    "廢棄退回",
    "本月結餘量",
    "毒性化學物質來源或去向之公司及廠場名稱\n(須先建上下游)",
    "毒性化學物質來源或去向之公司及廠場：許可證字號/登記文件字號/核可文件字號/國外廠商地址",
    "使用用途代號\n(使用行為須填)",
    "運送聯單編號\n(依運送規定者須填)",
    "備註\n(說明特殊情形)"
  ];

  // 行為名稱 → [報表欄名稱, 正負號]
  var ACTION_MAP = {
    '製造': ['製造', 1], '輸入': ['輸入', 1], '輸出': ['輸出', 1], '買入': ['買入', 1], '轉入': ['轉入', 1], '轉出': ['轉出', 1],
    '使用': ['使用', 1], '儲存增加': ['貯存增加', 1], '儲存減少': ['貯存減少', 1], '廢棄': ['廢棄', 1],
    '特殊情況增加': ['特殊情形', 1], '特殊情況減少': ['特殊情形', -1],
    '廢棄退回增加': ['廢棄退回', 1], '廢棄退回減少': ['廢棄退回', -1]
  };
  function colIndex(name) {
    for (var i = 0; i < HEADERS.length; i++) { if (HEADERS[i].split('\n')[0] === name) return i; }
    return -1;
  }
  var COL = {};
  ['月', '日', '運作量無變動', '製造', '輸入', '輸出', '買入', '賣出', '轉入', '轉出', '使用', '貯存增加', '貯存減少', '廢棄', '特殊情形', '廢棄退回', '本月結餘量']
    .forEach(function (n) { COL[n] = colIndex(n); });
  var NOTE_COL = HEADERS.length - 1;

  // 物質別工作表的紀錄欄（沿用參考檔排序）：前 16 欄與摘要表同名欄對應
  var SUB_KEYS = ['月', '日', '運作量無變動', '製造', '輸入', '輸出', '買入', '賣出', '轉入', '轉出', '使用', '貯存增加', '貯存減少', '廢棄', '特殊情形', '廢棄退回'];
  var SUB_HEADERS = ['月', '日', '運作量無變動', '製造', '輸入', '輸出', '買入', '賣出', '轉入', '轉出', '使用', '貯存增加(含撥入)', '貯存減少(含撥出)', '廢棄', '特殊情形', '廢棄退回',
    '結餘量(自行管理)', '來源或去向之公司及廠場名稱', '來源或去向之許可證字號/登記文件字號/核可文件字號/國外廠商地址', '使用用途代號', '運送聯單編號', '備註'];

  function p2(n) { return n < 10 ? '0' + n : '' + n; }
  function num(v) { var n = Number(v); return (v !== '' && v !== null && v !== undefined && isFinite(n)) ? n : v; }
  function round6(n) { return Math.round(n * 1e6) / 1e6; }

  function stateOf(sds) {
    var a = String((((sds || {}).items || {}).s9 || {}).appearance || '');
    if (a.indexOf('液') >= 0) return '液體';
    if (a.indexOf('固') >= 0) return '固體';
    if (a.indexOf('氣') >= 0) return '氣體';
    return '';
  }

  // 同一 SDS 多份文件：取有效期限最晚者（A-18）
  function latestDoc(sdsId) {
    var docs = Store.docsForSds(sdsId).slice().sort(function (a, b) { return String(b.validUntil || '').localeCompare(String(a.validUntil || '')); });
    return docs[0] || null;
  }

  function govItem(listedNo, seriesNo) {
    var items = (Store.get('govToxList') || {}).items || [];
    for (var i = 0; i < items.length; i++) { if (items[i].listedNo === listedNo && items[i].seriesNo === seriesNo) return items[i]; }
    return null;
  }

  // 一筆紀錄 → { 報表欄名稱: 值 }
  function recordCells(r) {
    var cells = {};
    if (!r.changed) { cells['運作量無變動'] = 'V'; return cells; }
    var m = ACTION_MAP[r.action];
    if (m) cells[m[0]] = round6(m[1] * (Number(r.qty) || 0));
    return cells;
  }

  function sheetName(listedNo, seriesNo, nameZh, used) {
    var base = (listedNo + '-' + seriesNo + ' ' + nameZh).replace(/[\[\]:*?\/\\]/g, '_');
    var name = base.slice(0, 31), i = 2;
    while (used[name]) { name = base.slice(0, 31 - String(i).length - 1) + '_' + i; i++; }
    used[name] = 1;
    return name;
  }

  function blankRow(n) { var a = []; for (var i = 0; i < n; i++) a.push(''); return a; }
  function dayOf(date) { return parseInt(String(date).slice(8, 10), 10); }

  function build(chemIds, year, month) {
    var ym = year + '-' + p2(Number(month));
    var summaryRows = [HEADERS.slice()];
    var sheetMap = {}, sheetOrder = [], usedNames = {};
    var daily = Store.get('dailyRecords');

    (chemIds || []).forEach(function (cid) {
      var chem = Store.getById('chemicals', cid);
      if (!chem || !Store.chemIsTox(chem)) return;
      var sds = Store.getById('sdsList', chem.sdsId);
      var s3 = (sds.items || {}).s3 || {};
      var comps = s3.components || [];
      var isMix = s3.type === '混合物';
      var doc = latestDoc(sds.id);
      var state = stateOf(sds);
      var opening = Store.getOpening(chem.id, ym);
      var openingQty = opening ? opening.qty : '';
      var recs = daily.filter(function (r) { return r.chemicalId === chem.id && String(r.date).slice(0, 7) === ym; })
        .sort(function (a, b) { return a.date === b.date ? String(a.id).localeCompare(String(b.id)) : (a.date < b.date ? -1 : 1); });
      var org = Store.orgPath(chem.orgId);

      var seen = {};
      (sds.toxMatches || []).forEach(function (mt) {
        var key = mt.listedNo + '-' + mt.seriesNo;
        if (seen[key]) return;
        seen[key] = 1;
        var g = govItem(mt.listedNo, mt.seriesNo);
        var nameZh = g ? g.nameZh : key;
        var comp = comps[mt.componentIndex] || {};
        var conc = isMix ? num(comp.percent === undefined ? '' : comp.percent) : 100;

        function baseRow() {
          var row = blankRow(HEADERS.length);
          row[0] = mt.listedNo + '--' + mt.seriesNo;
          row[1] = nameZh; row[2] = conc; row[3] = org;
          row[4] = sds.indexCode; row[5] = sds.id; row[6] = chem.id; row[7] = chem.nameZh || chem.nameEn || '';
          row[8] = doc ? doc.docNo : ''; row[9] = doc ? (doc.controlNo || '') : '';
          row[10] = state; row[11] = openingQty; row[12] = chem.unit || '';
          return row;
        }
        // 本月沒有任何紀錄：仍列一行識別資料（月、日與數量欄空白），備註「本月無運作紀錄」（與 Task 文件不同的 POC 決定）
        if (!recs.length) { var e = baseRow(); e[COL['月']] = Number(month); e[NOTE_COL] = '本月無運作紀錄'; summaryRows.push(e); }
        recs.forEach(function (r) {
          var row = baseRow();
          row[COL['月']] = Number(month); row[COL['日']] = dayOf(r.date);
          var cells = recordCells(r);
          Object.keys(cells).forEach(function (k) { row[COL[k]] = cells[k]; });
          var bal = Store.getDailyBalance(chem.id, r.date);
          row[COL['本月結餘量']] = bal === null ? '' : bal;
          row[NOTE_COL] = r.note || '';
          summaryRows.push(row);
        });

        // 物質別工作表：同一物質（列管編號-序號）一張，內含各化學品區塊
        var sh = sheetMap[key];
        if (!sh) {
          sh = sheetMap[key] = { key: key, nameZh: nameZh, name: sheetName(mt.listedNo, mt.seriesNo, nameZh, usedNames), rows: [], blocks: [] };
          sheetOrder.push(sh);
        }
        var A = sh.rows;
        if (A.length) A.push([], []);
        A.push(['組織部門：' + org]);
        A.push(['毒性化學物質中文名稱：' + nameZh, '', '', '', '', '', '', '', '列管編號--序號：' + mt.listedNo + '--' + mt.seriesNo, '', '', '', '', '', '', '', '', '', '填表人簽名或蓋章：']);
        A.push(['濃度(%W/W)', conc, '', '', '', '', '', '', '物質狀態：' + state]);
        A.push(['運作人：' + (doc ? doc.operatorName : ''), '', '', '', '', '', '', '', '地址：' + (doc ? doc.operatorAddress : '')]);
        A.push(['', '', '', '', '', '', '', '', '電話：' + (doc ? doc.operatorPhone : '')]);
        A.push(['運作場所', '名稱：' + (doc ? doc.siteName : ''), '', '', '', '', '', '', '', '', '', '', '管制編號：' + (doc ? (doc.controlNo || '') : '')]);
        A.push(['', '地址：' + (doc ? doc.siteAddress : '')]);
        A.push(['', '電話：' + (doc ? doc.sitePhone : '')]);
        A.push(['', '許可證字號/登記文件字號/核可文件字號：' + (doc ? doc.docNo : '')]);
        A.push(['', '上月結餘量：' + openingQty, '', '', '', '', '', '', '', '', '單位：' + (chem.unit || '')]);
        A.push(SUB_HEADERS.slice());
        if (!recs.length) {
          A.push(['本月無運作紀錄']);
        } else {
          recs.forEach(function (r) {
            var line = blankRow(SUB_HEADERS.length);
            line[0] = Number(month); line[1] = dayOf(r.date);
            var cells = recordCells(r);
            Object.keys(cells).forEach(function (k) { line[SUB_KEYS.indexOf(k)] = cells[k]; });
            var b = Store.getDailyBalance(chem.id, r.date);
            line[16] = b === null ? '' : b;
            line[21] = r.note || '';
            A.push(line);
          });
        }
        sh.blocks.push({ chemicalId: chem.id, records: recs.length });
      });
    });

    return {
      summaryRows: summaryRows,
      substanceSheets: sheetOrder.map(function (s) { return { name: s.name, key: s.key, nameZh: s.nameZh, rows: s.rows, blocks: s.blocks }; })
    };
  }

  function filename(year, month) { return '毒性化學物質運作紀錄表_' + year + '-' + p2(Number(month)) + '.xlsx'; }

  function exportXlsx(chemIds, year, month) {
    if (!w.XLSX) throw new Error('SheetJS 尚未載入');
    var res = build(chemIds, year, month);
    var wb = w.XLSX.utils.book_new();
    var ws = w.XLSX.utils.aoa_to_sheet(res.summaryRows);
    ws['!cols'] = HEADERS.map(function (h, i) { return { wch: i === 1 || i === 7 || i === 8 || i >= 30 ? 24 : (i === 3 ? 18 : 12) }; });
    w.XLSX.utils.book_append_sheet(wb, ws, '所有運作紀錄');
    res.substanceSheets.forEach(function (s) {
      var sw = w.XLSX.utils.aoa_to_sheet(s.rows);
      sw['!cols'] = SUB_HEADERS.map(function (h, i) { return { wch: i < 2 ? 8 : (i >= 17 ? 22 : 11) }; });
      w.XLSX.utils.book_append_sheet(wb, sw, s.name);
    });
    var name = filename(year, month);
    var arr = w.XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    var blob = new Blob([arr], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    if (w.ExportUtil && w.ExportUtil.downloadBlob) w.ExportUtil.downloadBlob(blob, name);
    else w.XLSX.writeFile(wb, name);
    return { filename: name, blob: blob, result: res };
  }

  w.ReportMonthly = { HEADERS: HEADERS, SUB_HEADERS: SUB_HEADERS, ACTION_MAP: ACTION_MAP, build: build, exportXlsx: exportXlsx, filename: filename,
    latestDoc: latestDoc, stateOf: stateOf, govItem: govItem };
})(typeof window !== 'undefined' ? window : globalThis);

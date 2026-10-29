/* 教育部毒化物批次申報格式產生器（T13）。
   MoeBatch.build(startDate, endDate, owner, filler) 為純函式（只讀 Store；Store.getOpening 會依 T07 規則寫入結轉紀錄），
   回傳 [{fileName, sheets:{申報表單, 證件資料, 運作紀錄, 工作表1}, meta}]，各工作表為二維陣列。
   MoeBatch.exportZip(files, zipName) 以 SheetJS bookType 'xls'（BIFF8）產生各檔再用 JSZip 打包下載。
   展示假設 A-17、A-18：以「文件 × 文件涵蓋物質」為一檔；同一 SDS 的運作紀錄只歸入有效期限最晚的文件。 */
(function (w) {
  'use strict';

  var SHEET_NAMES = ['申報表單', '證件資料', '運作紀錄', '工作表1'];
  var NO_CHANGE = '期間內皆無異動';

  // 表頭逐字取自參考檔 批次申報_汞參考.xls／批次申報_三氯乙烯參考.xls
  var FORM_HEADERS = ['運作人管編', '運作場所管編', '列管編號', '申報濃度\n(%W/W)', '物質狀態\n(固態、液態、氣態)', '負責人', '填表人', '重量單位', '前期結餘量'];
  var DOC_HEADERS = ['證件號碼', '濃度-單一', '濃度-以上', '濃度-以下', '濃度-區間下限', '濃度-區間上限'];
  var REC_HEADERS = ['月', '日', '運作行為', '重量', '來源或去向廠商管制編號', '來源或去向廠商名稱', '來源或去向廠商證件號碼', '備註', '運送聯單號碼'];

  // 「工作表1」參考值（物質狀態、運作行為、月份、日期），共 54 列 × 6 欄
  var REF_STATES = ['固態', '氣態', '液態'];
  var REF_ACTIONS = ['運作量無變動', '製造', '使用', '輸入', '輸出', '賣出', '買入', '減少(含撥出)', '增加(含撥入)', '廢棄', '轉入', '轉出', '特殊情形(減少)', '特殊情形(增加)'];
  function p2(n) { return n < 10 ? '0' + n : '' + n; }
  function refSheet() {
    var rows = [['物質狀態', '', '運作行為', '', '月份', '日期']];
    for (var i = 0; i < 53; i++) {
      rows.push([REF_STATES[i] || '', '', REF_ACTIONS[i] || '', '', i < 12 ? p2(i + 1) : '', i < 31 ? p2(i + 1) : '']);
    }
    return rows;
  }

  // 批次格式的行為名稱：以 ReportMonthly.ACTION_MAP 為基礎再加一層對照（欄名不同者）
  var BATCH_NAME = {
    '貯存增加': '增加(含撥入)', '貯存減少': '減少(含撥出)',
    '特殊情形+': '特殊情形(增加)', '特殊情形-': '特殊情形(減少)'
  };
  var NO_TEMPLATE = ['廢棄退回增加', '廢棄退回減少'];
  var DIRECT = ['製造', '輸入', '輸出', '買入', '轉入', '轉出', '使用', '廢棄'];

  // 回傳 { name, note }；name 為批次格式的運作行為名稱
  function mapAction(action) {
    var RM = w.ReportMonthly;
    var m = RM && RM.ACTION_MAP ? RM.ACTION_MAP[action] : null;
    if (NO_TEMPLATE.indexOf(action) >= 0) return { name: action, note: '範本無對應欄位' };
    if (!m) return { name: action || '', note: '' };
    var col = m[0];
    if (col === '特殊情形') return { name: BATCH_NAME['特殊情形' + (m[1] < 0 ? '-' : '+')], note: '' };
    if (BATCH_NAME[col]) return { name: BATCH_NAME[col], note: '' };
    if (DIRECT.indexOf(col) >= 0) return { name: col, note: '' };
    return { name: action, note: '範本無對應欄位' };
  }

  function ymd(d) { return String(d).replace(/-/g, ''); }
  function r6(n) { return Math.round(n * 1e6) / 1e6; }
  function stateText(sds) {
    var s = w.ReportMonthly.stateOf(sds);
    return s === '液體' ? '液態' : s === '固體' ? '固態' : s === '氣體' ? '氣態' : '';
  }
  function safeName(s) { return String(s).replace(/[\\\/:*?"<>|]/g, '_'); }

  function schoolId() {
    var s = Store.session && Store.session.currentSchool ? Store.session.currentSchool() : null;
    return s ? s.id : null;
  }

  function build(startDate, endDate, owner, filler) {
    var RM = w.ReportMonthly;
    var sid = schoolId();
    var chems = Store.get('chemicals').filter(function (c) { return (!sid || c.schoolId === sid) && Store.chemIsTox(c); });
    var daily = Store.get('dailyRecords');
    var docs = Store.get('toxDocuments').filter(function (d) { return !sid || d.schoolId === sid; })
      .sort(function (a, b) { return String(a.id).localeCompare(String(b.id)); });
    var startMonth = String(startDate).slice(0, 7);
    var files = [];

    docs.forEach(function (doc) {
      (doc.substances || []).forEach(function (sub) {
        var key = sub.listedNo + '-' + sub.seriesNo;
        var g = RM.govItem(sub.listedNo, sub.seriesNo);
        var nameZh = g ? g.nameZh : key;
        // 該組涵蓋的化學品：SDS 在文件涵蓋範圍內，且 SDS 命中此列管物質
        var mine = chems.filter(function (c) {
          if (!Store.docsForChemical(c.id).some(function (d) { return d.id === doc.id; })) return false;
          var sds = Store.getById('sdsList', c.sdsId);
          return (sds.toxMatches || []).some(function (m) { return m.listedNo === sub.listedNo && m.seriesNo === sub.seriesNo; });
        });
        // A-18：SDS 同時被多份文件涵蓋時，紀錄與期初只歸入有效期限最晚的文件
        var owned = mine.filter(function (c) { var l = RM.latestDoc(c.sdsId); return l && l.id === doc.id; });
        var recs = [], perChem = [], opening = 0;
        owned.forEach(function (c) {
          var rs = daily.filter(function (r) { return r.chemicalId === c.id && r.changed && r.date >= startDate && r.date <= endDate; });
          rs.forEach(function (r) { recs.push({ chem: c, r: r }); });
          perChem.push({ id: c.id, name: c.nameZh || c.nameEn || '', count: rs.length });
          var op = Store.getOpening(c.id, startMonth);
          if (op) opening += op.qty;
        });
        recs.sort(function (a, b) { return a.r.date === b.r.date ? String(a.r.id).localeCompare(String(b.r.id)) : (a.r.date < b.r.date ? -1 : 1); });

        var first = owned[0] || mine[0] || null;
        var sds0 = first ? Store.getById('sdsList', first.sdsId) : null;
        var unit = first ? (first.unit || '') : (sub.unit || '');
        var noChange = recs.length === 0;

        var form = [FORM_HEADERS.slice(), [
          doc.controlNo || '', doc.controlNo || '', String(sub.listedNo) + String(sub.seriesNo),
          String(sub.concHigh === undefined ? '' : sub.concHigh), stateText(sds0), owner, filler, unit, r6(opening).toFixed(2)
        ]];
        var cert = [DOC_HEADERS.slice(), [doc.docNo || '', '', '', '', String(sub.concLow === undefined ? '' : sub.concLow), String(sub.concHigh === undefined ? '' : sub.concHigh)]];
        var rec = [REC_HEADERS.slice()];
        recs.forEach(function (x) {
          var mp = mapAction(x.r.action);
          var note = [x.chem.id + (x.r.note ? '：' + x.r.note : ''), mp.note].filter(Boolean).join('；');
          rec.push([parseInt(x.r.date.slice(5, 7), 10), parseInt(x.r.date.slice(8, 10), 10), mp.name, r6(Number(x.r.qty) || 0), '', '', '', note, '']);
        });

        var fileName = [safeName(doc.controlNo || ''), sub.listedNo + '-' + sub.seriesNo, safeName(nameZh), sub.concLow + '-' + sub.concHigh, ymd(startDate), ymd(endDate)].join('_') +
          (noChange ? '_' + NO_CHANGE : '') + '.xls';
        files.push({
          fileName: fileName,
          sheets: { '申報表單': form, '證件資料': cert, '運作紀錄': rec, '工作表1': refSheet() },
          meta: { docId: doc.id, docType: doc.docType, docNo: doc.docNo, controlNo: doc.controlNo, listedNo: sub.listedNo, seriesNo: sub.seriesNo,
            nameZh: nameZh, chemicals: mine.map(function (c) { return { id: c.id, name: c.nameZh || c.nameEn || '', count: (perChem.filter(function (p) { return p.id === c.id; })[0] || { count: 0 }).count, owned: owned.indexOf(c) >= 0 }; }),
            recordCount: recs.length, noChange: noChange }
        });
      });
    });
    return files;
  }

  function toXlsBuffer(file) {
    if (!w.XLSX) throw new Error('SheetJS 尚未載入');
    var wb = w.XLSX.utils.book_new();
    SHEET_NAMES.forEach(function (n) {
      var ws = w.XLSX.utils.aoa_to_sheet(file.sheets[n]);
      var wid = n === '申報表單' ? [14, 14, 10, 12, 18, 12, 12, 10, 12] : n === '證件資料' ? [26, 10, 10, 10, 14, 14] : n === '運作紀錄' ? [6, 6, 22, 10, 22, 22, 24, 30, 16] : [10, 4, 18, 4, 8, 8];
      ws['!cols'] = wid.map(function (x) { return { wch: x }; });
      w.XLSX.utils.book_append_sheet(wb, ws, n);
    });
    return w.XLSX.write(wb, { bookType: 'xls', type: 'array' });
  }

  function exportZip(files, zipName) {
    if (!w.JSZip) return Promise.reject(new Error('JSZip 尚未載入'));
    var zip = new w.JSZip();
    files.forEach(function (f) { zip.file(f.fileName, toXlsBuffer(f)); });
    return zip.generateAsync({ type: 'blob', compression: 'DEFLATE' }).then(function (blob) {
      if (w.ExportUtil && w.ExportUtil.downloadBlob) w.ExportUtil.downloadBlob(blob, zipName);
      return blob;
    });
  }

  function zipName(startDate, endDate) { return '教育部毒化物批次申報_' + ymd(startDate) + '_' + ymd(endDate) + '.zip'; }

  w.MoeBatch = { build: build, exportZip: exportZip, toXlsBuffer: toXlsBuffer, zipName: zipName, mapAction: mapAction, SHEET_NAMES: SHEET_NAMES, NO_CHANGE: NO_CHANGE,
    FORM_HEADERS: FORM_HEADERS, DOC_HEADERS: DOC_HEADERS, REC_HEADERS: REC_HEADERS };
})(typeof window !== 'undefined' ? window : globalThis);

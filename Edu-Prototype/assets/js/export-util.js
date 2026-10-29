/* 匯出共用工具（PLAN §2.7 A-15）：Excel 用 SheetJS 實際下載、Word 以 HTML 另存 .doc、PDF 以列印預覽代替 */
(function (w) {
  'use strict';

  function escHtml(t) {
    return String(t === undefined || t === null ? '' : t)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  var ExportUtil = {
    // 觸發瀏覽器下載
    downloadBlob: function (blob, filename) {
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { document.body.removeChild(a); URL.revokeObjectURL(url); }, 1000);
    },

    // rows：二維陣列；headers：欄位標題陣列；以 SheetJS 產生 .xlsx 並下載
    tableToXlsx: function (rows, headers, sheetName, filename) {
      if (!w.XLSX) throw new Error('SheetJS 尚未載入');
      var aoa = [headers].concat(rows);
      var ws = w.XLSX.utils.aoa_to_sheet(aoa);
      ws['!cols'] = headers.map(function (h, i) {
        var max = String(h).length * 2;
        rows.forEach(function (r) { max = Math.max(max, String(r[i] === undefined || r[i] === null ? '' : r[i]).length * 1.6); });
        return { wch: Math.min(Math.max(max, 8), 48) };
      });
      var wb = w.XLSX.utils.book_new();
      w.XLSX.utils.book_append_sheet(wb, ws, String(sheetName || 'Sheet1').slice(0, 31));
      var arr = w.XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      var blob = new Blob([arr], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      ExportUtil.downloadBlob(blob, filename);
      return blob;
    },

    // V2-T01：多工作表輸出（xlsx／ods）並下載；sheets：[{name, aoa, cols}]，cols 為 SheetJS 的 !cols 陣列（可省略）；回傳 blob
    workbookToFile: function (sheets, filename, bookType) {
      if (!w.XLSX) throw new Error('SheetJS 尚未載入');
      var type = bookType === 'ods' ? 'ods' : 'xlsx';
      var wb = w.XLSX.utils.book_new();
      (sheets || []).forEach(function (sh, i) {
        var ws = w.XLSX.utils.aoa_to_sheet(sh.aoa || []);
        if (sh.cols) ws['!cols'] = sh.cols;
        w.XLSX.utils.book_append_sheet(wb, ws, String(sh.name || ('Sheet' + (i + 1))).slice(0, 31));
      });
      var arr = w.XLSX.write(wb, { bookType: type, type: 'array' });
      var mime = type === 'ods' ? 'application/vnd.oasis.opendocument.spreadsheet' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      var blob = new Blob([arr], { type: mime });
      ExportUtil.downloadBlob(blob, filename);
      return blob;
    },

    // 將 HTML 片段包成 Word 可開啟的文件並另存 .doc（POC 模擬，非原生 docx）
    htmlToDoc: function (html, filename) {
      var doc = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">' +
        '<head><meta charset="UTF-8"><title>' + escHtml(filename) + '</title>' +
        '<style>body{font-family:"Microsoft JhengHei",sans-serif;font-size:12pt}table{border-collapse:collapse}th,td{border:1px solid #666;padding:4px 8px}th{background:#e6edf5}</style>' +
        '</head><body>' + html + '</body></html>';
      var blob = new Blob(['﻿', doc], { type: 'application/msword' });
      ExportUtil.downloadBlob(blob, filename);
      return blob;
    },

    // 開新視窗顯示可列印內容並呼叫列印預覽（PDF 以列印另存代替）；被瀏覽器擋下時回傳 false
    printHtml: function (html, title) {
      var win = w.open('', '_blank');
      if (!win) return false;
      win.document.open();
      win.document.write('<!DOCTYPE html><html lang="zh-Hant"><head><meta charset="UTF-8"><title>' + escHtml(title || '列印') + '</title>' +
        '<style>body{font-family:"Microsoft JhengHei",sans-serif;font-size:12px;margin:16px}h1{font-size:18px}' +
        'table{border-collapse:collapse;width:100%}th,td{border:1px solid #666;padding:4px 6px;text-align:left}th{background:#e6edf5}' +
        '@media print{@page{size:A4 landscape;margin:12mm}}</style></head><body>' + html + '</body></html>');
      win.document.close();
      setTimeout(function () { try { win.focus(); win.print(); } catch (e) { /* ignore */ } }, 300);
      return true;
    },

    esc: escHtml
  };

  w.ExportUtil = ExportUtil;
})(window);

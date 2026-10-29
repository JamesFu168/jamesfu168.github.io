/* SDS 查詢（UI-05）。展示假設：A-05 完整度 = 有填寫內容的項數／16（Store.sdsFilledSections 自動判定）；A-06 被化學品引用的 SDS 不可刪除；A-15 匯出方式。 */
$(document).on('app:ready', function () {
  'use strict';

  var schoolId = App.school.id;
  var applied = { keyword: '', pdf: '', status: '', complete: '', from: '', to: '' };
  var sortKey = null, sortDir = 'desc';
  var current = []; // 目前結果（匯出用）

  function sdsAll() { return Store.get('sdsList').filter(function (s) { return s.schoolId === schoolId; }); }
  function s1(s) { return (s.items && s.items.s1) || {}; }
  function doneCount(s) { return Store.sdsFilledSections(s).length; }
  function nameOf(s) { return Store.sdsDisplayName(s); }

  function readForm() {
    return {
      keyword: $.trim($('#q-keyword').val()), pdf: $('#q-pdf').val(), status: $('#q-status').val(),
      complete: $('#q-complete').val(), from: $('#q-from').val(), to: $('#q-to').val()
    };
  }

  function matches(s, q) {
    if (q.keyword) {
      var kw = q.keyword.toLowerCase();
      var info = s1(s);
      var hay = [info.nameZh, info.nameEn, info.synonyms, s.indexCode];
      ((s.items && s.items.s3 && s.items.s3.components) || []).forEach(function (c) { hay.push(c.cas); });
      var hit = hay.some(function (t) { return t && String(t).toLowerCase().indexOf(kw) >= 0; });
      if (!hit) return false;
    }
    if (q.pdf === 'yes' && !Store.sdsPdfInfo(s).hasPdf) return false;
    if (q.pdf === 'no' && Store.sdsPdfInfo(s).hasPdf) return false;
    if (q.status && s.status !== q.status) return false;
    if (q.complete === 'full' && doneCount(s) !== 16) return false;
    if (q.complete === 'part' && doneCount(s) === 16) return false;
    if (q.from && (!s.issueDate || s.issueDate < q.from)) return false;
    if (q.to && (!s.issueDate || s.issueDate > q.to)) return false;
    return true;
  }

  function sortList(list) {
    var arr = list.slice();
    if (!sortKey) {
      arr.sort(function (a, b) { return String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')); });
      return arr;
    }
    var f = {
      name: function (s) { return nameOf(s); },
      indexCode: function (s) { return s.indexCode || ''; },
      issueDate: function (s) { return s.issueDate || ''; }
    }[sortKey];
    arr.sort(function (a, b) {
      var r = String(f(a)).localeCompare(String(f(b)), 'zh-Hant');
      return sortDir === 'asc' ? r : -r;
    });
    return arr;
  }

  // 毒化物標籤 title：列管編號-序號 與名稱
  function toxTitle(s) {
    var gov = (Store.get('govToxList') || {}).items || [];
    var seen = {};
    return (s.toxMatches || []).map(function (m) {
      var key = m.listedNo + '-' + m.seriesNo;
      if (seen[key]) return null;
      seen[key] = 1;
      var it = gov.filter(function (g) { return g.listedNo === m.listedNo && g.seriesNo === m.seriesNo; })[0];
      return key + ' ' + (it ? it.nameZh : '');
    }).filter(Boolean).join('、');
  }

  function render() {
    current = sortList(sdsAll().filter(function (s) { return matches(s, applied); }));
    var $b = $('#sds-body').empty();
    if (!current.length) {
      $b.append('<tr class="empty-row"><td colspan="12">查無符合條件的 SDS</td></tr>');
    }
    current.forEach(function (s) {
      var info = s1(s), n = doneCount(s), pdf = Store.sdsPdfInfo(s);
      var $tr = $('<tr></tr>').attr('data-id', s.id);
      $tr.append($('<td class="col-check write-only"></td>').append($('<input type="checkbox" class="row-check">').val(s.id).attr('aria-label', '選取 ' + s.indexCode)));
      $tr.append($('<td class="col-act1"></td>').append($('<a class="act-icon act-view" title="檢視">🔍</a>').attr('href', App.pageUrl('sds-form', { mode: 'view', id: s.id }))));
      $tr.append($('<td class="col-act1 write-only"></td>').append($('<a class="act-icon act-edit" title="編輯">✏️</a>').attr('href', App.pageUrl('sds-form', { mode: 'edit', id: s.id }))));
      $tr.append($('<td class="c-name"></td>').text(nameOf(s)));
      $tr.append($('<td class="c-idx"></td>').text(s.indexCode));
      $tr.append($('<td class="c-part"></td>').text(info.partNo || '—'));
      $tr.append($('<td class="c-sup"></td>').text(info.supplierName || '—'));
      $tr.append($('<td class="c-date"></td>').text(s.issueDate || '—'));
      $tr.append($('<td class="c-pdf"></td>').html(pdf.hasPdf ? '<span class="pdf-ico" title="' + App.esc('到期通知：' + pdf.notifyName + (pdf.count > 1 ? '\n全部檔案：' + pdf.names.join('、') : '')) + '">📎 ' + pdf.count + ' 個檔</span>' : '<span class="dim">—</span>'));
      var $tox = $('<td class="c-tox"></td>');
      if (s.toxMatches && s.toxMatches.length) $tox.append($('<span class="tag tag-danger"></span>').text('毒化物').attr('title', toxTitle(s)));
      else $tox.append('<span class="dim">—</span>');
      $tr.append($tox);
      $tr.append($('<td class="c-comp"></td>').append($('<span></span>').addClass(n === 16 ? 'comp-full' : 'comp-part').text(n + '/16')));
      $tr.append($('<td class="c-st"></td>').append($('<span class="tag"></span>').addClass(s.status === '有效' ? 'tag-ok' : 'tag-off').text(s.status)));
      $b.append($tr);
    });
    $('#chk-all').prop('checked', false);
    $('#list-total, #list-count').text('共 ' + current.length + ' 筆');
    $('.sds-table th.sortable').each(function () {
      var k = $(this).attr('data-sort');
      $(this).find('.sort-ind').text(sortKey === k ? (sortDir === 'asc' ? '▲' : '▼') : '⇅');
    });
  }

  /* ---------- 查詢 / 清除 / 排序 ---------- */
  $('#btn-search').on('click', function () {
    applied = readForm(); render();
    Audit.record({ action: '查詢', summary: '查詢 SDS：' + Audit.cond([['關鍵字', applied.keyword], ['SDS 檔案', Audit.selText('#q-pdf')], ['SDS 狀態', Audit.selText('#q-status')],
      ['資料完整度', Audit.selText('#q-complete')], ['製表日期', (applied.from || applied.to) ? (applied.from || '') + '～' + (applied.to || '') : '']]) });   // V2-T04
  });
  $('#q-keyword').on('keydown', function (e) { if (e.key === 'Enter') $('#btn-search').trigger('click'); });
  $('#btn-clear').on('click', function () {
    $('#q-keyword, #q-from, #q-to').val('');
    $('#q-pdf, #q-status, #q-complete').val('');
    applied = readForm();
    render();
  });
  $('.sds-table').on('click', 'th.sortable', function () {
    var k = $(this).attr('data-sort');
    if (sortKey === k) sortDir = sortDir === 'asc' ? 'desc' : 'asc';
    else { sortKey = k; sortDir = 'asc'; }
    render();
  });
  $('#chk-all').on('change', function () { $('.row-check').prop('checked', this.checked); });
  $('#sds-body').on('change', '.row-check', function () {
    $('#chk-all').prop('checked', $('.row-check').length > 0 && $('.row-check:not(:checked)').length === 0);
  });

  /* ---------- 新增 ---------- */
  function goNew(parse) {
    if (!App.requireWrite()) return;
    window.location.href = App.pageUrl('sds-form', parse ? { mode: 'new', parse: 1 } : { mode: 'new' });
  }
  $('#btn-add, #btn-add-single').on('click', function () { goNew(false); });
  $('#btn-add-parse').on('click', function () { goNew(true); });

  /* ---------- 刪除 ---------- */
  function notice(title, bodyHtml) {
    App.dialog({ title: title, width: 460, body: bodyHtml, buttons: [{ text: '我知道了', cls: 'btn-primary' }] });
  }
  $('#btn-del').on('click', function () {
    if (!App.requireWrite()) return;
    $('#dd-add').removeClass('open');
    var ids = $('.row-check:checked').map(function () { return $(this).val(); }).get();
    if (!ids.length) { notice('刪除 SDS', '<p class="confirm-msg">請先勾選要刪除的 SDS。</p>'); return; }
    var chems = Store.get('chemicals');
    var blocked = [];
    ids.forEach(function (id) {
      var refs = chems.filter(function (c) { return c.sdsId === id; });
      if (refs.length) blocked.push({ sds: Store.getById('sdsList', id), refs: refs });
    });
    if (blocked.length) {
      var html = '<p class="confirm-msg">下列 SDS 已被化學品引用，不可刪除。請先解除化學品與 SDS 的關聯。</p><ul class="blocked-list">';
      blocked.forEach(function (b) {
        html += '<li>' + App.esc(nameOf(b.sds)) + '（' + App.esc(b.sds.indexCode) + '）被引用：' +
          b.refs.map(function (c) { return App.esc(c.nameZh || c.id); }).join('、') + '</li>';
      });
      html += '</ul>';
      notice('無法刪除', html);
      return;
    }
    var names = ids.map(function (id) { var s = Store.getById('sdsList', id); return '．' + nameOf(s) + '（' + s.indexCode + '）'; });
    App.confirm('確定要刪除下列 ' + ids.length + ' 筆 SDS 嗎？此動作無法復原。\n' + names.join('\n'), { title: '刪除 SDS', okText: '刪除', danger: true, width: 480 }).then(function (ok) {
      if (!ok) return;
      ids.forEach(function (id) { Store.remove('sdsList', id); });
      App.toast('已刪除 ' + ids.length + ' 筆 SDS', 'success');
      render();
    });
  });

  /* ---------- 匯出（展示假設 A-15）：匯出目前查詢結果 ---------- */
  var HEADERS = ['化學品名稱', 'SDS 索引碼', '料號', '製造者／輸入者／供應者', '製表日期', 'SDS 檔案', '毒化物識別', '完整度', '狀態'];
  function exportRows() {
    return current.map(function (s) {
      var info = s1(s);
      return [nameOf(s), s.indexCode, info.partNo || '', info.supplierName || '', s.issueDate || '',
        Store.sdsPdfInfo(s).hasPdf ? Store.sdsPdfInfo(s).names.join('、') : '', (s.toxMatches && s.toxMatches.length) ? '毒化物：' + toxTitle(s) : '', doneCount(s) + '/16', s.status];
    });
  }
  function exportHtml() {
    var h = '<h1>SDS 查詢結果</h1><p>' + App.esc(App.school.name) + '　匯出日期：' + App.today() + '　共 ' + current.length + ' 筆（POC 模擬匯出）</p><table><thead><tr>' +
      HEADERS.map(function (t) { return '<th>' + App.esc(t) + '</th>'; }).join('') + '</tr></thead><tbody>';
    exportRows().forEach(function (r) { h += '<tr>' + r.map(function (c) { return '<td>' + App.esc(c) + '</td>'; }).join('') + '</tr>'; });
    return h + '</tbody></table>';
  }
  $('#dd-export').on('click', '[data-export]', function () {
    $('#dd-export').removeClass('open');
    var type = $(this).attr('data-export');
    if (!current.length) { App.toast('目前查詢結果沒有資料可匯出', 'warning'); return; }
    var stamp = App.today().replace(/-/g, '');
    var expName = { excel: 'SDS查詢結果_' + stamp + '.xlsx', word: 'SDS查詢結果_' + stamp + '.doc', pdf: '列印預覽' }[type] || '列印預覽';   // V2-T04
    var blocked = false;
    try {
      if (type === 'excel') {
        ExportUtil.tableToXlsx(exportRows(), HEADERS, 'SDS查詢結果', 'SDS查詢結果_' + stamp + '.xlsx');
        App.toast('已匯出 Excel（' + current.length + ' 筆）', 'success');
      } else if (type === 'word') {
        ExportUtil.htmlToDoc(exportHtml(), 'SDS查詢結果_' + stamp + '.doc');
        App.toast('已匯出 Word（POC：HTML 另存 .doc）', 'success');
      } else if (!ExportUtil.printHtml(exportHtml(), 'SDS 查詢結果')) {
        App.toast('瀏覽器擋下了列印視窗，請允許彈出視窗後再試', 'warning');
        blocked = true;
      }
      Audit.record({ action: '匯出', summary: '匯出 SDS 清單 ' + current.length + ' 筆（' + expName + '）' + (blocked ? '：瀏覽器擋下列印視窗' : ''), result: blocked ? '失敗' : '成功' });   // V2-T04／V2-T09
    } catch (e) {
      App.toast('匯出失敗：' + e.message, 'error');
    }
  });

  // V2-T02：儀表板帶入 pdf（yes／no）、status（有效／停用）；無效值忽略
  var prePdf = App.qs('pdf'), preStatus = App.qs('status');
  var preUsed = false;
  if (prePdf && $('#q-pdf option[value="' + prePdf + '"]').length) { $('#q-pdf').val(prePdf); preUsed = true; }
  if (preStatus && $('#q-status option[value="' + preStatus + '"]').length) { $('#q-status').val(preStatus); preUsed = true; }
  if (preUsed) applied = readForm();   // V2-T09：僅有深連結參數時才讀表單，預設行為不變
  render();
});

/* 毒化物申報查詢（UI-21）與月報匯出 Dialog（UI-22）。
   資料來源：chemicals 中 Store.chemIsTox 為 true 者；本頁無新增、刪除、修改。展示假設 A-15、A-17、A-18。 */
$(document).on('app:ready', function () {
  'use strict';

  var schoolId = App.school.id;
  var applied = { orgId: '', sub: true, sdsId: '', unbound: false, pdf: '', status: '', from: '', to: '', keyword: '' };
  var sortKey = null, sortDir = 'asc';
  var current = [];

  function toxChems() {
    return Store.get('chemicals').filter(function (c) { return c.schoolId === schoolId && Store.chemIsTox(c); });
  }
  function sdsOf(c) { return c.hasSds && c.sdsId ? Store.getById('sdsList', c.sdsId) : null; }
  function chemName(c) { return c.nameZh && c.nameEn ? c.nameZh + ' (' + c.nameEn + ')' : (c.nameZh || c.nameEn || ''); }
  function hazardText(s) {
    var codes = (s && s.items && s.items.s2 && s.items.s2.pictograms) || [];
    return codes.map(function (c) { return (SdsSchema.GHS_NAME && SdsSchema.GHS_NAME[c]) || c; }).join('、');
  }

  function orgOptions() {
    var all = Store.get('orgs').filter(function (o) { return o.schoolId === schoolId; });
    var html = '<option value="">全部</option>';
    (function walk(pid, depth) {
      all.filter(function (o) { return (o.parentId || null) === pid; })
        .sort(function (a, b) { return (a.sort || 0) - (b.sort || 0); })
        .forEach(function (o) {
          html += '<option value="' + o.id + '">' + new Array(depth + 1).join('　') + App.esc(o.name) + '</option>';
          walk(o.id, depth + 1);
        });
    })(null, 0);
    return html;
  }
  function sdsOptions() {
    var html = '<option value="">全部</option>';
    Store.get('sdsList').filter(function (s) { return s.schoolId === schoolId; })
      .sort(function (a, b) { return String(a.indexCode).localeCompare(String(b.indexCode)); })
      .forEach(function (s) { html += '<option value="' + s.id + '">' + App.esc(Store.sdsDisplayName(s) + ' (' + s.indexCode + ')') + '</option>'; });
    return html;
  }
  $('#q-org').html(orgOptions());
  $('#q-sds').html(sdsOptions());

  function readForm() {
    return {
      orgId: $('#q-org').val(), sub: $('#q-sub').prop('checked'), sdsId: $('#q-sds').val(), unbound: $('#q-unbound').prop('checked'),
      pdf: $('#q-pdf').val(), status: $('#q-status').val(), from: $('#q-from').val(), to: $('#q-to').val(), keyword: $.trim($('#q-keyword').val())
    };
  }

  function matches(c, q, scope) {
    var s = sdsOf(c);
    if (scope && scope.indexOf(c.orgId) < 0) return false;
    if (q.sdsId && c.sdsId !== q.sdsId) return false;
    if (q.unbound && Store.docsForSds(c.sdsId).length) return false;
    if (q.pdf === 'yes' && !(s && Store.sdsPdfInfo(s).hasPdf)) return false;
    if (q.pdf === 'no' && !(s && !Store.sdsPdfInfo(s).hasPdf)) return false;
    if (q.status && !(s && s.status === q.status)) return false;
    var d = String(c.updatedAt || '').slice(0, 10);
    if (q.from && (!d || d < q.from)) return false;
    if (q.to && (!d || d > q.to)) return false;
    if (q.keyword) {
      var kw = q.keyword.toLowerCase();
      var hay = [c.nameZh, c.nameEn, c.partNo, c.supplierName, s ? s.indexCode : ''].join('\n').toLowerCase();
      if (hay.indexOf(kw) < 0) return false;
    }
    return true;
  }

  function sortList(list) {
    var arr = list.slice();
    if (!sortKey) {
      arr.sort(function (a, b) { return String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')); });
      return arr;
    }
    var f = {
      name: function (c) { return chemName(c); },
      org: function (c) { return Store.orgPath(c.orgId); },
      updatedAt: function (c) { return c.updatedAt || ''; }
    }[sortKey];
    arr.sort(function (a, b) {
      var r = String(f(a)).localeCompare(String(f(b)), 'zh-Hant');
      return sortDir === 'asc' ? r : -r;
    });
    return arr;
  }

  function render() {
    var scope = applied.orgId ? (applied.sub ? Store.orgDescendants(applied.orgId) : [applied.orgId]) : null;
    current = sortList(toxChems().filter(function (c) { return matches(c, applied, scope); }));
    var $b = $('#rpt-body').empty();
    if (!current.length) $b.append('<tr class="empty-row"><td colspan="9">查無符合條件的毒化物化學品</td></tr>');
    var canWrite = App.canWrite();
    current.forEach(function (c) {
      var s = sdsOf(c);
      var $tr = $('<tr></tr>').attr('data-id', c.id);
      $tr.append($('<td class="col-check"></td>').append($('<input type="checkbox" class="row-check">').val(c.id).attr('aria-label', '選取 ' + chemName(c))));
      var mode = canWrite ? 'edit' : 'view';
      $tr.append($('<td class="col-act1"></td>').append($('<a class="act-icon act-edit"></a>').text(canWrite ? '✏️' : '🔍')
        .attr('title', canWrite ? '編輯（回化學品管理）' : '檢視（化學品管理）').attr('href', App.pageUrl('chem-form', { mode: mode, id: c.id }))));
      $tr.append($('<td class="c-name"></td>').text(chemName(c)));
      var $sds = $('<td class="c-sds"></td>');
      if (s) {
        $sds.append($('<a class="btn-text-link"></a>').attr('href', App.pageUrl('sds-form', { mode: 'view', id: s.id })).text(s.indexCode));
        $sds.append(' / ').append(Store.sdsPdfInfo(s).hasPdf ? document.createTextNode('有檔案') : $('<span class="dim">無檔案</span>'));
      } else $sds.append('<span class="dim">—</span>');
      $tr.append($sds);
      var docs = Store.docsForSds(c.sdsId);
      var $doc = $('<td class="c-doc"></td>');
      if (!docs.length) $doc.append('<span class="unbound">未綁定</span>');
      else {
        $doc.append(document.createTextNode(docs.length + ' 筆'));
        var $ul = $('<ul class="doc-list"></ul>');
        docs.forEach(function (d) { $ul.append($('<li></li>').text(d.docType + ' ' + d.docNo)); });
        $doc.append($ul);
      }
      $tr.append($doc);
      var hz = hazardText(s);
      $tr.append($('<td class="c-haz"></td>').html(hz ? '' : '<span class="dim">—</span>').append(hz ? document.createTextNode(hz) : ''));
      $tr.append($('<td class="c-org"></td>').text(Store.orgPath(c.orgId)));
      $tr.append($('<td class="c-sup"></td>').text(c.supplierName || '—'));
      $tr.append($('<td class="c-upd"></td>').text((c.updatedAt || '').slice(0, 16) || '—'));
      $b.append($tr);
    });
    $('#chk-all').prop('checked', false);
    $('#list-total, #list-count').text('共 ' + current.length + ' 筆');
    $('.rpt-table th.sortable').each(function () {
      var k = $(this).attr('data-sort');
      $(this).find('.sort-ind').text(sortKey === k ? (sortDir === 'asc' ? '▲' : '▼') : '⇅');
    });
  }

  $('#btn-search').on('click', function () {
    applied = readForm(); render();
    Audit.record({ action: '查詢', summary: '查詢毒化物申報：' + Audit.cond([['關鍵字', applied.keyword], ['組織部門', Audit.selText('#q-org')], ['選取 SDS', Audit.selText('#q-sds')],
      ['未綁定文件', applied.unbound ? '是' : ''], ['SDS 檔案', Audit.selText('#q-pdf')], ['SDS 狀態', Audit.selText('#q-status')],
      ['更新日期', (applied.from || applied.to) ? (applied.from || '') + '～' + (applied.to || '') : '']]) });   // V2-T04
  });
  $('#q-keyword').on('keydown', function (e) { if (e.key === 'Enter') $('#btn-search').trigger('click'); });
  $('#btn-clear').on('click', function () {
    $('#q-keyword, #q-from, #q-to').val('');
    $('#q-org, #q-sds, #q-pdf, #q-status').val('');
    $('#q-sub').prop('checked', true);
    $('#q-unbound').prop('checked', false);
    applied = readForm();
    render();
  });
  $('.rpt-table').on('click', 'th.sortable', function () {
    var k = $(this).attr('data-sort');
    if (sortKey === k) sortDir = sortDir === 'asc' ? 'desc' : 'asc';
    else { sortKey = k; sortDir = 'asc'; }
    render();
  });
  $('#chk-all').on('change', function () { $('.row-check').prop('checked', this.checked); });
  $('#rpt-body').on('change', '.row-check', function () {
    $('#chk-all').prop('checked', $('.row-check').length > 0 && $('.row-check:not(:checked)').length === 0);
  });

  /* ---------- 月報匯出 Dialog（UI-22） ---------- */
  function dialogBody(scopeText) {
    var td = Store.today().split('-'), y = parseInt(td[0], 10), m = parseInt(td[1], 10), i;
    var yOpts = '', mOpts = '';
    for (i = y - 2; i <= y + 2; i++) yOpts += '<option value="' + i + '"' + (i === y ? ' selected' : '') + '>' + i + '</option>';
    for (i = 1; i <= 12; i++) mOpts += '<option value="' + i + '"' + (i === m ? ' selected' : '') + '>' + i + ' 月</option>';
    return '<div class="rpt-dlg">' +
      '<p class="rpt-intro">請先閱讀毒化物申報說明，點選以下是否同意：<a href="javascript:void(0)" class="btn-text-link" id="rpt-detail-toggle">詳細資訊</a></p>' +
      '<div class="rpt-detail" id="rpt-detail" hidden>' +
      '<p>1. 本報表依「毒性化學物質運作紀錄表」格式，彙整本校化學品管理中由 SDS 識別為毒化物者在所選月份的運作紀錄。</p>' +
      '<p>2. 資料來源為化學品、SDS、毒化物文件與每日用量；匯出內容與日常紀錄、結餘一致，不在本頁回溯修改已關帳數量。</p>' +
      '<p>3. 混合物依命中的毒化物成分拆成多筆呈現，濃度取 SDS 成分百分比。</p>' +
      '<p>4. 密度換算屬後續範圍，本 POC 沿用化學品設定單位，不做重量與容積換算。</p>' +
      '<p>（POC 展示說明，非正式申報須知。）</p></div>' +
      '<div class="rpt-agree"><label><input type="radio" name="rpt-agree" value="yes" id="rpt-agree-yes">我已閱讀並同意</label>' +
      '<label><input type="radio" name="rpt-agree" value="no" id="rpt-agree-no">不同意</label></div>' +
      '<p class="rpt-label"><span class="req">*</span>請選擇毒性化學物質運作紀錄表匯出 年／月</p>' +
      '<div class="rpt-period"><select id="rpt-year" aria-label="匯出年（西元）">' + yOpts + '</select><select id="rpt-month" aria-label="匯出月">' + mOpts + '</select></div>' +
      '<p class="rpt-scope" id="rpt-scope">' + App.esc(scopeText) + '</p>' +
      '<p class="rpt-small">※報表可依 SDS 密度換算重量與容積；密度未填時的換算規則待確認（POC 本階段不做換算）。</p>' +
      '<p class="rpt-notsend">匯出僅產生檔案，不代表已向教育部或其他機關報送。<span class="poc-badge">POC 模擬</span></p>' +
      '</div>';
  }

  function openExportDialog() {
    var checked = $('.row-check:checked').map(function () { return $(this).val(); }).get();
    var ids = checked.length ? checked : current.map(function (c) { return c.id; });
    if (!ids.length) { App.toast('目前查詢結果沒有資料可匯出', 'warning'); return; }
    var scopeText = checked.length ? '匯出範圍：已勾選 ' + ids.length + ' 筆' : '匯出範圍：目前查詢結果共 ' + ids.length + ' 筆';
    var dlg = App.dialog({
      title: '匯出報表', width: 560, body: dialogBody(scopeText),
      buttons: [
        { text: '確定匯出', cls: 'btn-primary', onClick: function () {
          if (!dlg.el.find('#rpt-agree-yes').prop('checked')) { App.toast('請先閱讀並同意毒化物申報說明', 'warning'); return false; }
          var y = parseInt(dlg.el.find('#rpt-year').val(), 10), m = parseInt(dlg.el.find('#rpt-month').val(), 10);
          try {
            var res = ReportMonthly.exportXlsx(ids, y, m);
            Audit.record({ action: '匯出', summary: '匯出毒化物月報 ' + y + '-' + (m < 10 ? '0' + m : m) + '（' + res.filename + '，' + ids.length + ' 筆化學品）' });   // V2-T04
            App.toast('已匯出 ' + res.filename + '（僅產生檔案，不代表已報送）', 'success');
          } catch (e) {
            App.toast('匯出失敗：' + e.message, 'error');
            return false;
          }
        } },
        { text: '取消', cls: 'btn-secondary' }
      ]
    });
    var $ok = dlg.el.find('.dialog-foot .btn-primary').prop('disabled', true);
    dlg.el.on('change', 'input[name=rpt-agree]', function () { $ok.prop('disabled', !dlg.el.find('#rpt-agree-yes').prop('checked')); });
    dlg.el.on('click', '#rpt-detail-toggle', function () { dlg.el.find('#rpt-detail').prop('hidden', function (i, v) { return !v; }); });
  }

  $('#btn-export-tox').on('click', function () { $(this).closest('.dropdown').removeClass('open'); openExportDialog(); });

  render();
});

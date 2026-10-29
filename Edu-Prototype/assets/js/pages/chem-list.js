/* 化學品查詢（UI-09）。展示假設 A-06：有每日紀錄的化學品不可刪除；匯出為目前查詢結果。 */
$(document).on('app:ready', function () {
  'use strict';

  var schoolId = App.school.id;
  var applied = { orgId: '', sub: true, sdsId: '', pdf: '', status: '', tox: '', from: '', to: '', keyword: '' };
  var sortKey = null, sortDir = 'asc';
  var current = [];

  function chems() { return Store.get('chemicals').filter(function (c) { return c.schoolId === schoolId; }); }
  function sdsOf(c) { return c.hasSds && c.sdsId ? Store.getById('sdsList', c.sdsId) : null; }
  function posName(id) { var p = id ? Store.getById('positions', id) : null; return p ? p.name : ''; }
  function chemName(c) { return c.nameZh && c.nameEn ? c.nameZh + ' (' + c.nameEn + ')' : (c.nameZh || c.nameEn || ''); }
  function toxState(c) { // tox / nontox / nosds
    if (!c.hasSds || !c.sdsId) return 'nosds';
    return Store.chemIsTox(c) ? 'tox' : 'nontox';
  }

  /* ---------- 下拉選項 ---------- */
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
      orgId: $('#q-org').val(), sub: $('#q-sub').prop('checked'), sdsId: $('#q-sds').val(), pdf: $('#q-pdf').val(),
      status: $('#q-status').val(), tox: $('#q-tox').val(), from: $('#q-from').val(), to: $('#q-to').val(),
      keyword: $.trim($('#q-keyword').val())
    };
  }

  function matches(c, q, scope) {
    var s = sdsOf(c);
    if (scope && scope.indexOf(c.orgId) < 0) return false;
    if (q.sdsId && c.sdsId !== q.sdsId) return false;
    if (q.pdf === 'none' && s) return false;
    if (q.pdf === 'yes' && !(s && Store.sdsPdfInfo(s).hasPdf)) return false;
    if (q.pdf === 'no' && !(s && !Store.sdsPdfInfo(s).hasPdf)) return false;
    if (q.status && !(s && s.status === q.status)) return false;
    if (q.tox && toxState(c) !== q.tox) return false;
    var d = String(c.updatedAt || '').slice(0, 10);
    if (q.from && (!d || d < q.from)) return false;
    if (q.to && (!d || d > q.to)) return false;
    if (q.keyword) {
      var kw = q.keyword.toLowerCase();
      var hay = [c.nameZh, c.nameEn, c.partNo, c.supplierName].join('\n').toLowerCase();
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

  function toxTitle(c) {
    var s = sdsOf(c);
    var gov = (Store.get('govToxList') || {}).items || [];
    var seen = {};
    return ((s && s.toxMatches) || []).map(function (m) {
      var key = m.listedNo + '-' + m.seriesNo;
      if (seen[key]) return null;
      seen[key] = 1;
      var it = gov.filter(function (g) { return g.listedNo === m.listedNo && g.seriesNo === m.seriesNo; })[0];
      return key + ' ' + (it ? it.nameZh : '');
    }).filter(Boolean).join('、');
  }

  function render() {
    var scope = applied.orgId ? (applied.sub ? Store.orgDescendants(applied.orgId) : [applied.orgId]) : null;
    current = sortList(chems().filter(function (c) { return matches(c, applied, scope); }));
    var $b = $('#chem-body').empty();
    if (!current.length) $b.append('<tr class="empty-row"><td colspan="14">查無符合條件的化學品</td></tr>');
    current.forEach(function (c) {
      var s = sdsOf(c);
      var $tr = $('<tr></tr>').attr('data-id', c.id);
      $tr.append($('<td class="col-check write-only"></td>').append($('<input type="checkbox" class="row-check">').val(c.id).attr('aria-label', '選取 ' + chemName(c))));
      $tr.append($('<td class="col-act1"></td>').append($('<a class="act-icon act-view" title="檢視">🔍</a>').attr('href', App.pageUrl('chem-form', { mode: 'view', id: c.id }))));
      $tr.append($('<td class="col-act1 write-only"></td>').append($('<a class="act-icon act-edit" title="編輯">✏️</a>').attr('href', App.pageUrl('chem-form', { mode: 'edit', id: c.id }))));
      $tr.append($('<td class="col-act1"></td>').append($('<a class="act-icon act-daily" title="每日用量">📅</a>').attr('href', App.pageUrl('chem-daily', { id: c.id }))));
      $tr.append($('<td class="c-name"></td>').text(chemName(c)));
      $tr.append($('<td class="c-org"></td>').text(Store.orgPath(c.orgId)));
      var $sds = $('<td class="c-sds"></td>');
      if (s) $sds.append($('<a class="btn-text-link"></a>').attr('href', App.pageUrl('sds-form', { mode: 'view', id: s.id })).text(s.indexCode));
      else $sds.append('<span class="dim">無 SDS（手填）</span>');
      $tr.append($sds);
      $tr.append($('<td class="c-pdf"></td>').html(s && Store.sdsPdfInfo(s).hasPdf ? '<span class="file-ok" title="' + App.esc(Store.sdsPdfInfo(s).names.join('、')) + '">✓</span>' : ''));
      var $tox = $('<td class="c-tox"></td>');
      var st = toxState(c);
      if (st === 'tox') $tox.append($('<span class="tag tag-danger"></span>').text('毒化物').attr('title', toxTitle(c)));
      $tr.append($tox);
      $tr.append($('<td class="c-part"></td>').text(c.partNo || '—'));
      $tr.append($('<td class="c-pos"></td>').text(posName(c.usePositionId) || '—'));
      $tr.append($('<td class="c-pos"></td>').text(posName(c.storePositionId) || '—'));
      $tr.append($('<td class="c-unit"></td>').text(c.unit || '—'));
      $tr.append($('<td class="c-upd"></td>').text((c.updatedAt || '').slice(0, 16) || '—'));
      $b.append($tr);
    });
    $('#chk-all').prop('checked', false);
    $('#list-total, #list-count').text('共 ' + current.length + ' 筆');
    $('.chem-table th.sortable').each(function () {
      var k = $(this).attr('data-sort');
      $(this).find('.sort-ind').text(sortKey === k ? (sortDir === 'asc' ? '▲' : '▼') : '⇅');
    });
  }

  /* ---------- 查詢 / 清除 / 排序 ---------- */
  $('#btn-search').on('click', function () {
    applied = readForm(); render();
    Audit.record({ action: '查詢', summary: '查詢化學品：' + Audit.cond([['關鍵字', applied.keyword], ['組織部門', Audit.selText('#q-org')], ['選取 SDS', Audit.selText('#q-sds')],
      ['SDS 檔案', Audit.selText('#q-pdf')], ['SDS 狀態', Audit.selText('#q-status')], ['列管分類', Audit.selText('#q-tox')],
      ['更新日期', (applied.from || applied.to) ? (applied.from || '') + '～' + (applied.to || '') : '']]) });   // V2-T04
  });
  $('#q-keyword').on('keydown', function (e) { if (e.key === 'Enter') $('#btn-search').trigger('click'); });
  $('#btn-clear').on('click', function () {
    $('#q-keyword, #q-from, #q-to').val('');
    $('#q-org, #q-sds, #q-pdf, #q-status, #q-tox').val('');
    $('#q-sub').prop('checked', true);
    applied = readForm();
    render();
  });
  $('.chem-table').on('click', 'th.sortable', function () {
    var k = $(this).attr('data-sort');
    if (sortKey === k) sortDir = sortDir === 'asc' ? 'desc' : 'asc';
    else { sortKey = k; sortDir = 'asc'; }
    render();
  });
  $('#chk-all').on('change', function () { $('.row-check').prop('checked', this.checked); });
  $('#chem-body').on('change', '.row-check', function () {
    $('#chk-all').prop('checked', $('.row-check').length > 0 && $('.row-check:not(:checked)').length === 0);
  });

  /* ---------- 新增 ---------- */
  $('#btn-add').on('click', function () {
    if (!App.requireWrite()) return;
    location.href = App.pageUrl('chem-form', { mode: 'new' });
  });

  /* ---------- 刪除（A-06） ---------- */
  function notice(title, bodyHtml) {
    App.dialog({ title: title, width: 460, body: bodyHtml, buttons: [{ text: '我知道了', cls: 'btn-primary' }] });
  }
  $('#btn-del').on('click', function () {
    if (!App.requireWrite()) return;
    var ids = $('.row-check:checked').map(function () { return $(this).val(); }).get();
    if (!ids.length) { notice('刪除化學品', '<p class="confirm-msg">請先勾選要刪除的化學品。</p>'); return; }
    var daily = Store.get('dailyRecords');
    var blocked = ids.filter(function (id) { return daily.some(function (r) { return r.chemicalId === id; }); });
    if (blocked.length) {
      var html = '<p class="confirm-msg">下列化學品已有每日用量紀錄，不可刪除。</p><ul class="blocked-list">';
      blocked.forEach(function (id) {
        var c = Store.getById('chemicals', id);
        var n = daily.filter(function (r) { return r.chemicalId === id; }).length;
        html += '<li>' + App.esc(chemName(c)) + '（' + App.esc(Store.orgPath(c.orgId)) + '）共 ' + n + ' 筆紀錄</li>';
      });
      notice('無法刪除', html + '</ul>');
      return;
    }
    var names = ids.map(function (id) { var c = Store.getById('chemicals', id); return '．' + chemName(c) + '（' + Store.orgPath(c.orgId) + '）'; });
    App.confirm('確定要刪除下列 ' + ids.length + ' 筆化學品嗎？此動作無法復原。\n' + names.join('\n'), { title: '刪除化學品', okText: '刪除', danger: true, width: 480 }).then(function (ok) {
      if (!ok) return;
      ids.forEach(function (id) { Store.remove('chemicals', id); });
      App.toast('已刪除 ' + ids.length + ' 筆化學品', 'success');
      render();
    });
  });

  /* ---------- 匯出 Excel ---------- */
  var HEADERS = ['化學品名稱', '組織部門', 'SDS 索引碼', 'SDS 檔案', '毒化物', '料號', '使用地點', '儲存地點', '單位', '更新時間'];
  $('#btn-export').on('click', function () {
    if (!current.length) { App.toast('目前查詢結果沒有資料可匯出', 'warning'); return; }
    var rows = current.map(function (c) {
      var s = sdsOf(c), st = toxState(c);
      return [chemName(c), Store.orgPath(c.orgId), s ? s.indexCode : '無 SDS（手填）', !s ? '' : (Store.sdsPdfInfo(s).hasPdf ? '有' : '無'),
        st === 'tox' ? '毒化物：' + toxTitle(c) : '', c.partNo || '',
        posName(c.usePositionId), posName(c.storePositionId), c.unit || '', c.updatedAt || ''];
    });
    try {
      var expFile = '化學品查詢結果_' + App.today().replace(/-/g, '') + '.xlsx';
      ExportUtil.tableToXlsx(rows, HEADERS, '化學品查詢結果', expFile);
      Audit.record({ action: '匯出', summary: '匯出化學品清單 ' + current.length + ' 筆（' + expFile + '）' });   // V2-T04
      App.toast('已匯出 Excel（' + current.length + ' 筆）', 'success');
    } catch (e) {
      App.toast('匯出失敗：' + e.message, 'error');
    }
  });

  // T14c：從列管查詢帶入 sdsId 時，預設「選取 SDS」並立即查詢
  var preSds = App.qs('sdsId');
  if (preSds && $('#q-sds option[value="' + preSds + '"]').length) {
    $('#q-sds').val(preSds);
    applied = readForm();
  }
  // V2-T02：儀表板帶入 orgId（同校組織）與 sub（0 取消含下層；1 或缺省維持勾選）
  var preOrg = App.qs('orgId');
  if (preOrg && $('#q-org option[value="' + preOrg + '"]').length) {
    $('#q-org').val(preOrg);
    $('#q-sub').prop('checked', App.qs('sub') !== '0');
    applied = readForm();
  }
  render();
});

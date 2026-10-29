/* 毒化物文件查詢（UI-14）。展示假設 A-15：匯出為目前查詢結果；刪除文件不連帶刪除業務資料。 */
$(document).on('app:ready', function () {
  'use strict';

  var schoolId = App.school.id;
  var applied = { keyword: '', orgId: '', sub: true, type: '', valid: 'valid' };
  var current = [];
  var expanded = {};

  function docs() { return Store.get('toxDocuments').filter(function (d) { return d.schoolId === schoolId; }); }
  function govItem(s) {
    var items = (Store.get('govToxList') || {}).items || [];
    return items.filter(function (g) { return g.listedNo === s.listedNo && g.seriesNo === s.seriesNo; })[0] || null;
  }
  function subText(s) {
    var g = govItem(s);
    return s.listedNo + '-' + s.seriesNo + ' ' + (g ? g.nameZh : '') + '　' + s.concLow + '～' + s.concHigh + ' % ' + (s.unit || '');
  }
  function subNames(d) {
    return (d.substances || []).map(function (s) { var g = govItem(s); return g ? g.nameZh + ' ' + g.nameEn : ''; }).join(' ');
  }
  function isExpired(d) { return !!d.validUntil && d.validUntil < App.today(); }
  function sdsLabel(id) {
    var s = Store.getById('sdsList', id);
    return s ? Store.sdsDisplayName(s) + ' (' + s.indexCode + ')' : id;
  }

  $('#q-org').html((function () {
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
  })());

  function readForm() {
    return { keyword: $.trim($('#q-keyword').val()), orgId: $('#q-org').val(), sub: $('#q-sub').prop('checked'), type: $('#q-type').val(), valid: $('#q-valid').val() };
  }

  function matches(d, q, scope) {
    if (scope && scope.indexOf(d.orgId) < 0) return false;
    if (q.type && d.docType !== q.type) return false;
    if (q.valid === 'expired' && !isExpired(d)) return false;
    if (q.valid === 'valid' && isExpired(d)) return false;
    if (q.keyword) {
      var kw = q.keyword.toLowerCase();
      var hay = [d.docNo, d.controlNo, d.operatorName, subNames(d)].join('\n').toLowerCase();
      if (hay.indexOf(kw) < 0) return false;
    }
    return true;
  }

  function render() {
    var scope = applied.orgId ? (applied.sub ? Store.orgDescendants(applied.orgId) : [applied.orgId]) : null;
    current = docs().filter(function (d) { return matches(d, applied, scope); })
      .sort(function (a, b) { return String(a.id).localeCompare(String(b.id)); });
    var $b = $('#doc-body').empty();
    if (!current.length) $b.append('<tr class="empty-row"><td colspan="11">查無符合條件的毒化物文件</td></tr>');
    current.forEach(function (d) {
      var $tr = $('<tr></tr>').attr('data-id', d.id);
      $tr.append($('<td class="col-check write-only"></td>').append($('<input type="checkbox" class="row-check">').val(d.id).attr('aria-label', '選取 ' + d.docNo)));
      $tr.append($('<td class="col-act1"></td>').append($('<a class="act-icon act-view" title="檢視">🔍</a>').attr('href', App.pageUrl('tox-doc-form', { mode: 'view', id: d.id }))));
      $tr.append($('<td class="col-act1 write-only"></td>').append($('<a class="act-icon act-edit" title="編輯">✏️</a>').attr('href', App.pageUrl('tox-doc-form', { mode: 'edit', id: d.id }))));
      var n = (d.substances || []).length;
      var $sub = $('<td class="c-subs"></td>');
      if (n) $sub.append($('<button type="button" class="subs-toggle" title="展開物質名稱與濃度"></button>').toggleClass('open', !!expanded[d.id]).attr('data-id', d.id)
        .append('<span class="caret">▶</span>').append(document.createTextNode(n + ' 項')));
      else $sub.append('<span class="dim">0 項</span>');
      $tr.append($sub);
      $tr.append($('<td class="c-type"></td>').text(d.docType));
      $tr.append($('<td class="c-no"></td>').text(d.docNo));
      $tr.append($('<td class="c-att"></td>').html(d.attachmentName ? '<span class="att-ico">📎</span>' : '').attr('title', d.attachmentName || ''));
      $tr.append($('<td class="c-ctrl"></td>').text(d.controlNo || '—'));
      var $u = $('<td class="c-until"></td>').text(d.validUntil || '—');
      if (isExpired(d)) $u.append(' ').append('<span class="tag tag-danger">已逾期</span>');
      $tr.append($u);
      $tr.append($('<td class="c-org"></td>').text(Store.orgPath(d.orgId)));
      $tr.append($('<td class="c-upd"></td>').text((d.updatedAt || '').slice(0, 10) || '—'));
      $b.append($tr);
      if (expanded[d.id] && n) $b.append(subsRow(d));
    });
    $('#chk-all').prop('checked', false);
    $('#list-total, #list-count').text('共 ' + current.length + ' 筆');
  }

  function subsRow(d) {
    var $ul = $('<ul></ul>');
    d.substances.forEach(function (s) { $ul.append($('<li></li>').text(subText(s))); });
    return $('<tr class="subs-row"></tr>').attr('data-for', d.id).append($('<td colspan="11"></td>').append($ul));
  }

  $('#doc-body').on('click', '.subs-toggle', function () {
    var id = $(this).attr('data-id');
    expanded[id] = !expanded[id];
    var $tr = $(this).closest('tr');
    $(this).toggleClass('open', !!expanded[id]);
    if (expanded[id]) $tr.after(subsRow(Store.getById('toxDocuments', id)));
    else $('tr.subs-row[data-for=' + id + ']').remove();
  });

  $('#btn-search').on('click', function () {
    applied = readForm(); render();
    Audit.record({ action: '查詢', summary: '查詢毒化物文件：' + Audit.cond([['關鍵字', applied.keyword], ['組織部門', Audit.selText('#q-org')],
      ['文件類型', Audit.selText('#q-type')], ['有效期限狀態', Audit.selText('#q-valid')]]) });   // V2-T04
  });
  $('#q-keyword').on('keydown', function (e) { if (e.key === 'Enter') $('#btn-search').trigger('click'); });
  $('#btn-clear').on('click', function () {
    $('#q-keyword').val('');
    $('#q-org, #q-type').val('');
    $('#q-valid').val('valid');
    $('#q-sub').prop('checked', true);
    applied = readForm();
    render();
  });
  $('#chk-all').on('change', function () { $('.row-check').prop('checked', this.checked); });
  $('#doc-body').on('change', '.row-check', function () {
    $('#chk-all').prop('checked', $('.row-check').length > 0 && $('.row-check:not(:checked)').length === 0);
  });

  $('#btn-add').on('click', function () {
    if (!App.requireWrite()) return;
    location.href = App.pageUrl('tox-doc-form', { mode: 'new' });
  });

  $('#btn-del').on('click', function () {
    if (!App.requireWrite()) return;
    var ids = $('.row-check:checked').map(function () { return $(this).val(); }).get();
    if (!ids.length) {
      App.dialog({ title: '刪除毒化物文件', width: 440, body: '<p class="confirm-msg">請先勾選要刪除的文件。</p>', buttons: [{ text: '我知道了', cls: 'btn-primary' }] });
      return;
    }
    var names = ids.map(function (id) { var d = Store.getById('toxDocuments', id); return '．' + d.docNo + '（' + d.docType + '）'; });
    App.confirm('確定要刪除下列 ' + ids.length + ' 份文件嗎？此動作無法復原，不影響 SDS 與化學品資料。\n' + names.join('\n'), { title: '刪除毒化物文件', okText: '刪除', danger: true, width: 480 }).then(function (ok) {
      if (!ok) return;
      ids.forEach(function (id) { Store.remove('toxDocuments', id); });
      App.toast('已刪除 ' + ids.length + ' 份文件', 'success');
      render();
    });
  });

  var HEADERS = ['文件類型', '文件編號', '附件', '管制編號', '有效期限', '有效狀態', '內含毒化物', '組織部門', '更新日期'];
  $('#btn-export').on('click', function () {
    if (!current.length) { App.toast('目前查詢結果沒有資料可匯出', 'warning'); return; }
    var rows = current.map(function (d) {
      return [d.docType, d.docNo, d.attachmentName || '', d.controlNo || '', d.validUntil || '', isExpired(d) ? '已逾期' : '有效',
        (d.substances || []).map(subText).join('；'), Store.orgPath(d.orgId), (d.updatedAt || '').slice(0, 10)];
    });
    try {
      var expFile = '毒化物文件查詢結果_' + App.today().replace(/-/g, '') + '.xlsx';
      ExportUtil.tableToXlsx(rows, HEADERS, '毒化物文件查詢結果', expFile);
      Audit.record({ action: '匯出', summary: '匯出毒化物文件 ' + current.length + ' 筆（' + expFile + '）' });   // V2-T04
      App.toast('已匯出 Excel（' + current.length + ' 筆）', 'success');
    } catch (e) {
      App.toast('匯出失敗：' + e.message, 'error');
    }
  });

  render();
});

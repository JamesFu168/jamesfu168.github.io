/* 系統日誌（V2-T04，V2-F03）：限系統管理者；查詢、分頁（每頁 50 筆）、匯出目前查詢結果 */
$(document).on('app:ready', function () {
  'use strict';
  var PAGE_SIZE = 50;
  var ACTIONS = ['查閱', '查詢', '新增', '修改', '刪除', '登入', '登出', '登入失敗', '匯出', '下載', '重置', '系統作業'];
  // 可連結到檢視頁的目標類型
  var LINKS = {
    sdsList: 'sds-form', chemicals: 'chem-form', toxDocuments: 'tox-doc-form', floorplans: 'map-info'
  };

  // 權限不足：data-no-view-log 已略過自動查閱，改由本頁記失敗紀錄
  if (!App.requireRole(['系統管理者'])) {
    Audit.record({ module: '基本資料設定', action: '查閱', result: '失敗', summary: '嘗試開啟系統日誌（權限不足）' });
    return;
  }
  // 每次頁面載入一筆（查詢按鈕另記）
  Audit.record({ module: '基本資料設定', action: '查閱', summary: '查閱系統日誌' });

  var current = [], page = 1;

  function shiftDays(n) {
    var d = new Date(); d.setDate(d.getDate() - n);
    return App.fmtDate(d);
  }
  function defaults() { return { keyword: '', action: '', from: shiftDays(30), to: App.today() }; }
  function readForm() {
    return { keyword: $.trim($('#q-keyword').val()), action: $('#q-action').val(), from: $('#q-from').val(), to: $('#q-to').val() };
  }
  function fillForm(q) {
    $('#q-keyword').val(q.keyword); $('#q-action').val(q.action); $('#q-from').val(q.from); $('#q-to').val(q.to);
  }

  function schoolAll() {
    var s = Store.session.currentSchool(), sid = s ? s.id : '';
    return Store.get('auditLogs').filter(function (r) { return !sid || r.schoolId === sid; });
  }
  function renderNote() {
    var all = schoolAll(), min = '';
    all.forEach(function (r) { var d = String(r.at).slice(0, 10); if (!min || d < min) min = d; });
    $('#sl-note-text').text('位址為「' + Audit.ADDRESS + '」，時間為瀏覽器本機時間；保留三年，POC 另設 ' + Audit.MAX_ROWS +
      ' 筆上限（展示假設 A-30）。目前 ' + all.length + ' 筆' + (min ? '，最早 ' + min : '') + '。');
  }

  function summaryCell(r) {
    var $td = $('<td class="sl-sum"></td>');
    var text = r.summary || '', link = LINKS[r.targetType];
    if (!link || !r.targetId) return $td.text(text);
    var item = Store.getById(r.targetType, r.targetId);
    var idx = text.indexOf(r.targetId);
    var before = idx >= 0 ? text.slice(0, idx) : text + ' ';
    var after = idx >= 0 ? text.slice(idx + r.targetId.length) : '';
    var $mid = item
      ? $('<a class="btn-text-link"></a>').attr('href', App.pageUrl(link, { mode: 'view', id: r.targetId })).text(r.targetId)
      : $('<span class="sl-gone"></span>').text(r.targetId + '（已刪除）');
    $td.append(document.createTextNode(before), $mid, document.createTextNode(after));
    return $td;
  }

  function render() {
    var total = current.length, pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    if (page > pages) page = pages;
    if (page < 1) page = 1;
    var $b = $('#log-body').empty();
    if (!total) $b.append('<tr class="empty-row"><td colspan="8">查無符合紀錄</td></tr>');
    current.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).forEach(function (r) {
      var sys = r.userName === '系統' && r.action === '系統作業';
      var $tr = $('<tr></tr>').attr('data-id', r.id);
      $tr.append($('<td class="sl-at"></td>').text(r.at));
      $tr.append($('<td class="sl-user"></td>').text(Audit.displayUser(r)));
      $tr.append($('<td class="sl-role"></td>').text(sys ? '系統' : (r.role || '—')));
      $tr.append($('<td class="sl-addr"></td>').text(r.address || Audit.ADDRESS));
      $tr.append($('<td class="sl-mod"></td>').text(r.module));
      $tr.append($('<td class="sl-act"></td>').text(r.action));
      $tr.append(summaryCell(r));
      var cls = r.result === '失敗' ? 'tag-danger' : (r.result === '成功' ? 'tag-ok' : 'tag-off');
      $tr.append($('<td class="sl-res"></td>').append($('<span class="tag"></span>').addClass(cls).text(r.result)));
      $b.append($tr);
    });
    $('#list-total').text('共 ' + total + ' 筆');
    var $p = $('#sl-pager').empty();
    if (total > PAGE_SIZE) {
      $p.append($('<button type="button" class="btn btn-secondary btn-sm" id="pg-prev">上一頁</button>').prop('disabled', page <= 1));
      $p.append($('<span class="sl-pg-info"></span>').text('第 ' + page + ' / ' + pages + ' 頁'));
      $p.append($('<button type="button" class="btn btn-secondary btn-sm" id="pg-next">下一頁</button>').prop('disabled', page >= pages));
    }
  }

  function run(q) {
    page = 1;
    current = Audit.list(q);
    render();
  }

  function queryText(q) {
    var parts = [];
    if (q.keyword) parts.push('關鍵字「' + q.keyword + '」');
    if (q.action) parts.push('操作動作「' + q.action + '」');
    if (q.from || q.to) parts.push((q.from || '') + '～' + (q.to || ''));
    return parts.length ? parts.join('、') : '未設條件';
  }

  $('#q-action').html('<option value="">全部</option>' + ACTIONS.map(function (a) { return '<option>' + a + '</option>'; }).join(''));
  fillForm(defaults());

  $('#btn-search').on('click', function () {
    var q = readForm();
    if (q.from && q.to && q.from > q.to) { App.toast('日期起不可大於日期迄', 'warning'); return; }
    run(q);                  // 先查詢，再記事件（本次事件不會混入本次結果）
    Audit.record({ module: '基本資料設定', action: '查詢', summary: '查詢系統日誌：' + queryText(q) });
    renderNote();
  });
  $('#q-keyword').on('keydown', function (e) { if (e.key === 'Enter') $('#btn-search').trigger('click'); });
  $('#btn-clear').on('click', function () {
    var d = defaults();
    fillForm(d);
    run(d);                  // 清除：恢復預設並重查（不另記事件）
  });
  $('#sl-pager').on('click', '#pg-prev', function () { page--; render(); });
  $('#sl-pager').on('click', '#pg-next', function () { page++; render(); });

  $('#btn-export').on('click', function () {
    if (!App.isAdmin()) return;
    if (!current.length) { App.toast('目前查詢結果沒有資料可匯出', 'warning'); return; }
    var file = '系統日誌_' + App.today().replace(/-/g, '') + '.xlsx';
    try {
      ExportUtil.tableToXlsx(Audit.exportRows(current), Audit.EXPORT_HEADERS, '系統日誌', file);
      Audit.record({ module: '基本資料設定', action: '匯出', summary: '匯出系統日誌 ' + current.length + ' 筆（' + file + '）' });
      renderNote();
      App.toast('已匯出 Excel（' + current.length + ' 筆）', 'success');
    } catch (e) {
      App.toast('匯出失敗：' + e.message, 'error');
    }
  });

  renderNote();
  run(defaults());
});

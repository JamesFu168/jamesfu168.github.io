/* 化學品平面圖查詢（UI-17）。組織條件含下層組織；刪除前確認並列出圖名；唯讀使用者僅能檢視。 */
$(document).on('app:ready', function () {
  'use strict';

  var schoolId = App.school.id;
  var applied = { orgId: '', keyword: '' };

  function orgs() { return Store.get('orgs').filter(function (o) { return o.schoolId === schoolId; }); }
  function children(pid) {
    return orgs().filter(function (o) { return (o.parentId || null) === (pid || null); })
      .sort(function (a, b) { return (a.sort || 0) - (b.sort || 0); });
  }
  function orgName(id) { var o = Store.getById('orgs', id); return o ? o.name : ''; }
  function orgOptions() {
    var html = '<option value="">全部</option>';
    (function walk(pid, depth) {
      children(pid).forEach(function (o) {
        html += '<option value="' + o.id + '">' + new Array(depth + 1).join('　') + App.esc(o.name) + '</option>';
        walk(o.id, depth + 1);
      });
    })(null, 0);
    return html;
  }
  function orgScope(id) {
    var ids = [id];
    (function walk(pid) { children(pid).forEach(function (c) { ids.push(c.id); walk(c.id); }); })(id);
    return ids;
  }

  function filtered() {
    var scope = applied.orgId ? orgScope(applied.orgId) : null;
    var kw = applied.keyword.toLowerCase();
    return Store.get('floorplans').filter(function (f) {
      if (f.schoolId !== schoolId) return false;
      if (scope && scope.indexOf(f.orgId) < 0) return false;
      if (kw) {
        var hay = [f.name, f.building, f.rescuerName].join('\n').toLowerCase();
        if (hay.indexOf(kw) < 0) return false;
      }
      return true;
    }).sort(function (a, b) { return String(a.id).localeCompare(String(b.id)); });
  }

  function iconLink(icon, label, page, params, cls) {
    return $('<a class="act-icon"></a>').addClass(cls).attr({ href: App.pageUrl(page, params), title: label, 'aria-label': label }).text(icon);
  }

  function render() {
    var list = filtered();
    var $b = $('#map-body').empty();
    if (!list.length) $b.append('<tr class="empty-row"><td colspan="10">查無符合條件的平面圖</td></tr>');
    list.forEach(function (f) {
      var $tr = $('<tr></tr>').attr('data-id', f.id);
      $tr.append($('<td class="col-check write-only"></td>').append($('<input type="checkbox" class="row-chk">').attr('aria-label', '選取 ' + f.name)));
      $tr.append($('<td class="c-act"></td>').append(iconLink('🔍', '檢視', 'map-info', { mode: 'view', id: f.id }, 'act-view')));
      $tr.append($('<td class="c-act write-only"></td>').append(iconLink('🗺️', '圖面', 'map-editor', { id: f.id }, 'act-editmap')));
      $tr.append($('<td class="c-act write-only"></td>').append(iconLink('✏️', '編輯', 'map-info', { mode: 'edit', id: f.id }, 'act-editinfo')));
      $tr.append($('<td></td>').text(orgName(f.orgId)));
      $tr.append($('<td></td>').text(f.name));
      $tr.append($('<td></td>').text(f.building || ''));
      $tr.append($('<td></td>').text(f.rescuerName || ''));
      $tr.append($('<td></td>').text(f.rescuerContact || ''));
      $tr.append($('<td></td>').text(f.remark || ''));
      $tr.append($('<td></td>').text(f.updatedAt || ''));
      $b.append($tr);
    });
    $('#chk-all').prop('checked', false);
    $('#map-count').text('共 ' + list.length + ' 筆');
  }

  function search() {
    applied = { orgId: $('#f-org').val(), keyword: $.trim($('#f-keyword').val()) };
    render();
  }
  function searchLogged() {   // V2-T04：只有查詢按鈕／Enter 記事件，清除與初次載入不記
    search();
    Audit.record({ action: '查詢', summary: '查詢平面圖：' + Audit.cond([['組織部門', Audit.selText('#f-org')], ['關鍵字', applied.keyword]]) });
  }

  function notice(title, msg) {
    App.dialog({ title: title, width: 440, body: '<p class="confirm-msg">' + App.esc(msg).replace(/\n/g, '<br>') + '</p>',
      buttons: [{ text: '我知道了', cls: 'btn-primary' }] });
  }

  function del() {
    if (!App.requireWrite()) return;
    var ids = $('#map-body .row-chk:checked').map(function () { return $(this).closest('tr').attr('data-id'); }).get();
    if (!ids.length) { notice('請先選取資料', '請勾選要刪除的平面圖。'); return; }
    var names = ids.map(function (id) { var f = Store.getById('floorplans', id); return '．' + (f ? f.name : id); });
    App.confirm('確定要刪除下列 ' + ids.length + ' 筆平面圖嗎？\n' + names.join('\n'), { okText: '刪除', danger: true }).then(function (ok) {
      if (!ok) return;
      ids.forEach(function (id) { Store.remove('floorplans', id); });
      App.toast('已刪除 ' + ids.length + ' 筆平面圖', 'success');
      render();
    });
  }

  $('#f-org').html(orgOptions());
  $('#btn-search').on('click', searchLogged);
  $('#f-keyword').on('keydown', function (e) { if (e.key === 'Enter') searchLogged(); });
  $('#btn-clear').on('click', function () { $('#f-org').val(''); $('#f-keyword').val(''); search(); });
  $('#btn-add').on('click', function () { if (App.requireWrite()) location.href = App.pageUrl('map-info', { mode: 'new' }); });
  $('#btn-del').on('click', del);
  $('#chk-all').on('change', function () { $('#map-body .row-chk').prop('checked', this.checked); });
  $('#map-body').on('change', '.row-chk', function () {
    var all = $('#map-body .row-chk');
    $('#chk-all').prop('checked', all.length > 0 && all.filter(':checked').length === all.length);
  });

  render();
});

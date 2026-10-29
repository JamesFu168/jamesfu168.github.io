/* 化學品平面圖基本資料（UI-18）：?mode=new|edit|view&id=。檢視模式唯讀並預留 #map-preview（T10 渲染圖面）。 */
$(document).on('app:ready', function () {
  'use strict';

  var schoolId = App.school.id;
  var mode = App.qs('mode') || 'view';
  var id = App.qs('id');
  var TEXT_KEYS = ['name', 'building', 'occupancy', 'usage', 'operatingHours', 'rescuerName', 'rescuerContact', 'flammableNote', 'remark', 'description'];
  var listUrl = App.menuUrl('map');
  var rec = id ? Store.getById('floorplans', id) : null;

  function notice(title, msg, then) {
    App.dialog({ title: title, width: 440, body: '<p class="confirm-msg">' + App.esc(msg).replace(/\n/g, '<br>') + '</p>',
      buttons: [{ text: '我知道了', cls: 'btn-primary', onClick: function () { if (then) then(); } }],
      onClose: then });
  }

  if (['new', 'edit', 'view'].indexOf(mode) < 0) mode = 'view';
  if ((mode === 'new' || mode === 'edit') && !App.canWrite()) {
    $('#info-card, #map-preview').hide();
    notice('不允許的操作', '唯讀使用者僅能檢視平面圖，無法新增或修改。', function () {
      location.href = rec ? App.pageUrl('map-info', { mode: 'view', id: id }) : listUrl;
    });
    return;
  }
  if (mode !== 'new' && !rec) {
    $('#info-card, #map-preview').hide();
    notice('查無資料', '找不到指定的平面圖，將回到清單。', function () { location.href = listUrl; });
    return;
  }

  /* ---------- 組織下拉 ---------- */
  function orgs() { return Store.get('orgs').filter(function (o) { return o.schoolId === schoolId; }); }
  function children(pid) {
    return orgs().filter(function (o) { return (o.parentId || null) === (pid || null); })
      .sort(function (a, b) { return (a.sort || 0) - (b.sort || 0); });
  }
  var html = '<option value="">請選擇組織部門</option>';
  (function walk(pid, depth) {
    children(pid).forEach(function (o) {
      html += '<option value="' + o.id + '">' + new Array(depth + 1).join('　') + App.esc(o.name) + '</option>';
      walk(o.id, depth + 1);
    });
  })(null, 0);
  $('[data-f=orgId] select').html(html);

  function field(k) { return $('[data-f=' + k + ']'); }
  function setErr(k, msg) { field(k).toggleClass('has-error', !!msg).find('.form-error').text(msg || ''); }

  /* ---------- 帶入資料 ---------- */
  if (rec) {
    field('orgId').find('select').val(rec.orgId);
    TEXT_KEYS.forEach(function (k) { field(k).find('input,textarea').val(rec[k] || ''); });
  } else {
    var u = App.user;
    field('orgId').find('select').val(u && Store.getById('orgs', u.orgId) ? u.orgId : '');
  }

  /* ---------- 模式 ---------- */
  if (mode === 'view') {
    $('#info-card .form-field').each(function () {
      var $f = $(this);
      var $in = $f.find('input,textarea,select');
      if (!$in.length) return;
      var v = $in.is('select') ? $in.find('option:selected').text().replace(/^[　\s]+/, '') : $in.val();
      var $val = $('<div class="view-value"></div>');
      $f.closest('.form-row').find('.form-label').removeClass('required');
      if (v) $val.text(v); else $val.html('<span class="muted">—</span>');
      $in.remove();
      $f.find('.form-error').remove();
      $f.prepend($val);
    });
    $('#btn-save').remove();
    $('#btn-cancel').text('返回清單');
    $('#btn-to-edit').prop('hidden', false);
    $('#map-preview').prop('hidden', false);
    renderPreview();
    $('#info-actions').prop('hidden', false);
  }
  var pageTitle = mode === 'view' ? '檢視平面圖' : mode === 'new' ? '新增平面圖' : '編輯平面圖資訊';
  $('body').attr('data-title', pageTitle);
  $('.page-title').text(pageTitle);
  $('.breadcrumb .current').text(pageTitle);
  document.title = pageTitle + ' - 教育部化學雲';


  /* ---------- 檢視模式：唯讀圖面與「區塊 → 位置 → 化學品」表格（T10） ---------- */
  function renderPreview() {
    MapRender.render($('#map-canvas'), rec, { readonly: true, emptyHint: '此平面圖尚未上傳底圖' });
    var $ab = $('<a class="btn btn-secondary write-only" id="btn-edit-map">編輯圖面</a>').attr('href', App.pageUrl('map-editor', { id: id }));
    $('#info-actions').append($ab);
    var $tb = $('#map-block-body').empty();
    var blocks = rec.blocks || [];
    if (!blocks.length) { $tb.append('<tr class="empty-row"><td colspan="3">尚未在圖面上設定區塊</td></tr>'); return; }
    blocks.forEach(function (b) {
      var $tr = $('<tr></tr>').attr('data-block', b.id);
      $tr.append($('<td></td>').text(b.label || '（未命名區塊）'));
      var pos = b.positionId ? Store.getById('positions', b.positionId) : null;
      var $pos = $('<td></td>');
      var $chem = $('<td></td>');
      if (!pos) {
        $pos.append('<span class="tag tag-off">尚未關聯位置</span>');
        $chem.append('<span class="muted">—</span>');
      } else {
        $pos.text(pos.name);
        var list = MapRender.chemicalsAt(pos.id);
        if (!list.length) $chem.append('<span class="muted">此位置目前沒有化學品</span>');
        else {
          var $t = $('<table class="map-chem-table"><thead><tr><th>名稱</th><th>組織</th><th>單位</th><th>最大儲存量</th><th>最大使用量</th></tr></thead><tbody></tbody></table>');
          list.forEach(function (c) {
            var o = Store.getById('orgs', c.orgId);
            $t.find('tbody').append($('<tr></tr>').append($('<td></td>').text(c.nameZh), $('<td></td>').text(o ? o.name : ''), $('<td></td>').text(c.unit || ''), $('<td></td>').text(c.maxStore == null ? '' : c.maxStore + ' ' + (c.unit || '')), $('<td></td>').text(c.maxUse == null ? '' : c.maxUse + ' ' + (c.unit || ''))));
          });
          $chem.append($t);
        }
      }
      $tr.append($pos, $chem);
      $tb.append($tr);
    });
  }

  /* ---------- 匯出 H-Card（僅檢視模式、管理者以上） ---------- */
  function exportHcard() {
    if (!App.isManager()) {
      notice('不允許的操作', '僅管理者或系統管理者可匯出 H-Card。');
      return;
    }
    var body = '<div class="hcard-format">' +
      '<label class="hcard-opt"><input type="radio" name="hcard-format" value="A" checked> 格式 A（7 類危害特性：毒性、禁水性、爆炸性、可燃性、高壓氣體、放射性、其他）</label>' +
      '<label class="hcard-opt"><input type="radio" name="hcard-format" value="B"> 格式 B（10 類：可燃性、氧化性、爆炸性、加壓氣體、腐蝕性、急毒性、健康危害、禁水性、放射性、其他）</label></div>';
    App.dialog({ title: '選擇 H-Card 格式', width: 480, body: body,
      buttons: [
        { text: '匯出', cls: 'btn-primary', onClick: function (api) {
          if (!App.isManager()) { App.toast('僅管理者或系統管理者可匯出 H-Card', 'warning'); return; }
          var fmt = api.body.find('input[name=hcard-format]:checked').val() || 'A';
          location.href = App.pageUrl('hcard', { id: id, format: fmt });
        } },
        { text: '取消', cls: 'btn-secondary' }
      ] });
  }
  window.exportHcard = exportHcard;
  $('#btn-hcard').on('click', exportHcard);

  /* ---------- 儲存 ---------- */
  function save() {
    if (!App.requireWrite()) return;
    var v = { orgId: field('orgId').find('select').val() };
    TEXT_KEYS.forEach(function (k) { v[k] = $.trim(field(k).find('input,textarea').val()); });
    var err = {};
    if (!v.orgId || !Store.getById('orgs', v.orgId)) err.orgId = '請選擇組織部門';
    if (!v.name) err.name = '請輸入化學品平面圖名稱';
    ['orgId', 'name'].forEach(function (k) { setErr(k, err[k]); });
    var first = Object.keys(err)[0];
    if (first) { field(first).find('input,select').first().trigger('focus'); return; }
    if (mode === 'new') {
      v.schoolId = schoolId;
      v.baseImage = null; v.blocks = []; v.icons = [];
      Store.add('floorplans', v);
      App.toast('已新增平面圖「' + v.name + '」', 'success');
    } else {
      Store.update('floorplans', rec.id, v);
      App.toast('已儲存平面圖資訊', 'success');
    }
    location.href = listUrl;
  }

  $('#btn-save').on('click', save);
  $('#btn-cancel').on('click', function () { location.href = listUrl; });
  $('#btn-to-edit').on('click', function () { if (App.requireWrite()) location.href = App.pageUrl('map-info', { mode: 'edit', id: id }); });
  $('#info-card').on('input change', 'input,select,textarea', function () {
    var k = $(this).closest('[data-f]').attr('data-f');
    if (k === 'orgId' || k === 'name') setErr(k, '');
  });
});

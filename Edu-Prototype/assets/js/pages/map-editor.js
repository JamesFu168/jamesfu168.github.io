/* 平面圖圖面管理（UI-19）：?id=FP-xxx。img 底圖 + SVG 疊加區塊與 ICON；座標以底圖原始像素存入 floorplans。
   記憶體草稿 + 復原／重做；按「儲存」才寫入 Store；唯讀使用者導向檢視模式。 */
$(document).on('app:ready', function () {
  'use strict';

  var schoolId = App.school.id;
  var id = App.qs('id');
  var fp = id ? Store.getById('floorplans', id) : null;
  var listUrl = App.menuUrl('map');
  var viewUrl = id ? App.pageUrl('map-info', { mode: 'view', id: id }) : listUrl;
  var DEMO_BASE = 'assets/img/demo-floorplan-chem2f.svg';
  var MAX_BASE_BYTES = 2 * 1024 * 1024;
  var DEFAULT_LABEL = '新區塊';

  function notice(title, msg, then) {
    App.dialog({ title: title, width: 440, body: '<p class="confirm-msg">' + App.esc(msg).replace(/\n/g, '<br>') + '</p>',
      buttons: [{ text: '我知道了', cls: 'btn-primary', onClick: function () { if (then) then(); } }],
      onClose: then });
  }

  if (!App.canWrite()) {
    notice('不允許的操作', '唯讀使用者僅能檢視平面圖，無法編輯圖面。\n將為您轉到檢視模式。', function () { location.href = viewUrl; });
    return;
  }
  if (!fp || fp.schoolId !== schoolId) {
    notice('查無資料', '找不到指定的平面圖，將回到清單。', function () { location.href = listUrl; });
    return;
  }

  /* ---------- 版面 ---------- */
  App.setSidebarCollapsed(true, true);   // 編輯時暫時收合 Sidebar（不寫入偏好），讓畫布有足夠寬度
  $('#me-head, #me-body').prop('hidden', false);
  $('#me-name').text(fp.name);
  var org = Store.getById('orgs', fp.orgId);
  $('#me-org').text('組織：' + (org ? (Store.orgPath ? Store.orgPath(org.id) : org.name) : '—'));

  /* ---------- 草稿與歷史 ---------- */
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  var state = { baseImage: fp.baseImage || null, blocks: clone(fp.blocks || []), icons: clone(fp.icons || []) };
  function snap() { return { baseImage: state.baseImage, blocks: state.blocks, icons: state.icons }; }
  var savedStr = JSON.stringify(snap());
  var hist = [savedStr], hidx = 0;
  var sel = null;          // {kind, id}
  var mode = 'select';
  var iconType = null;
  var drag = null;

  var api = MapRender.render($('#me-canvas'), state, { emptyHint: '請先上傳底圖或載入示範底圖' });

  function dirty() { return JSON.stringify(snap()) !== savedStr; }
  function updateUi() {
    $('#me-dirty').prop('hidden', !dirty());
    $('#btn-undo').prop('disabled', hidx <= 0);
    $('#btn-redo').prop('disabled', hidx >= hist.length - 1);
    $('#btn-delete').prop('disabled', !sel);
  }
  function draw() { api.redraw(state, sel); }
  function commit() {
    var s = JSON.stringify(snap());
    if (s === hist[hidx]) { updateUi(); return; }
    hist.length = hidx + 1;
    hist.push(s); hidx++;
    if (hist.length > 100) { hist.shift(); hidx--; }
    updateUi();
  }
  function restore(str) {
    var o = JSON.parse(str);
    var baseChanged = o.baseImage !== state.baseImage;
    state.baseImage = o.baseImage; state.blocks = o.blocks; state.icons = o.icons;
    if (baseChanged) api.setBase(state.baseImage);
    if (sel && !findSel()) sel = null;
    draw(); renderPanel(); updateUi();
  }
  function undo() { if (hidx > 0) { hidx--; restore(hist[hidx]); } }
  function redo() { if (hidx < hist.length - 1) { hidx++; restore(hist[hidx]); } }

  function findIn(arr, sid) { for (var i = 0; i < arr.length; i++) if (arr[i].id === sid) return arr[i]; return null; }
  function findSel() {
    if (!sel) return null;
    return findIn(sel.kind === 'block' ? state.blocks : state.icons, sel.id);
  }
  function nextId(prefix, arr) {
    var max = 0;
    arr.forEach(function (x) { var m = /(\d+)$/.exec(x.id || ''); if (m) max = Math.max(max, parseInt(m[1], 10)); });
    return prefix + '-' + ('000' + (max + 1)).slice(-3);
  }
  function select(kind, sid) {
    var changed = !(sel && kind && sel.kind === kind && sel.id === sid) && !(!sel && !kind);
    sel = kind ? { kind: kind, id: sid } : null;
    draw(); updateUi();
    if (changed) renderPanel();
  }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  /* ---------- 模式與工具列 ---------- */
  var HINTS = {
    select: '選取模式：點區塊或 ICON 選取，拖曳移動，區塊右下角把手縮放，Delete 鍵刪除。',
    draw: '繪製模式：在畫布上按住滑鼠拖曳出矩形區塊（最小 20×20）。',
    icon: '放置模式：先在畫布下方圖庫選 ICON，再點畫布放置。'
  };
  function setMode(m) {
    mode = m;
    $('.me-mode').each(function () { $(this).toggleClass('active', $(this).attr('data-mode') === m); });
    $('#me-canvas').removeClass('me-mode-select me-mode-draw me-mode-icon').addClass('me-mode-' + m);
    $('#me-mode-hint').text(HINTS[m]);
    $('.me-gal-item').toggleClass('active', m === 'icon' && !!iconType);
    if (m === 'icon') $('.me-gal-item').each(function () { $(this).toggleClass('active', $(this).attr('data-type') === iconType); });
  }
  $('.me-mode').on('click', function () { setMode($(this).attr('data-mode')); });

  // 圖庫
  var $gal = $('#me-gallery');
  MapRender.ICONS.forEach(function (ic) {
    var $b = $('<button type="button" class="me-gal-item"></button>').attr({ 'data-type': ic.type, title: ic.name });
    $b.append($('<img alt="">').attr('src', MapRender.iconSrc(ic.type)), $('<span></span>').text(ic.name));
    $gal.append($b);
  });
  $gal.on('click', '.me-gal-item', function () {
    iconType = $(this).attr('data-type');
    setMode('icon');
  });

  /* ---------- 底圖 ---------- */
  function setBase(src) {
    state.baseImage = src;
    api.setBase(src);
    draw(); renderPanel(); commit();
  }
  $('#btn-upload').on('click', function () { $('#file-base').trigger('click'); });
  $('#file-base').on('change', function () {
    var f = this.files && this.files[0];
    var input = this;
    if (!f) return;
    if (!/^image\//.test(f.type)) { notice('無法使用此檔案', '請選擇圖片檔（PNG、JPG、SVG 等）。'); input.value = ''; return; }
    if (f.size > MAX_BASE_BYTES) { notice('圖片過大', '底圖檔案請小於 2 MB（POC 將底圖存在瀏覽器儲存空間，不上傳伺服器）。'); input.value = ''; return; }
    var rd = new FileReader();
    rd.onload = function () { setBase(String(rd.result)); Audit.record({ action: '修改', targetType: 'floorplans', targetId: fp ? fp.id : '', summary: '更換平面圖底圖「' + f.name + '」（' + (fp ? fp.id : '') + '）' }); App.toast('已套用上傳的底圖「' + f.name + '」（POC 僅存於瀏覽器）', 'success'); input.value = ''; };
    rd.onerror = function () { notice('讀取失敗', '無法讀取此檔案，請換一個檔案再試。'); input.value = ''; };
    rd.readAsDataURL(f);
  });
  $('#btn-demo-base').on('click', function () { setBase(DEMO_BASE); Audit.record({ action: '修改', targetType: 'floorplans', targetId: fp ? fp.id : '', summary: '更換平面圖底圖「示範底圖」（' + (fp ? fp.id : '') + '）' }); App.toast('已載入示範底圖', 'success'); });
  $('#btn-clear-base').on('click', function () {
    if (!state.baseImage) { App.toast('目前沒有底圖', 'info'); return; }
    setBase(null);
    Audit.record({ action: '修改', targetType: 'floorplans', targetId: fp ? fp.id : '', summary: '移除平面圖底圖（' + (fp ? fp.id : '') + '）' });   // V2-T04
  });

  /* ---------- 刪除 ---------- */
  function deleteSel() {
    if (!sel) { App.toast('請先選取區塊或 ICON', 'info'); return; }
    var arr = sel.kind === 'block' ? state.blocks : state.icons;
    for (var i = 0; i < arr.length; i++) if (arr[i].id === sel.id) { arr.splice(i, 1); break; }
    sel = null;
    draw(); renderPanel(); commit();
  }
  $('#btn-delete').on('click', deleteSel);
  $('#btn-undo').on('click', undo);
  $('#btn-redo').on('click', redo);

  /* ---------- 畫布滑鼠操作 ---------- */
  var $canvas = $('#me-canvas');
  $canvas.on('mousedown', '.mr-svg', function (e) {
    if (e.which !== 1) return;
    e.preventDefault();
    var p = api.toPoint(e), nat = api.natural(), unit = api.unit();
    var $t = $(e.target), kind = $t.attr('data-kind'), tid = $t.attr('data-id');
    if (mode === 'draw') {
      var px = clamp(p.x, 0, nat.w), py = clamp(p.y, 0, nat.h);
      var tmp = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      tmp.setAttribute('class', 'mr-temp');
      tmp.setAttribute('fill', '#4a90d9'); tmp.setAttribute('fill-opacity', '0.35');
      tmp.setAttribute('stroke', '#0b6bcb'); tmp.setAttribute('stroke-width', 2 * unit);
      tmp.setAttribute('pointer-events', 'none');
      api.svg.appendChild(tmp);
      drag = { type: 'draw', x0: px, y0: py, tmp: tmp, w: 0, h: 0 };
      return;
    }
    if (mode === 'icon') {
      if (!iconType) { App.toast('請先在下方圖庫選擇 ICON', 'warning'); return; }
      var half = MapRender.ICON_SIZE * unit / 2, size = half * 2;
      var ic = { id: nextId('ICN', state.icons), type: iconType,
        x: Math.round(clamp(p.x - half, 0, nat.w - size)), y: Math.round(clamp(p.y - half, 0, nat.h - size)) };
      state.icons.push(ic);
      sel = { kind: 'icon', id: ic.id };
      setMode('select');
      draw(); renderPanel(); commit();
      return;
    }
    // 選取模式
    if (kind === 'handle') {
      var hb = findIn(state.blocks, tid);
      if (hb) drag = { type: 'resize', id: tid, moved: false };
      return;
    }
    if (kind === 'block' || kind === 'icon') {
      var item = findIn(kind === 'block' ? state.blocks : state.icons, tid);
      if (!item) return;
      select(kind, tid);
      drag = { type: 'move', kind: kind, id: tid, ox: p.x - item.x, oy: p.y - item.y, moved: false };
      return;
    }
    select(null);
  });

  $(document).on('mousemove.me', function (e) {
    if (!drag) return;
    var p = api.toPoint(e), nat = api.natural(), unit = api.unit();
    if (drag.type === 'draw') {
      var px = clamp(p.x, 0, nat.w), py = clamp(p.y, 0, nat.h);
      drag.w = Math.abs(px - drag.x0); drag.h = Math.abs(py - drag.y0);
      drag.x = Math.min(px, drag.x0); drag.y = Math.min(py, drag.y0);
      drag.tmp.setAttribute('x', drag.x); drag.tmp.setAttribute('y', drag.y);
      drag.tmp.setAttribute('width', drag.w); drag.tmp.setAttribute('height', drag.h);
    } else if (drag.type === 'move') {
      var it = findIn(drag.kind === 'block' ? state.blocks : state.icons, drag.id);
      if (!it) return;
      var w = drag.kind === 'block' ? it.w : MapRender.ICON_SIZE * unit;
      var h = drag.kind === 'block' ? it.h : MapRender.ICON_SIZE * unit;
      var nx = Math.round(clamp(p.x - drag.ox, 0, nat.w - w)), ny = Math.round(clamp(p.y - drag.oy, 0, nat.h - h));
      if (nx !== it.x || ny !== it.y) { it.x = nx; it.y = ny; drag.moved = true; draw(); updateUi(); }
    } else if (drag.type === 'resize') {
      var b = findIn(state.blocks, drag.id);
      if (!b) return;
      var nw = Math.round(clamp(p.x - b.x, MapRender.MIN_SIZE, nat.w - b.x)), nh = Math.round(clamp(p.y - b.y, MapRender.MIN_SIZE, nat.h - b.y));
      if (nw !== b.w || nh !== b.h) { b.w = nw; b.h = nh; drag.moved = true; draw(); updateUi(); }
    }
  });
  $(document).on('mouseup.me', function () {
    if (!drag) return;
    var d = drag; drag = null;
    if (d.type === 'draw') {
      if (d.tmp.parentNode) d.tmp.parentNode.removeChild(d.tmp);
      if (!(d.w >= MapRender.MIN_SIZE && d.h >= MapRender.MIN_SIZE)) {
        if (d.w > 2 || d.h > 2) App.toast('區塊至少需 ' + MapRender.MIN_SIZE + '×' + MapRender.MIN_SIZE + ' 才會建立', 'warning');
        return;
      }
      var b = { id: nextId('BLK', state.blocks), x: Math.round(d.x), y: Math.round(d.y), w: Math.round(d.w), h: Math.round(d.h),
        fill: MapRender.FILLS[0].v, opacity: 0.5, stroke: MapRender.STROKES[0].v, fontSize: 18, label: DEFAULT_LABEL, positionId: '' };
      state.blocks.push(b);
      sel = { kind: 'block', id: b.id };
      setMode('select');
      draw(); renderPanel(); commit();
    } else if (d.moved) {
      commit();
    }
  });

  $(document).on('keydown.me', function (e) {
    if ($(e.target).is('input,select,textarea') || $('.dialog-mask').length) return;
    if (e.key === 'Delete') { e.preventDefault(); if (sel) deleteSel(); }
    else if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) { e.preventDefault(); undo(); }
    else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) { e.preventDefault(); redo(); }
  });

  /* ---------- 屬性面板 ---------- */
  function optHtml(list, cur, numeric) {
    return list.map(function (o) {
      var v = o.v;
      return '<option value="' + v + '"' + (String(v) === String(cur) ? ' selected' : '') + '>' + App.esc(o.n) + '</option>';
    }).join('');
  }
  function positionOptions(cur) {
    var seen = {}, list = [];
    PositionDialog.listFor('使用').concat(PositionDialog.listFor('儲存')).forEach(function (p) {
      if (!seen[p.id]) { seen[p.id] = 1; list.push(p); }
    });
    var h = '<option value="">（尚未關聯位置）</option>';
    list.forEach(function (p) {
      h += '<option value="' + p.id + '"' + (p.id === cur ? ' selected' : '') + '>' + App.esc(p.name) + '（' + App.esc(p.usage) + '）</option>';
    });
    return h;
  }
  function orgName(oid) { var o = Store.getById('orgs', oid); return o ? o.name : '—'; }

  function renderChems(b) {
    var $box = $('#pp-chems');
    if (!$box.length) return;
    if (!b.positionId) { $box.html('<div class="me-pp-empty">尚未關聯位置，無法列出化學品。</div>'); return; }
    var list = MapRender.chemicalsAt(b.positionId);
    var $t = $('<div></div>');
    $t.append($('<div class="me-pp-sub"></div>').text('此位置的化學品（' + list.length + ' 筆）'));
    if (!list.length) { $t.append('<div class="me-pp-empty">此位置目前沒有化學品。</div>'); }
    else {
      var $tb = $('<table class="table me-chem-table"><thead><tr><th>名稱</th><th>組織</th><th>單位</th></tr></thead><tbody></tbody></table>');
      list.forEach(function (c) {
        $tb.find('tbody').append($('<tr></tr>').attr('data-id', c.id).append($('<td></td>').text(c.nameZh), $('<td></td>').text(orgName(c.orgId)), $('<td></td>').text(c.unit || '')));
      });
      $t.append($tb);
    }
    $box.empty().append($t);
  }

  function renderPanel() {
    var $p = $('#me-panel').empty();
    var it = findSel();
    if (!it) {
      $p.append('<h3 class="me-pp-title">屬性面板</h3>' +
        '<p class="me-pp-empty">選取區塊或 ICON 後，可在此編輯屬性。</p>' +
        '<ul class="me-pp-tips"><li>區塊：' + state.blocks.length + ' 個（其中 ' + state.blocks.filter(function (b) { return !b.positionId; }).length + ' 個尚未關聯位置）</li>' +
        '<li>ICON：' + state.icons.length + ' 個</li>' +
        '<li>底圖：' + (state.baseImage ? (/^data:/.test(state.baseImage) ? '已上傳圖片' : '示範底圖') : '尚無') + '</li></ul>');
      return;
    }
    if (sel.kind === 'block') {
      $p.append('<h3 class="me-pp-title">區塊屬性</h3>' +
        '<div class="me-pp-row"><label for="pp-label">顯示文字</label><input type="text" id="pp-label" maxlength="30"></div>' +
        '<div class="me-pp-row"><label for="pp-pos">關聯位置</label><select id="pp-pos"></select>' +
        '<button type="button" class="btn-text-link write-only" id="pp-pos-manage">維護位置</button></div>' +
        '<div class="me-pp-row"><label for="pp-fill">背景色</label><select id="pp-fill"></select></div>' +
        '<div class="me-pp-row"><label for="pp-opacity">透明度</label><select id="pp-opacity"></select></div>' +
        '<div class="me-pp-row"><label for="pp-stroke">框線色</label><select id="pp-stroke"></select></div>' +
        '<div class="me-pp-row"><label for="pp-font">字體大小</label><select id="pp-font"></select></div>' +
        '<div class="me-pp-row"><button type="button" class="btn btn-danger btn-sm" id="pp-del">刪除此區塊</button></div>' +
        '<div id="pp-chems" class="me-pp-chems"></div>');
      $('#pp-label').val(it.label || '');
      $('#pp-pos').html(positionOptions(it.positionId));
      $('#pp-fill').html(optHtml(MapRender.FILLS, it.fill));
      $('#pp-opacity').html(optHtml([{ v: 0.3, n: '30%' }, { v: 0.5, n: '50%' }, { v: 0.8, n: '80%' }], it.opacity));
      $('#pp-stroke').html(optHtml(MapRender.STROKES, it.stroke));
      $('#pp-font').html(optHtml([{ v: 14, n: '14' }, { v: 18, n: '18' }, { v: 24, n: '24' }], it.fontSize));
      renderChems(it);
    } else {
      $p.append('<h3 class="me-pp-title">ICON 屬性</h3>' +
        '<div class="me-pp-preview"><img alt="" id="pp-icon-img"></div>' +
        '<div class="me-pp-row"><label for="pp-icon-type">ICON 類型</label><select id="pp-icon-type"></select></div>' +
        '<div class="me-pp-row"><button type="button" class="btn btn-danger btn-sm" id="pp-del">刪除此 ICON</button></div>');
      $('#pp-icon-img').attr('src', MapRender.iconSrc(it.type));
      $('#pp-icon-type').html(optHtml(MapRender.ICONS.map(function (x) { return { v: x.type, n: x.name }; }), it.type));
    }
  }

  var $panel = $('#me-panel');
  function curBlock() { return sel && sel.kind === 'block' ? findSel() : null; }
  $panel.on('input', '#pp-label', function () {
    var b = curBlock(); if (!b) return;
    b.label = this.value; draw(); updateUi();
  });
  $panel.on('change', '#pp-label', function () { commit(); });
  $panel.on('change', '#pp-pos', function () {
    var b = curBlock(); if (!b) return;
    b.positionId = this.value;
    var pos = b.positionId ? Store.getById('positions', b.positionId) : null;
    if (pos && (!$.trim(b.label) || b.label === DEFAULT_LABEL)) { b.label = pos.name; $('#pp-label').val(pos.name); }
    renderChems(b); draw(); commit();
  });
  $panel.on('change', '#pp-fill', function () { var b = curBlock(); if (!b) return; b.fill = this.value; draw(); commit(); });
  $panel.on('change', '#pp-opacity', function () { var b = curBlock(); if (!b) return; b.opacity = parseFloat(this.value); draw(); commit(); });
  $panel.on('change', '#pp-stroke', function () { var b = curBlock(); if (!b) return; b.stroke = this.value; draw(); commit(); });
  $panel.on('change', '#pp-font', function () { var b = curBlock(); if (!b) return; b.fontSize = parseInt(this.value, 10); draw(); commit(); });
  $panel.on('change', '#pp-icon-type', function () {
    var ic = sel && sel.kind === 'icon' ? findSel() : null; if (!ic) return;
    ic.type = this.value; $('#pp-icon-img').attr('src', MapRender.iconSrc(ic.type)); draw(); commit();
  });
  $panel.on('click', '#pp-del', deleteSel);
  $panel.on('click', '#pp-pos-manage', function () {
    if (!App.requireWrite()) return;
    PositionDialog.open({ onChange: function () { var b = curBlock(); if (b) $('#pp-pos').html(positionOptions(b.positionId)); } });
  });

  /* ---------- 儲存、取消、離開 ---------- */
  function save() {
    if (!App.requireWrite()) return;
    Store.update('floorplans', fp.id, { baseImage: state.baseImage, blocks: clone(state.blocks), icons: clone(state.icons) });
    if (Store.save() === false) {
      notice('儲存失敗', '瀏覽器儲存空間不足，圖面尚未寫入。請清除底圖或改用較小的圖片後再儲存；在重新整理頁面前，目前的編輯內容仍保留在畫面上。');
      return;
    }
    savedStr = JSON.stringify(snap());
    updateUi();
    App.toast('已儲存圖面', 'success');
  }
  function confirmLeave() {
    return App.confirm('有未儲存的變更，確定要離開嗎？\n離開後這次的編輯將會遺失。', { okText: '離開', danger: true });
  }
  $('#btn-save').on('click', save);
  $('#btn-cancel').on('click', function () {
    if (!dirty()) { App.toast('目前沒有未儲存的變更', 'info'); return; }
    App.confirm('確定放棄未儲存的變更，還原到上次儲存的狀態嗎？', { okText: '還原', danger: true }).then(function (ok) {
      if (!ok) return;
      hist = [savedStr]; hidx = 0; sel = null;
      restore(savedStr);
      App.toast('已還原到上次儲存的狀態', 'info');
    });
  });
  $('#btn-back').on('click', function () {
    if (!dirty()) { location.href = listUrl; return; }
    confirmLeave().then(function (ok) { if (ok) location.href = listUrl; });
  });
  // 從 Sidebar、頁首等連結離開時同樣確認（展示假設 A-20：不使用 beforeunload）
  $(document).on('click.me', 'a[href]', function (e) {
    if (!dirty()) return;
    var href = this.getAttribute('href');
    if (!href || href.charAt(0) === '#') return;
    e.preventDefault();
    confirmLeave().then(function (ok) { if (ok) location.href = href; });
  });

  setMode('select');
  renderPanel();
  updateUi();
});

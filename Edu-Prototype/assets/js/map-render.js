/* 平面圖圖面渲染（T10 建立；T09 檢視模式、T11 H-Card 共用）。
   用法：var api = MapRender.render($container, floorplan, { readonly: true, emptyHint: '提示文字' });
   座標以底圖原始像素為準：SVG viewBox = 底圖原始尺寸，顯示寬度固定 1000px。無底圖時視為 1000×640 白底。
   api.redraw(floorplan, selected) 重畫區塊與 ICON（selected = {kind:'block'|'icon', id}，編輯器用）。
   需先載入 jQuery、App（用於 App.root() 處理 pages/ 層級）。 */
(function (w, $) {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';
  var STAGE_W = 1000;
  var ICON_SIZE = 40;      // ICON 在 1000px 顯示寬度下的邊長
  var MIN_SIZE = 20;       // 區塊最小邊長（原始像素）
  var HANDLE = 12;

  var ICONS = [
    { type: 'ghs01', name: '爆炸物' }, { type: 'ghs02', name: '易燃物' }, { type: 'ghs03', name: '氧化性物質' },
    { type: 'ghs04', name: '高壓氣體' }, { type: 'ghs05', name: '腐蝕性物質' }, { type: 'ghs06', name: '急毒性' },
    { type: 'ghs07', name: '警告（驚嘆號）' }, { type: 'ghs08', name: '健康危害' }, { type: 'ghs09', name: '環境危害' },
    { type: 'extinguisher', name: '滅火器' }, { type: 'shower', name: '緊急淋浴' }, { type: 'eyewash', name: '洗眼器' }, { type: 'firstaid', name: '急救箱' }
  ];
  var FILLS = [
    { v: '#4a90d9', n: '藍' }, { v: '#e5534b', n: '紅' }, { v: '#e8b730', n: '黃' },
    { v: '#4caf6f', n: '綠' }, { v: '#f08a3c', n: '橘' }, { v: '#9aa5b1', n: '灰' }
  ];
  var STROKES = [
    { v: '#1f4e79', n: '深藍' }, { v: '#9b2c26', n: '深紅' }, { v: '#2c6e49', n: '深綠' },
    { v: '#222222', n: '黑' }, { v: '#b45f06', n: '深橘' }, { v: '#5b6670', n: '深灰' }
  ];

  function svgEl(name, attrs) {
    var el = document.createElementNS(NS, name);
    if (attrs) Object.keys(attrs).forEach(function (k) { el.setAttribute(k, attrs[k]); });
    return el;
  }

  function iconSrc(type) { return App.root() + 'assets/img/icons/' + type + '.svg'; }
  function iconName(type) {
    for (var i = 0; i < ICONS.length; i++) if (ICONS[i].type === type) return ICONS[i].name;
    return type;
  }
  // 相對路徑底圖（示範底圖）補上 pages/ 層級；dataURL 與絕對網址原樣使用
  function resolveSrc(s) {
    if (!s) return '';
    return /^(data:|https?:|file:|blob:|\/)/i.test(s) ? s : App.root() + s;
  }

  // 位置的化學品：使用地點或儲存地點等於該位置（同學校）
  function chemicalsAt(positionId) {
    if (!positionId) return [];
    var sid = App.school && App.school.id;
    return Store.get('chemicals').filter(function (c) {
      return c.schoolId === sid && (c.usePositionId === positionId || c.storePositionId === positionId);
    }).sort(function (a, b) { return String(a.id).localeCompare(String(b.id)); });
  }

  function render($container, fp, opts) {
    opts = opts || {};
    var $c = $($container);
    $c.empty();
    var $stage = $('<div class="mr-stage"></div>').css('width', STAGE_W + 'px').toggleClass('mr-readonly', !!opts.readonly);
    var nat = { w: STAGE_W, h: 640 };
    var $img = null, $blank = null, $hint = null;
    var svg = svgEl('svg', { 'class': 'mr-svg', viewBox: '0 0 ' + nat.w + ' ' + nat.h, preserveAspectRatio: 'none' });
    var cur = fp || {};

    function applySize() {
      svg.setAttribute('viewBox', '0 0 ' + nat.w + ' ' + nat.h);
      $stage.css('height', Math.round(STAGE_W * nat.h / nat.w) + 'px');
    }

    function setBase(src) {
      $stage.find('.mr-base,.mr-blank,.mr-empty-hint').remove();
      var url = resolveSrc(src);
      if (url) {
        nat = { w: STAGE_W, h: 640 };
        $img = $('<img class="mr-base" alt="平面圖底圖" draggable="false">').css({ width: STAGE_W + 'px' });
        $img.on('load', function () {
          if (this.naturalWidth) { nat = { w: this.naturalWidth, h: this.naturalHeight || 640 }; applySize(); redraw(cur, curSel); }
        });
        $img.attr('src', url);
        $stage.prepend($img);
      } else {
        nat = { w: STAGE_W, h: 640 };
        $blank = $('<div class="mr-blank"></div>').css({ width: STAGE_W + 'px', height: '640px' });
        $stage.prepend($blank);
        if (opts.emptyHint) {
          $hint = $('<div class="mr-empty-hint"></div>').text(opts.emptyHint);
          $stage.append($hint);
        }
      }
      applySize();
    }

    var curSel = null;
    function redraw(f, sel) {
      cur = f || cur || {};
      curSel = sel || null;
      var unit = nat.w / STAGE_W;
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      (cur.blocks || []).forEach(function (b) {
        var g = svgEl('g', { 'class': 'mr-block' + (b.positionId ? '' : ' mr-unlinked'), 'data-kind': 'block', 'data-id': b.id });
        var rect = svgEl('rect', {
          x: b.x, y: b.y, width: b.w, height: b.h, fill: b.fill || '#4a90d9', 'fill-opacity': b.opacity == null ? 0.5 : b.opacity,
          stroke: b.stroke || '#1f4e79', 'stroke-width': 2 * unit, 'data-kind': 'block', 'data-id': b.id
        });
        if (!b.positionId) { rect.setAttribute('stroke-dasharray', (7 * unit) + ' ' + (4 * unit)); }
        g.appendChild(rect);
        if (b.label) {
          var t = svgEl('text', {
            x: b.x + b.w / 2, y: b.y + b.h / 2, 'text-anchor': 'middle', 'dominant-baseline': 'central',
            'font-size': (b.fontSize || 18) * unit, 'class': 'mr-label', 'data-kind': 'block', 'data-id': b.id
          });
          t.textContent = b.label;
          t.setAttribute('stroke-width', 3 * unit);
          g.appendChild(t);
        }
        svg.appendChild(g);
      });
      (cur.icons || []).forEach(function (ic) {
        var s = ICON_SIZE * unit;
        var im = svgEl('image', { x: ic.x, y: ic.y, width: s, height: s, 'class': 'mr-icon', 'data-kind': 'icon', 'data-id': ic.id });
        im.setAttributeNS('http://www.w3.org/1999/xlink', 'href', iconSrc(ic.type));
        im.setAttribute('href', iconSrc(ic.type));
        var title = svgEl('title'); title.textContent = iconName(ic.type);
        im.appendChild(title);
        svg.appendChild(im);
      });
      // 選取框（編輯器）
      if (sel && !opts.readonly) {
        var box = null;
        if (sel.kind === 'block') {
          (cur.blocks || []).forEach(function (b) { if (b.id === sel.id) box = { x: b.x, y: b.y, w: b.w, h: b.h, handle: true }; });
        } else if (sel.kind === 'icon') {
          (cur.icons || []).forEach(function (ic) { if (ic.id === sel.id) box = { x: ic.x, y: ic.y, w: ICON_SIZE * unit, h: ICON_SIZE * unit }; });
        }
        if (box) {
          svg.appendChild(svgEl('rect', { 'class': 'mr-sel', x: box.x, y: box.y, width: box.w, height: box.h, fill: 'none', stroke: '#0b6bcb', 'stroke-width': 2 * unit, 'stroke-dasharray': (5 * unit) + ' ' + (3 * unit), 'pointer-events': 'none' }));
          if (box.handle) {
            var hs = HANDLE * unit;
            svg.appendChild(svgEl('rect', { 'class': 'mr-handle', 'data-kind': 'handle', 'data-id': sel.id, x: box.x + box.w - hs / 2, y: box.y + box.h - hs / 2, width: hs, height: hs, fill: '#fff', stroke: '#0b6bcb', 'stroke-width': 2 * unit }));
          }
        }
      }
    }

    $stage.append(svg);
    setBase(cur.baseImage);
    redraw(cur, null);
    $c.append($stage);

    return {
      stage: $stage,
      svg: svg,
      redraw: redraw,
      setBase: setBase,
      natural: function () { return { w: nat.w, h: nat.h }; },
      unit: function () { return nat.w / STAGE_W; },
      // 滑鼠事件 → 底圖原始像素座標
      toPoint: function (e) {
        var r = svg.getBoundingClientRect();
        return { x: (e.clientX - r.left) * nat.w / r.width, y: (e.clientY - r.top) * nat.h / r.height };
      }
    };
  }

  w.MapRender = {
    render: render,
    ICONS: ICONS,
    FILLS: FILLS,
    STROKES: STROKES,
    ICON_SIZE: ICON_SIZE,
    MIN_SIZE: MIN_SIZE,
    iconSrc: iconSrc,
    iconName: iconName,
    resolveSrc: resolveSrc,
    chemicalsAt: chemicalsAt
  };
})(window, jQuery);

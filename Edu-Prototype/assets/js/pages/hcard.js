/* H-Card 匯出預覽（UI-20，T11）：?id=FP-xxx&format=A|B。僅管理者與系統管理者。 */
$(document).on('app:ready', function () {
  'use strict';

  var esc = ExportUtil.esc;
  var id = App.qs('id');
  var format = App.qs('format') === 'B' ? 'B' : 'A';
  var fp = id ? Store.getById('floorplans', id) : null;
  var listUrl = App.menuUrl('map');
  var viewUrl = fp ? App.pageUrl('map-info', { mode: 'view', id: id }) : listUrl;
  var data = null;

  function notice(title, msg, then) {
    App.dialog({ title: title, width: 440, body: '<p class="confirm-msg">' + esc(msg) + '</p>',
      buttons: [{ text: '我知道了', cls: 'btn-primary', onClick: function () { if (then) then(); } }],
      onClose: then });
  }

  if (!App.isManager()) {
    notice('不允許的操作', '僅管理者或系統管理者可匯出 H-Card，將回到平面圖檢視頁。', function () { location.href = viewUrl; });
    return;
  }
  if (!fp || fp.schoolId !== App.school.id) {
    notice('查無資料', '找不到指定的平面圖，將回到清單。', function () { location.href = listUrl; });
    return;
  }

  var BASE_COLS = ['所屬組織', '化學品名稱', '使用／儲存地點', '最大儲存量', '最大使用量', '物理狀態', '適用滅火劑', '包裝方式／材質', '搶救方法', 'UN No.'];

  /* ---------- HTML 產生（預覽與 Word 共用） ---------- */
  function rowHtml(r) {
    var tds = [
      r.orgName, r.nameZh + (r.nameEn ? '（' + r.nameEn + '）' : '') + ' [' + r.chemId + ']', '使用：' + (r.useName || '—') + '\n儲存：' + (r.storeName || '—'),
      r.maxStore, r.maxUse, r.physical, r.extinguishers, r.packaging, r.rescue, r.unNo
    ];
    var h = '<tr>';
    tds.forEach(function (t) { h += '<td>' + esc(t).replace(/\n/g, '<br>') + '</td>'; });
    r.cells.forEach(function (c) {
      var cls = c === '✓' ? ' class="hc-hit"' : (c === HCard.NO_SDS ? ' class="hc-nosds"' : ' class="hc-cell"');
      h += '<td' + cls + '>' + esc(c) + '</td>';
    });
    return h + '</tr>';
  }
  function tableHtml(rows, cls) {
    var head = '<tr>';
    BASE_COLS.forEach(function (c) { head += '<th>' + esc(c) + '</th>'; });
    data.meta.hazardNames.forEach(function (c) { head += '<th class="hc-hz">' + esc(c) + '</th>'; });
    head += '</tr>';
    var body = '';
    if (!rows.length) body = '<tr><td colspan="' + (BASE_COLS.length + data.meta.hazardNames.length) + '" class="hc-empty">本段無符合品項</td></tr>';
    else rows.forEach(function (r) { body += rowHtml(r); });
    return '<table class="hc-table ' + (cls || '') + '"><thead>' + head + '</thead><tbody>' + body + '</tbody></table>';
  }
  function infoHtml() {
    var items = [['建築物名稱／結構', fp.building], ['場所人員概況／使用時段', fp.occupancy], ['場所用途', fp.usage], ['運作時間', fp.operatingHours],
      ['救災專人姓名', fp.rescuerName], ['救災專人聯絡方式', fp.rescuerContact], ['室內可燃性材料說明', fp.flammableNote], ['備註', fp.remark],
      ['最後更新日期', fp.updatedAt ? String(fp.updatedAt).slice(0, 10) : '']];
    var h = '<table class="hc-info"><tbody>';
    for (var i = 0; i < items.length; i += 2) {
      h += '<tr><th>' + esc(items[i][0]) + '</th><td>' + esc(items[i][1] || '—') + '</td>';
      if (items[i + 1]) h += '<th>' + esc(items[i + 1][0]) + '</th><td>' + esc(items[i + 1][1] || '—') + '</td>';
      else h += '<th></th><td></td>';
      h += '</tr>';
    }
    return h + '</tbody></table>';
  }
  function overviewHtml() {
    var h = '<table class="hc-overview"><thead><tr><th>危害特性</th><th>化學品數（不重複）</th><th>資料列數</th></tr></thead><tbody>';
    data.meta.hazardNames.forEach(function (n) {
      var c = data.totals.hazardCounts[n];
      h += '<tr><td>' + esc(n) + '</td><td>' + (n === '放射性' ? '—' : c.distinct) + '</td><td>' + (n === '放射性' ? '—' : c.rows) + '</td></tr>';
    });
    var pend = data.rows.filter(function (r) { return !r.hasSds; });
    if (pend.length) h += '<tr><td>' + esc(HCard.OTHER_PENDING) + '（無 SDS）</td><td>' + pend.length + '</td><td>' + pend.length + '</td></tr>';
    h += '</tbody></table>';
    // 圖面危害圖示（SDS 第二項圖示，名稱取自 SdsSchema）
    var cnt = {};
    data.rows.forEach(function (r) { r.pictograms.forEach(function (p) { (cnt[p] = cnt[p] || {})[r.subKey] = 1; }); });
    var codes = Object.keys(cnt).sort();
    h += '<div class="hc-pics"><strong>危害圖示（SDS 第二項）：</strong>';
    h += codes.length ? codes.map(function (c) { return esc(c + ' ' + (SdsSchema.GHS_NAME[c] || '')) + '（' + Object.keys(cnt[c]).length + '）'; }).join('、') : '無資料';
    return h + '</div>';
  }
  function noteHtml() {
    return '<ol class="hc-notes">' +
      '<li>資料來源：平面圖圖面區塊所關聯的位置，納入使用地點或儲存地點等於該位置的化學品（展示假設 A-16），化學品資料連結 SDS 取得物理狀態、滅火劑、UN No. 與危害圖示。</li>' +
      '<li>毒性（格式 A）／急毒性（格式 B）依本案政府清單命中（SDS 成分比對）判定；無 SDS 化學品不判定毒化物，危害欄顯示「' + HCard.NO_SDS + '」並列入「' + HCard.OTHER_PENDING + '」，不視為無危害。</li>' +
      '<li>禁水性：SDS 第二項分類含「禁水」。爆炸性＝圖示 GHS01；可燃性＝GHS02；氧化性＝GHS03；高壓氣體／加壓氣體＝GHS04；腐蝕性＝GHS05；急毒性＝GHS06 或政府清單命中；健康危害＝GHS08；其他＝以上皆無但有任一圖示。</li>' +
      '<li>放射性：目前化學雲無相關資料可判別，固定顯示「—」，請使用者自行填寫。包裝方式／材質與搶救方法尚未指定維護來源，顯示「' + HCard.PENDING + '」。</li>' +
      '<li>每筆組織化學品獨立一列，同區域同 SDS 之不同組織化學品分列不合併、不加總數量；同品項可在多個危害特性段落重複出現，不代表增加實際品項或庫存。</li>' +
      '</ol>';
  }
  function footHtml() {
    return '<p class="hc-foot">品項總數（不重複，以 SDS 計）' + data.totals.distinctChemicals + '、資料列 ' + data.totals.rows +
      '；同區域同 SDS 之不同組織化學品分列不合併。</p>';
  }
  function sectionsHtml() {
    var h = '';
    data.sections.forEach(function (s) {
      h += '<h3 class="hc-sec-title">' + esc(s.hazardName) + '（' + s.rows.length + ' 筆）</h3>' +
        (s.rows.length ? '<div class="hc-scroll">' + tableHtml(s.rows, 'hc-sec-table') + '</div>' : '<p class="hc-sec-empty">本段無符合品項</p>');
    });
    return h;
  }
  function titleText() { return '化學品儲存分佈（H-Card 格式 ' + format + '）'; }
  function metaHtml() {
    return '<div class="hc-meta"><span>學校：' + esc(data.meta.schoolName) + '</span><span>組織：' + esc(data.meta.orgName) + '</span>' +
      '<span>平面圖：' + esc(data.meta.name) + '</span><span>產出時間：' + esc(data.meta.generatedAt) + '</span></div>';
  }

  /* ---------- 預覽 ---------- */
  function render() {
    data = HCard.collect(id, format);
    window.__hcardData = data;
    $('#hc-fp-name').text(fp.name);
    $('.hc-fmt').each(function () { $(this).toggleClass('btn-primary', $(this).data('format') === format).toggleClass('btn-secondary', $(this).data('format') !== format); });
    var d = '';
    d += '<h2 class="hc-title">' + esc(titleText()) + ' <span class="poc-badge">POC 模擬</span></h2>' + metaHtml();

    d += '<div class="card hc-issues no-print" id="hc-issues"><div class="card-title">來源核對</div>';
    if (data.sourceIssues.length || !data.meta.hasBlocks) {
      d += '<ul>';
      if (!data.meta.hasBlocks) d += '<li><span class="tag tag-danger">無關聯</span>尚無區塊關聯位置。</li>';
      data.sourceIssues.forEach(function (i) { d += '<li><span class="tag tag-danger">' + esc(i.type) + '</span>' + esc(i.text) + '</li>'; });
      d += '</ul>';
    } else d += '<p class="hc-ok">來源資料完整</p>';
    d += '</div>';

    d += '<div class="card"><div class="card-title">平面圖圖面</div><div class="hc-map-wrap"><div id="hc-map"></div></div>';
    d += '<p class="hc-desc"><strong>平面圖說明：</strong>' + esc(fp.description || '—') + '</p></div>';
    d += '<div class="card"><div class="card-title">場所資訊</div>' + infoHtml() + '</div>';

    if (!data.meta.hasBlocks) {
      d += '<div class="card"><div class="hc-nodata">尚無區塊關聯位置，無法彙整化學品。請先到「編輯圖面」新增區塊並關聯位置後再匯出。</div></div>';
    } else {
      d += '<div class="card"><div class="card-title">危害總覽</div>' + overviewHtml() + '</div>';
      d += '<div class="card"><div class="card-title">化學品分類表：全部品項</div><div class="hc-scroll">' + tableHtml(data.rows, 'hc-all-table') + '</div>' + footHtml() + '</div>';
      d += '<div class="card"><div class="card-title">化學品分類表：依危害特性分段</div><div id="hc-sections">' + sectionsHtml() + '</div>' + footHtml() + '</div>';
    }
    d += '<div class="card"><div class="card-title">註解說明</div>' + noteHtml() + '</div>';
    $('#hc-doc').html(d).prop('hidden', false);
    MapRender.render($('#hc-map'), fp, { readonly: true, emptyHint: '尚未設定底圖' });
  }

  /* ---------- 匯出 ---------- */
  function wordHtml() {
    var h = '<h1>' + esc(titleText()) + '　[POC 模擬]</h1>' + metaHtml();
    h += '<p>※POC 展示輸出：此文件為 HTML 另存之 .doc，非正式 Word 範本；圖面請以「列印／另存 PDF」取得。</p>';
    h += '<h2>平面圖說明</h2><p>' + esc(fp.description || '—') + '</p>';
    h += '<h2>場所資訊</h2>' + infoHtml();
    if (!data.meta.hasBlocks) return h + '<p>尚無區塊關聯位置，無法彙整化學品。</p>' + noteHtml();
    h += '<h2>危害總覽</h2>' + overviewHtml();
    h += '<h2>化學品分類表：全部品項</h2>' + tableHtml(data.rows, '') + footHtml();
    h += '<h2>化學品分類表：依危害特性分段</h2>' + sectionsHtml() + footHtml();
    h += '<h2>註解說明</h2>' + noteHtml();
    return h;
  }
  function waitBase(cb) {
    var $img = $('.mr-base');
    if (!$img.length) { cb(); return; }
    var done = false;
    function fin() { if (done) return; done = true; cb(); }
    var el = $img[0];
    if (el.complete && el.naturalWidth) { fin(); return; }
    $img.one('load error', fin);
    setTimeout(fin, 3000);
  }

  $('#btn-word').on('click', function () {
    if (!App.isManager()) { App.toast('僅管理者或系統管理者可匯出 H-Card', 'warning'); return; }
    var wordName = 'HCard格式' + format + '_' + fp.name + '_' + App.today() + '.doc';
    ExportUtil.htmlToDoc(wordHtml(), wordName);
    Audit.record({ action: '匯出', targetType: 'floorplans', targetId: fp.id, summary: '匯出 H-Card 格式 ' + format + '（Word：' + wordName + '，平面圖 ' + fp.id + '）' });   // V2-T04
    App.toast('已匯出 Word（POC 模擬，HTML 另存 .doc）', 'success');
  });
  $('#btn-print').on('click', function () {
    if (!App.isManager()) { App.toast('僅管理者或系統管理者可匯出 H-Card', 'warning'); return; }
    Audit.record({ action: '匯出', targetType: 'floorplans', targetId: fp.id, summary: '匯出 H-Card 格式 ' + format + '（列印，平面圖 ' + fp.id + '）' });   // V2-T04
    waitBase(function () { window.print(); });
  });
  $('#btn-back').on('click', function () { location.href = listUrl; });
  $('#hc-toolbar').on('click', '.hc-fmt', function () {
    format = $(this).data('format');
    try { history.replaceState(null, '', App.pageUrl('hcard', { id: id, format: format }).split('/').pop()); } catch (e) { /* file:// 等環境略過 */ }
    render();
  });

  $('#hc-toolbar').prop('hidden', false);
  render();
});

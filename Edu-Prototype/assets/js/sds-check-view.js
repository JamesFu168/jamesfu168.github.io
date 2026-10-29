/* SDS 十六大項檢查檢視（T14b）：sds-check 與 check 兩頁共用。
   SdsCheckView.render($container, { onDetail }) 渲染摘要列＋十六大項可展開區塊；
   SdsCheckView.openDetail(sectionNo, rule, hits) 開「異常或未填寫 SDS 數量」Dialog。
   依賴 App、Store、SdsSchema、SdsRules。展示假設 A-09：示範檢查規則。 */
(function (w) {
  'use strict';

  var TYPE_CLS = { '缺漏': 'tag-danger', '格式': 'tag-warn', '疑義': 'tag-info' };

  function esc(s) { return App.esc(s); }
  function secName(n) { return '第 ' + w.SdsSchema.CN_NUM[n] + ' 項　' + w.SdsSchema.SECTION_NAMES['s' + n]; }
  function stamp() {
    var d = new Date();
    function p(n) { return n < 10 ? '0' + n : '' + n; }
    return App.fmtDate(d) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
  }

  // 開啟異常明細 Dialog。hits 為 SDS id 陣列。
  function openDetail(sectionNo, rule, hits) {
    var mode = App.canWrite() ? 'edit' : 'view';
    var h = '<div class="scv-dlg-info">' +
      '<div class="scv-dlg-row"><span class="scv-dlg-label">SDS 內容項目：</span><span class="scv-dlg-val">' + esc(secName(sectionNo)) + '</span></div>' +
      '<div class="scv-dlg-row"><span class="scv-dlg-label">異常或未填寫原因：</span><span class="scv-dlg-val scv-dlg-reason">' + esc(rule.reason) + '</span></div>' +
      '<div class="scv-dlg-row"><span class="scv-dlg-label">SDS 數量：</span><span class="scv-dlg-val">' + hits.length + ' 筆</span></div></div>' +
      '<div class="scv-dlg-scroll"><table class="table scv-dlg-table"><thead><tr>' +
      '<th class="c-act">編輯</th><th class="c-name">化學品名稱</th><th class="c-idx">SDS 索引碼</th><th class="c-part">料號</th><th>製造者、輸入者或供應者</th></tr></thead><tbody>';
    hits.forEach(function (id) {
      var s = Store.getById('sdsList', id) || {}, s1 = (s.items && s.items.s1) || {};
      var url = App.pageUrl('sds-form', { mode: mode, id: id, section: sectionNo });
      var icon = mode === 'edit' ? '<a class="act-icon act-edit" title="編輯" href="' + url + '">✏️</a>' : '<a class="act-icon act-view" title="檢視" href="' + url + '">🔍</a>';
      h += '<tr data-id="' + esc(id) + '"><td class="c-act">' + icon + '</td><td class="c-name">' + (esc(Store.sdsDisplayName(s)) || '<span class="muted">（未命名）</span>') + '</td>' +
        '<td class="c-idx">' + esc(s.indexCode) + '</td><td class="c-part">' + esc(s1.partNo) + '</td><td>' + esc(s1.supplierName) + '</td></tr>';
    });
    h += '</tbody></table></div>';
    return App.dialog({ title: '異常或未填寫 SDS 數量', width: 900, body: h, buttons: [{ text: '關閉', cls: 'btn-secondary' }] });
  }

  function render($container, opts) {
    opts = opts || {};
    var schoolId = App.school.id;
    var result = null, checkedAt = '', total = 0;
    var openSecs = {}, showAll = false;
    var ns = '.scv';

    function secDistinct(n) {
      var map = {};
      result.bySection[n].forEach(function (g) { g.hits.forEach(function (id) { map[id] = true; }); });
      return Object.keys(map).length;
    }
    function summaryHtml() {
      var abn = result.distinctAbnormalSds.length;
      return '<div class="card scv-summary">' +
        '<div class="sum-item"><div class="sum-label">SDS 總數</div><div class="sum-value" id="sum-total">' + total + '</div></div>' +
        '<div class="sum-item"><div class="sum-label">異常 SDS 數（不重複）</div><div class="sum-value' + (abn ? ' is-abn' : '') + '" id="sum-abn">' + abn + '</div></div>' +
        '<div class="sum-item"><div class="sum-label">規則命中總數</div><div class="sum-value" id="sum-hits">' + result.totalHits + '</div></div>' +
        '<div class="sum-item"><div class="sum-label">最後檢查時間</div><div class="sum-value sum-time" id="sum-time">' + esc(checkedAt) + '</div></div>' +
        '<span class="spacer"></span><label class="scv-showall"><input type="checkbox" id="chk-showall"' + (showAll ? ' checked' : '') + '>顯示無異常項目</label>' +
        '<button type="button" class="btn btn-primary" id="btn-recheck">重新檢查</button></div>';
    }
    function sectionsHtml() {
      var h = '<div class="scv-sections">', shown = 0;
      for (var n = 1; n <= 16; n++) {
        var groups = result.bySection[n], m = secDistinct(n);
        if (!showAll && !m) continue;
        shown++;
        var isOpen = openSecs[n] === undefined ? m > 0 : !!openSecs[n];
        h += '<section class="scv-sec' + (isOpen ? ' open' : '') + (m ? ' has-abn' : '') + '" data-sec="' + n + '">' +
          '<button type="button" class="scv-sec-head" aria-expanded="' + isOpen + '"><span class="scv-caret">▶</span>' +
          '<span class="scv-sec-title">' + esc(secName(n)) + '</span>' +
          '<span class="scv-sec-count">（共 ' + groups.length + ' 條規則，異常 <b>' + m + '</b> 筆）</span></button>' +
          '<div class="scv-sec-body"><div class="table-wrap"><table class="table scv-table"><thead><tr>' +
          '<th class="col-item">檢查項目</th><th class="col-type">類型</th><th class="col-cnt">異常筆數</th><th>檢查依據／異常原因</th></tr></thead><tbody>';
        groups.forEach(function (g) {
          var r = g.rule, c = g.hits.length;
          if (!showAll && !c) return;
          h += '<tr class="' + (c ? '' : 'zero') + '" data-rule="' + r.id + '"><td>' + esc(r.item) + '</td>' +
            '<td><span class="tag ' + (TYPE_CLS[r.type] || 'tag-off') + '">' + esc(r.type) + '</span></td>' +
            '<td class="col-cnt">' + (c ? '<button type="button" class="btn-text-link scv-cnt" data-rule="' + r.id + '" data-sec="' + n + '">' + c + ' 筆</button>' : '0 筆') + '</td>' +
            '<td>' + esc(r.reason) + '</td></tr>';
        });
        h += '</tbody></table></div></div></section>';
      }
      if (!shown) h += '<div class="scv-empty">目前沒有檢查異常</div>';
      return h + '</div>';
    }
    function draw() { $container.html(summaryHtml() + sectionsHtml()); }

    function run(isRecheck) {
      var all = Store.get('sdsList').filter(function (s) { return s.schoolId === schoolId; });
      total = all.length;
      result = w.SdsRules.run(all);
      checkedAt = stamp();
      draw();
      if (isRecheck) App.toast('已重新檢查，共 ' + all.length + ' 筆 SDS', 'success');
    }

    $container.off(ns).addClass('scv-root');
    $container.on('click' + ns, '.scv-sec-head', function () {
      var $s = $(this).closest('.scv-sec'), n = $s.attr('data-sec');
      $s.toggleClass('open');
      openSecs[n] = $s.hasClass('open');
      $(this).attr('aria-expanded', openSecs[n]);
    });
    $container.on('click' + ns, '.scv-cnt', function () {
      var n = parseInt($(this).attr('data-sec'), 10), id = $(this).attr('data-rule'), g = null;
      result.bySection[n].forEach(function (x) { if (x.rule.id === id) g = x; });
      if (g && g.hits.length) {
        (opts.onDetail || openDetail)(n, g.rule, g.hits);
        Audit.record({ action: '查閱', summary: '開啟異常明細：第' + w.SdsSchema.CN_NUM[n] + '項「' + g.rule.reason + '」（' + g.hits.length + ' 筆 SDS）' });   // V2-T04
      }
    });
    $container.on('change' + ns, '#chk-showall', function () { showAll = this.checked; draw(); });
    $container.on('click' + ns, '#btn-recheck', function () {
      run(true);
      Audit.record({ action: '查詢', summary: '重新檢查 SDS 十六大項（共 ' + total + ' 筆 SDS，異常 ' + result.distinctAbnormalSds.length + ' 筆）' });   // V2-T04
    });

    run(false);
    return { rerun: run };
  }

  w.SdsCheckView = { render: render, openDetail: openDetail };
})(window);

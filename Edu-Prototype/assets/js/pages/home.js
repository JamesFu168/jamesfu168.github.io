/* 流程圖首頁（UI-02）：節點連結一律由 App.menuUrl（Sidebar 同一份選單定義）取得 */
(function ($) {
  'use strict';

  // 節點只記選單鍵，不重複寫網址
  var STAGES = [
    { cls: 'st-p', tag: '', title: '資料建置', nodes: [
      { menu: 'sds', icon: '📄', name: 'SDS 建置', desc: '十六項資料與毒化物自動識別' } ] },
    { cls: 'st-d', tag: '', title: '現場管理', nodes: [
      { menu: 'chem', icon: '🧪', name: '化學品管理', desc: '化學品建檔、位置與管控量' },
      { menu: 'map', icon: '🗺', name: '平面圖管理', desc: '圖面區塊、位置關聯與 H-Card' } ] },
    { cls: 'st-c', tag: '', title: '查核', nodes: [
      { menu: 'regulated', icon: '⚖', name: '列管查詢', desc: '查詢列管與毒化物化學品' },
      { menu: 'sds-check', icon: '🔍', name: 'SDS 檢查', desc: '依示範規則檢查 SDS' },
      { menu: 'check', icon: '✔', name: '自主檢查', desc: 'SDS、文件效期與數量異常' } ] },
    { cls: 'st-a', tag: '', title: '申報產出', nodes: [
      { menu: 'report-tox', icon: '📊', name: '毒化物申報', desc: '月報查詢與 Excel 匯出' },
      { menu: 'report-moe', icon: '📦', name: '教育部批次匯出', desc: '依教育部格式產出 ZIP' } ] }
  ];

  $(document).on('app:ready', function () {
    var $flow = $('#flow');
    STAGES.forEach(function (st, i) {
      if (i > 0) $flow.append('<div class="flow-arrow" aria-hidden="true"><span></span></div>');
      var $s = $('<section class="flow-stage"></section>').addClass(st.cls);
      var $h = $('<div class="stage-head"></div>');
      if (st.tag) $h.append($('<span class="stage-tag"></span>').text(st.tag));
      $h.append($('<span class="stage-title"></span>').text(st.title));
      $s.append($h);
      st.nodes.forEach(function (n) {
        var $a = $('<a class="flow-node"></a>').attr('href', App.menuUrl(n.menu));
        if (n.hint) $a.attr('title', n.hint);
        $a.append($('<span class="node-icon"></span>').text(n.icon));
        var $t = $('<span class="node-text"></span>');
        $t.append($('<span class="node-name"></span>').text(n.name));
        $t.append($('<span class="node-desc"></span>').text(n.desc));
        if (n.hint) $t.append($('<span class="node-hint"></span>').text(n.hint));
        $a.append($t);
        $s.append($a);
      });
      $flow.append($s);
    });
  });
})(jQuery);

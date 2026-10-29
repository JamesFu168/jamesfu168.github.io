/* 最新消息登入提示（V2-T03，A-29）
   載入順序：須在 app.js 之前（app.js 於 DOM ready 才執行 init，本檔先註冊 app:ready 監聽即可）。
   App.afterLogin 與 app:ready 在 init 成功後連續觸發，故以 app:ready 達成「登入後第一個頁面顯示」。 */
(function (w, $) {
  'use strict';

  var NEWS_ALWAYS_SHOW = true;   // POC：顯示 news 全部；false 時改依 Store.activeNews(今天)

  function esc(t) { return w.App.esc(t); }

  // 網址檢查（段落連結與 moreUrl 共用）：僅允許 http(s)、相對路徑、同目錄 .html；拒絕 // 協定相對網址與其他協定
  function safeUrl(u) {
    u = String(u || '');
    if (/^[\/\\]{2}/.test(u) || u.indexOf('\\') >= 0) return '#';   // 拒絕 //、/\ 等協定相對寫法與任何反斜線
    return /^(https?:\/\/|\.{0,2}\/|[\w\-\/]+\.html)/i.test(u) ? u : '#';
  }

  // 段落簡易語法：[文字](網址) → 開新分頁連結；其餘文字一律跳脫
  function paraHtml(text) {
    var out = '', last = 0, re = /\[([^\]]+)\]\(([^)\s]+)\)/g, m;
    text = String(text || '');
    while ((m = re.exec(text))) {
      out += esc(text.slice(last, m.index));
      var url = safeUrl(m[2]);
      out += '<a href="' + esc(url) + '" target="_blank" rel="noopener">' + esc(m[1]) + '</a>';
      last = m.index + m[0].length;
    }
    return out + esc(text.slice(last));
  }

  function byDateDesc(a, b) {
    var x = String(a.newsDate || ''), y = String(b.newsDate || '');
    return x < y ? 1 : (x > y ? -1 : 0);
  }

  function list() {
    var rows = NEWS_ALWAYS_SHOW ? Store.get('news').slice() : Store.activeNews(w.App.today());
    return rows.sort(byDateDesc);
  }

  function log(summary) {
    if (w.Audit) w.Audit.record({ module: '系統', action: '查閱', summary: summary });
  }

  function itemHtml(n) {
    var h = '<div class="news-item"><div class="news-meta"><span class="tag tag-ok">' + esc(n.category) + '</span><span>' + esc(n.newsDate) + '</span></div>' +
      '<h3 class="news-title">' + esc(n.title) + '</h3>';
    (n.paragraphs || []).forEach(function (p) { h += '<p>' + paraHtml(p) + '</p>'; });
    if (n.moreUrl) h += '<div class="news-more"><button type="button" class="btn btn-primary news-more-btn" data-url="' + esc(safeUrl(n.moreUrl)) + '">查看更多</button></div>';
    return h + '</div>';
  }

  function show() {
    var rows = list();
    if (!rows.length) return;
    var App = w.App;
    var from = rows.map(function (n) { return n.showFrom; }).filter(Boolean).sort()[0] || '不限';
    var to = rows.map(function (n) { return n.showTo; }).filter(Boolean).sort().pop() || '不限';
    var $body = $('<div></div>').html(rows.map(itemHtml).join('') +
      '<p class="news-note">' + App.pocBadge + ' POC 每次登入顯示；正式版依顯示期間 ' + esc(from) + ' ～ ' + esc(to) + ' 決定</p>');
    $body.on('click', '.news-more-btn', function () {
      var u = $(this).attr('data-url');
      if (!u || u === '#') { App.toast('此連結網址不符合允許格式，已略過', 'warning'); return; }
      log('開啟最新消息連結');
      w.open(u, '_blank', 'noopener');
    });
    var skipped = false;
    function skip() { if (skipped) return; skipped = true; log('略過最新消息'); }
    App.dialog({
      title: '最新消息', width: 640, body: $body,
      onClose: skip,
      buttons: [{ text: '略過', cls: 'btn-secondary', onClick: function () { skip(); } }]
    });
    log('顯示最新消息「' + rows[0].title + '」');
  }

  $(document).on('app:ready', function () {
    var s = Store.session._read();
    if (!s || s.newsShownAt === s.loginAt) return;
    if (w.App.qs('news') === '0') return;
    Store.session.patch({ newsShownAt: s.loginAt });
    show();
  });
})(window, jQuery);

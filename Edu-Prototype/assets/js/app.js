/* 共用版型、登入狀態、Dialog／Toast／確認框、工具函式（PLAN §2.2、§2.3、§2.4） */
(function (w, $) {
  'use strict';

  var FOOTER_TEXT = '威煦軟體 Tel：(02)2727-1685　Email：service@wishingsoft.com';

  // Sidebar 選單定義：全站唯一一份（首頁流程圖節點也由此取得連結）
  // V2.0（V2-T01 一次改完，其餘 Task 不再改 MENU）：儀表板第一、基本資料設定最後；子項可帶 roles 限制可見角色
  var MENU = [
    { key: 'dashGroup', title: '儀表板', icon: '📈', items: [
      { key: 'dashboard', title: '儀表板', page: 'dashboard' } ] },
    { key: 'sdsGroup', title: 'SDS 建置管理', icon: '📄', items: [
      { key: 'sds', title: 'SDS 查詢與建置', page: 'sds-list' },
      { key: 'sds-check', title: 'SDS 檢查', page: 'sds-check' } ] },
    { key: 'chemGroup', title: '化學品管理', icon: '🧪', items: [
      { key: 'chem', title: '化學品清單', page: 'chem-list' },
      { key: 'regulated', title: '列管查詢', page: 'regulated' },
      { key: 'priority', title: '優先管理化學品', page: 'priority-chem' },
      { key: 'check', title: '自主檢查', page: 'check' },
      { key: 'map', title: '平面圖管理', page: 'map-list' } ] },
    { key: 'toxGroup', title: '毒化物管理', icon: '☣', items: [
      { key: 'tox-doc', title: '毒化物文件管理', page: 'tox-doc-list' },
      { key: 'gov-tox', title: '毒化物清單查詢', page: 'gov-tox-list' } ] },
    { key: 'reportGroup', title: '申報管理', icon: '📊', items: [
      { key: 'report-tox', title: '毒化物申報', page: 'report-tox' },
      { key: 'report-moe', title: '教育部批次申報匯出', page: 'report-moe' } ] },
    { key: 'emgGroup', title: '緊急應變專區', icon: '🚨', items: [
      { key: 'emergency', title: '緊急應變專區', page: 'emergency' } ] },
    { key: 'basic', title: '基本資料設定', icon: '⚙', items: [
      { key: 'org', title: '組織與人員管理', page: 'org' },
      { key: 'syslog', title: '系統日誌', page: 'syslog', roles: ['系統管理者'] } ] }
  ];

  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  // 專案根目錄相對前綴：位於 pages/ 下為 '../'，其餘為 ''
  function rootPrefix() {
    return /\/pages\/[^\/]*$/.test(w.location.pathname.replace(/\\/g, '/')) ? '../' : '';
  }

  var App = {
    menu: MENU,
    footerText: FOOTER_TEXT,
    user: null,
    school: null,
    pocBadge: '<span class="poc-badge">POC 模擬</span>',

    /* ---------- 工具函式 ---------- */
    root: rootPrefix,

    fmtDate: function (d) {
      if (!d) return '';
      var dt = (d instanceof Date) ? d : new Date(d);
      if (isNaN(dt.getTime())) return String(d);
      return dt.getFullYear() + '-' + pad(dt.getMonth() + 1) + '-' + pad(dt.getDate());
    },
    fmtMonth: function (d) { return App.fmtDate(d).slice(0, 7); },
    today: function () { return App.fmtDate(new Date()); },
    esc: function (text) {
      return String(text === undefined || text === null ? '' : text)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    },
    qs: function (name) {
      var m = new RegExp('[?&]' + name + '=([^&#]*)').exec(w.location.search);
      return m ? decodeURIComponent(m[1].replace(/\+/g, ' ')) : null;
    },
    // 產生相對連結：'home'、'index' 或 pages/ 下的頁名（不含 .html）
    pageUrl: function (page, params) {
      var url;
      if (page === 'home' || page === 'index') url = rootPrefix() + page + '.html';
      else url = rootPrefix() + 'pages/' + page + '.html';
      if (params) {
        var parts = [];
        Object.keys(params).forEach(function (k) {
          if (params[k] !== undefined && params[k] !== null) parts.push(encodeURIComponent(k) + '=' + encodeURIComponent(params[k]));
        });
        if (parts.length) url += '?' + parts.join('&');
      }
      return url;
    },
    // 由選單鍵取得頁面網址（Sidebar 與首頁共用）
    menuUrl: function (menuKey, params) {
      var it = App.findMenuItem(menuKey);
      return it ? App.pageUrl(it.item.page, params) : '#';
    },
    findMenuItem: function (menuKey) {
      for (var i = 0; i < MENU.length; i++) {
        for (var j = 0; j < MENU[i].items.length; j++) {
          if (MENU[i].items[j].key === menuKey) return { group: MENU[i], item: MENU[i].items[j] };
        }
      }
      return null;
    },
    // V2-T01：目前頁面所屬的 Sidebar 群組名稱（首頁為「首頁」；查不到為「系統」），供 Audit 預設 module
    currentModule: function () {
      var k = $('body').attr('data-menu') || '';
      if (k === 'home') return '首頁';
      var f = k ? App.findMenuItem(k) : null;
      return f ? f.group.title : '系統';
    },
    canWrite: function () {
      return !!(App.user && App.user.role !== '唯讀使用者');
    },
    // 管理者或系統管理者
    isManager: function () {
      return !!(App.user && (App.user.role === '管理者' || App.user.role === '系統管理者'));
    },
    // V2-T01：系統管理者
    isAdmin: function () {
      return !!(App.user && App.user.role === '系統管理者');
    },
    // V2-T01：頁面層角色檢查；不符時以「不允許的操作」Dialog 說明，關閉後導向 fallbackPage（預設 home），回傳 false
    requireRole: function (roles, fallbackPage) {
      roles = roles || [];
      if (App.user && roles.indexOf(App.user.role) >= 0) return true;
      var went = false;
      function go() { if (went) return; went = true; w.location.href = App.pageUrl(fallbackPage || 'home'); }
      App.dialog({
        title: '不允許的操作', width: 420,
        body: '<p class="confirm-msg">不允許的操作：此功能僅限 ' + App.esc(roles.join('、')) + ' 使用</p>',
        onClose: go,
        buttons: [{ text: '我知道了', cls: 'btn-primary', onClick: go }]
      });
      return false;
    },
    // V2-T01：登入後掛點，App.init 成功後、app:ready 前呼叫；預設空函式（V2-T03 的 news.js 改以 app:ready 監聽，本函式保留為擴充點）
    afterLogin: function () {},
    // 寫入前的保護：唯讀使用者提示並回傳 false
    requireWrite: function () {
      if (App.canWrite()) return true;
      App.toast('唯讀使用者無法執行此操作', 'warning');
      return false;
    },

    /* ---------- Dialog / Confirm / Toast ---------- */
    dialog: function (opts) {
      opts = opts || {};
      var $mask = $('<div class="dialog-mask"></div>');
      var $box = $('<div class="dialog" role="dialog" aria-modal="true"></div>').css('width', opts.width || 520);
      var $head = $('<div class="dialog-head"></div>');
      $head.append($('<span class="dialog-title"></span>').text(opts.title || ''));
      var $x = $('<button type="button" class="dialog-close" aria-label="關閉">&times;</button>');
      $head.append($x);
      var $body = $('<div class="dialog-body"></div>');
      if (opts.body && opts.body.jquery) $body.append(opts.body);
      else $body.html(opts.body || '');
      var $foot = $('<div class="dialog-foot"></div>');
      var api = {
        el: $box,
        body: $body,
        close: function () {
          $(document).off('keydown.dialog' + id);
          $mask.remove();
        }
      };
      var id = 'd' + Math.floor(Math.random() * 1e9);
      (opts.buttons || [{ text: '關閉', cls: 'btn-secondary' }]).forEach(function (b) {
        var $b = $('<button type="button" class="btn"></button>').addClass(b.cls || 'btn-secondary').text(b.text);
        $b.on('click', function () {
          var r = b.onClick ? b.onClick(api, $box) : undefined;
          if (r !== false) api.close();
        });
        $foot.append($b);
      });
      $x.on('click', function () { api.close(); if (opts.onClose) opts.onClose(); });
      $(document).on('keydown.dialog' + id, function (e) {
        if (e.key === 'Escape') { api.close(); if (opts.onClose) opts.onClose(); }
      });
      $box.append($head, $body, $foot);
      $mask.append($box).appendTo('body');
      $box.find('input,select,textarea,button.btn-primary,button.btn-danger').filter(':visible').first().trigger('focus');
      return api;
    },

    confirm: function (message, opts) {
      opts = opts || {};
      return new Promise(function (resolve) {
        var done = false;
        function finish(v) { if (!done) { done = true; resolve(v); } }
        App.dialog({
          title: opts.title || '請確認',
          width: opts.width || 420,
          body: '<p class="confirm-msg">' + App.esc(message).replace(/\n/g, '<br>') + '</p>',
          onClose: function () { finish(false); },
          buttons: [
            { text: opts.cancelText || '取消', cls: 'btn-secondary', onClick: function () { finish(false); } },
            { text: opts.okText || '確定', cls: opts.danger ? 'btn-danger' : 'btn-primary', onClick: function () { finish(true); } }
          ]
        });
      });
    },

    toast: function (message, type) {
      var $wrap = $('#toast-wrap');
      if (!$wrap.length) $wrap = $('<div id="toast-wrap"></div>').appendTo('body');
      var $t = $('<div class="toast"></div>').addClass('toast-' + (type || 'info')).text(message);
      $wrap.append($t);
      setTimeout(function () { $t.fadeOut(300, function () { $t.remove(); }); }, 3000);
    },

    /* ---------- 版型 ---------- */
    logout: function () {
      if (w.Audit) w.Audit.record({ module: '系統', action: '登出', summary: '登出' });
      Store.session.logout();
      w.location.href = App.pageUrl('index');
    },

    // 收合狀態：localStorage 優先；未設定時窄螢幕預設收合
    sidebarCollapsedPref: function () {
      var v = null;
      try { v = localStorage.getItem('moe-chemcloud-sidebar'); } catch (e) { v = null; }
      if (v === 'collapsed') return true;
      if (v === 'expanded') return false;
      return w.matchMedia && w.matchMedia('(max-width: 860px)').matches;
    },
    setSidebarCollapsed: function (c, noSave) {
      $('body').toggleClass('sidebar-collapsed', !!c);
      if (!noSave) { try { localStorage.setItem('moe-chemcloud-sidebar', c ? 'collapsed' : 'expanded'); } catch (e) { /* ignore */ } }
    },

    buildSidebar: function (activeKey) {
      var $nav = $('<nav class="sidebar-nav" aria-label="功能選單"></nav>');
      var role = App.user ? App.user.role : '';
      function visible(it) { return !it.roles || it.roles.indexOf(role) >= 0; }
      MENU.forEach(function (g) {
        var shown = g.items.filter(visible);
        if (!shown.length) return;   // 整組無可見子項時不渲染
        var has = shown.some(function (it) { return it.key === activeKey; });
        var open = activeKey === 'home' || has;
        var $g = $('<div class="side-group"></div>').toggleClass('open', open).toggleClass('has-active', has);
        var $h = $('<button type="button" class="side-group-title"></button>')
          .append($('<span class="side-icon"></span>').text(g.icon))
          .append($('<span class="side-text"></span>').text(g.title))
          .append('<span class="side-caret">▾</span>');
        $h.attr('title', g.title).on('click', function () { if (!$('body').hasClass('sidebar-collapsed')) $g.toggleClass('open'); });
        var $ul = $('<ul class="side-items"></ul>').append($('<li class="side-fly-title"></li>').text(g.title));
        shown.forEach(function (it) {
          var $a = $('<a></a>').attr('href', App.pageUrl(it.page)).text(it.title).toggleClass('active', it.key === activeKey);
          $ul.append($('<li></li>').append($a));
        });
        $g.append($h, $ul);
        $nav.append($g);
      });
      return $nav;
    },

    buildLayout: function () {
      var $body = $('body');
      var menuKey = $body.attr('data-menu') || '';
      var title = $body.attr('data-title') || '';
      var school = App.school, user = App.user;
      var $content = $('#page-content').detach();
      var org = Store.getById('orgs', user.orgId);

      // 頁首
      var $header = $('<header class="app-header"></header>');
      var $toggle = $('<button type="button" class="sidebar-toggle" aria-label="收合或展開選單" title="收合／展開選單">☰</button>').on('click', function () { App.setSidebarCollapsed(!$('body').hasClass('sidebar-collapsed')); });
      var $brand = $('<a class="brand"></a>').attr('href', App.pageUrl('home'));
      $brand.append($('<span class="brand-logo"></span>').text((school.logoText || school.name).slice(0, 4)).css('background', school.logoColor || '#1f6fb2'));
      $brand.append($('<span class="brand-name"></span>').text(school.name));
      $brand.append('<span class="brand-sub">化學雲</span>');
      var $right = $('<div class="header-right"></div>');
      if (App.demoAutoLogin) $right.append('<span class="demo-hint">展示自動登入</span>');
      var $um = $('<div class="user-menu"></div>');
      var $btn = $('<button type="button" class="user-btn" aria-haspopup="true"></button>')
        .append('<span class="user-avatar">👤</span>')
        .append($('<span></span>').text(user.name + '（' + user.role + '）'))
        .append('<span class="side-caret">▾</span>');
      var $drop = $('<div class="user-drop"></div>');
      $drop.append($('<div class="user-info"></div>')
        .append($('<div></div>').text(user.name + '（' + user.account + '）'))
        .append($('<div class="muted"></div>').text('所屬組織：' + (org ? org.name : '—'))));
      var $out = $('<button type="button" class="user-drop-item">登出</button>').on('click', App.logout);
      var $rst = $('<button type="button" class="user-drop-item">重置示範資料 <span class="poc-badge">POC 專用</span></button>').on('click', function () {
        $um.removeClass('open');
        App.confirm('將清除所有已輸入的資料並還原為示範資料，確定要重置嗎？', { okText: '重置', danger: true }).then(function (ok) {
          if (!ok) return;
          Store.reset();
          if (w.Audit) w.Audit.record({ module: '系統', action: '重置', summary: '重置示範資料' });
          App.toast('已還原示範資料', 'success');
          setTimeout(function () { w.location.href = App.pageUrl('home'); }, 400);
        });
      });
      $drop.append($out, $rst);
      $btn.on('click', function (e) { e.stopPropagation(); $um.toggleClass('open'); });
      $(document).on('click', function () { $um.removeClass('open'); });
      $um.append($btn, $drop);
      $right.append($um);
      $header.append($('<div class="header-left"></div>').append($toggle, $brand), $right);

      // 主要區域
      var $main = $('<div class="app-main"></div>');
      var $crumb = $('<nav class="breadcrumb" aria-label="麵包屑"></nav>');
      $crumb.append($('<a></a>').attr('href', App.pageUrl('home')).text('首頁'));
      if (menuKey && menuKey !== 'home') {
        var f = App.findMenuItem(menuKey);
        // 群組只有一個同名子項且頁面標題同名（儀表板、緊急應變專區）時只顯示一層
        var dup = f && f.group.items.length === 1 && f.group.items[0].title === f.group.title && title === f.group.title;
        if (f && !dup) $crumb.append('<span class="sep">/</span>').append($('<span></span>').text(f.group.title));
      } else if (menuKey !== 'home') {
        $crumb.append('<span class="sep">/</span>').append('<span>開發者專用</span>');
      }
      if (menuKey !== 'home') $crumb.append('<span class="sep">/</span>').append($('<span class="current"></span>').text(title));
      var $title = $('<h1 class="page-title"></h1>').text(title);
      $main.append($crumb, $title, $content);

      var $aside = $('<aside class="app-sidebar"></aside>').append(App.buildSidebar(menuKey));
      var $footer = $('<footer class="app-footer"></footer>').text(FOOTER_TEXT);

      var $shell = $('<div class="app-shell"></div>').append($header, $('<div class="app-body"></div>').append($aside, $main), $footer);
      $body.prepend($shell);
      App.setSidebarCollapsed(App.sidebarCollapsedPref(), true);
      $body.addClass('app-ready');
      if (user.role === '唯讀使用者') $body.addClass('role-readonly');
      if (!App.isManager()) $body.addClass('role-not-manager');
      $body.addClass(App.isAdmin() ? 'role-admin' : 'role-not-admin');   // V2-T01：供 CSS .admin-only 隱藏
    },

    init: function () {
      Store.init();
      if (w.Audit) w.Audit.purge();   // V2-T01：刪除超過三年與超過上限的日誌
      var demo = App.qs('demoUser');
      var cur = Store.session.currentUser();
      App.demoAutoLogin = false;
      if (demo && (!cur || cur.account !== demo)) {
        var u = Store.session.loginAs(demo);
        if (u) {
          cur = u; App.demoAutoLogin = true;
          if (w.Audit) w.Audit.record({ module: '系統', action: '登入', summary: '登入成功（展示自動登入，帳號 ' + u.account + '）' });
        }
      } else if (demo && cur && cur.account === demo) {
        App.demoAutoLogin = true;
      }
      if (!cur) {
        w.location.replace(App.pageUrl('index'));
        return false;
      }
      App.user = cur;
      App.school = Store.session.currentSchool();
      App.buildLayout();
      // V2-T01：頁面查閱日誌（body[data-no-view-log] 可略過，syslog 由 T04 自行處理）
      if (w.Audit && !$('body').is('[data-no-view-log]')) {
        w.Audit.record({ module: App.currentModule(), action: '查閱', summary: '開啟「' + ($('body').attr('data-title') || document.title) + '」' });
      }
      return true;
    }
  };

  w.App = App;

  // 下拉選單（共用）：.dropdown 內的 [data-dropdown-toggle] 開關，點外部關閉
  $(document).on("click", "[data-dropdown-toggle]", function (e) {
    e.stopPropagation();
    var $d = $(this).closest(".dropdown");
    $(".dropdown.open").not($d).removeClass("open");
    $d.toggleClass("open");
  });
  $(document).on("click", function () { $(".dropdown.open").removeClass("open"); });

  // 查詢條件區收合（共用）
  $(document).on('click', '.filter-header', function () { $(this).closest('.filter-panel').toggleClass('collapsed'); });

  // 跨頁提示（T06）：導頁前呼叫 App.flash(訊息, 類型)，下一頁載入後顯示一次 toast
  App.flash = function (message, type) {
    try { sessionStorage.setItem('moe-chemcloud-flash', JSON.stringify({ message: message, type: type || 'info' })); } catch (e) { /* ignore */ }
  };
  function showFlash() {
    var raw = null;
    try { raw = sessionStorage.getItem('moe-chemcloud-flash'); sessionStorage.removeItem('moe-chemcloud-flash'); } catch (e) { raw = null; }
    if (!raw) return;
    try { var f = JSON.parse(raw); if (f && f.message) App.toast(f.message, f.type); } catch (e2) { /* ignore */ }
  }

  $(function () {
    if (!$('body').attr('data-page')) return; // 登入頁等不套版型
    if (App.init()) {
      showFlash();
      if (w.Store && Store.upgraded) App.toast('示範資料已更新為 V2.0 並重置為示範狀態', 'info');   // V2-T01、A-35
      App.afterLogin();
      $(document).trigger('app:ready');
    }
  });
})(window, jQuery);

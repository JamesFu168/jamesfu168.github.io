/* 登入頁（UI-01）：模擬登入，展示假設 A-01 */
(function ($) {
  'use strict';
  var REMEMBER_KEY = 'moe-chemcloud-remember';

  Store.init();
  var AUDIT = window.Audit;   // V2-T01：登入成功／失敗日誌（不記密碼）
  if (Store.session.currentUser()) {
    // V2-T01、A-35：已登入時若本次載入因升版而重置資料，先寫入一次性提示（同 App.flash 格式），由 home.html 的 app.js 顯示 toast
    if (Store.upgraded) { try { sessionStorage.setItem('moe-chemcloud-flash', JSON.stringify({ message: '示範資料已更新為 V2.0 並重置為示範狀態', type: 'info' })); } catch (e) { /* ignore */ } }
    window.location.replace('home.html');
    return;
  }

  $(function () {
    // V2-T01、A-35：版本升級後重置示範資料的提示（表單上方小字）
    if (Store.upgraded) $('#login-form').before('<p class="login-upgrade-note">示範資料已更新為 V2.0 並重置為示範狀態</p>');
    try {
      var r = JSON.parse(localStorage.getItem(REMEMBER_KEY) || 'null');
      if (r) { $('#f-code').val(r.code || ''); $('#f-account').val(r.account || ''); $('#f-remember').prop('checked', true); }
    } catch (e) { /* ignore */ }

    $('#pwd-toggle').on('click', function () {
      var $p = $('#f-pwd');
      var show = $p.attr('type') === 'password';
      $p.attr('type', show ? 'text' : 'password');
      $(this).toggleClass('on', show).attr('aria-label', show ? '隱藏密碼' : '顯示密碼');
    });

    $('.demo-table tbody tr').on('click', function () {
      $('#f-code').val('DEMO01');
      $('#f-account').val($(this).data('account'));
      $('#f-pwd').val('1234');
      clearErrors();
    });

    function clearErrors() {
      $('.login-field').removeClass('has-error');
      $('.login-field .form-error').text('');
      $('#login-error').text('');
    }
    function setErr(name, msg) {
      $('.login-field[data-field=' + name + ']').addClass('has-error');
      $('[data-err=' + name + ']').text(msg);
    }

    $('#login-form').on('submit', function (e) {
      e.preventDefault();
      clearErrors();
      var code = $.trim($('#f-code').val()), account = $.trim($('#f-account').val()), pwd = $('#f-pwd').val();
      var ok = true;
      if (!code) { setErr('code', '請輸入學校代號'); ok = false; }
      if (!account) { setErr('account', '請輸入帳號'); ok = false; }
      if (!pwd) { setErr('pwd', '請輸入密碼'); ok = false; }
      if (!ok) return;

      var user = Store.session.login(code, account, pwd);
      if (!user) {
        $('#login-error').text('學校代號、帳號或密碼不正確');
        if (AUDIT) {
          var sc = Store.get('schools').filter(function (s) { return s.code.toLowerCase() === code.toLowerCase(); })[0];
          AUDIT.record({ module: '系統', action: '登入失敗', result: '失敗', schoolId: sc ? sc.id : '', userId: '', account: account, userName: '', role: '', summary: '帳號 ' + account + ' 登入失敗' });
        }
        return;
      }
      if (AUDIT) AUDIT.record({ module: '系統', action: '登入', summary: '登入成功（學校代號 ' + code.toUpperCase() + '）' });

      try {
        if ($('#f-remember').prop('checked')) localStorage.setItem(REMEMBER_KEY, JSON.stringify({ code: code, account: account }));
        else localStorage.removeItem(REMEMBER_KEY);
      } catch (err) { /* ignore */ }
      window.location.href = 'home.html';
    });
  });
})(jQuery);

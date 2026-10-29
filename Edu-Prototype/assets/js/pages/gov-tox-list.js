/* 政府毒化物清單查詢（V2-T05）：只查詢與顯示系統採用的政府正面表列示範摘錄，與學校化學品、SDS 無關。 */
$(document).on('app:ready', function () {
  'use strict';

  // 管制濃度：純數字才補單位 w/w %；文字型（如「氰離子含量 1 % 以上」）原文顯示
  function lvText(v) {
    var s = $.trim(v === undefined || v === null ? '' : String(v));
    if (!s) return '';
    return /^[0-9.]+$/.test(s) ? s + ' w/w %' : s;
  }

  var esc = App.esc;
  var gov = Store.get('govToxList') || { version: '', items: [] };
  var items = (gov.items || []).slice().sort(function (a, b) {
    return String(a.listedNo).localeCompare(String(b.listedNo)) || String(a.seriesNo).localeCompare(String(b.seriesNo));
  });

  $('#gt-notice').html('<span class="poc-badge">示範摘錄</span> 系統採用的政府毒化物正面表列參考清單，版本：' + esc(gov.version) +
    '，共 ' + items.length + ' 筆；為查詢用途，不是學校化學品，且非即時法規查核。');

  function norm(v) { return String(v || '').replace(/\s+/g, '').toLowerCase(); }

  function render() {
    var kw = norm($('#q-keyword').val()), $b = $('#gt-body').empty();
    var list = items.filter(function (it) {
      if (!kw) return true;
      return [norm(it.nameZh), norm(it.nameEn)].concat((it.cas || []).map(norm)).some(function (s) { return s.indexOf(kw) >= 0; });
    });
    if (!list.length) $b.append('<tr class="empty-row"><td colspan="5">查無符合的物質</td></tr>');
    list.forEach(function (it) {
      var $tr = $('<tr></tr>').attr('data-id', it.listedNo + '-' + it.seriesNo);
      $tr.append($('<td class="g-no"></td>').text(it.listedNo + '-' + it.seriesNo));
      $tr.append($('<td class="g-zh"></td>').text(it.nameZh));
      $tr.append($('<td class="g-en"></td>').text(it.nameEn));
      $tr.append($('<td class="g-cas"></td>').html((it.cas || []).map(esc).join('<br>')));
      var $lv = $('<td class="g-lv"></td>').append($('<span></span>').text(lvText(it.controlLevel)));
      if (it.note) $lv.append($('<div class="dim"></div>').text(it.note));
      $tr.append($lv);
      $b.append($tr);
    });
    $('#list-total, #list-count').text('共 ' + list.length + ' 筆');
  }

  function search() {
    var raw = $.trim($('#q-keyword').val());
    render();
    Audit.record({ module: '毒化物管理', action: '查詢', summary: '查詢政府毒化物清單：關鍵字「' + raw + '」' });
  }

  $('#btn-search').on('click', search);
  $('#q-keyword').on('keydown', function (e) { if (e.key === 'Enter') search(); });
  $('#btn-clear').on('click', function () { $('#q-keyword').val(''); render(); });

  render();
});

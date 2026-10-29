/* 列管查詢（UI-25 之二，T14c）：以 SDS 為列，樞紐式列出 GHS 化學品／關注化學物質／毒性化學物質是否符合。
   判定見 PLAN A-26：依示範摘錄清單與 SDS 第二項，非正式法規查核。 */
$(document).on('app:ready', function () {
  'use strict';

  var esc = App.esc, schoolId = App.school.id;
  var tox = Store.get('govToxList') || { version: '' };
  var con = Store.get('govConcernList') || { version: '' };
  var CATS = [['ghs', 'GHS 化學品'], ['concern', '關注化學物質'], ['toxic', '毒性化學物質']];

  $('#reg-notice').html('依示範摘錄清單與 SDS 第二項判定，非正式法規查核。毒性化學物質清單版本：' + esc(tox.version) +
    '；關注化學物質清單版本：' + esc(con.version) + '。');

  function norm(v) { return String(v || '').replace(/\s+/g, '').toLowerCase(); }

  // 每份 SDS 的列資料（判定、化學品數量）
  function rows() {
    var chems = Store.get('chemicals').filter(function (c) { return c.schoolId === schoolId && c.hasSds && c.sdsId; });
    return Store.get('sdsList').filter(function (s) { return s.schoolId === schoolId; })
      .sort(function (a, b) { return String(a.indexCode).localeCompare(String(b.indexCode)); })
      .map(function (s) {
        var comps = ((s.items.s3 || {}).components || []);
        return {
          sds: s, cat: Store.sdsCategories(s), name: Store.sdsDisplayName(s),
          cas: comps.map(function (c) { return $.trim(c.cas); }).filter(Boolean),
          sup: (s.items.s1 || {}).supplierName || '',
          cnt: chems.filter(function (c) { return c.sdsId === s.id; }).length
        };
      });
  }

  function search(all) {
    var kw = norm($('#q-keyword').val()), cat = $('#q-cat').val();
    return all.filter(function (r) {
      if (kw && (norm(r.name) + '\n' + r.cas.map(norm).join('\n')).indexOf(kw) < 0) return false;
      if (cat && !r.cat[cat].hit) return false;
      return true;
    });
  }

  function render() {
    var all = rows(), list = search(all), $b = $('#reg-body').empty();
    if (!list.length) $b.append('<tr class="empty-row"><td colspan="7">查無符合條件的 SDS</td></tr>');
    list.forEach(function (r) {
      var $tr = $('<tr></tr>').attr('data-id', r.sds.id);
      $tr.append($('<td class="r-name"></td>').append($('<a class="btn-text-link"></a>')
        .attr('href', App.pageUrl('sds-form', { mode: 'view', id: r.sds.id })).text(r.name || r.sds.indexCode)));
      $tr.append($('<td class="r-cas"></td>').html(r.cas.map(esc).join('<br>')));
      $tr.append($('<td class="r-sup"></td>').text(r.sup));
      var $cnt = $('<td class="r-cnt"></td>');
      if (r.cnt > 0) $cnt.append($('<a class="btn-text-link cnt-link"></a>').attr('href', App.pageUrl('chem-list', { sdsId: r.sds.id })).attr('title', '查看使用此 SDS 的化學品').text(r.cnt));
      else $cnt.text('0');
      $tr.append($cnt);
      CATS.forEach(function (c) {
        var info = r.cat[c[0]];
        var $td = $('<td class="r-cat"></td>').attr('data-cat', c[0]);
        if (info.hit) $td.append($('<span class="reg-ok"></span>').text('✓').attr('title', info.basis.join('、')));
        $tr.append($td);
      });
      $b.append($tr);
    });
    $('#list-total, #list-count').text('共 ' + list.length + ' 筆');
    var parts = CATS.map(function (c) {
      return c[1] + ' ' + list.filter(function (r) { return r.cat[c[0]].hit; }).length + ' 筆';
    });
    $('#reg-summary').text('符合 SDS 數（目前查詢結果）：' + parts.join('　｜　'));
  }

  function logQuery() {
    Audit.record({ action: '查詢', summary: '查詢列管：' + Audit.cond([['關鍵字', $.trim($('#q-keyword').val())], ['類別', Audit.selText('#q-cat')]]) });   // V2-T04
  }
  $('#btn-search').on('click', function () { render(); logQuery(); });
  $('#q-keyword').on('keydown', function (e) { if (e.key === 'Enter') { render(); logQuery(); } });
  $('#btn-clear').on('click', function () { $('#q-keyword').val(''); $('#q-cat').val(''); render(); });

  render();
});

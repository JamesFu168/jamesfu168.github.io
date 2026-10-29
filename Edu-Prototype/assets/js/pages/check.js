/* 自主檢查（UI-25）。展示假設 A-19：示範檢查規則，結果供確認情境，非法規判定。
   SDS 十六大項檢查在「SDS 檢查」頁（T14e 起不在本頁）；數量與未回報一律用 Store.getDailyBalance／getMonthSummary。 */
$(document).on('app:ready', function () {
  'use strict';

  var esc = App.esc, schoolId = App.school.id;
  var CATS = ['SDS 效期', '數量上限', '數量下限', '未回報'];
  var CAT_CLS = { 'SDS 效期': 'tag-warn', '數量上限': 'tag-danger', '數量下限': 'tag-info', '未回報': 'tag-warn' };
  var UNREPORTED_DAYS = 3;
  var rows = [], checkedAt = '';
  var applied = { cat: '', orgId: '', sub: true, keyword: '' };

  function stamp() {
    var d = new Date();
    function p(n) { return n < 10 ? '0' + n : '' + n; }
    return App.fmtDate(d) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
  }
  function sdsList() { return Store.get('sdsList').filter(function (s) { return s.schoolId === schoolId; }); }
  function chems() { return Store.get('chemicals').filter(function (c) { return c.schoolId === schoolId; }); }
  function chemName(c) { return c.nameZh && c.nameEn ? c.nameZh + ' (' + c.nameEn + ')' : (c.nameZh || c.nameEn || ''); }
  function posName(id) { var p = id ? Store.getById('positions', id) : null; return p ? p.name : ''; }
  function num(v) { var n = parseFloat(v); return isNaN(n) ? null : n; }
  // 使用該 SDS 的化學品組織 id 清單
  function sdsOrgs(sdsId) {
    return chems().filter(function (c) { return c.hasSds && c.sdsId === sdsId; }).map(function (c) { return c.orgId; });
  }

  function compute() {
    var out = [], now = stamp(), today = Store.today(), month = today.slice(0, 7);
    var list = sdsList(), mode = App.canWrite() ? 'edit' : 'view';
    // SDS 效期（issueDate 為依據）
    list.forEach(function (s) {
      if (Store.sdsExpiry(s, today).state !== 'expired') return;   // V2-T01：效期判定統一由 Store.sdsExpiry 提供
      out.push({ cat: 'SDS 效期', item: Store.sdsDisplayName(s) || '（未命名）', sub: s.indexCode, orgs: sdsOrgs(s.id),
        src: 'SDS ' + s.indexCode + '（製表日期 ' + s.issueDate + '）', reason: '製表日期已超過 3 年（示範規則）', time: now,
        url: App.pageUrl('sds-form', { mode: mode, id: s.id }), link: 'SDS 表單' });
    });
    // 3～5 化學品
    chems().forEach(function (c) {
      var name = chemName(c), src = posName(c.storePositionId) || posName(c.usePositionId) || '—';
      var url = App.pageUrl('chem-daily', { id: c.id, month: month }), unit = c.unit || '';
      var bal = Store.getDailyBalance(c.id, today), max = num(c.maxStore);
      if (bal !== null) {
        if (max !== null && bal > max) out.push({ cat: '數量上限', item: name, id: c.id, orgs: [c.orgId], src: src,
          reason: '本月截至今日結餘 ' + bal + unit + ' 大於最大儲存量 ' + max + unit, time: now, url: url, link: '每日用量' });
        if (bal < 0) out.push({ cat: '數量下限', item: name, id: c.id, orgs: [c.orgId], src: src,
          reason: '本月截至今日結餘 ' + bal + unit + ' 小於 0', time: now, url: url, link: '每日用量' });
      }
      var sum = Store.getMonthSummary(c.id, month);
      if (sum.unreported >= UNREPORTED_DAYS) out.push({ cat: '未回報', item: name, id: c.id, orgs: [c.orgId], src: src,
        reason: '本月有 ' + sum.unreported + ' 天未回報（展示假設：≥ ' + UNREPORTED_DAYS + ' 天）', time: now, url: url, link: '每日用量' });
    });
    return out;
  }

  function renderSummary() {
    var m = {}, h = '';
    CATS.forEach(function (c) { m[c] = 0; });
    rows.forEach(function (r) { m[r.cat]++; });
    CATS.forEach(function (c) {
      h += '<button type="button" class="sum-item" data-cat="' + esc(c) + '"><div class="sum-label">' + esc(c) + '</div><div class="sum-value' + (m[c] ? ' is-abn' : '') + '">' + m[c] + '</div></button>';
    });
    $('#chk-summary').html(h);
    $('#chk-time').text(checkedAt);
  }

  function orgOptions() {
    var all = Store.get('orgs').filter(function (o) { return o.schoolId === schoolId; });
    var html = '<option value="">全部</option>';
    (function walk(pid, depth) {
      all.filter(function (o) { return (o.parentId || null) === pid; })
        .sort(function (a, b) { return (a.sort || 0) - (b.sort || 0); })
        .forEach(function (o) {
          html += '<option value="' + o.id + '">' + new Array(depth + 1).join('　') + esc(o.name) + '</option>';
          walk(o.id, depth + 1);
        });
    })(null, 0);
    return html;
  }
  $('#q-cat').html('<option value="">全部</option>' + CATS.map(function (c) { return '<option>' + esc(c) + '</option>'; }).join(''));
  $('#q-org').html(orgOptions());

  function orgText(r) {
    var seen = {}, names = [];
    (r.orgs || []).forEach(function (id) { if (!seen[id]) { seen[id] = 1; names.push(Store.orgPath(id)); } });
    return names.length ? names.join('、') : '—';
  }
  function render() {
    var scope = applied.orgId ? (applied.sub ? Store.orgDescendants(applied.orgId) : [applied.orgId]) : null;
    var kw = applied.keyword.toLowerCase();
    var list = rows.filter(function (r) {
      if (applied.cat && r.cat !== applied.cat) return false;
      if (scope && !(r.orgs || []).some(function (id) { return scope.indexOf(id) >= 0; })) return false;
      if (kw && [r.item, r.sub, r.id, r.src, r.reason, orgText(r), r.cat].join('\n').toLowerCase().indexOf(kw) < 0) return false;
      return true;
    });
    var $b = $('#chk-body').empty();
    if (!list.length) $b.append('<tr class="empty-row"><td colspan="7">查無符合條件的檢查結果</td></tr>');
    list.forEach(function (r) {
      var $tr = $('<tr></tr>').attr('data-cat', r.cat);
      $tr.append($('<td class="c-cat"></td>').append($('<span class="tag"></span>').addClass(CAT_CLS[r.cat]).text(r.cat)));
      var $it = $('<td class="c-item"></td>').text(r.item);
      if (r.id) $it.append($('<div class="dim"></div>').text(r.id)); else if (r.sub) $it.append($('<div class="dim"></div>').text(r.sub));
      $tr.append($it);
      $tr.append($('<td class="c-org"></td>').text(orgText(r)));
      $tr.append($('<td class="c-src"></td>').text(r.src));
      $tr.append($('<td class="c-reason"></td>').text(r.reason));
      $tr.append($('<td class="c-time"></td>').text(r.time));
      $tr.append($('<td class="c-link"></td>').append($('<a class="btn-text-link"></a>').attr('href', r.url).text(r.link)));
      $b.append($tr);
    });
    $('#list-total, #list-count').text('共 ' + list.length + ' 筆');
  }

  function readForm() {
    return { cat: $('#q-cat').val(), orgId: $('#q-org').val(), sub: $('#q-sub').prop('checked'), keyword: $.trim($('#q-keyword').val()) };
  }
  function run(isRecheck) {
    rows = compute();
    checkedAt = stamp();
    renderSummary();
    render();
    if (isRecheck) App.toast('已重新檢查，共 ' + rows.length + ' 筆待確認項目', 'success');
  }

  $('#btn-search').on('click', function () {
    applied = readForm(); render();
    Audit.record({ action: '查詢', summary: '查詢自主檢查：' + Audit.cond([['類別', Audit.selText('#q-cat')], ['組織部門', Audit.selText('#q-org')], ['關鍵字', applied.keyword]]) });   // V2-T04
  });
  $('#q-keyword').on('keydown', function (e) { if (e.key === 'Enter') $('#btn-search').trigger('click'); });
  $('#btn-clear').on('click', function () {
    $('#q-cat, #q-org').val(''); $('#q-keyword').val(''); $('#q-sub').prop('checked', true);
    applied = readForm(); render();
  });
  $('#chk-summary').on('click', '.sum-item', function () {
    $('#q-cat').val($(this).attr('data-cat'));
    applied = readForm(); render();
  });
  $('#btn-recheck').on('click', function () {
    run(true);
    Audit.record({ action: '查詢', summary: '重新檢查自主檢查（共 ' + rows.length + ' 筆待確認項目）' });   // V2-T04
  });

  $('#lnk-sds-check').attr('href', App.menuUrl('sds-check'));
  run(false);
});

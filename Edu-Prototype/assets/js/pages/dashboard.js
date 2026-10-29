/* 儀表板統計頁（V2-T02）。展示假設 A-28：統計口徑見 docs/plan/v2/PLAN.md §4；每次進入頁面時重算。 */
$(document).on('app:ready', function () {
  'use strict';

  var schoolId = App.school.id;
  var today = App.today();
  var GROUPS = [
    { label: '0%', color: '#9aa5b1', test: function (p) { return p === 0; } },
    { label: '1～25%', color: '#c8453b', test: function (p) { return p > 0 && p <= 25; } },
    { label: '26～50%', color: '#e0a030', test: function (p) { return p > 25 && p <= 50; } },
    { label: '51～75%', color: '#a67c00', test: function (p) { return p > 50 && p <= 75; } },
    { label: '76～99%', color: '#2f6fa8', test: function (p) { return p > 75 && p < 100; } },
    { label: '100%', color: '#2e9e5b', test: function (p) { return p >= 100; } }
  ];

  function render() {
    var sdsAll = Store.get('sdsList').filter(function (s) { return s.schoolId === schoolId; });
    var chems = Store.get('chemicals').filter(function (c) { return c.schoolId === schoolId; });
    var exp = { expired: [], soon: [], unknown: [] };
    sdsAll.forEach(function (s) {
      var e = Store.sdsExpiry(s, today);
      if (exp[e.state]) exp[e.state].push({ sds: s, due: e.dueDate, state: e.state });
    });
    renderHead();
    renderSds(sdsAll, exp);
    renderChem(chems);
    renderDonut(sdsAll);
    renderOrg(chems);
    bindDetail(exp);
  }

  function renderHead() {
    $('#dash-head').html('<span>統計範圍：' + App.esc(App.school.name) + ' 全校（目前角色可見範圍）</span><span class="muted">｜</span>' +
      '<span>資料更新：進入頁面時重算</span><span class="muted">｜</span>' +
      '<span class="poc-badge" title="展示假設 A-28">示範統計口徑</span>');
  }

  function row(label, valueHtml, cls) {
    return '<tr' + (cls ? ' class="' + cls + '"' : '') + '><td>' + label + '</td><td class="v">' + valueHtml + '<span class="dash-unit">筆</span></td></tr>';
  }
  function link(n, url) { return '<a href="' + App.esc(url) + '">' + n + '</a>'; }
  function detailBtn(n, key) { return n > 0 ? '<button type="button" class="dash-link" data-detail="' + key + '">' + n + '</button>' : '0'; }

  function renderSds(sdsAll, exp) {
    var valid = sdsAll.filter(function (s) { return s.status === '有效'; }).length;
    var noPdf = sdsAll.filter(function (s) { return !Store.sdsPdfInfo(s).hasPdf; }).length;
    var h = '<h2 class="dash-title">SDS 統計</h2><table class="dash-stat"><tbody>';
    h += row('SDS 總筆數', link(sdsAll.length, App.pageUrl('sds-list')));
    h += row('有效筆數', link(valid, App.pageUrl('sds-list', { status: '有效' })));
    h += row('無 SDS 檔案', link(noPdf, App.pageUrl('sds-list', { pdf: 'no' })));
    h += row('已到期', detailBtn(exp.expired.length, 'expired'), exp.expired.length ? 'warn' : '');
    h += row('即將到期（90 天內）', detailBtn(exp.soon.length, 'soon'));
    if (exp.unknown.length) h += row('無法判定（缺製表日期）', detailBtn(exp.unknown.length, 'unknown'));
    h += '</tbody></table><p class="dash-note">到期＝製表日期滿 3 年（示範規則，同 A-19）；不代表已有到期通知寄送</p>';
    $('#card-sds').html(h);
  }

  function renderChem(chems) {
    var withSds = chems.filter(function (c) { return c.hasSds && c.sdsId && Store.getById('sdsList', c.sdsId); }).length;   // V2-T09：SDS 須仍存在
    var tox = chems.filter(function (c) { return Store.chemIsTox(c); }).length;
    var h = '<h2 class="dash-title">化學品統計</h2><table class="dash-stat"><tbody>';
    h += row('化學品總筆數', link(chems.length, App.pageUrl('chem-list')));
    h += row('有 SDS 筆數', String(withSds));
    h += row('無 SDS 筆數', String(chems.length - withSds));
    h += row('毒化物筆數', String(tox));
    h += '</tbody></table>';
    $('#card-chem').html(h);
  }

  function renderDonut(sdsAll) {
    var h = '<h2 class="dash-title">SDS 完成度分布</h2>';
    if (!sdsAll.length) {
      $('#card-donut').html(h + '<div class="dash-empty">尚無 SDS 資料</div>');
      return;
    }
    var counts = GROUPS.map(function () { return 0; }), sum = 0;
    sdsAll.forEach(function (s) {
      var p = Store.sdsFilledSections(s).length / 16 * 100;
      sum += p;
      for (var i = 0; i < GROUPS.length; i++) if (GROUPS[i].test(p)) { counts[i]++; break; }
    });
    var total = sdsAll.length, avg = Math.round(sum / total);
    var R = 80, C = 2 * Math.PI * R, off = 0;
    var svg = '<svg viewBox="0 0 220 220" role="img" aria-label="SDS 完成度分布環圈圖，整體完成率 ' + avg + '%">' +
      '<circle cx="110" cy="110" r="' + R + '" fill="none" stroke="#eef2f6" stroke-width="28"></circle>';
    GROUPS.forEach(function (g, i) {
      if (!counts[i]) return;
      var len = counts[i] / total * C;
      svg += '<circle class="donut-seg" cx="110" cy="110" r="' + R + '" fill="none" stroke="' + g.color + '" stroke-width="28" ' +
        'stroke-dasharray="' + len.toFixed(2) + ' ' + (C - len).toFixed(2) + '" stroke-dashoffset="' + (-off).toFixed(2) + '" ' +
        'transform="rotate(-90 110 110)"><title>' + g.label + '：' + counts[i] + ' 筆</title></circle>';
      off += len;
    });
    svg += '<text x="110" y="100" text-anchor="middle" class="donut-center-lbl">整體完成率</text>' +
      '<text x="110" y="132" text-anchor="middle" class="donut-center-val">' + avg + '%</text></svg>';
    var lg = '<table class="donut-legend"><thead><tr><th>完成度</th><th>筆數</th><th>佔比</th></tr></thead><tbody>';
    GROUPS.forEach(function (g, i) {
      lg += '<tr><td><span class="sw" style="background:' + g.color + '"></span>' + g.label + '</td><td>' + counts[i] + '</td><td>' + Math.round(counts[i] / total * 100) + '%</td></tr>';
    });
    lg += '</tbody></table>';
    $('#card-donut').html(h + '<div class="donut-wrap">' + svg + lg + '</div><p class="dash-note">完成度為十六大項是否已填寫，不等於 SDS 檢查通過</p>');
  }

  function renderOrg(chems) {
    var orgs = Store.get('orgs').filter(function (o) { return o.schoolId === schoolId; });
    var direct = {};
    chems.forEach(function (c) { direct[c.orgId] = (direct[c.orgId] || 0) + 1; });
    var h = '<h2 class="dash-title">組織化學品筆數</h2>' +
      '<p class="dash-note" style="margin:0 0 8px">含下層＝該組織及其所有下層組織的化學品筆數，各列不可相加</p>' +
      '<table class="org-table"><thead><tr><th>組織</th><th class="n">直屬筆數</th><th class="n">含下層筆數</th></tr></thead><tbody>';
    (function walk(pid) {
      orgs.filter(function (o) { return (o.parentId || null) === pid; })
        .sort(function (a, b) { return (a.sort || 0) - (b.sort || 0); })
        .forEach(function (o) {
          var d = direct[o.id] || 0;
          var scope = Store.orgDescendants(o.id);
          var sub = chems.filter(function (c) { return scope.indexOf(c.orgId) >= 0; }).length;
          h += '<tr' + (!d && !sub ? ' class="zero"' : '') + '><td>' + App.esc(Store.orgPath(o.id)) + '</td>' +
            '<td class="n">' + (d ? link(d, App.pageUrl('chem-list', { orgId: o.id, sub: 0 })) : '0') + '</td>' +
            '<td class="n">' + (sub ? link(sub, App.pageUrl('chem-list', { orgId: o.id, sub: 1 })) : '0') + '</td></tr>';
          walk(o.id);
        });
    })(null);
    h += '</tbody></table>';
    $('#card-org').html(h);
  }

  var DETAIL = { expired: '已到期 SDS', soon: '即將到期 SDS', unknown: '無法判定 SDS' };
  var DETAIL_TITLE = { expired: '已到期 SDS', soon: '即將到期 SDS（90 天內）', unknown: '無法判定 SDS（缺製表日期）' };
  var STATE_TXT = { expired: '已到期', soon: '即將到期', unknown: '無法判定' };
  function bindDetail(exp) {
    $('#page-content').off('click.dash').on('click.dash', '[data-detail]', function () {
      var key = $(this).attr('data-detail'), list = exp[key] || [];
      Audit.record({ module: '儀表板', action: '查閱', summary: '儀表板明細：' + DETAIL[key] });
      var b = '<div class="dash-dlg-scroll table-wrap"><table class="table"><thead><tr><th>SDS 索引碼</th><th>名稱</th><th>製表日期</th><th>到期日</th><th>狀態</th></tr></thead><tbody>';
      list.forEach(function (x) {
        b += '<tr><td>' + App.esc(x.sds.indexCode) + '</td><td><a href="' + App.esc(App.pageUrl('sds-form', { mode: 'view', id: x.sds.id })) + '">' + App.esc(Store.sdsDisplayName(x.sds)) + '</a></td>' +
          '<td>' + App.esc(x.sds.issueDate || '—') + '</td><td>' + App.esc(x.due || '—') + '</td><td>' + STATE_TXT[x.state] + '</td></tr>';
      });
      b += '</tbody></table></div>';
      App.dialog({ title: DETAIL_TITLE[key] + '（' + list.length + ' 筆）', width: 760, body: b, buttons: [{ text: '關閉', cls: 'btn-primary' }] });
    });
  }

  render();
});

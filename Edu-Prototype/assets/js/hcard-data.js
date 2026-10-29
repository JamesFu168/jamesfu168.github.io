/* H-Card 資料彙整（T11）：HCard.collect(floorplanId, format) 純函式，不碰 DOM。
   規則（展示假設 A-16）：平面圖區塊關聯位置 → 使用地點或儲存地點等於該位置的化學品，每筆化學品一列不合併。 */
(function (w) {
  'use strict';

  var HAZ_A = ['毒性', '禁水性', '爆炸性', '可燃性', '高壓氣體', '放射性', '其他'];
  var HAZ_B = ['可燃性', '氧化性', '爆炸性', '加壓氣體', '腐蝕性', '急毒性', '健康危害', '禁水性', '放射性', '其他'];
  var PENDING = '—（待指定來源）';
  var NO_SDS = '未提供 SDS';
  var OTHER_PENDING = '其他／資料待補';

  function str(v) { return v === undefined || v === null ? '' : String(v).replace(/^\s+|\s+$/g, ''); }
  function now() {
    var d = new Date(), p = function (n) { return n < 10 ? '0' + n : '' + n; };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
  }
  function posName(id) { var p = id ? Store.getById('positions', id) : null; return p ? p.name : ''; }
  function qty(v, unit) { return (v === undefined || v === null || v === '') ? '—' : v + ' ' + (unit || ''); }

  // 位置的化學品：瀏覽器用 MapRender.chemicalsAt（同學校、A-16），Node 無 MapRender 時用相同規則
  function chemsAt(positionId, schoolId) {
    if (w.MapRender && w.App && w.App.school) return w.MapRender.chemicalsAt(positionId);
    return Store.get('chemicals').filter(function (c) {
      return c.schoolId === schoolId && (c.usePositionId === positionId || c.storePositionId === positionId);
    }).sort(function (a, b) { return String(a.id).localeCompare(String(b.id)); });
  }

  function hazardFlags(format, pics, s2text, isTox) {
    function has(code) { return pics.indexOf(code) >= 0; }
    var water = /禁水/.test(s2text);
    var f = {};
    if (format === 'B') {
      f['可燃性'] = has('GHS02'); f['氧化性'] = has('GHS03'); f['爆炸性'] = has('GHS01'); f['加壓氣體'] = has('GHS04');
      f['腐蝕性'] = has('GHS05'); f['急毒性'] = has('GHS06') || isTox; f['健康危害'] = has('GHS08'); f['禁水性'] = water;
    } else {
      f['毒性'] = isTox; f['禁水性'] = water; f['爆炸性'] = has('GHS01'); f['可燃性'] = has('GHS02'); f['高壓氣體'] = has('GHS04');
    }
    f['放射性'] = false;
    var any = false;
    Object.keys(f).forEach(function (k) { if (k !== '放射性' && f[k]) any = true; });
    f['其他'] = !any && pics.length > 0;
    return f;
  }

  function collect(floorplanId, format) {
    format = format === 'B' ? 'B' : 'A';
    var hazards = format === 'B' ? HAZ_B : HAZ_A;
    var fp = Store.getById('floorplans', floorplanId);
    var out = {
      meta: { format: format, formatName: '格式 ' + format, hazardNames: hazards.slice(), floorplanId: floorplanId, generatedAt: now() },
      sourceIssues: [], rows: [], sections: [], totals: { distinctChemicals: 0, rows: 0, hazardCounts: {} }
    };
    if (!fp) { out.meta.notFound = true; return out; }
    var school = Store.getById('schools', fp.schoolId);
    out.meta.name = fp.name;
    out.meta.schoolName = school ? school.name : '';
    out.meta.orgId = fp.orgId;
    out.meta.orgName = fp.orgId ? Store.orgPath(fp.orgId) : '';
    out.meta.hasBlocks = (fp.blocks || []).some(function (b) { return !!b.positionId; });

    var linkedPos = [], seenPos = {};
    (fp.blocks || []).forEach(function (b) {
      if (!b.positionId) {
        out.sourceIssues.push({ type: '未關聯位置', text: '區塊「' + (b.label || b.id) + '」尚未關聯位置，其化學品無法列入 H-Card。' });
        return;
      }
      if (!seenPos[b.positionId]) { seenPos[b.positionId] = 1; linkedPos.push(b.positionId); }
    });
    out.meta.positionIds = linkedPos;

    var rowById = {}, order = [];
    linkedPos.forEach(function (pid) {
      var list = chemsAt(pid, fp.schoolId);
      if (!list.length) out.sourceIssues.push({ type: '位置無化學品', text: '位置「' + (posName(pid) || pid) + '」沒有任何使用或儲存的化學品。' });
      list.forEach(function (c) {
        if (rowById[c.id]) { rowById[c.id].mapPositionIds.push(pid); return; }
        var sds = c.hasSds && c.sdsId ? Store.getById('sdsList', c.sdsId) : null;
        var it = sds && sds.items ? sds.items : null;
        var s2 = (it && it.s2) || {}, s5 = (it && it.s5) || {}, s9 = (it && it.s9) || {}, s14 = (it && it.s14) || {};
        var pics = (s2.pictograms || []).slice();
        var s2text = [].concat(s2.physicalHazards || [], s2.healthHazards || [], s2.envHazards || []).join('|');
        var row = {
          chemId: c.id, sdsId: sds ? sds.id : '', hasSds: !!sds, mapPositionIds: [pid],
          orgId: c.orgId, orgName: c.orgId ? Store.orgPath(c.orgId) : '',
          nameZh: c.nameZh || (it && it.s1 && it.s1.nameZh) || '', nameEn: c.nameEn || '',
          usePositionId: c.usePositionId, storePositionId: c.storePositionId,
          useName: posName(c.usePositionId), storeName: posName(c.storePositionId),
          maxStore: qty(c.maxStore, c.unit), maxUse: qty(c.maxUse, c.unit), unit: c.unit,
          physical: sds ? (str(s9.appearance) || '—（SDS 未填）') : NO_SDS,
          extinguishers: sds ? (str(s5.extinguishers) || '—（SDS 未填）') : NO_SDS,
          packaging: PENDING, rescue: PENDING,
          unNo: sds ? (str(s14.unNo) || '—（SDS 未填）') : NO_SDS,
          pictograms: pics, hits: [], cells: []
        };
        if (sds) {
          var flags = hazardFlags(format, pics, s2text, Store.chemIsTox(c));
          hazards.forEach(function (h) {
            row.cells.push(h === '放射性' ? '—' : (flags[h] ? '✓' : ''));
            if (flags[h]) row.hits.push(h);
          });
        } else {
          hazards.forEach(function () { row.cells.push(NO_SDS); });
        }
        row.subKey = sds ? sds.id : 'name:' + row.nameZh;
        rowById[c.id] = row; order.push(row);
      });
    });
    out.rows = order;

    // 來源問題：無 SDS、缺 s9／s5／s14（同一 SDS 只列一次）
    var sdsMissing = {}, noSds = [];
    order.forEach(function (r) {
      if (!r.hasSds) { noSds.push(r); return; }
      var it = Store.getById('sdsList', r.sdsId).items || {};
      var miss = [];
      if (!str((it.s9 || {}).appearance)) miss.push('第九項物理狀態');
      if (!str((it.s5 || {}).extinguishers)) miss.push('第五項適用滅火劑');
      if (!str((it.s14 || {}).unNo)) miss.push('第十四項 UN No.');
      if (miss.length) {
        var m = sdsMissing[r.sdsId] || (sdsMissing[r.sdsId] = { miss: miss, names: [] });
        if (m.names.indexOf(r.nameZh) < 0) m.names.push(r.nameZh);
      }
    });
    noSds.forEach(function (r) {
      out.sourceIssues.push({ type: '無 SDS', text: '化學品「' + r.nameZh + '」（' + r.orgName + '）未關聯 SDS，危害欄顯示「' + NO_SDS + '」並列入「' + OTHER_PENDING + '」。' });
    });
    Object.keys(sdsMissing).forEach(function (sid) {
      var m = sdsMissing[sid];
      out.sourceIssues.push({ type: 'SDS 欄位缺漏', text: 'SDS「' + m.names.join('、') + '」（' + sid + '）缺少' + m.miss.join('、') + '，對應欄位顯示「—（SDS 未填）」。' });
    });

    // 分段：依危害特性（放射性無資料來源不分段），同品項可在多段重複
    hazards.forEach(function (h) {
      if (h === '放射性') return;
      out.sections.push({ hazardName: h, rows: order.filter(function (r) { return r.hits.indexOf(h) >= 0; }) });
    });
    var pending = order.filter(function (r) { return !r.hasSds; });
    if (pending.length) out.sections.push({ hazardName: OTHER_PENDING, rows: pending });

    var distinct = {};
    order.forEach(function (r) { distinct[r.subKey] = 1; });
    out.totals.rows = order.length;
    out.totals.distinctChemicals = Object.keys(distinct).length;
    hazards.forEach(function (h) {
      var d = {}, n = 0;
      order.forEach(function (r) { if (r.hits.indexOf(h) >= 0) { d[r.subKey] = 1; n++; } });
      out.totals.hazardCounts[h] = { distinct: Object.keys(d).length, rows: n };
    });
    return out;
  }

  w.HCard = { collect: collect, HAZ_A: HAZ_A, HAZ_B: HAZ_B, PENDING: PENDING, NO_SDS: NO_SDS, OTHER_PENDING: OTHER_PENDING };
})(typeof window !== 'undefined' ? window : globalThis);

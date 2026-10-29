/* 優先管理化學品判定規則（V2-T06，展示假設 A-32）。純函式、不依賴 DOM／jQuery，Node／瀏覽器皆可載入。
   Store.matchPriority／Store.sdsPriorityClauses 呼叫本模組；V2-T07 共用 SUBCATS。 */
(function (root) {
  'use strict';

  var SUBCATS = [['c1', '第二條第一款'], ['c2cmr', '第二條第二款 CMR 第一級'], ['c2non', '第二條第二款 非 CMR 第一級'], ['c3', '第二條第三款']];

  function str(v) { return (v === undefined || v === null) ? '' : String(v).trim(); }

  /* 濃度文字 → 數值；純數字直接用，區間（~、-、～）取上限，空白或無法解析為 null */
  function parsePercent(text) {
    var t = str(text).replace(/%/g, '').replace(/\s+/g, '');
    if (!t) return null;
    if (/^\d+(\.\d+)?$/.test(t)) return parseFloat(t);
    var m = /^(\d+(?:\.\d+)?)[~～〜\-–—](\d+(?:\.\d+)?)$/.exec(t);
    if (m) return Math.max(parseFloat(m[1]), parseFloat(m[2]));
    return null;
  }

  /* 成分濃度：純物質視為 100；否則取成分 percent */
  function percentValue(substanceType, comp) {
    if (substanceType === '純物質') return 100;
    return parsePercent(comp && comp.percent);
  }

  /* 濃度門檻：第一款 >1、第二款 >=1、第三款不看濃度；未知回 null */
  function thresholdOk(clause, v) {
    if (Number(clause) === 3) return true;
    if (v === null || v === undefined) return null;
    return Number(clause) === 1 ? v > 1 : v >= 1;
  }

  /* 成分陣列 × 清單項目 → 命中陣列（規則同 A-07：CAS 精確、中文精確、英文不分大小寫，皆 trim） */
  function match(components, items, substanceType) {
    var result = [];
    (components || []).forEach(function (c, idx) {
      var zh = str(c && c.nameZh), en = str(c && c.nameEn).toLowerCase(), cas = str(c && c.cas);
      if (!zh && !en && !cas) return;
      (items || []).forEach(function (it, ii) {
        var by = null, val = '';
        if (zh && str(it.nameZh) === zh) { by = 'nameZh'; val = zh; }
        else if (en && str(it.nameEn).toLowerCase() === en) { by = 'nameEn'; val = str(c.nameEn); }
        else if (cas && (it.cas || []).some(function (x) { return str(x) === cas; })) { by = 'cas'; val = cas; }
        if (!by) return;
        var pv = percentValue(substanceType, c);
        result.push({
          componentIndex: idx, itemIndex: ii, clause: Number(it.clause), cmr: it.cmr === true,
          matchedBy: by, matchedValue: val,
          percentText: substanceType === '純物質' ? '100' : str(c.percent), percentValue: pv,
          thresholdOk: thresholdOk(it.clause, pv)
        });
      });
    });
    return result;
  }

  function basisText(comp, m) {
    var name = str(comp.nameZh) || str(comp.nameEn);
    var cas = str(comp.cas);
    var pct = m.percentValue === null ? '' : ' ' + (m.percentText || m.percentValue) + '%';
    return name + (cas ? '（' + cas + '）' : '') + pct;
  }

  /* 命中 → 子分類 {c1,c2cmr,c2non,c3:{hit,unknown,basis[]}}；ghsHit 為 SDS 整體是否具 GHS 危害（第三款用） */
  function clauses(matches, components, ghsHit) {
    var out = {};
    SUBCATS.forEach(function (s) { out[s[0]] = { hit: false, unknown: false, basis: [] }; });
    (matches || []).forEach(function (m) {
      var key = m.clause === 1 ? 'c1' : m.clause === 2 ? (m.cmr ? 'c2cmr' : 'c2non') : 'c3';
      var o = out[key], comp = (components || [])[m.componentIndex] || {};
      if (key === 'c3') {
        if (!ghsHit) return;
        o.hit = true;
      } else if (m.thresholdOk === true) {
        o.hit = true;
      } else if (m.thresholdOk === null) {
        o.unknown = true;
      } else {
        return;
      }
      var b = basisText(comp, m);
      if (o.basis.indexOf(b) < 0) o.basis.push(b);
    });
    return out;
  }

  var api = { SUBCATS: SUBCATS, parsePercent: parsePercent, percentValue: percentValue, thresholdOk: thresholdOk, match: match, clauses: clauses };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.PriorityRules = api;
})(typeof window !== 'undefined' ? window : globalThis);

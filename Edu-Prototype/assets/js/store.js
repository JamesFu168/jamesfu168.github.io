/* 資料層：示範資料 seed + localStorage 持久化 + 共用運算（PLAN §2.5） */
(function (w) {
  'use strict';

  var KEY = 'moe-chemcloud-poc';
  var SESSION_KEY = 'moe-chemcloud-session';
  var BASE_VERSION = '2.0.0';   // 資料層結構版本；示範資料版本由各 seed 檔的標籤組成（見 registerSeed）

  // 集合名稱與 id 前綴對照（供 Store.nextId 使用）
  var PREFIX_COLL = {
    SCH: 'schools', USR: 'users', ORG: 'orgs', POS: 'positions', SDS: 'sdsList',
    CH: 'chemicals', OPB: 'openingBalances', DLY: 'dailyRecords', DOC: 'toxDocuments', FP: 'floorplans',
    NEWS: 'news', LOG: 'auditLogs', EMG: 'emergencyItems', EMA: 'emergencyAlerts'   // V2-T01
  };
  var COLLECTIONS = ['schools', 'users', 'orgs', 'positions', 'sdsList', 'chemicals',
    'openingBalances', 'dailyRecords', 'closedMonths', 'toxDocuments', 'floorplans', 'govConcernList',
    'news', 'auditLogs', 'govPriorityList', 'emergencyAlerts', 'emergencyItems'];   // V2-T01：govPriorityList、emergencyAlerts 為物件型集合

  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function nowStr() {
    var d = new Date();
    function p(n) { return n < 10 ? '0' + n : '' + n; }
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
  }
  function trim(v) { return (v === undefined || v === null) ? '' : String(v).trim(); }

  var SDS_KEYS = {
    s1: ['partNo', 'nameZh', 'nameEn', 'synonyms', 'usage', 'supplierName', 'supplierAddress', 'supplierPhone', 'emergencyPhone'],
    s2: ['nonGhs', 'version', 'physicalHazards', 'healthHazards', 'envHazards', 'pictograms', 'signalWord', 'hazardStatements', 'precautionPrevention', 'precautionResponse', 'precautionStorage', 'precautionDisposal', 'precautionNote', 'otherHazards'],
    s3: ['type', 'components'],
    s4: ['inhalation', 'skin', 'eye', 'ingestion', 'symptoms', 'protection', 'medicalNote'],
    s5: ['extinguishers', 'specialHazards', 'procedures', 'protection'],
    s6: ['personal', 'environment', 'cleanup'],
    s7: ['handling', 'storage'],
    s8: ['engineering', 'exposureLimits', 'bioIndicators', 'ppeRespiratory', 'ppeHand', 'ppeEye', 'ppeSkin', 'hygiene'],
    s9: ['appearance', 'odor', 'odorThreshold', 'ph', 'meltingPoint', 'boilingPoint', 'flashPoint', 'decompositionTemp', 'autoIgnitionTemp', 'explosionLimits', 'vaporPressure', 'vaporDensity', 'density', 'solubility', 'partitionCoefficient', 'evaporationRate', 'flammability'],
    s10: ['stability', 'hazardousReactions', 'conditionsToAvoid', 'materialsToAvoid', 'decompositionProducts'],
    s11: ['routes', 'symptoms', 'acuteToxicity', 'chronicToxicity'],
    s12: ['ecotoxicity', 'degradability', 'bioaccumulation', 'mobility', 'pbt', 'otherEffects'],
    s13: ['wasteDisposal', 'packagingDisposal'],
    s14: ['unNo', 'shippingName', 'hazardClass', 'packingGroup', 'marinePollutant', 'specialPrecautions'],
    s15: ['regulations'],
    s16: ['references', 'preparedBy', 'preparedPerson', 'preparedDate', 'remark']
  };
  var SDS_ARRAY_KEYS = { physicalHazards: 1, healthHazards: 1, envHazards: 1, pictograms: 1, components: 1 };

  // 產生 16 項 items：已完成項目以「示範資料」填滿，未完成項目留白；overrides 覆蓋指定欄位
  function buildSdsItems(done, overrides) {
    var items = {};
    Object.keys(SDS_KEYS).forEach(function (s) {
      var sec = {};
      var filled = done.indexOf(s) >= 0;
      SDS_KEYS[s].forEach(function (k) {
        if (k === 'nonGhs') sec[k] = false;
        else if (SDS_ARRAY_KEYS[k]) sec[k] = [];
        else sec[k] = filled ? '示範資料' : '';
      });
      var ov = overrides[s] || {};
      Object.keys(ov).forEach(function (k) { sec[k] = ov[k]; });
      items[s] = sec;
    });
    return items;
  }
  // 前 n 項視為已完成，extra 內的項目除外
  function sdsDone(n, extra) {
    var all = [];
    for (var i = 1; i <= 16; i++) all.push('s' + i);
    return all.slice(0, n).filter(function (s) { return !extra || extra.indexOf(s) < 0; });
  }
  function yearsAgo(n) {
    var d = new Date();
    function p(x) { return x < 10 ? '0' + x : '' + x; }
    return (d.getFullYear() - n) + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }

  /* ---------- 示範資料登錄（PLAN §4.1 seed 拆檔） ----------
     各 seed 檔呼叫 Store.registerSeed(collection, versionTag, builderFn)。
     資料版本 = BASE_VERSION + 各集合標籤；任一 seed 檔改標籤即會覆蓋舊的 localStorage。 */
  var seedRegistry = {};
  function registerSeed(coll, tag, builder) {
    seedRegistry[coll] = { tag: String(tag), build: builder };
  }
  function currentVersion() {
    var tags = Object.keys(seedRegistry).sort().map(function (c) { return c + ':' + seedRegistry[c].tag; });
    return BASE_VERSION + '|' + tags.join('|');
  }
  function buildSeed() {
    var out = { version: currentVersion() };
    COLLECTIONS.forEach(function (c) { out[c] = []; });
    Object.keys(seedRegistry).forEach(function (c) { out[c] = clone(seedRegistry[c].build()); });
    if (!out.govToxList) out.govToxList = { version: '', items: [] };
    if (!out.govConcernList || !out.govConcernList.items) out.govConcernList = { version: '', items: [] };
    if (!out.govPriorityList || !out.govPriorityList.items) out.govPriorityList = { version: '', items: [] };      // V2-T01
    if (!out.emergencyAlerts || !out.emergencyAlerts.items) out.emergencyAlerts = { version: '', items: [] };      // V2-T01
    return out;
  }

  var data = null;

  // 示範 SDS 的毒化物命中以 Store.matchGovTox 計算（需模組層 data 已指定）
  function seedToxMatches() {
    data.sdsList.forEach(function (s) { s.toxMatches = Store.matchGovTox(s.items.s3.components); });
  }

  /* ---------- T07 每日用量共用運算（PLAN §2.5、Task T07） ---------- */
  var ACTIONS = [
    { name: '製造', dir: 1 }, { name: '輸入', dir: 1 }, { name: '輸出', dir: -1 }, { name: '買入', dir: 1 },
    { name: '轉入', dir: 1 }, { name: '轉出', dir: -1 }, { name: '使用', dir: -1 }, { name: '儲存增加', dir: 1 },
    { name: '儲存減少', dir: -1 }, { name: '廢棄', dir: -1 }, { name: '特殊情況增加', dir: 1 }, { name: '特殊情況減少', dir: -1 },
    { name: '廢棄退回增加', dir: 1 }, { name: '廢棄退回減少', dir: -1 }
  ];
  function r6(n) { return Math.round(n * 1e6) / 1e6; }
  function p2(n) { return n < 10 ? '0' + n : '' + n; }
  function todayStr() { var d = new Date(); return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()); }
  function shiftMonth(m, delta) {
    var y = parseInt(m.slice(0, 4), 10), mo = parseInt(m.slice(5, 7), 10) - 1 + delta;
    y += Math.floor(mo / 12); mo = ((mo % 12) + 12) % 12;
    return y + '-' + p2(mo + 1);
  }
  function daysIn(m) { return new Date(parseInt(m.slice(0, 4), 10), parseInt(m.slice(5, 7), 10), 0).getDate(); }
  function actionDir(name) {
    for (var i = 0; i < ACTIONS.length; i++) { if (ACTIONS[i].name === name) return ACTIONS[i].dir; }
    return 0;
  }
  // 某化學品某月的增加與減少合計（無變動紀錄不計）
  function monthSums(chemId, month) {
    var inc = 0, dec = 0;
    Store.get('dailyRecords').forEach(function (r) {
      if (r.chemicalId !== chemId || !r.changed || String(r.date).slice(0, 7) !== month) return;
      var d = actionDir(r.action), q = Number(r.qty) || 0;
      if (d > 0) inc += q; else if (d < 0) dec += q;
    });
    return { inc: r6(inc), dec: r6(dec) };
  }
  function findOpening(chemId, month, source) {
    var list = Store.get('openingBalances');
    for (var i = 0; i < list.length; i++) {
      var o = list[i];
      if (o.chemicalId === chemId && o.month === month && o.source === source) return o;
    }
    return null;
  }
  function earliestManual(chemId) {
    var min = null;
    Store.get('openingBalances').forEach(function (o) {
      if (o.chemicalId === chemId && o.source === 'manual' && (min === null || o.month < min)) min = o.month;
    });
    return min;
  }

  // T04b：由 pdfFiles 推導 PDF 資訊；pdfName＝到期通知檔或第一檔
  function sdsPdfInfo(sds) {
    var files = (sds && sds.pdfFiles) || [];
    var names = files.map(function (f) { return f.name; });
    var nf = null;
    files.forEach(function (f) { if (!nf && f.notify) nf = f; });
    if (!nf && files.length) nf = files[0];
    return { count: files.length, names: names, notifyName: nf ? nf.name : '', hasPdf: files.length > 0, pdfName: nf ? nf.name : '' };
  }
  // T04b：某項任一欄位有值即視為已填寫（s2.version、s3.type 為預設值，不計；布林不計）
  function sdsFilledSections(sds) {
    var items = (sds && sds.items) || {};
    return Object.keys(SDS_KEYS).filter(function (s) {
      var o = items[s] || {};
      return Object.keys(o).some(function (k) {
        var v = o[k];
        if (s === 's2' && k === 'version') return false;
        if (s === 's3' && k === 'type') return false;
        if (s === 's3' && k === 'components') return (v || []).some(function (c) { return !!(trim(c && c.nameZh) || trim(c && c.nameEn)); });
        if (Array.isArray(v)) return v.length > 0;
        if (typeof v === 'string') return trim(v) !== '';
        return false;
      });
    });
  }

  var Store = {
    registerSeed: registerSeed,
    sdsPdfInfo: sdsPdfInfo,
    sdsFilledSections: sdsFilledSections,
    SDS_KEYS: SDS_KEYS,
    SDS_ARRAY_KEYS: SDS_ARRAY_KEYS,
    buildSdsItems: buildSdsItems,
    seedHelpers: { sdsDone: sdsDone, yearsAgo: yearsAgo },
    version: null,   // 由 init 計算
    upgraded: false, // V2-T01：本次載入因版本不同而重建示範資料（原本 localStorage 已有資料）時為 true

    init: function () {
      if (data) return data;
      var raw = null;
      try { raw = localStorage.getItem(KEY); } catch (e) { raw = null; }
      if (raw) {
        try { data = JSON.parse(raw); } catch (e2) { data = null; }
      }
      if (!data || data.version !== currentVersion()) {
        if (data && data.version) Store.upgraded = true;
        data = buildSeed();
        seedToxMatches();
        Store.save();
      }
      Store.version = data.version;
      return data;
    },

    reset: function () {
      data = buildSeed();
      seedToxMatches();
      Store.save();
      return data;
    },

    save: function () {
      // T15：回傳 true／false；儲存空間不足（或被封鎖）時只保留記憶體資料並回傳 false
      try { localStorage.setItem(KEY, JSON.stringify(data)); return true; } catch (e) { return false; }
    },

    get: function (coll) {
      Store.init();
      if (!data[coll]) data[coll] = [];
      return data[coll];
    },

    getById: function (coll, id) {
      var list = Store.get(coll);
      for (var i = 0; i < list.length; i++) { if (list[i].id === id) return list[i]; }
      return null;
    },

    nextId: function (prefix) {
      Store.init();
      var coll = PREFIX_COLL[prefix];
      var max = 0;
      var re = new RegExp('^' + prefix + '-(\\d+)$');
      var lists = coll ? [Store.get(coll)] : COLLECTIONS.map(function (c) { return Store.get(c); });
      lists.forEach(function (list) {
        if (!Array.isArray(list)) return;
        list.forEach(function (it) {
          var m = it && it.id ? re.exec(it.id) : null;
          if (m) max = Math.max(max, parseInt(m[1], 10));
        });
      });
      var n = String(max + 1);
      while (n.length < 3) n = '0' + n;
      return prefix + '-' + n;
    },

    add: function (coll, obj, prefix) {
      var list = Store.get(coll);
      var item = obj || {};
      if (!item.id) {
        var pf = prefix;
        if (!pf) {
          for (var k in PREFIX_COLL) { if (PREFIX_COLL[k] === coll) pf = k; }
        }
        item.id = Store.nextId(pf || 'ID');
      }
      var t = nowStr();
      if (!item.createdAt) item.createdAt = t;
      item.updatedAt = t;
      list.push(item);
      Store.save();
      if (w.Audit) w.Audit.onStoreChange('add', coll, item);
      return item;
    },

    update: function (coll, id, patch) {
      var item = Store.getById(coll, id);
      if (!item) return null;
      for (var k in patch) { if (Object.prototype.hasOwnProperty.call(patch, k)) item[k] = patch[k]; }
      item.updatedAt = nowStr();
      Store.save();
      if (w.Audit) w.Audit.onStoreChange('update', coll, item);
      return item;
    },

    remove: function (coll, id) {
      var list = Store.get(coll);
      for (var i = 0; i < list.length; i++) {
        if (list[i].id === id) {
          var removed = list.splice(i, 1)[0];
          Store.save();
          if (w.Audit) w.Audit.onStoreChange('remove', coll, removed);
          return true;
        }
      }
      return false;
    },

    /**
     * 成分陣列 → 政府毒化物清單命中（展示假設 A-07）
     * 中文名精確、英文名不分大小寫、CAS 精確，皆先 trim；
     * 同成分同清單項目多欄位命中只留一筆（matchedBy 記第一個命中欄位）；不同清單項目全部保留；空白不比對。
     */
    matchGovTox: function (components) {
      var gov = Store.get('govToxList');
      var items = (gov && gov.items) || [];
      var ver = gov && gov.version;
      var result = [];
      (components || []).forEach(function (c, idx) {
        var zh = trim(c && c.nameZh), en = trim(c && c.nameEn).toLowerCase(), cas = trim(c && c.cas);
        if (!zh && !en && !cas) return;
        items.forEach(function (it) {
          var by = null, val = '';
          if (zh && trim(it.nameZh) === zh) { by = 'nameZh'; val = zh; }
          else if (en && trim(it.nameEn).toLowerCase() === en) { by = 'nameEn'; val = trim(c.nameEn); }
          else if (cas && (it.cas || []).some(function (x) { return trim(x) === cas; })) { by = 'cas'; val = cas; }
          if (by) {
            result.push({ componentIndex: idx, listedNo: it.listedNo, seriesNo: it.seriesNo, matchedBy: by, matchedValue: val, listVersion: ver });
          }
        });
      });
      return result;
    },

    /**
     * 成分陣列 → 關注化學物質示範摘錄命中（T14c，A-26）；規則同 matchGovTox。
     * 回傳 [{componentIndex, nameZh, nameEn, matchedBy, matchedValue, listVersion}]
     */
    matchConcern: function (components) {
      var gov = Store.get('govConcernList');
      var items = (gov && gov.items) || [];
      var ver = gov && gov.version;
      var result = [];
      (components || []).forEach(function (c, idx) {
        var zh = trim(c && c.nameZh), en = trim(c && c.nameEn).toLowerCase(), cas = trim(c && c.cas);
        if (!zh && !en && !cas) return;
        items.forEach(function (it) {
          var by = null, val = '';
          if (zh && trim(it.nameZh) === zh) { by = 'nameZh'; val = zh; }
          else if (en && trim(it.nameEn).toLowerCase() === en) { by = 'nameEn'; val = trim(c.nameEn); }
          else if (cas && (it.cas || []).some(function (x) { return trim(x) === cas; })) { by = 'cas'; val = cas; }
          if (by) result.push({ componentIndex: idx, nameZh: it.nameZh, nameEn: it.nameEn, matchedBy: by, matchedValue: val, listVersion: ver });
        });
      });
      return result;
    },

    /**
     * SDS 列管類別判定（T14c，A-26）：{ghs:{hit,basis}, concern:{hit,basis[]}, toxic:{hit,basis[]}}
     * ghs：s2 有任一危害分類或圖示且 nonGhs 不為 true；basis 為分類與圖示名稱字串。
     */
    sdsCategories: function (sds) {
      var items = (sds && sds.items) || {};
      var s2 = items.s2 || {}, s3 = items.s3 || {};
      var gov = (Store.get('govToxList') || {}).items || [];
      var seen = {}, toxBasis = [];
      (sds && sds.toxMatches || []).forEach(function (m) {
        var k = m.listedNo + '-' + m.seriesNo;
        if (seen[k]) return;
        seen[k] = 1;
        var it = gov.filter(function (g) { return g.listedNo === m.listedNo && g.seriesNo === m.seriesNo; })[0];
        toxBasis.push(k + ' ' + (it ? it.nameZh : ''));
      });
      var cSeen = {}, cBasis = [];
      Store.matchConcern(s3.components).forEach(function (m) {
        if (cSeen[m.nameZh]) return;
        cSeen[m.nameZh] = 1;
        cBasis.push(m.nameZh + '（' + m.nameEn + '）');
      });
      var names = (w.SdsSchema && w.SdsSchema.GHS_NAME) || {};
      var gBasis = [].concat(s2.physicalHazards || [], s2.healthHazards || [], s2.envHazards || [])
        .concat((s2.pictograms || []).map(function (p) { return p + ' ' + (names[p] || ''); }));
      var gHit = s2.nonGhs !== true && gBasis.length > 0;
      return {
        ghs: { hit: gHit, basis: gHit ? gBasis : [] },
        concern: { hit: cBasis.length > 0, basis: cBasis },
        toxic: { hit: toxBasis.length > 0, basis: toxBasis }
      };
    },

    /**
     * 成分陣列 → 優先管理化學品示範摘錄命中（V2-T06，A-32）；規則同 matchGovTox，附濃度與門檻判定。
     * substanceType 為 SDS 第三項 type（'純物質' 時濃度視為 100，省略則取成分 percent）。
     * 回傳 [{componentIndex, itemIndex, clause, cmr, matchedBy, matchedValue, percentText, percentValue, thresholdOk}]
     */
    matchPriority: function (components, substanceType) {
      var items = (Store.get('govPriorityList') || {}).items || [];
      return w.PriorityRules ? w.PriorityRules.match(components, items, substanceType) : [];
    },

    /**
     * SDS 優先管理子分類（V2-T06，A-32）：{c1,c2cmr,c2non,c3:{hit, unknown, basis[]}}
     * c3 須同時 Store.sdsCategories(sds).ghs.hit；unknown＝有命中但濃度未填。
     */
    sdsPriorityClauses: function (sds) {
      var s3 = (sds && sds.items && sds.items.s3) || {};
      var ms = Store.matchPriority(s3.components, s3.type);
      if (!w.PriorityRules) return { c1: { hit: false, unknown: false, basis: [] }, c2cmr: { hit: false, unknown: false, basis: [] }, c2non: { hit: false, unknown: false, basis: [] }, c3: { hit: false, unknown: false, basis: [] } };
      return w.PriorityRules.clauses(ms, s3.components, Store.sdsCategories(sds).ghs.hit);
    },

    /**
     * SDS 效期（V2-T01，A-28）：依 issueDate（製表日期）加 3 年為到期日。
     * 回傳 {state: 'expired'|'soon'|'ok'|'unknown', dueDate: 'YYYY-MM-DD'|''}
     * expired：到期日早於 today（等同 issueDate 超過 3 年）；soon：未來 90 天內到期；缺日期或無效為 unknown。
     */
    sdsExpiry: function (sds, today) {
      var raw = trim(sds && sds.issueDate), d = null;
      var m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(raw);
      if (m) {
        d = new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10));
        if (d.getMonth() !== parseInt(m[2], 10) - 1) d = null;   // 如 2025-02-31 無效
      } else if (raw) {
        d = new Date(raw);
      }
      if (!d || isNaN(d.getTime())) return { state: 'unknown', dueDate: '' };
      var due = new Date(d.getFullYear() + 3, d.getMonth(), d.getDate());
      var dueStr = due.getFullYear() + '-' + p2(due.getMonth() + 1) + '-' + p2(due.getDate());
      var t = trim(today) || todayStr();
      if (dueStr < t) return { state: 'expired', dueDate: dueStr };
      var tm = /^(\d{4})-(\d{2})-(\d{2})/.exec(t);
      var lim = tm ? new Date(parseInt(tm[1], 10), parseInt(tm[2], 10) - 1, parseInt(tm[3], 10) + 90) : new Date();
      var limStr = lim.getFullYear() + '-' + p2(lim.getMonth() + 1) + '-' + p2(lim.getDate());
      return { state: dueStr <= limStr ? 'soon' : 'ok', dueDate: dueStr };
    },

    // SDS 顯示名稱：中文名稱 (英文名稱)
    sdsDisplayName: function (sds) {
      var s1 = (sds && sds.items && sds.items.s1) || {};
      var zh = trim(s1.nameZh), en = trim(s1.nameEn);
      return zh && en ? zh + ' (' + en + ')' : (zh || en);
    },

    // 涵蓋指定 SDS 的毒化物文件（T08；同一 SDS 可對應多份文件）
    docsForSds: function (sdsId) {
      if (!sdsId) return [];
      return Store.get('toxDocuments').filter(function (d) { return (d.sdsIds || []).indexOf(sdsId) >= 0; });
    },

    // 化學品經其 SDS 查得的毒化物文件；無 SDS 回傳空陣列（T08）
    docsForChemical: function (chemId) {
      var c = Store.getById('chemicals', chemId);
      return c && c.hasSds && c.sdsId ? Store.docsForSds(c.sdsId) : [];
    },

    // 化學品是否為毒化物：有 SDS 且該 SDS 的 toxMatches 非空（無 SDS 不判定，回傳 false）
    chemIsTox: function (chem) {
      if (!chem || !chem.hasSds || !chem.sdsId) return false;
      var s = Store.getById('sdsList', chem.sdsId);
      return !!(s && s.toxMatches && s.toxMatches.length);
    },

    // 組織路徑：「理學院 / 化學系」（略過根節點；根節點本身顯示其名稱）
    orgPath: function (orgId) {
      var names = [], o = Store.getById('orgs', orgId), guard = 0;
      while (o && guard++ < 20) {
        if (o.parentId) names.unshift(o.name); else if (!names.length) names.unshift(o.name);
        o = o.parentId ? Store.getById('orgs', o.parentId) : null;
      }
      return names.join(' / ');
    },

    // 組織自身與所有下層組織的 id 陣列
    orgDescendants: function (orgId) {
      var all = Store.get('orgs'), ids = [orgId];
      (function walk(pid) {
        all.forEach(function (o) { if (o.parentId === pid) { ids.push(o.id); walk(o.id); } });
      })(orgId);
      return ids;
    },

    /* ---------- T07 每日用量與結轉 ---------- */
    ACTIONS: ACTIONS,
    actionDir: actionDir,
    today: todayStr,
    shiftMonth: shiftMonth,
    daysInMonth: daysIn,

    // 期初結餘：manual 優先；否則由上月期初＋上月增加－上月減少自動結轉（冪等：同月只維持一筆 carry，重算只更新數值）。
    // 沒有任何可承接的人工期初時回傳 null。
    getOpening: function (chemicalId, month) {
      var manual = findOpening(chemicalId, month, 'manual');
      if (manual) return { qty: Number(manual.qty), source: 'manual' };
      var min = earliestManual(chemicalId);
      if (min === null || month <= min) return null;
      var prev = Store.getOpening(chemicalId, shiftMonth(month, -1));
      if (!prev) return null;
      var s = monthSums(chemicalId, shiftMonth(month, -1));
      var qty = r6(prev.qty + s.inc - s.dec);
      var carry = findOpening(chemicalId, month, 'carry');
      if (carry) {
        if (carry.qty !== qty) { carry.qty = qty; carry.updatedAt = nowStr(); Store.save(); }
      } else {
        Store.add('openingBalances', { chemicalId: chemicalId, month: month, qty: qty, source: 'carry', createdBy: 'system' });
      }
      return { qty: qty, source: 'carry' };
    },

    // 當日結餘 = 當月期初 + 當月 1 日至該日的增加 − 減少；期初為 null 時回傳 null
    getDailyBalance: function (chemicalId, date) {
      var month = String(date).slice(0, 7);
      var op = Store.getOpening(chemicalId, month);
      if (!op) return null;
      var bal = op.qty;
      Store.get('dailyRecords').forEach(function (r) {
        if (r.chemicalId !== chemicalId || !r.changed || String(r.date).slice(0, 7) !== month || r.date > date) return;
        bal += actionDir(r.action) * (Number(r.qty) || 0);
      });
      return r6(bal);
    },

    // 月摘要：期初、增加、減少、期末，以及已回報有異動／已回報無變動／尚未回報的天數（過去含今天且無紀錄者為尚未回報）
    getMonthSummary: function (chemicalId, month) {
      var op = Store.getOpening(chemicalId, month);
      var s = monthSums(chemicalId, month);
      var today = todayStr(), changedDays = {}, noChangeDays = {};
      Store.get('dailyRecords').forEach(function (r) {
        if (r.chemicalId !== chemicalId || String(r.date).slice(0, 7) !== month) return;
        if (r.changed) changedDays[r.date] = 1; else noChangeDays[r.date] = 1;
      });
      var reportedChanged = 0, reportedNoChange = 0, unreported = 0, n = daysIn(month);
      for (var d = 1; d <= n; d++) {
        var ds = month + '-' + p2(d);
        if (changedDays[ds]) reportedChanged++;
        else if (noChangeDays[ds]) reportedNoChange++;
        else if (ds <= today) unreported++;
      }
      return {
        opening: op ? op.qty : null, openingSource: op ? op.source : null,
        inc: s.inc, dec: s.dec, closing: op ? r6(op.qty + s.inc - s.dec) : null,
        reportedChanged: reportedChanged, reportedNoChange: reportedNoChange, unreported: unreported
      };
    },

    // V2-T03：期間內有效消息（含首尾日；缺 showFrom／showTo 視為無下限／上限；showTo 早於 showFrom 不顯示），newsDate 降冪
    activeNews: function (today) {
      var sch = Store.session.currentSchool();
      var sid = sch ? sch.id : '';
      return Store.get('news').filter(function (n) {
        if (n.schoolId && n.schoolId !== sid) return false;
        if (n.showFrom && n.showTo && n.showTo < n.showFrom) return false;
        if (n.showFrom && today < n.showFrom) return false;
        if (n.showTo && today > n.showTo) return false;
        return true;
      }).sort(function (a, b) { return String(b.newsDate || '') < String(a.newsDate || '') ? -1 : (String(b.newsDate || '') > String(a.newsDate || '') ? 1 : 0); });
    },

    // 關帳（展示假設 A-13）：僅毒化物、月份早於本月且次月期初已可計算；順便確保 closedMonths 有紀錄
    isMonthClosed: function (chemicalId, month) {
      var chem = Store.getById('chemicals', chemicalId);
      if (!chem || !Store.chemIsTox(chem)) return false;
      if (!(month < todayStr().slice(0, 7))) return false;
      if (!Store.getOpening(chemicalId, shiftMonth(month, 1))) return false;
      var cm = Store.get('closedMonths');
      var has = cm.some(function (c) { return c.chemicalId === chemicalId && c.month === month; });
      if (!has) { cm.push({ chemicalId: chemicalId, month: month }); Store.save(); }
      return true;
    },

    session: {
      login: function (code, account, pwd) {
        Store.init();
        var c = trim(code).toLowerCase();
        var school = Store.get('schools').filter(function (s) { return s.code.toLowerCase() === c; })[0];
        if (!school) return null;
        var user = Store.get('users').filter(function (u) {
          return u.schoolId === school.id && u.account === trim(account) && u.password === String(pwd);
        })[0];
        if (!user) return null;
        return Store.session._set(user);
      },
      // 展示自動登入（A-02），不驗證密碼
      loginAs: function (account) {
        Store.init();
        var user = Store.get('users').filter(function (u) { return u.account === account; })[0];
        return user ? Store.session._set(user) : null;
      },
      _set: function (user) {
        var s = { userId: user.id, schoolId: user.schoolId, loginAt: nowStr() };
        try { localStorage.setItem(SESSION_KEY, JSON.stringify(s)); } catch (e) { /* ignore */ }
        return user;
      },
      // V2-T03：合併欄位寫回 session（不影響 _set 重建 session 時清空 newsShownAt 的行為）
      patch: function (obj) {
        var s = Store.session._read();
        if (!s) return null;
        Object.keys(obj || {}).forEach(function (k) { s[k] = obj[k]; });
        try { localStorage.setItem(SESSION_KEY, JSON.stringify(s)); } catch (e) { /* ignore */ }
        return s;
      },
      _read: function () {
        try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); } catch (e) { return null; }
      },
      logout: function () {
        try { localStorage.removeItem(SESSION_KEY); } catch (e) { /* ignore */ }
      },
      currentUser: function () {
        var s = Store.session._read();
        return s ? Store.getById('users', s.userId) : null;
      },
      currentSchool: function () {
        var s = Store.session._read();
        return s ? Store.getById('schools', s.schoolId) : null;
      }
    }
  };

  w.Store = Store;
})(window);

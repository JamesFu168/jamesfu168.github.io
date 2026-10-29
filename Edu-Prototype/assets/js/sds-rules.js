/* SDS 檢查規則模組（T05 建立，T14 自主檢查共用）。純函式、不依賴 DOM，Node／瀏覽器皆可載入。
   展示假設 A-09：示範檢查規則（每項 2～7 條），非法規符合性認證。
   rule = { id, section(1..16), item(檢查項目), type('缺漏'|'格式'|'疑義'), field(異常欄位說明), reason, test(sds) → true 表示異常 } */
(function (root) {
  'use strict';

  function str(v) { return (v === undefined || v === null) ? '' : String(v).trim(); }
  function blank(v) { return str(v) === ''; }
  function sec(sds, n) { return (sds && sds.items && sds.items['s' + n]) || {}; }
  function anyBlank(o, keys) { return keys.some(function (k) { return blank(o[k]); }); }
  function allBlank(o, keys) { return keys.every(function (k) { return blank(o[k]); }); }
  function comps(sds) {
    return (sec(sds, 3).components || []).filter(function (c) {
      return c && !(blank(c.nameZh) && blank(c.nameEn) && blank(c.cas) && blank(c.percent) && blank(c.formula) && blank(c.synonyms));
    });
  }
  function firstNumber(v) { var m = /-?\d+(\.\d+)?/.exec(str(v)); return m ? parseFloat(m[0]) : null; }
  function olderThan3Years(dateStr, now) {
    var d = new Date(str(dateStr));
    if (isNaN(d.getTime())) return null;
    var limit = new Date(now.getFullYear() - 3, now.getMonth(), now.getDate());
    return d < limit;
  }
  var PHONE_RE = /^\+?[\d\s()\-#]{6,20}(\s*(分機|ext\.?)\s*\d+)?$/i;
  var CAS_RE = /^\d{2,7}-\d{2}-\d$/;
  var UN_RE = /^UN\d{4}$/;
  var NUM_RE = /^\d+(\.\d+)?$/;

  var R = [];
  function add(section, item, type, field, reason, test) {
    var n = 1;
    R.forEach(function (r) { if (r.section === section) n++; });
    R.push({ id: 'S' + section + '-' + (n < 10 ? '0' + n : n), section: section, item: item, type: type, field: field, reason: reason, test: test });
  }
  function hasAnyHazard(o) { return !!((o.physicalHazards || []).length || (o.healthHazards || []).length || (o.envHazards || []).length); }

  // 第 1 項
  add(1, 'SDS 檔案', '缺漏', 'SDS 檔案', '是否上傳 SDS 檔案', function (s) { var St = root.Store; return !(St && St.sdsPdfInfo ? St.sdsPdfInfo(s).hasPdf : ((s && s.pdfFiles) || []).length > 0); });
  add(1, '化學品名稱', '缺漏', '中文名稱、英文名稱', '中文名稱與英文名稱皆未填寫', function (s) { var o = sec(s, 1); return blank(o.nameZh) && blank(o.nameEn); });
  add(1, '供應者名稱', '缺漏', '製造商或供應商名稱', '未填寫製造商或供應商名稱', function (s) { return blank(sec(s, 1).supplierName); });
  add(1, '供應者電話', '格式', '製造商或供應商電話', '電話不符合格式（應為數字、括號、連字號，至少 6 碼）', function (s) { var v = str(sec(s, 1).supplierPhone); return v !== '' && !PHONE_RE.test(v); });
  add(1, '緊急聯絡電話', '缺漏', '緊急聯絡電話／傳真', '未填寫緊急聯絡電話', function (s) { return blank(sec(s, 1).emergencyPhone); });

  // 第 2 項
  add(2, '化學品危害分類', '缺漏', '物理性、健康性、環境性危害分類', '未選任何危害分類（非 GHS 分類物質除外）', function (s) { var o = sec(s, 2); return !o.nonGhs && !hasAnyHazard(o); });
  add(2, '化學品危害分類', '疑義', '物理性危害分類、閃火點（第九項）', '液體閃火點不高於 93°C，應確認是否屬易燃液體（示範規則）', function (s) {
    var fp = str(sec(s, 9).flashPoint);
    if (fp === '' || /不適用/.test(fp)) return false;
    var n = firstNumber(fp);
    if (n === null || n > 93) return false;
    return !(sec(s, 2).physicalHazards || []).some(function (h) { return h.indexOf('易燃液體') === 0; });
  });
  add(2, '危害圖示', '疑義', 'GHS 圖示', '已有危害分類但未選任何 GHS 危害圖示', function (s) { var o = sec(s, 2); return !o.nonGhs && hasAnyHazard(o) && !(o.pictograms || []).length; });
  add(2, '危害圖示', '格式', 'GHS 圖示', '圖示代碼不在 GHS01～GHS09 範圍', function (s) { return (sec(s, 2).pictograms || []).some(function (p) { return !/^GHS0[1-9]$/.test(p); }); });
  add(2, '警示語', '缺漏', '警示語', '未填寫警示語', function (s) { var o = sec(s, 2); return !o.nonGhs && blank(o.signalWord); });
  add(2, '危害警告訊息', '缺漏', '危害警告訊息', '未填寫危害警告訊息', function (s) { var o = sec(s, 2); return !o.nonGhs && blank(o.hazardStatements); });
  add(2, '防範措施注意事項', '缺漏', '預防、應變、儲存、廢棄', '防範措施（預防、應變、儲存、廢棄）全部空白', function (s) {
    return allBlank(sec(s, 2), ['precautionPrevention', 'precautionResponse', 'precautionStorage', 'precautionDisposal']);
  });

  // 第 3 項
  add(3, '成分資料', '缺漏', '成分列', '未填寫任何成分', function (s) { return comps(s).length === 0; });
  add(3, '成分名稱', '缺漏', '成分中文名稱、英文名稱', '中文名稱以及英文名稱是否未填寫', function (s) { return comps(s).some(function (c) { return blank(c.nameZh) && blank(c.nameEn); }); });
  add(3, '化學文摘社登記號碼（CAS No.）', '缺漏', '成分 CAS No.', 'CAS No. 是否未填寫', function (s) { return comps(s).some(function (c) { return blank(c.cas); }); });
  add(3, '化學文摘社登記號碼（CAS No.）', '格式', '成分 CAS No.', 'CAS No. 是否格式有誤', function (s) { return comps(s).some(function (c) { return !blank(c.cas) && !CAS_RE.test(str(c.cas)); }); });
  add(3, '危害成分(%)', '缺漏', '成分含量（%）', '危害成分(%)是否未填寫', function (s) { return sec(s, 3).type === '混合物' && comps(s).some(function (c) { return blank(c.percent); }); });
  add(3, '危害成分(%)', '格式', '成分含量（%）', '危害成分(%)是否格式有誤', function (s) { return comps(s).some(function (c) { return !blank(c.percent) && !(NUM_RE.test(str(c.percent)) && parseFloat(c.percent) <= 100); }); });
  add(3, '危害成分(%)合計', '疑義', '成分含量（%）', '危害成分(%)合計是否異常（混合物合計不在 95～100 範圍，示範規則）', function (s) {
    if (sec(s, 3).type !== '混合物') return false;
    var cs = comps(s);
    if (!cs.length || !cs.every(function (c) { return NUM_RE.test(str(c.percent)); })) return false;
    var t = cs.reduce(function (a, c) { return a + parseFloat(c.percent); }, 0);
    return t < 95 || t > 100.0001;
  });

  // 第 4～8 項
  add(4, '急救方式', '缺漏', '吸入、皮膚、眼睛、食入', '吸入、皮膚接觸、眼睛接觸、食入四種急救方式有未填寫者', function (s) { return anyBlank(sec(s, 4), ['inhalation', 'skin', 'eye', 'ingestion']); });
  add(4, '最重要症狀及危害效應', '缺漏', '最重要症狀及危害效應', '未填寫最重要症狀及危害效應', function (s) { return blank(sec(s, 4).symptoms); });
  add(5, '適用滅火劑', '缺漏', '適用滅火劑', '未填寫適用滅火劑', function (s) { return blank(sec(s, 5).extinguishers); });
  add(5, '滅火處理程序與防護', '缺漏', '滅火處理程序、消防人員防護設備', '滅火處理程序或消防人員防護設備有未填寫者', function (s) { return anyBlank(sec(s, 5), ['procedures', 'protection']); });
  add(6, '個人與環境注意事項', '缺漏', '個人應注意事項、環境注意事項', '個人或環境注意事項有未填寫者', function (s) { return anyBlank(sec(s, 6), ['personal', 'environment']); });
  add(6, '清理方法', '缺漏', '清理方法', '未填寫清理方法', function (s) { return blank(sec(s, 6).cleanup); });
  add(7, '處置', '缺漏', '處置', '未填寫安全處置方法', function (s) { return blank(sec(s, 7).handling); });
  add(7, '儲存', '缺漏', '儲存', '未填寫儲存方法', function (s) { return blank(sec(s, 7).storage); });
  add(8, '工程控制與暴露限值', '缺漏', '工程控制、控制參數', '工程控制或控制參數（暴露限值）有未填寫者', function (s) { return anyBlank(sec(s, 8), ['engineering', 'exposureLimits']); });
  add(8, '個人防護設備', '缺漏', '呼吸、手部、眼睛、皮膚防護', '呼吸、手部、眼睛、皮膚防護有未填寫者', function (s) { return anyBlank(sec(s, 8), ['ppeRespiratory', 'ppeHand', 'ppeEye', 'ppeSkin']); });

  // 第 9 項
  add(9, '外觀', '缺漏', '外觀', '未填寫外觀（物質狀態、顏色）', function (s) { return blank(sec(s, 9).appearance); });
  add(9, '閃火點', '缺漏', '閃火點', '未填寫閃火點（不適用請填「不適用」）', function (s) { return blank(sec(s, 9).flashPoint); });
  add(9, '閃火點', '格式', '閃火點', '閃火點不是數值，也不是「不適用」', function (s) { var v = str(sec(s, 9).flashPoint); return v !== '' && !/不適用/.test(v) && firstNumber(v) === null; });
  add(9, '密度', '缺漏', '密度', '未填寫密度', function (s) { return blank(sec(s, 9).density); });

  // 第 10～13 項
  add(10, '穩定性', '缺漏', '穩定性', '未填寫穩定性', function (s) { return blank(sec(s, 10).stability); });
  add(10, '危害反應與應避免狀況', '缺漏', '危害反應、應避免之物質', '特殊狀況下危害反應或應避免之物質有未填寫者', function (s) { return anyBlank(sec(s, 10), ['hazardousReactions', 'materialsToAvoid']); });
  add(11, '急毒性', '缺漏', '急毒性', '未填寫急毒性資料', function (s) { return blank(sec(s, 11).acuteToxicity); });
  add(11, '暴露途徑與症狀', '缺漏', '暴露途徑、症狀', '暴露途徑或症狀有未填寫者', function (s) { return anyBlank(sec(s, 11), ['routes', 'symptoms']); });
  add(12, '生態毒性', '缺漏', '生態毒性', '未填寫生態毒性', function (s) { return blank(sec(s, 12).ecotoxicity); });
  add(12, '降解性與蓄積性', '缺漏', '持久性及降解性、生物蓄積性', '持久性及降解性或生物蓄積性有未填寫者', function (s) { return anyBlank(sec(s, 12), ['degradability', 'bioaccumulation']); });
  add(13, '廢棄處置方法', '缺漏', '廢棄處置方法', '未填寫廢棄處置方法', function (s) { return blank(sec(s, 13).wasteDisposal); });
  add(13, '受污染包裝之處理', '缺漏', '受污染包裝之處理', '未填寫受污染包裝之處理', function (s) { return blank(sec(s, 13).packagingDisposal); });

  // 第 14 項
  add(14, '聯合國編號', '缺漏', '聯合國編號', '未填寫聯合國編號（不適用請填「不適用」）', function (s) { return blank(sec(s, 14).unNo); });
  add(14, '聯合國編號', '格式', '聯合國編號', '聯合國編號不符 UN 加 4 位數字格式（例 UN1230）', function (s) { var v = str(sec(s, 14).unNo); return v !== '' && !/不適用/.test(v) && !UN_RE.test(v); });
  add(14, '運輸名稱與危害分類', '缺漏', '運輸名稱、運輸危害分類', '聯合國運輸名稱或運輸危害分類有未填寫者', function (s) { return anyBlank(sec(s, 14), ['shippingName', 'hazardClass']); });

  // 第 15、16 項
  add(15, '適用法規', '缺漏', '適用法規', '未填寫適用法規', function (s) { return blank(sec(s, 15).regulations); });
  add(15, '適用法規', '疑義', '適用法規、成分比對結果', '成分命中毒性化學物質清單，但法規資料未提及「毒」相關法規（示範規則）', function (s) {
    var hit = ((s && s.toxMatches) || []).length > 0, reg = str(sec(s, 15).regulations);
    return hit && reg !== '' && reg.indexOf('毒') < 0;
  });
  add(16, '製表日期', '缺漏', '製表日期', '未填寫製表日期', function (s) { return blank(sec(s, 16).preparedDate); });
  add(16, '製表日期', '疑義', '製表日期', '製表日期距今超過 3 年，建議確認是否需更新（示範規則，非法定效期）', function (s) { return olderThan3Years(sec(s, 16).preparedDate, new Date()) === true; });
  add(16, '製表單位名稱', '缺漏', '製表單位名稱', '未填寫製表單位名稱', function (s) { return blank(sec(s, 16).preparedBy); });
  add(16, '製表人姓名', '缺漏', '製表人姓名', '未填寫製表人姓名', function (s) { return blank(sec(s, 16).preparedPerson); });

  function testRule(rule, sds) { try { return !!rule.test(sds); } catch (e) { return false; } }

  /* run(sdsList) → { bySection:{ 1:[{rule, hits:[sdsId…]}] … 16 }, distinctAbnormalSds:[id…], totalHits }
     每條規則按 SDS 去重（同一 SDS 對同一規則只算一次）；totalHits = 所有規則命中數總和。 */
  function run(sdsList) {
    var bySection = {}, distinct = {}, total = 0, seen = {}, i;
    for (i = 1; i <= 16; i++) bySection[i] = [];
    var list = (sdsList || []).filter(function (s) {
      if (!s || seen[s.id]) return false;
      seen[s.id] = true;
      return true;
    });
    R.forEach(function (rule) {
      var hits = [];
      list.forEach(function (s) { if (testRule(rule, s)) { hits.push(s.id); distinct[s.id] = true; } });
      total += hits.length;
      bySection[rule.section].push({ rule: rule, hits: hits });
    });
    return { bySection: bySection, distinctAbnormalSds: Object.keys(distinct), totalHits: total };
  }

  var api = { rules: R, run: run, testRule: testRule };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.SdsRules = api;
})(typeof window !== 'undefined' ? window : globalThis);

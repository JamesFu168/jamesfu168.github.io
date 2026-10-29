/* 示範資料：5 筆 SDS（T03 文件示範資料表）。toxMatches 由 Store 於 init/reset 後以 matchGovTox 補算。 */
(function () {
  'use strict';
  function buildSdsList() {
    var buildSdsItems = Store.buildSdsItems, sdsDone = Store.seedHelpers.sdsDone, yearsAgo = Store.seedHelpers.yearsAgo;
    var sup = { supplierName: '示範化工股份有限公司', supplierAddress: '台北市示範區範例路 1 號', supplierPhone: '02-2000-8888', emergencyPhone: '02-2000-9999' };
    function s1(partNo, zh, en, syn) {
      var o = { partNo: partNo, nameZh: zh, nameEn: en, synonyms: syn, usage: '實驗室試劑（示範資料）' };
      Object.keys(sup).forEach(function (k) { o[k] = sup[k]; });
      return o;
    }
    function mk(n, idx, status, pdfFiles, issueDate, done, ov, upd) {
      return {
        id: 'SDS-' + n, schoolId: 'SCH-001', indexCode: idx, status: status, pdfFiles: pdfFiles,
        issueDate: issueDate, items: buildSdsItems(done, ov),
        toxMatches: [], createdAt: upd, updatedAt: upd
      };
    }
    function pf(idx, d) { return { name: idx + '.pdf', uploadedAt: d, notify: true }; }
    var list = [];
    list.push(mk('001', 'SDS-2026-001', '有效', [{ name: 'SDS-2026-001.pdf', uploadedAt: '2026-03-15', notify: false }, { name: 'SDS-2026-001-補充.pdf', uploadedAt: '2026-09-01', notify: true }], '2026-03-15', sdsDone(16), {
      s1: s1('HG-001', '汞', 'Mercury', '水銀'),
      s2: { nonGhs: false, version: 'GHS 第 7 修訂版', physicalHazards: [], healthHazards: ['急毒性物質 第 2 級（吸入）', '生殖毒性物質 第 1B 級'], envHazards: ['水環境之危害物質 急毒性 第 1 級'], pictograms: ['GHS06', 'GHS08', 'GHS09'], signalWord: '危險', hazardStatements: 'H330 吸入致命；H360D 可能對胎兒造成傷害（示範資料）' },
      s3: { type: '純物質', components: [{ nameZh: '汞', nameEn: 'Mercury', synonyms: '水銀', cas: '7439-97-6', formula: 'Hg', percent: '100' }] },
      s9: { appearance: '銀白色液體', density: '13.5 g/cm3', flashPoint: '不適用' },
      s14: { unNo: 'UN2809', shippingName: '汞', hazardClass: '8', packingGroup: 'III' },
      s16: { preparedDate: '2026-03-15', preparedBy: '示範大學環安中心', preparedPerson: '林美惠' }
    }, '2026-10-20 10:00:00'));
    list.push(mk('002', 'SDS-2026-002', '有效', [pf('SDS-2026-002', '2026-04-02')], '2026-04-02', sdsDone(16, ['s12', 's13']), {
      s1: s1('TCE-002', '三氯乙烯', 'Trichloroethylene', 'TCE'),
      s2: { nonGhs: false, version: 'GHS 第 7 修訂版', physicalHazards: [], healthHazards: ['致癌物質 第 1B 級', '生殖細胞致突變性物質 第 2 級'], envHazards: ['水環境之危害物質 慢毒性 第 3 級'], pictograms: ['GHS07', 'GHS08'], signalWord: '危險', hazardStatements: 'H350 可能致癌；H341 懷疑造成遺傳性缺陷（示範資料）' },
      s3: { type: '純物質', components: [{ nameZh: '三氯乙烯', nameEn: 'Trichloroethylene', synonyms: 'TCE', cas: '79-01-6', formula: 'C2HCl3', percent: '99' }] },
      s9: { appearance: '無色透明液體', density: '1.46 g/cm3', flashPoint: '不適用' },
      s14: { unNo: 'UN1710', shippingName: '三氯乙烯', hazardClass: '6.1', packingGroup: 'III' },
      s16: { preparedDate: '2026-04-02', preparedBy: '示範大學環安中心', preparedPerson: '林美惠' }
    }, '2026-10-18 14:30:00'));
    list.push(mk('003', 'SDS-2026-003', '有效', [pf('SDS-2026-003', '2026-05-20')], '2026-05-20', sdsDone(16), {
      s1: s1('ETOH-003', '乙醇', 'Ethanol', '酒精；Ethyl alcohol'),
      s2: { nonGhs: false, version: 'GHS 第 7 修訂版', physicalHazards: ['易燃液體 第 2 級'], healthHazards: ['嚴重眼睛損傷／眼睛刺激物質 第 2A 級'], envHazards: [], pictograms: ['GHS02', 'GHS07'], signalWord: '危險', hazardStatements: 'H225 高度易燃液體和蒸氣；H319 造成嚴重眼睛刺激（示範資料）' },
      s3: { type: '純物質', components: [{ nameZh: '乙醇', nameEn: 'Ethanol', synonyms: '酒精', cas: '64-17-5', formula: 'C2H5OH', percent: '99.5' }] },
      s9: { appearance: '無色透明液體', density: '0.79 g/cm3', flashPoint: '13 °C' },
      s14: { unNo: 'UN1170', shippingName: '乙醇', hazardClass: '3', packingGroup: 'II' },
      s16: { preparedDate: '2026-05-20', preparedBy: '示範大學環安中心', preparedPerson: '林美惠' }
    }, '2026-10-15 09:15:00'));
    list.push(mk('004', 'SDS-2026-004', '有效', [], '2026-06-10', sdsDone(16, ['s7', 's8', 's10', 's11', 's12', 's13', 's15']), {
      s1: s1('CL-20', '清潔劑 CL-20', 'Cleaner CL-20', '實驗器材清潔劑'),
      s2: { nonGhs: false, version: 'GHS 第 7 修訂版', physicalHazards: ['易燃液體 第 3 級'], healthHazards: ['致癌物質 第 1A 級'], envHazards: [], pictograms: ['GHS02', 'GHS08'], signalWord: '危險', hazardStatements: 'H226 易燃液體和蒸氣；H350 可能致癌（示範資料）' },
      s3: { type: '混合物', components: [
        { nameZh: '苯', nameEn: 'Benzene', synonyms: '', cas: '71-43-2', formula: 'C6H6', percent: '2' },
        { nameZh: '乙醇', nameEn: 'Ethanol', synonyms: '酒精', cas: '64-17-5', formula: 'C2H5OH', percent: '30' },
        { nameZh: '水', nameEn: 'Water', synonyms: '', cas: '', formula: 'H2O', percent: '68' }] },
      s9: { appearance: '無色液體', density: '0.95 g/cm3', flashPoint: '22 °C' },
      s14: { unNo: 'UN1993', shippingName: '易燃液體，未另列名', hazardClass: '3', packingGroup: 'III' },
      s16: { preparedDate: '2026-06-10', preparedBy: '示範大學環安中心', preparedPerson: '林美惠' }
    }, '2026-10-12 16:45:00'));
    list.push(mk('005', 'SDS-2026-005', '停用', [pf('SDS-2026-005', yearsAgo(4))], yearsAgo(4), sdsDone(16, ['s10', 's11', 's12', 's13']), {
      s1: s1('H2SO4-005', '硫酸', 'Sulfuric acid', 'Oil of vitriol'),
      s2: { nonGhs: false, version: 'GHS 第 4 修訂版', physicalHazards: ['金屬腐蝕物 第 1 級'], healthHazards: ['腐蝕／刺激皮膚物質 第 1A 級'], envHazards: [], pictograms: ['GHS05'], signalWord: '危險', hazardStatements: 'H290 可能腐蝕金屬；H314 造成嚴重皮膚灼傷和眼睛損傷（示範資料）' },
      s3: { type: '純物質', components: [{ nameZh: '硫酸', nameEn: 'Sulfuric acid', synonyms: '', cas: '7664-93-9', formula: 'H2SO4', percent: '98' }] },
      s9: { appearance: '無色油狀液體', density: '1.84 g/cm3', flashPoint: '不適用' },
      s14: { unNo: 'UN1830', shippingName: '硫酸', hazardClass: '8', packingGroup: 'II' },
      s16: { preparedDate: yearsAgo(4), preparedBy: '示範大學環安中心', preparedPerson: '林美惠' }
    }, '2026-10-08 11:20:00'));
    return list;
  }
  Store.registerSeed('sdsList', 'T14b', buildSdsList);
})();

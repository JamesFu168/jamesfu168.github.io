/* SDS 表單共用常數（T04 建立；T05 智能解析、T11 H-Card 等可重用）。
   危害分類選項為「摘錄常見類別」，非完整 GHS／CNS 15030 清單（POC 展示用）。 */
(function (w) {
  'use strict';

  // 九個 GHS 圖示：代碼 → 名稱與簡短符號（CSS 菱形圖示內顯示）
  var GHS_PICTOGRAMS = [
    { code: 'GHS01', name: '爆炸物', mark: '爆' },
    { code: 'GHS02', name: '易燃物', mark: '火' },
    { code: 'GHS03', name: '氧化性物質', mark: '氧' },
    { code: 'GHS04', name: '高壓氣體', mark: '壓' },
    { code: 'GHS05', name: '腐蝕性物質', mark: '蝕' },
    { code: 'GHS06', name: '急毒性物質', mark: '毒' },
    { code: 'GHS07', name: '警告（驚嘆號）', mark: '!' },
    { code: 'GHS08', name: '健康危害', mark: '健' },
    { code: 'GHS09', name: '環境危害', mark: '環' }
  ];
  var GHS_NAME = {};
  GHS_PICTOGRAMS.forEach(function (p) { GHS_NAME[p.code] = p.name; });

  var HAZARD_VERSIONS = ['臺灣 CNS 15030', 'GHS 第 7 修訂版', 'GHS 第 4 修訂版'];
  var DEFAULT_HAZARD_VERSION = '臺灣 CNS 15030';

  var HAZARD_OPTIONS = {
    physicalHazards: [
      '爆炸物 第 1.1 級', '易燃氣體 第 1 級', '加壓氣體', '氧化性氣體 第 1 級', '易燃液體 第 1 級',
      '易燃液體 第 2 級', '易燃液體 第 3 級', '易燃固體 第 1 級', '氧化性液體 第 2 級', '金屬腐蝕物 第 1 級'
    ],
    healthHazards: [
      '急毒性物質 第 2 級（吸入）', '急毒性物質 第 3 級（吞食）', '腐蝕／刺激皮膚物質 第 1A 級', '腐蝕／刺激皮膚物質 第 2 級',
      '嚴重眼睛損傷／眼睛刺激物質 第 2A 級', '生殖細胞致突變性物質 第 2 級', '致癌物質 第 1A 級', '致癌物質 第 1B 級',
      '生殖毒性物質 第 1B 級', '皮膚過敏物質 第 1 級'
    ],
    envHazards: [
      '水環境之危害物質 急毒性 第 1 級', '水環境之危害物質 急毒性 第 2 級', '水環境之危害物質 慢毒性 第 1 級',
      '水環境之危害物質 慢毒性 第 2 級', '水環境之危害物質 慢毒性 第 3 級', '臭氧層危害物質 第 1 級'
    ]
  };
  var HAZARD_GROUP_TITLES = {
    physicalHazards: '(1) 物理性危害', healthHazards: '(2) 健康性危害', envHazards: '(3) 環境性危害'
  };
  var SIGNAL_WORDS = ['危險', '警告', '無'];

  // 十六大項名稱
  var SECTION_NAMES = {
    s1: '化學品與廠商資料', s2: '危害辨識資料', s3: '成分辨識資料', s4: '急救措施', s5: '滅火措施',
    s6: '洩漏處理方法', s7: '安全處置與儲存方法', s8: '暴露預防措施', s9: '物理及化學性質', s10: '安定性與反應性',
    s11: '毒性資料', s12: '生態資料', s13: '廢棄處置方法', s14: '運送資料', s15: '法規資料', s16: '其他資料'
  };
  var CN_NUM = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二', '十三', '十四', '十五', '十六'];

  w.SdsSchema = {
    GHS_PICTOGRAMS: GHS_PICTOGRAMS,
    GHS_NAME: GHS_NAME,
    HAZARD_VERSIONS: HAZARD_VERSIONS,
    DEFAULT_HAZARD_VERSION: DEFAULT_HAZARD_VERSION,
    HAZARD_OPTIONS: HAZARD_OPTIONS,
    HAZARD_GROUP_TITLES: HAZARD_GROUP_TITLES,
    SIGNAL_WORDS: SIGNAL_WORDS,
    SECTION_NAMES: SECTION_NAMES,
    CN_NUM: CN_NUM
  };
})(window);

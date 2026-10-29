/* 示範資料：優先管理化學品示範摘錄清單（非正式清單，僅供優先管理化學品查詢展示判定）。V2-T06 */
(function () {
  'use strict';
  var NOTE = '示範摘錄，非正式清單';
  var GOV_PRIORITY_LIST = {
    "version": "示範摘錄 2026-10-25（非正式清單）",
    "items": [
      { "nameZh": "汞", "nameEn": "Mercury", "cas": ["7439-97-6"], "clause": 1, "cmr": false, "threshold": ">1%", "announced": "", "note": NOTE },
      { "nameZh": "硫酸", "nameEn": "Sulfuric acid", "cas": ["7664-93-9"], "clause": 1, "cmr": false, "threshold": ">1%", "announced": "", "note": NOTE },
      { "nameZh": "三氯乙烯", "nameEn": "Trichloroethylene", "cas": ["79-01-6"], "clause": 2, "cmr": true, "threshold": "≥1%", "announced": "", "note": NOTE },
      { "nameZh": "苯", "nameEn": "Benzene", "cas": ["71-43-2"], "clause": 2, "cmr": true, "threshold": "≥1%", "announced": "", "note": NOTE },
      { "nameZh": "二甲苯", "nameEn": "Xylene", "cas": ["1330-20-7"], "clause": 2, "cmr": false, "threshold": "≥1%", "announced": "", "note": NOTE },
      { "nameZh": "乙醇", "nameEn": "Ethanol", "cas": ["64-17-5"], "clause": 3, "cmr": false, "threshold": "整體具 GHS 危害", "announced": "", "note": NOTE }
    ]
  };
  Store.registerSeed('govPriorityList', 'V2-T06', function () { return GOV_PRIORITY_LIST; });
})();

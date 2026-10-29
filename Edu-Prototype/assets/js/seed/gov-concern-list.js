/* 示範資料：關注化學物質示範摘錄（非正式清單，僅供列管查詢展示比對）。T14c */
(function () {
  'use strict';
  var GOV_CONCERN_LIST = {
    "version": "示範摘錄 2026-10-24（非正式清單）",
    "items": [
      { "nameZh": "硫酸", "nameEn": "Sulfuric acid", "cas": ["7664-93-9"], "announced": "103.12.30", "note": "示範摘錄，非正式清單" },
      { "nameZh": "硝酸", "nameEn": "Nitric acid", "cas": ["7697-37-2"], "announced": "103.12.30", "note": "示範摘錄，非正式清單" },
      { "nameZh": "氫氟酸", "nameEn": "Hydrofluoric acid", "cas": ["7664-39-3"], "announced": "104.06.15", "note": "示範摘錄，非正式清單" },
      { "nameZh": "甲醛", "nameEn": "Formaldehyde", "cas": ["50-00-0"], "announced": "104.06.15", "note": "示範摘錄，非正式清單" },
      { "nameZh": "過氧化氫", "nameEn": "Hydrogen peroxide", "cas": ["7722-84-1"], "announced": "106.03.20", "note": "示範摘錄，非正式清單" },
      { "nameZh": "氰化鉀", "nameEn": "Potassium cyanide", "cas": ["151-50-8"], "announced": "106.03.20", "note": "示範摘錄，非正式清單" }
    ]
  };
  Store.registerSeed('govConcernList', 'T14c', function () { return GOV_CONCERN_LIST; });
})();

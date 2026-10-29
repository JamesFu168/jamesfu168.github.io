/* 示範資料：最新消息（POC 一則固定消息）。V2-T03 */
(function () {
  'use strict';
  var NEWS = [
    {
      id: 'NEWS-001', schoolId: '', category: '系統公告', newsDate: '2026-10-20',
      title: '教育部化學雲 V2.0 雛型新增功能說明',
      paragraphs: [
        '本版新增儀表板、優先管理化學品查詢與填報匯出、政府毒化物清單查詢、緊急應變專區及系統日誌。',
        '示範資料可由右上角使用者選單「重置示範資料」還原；本消息為 POC 示範內容，非正式公告。'
      ],
      moreUrl: '', showFrom: '2026-10-20', showTo: '2026-12-31',
      createdAt: '2026-10-20 09:00:00', updatedAt: '2026-10-20 09:00:00'
    }
  ];
  Store.registerSeed('news', 'V2-T09', function () { return NEWS; });
})();

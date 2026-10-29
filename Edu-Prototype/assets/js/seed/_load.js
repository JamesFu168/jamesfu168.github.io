/* 示範資料載入清單：新增 seed 檔時在此加一行即可（頁面只載入本檔）。
   以 document.write 同步載入，確保在 app.js 的 Store.init() 之前完成；file:// 直接開啟可用。 */
(function () {
  var files = [
    'gov-tox-list.js',   // T01 政府清單示範摘錄
    'gov-concern-list.js', // T14c 關注化學物質示範摘錄
    'gov-priority-list.js', // V2-T06 優先管理化學品示範摘錄
    'base.js',           // T01/T02 學校、組織、人員、位置
    'sds.js',            // T03 SDS
    'floorplans.js',     // T09 平面圖
    'chemicals.js',      // T06 化學品
    'tox-documents.js', // T08 毒化物文件
    'daily.js',          // T07 期初結餘與每日用量
    'news.js',           // V2-T03 最新消息
    'emergency.js',      // V2-T08 緊急應變專區
    'audit-logs.js'      // V2-T04 系統日誌歷史紀錄
  ];
  var scripts = document.getElementsByTagName('script');
  var me = scripts[scripts.length - 1].getAttribute('src');
  var qIdx = me.indexOf('?');
  var qs = qIdx >= 0 ? me.substring(qIdx) : '';
  var pathOnly = qIdx >= 0 ? me.substring(0, qIdx) : me;
  var dir = pathOnly.substring(0, pathOnly.lastIndexOf('/') + 1);
  for (var i = 0; i < files.length; i++) {
    document.write('<script src="' + dir + files[i] + qs + '"><\/script>');
  }
})();

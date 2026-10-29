/* 示範資料：3 筆毒化物文件（T08）。有效期限相對今年計算；DOC-003 為已逾期。 */
(function () {
  'use strict';
  Store.registerSeed('toxDocuments', 'T08', function () {
    var y = new Date().getFullYear();
    function mk(n, type, no, orgId, until, ctrl, file, subs, sdsIds, upd) {
      return {
        id: 'DOC-' + n, schoolId: 'SCH-001', orgId: orgId, docType: type, docNo: no, validUntil: until, controlNo: ctrl,
        operatorName: '示範大學', operatorAddress: '臺北市○○路 1 號', operatorPhone: '(02)1234-5678',
        siteName: '示範大學', siteAddress: '臺北市○○路 1 號', sitePhone: '(02)1234-5678',
        attachmentName: file, substances: subs, sdsIds: sdsIds, createdAt: upd, updatedAt: upd
      };
    }
    return [
      mk('001', '許可證', '北市環毒許字第 0001 號', 'ORG-003', (y + 1) + '-12-31', 'A1234567', '許可證_0001.pdf',
        [{ listedNo: '022', seriesNo: '01', concLow: 95, concHigh: 100, unit: '公斤' }], ['SDS-001'], '2026-10-16 09:30:00'),
      mk('002', '登記文件', '北市環毒登字第 0002 號', 'ORG-006', (y + 1) + '-06-30', 'A1234568', '登記文件_0002.pdf',
        [{ listedNo: '022', seriesNo: '01', concLow: 95, concHigh: 100, unit: '公斤' }], ['SDS-001'], '2026-10-17 11:00:00'),
      mk('003', '核可文件', '北市環毒核字第 0003 號', 'ORG-003', (y - 1) + '-12-31', 'A1234569', '核可文件_0003.pdf',
        [{ listedNo: '064', seriesNo: '01', concLow: 90, concHigh: 100, unit: '公升' }], ['SDS-002'], '2026-10-18 15:20:00')
    ];
  });
})();

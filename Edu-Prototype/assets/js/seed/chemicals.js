/* 示範資料：6 筆化學品（T06）。名稱與供應商與所選 SDS 第一項一致；CH-005 為無 SDS 手填。 */
(function () {
  'use strict';
  var SUP = { name: '示範化工股份有限公司', phone: '02-2000-8888' };
  function mk(n, orgId, sdsId, partNo, zh, en, usePos, storePos, unit, q, upd, extra) {
    var o = {
      id: 'CH-' + n, schoolId: 'SCH-001', orgId: orgId, hasSds: !!sdsId, sdsId: sdsId || '', partNo: partNo,
      nameZh: zh, nameEn: en, supplierName: sdsId ? SUP.name : '自行調配', supplierPhone: sdsId ? SUP.phone : '',
      usePositionId: usePos, storePositionId: storePos, storeNote: '', operationNote: '', unit: unit,
      maxStore: q[0], avgStore: q[1], maxUse: q[2], avgUse: q[3], createdAt: upd, updatedAt: upd
    };
    Object.keys(extra || {}).forEach(function (k) { o[k] = extra[k]; });
    return o;
  }
  Store.registerSeed('chemicals', 'T06', function () {
    return [
      mk('001', 'ORG-003', 'SDS-001', 'HG-001', '汞', 'Mercury', 'POS-001', 'POS-002', '公斤', [20, 10, 2, 1], '2026-10-20 10:30:00',
        { storeNote: '置於防溢盤內，上鎖管制', operationNote: '僅供儀器校正與教學示範使用' }),
      mk('002', 'ORG-006', 'SDS-001', 'HG-001', '汞', 'Mercury', 'POS-001', 'POS-004', '公斤', [5, 3, 1, 0.5], '2026-10-19 15:10:00'),
      mk('003', 'ORG-003', 'SDS-002', 'TCE-002', '三氯乙烯', 'Trichloroethylene', 'POS-001', 'POS-002', '公升', [50, 30, 5, 2], '2026-10-18 14:40:00'),
      mk('004', 'ORG-003', 'SDS-003', 'ETOH-003', '乙醇', 'Ethanol', 'POS-001', 'POS-002', '公升', [100, 60, 10, 5], '2026-10-15 09:20:00'),
      mk('005', 'ORG-004', '', '', '自製緩衝液', '', 'POS-006', 'POS-006', '毫升', [2000, 1000, 200, 100], '2026-10-14 11:00:00',
        { operationNote: '實驗室自行調配，無 SDS' }),
      mk('006', 'ORG-006', 'SDS-004', 'CL-20', '清潔劑 CL-20', 'Cleaner CL-20', 'POS-003', 'POS-004', '公升', [20, 10, 2, 1], '2026-10-12 16:50:00')
    ];
  });
})();

/* 示範資料：期初結餘與每日用量紀錄（T07）。月份以「本月／上月」相對於今天計算。
   CH-001 汞（毒化物）：上月人工期初 10、本月自動結轉為 12；CH-002 本月買入 +10 供 T14 數量上限示範；
   CH-003 無期初；CH-004 乙醇（一般）本月人工期初 60。 */
(function () {
  'use strict';
  function p2(n) { return n < 10 ? '0' + n : '' + n; }
  var now = new Date();
  var cur = now.getFullYear() + '-' + p2(now.getMonth() + 1);
  var pd = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  var prev = pd.getFullYear() + '-' + p2(pd.getMonth() + 1);
  var STAMP = '2026-10-20 09:00:00';
  var WHO = 'USR-003';

  Store.registerSeed('openingBalances', 'T07', function () {
    function ob(n, chem, month, qty) {
      return { id: 'OPB-' + n, chemicalId: chem, month: month, qty: qty, source: 'manual', createdBy: WHO, createdAt: STAMP, updatedAt: STAMP };
    }
    return [
      ob('001', 'CH-001', prev, 10),
      ob('002', 'CH-002', cur, 3),
      ob('003', 'CH-004', cur, 60)
    ];
  });

  Store.registerSeed('dailyRecords', 'T07', function () {
    var list = [], seq = 0;
    function rec(chem, month, day, action, qty, note) {
      seq++;
      var n = String(seq); while (n.length < 3) n = '0' + n;
      list.push({
        id: 'DLY-' + n, chemicalId: chem, date: month + '-' + p2(day), changed: !!action, action: action || null,
        qty: action ? qty : 0, fileName: '', note: note || '', reportedBy: WHO, reportedAt: STAMP, createdAt: STAMP, updatedAt: STAMP
      });
    }
    // CH-001 汞（上月）
    rec('CH-001', prev, 5, '買入', 4, '採購入庫');
    rec('CH-001', prev, 12, '使用', 1.5, '儀器校正');
    rec('CH-001', prev, 20, null);
    rec('CH-001', prev, 25, '儲存減少', 0.5, '移至藥品室');
    // CH-001 汞（本月）
    rec('CH-001', cur, 2, '使用', 0.5, '教學示範');
    rec('CH-001', cur, 3, null);
    rec('CH-001', cur, 5, '轉入', 1, '由化工系轉入');
    // CH-002 汞（化工系）
    rec('CH-002', cur, 1, '買入', 10, '結餘將超過最大儲存量（T14 示範）');
    // CH-004 乙醇
    rec('CH-004', cur, 1, '使用', 5, '實驗課使用');
    rec('CH-004', cur, 4, null);
    return list;
  });
})();

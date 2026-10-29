/* 示範資料：平面圖 FP-001、FP-002（T09；T10 為 FP-001 補底圖、區塊與 ICON）。 */
(function () {
  'use strict';
  Store.registerSeed('floorplans', 'T10', function () {
    return [
      { id: 'FP-001', schoolId: 'SCH-001', orgId: 'ORG-003', name: '化學館 2F 實驗室配置圖', building: '化學館／RC 四層',
        occupancy: '教師與學生約 40 人／週一至週五 08:00-18:00', usage: '教學與研究', operatingHours: '週一至週五 08:00-18:00，夜間需申請',
        rescuerName: '陳建宏', rescuerContact: '0912-000-111', flammableNote: '實驗桌為耐燃材質，走廊無堆放可燃物，藥品室設防爆櫃。',
        remark: '2F 西側為有機實驗室。', description: '本圖為化學館 2F 實驗室與藥品儲存位置示意，匯出 H-Card 時顯示於圖面下方。',
        baseImage: 'assets/img/demo-floorplan-chem2f.svg',
        blocks: [
          { id: 'BLK-001', x: 50, y: 80, w: 280, h: 160, fill: '#4a90d9', opacity: 0.5, stroke: '#1f4e79', fontSize: 18, label: '化學館 201 實驗室', positionId: 'POS-001' },
          { id: 'BLK-002', x: 50, y: 362, w: 230, h: 218, fill: '#e5534b', opacity: 0.5, stroke: '#9b2c26', fontSize: 18, label: '化學館 B1 藥品室', positionId: 'POS-002' },
          { id: 'BLK-003', x: 420, y: 262, w: 200, h: 56, fill: '#9aa5b1', opacity: 0.5, stroke: '#5b6670', fontSize: 14, label: '走廊暫存區', positionId: '' }
        ],
        icons: [
          { id: 'ICN-001', x: 282, y: 195, type: 'extinguisher' },
          { id: 'ICN-002', x: 282, y: 78, type: 'ghs06' }
        ], createdAt: '2026-09-01 09:00:00', updatedAt: '2026-09-15 14:30:00' },
      { id: 'FP-002', schoolId: 'SCH-001', orgId: 'ORG-006', name: '化工館 3F 配置圖', building: '化工館／RC 五層',
        occupancy: '教師、研究生約 25 人／週一至週六 08:30-21:00', usage: '研究', operatingHours: '週一至週六 08:30-21:00',
        rescuerName: '李國華', rescuerContact: '0912-000-222', flammableNote: '室內設通風櫃與溶劑儲存櫃，無裝潢木作。',
        remark: '', description: '化工館 3F 研究室與藥品櫃配置示意。',
        baseImage: null, blocks: [], icons: [], createdAt: '2026-09-03 10:20:00', updatedAt: '2026-09-20 16:45:00' }
    ];
  });
})();

/* 示範資料：緊急應變專區（V2-T08）。示範災害資料為固定假資料，非真實事件，機關名稱皆為「示範機關」。 */
(function () {
  'use strict';
  function p2(n) { return n < 10 ? '0' + n : '' + n; }
  function stamp(offsetDays, hh) {
    var d = new Date();
    d.setDate(d.getDate() + offsetDays);
    return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()) + ' ' + p2(hh) + ':00';
  }
  function today() {
    var d = new Date();
    return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate());
  }

  Store.registerSeed('emergencyAlerts', 'V2-T09', function () {
    return {
      version: '示範資料 ' + stamp(0, 9),   // V2-T09：與事件時間同為相對於今天，避免跨日後版本時間與事件日期不符
      items: [
        { id: 'EMA-001', type: '停水', title: '示範：配水管線檢修停水', agency: '示範機關（水務）', county: '臺北市', severity: '注意',
          effectiveFrom: stamp(0, 8), effectiveTo: stamp(1, 18), area: '示範行政區（部分里別）',
          description: '本則為 POC 示範內容。因示範管線檢修，預計暫停供水，請學校儲水備用並留意實驗室用水設備。\n第二行說明：復水後請先排放管線存水再使用。\n第三行說明：如需協助請洽示範聯絡窗口。\n第四行說明：本資料非真實公告。', updatedAt: stamp(0, 9) },
        { id: 'EMA-002', type: '豪雨', title: '示範：豪雨特報', agency: '示範機關（氣象）', county: '臺北市', severity: '警戒',
          effectiveFrom: stamp(0, 6), effectiveTo: stamp(0, 23), area: '示範山區與低窪地區',
          description: '本則為 POC 示範內容。示範降雨量達警戒標準，請檢視化學品儲存區防水與地下室排水。', updatedAt: stamp(0, 9) },
        { id: 'EMA-003', type: '地震', title: '示範：地震速報', agency: '示範機關（地震）', county: '新北市', severity: '注意',
          effectiveFrom: stamp(0, 7), effectiveTo: stamp(0, 12), area: '示範震度 4 級地區',
          description: '本則為 POC 示範內容。請檢查化學品櫃固定裝置及試劑瓶是否傾倒。', updatedAt: stamp(0, 9) },
        { id: 'EMA-004', type: '空品', title: '示範：空氣品質警示', agency: '示範機關（環保）', county: '臺中市', severity: '警戒',
          effectiveFrom: stamp(0, 5), effectiveTo: stamp(1, 12), area: '示範空品區',
          description: '本則為 POC 示範內容。示範空品指標偏高，戶外活動請酌予調整，通風櫥運轉請留意。', updatedAt: stamp(0, 9) },
        { id: 'EMA-005', type: '交通', title: '示範：道路封閉管制', agency: '示範機關（交通）', county: '高雄市', severity: '危險',
          effectiveFrom: stamp(0, 4), effectiveTo: stamp(0, 20), area: '示範路段',
          description: '本則為 POC 示範內容。示範道路因事故封閉，化學品運送請改道並與廠商確認時程。', updatedAt: stamp(0, 9) },
        { id: 'EMA-006', type: '其他', title: '示範：全國性演練通知', agency: '示範機關（綜合）', county: '全臺', severity: '注意',
          effectiveFrom: stamp(-1, 0), effectiveTo: stamp(7, 23), area: '全臺示範範圍',
          description: '本則為 POC 示範內容。提醒各校檢視緊急聯絡資訊是否為最新。', updatedAt: stamp(0, 9) }
      ]
    };
  });

  Store.registerSeed('emergencyItems', 'V2-T09', function () {
    var t = today() + ' 09:00:00';
    function it(n, block, name, type, extra, sort) {
      var o = { id: 'EMG-' + n, schoolId: 'SCH-001', block: block, name: name, type: type, text: '', url: '', fileName: '', sort: sort,
        updatedBy: '王大明', updatedAt: t, createdAt: t };
      for (var k in extra) o[k] = extra[k];
      return o;
    }
    return [
      it('001', 'manual', '化學品洩漏初步處置', 'text', { text: '1. 立即疏散周邊人員並通知實驗室負責人。\n2. 穿戴適當個人防護具後再處理。\n3. 以吸附材料圍堵並回報環安單位。\n（示範文字，非正式處置程序）' }, 1),
      it('002', 'manual', '校園緊急應變手冊（示範連結）', 'link', { url: 'https://example.com/manual' }, 2),
      it('003', 'contact', '環安中心 24 小時專線', 'text', { text: '02-2000-9999（示範）' }, 1),
      it('004', 'contact', '校園警衛室', 'text', { text: '分機 1111（示範）' }, 2),
      it('005', 'contact', '衛福部毒藥物諮詢（示範連結）', 'link', { url: 'https://example.com/poison' }, 3),
      it('006', 'map', '化學館 2F 逃生路線圖.pdf', 'file', { fileName: '化學館 2F 逃生路線圖.pdf' }, 1),
      it('007', 'map', '平面圖管理 FP-001', 'link', { url: 'map-info.html?mode=view&id=FP-001' }, 2)
    ];
  });
})();

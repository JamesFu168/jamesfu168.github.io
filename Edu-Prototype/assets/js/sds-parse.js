/* SDS 智能解析 Dialog（T05）：SdsParse.open({ onApply(result) })
   POC 模擬（展示假設 A-08）：接受任意檔案、不讀取內容，完成後帶入固定示範資料（甲醛溶液 37%）。
   result = { items: 十六項完整 items, fileName }；呼叫端負責覆蓋確認、套用到草稿與「尚未儲存」提示。
   需先載入 jQuery、Store、App；樣式在 common.css 檔尾的 T05 區段。 */
(function (w, $) {
  'use strict';

  var ALL = [];
  for (var i = 1; i <= 16; i++) ALL.push('s' + i);

  function fmtSize(n) {
    if (n < 1024) return n + ' B';
    if (n < 1048576) return (n / 1024).toFixed(1) + ' KB';
    return (n / 1048576).toFixed(1) + ' MB';
  }

  // 固定示範資料：十六項全部有內容；s9、s14、s16 等欄位以 overrides 覆蓋
  function demoItems() {
    var today = w.App && App.today ? App.today() : '';
    return Store.buildSdsItems(ALL, {
      s1: {
        partNo: 'FA-37', nameZh: '甲醛溶液 37%', nameEn: 'Formaldehyde solution 37%', synonyms: '福馬林；Formalin',
        usage: '實驗室試劑、組織標本固定（POC 模擬示範資料）', supplierName: '示範化工股份有限公司', supplierAddress: '台北市示範區範例路 1 號',
        supplierPhone: '02-2000-8888', emergencyPhone: '02-2000-9999'
      },
      s2: {
        nonGhs: false, version: w.SdsSchema ? SdsSchema.DEFAULT_HAZARD_VERSION : '臺灣 CNS 15030',
        physicalHazards: ['易燃液體 第 3 級'],
        healthHazards: ['急毒性物質 第 3 級（吞食）', '腐蝕／刺激皮膚物質 第 1A 級', '致癌物質 第 1B 級', '皮膚過敏物質 第 1 級'],
        envHazards: [], pictograms: ['GHS06', 'GHS05', 'GHS08'], signalWord: '危險',
        hazardStatements: 'H226 易燃液體和蒸氣；H301+H311+H331 吞食、皮膚接觸或吸入有毒；H314 造成嚴重皮膚灼傷和眼睛損傷；H317 可能造成皮膚過敏反應；H350 可能致癌',
        precautionPrevention: 'P201 使用前取得特別指示；P260 不要吸入氣霧或蒸氣；P280 穿戴防護手套、防護衣、護目鏡及面罩。',
        precautionResponse: 'P301+P330+P331 如誤吞食：漱口，不要催吐；P303+P361+P353 如皮膚（或頭髮）沾染：立即脫掉所有沾染衣物，以水沖洗皮膚；P305+P351+P338 如進入眼睛：用水小心沖洗數分鐘。',
        precautionStorage: 'P403+P235 存放於通風良好處，保持低溫；P405 上鎖保管。',
        precautionDisposal: 'P501 依相關法規將內容物或容器送至合格廢棄物處理機構。',
        precautionNote: '以上為 POC 模擬示範資料，非正式 SDS 內容。', otherHazards: '蒸氣與空氣可形成爆炸性混合物；遇熱可聚合（示範資料）。'
      },
      s3: {
        type: '混合物',
        components: [
          { nameZh: '甲醛', nameEn: 'Formaldehyde', synonyms: '蟻醛', cas: '50-00-0', formula: 'CH2O', percent: '37' },
          { nameZh: '甲醇', nameEn: 'Methanol', synonyms: '木精', cas: '67-56-1', formula: 'CH3OH', percent: '10' },
          { nameZh: '水', nameEn: 'Water', synonyms: '', cas: '7732-18-5', formula: 'H2O', percent: '53' }
        ]
      },
      s4: {
        inhalation: '移至空氣新鮮處，保持呼吸道暢通；呼吸困難時給予氧氣並立即就醫。', skin: '立即脫去污染衣物，以大量清水沖洗至少 15 分鐘，並就醫。',
        eye: '立即以大量清水沖洗至少 15 分鐘，掀開眼瞼，並儘速就醫。', ingestion: '漱口，不可催吐；意識清楚時可飲用少量水，立即送醫。',
        symptoms: '刺激眼、鼻、喉；高濃度可造成灼傷、咳嗽、呼吸困難；可能引起皮膚過敏。', protection: '救護人員應穿戴適當防護具，避免接觸污染物。', medicalNote: '依症狀給予支持性治療；注意肺水腫延遲發作。'
      },
      s5: {
        extinguishers: '二氧化碳、乾粉、抗溶性泡沫、水霧。', specialHazards: '易燃，蒸氣與空氣可形成爆炸性混合物；燃燒產生一氧化碳與二氧化碳。',
        procedures: '於上風處滅火，以水霧冷卻暴露於火場之容器。', protection: '消防人員應穿戴全身式防護衣及空氣呼吸器。'
      },
      s6: {
        personal: '疏散無關人員，穿戴適當個人防護具，避免吸入蒸氣。', environment: '防止流入下水道、水體或土壤。',
        cleanup: '以吸收劑（如蛭石、砂土）吸附後置於密閉容器，依廢棄物規定處理。'
      },
      s7: {
        handling: '於通風良好處使用，避免接觸皮膚與眼睛；遠離火源與熱源。', storage: '存放於陰涼、通風、上鎖之場所；與氧化劑、強酸、強鹼分開存放。'
      },
      s8: {
        engineering: '使用局部排氣裝置或於通風櫥內操作。', exposureLimits: '甲醛：TWA 1 ppm、STEL 2 ppm（示範資料）；甲醇：TWA 200 ppm（示範資料）。',
        bioIndicators: '無資料。', ppeRespiratory: '濃度超標時佩戴有機蒸氣濾罐之呼吸防護具。', ppeHand: '丁基橡膠或耐化學手套。',
        ppeEye: '化學防護護目鏡，必要時加戴面罩。', ppeSkin: '耐化學防護衣及安全鞋。', hygiene: '工作後徹底洗手；污染衣物清洗後再使用。'
      },
      s9: {
        appearance: '無色透明液體', odor: '強烈刺激性氣味', odorThreshold: '0.5～1 ppm', ph: '2.8～4.0', meltingPoint: '-15 °C', boilingPoint: '96 °C',
        flashPoint: '60 °C', decompositionTemp: '無資料', autoIgnitionTemp: '430 °C', explosionLimits: '7～73 vol%', vaporPressure: '1.3 kPa (20 °C)',
        vaporDensity: '1.04 (空氣=1)', density: '1.09 g/cm3', solubility: '可與水互溶', partitionCoefficient: '無資料', evaporationRate: '無資料', flammability: '易燃液體'
      },
      s10: {
        stability: '於正常儲存條件下穩定。', hazardousReactions: '與強氧化劑、強酸、強鹼劇烈反應；可能聚合。', conditionsToAvoid: '高溫、火焰、火花及直接日曬。',
        materialsToAvoid: '強氧化劑、強酸、強鹼、鹼金屬。', decompositionProducts: '一氧化碳、二氧化碳、甲酸。'
      },
      s11: {
        routes: '吸入、皮膚接觸、眼睛接觸、食入。', symptoms: '眼鼻喉刺激、咳嗽、皮膚灼傷、過敏性皮膚炎。',
        acuteToxicity: 'LD50（大鼠，吞食）：100 mg/kg；LC50（大鼠，吸入）：0.58 mg/L/4h（示範資料）。', chronicToxicity: 'IARC 第 1 類人類致癌物（鼻咽癌）；長期暴露可能造成呼吸道疾病（示範資料）。'
      },
      s12: {
        ecotoxicity: '對水生生物有毒（示範資料）。', degradability: '易生物分解。', bioaccumulation: '生物蓄積性低。', mobility: '易溶於水，於土壤中移動性高。',
        pbt: '非 PBT／vPvB。', otherEffects: '無其他已知不良效應。'
      },
      s13: {
        wasteDisposal: '依事業廢棄物及毒性化學物質相關法規，委託合格業者清除處理。', packagingDisposal: '空容器以清水潤洗後依規定回收，潤洗液併入廢液處理。'
      },
      s14: {
        unNo: 'UN2209', shippingName: '甲醛溶液', hazardClass: '8', packingGroup: 'III', marinePollutant: '否',
        specialPrecautions: '運送時應固定容器、避免日曬與撞擊，並隨車攜帶緊急應變資料。'
      },
      s15: {
        regulations: '毒性及關注化學物質管理法（第四類毒性化學物質）；職業安全衛生法；勞工作業環境空氣中有害物容許濃度標準（示範資料）。'
      },
      s16: {
        references: 'POC 模擬示範資料，不引用實際文獻。', preparedBy: '示範大學環安中心', preparedPerson: '林美惠', preparedDate: today,
        remark: '本資料為 POC 模擬解析所帶入之固定示範資料，使用前請核對。'
      }
    });
  }

  function open(opts) {
    opts = opts || {};
    var file = null, timer = null, finished = false;
    var html =
      '<div class="parse-dlg">' +
      '<p class="parse-note"><span class="poc-badge">POC 模擬</span> 此為 POC 模擬解析：接受任意檔案，不讀取內容，完成後帶入固定示範資料。</p>' +
      '<div class="parse-drop" tabindex="0">' +
      '<div class="parse-drop-icon">⇪</div>' +
      '<div class="parse-drop-text">將檔案拖放到此處（一次一個檔案）</div>' +
      '<div class="parse-drop-sub">或</div>' +
      '<button type="button" class="btn btn-secondary btn-sm parse-pick">選擇檔案</button>' +
      '<input type="file" class="parse-input" hidden>' +
      '</div>' +
      '<div class="parse-file" hidden>' +
      '<div class="parse-file-line">📎 <span class="parse-file-name"></span> <span class="parse-file-size muted"></span></div>' +
      '<div class="parse-bar"><div class="parse-bar-fill"></div></div>' +
      '<div class="parse-status"></div>' +
      '</div>' +
      '</div>';

    var api = App.dialog({
      title: 'SDS 智能解析', width: 520, body: html,
      onClose: stop,
      buttons: [
        { text: '取消', cls: 'btn-secondary', onClick: function () { stop(); } },
        {
          text: '帶入示範資料', cls: 'btn-primary parse-apply', onClick: function () {
            if (!finished) return false;
            stop();
            if (opts.onApply) opts.onApply({ items: demoItems(), fileName: file ? file.name : '' });
          }
        }
      ]
    });
    var $d = api.el;
    var $apply = $d.find('.parse-apply').prop('disabled', true);
    var $drop = $d.find('.parse-drop'), $input = $d.find('.parse-input');

    function stop() { if (timer) { clearInterval(timer); timer = null; } }

    function accept(files) {
      if (!files || !files.length) return;
      if (files.length > 1) App.toast('一次只能解析一個檔案，已使用第一個：' + files[0].name, 'warning');
      file = files[0];
      finished = false;
      stop();
      $apply.prop('disabled', true);
      $d.find('.parse-file').prop('hidden', false);
      $d.find('.parse-file-name').text(file.name);
      $d.find('.parse-file-size').text('（' + fmtSize(file.size) + '）');
      var $fill = $d.find('.parse-bar-fill').css('width', '0%');
      var $st = $d.find('.parse-status').removeClass('done').text('解析中…（POC 模擬）');
      var t0 = Date.now(), total = 1500;
      timer = setInterval(function () {
        var p = Math.min(1, (Date.now() - t0) / total);
        $fill.css('width', Math.round(p * 100) + '%');
        if (p >= 1) {
          stop();
          finished = true;
          $st.addClass('done').text('解析完成（POC 模擬）');
          $apply.prop('disabled', false).trigger('focus');
        }
      }, 40);
    }

    $d.on('click', '.parse-pick', function () { $input.trigger('click'); });
    $input.on('change', function () { accept(this.files); this.value = ''; });
    $drop.on('dragenter dragover', function (e) { e.preventDefault(); $drop.addClass('over'); });
    $drop.on('dragleave dragend', function () { $drop.removeClass('over'); });
    $drop.on('drop', function (e) {
      e.preventDefault();
      $drop.removeClass('over');
      var dt = e.originalEvent && e.originalEvent.dataTransfer;
      accept(dt && dt.files);
    });
    return api;
  }

  w.SdsParse = { open: open, demoItems: demoItems };
})(window, jQuery);

/* SDS 十六大項表單（UI-06）：?mode=new|edit|view&id=SDS-001&section=3&parse=1
   展示假設：A-05 完成度 = 有填寫內容的項數／16（Store.sdsFilledSections 自動判定）；A-07 毒化物比對規則；A-14 附件只記錄檔名。
   所有輸入先存在記憶體草稿 draft，按「儲存」才寫入 Store。 */
$(document).on('app:ready', function () {
  'use strict';

  var SC = window.SdsSchema;
  var schoolId = App.school.id;
  var mode = App.qs('mode') || 'view';
  var id = App.qs('id');
  var rec = id ? Store.getById('sdsList', id) : null;
  var listUrl = App.menuUrl('sds');
  var SECTION_KEYS = [];
  for (var n = 1; n <= 16; n++) SECTION_KEYS.push('s' + n);

  function notice(title, msg, then) {
    App.dialog({
      title: title, width: 440, body: '<p class="confirm-msg">' + App.esc(msg).replace(/\n/g, '<br>') + '</p>',
      buttons: [{ text: '我知道了', cls: 'btn-primary', onClick: function () { if (then) then(); } }], onClose: then
    });
  }

  if (['new', 'edit', 'view'].indexOf(mode) < 0) mode = 'view';
  if ((mode === 'new' || mode === 'edit') && !App.canWrite()) {
    $('#sds-root').hide();
    notice('不允許的操作', '唯讀使用者僅能檢視 SDS，無法新增或修改。', function () {
      location.href = rec ? App.pageUrl('sds-form', { mode: 'view', id: id }) : listUrl;
    });
    return;
  }
  if (mode !== 'new' && (!rec || rec.schoolId !== schoolId)) {
    $('#sds-root').hide();
    notice('查無資料', '找不到指定的 SDS，將回到清單。', function () { location.href = listUrl; });
    return;
  }

  /* ---------- 草稿 ---------- */
  var draft = null;       // { indexCode, status, pdfFiles:[{name,uploadedAt,notify}], issueDate, items }
  var errors = {};        // key → message，例如 's1.nameZh'、'head.indexCode'、's3.0.name'
  var dirty = false;
  var curSec = 1;

  function blankComp() { return { nameZh: '', nameEn: '', synonyms: '', cas: '', formula: '', percent: '' }; }

  function nextIndexCode() {
    var y = new Date().getFullYear(), max = 0;
    var re = new RegExp('^SDS-' + y + '-(\\d+)$');
    Store.get('sdsList').forEach(function (s) {
      if (s.schoolId !== schoolId) return;
      var m = re.exec(s.indexCode || '');
      if (m) max = Math.max(max, parseInt(m[1], 10));
    });
    var num = String(max + 1);
    while (num.length < 3) num = '0' + num;
    return 'SDS-' + y + '-' + num;
  }

  function initDraft() {
    var items = Store.buildSdsItems([], {});
    if (rec) {
      var src = JSON.parse(JSON.stringify(rec.items || {}));
      Object.keys(src).forEach(function (s) {
        if (!items[s]) return;
        Object.keys(src[s]).forEach(function (k) { items[s][k] = src[s][k]; });
      });
    } else {
      items.s2.version = SC.DEFAULT_HAZARD_VERSION;
      items.s3.type = '純物質';
      items.s3.components = [blankComp()];
    }
    if (!items.s3.type) items.s3.type = '純物質';
    if (!items.s2.version) items.s2.version = SC.DEFAULT_HAZARD_VERSION;
    var comps = items.s3.components = (items.s3.components || []).map(function (c) {
      var o = blankComp();
      Object.keys(c || {}).forEach(function (k) { o[k] = c[k]; });
      return o;
    });
    if (!comps.length && mode !== 'view') comps.push(blankComp());
    draft = {
      indexCode: rec ? rec.indexCode : nextIndexCode(),
      status: rec ? rec.status : '有效',
      pdfFiles: rec ? JSON.parse(JSON.stringify(rec.pdfFiles || [])) : [],
      issueDate: rec ? (rec.issueDate || '') : App.today(),
      items: items
    };
  }
  initDraft();

  var sec = parseInt(App.qs('section'), 10);
  if (sec >= 1 && sec <= 16) curSec = sec;

  /* ---------- 標題與模式 ---------- */
  function setTitle() {
    var t = mode === 'new' ? '新增 SDS' : (mode === 'edit' ? '編輯 SDS' : '檢視 SDS');
    $('body').attr('data-title', t);
    $('.page-title').text(t);
    $('.breadcrumb .current').text(t);
    document.title = t + ' - 教育部化學雲';
  }
  setTitle();
  var isView = function () { return mode === 'view'; };

  /* ---------- 欄位定義（第四至十六項） ---------- */
  var F = {
    s4: [{ fields: [['inhalation', '吸入', 'area'], ['skin', '皮膚接觸', 'area'], ['eye', '眼睛接觸', 'area'], ['ingestion', '食入', 'area'],
      ['symptoms', '最重要症狀及危害效應', 'area'], ['protection', '對急救人員之防護', 'area'], ['medicalNote', '對醫師之提示', 'area']] }],
    s5: [{ fields: [['extinguishers', '適用滅火劑', 'area'], ['specialHazards', '滅火時可能遭遇之特殊危害', 'area'], ['procedures', '滅火處理程序', 'area'], ['protection', '消防人員之特殊防護設備', 'area']] }],
    s6: [{ fields: [['personal', '個人應注意事項', 'area'], ['environment', '環境注意事項', 'area'], ['cleanup', '清理方法', 'area']] }],
    s7: [{ fields: [['handling', '處置', 'area'], ['storage', '儲存', 'area']] }],
    s8: [
      { title: '工程控制／暴露限值', fields: [['engineering', '工程控制', 'area'], ['exposureLimits', '控制參數（暴露限值）', 'area'], ['bioIndicators', '生物指標', 'area']] },
      { title: '個人防護', fields: [['ppeRespiratory', '呼吸防護', 'area'], ['ppeHand', '手部防護', 'area'], ['ppeEye', '眼睛防護', 'area'], ['ppeSkin', '皮膚及身體防護', 'area'], ['hygiene', '衛生措施', 'area']] }
    ],
    s9: [
      { title: '外觀與基本性質', fields: [['appearance', '外觀（物質狀態、顏色等）', 'text'], ['odor', '氣味', 'text'], ['odorThreshold', '嗅覺閾值', 'text'], ['ph', 'pH 值', 'text']] },
      { title: '相變與燃燒特性', fields: [['meltingPoint', '熔點', 'text'], ['boilingPoint', '沸點／沸點範圍', 'text'], ['flashPoint', '閃火點', 'text'], ['decompositionTemp', '分解溫度', 'text'],
        ['autoIgnitionTemp', '自燃溫度', 'text'], ['explosionLimits', '爆炸界限', 'text'], ['flammability', '易燃性（固體、氣體）', 'text']] },
      { title: '蒸氣、密度與溶解', fields: [['vaporPressure', '蒸氣壓', 'text'], ['vaporDensity', '蒸氣密度', 'text'], ['density', '密度', 'text'], ['solubility', '溶解度', 'text'],
        ['partitionCoefficient', '辛醇／水分配係數', 'text'], ['evaporationRate', '蒸發速率', 'text']] }
    ],
    s10: [{ fields: [['stability', '穩定性', 'area'], ['hazardousReactions', '特殊狀況下可能之危害反應', 'area'], ['conditionsToAvoid', '應避免之狀況', 'area'], ['materialsToAvoid', '應避免之物質', 'area'], ['decompositionProducts', '危害分解產物', 'area']] }],
    s11: [{ fields: [['routes', '暴露途徑', 'area'], ['symptoms', '症狀', 'area'], ['acuteToxicity', '急毒性', 'area'], ['chronicToxicity', '慢毒性或長期毒性', 'area']] }],
    s12: [{ fields: [['ecotoxicity', '生態毒性', 'area'], ['degradability', '持久性及降解性', 'area'], ['bioaccumulation', '生物蓄積性', 'area'], ['mobility', '土壤中之流動性', 'area'], ['pbt', 'PBT／vPvB 評估結果', 'area'], ['otherEffects', '其他不良效應', 'area']] }],
    s13: [{ fields: [['wasteDisposal', '廢棄處置方法', 'area'], ['packagingDisposal', '受污染包裝之處理', 'area']] }],
    s14: [{ fields: [['unNo', '聯合國編號', 'text'], ['shippingName', '聯合國運輸名稱', 'text'], ['hazardClass', '運輸危害分類', 'text'], ['packingGroup', '包裝類別', 'text'],
      ['marinePollutant', '海洋污染物', 'text'], ['specialPrecautions', '使用者運送或運輸有關之特殊防備措施', 'area']] }],
    s15: [{ fields: [['regulations', '適用法規', 'area']] }],
    s16: [{ fields: [['references', '參考文獻', 'area'], ['preparedBy', '製表單位名稱', 'text'], ['preparedPerson', '製表人姓名', 'text'], ['preparedDate', '製表日期', 'date'], ['remark', '備註', 'area']] }]
  };

  /* ---------- HTML 產生器 ---------- */
  var esc = App.esc;
  function errHtml(key) { return '<div class="form-error">' + (errors[key] ? esc(errors[key]) : '') + '</div>'; }
  function viewVal(v) { return '<div class="view-value">' + (v ? esc(v) : '<span class="muted">—</span>') + '</div>'; }

  // 一般欄位列：kind = text | area | date
  function row(s, k, label, kind, opt) {
    opt = opt || {};
    var v = draft.items[s][k] || '';
    var key = s + '.' + k;
    var req = opt.required && !isView() ? ' required' : '';
    var h = '<div class="form-row"><label class="form-label' + req + '">' + esc(label) + '</label><div class="form-field' + (errors[key] ? ' has-error' : '') + '" data-ekey="' + key + '">';
    if (isView()) h += viewVal(v);
    else {
      var at = ' data-s="' + s + '" data-k="' + k + '"';
      if (kind === 'area') h += '<textarea' + at + ' rows="' + (opt.rows || 3) + '" maxlength="1000">' + esc(v) + '</textarea>';
      else if (kind === 'date') h += '<input type="date"' + at + ' value="' + esc(v) + '">';
      else h += '<input type="text"' + at + ' maxlength="200" value="' + esc(v) + '">';
      if (opt.hint) h += '<div class="form-hint">' + esc(opt.hint) + '</div>';
      h += errHtml(key);
    }
    return h + '</div></div>';
  }
  function titleHtml(t) { return '<div class="form-group-title">' + esc(t) + '</div>'; }

  /* ----- 第二項 ----- */
  function optionList(arrKey) {
    var base = SC.HAZARD_OPTIONS[arrKey].slice();
    (draft.items.s2[arrKey] || []).forEach(function (v) { if (base.indexOf(v) < 0) base.push(v); }); // 保留舊資料中不在摘錄清單的值
    return base;
  }
  function hazardGroupHtml(arrKey) {
    var sel = draft.items.s2[arrKey] || [];
    var h = '<div class="hz-group"><div class="hz-title">' + esc(SC.HAZARD_GROUP_TITLES[arrKey]) + '</div><div class="hz-list">';
    optionList(arrKey).forEach(function (o) {
      var on = sel.indexOf(o) >= 0;
      if (isView() && !on) return;
      h += '<label class="chk"><input type="checkbox" data-arr="' + arrKey + '" value="' + esc(o) + '"' + (on ? ' checked' : '') + (isView() ? ' disabled' : '') + '><span>' + esc(o) + '</span></label>';
    });
    if (isView() && !sel.length) h += '<span class="muted">—</span>';
    return h + '</div></div>';
  }
  function summaryHtml() {
    var s2 = draft.items.s2, parts = [];
    ['physicalHazards', 'healthHazards', 'envHazards'].forEach(function (k) {
      (s2[k] || []).forEach(function (v) { parts.push('<span class="sum-tag sum-' + k + '">' + esc(v) + '</span>'); });
    });
    return parts.length ? parts.join('') : '<span class="muted">尚未選擇任何分類</span>';
  }
  function ghsIcon(p) { return '<span class="ghs-ico"><span>' + esc(p.mark) + '</span></span>'; }
  function pictogramHtml() {
    var sel = draft.items.s2.pictograms || [];
    var h = '<div class="ghs-grid">';
    SC.GHS_PICTOGRAMS.forEach(function (p) {
      var on = sel.indexOf(p.code) >= 0;
      if (isView() && !on) return;
      h += '<label class="ghs-item"><input type="checkbox" data-arr="pictograms" value="' + p.code + '"' + (on ? ' checked' : '') + (isView() ? ' disabled' : '') + '>' +
        ghsIcon(p) + '<span class="ghs-name"><b>' + p.code + '</b>' + esc(p.name) + '</span></label>';
    });
    if (isView() && !sel.length) h += '<span class="muted">—</span>';
    return h + '</div>';
  }
  function section2Html() {
    var s2 = draft.items.s2;
    var h = '<div class="hint-line">※ 可從危害圖示列印頁面，產生不同語言的版本（POC 不提供）</div>';
    h += '<div class="form-row"><label class="form-label">非 GHS 危害性化學品</label><div class="form-field"><label class="chk chk-inline">' +
      '<input type="checkbox" data-s="s2" data-k="nonGhs" id="f-nonghs"' + (s2.nonGhs ? ' checked' : '') + (isView() ? ' disabled' : '') + '><span>此化學品經確認為非 GHS 危害性化學品，不需填寫危害辨識資料</span></label></div></div>';
    h += '<div id="s2-body"' + (s2.nonGhs ? ' inert class="non-ghs-off"' : '') + '>';
    h += titleHtml('化學品危害分類');
    h += '<div class="form-row"><label class="form-label">危害分類版本</label><div class="form-field">';
    if (isView()) h += viewVal(s2.version);
    else {
      var vers = SC.HAZARD_VERSIONS.slice();
      if (s2.version && vers.indexOf(s2.version) < 0) vers.push(s2.version);
      h += '<select data-s="s2" data-k="version">' + vers.map(function (v) { return '<option' + (v === s2.version ? ' selected' : '') + '>' + esc(v) + '</option>'; }).join('') + '</select>';
    }
    h += '</div></div>';
    ['physicalHazards', 'healthHazards', 'envHazards'].forEach(function (k) { h += hazardGroupHtml(k); });
    h += '<div class="form-row"><label class="form-label">已選分類摘要</label><div class="form-field"><div class="hz-summary" id="hz-summary">' + summaryHtml() + '</div></div></div>';
    h += titleHtml('危害標示');
    h += '<div class="form-row"><label class="form-label">危害圖示</label><div class="form-field" id="pict-wrap">' + pictogramHtml() + '</div></div>';
    h += '<div class="form-row"><label class="form-label">警示語</label><div class="form-field"><div class="radio-line">';
    if (isView()) h += viewVal(s2.signalWord);
    else {
      SC.SIGNAL_WORDS.forEach(function (w) {
        h += '<label class="chk chk-inline"><input type="radio" name="signalWord" data-s="s2" data-k="signalWord" value="' + w + '"' + (s2.signalWord === w ? ' checked' : '') + '><span>' + w + '</span></label>';
      });
    }
    h += '</div></div></div>';
    h += row('s2', 'hazardStatements', '危害警告訊息', 'area', { rows: 4 });
    h += titleHtml('危害防範措施');
    h += row('s2', 'precautionPrevention', '預防', 'area') + row('s2', 'precautionResponse', '應變', 'area') +
      row('s2', 'precautionStorage', '儲存', 'area') + row('s2', 'precautionDisposal', '廢棄', 'area');
    h += row('s2', 'precautionNote', '注意事項', 'area') + row('s2', 'otherHazards', '其他危害', 'area');
    return h + '</div>';
  }

  /* ----- 第三項 ----- */
  function compInput(i, k, v, extra) {
    return '<input type="text" class="input" data-ci="' + i + '" data-ck="' + k + '" maxlength="100" value="' + esc(v) + '"' + (extra || '') + '>';
  }
  function section3Html() {
    var s3 = draft.items.s3, comps = s3.components;
    var h = '<div class="form-row"><label class="form-label">成分內容</label><div class="form-field"><div class="radio-line">';
    if (isView()) h += viewVal(s3.type);
    else ['純物質', '混合物'].forEach(function (t) {
      h += '<label class="chk chk-inline"><input type="radio" name="s3type" value="' + t + '"' + (s3.type === t ? ' checked' : '') + '><span>' + t + '</span></label>';
    });
    h += '</div></div></div>';
    if (s3.type === '純物質') {
      var c = comps[0] || blankComp();
      var nameErr = errors['s3.0.name'];
      var defs = [['nameZh', '中文名稱'], ['nameEn', '英文名稱'], ['synonyms', '其他名稱（同義名稱）'], ['cas', 'CAS No.'], ['formula', '化學式']];
      defs.forEach(function (d) {
        var isName = d[0] === 'nameZh' || d[0] === 'nameEn';
        h += '<div class="form-row"><label class="form-label' + (isName && !isView() ? ' required' : '') + '">' + d[1] + '</label><div class="form-field' + (nameErr && isName ? ' has-error' : '') + '">';
        h += isView() ? viewVal(c[d[0]]) : compInput(0, d[0], c[d[0]]);
        if (d[0] === 'nameEn' && !isView()) h += '<div class="form-hint">中文、英文名稱擇一必填</div>' + (nameErr ? '<div class="form-error">' + esc(nameErr) + '</div>' : '');
        h += '</div></div>';
      });
      var pErr = errors['s3.0.percent'];
      if (c.percent && isView()) h += '<div class="form-row"><label class="form-label">含量 %</label><div class="form-field">' + viewVal(c.percent) + '</div></div>';
      if (!isView()) h += '<div class="form-row"><label class="form-label"></label><div class="form-field"><button type="button" class="btn btn-secondary btn-sm" id="btn-bring">帶入第一項名稱</button>' +
        '<span class="form-hint inline-hint">將第一項的中文名稱、英文名稱、其他名稱複製到上方成分（會覆蓋這三個欄位）</span>' + (pErr ? '<div class="form-error">' + esc(pErr) + '</div>' : '') + '</div></div>';
    } else {
      h += '<div class="table-wrap"><table class="table comp-table"><thead><tr><th class="c-no">#</th><th>中文名稱</th><th>英文名稱</th><th>其他名稱</th><th class="c-cas">CAS No.</th><th class="c-fm">化學式</th><th class="c-pct">含量 %</th>' +
        (isView() ? '' : '<th class="c-del">移除</th>') + '</tr></thead><tbody>';
      if (!comps.length) h += '<tr class="empty-row"><td colspan="8">尚無成分資料</td></tr>';
      comps.forEach(function (c, i) {
        var e1 = errors['s3.' + i + '.name'], e2 = errors['s3.' + i + '.percent'];
        h += '<tr data-row="' + i + '"><td class="c-no">' + (i + 1) + '</td>';
        if (isView()) {
          ['nameZh', 'nameEn', 'synonyms', 'cas', 'formula', 'percent'].forEach(function (k) { h += '<td>' + (c[k] ? esc(c[k]) : '<span class="muted">—</span>') + '</td>'; });
        } else {
          h += '<td' + (e1 ? ' class="has-error"' : '') + '>' + compInput(i, 'nameZh', c.nameZh) + (e1 ? '<div class="form-error">' + esc(e1) + '</div>' : '') + '</td>';
          h += '<td>' + compInput(i, 'nameEn', c.nameEn) + '</td><td>' + compInput(i, 'synonyms', c.synonyms) + '</td>';
          h += '<td>' + compInput(i, 'cas', c.cas) + '</td><td>' + compInput(i, 'formula', c.formula) + '</td>';
          h += '<td' + (e2 ? ' class="has-error"' : '') + '>' + compInput(i, 'percent', c.percent) + (e2 ? '<div class="form-error">' + esc(e2) + '</div>' : '') + '</td>';
          h += '<td class="c-del"><button type="button" class="btn btn-secondary btn-sm btn-del-row" data-i="' + i + '">移除</button></td>';
        }
        h += '</tr>';
      });
      h += '</tbody></table></div>';
      if (!isView()) h += '<div class="comp-actions"><button type="button" class="btn btn-secondary btn-sm" id="btn-add-comp">＋ 新增成分</button>' +
        '<span class="form-hint inline-hint">混合物產品本身的名稱請填在第一項；此處只記錄各組成成分</span></div>';
    }
    h += '<div class="match-panel" id="match-panel"></div>';
    return h;
  }

  /* 政府毒化物清單比對面板（即時；規則見 Store.matchGovTox／A-07） */
  var BY_LABEL = { nameZh: '中文名稱', nameEn: '英文名稱', cas: 'CAS No.' };
  function renderMatch() {
    var $p = $('#match-panel');
    if (!$p.length) return;
    var comps = draft.items.s3.components || [];
    var gov = Store.get('govToxList') || {};
    var hits = Store.matchGovTox(comps);
    var h = '<div class="match-head"><b>政府毒化物清單比對結果</b><span class="match-note">依示範摘錄清單比對，非正式法規判定' + (gov.version ? '（清單版本：' + esc(gov.version) + '）' : '') + '</span></div>';
    h += '<ul class="match-list">';
    var any = false;
    comps.forEach(function (c, i) {
      var label = $.trim(c.nameZh) || $.trim(c.nameEn) || $.trim(c.cas);
      var mine = hits.filter(function (m) { return m.componentIndex === i; });
      h += '<li><span class="m-name">' + (i + 1) + '. ' + (label ? esc(label) : '<span class="muted">（尚未輸入）</span>') + '</span><span class="m-res">';
      if (!label) h += '<span class="muted">—</span>';
      else if (!mine.length) h += '<span class="tag tag-off">未命中</span>';
      else {
        any = true;
        h += mine.map(function (m) {
          var it = (gov.items || []).filter(function (g) { return g.listedNo === m.listedNo && g.seriesNo === m.seriesNo; })[0];
          return '<span class="tag tag-danger">命中</span> <span class="m-hit">' + esc(m.listedNo + '-' + m.seriesNo + ' ' + (it ? it.nameZh : '')) +
            '（命中欄位：' + BY_LABEL[m.matchedBy] + '：' + esc(m.matchedValue) + '）</span>';
        }).join('<br>');
      }
      h += '</span></li>';
    });
    if (!comps.length) h += '<li class="muted">尚無成分資料</li>';
    h += '</ul>';
    $p.toggleClass('has-hit', any).html(h);
  }

  /* ----- 通用項目 ----- */
  function section1Html() {
    var h = '';
    h += row('s1', 'partNo', '料號', 'text');
    h += row('s1', 'nameZh', '化學品中文名稱', 'text', { required: true });
    h += row('s1', 'nameEn', '化學品英文名稱', 'text', { required: true, hint: '中文、英文名稱擇一必填' });
    h += row('s1', 'synonyms', '其他名稱（同義名稱）', 'text', { hint: '多個名稱以「；」分隔' });
    h += row('s1', 'usage', '建議用途及限制使用', 'area');
    h += titleHtml('製造者、輸入者或供應者');
    h += row('s1', 'supplierName', '名稱', 'text') + row('s1', 'supplierAddress', '地址', 'text') +
      row('s1', 'supplierPhone', '電話', 'text') + row('s1', 'emergencyPhone', '緊急聯絡電話', 'text');
    return h;
  }
  function genericHtml(s) {
    var h = '';
    F[s].forEach(function (g) {
      if (g.title) h += titleHtml(g.title);
      g.fields.forEach(function (f) { h += row(s, f[0], f[1], f[2]); });
    });
    return h;
  }

  /* ---------- 繪製 ---------- */
  function secNo(i) { return SC.CN_NUM[i]; }
  function sectionHasError(i) {
    var p = 's' + i + '.';
    return Object.keys(errors).some(function (k) { return k.indexOf(p) === 0; });
  }

  function renderNav() {
    var h = '<div class="nav-title">十六大項</div><ul>';
    SECTION_KEYS.forEach(function (s, idx) {
      var i = idx + 1, done = filledMap()[s];
      h += '<li><button type="button" class="nav-item' + (i === curSec ? ' active' : '') + (sectionHasError(i) ? ' has-error' : '') + '" data-sec="' + i + '"' + (i === curSec ? ' aria-current="true"' : '') + '>' +
        '<span class="nav-no">' + i + '</span><span class="nav-name">' + esc(SC.SECTION_NAMES[s]) + '</span>' +
        '<span class="nav-err" title="本項有欄位錯誤">!</span>' +
        '<span class="nav-done' + (done ? ' on' : '') + '" title="' + (done ? '已填寫' : '尚未填寫') + '">' + (done ? '✓' : '') + '</span></button></li>';
    });
    $('#sds-nav').html(h + '</ul>');
    $('#sds-nav').append('<div class="nav-count">已填寫 <b id="done-count">' + Object.keys(filledMap()).length + '</b>／16</div>');
  }
  // 由草稿即時判定各項是否已填寫（Store.sdsFilledSections）
  function filledMap() {
    var m = {};
    Store.sdsFilledSections({ items: draft.items }).forEach(function (k) { m[k] = true; });
    return m;
  }
  function refreshNavDone() {
    var m = filledMap();
    $('#sds-nav .nav-item').each(function () {
      var s = 's' + $(this).attr('data-sec'), on = !!m[s];
      $(this).find('.nav-done').toggleClass('on', on).text(on ? '✓' : '').attr('title', on ? '已填寫' : '尚未填寫');
    });
    $('#done-count').text(Object.keys(m).length);
  }

  function renderPanel() {
    var s = 's' + curSec;
    var h = '<h2 class="sec-title">' + secNo(curSec) + '、' + esc(SC.SECTION_NAMES[s]) + '</h2>';
    if (curSec === 1) h += section1Html();
    else if (curSec === 2) h += section2Html();
    else if (curSec === 3) h += section3Html();
    else h += genericHtml(s);
    $('#sds-panel').html(h);
    if (curSec === 3) renderMatch();
  }

  function renderAll() { renderNav(); renderPanel(); updateDirtyFlag(); updateNextBtn(); }
  function updateNextBtn() {
    $('#btn-next').prop('disabled', curSec >= 16).attr('title', curSec >= 16 ? '已是最後一項（第十六項）' : '切換到下一項（不會儲存）');
  }

  function sdsName() {
    var s1 = draft.items.s1, zh = $.trim(s1.nameZh), en = $.trim(s1.nameEn);
    return zh && en ? zh + ' (' + en + ')' : (zh || en);
  }
  function refreshName() {
    var n = sdsName();
    $('#head-name').html(n ? esc(n) : (mode === 'new' ? '新增 SDS' : '<span class="muted">（尚未輸入名稱）</span>'));
  }

  function renderHead() {
    var h = '<div class="head-top"><div class="head-name" id="head-name"></div><span class="tag tag-danger unsaved" id="unsaved" hidden>尚未儲存</span><span class="spacer"></span>';
    if (!isView()) h += '<button type="button" class="btn btn-secondary btn-sm write-only" id="btn-parse">SDS 智能解析</button> <span class="poc-badge">POC 模擬</span>';
    h += '</div><div class="head-grid">';
    // 索引碼
    h += '<div class="form-row"><label class="form-label' + (isView() ? '' : ' required') + '">索引碼</label><div class="form-field' + (errors['head.indexCode'] ? ' has-error' : '') + '">';
    h += isView() ? viewVal(draft.indexCode) : '<input type="text" id="h-index" maxlength="30" value="' + esc(draft.indexCode) + '"><div class="form-error">' + esc(errors['head.indexCode'] || '') + '</div>';
    h += '</div></div>';
    // 狀態
    h += '<div class="form-row"><label class="form-label">狀態</label><div class="form-field">';
    h += isView() ? '<div class="view-value"><span class="tag ' + (draft.status === '有效' ? 'tag-ok' : 'tag-off') + '">' + esc(draft.status) + '</span></div>' :
      '<select id="h-status"><option' + (draft.status === '有效' ? ' selected' : '') + '>有效</option><option' + (draft.status === '停用' ? ' selected' : '') + '>停用</option></select>';
    h += '</div></div>';
    // 製表日期
    h += '<div class="form-row"><label class="form-label">製表日期</label><div class="form-field">';
    h += isView() ? viewVal(draft.issueDate) : '<input type="date" id="h-issue" value="' + esc(draft.issueDate) + '">';
    h += '</div></div>';
    // PDF
    h += '</div>';
    h += '<div class="form-row pdf-row"><label class="form-label">SDS 檔案</label><div class="form-field"><div class="pdf-box" id="pdf-line"></div></div></div>';
    $('#sds-head').html(h);
    refreshName();
    renderPdf();
  }
  function renderPdf() {
    var files = draft.pdfFiles, h = '';
    if (!files.length) h += '<div class="pdf-empty muted">' + (isView() ? '—' : '尚未附加檔案') + '</div>';
    else {
      h += '<table class="pdf-table"><thead><tr><th>檔名</th><th class="p-date">上傳日期</th><th class="p-notify">到期通知</th>' + (isView() ? '' : '<th class="p-op">操作</th>') + '</tr></thead><tbody>';
      files.forEach(function (f, i) {
        h += '<tr><td class="p-name">📎 ' + esc(f.name) + '</td><td class="p-date">' + esc(f.uploadedAt || '') + '</td><td class="p-notify">';
        if (isView()) h += f.notify ? '<span class="tag tag-ok">到期通知</span>' : '<span class="muted">—</span>';
        else h += '<label class="chk"><input type="radio" name="pdf-notify" data-pi="' + i + '"' + (f.notify ? ' checked' : '') + '><span>到期通知</span></label>';
        h += '</td>' + (isView() ? '' : '<td class="p-op"><button type="button" class="btn btn-link btn-pdf-del" data-pi="' + i + '">移除</button></td>') + '</tr>';
      });
      h += '</tbody></table>';
    }
    if (!isView()) h += '<div class="pdf-add"><input type="file" id="h-pdf" accept="application/pdf,.pdf" multiple><span class="poc-badge">POC 模擬：只記錄檔名與上傳日期</span></div>';
    $('#pdf-line').html(h);
  }

  function renderActions() {
    var h = '';
    if (isView()) {
      h = '<button type="button" class="btn btn-secondary" id="btn-back">返回</button><button type="button" class="btn btn-primary write-only" id="btn-to-edit">修改</button>';
    } else {
      h = '<button type="button" class="btn btn-primary write-only" id="btn-save">儲存</button>' +
        '<button type="button" class="btn btn-secondary" id="btn-next">繼續下一項</button>' +
        '<button type="button" class="btn btn-secondary" id="btn-cancel">取消</button><span class="spacer"></span>';
      if (mode === 'edit') h += '<button type="button" class="btn btn-danger write-only" id="btn-delete">刪除</button>';
    }
    $('#sds-actions').html(h);
  }

  /* ---------- 草稿變更 ---------- */
  function updateDirtyFlag() { $('#unsaved').prop('hidden', !(dirty || (mode === 'new' && !isView()))); }
  function markDirty() { dirty = true; updateDirtyFlag(); refreshNavDone(); }
  function clearErr(key) {
    if (!errors[key]) return;
    delete errors[key];
    $('[data-ekey="' + key + '"]').removeClass('has-error').find('.form-error').text('');
    $('.nav-item').each(function () { $(this).toggleClass('has-error', sectionHasError(parseInt($(this).attr('data-sec'), 10))); });
  }
  function refreshSummary() {
    $('#hz-summary').html(summaryHtml());
  }

  /* 切換項目後只捲到該項標題（頁首 60px 下方），不跳回頁面最上端；標題已在畫面內則不捲動 */
  function scrollToPanel() {
    var el = document.getElementById('sds-panel');
    if (!el) return;
    var top = el.getBoundingClientRect().top, offset = 72;
    if (top < offset) window.scrollTo(0, window.pageYOffset + top - offset);
  }
  function gotoSection(i) {
    curSec = i;
    renderNav();
    renderPanel();
    syncUrl();
    updateNextBtn();
    scrollToPanel();
  }

  /* ---------- 事件：導覽與欄位 ---------- */
  $('#sds-nav').on('click', '.nav-item', function () { gotoSection(parseInt($(this).attr('data-sec'), 10)); });

  var $panel = $('#sds-panel');
  // 一般欄位（文字、日期、下拉、非 GHS、警示語）
  $panel.on('input change', '[data-s][data-k]', function () {
    if (isView()) return;
    var $e = $(this), s = $e.attr('data-s'), k = $e.attr('data-k');
    if ($e.is(':checkbox')) draft.items[s][k] = $e.prop('checked');
    else if ($e.is(':radio')) { if (!$e.prop('checked')) return; draft.items[s][k] = $e.val(); }
    else draft.items[s][k] = $e.val();
    markDirty();
    clearErr(s + '.' + k);
    if (s === 's1' && (k === 'nameZh' || k === 'nameEn')) { clearErr('s1.nameZh'); clearErr('s1.nameEn'); refreshName(); }
    if (s === 's2' && k === 'nonGhs') $('#s2-body').toggleClass('non-ghs-off', draft.items.s2.nonGhs).prop('inert', draft.items.s2.nonGhs);
  });
  // 多選（危害分類、圖示）
  $panel.on('change', 'input[data-arr]', function () {
    if (isView()) return;
    var arrKey = $(this).attr('data-arr');
    draft.items.s2[arrKey] = $panel.find('input[data-arr="' + arrKey + '"]:checked').map(function () { return this.value; }).get();
    markDirty();
    refreshSummary();
  });
  // 成分輸入（純物質／混合物）
  $panel.on('input', 'input[data-ci]', function () {
    var i = parseInt($(this).attr('data-ci'), 10), k = $(this).attr('data-ck');
    draft.items.s3.components[i][k] = $(this).val();
    markDirty();
    if (k === 'nameZh' || k === 'nameEn') { clearErr('s3.' + i + '.name'); $(this).closest('.form-field, td').removeClass('has-error').find('.form-error').remove(); }
    if (k === 'percent') { clearErr('s3.' + i + '.percent'); $(this).closest('td').removeClass('has-error').find('.form-error').remove(); }
    renderMatch();
  });
  // 切換純物質／混合物
  $panel.on('change', 'input[name=s3type]', function () {
    var $r = $(this), t = $r.val(), s3 = draft.items.s3;
    if (t === s3.type) return;
    function apply() {
      s3.type = t;
      if (t === '純物質') s3.components = s3.components.slice(0, 1);
      if (!s3.components.length) s3.components.push(blankComp());
      errors = $.extend({}, errors); Object.keys(errors).forEach(function (k) { if (k.indexOf('s3.') === 0) delete errors[k]; });
      markDirty();
      renderPanel();
    }
    if (t === '純物質' && s3.components.length > 1) {
      var extra = s3.components.length - 1;
      App.confirm('改為「純物質」只會保留第一列成分，其餘 ' + extra + ' 列將被移除，確定要切換嗎？', { title: '切換成分內容', okText: '切換' }).then(function (ok) {
        if (ok) apply(); else renderPanel();
      });
    } else apply();
  });
  $panel.on('click', '#btn-add-comp', function () {
    draft.items.s3.components.push(blankComp());
    markDirty();
    renderPanel();
    $panel.find('.comp-table tbody tr:last input').first().trigger('focus');
  });
  $panel.on('click', '.btn-del-row', function () {
    var i = parseInt($(this).attr('data-i'), 10), comps = draft.items.s3.components;
    comps.splice(i, 1);
    Object.keys(errors).forEach(function (k) { if (k.indexOf('s3.') === 0) delete errors[k]; });
    markDirty();
    renderPanel();
  });
  $panel.on('click', '#btn-bring', function () {
    var s1 = draft.items.s1, c = draft.items.s3.components[0];
    if (!c) { c = blankComp(); draft.items.s3.components.push(c); }
    c.nameZh = s1.nameZh || ''; c.nameEn = s1.nameEn || ''; c.synonyms = s1.synonyms || '';
    clearErr('s3.0.name');
    markDirty();
    renderPanel();
    App.toast('已帶入第一項的名稱', 'success');
  });

  /* ---------- 事件：頂部識別列 ---------- */
  // 至多一檔到期通知，預設第一檔；移除到期通知檔後改為剩下的第一檔
  function ensureNotify() {
    var files = draft.pdfFiles, seen = false;
    files.forEach(function (f) { if (f.notify && !seen) seen = true; else f.notify = false; });
    if (!seen && files.length) files[0].notify = true;
  }
  $('#sds-head').on('input change', '#h-index', function () { draft.indexCode = $(this).val(); markDirty(); clearErr('head.indexCode'); })
    .on('change', '#h-status', function () { draft.status = $(this).val(); markDirty(); })
    .on('input change', '#h-issue', function () { draft.issueDate = $(this).val(); markDirty(); })
    .on('change', '#h-pdf', function () {
      var list = this.files ? Array.prototype.slice.call(this.files) : [];
      if (!list.length) return;
      list.forEach(function (f) { draft.pdfFiles.push({ name: f.name, uploadedAt: App.today(), notify: false }); });
      ensureNotify();
      markDirty(); renderPdf();
      Audit.record({ action: '修改', targetType: 'sdsList', targetId: rec ? rec.id : '', summary: '上傳 SDS 檔案「' + list.map(function (f) { return f.name; }).join('、') + '」' });   // V2-T04
    })
    .on('change', 'input[name=pdf-notify]', function () {
      var i = parseInt($(this).attr('data-pi'), 10);
      draft.pdfFiles.forEach(function (f, k) { f.notify = k === i; });
      markDirty();
      Audit.record({ action: '修改', targetType: 'sdsList', targetId: rec ? rec.id : '', summary: '設定到期通知檔「' + (draft.pdfFiles[i] ? draft.pdfFiles[i].name : '') + '」' });   // V2-T04
    })
    .on('click', '.btn-pdf-del', function () {
      draft.pdfFiles.splice(parseInt($(this).attr('data-pi'), 10), 1);
      ensureNotify();
      markDirty(); renderPdf();
    })
    .on('click', '#btn-parse', function () {
      if (!App.requireWrite()) return;
      if (!draftHasContent()) { openParse(); return; }
      App.confirm('將覆蓋目前所有項目內容（含已輸入的十六項資料與成分），確定要繼續嗎？', { title: 'SDS 智能解析', okText: '繼續解析', cancelText: '取消', danger: true }).then(function (ok) {
        if (ok) openParse();
      });
    });

  /* ---------- 智能解析（T05，POC 模擬；展示假設 A-08） ---------- */
  // 草稿是否已有使用者輸入的內容（預設值：版本、成分類型不算）
  function draftHasContent() {
    var items = draft.items, has = false;
    SECTION_KEYS.forEach(function (s) {
      var o = items[s];
      Object.keys(o).forEach(function (k) {
        var v = o[k];
        if (s === 's2' && k === 'version') return;
        if (s === 's3' && k === 'type') return;
        if (s === 's3' && k === 'components') { if (v.some(function (c) { return !compBlank(c); })) has = true; return; }
        if (Array.isArray(v)) { if (v.length) has = true; }
        else if (typeof v === 'boolean') { if (v) has = true; }
        else if ($.trim(v)) has = true;
      });
    });
    return has;
  }
  function showParseBanner() {
    if (!$('#parse-banner').length) $('#sds-root').prepend('<div class="parse-banner" id="parse-banner" role="status"></div>');
    $('#parse-banner').text('已帶入 POC 模擬解析示範資料，請核對後儲存；尚未儲存').prop('hidden', false);
  }
  function hideParseBanner() { $('#parse-banner').prop('hidden', true); }
  function applyParsed(result) {
    var items = Store.buildSdsItems([], {});
    Object.keys(result.items).forEach(function (s) {
      if (!items[s]) return;
      Object.keys(result.items[s]).forEach(function (k) { items[s][k] = JSON.parse(JSON.stringify(result.items[s][k])); });
    });
    items.s3.components = (items.s3.components || []).map(function (c) {
      var o = blankComp();
      Object.keys(c || {}).forEach(function (k) { o[k] = c[k]; });
      return o;
    });
    draft.items = items;       // 只覆蓋十六項內容；索引碼、PDF、製表日期保持原狀
    errors = {};
    dirty = true;
    curSec = 1;
    renderAll();
    refreshName();
    syncUrl();
    showParseBanner();
    window.scrollTo(0, 0);
    App.toast('已帶入示範資料（POC 模擬），尚未儲存', 'success');
    Audit.record({ action: '修改', targetType: 'sdsList', targetId: rec ? rec.id : '', summary: '模擬解析帶入' + (result.fileName ? '「' + result.fileName + '」' : '') + '（SDS 智能解析示範資料，尚未儲存）' });   // V2-T04
  }
  function openParse() { SdsParse.open({ onApply: applyParsed }); }

  /* ---------- 驗證與儲存 ---------- */
  function trimItems(items) {
    Object.keys(items).forEach(function (s) {
      Object.keys(items[s]).forEach(function (k) { if (typeof items[s][k] === 'string') items[s][k] = $.trim(items[s][k]); });
    });
    items.s3.components.forEach(function (c) { Object.keys(c).forEach(function (k) { c[k] = $.trim(c[k]); }); });
  }
  function compBlank(c) { return !(c.nameZh || c.nameEn || c.synonyms || c.cas || c.formula || c.percent); }

  function validate() {
    var err = {};
    var code = $.trim(draft.indexCode);
    if (!code) err['head.indexCode'] = '請輸入索引碼';
    else {
      var dup = Store.get('sdsList').some(function (s) { return s.schoolId === schoolId && s.id !== (rec && rec.id) && String(s.indexCode || '').toLowerCase() === code.toLowerCase(); });
      if (dup) err['head.indexCode'] = '索引碼「' + code + '」已存在，請改用其他索引碼';
    }
    var s1 = draft.items.s1;
    if (!$.trim(s1.nameZh) && !$.trim(s1.nameEn)) {
      err['s1.nameZh'] = '化學品中文名稱與英文名稱請至少填寫一項';
      err['s1.nameEn'] = '化學品中文名稱與英文名稱請至少填寫一項';
    }
    draft.items.s3.components.forEach(function (c, i) {
      if (compBlank(c)) return;
      if (!$.trim(c.nameZh) && !$.trim(c.nameEn)) err['s3.' + i + '.name'] = '請至少填寫中文或英文名稱';
      var p = $.trim(c.percent);
      if (p) {
        var num = Number(p);
        if (!/^\d+(\.\d+)?$/.test(p) || isNaN(num) || num < 0 || num > 100) err['s3.' + i + '.percent'] = '含量需為 0～100 的數字';
      }
    });
    return err;
  }

  function showErrors(err) {
    errors = err;
    var first = null;
    for (var i = 1; i <= 16 && !first; i++) {
      if (Object.keys(err).some(function (k) { return k.indexOf('s' + i + '.') === 0; })) first = i;
    }
    if (first) { curSec = first; }
    renderNav();
    renderPanel();
    var hasHead = !!err['head.indexCode'];
    $('#sds-head .form-field').toggleClass('has-error', false);
    renderHead();
    var $f = hasHead && !first ? $('#h-index') : $panel.find('.has-error input, .has-error textarea').first();
    if (!$f.length) $f = $('#h-index');
    $f.trigger('focus');
    var el = $f[0];
    if (el && el.scrollIntoView) el.scrollIntoView({ block: 'center' });
    App.toast('請修正標示的欄位' + (first ? '（已切換到第 ' + first + ' 項）' : ''), 'error');
  }

  // 回傳 true 表示儲存成功
  function doSave() {
    if (!App.requireWrite()) return false;
    var err = validate();
    if (Object.keys(err).length) { showErrors(err); return false; }
    errors = {};
    var items = JSON.parse(JSON.stringify(draft.items));
    items.s3.components = items.s3.components.filter(function (c) { return !compBlank(c); });
    trimItems(items);
    var comps = items.s3.components;
    var data = {
      indexCode: $.trim(draft.indexCode), status: draft.status, pdfFiles: JSON.parse(JSON.stringify(draft.pdfFiles)),
      issueDate: draft.issueDate, items: items, toxMatches: Store.matchGovTox(comps)
    };
    if (mode === 'new') {
      data.schoolId = schoolId;
      rec = Store.add('sdsList', data);
      id = rec.id;
    } else {
      rec = Store.update('sdsList', rec.id, data);
    }
    dirty = false;
    hideParseBanner();
    return true;
  }

  function syncUrl() {
    if (mode !== 'edit') return;
    try { history.replaceState(null, '', App.pageUrl('sds-form', { mode: 'edit', id: id, section: curSec })); } catch (e) { /* ignore */ }
  }

  $('#sds-actions').on('click', '#btn-save', function () {
    var wasNew = mode === 'new';
    if (!doSave()) return;
    App.flash(wasNew ? '已新增 SDS「' + (sdsName() || draft.indexCode) + '」' : '已儲存 SDS（十六項全部儲存）', 'success');
    location.href = listUrl;
  });
  // 只切換到下一項，不儲存、不清草稿
  $('#sds-actions').on('click', '#btn-next', function () {
    if (curSec < 16) gotoSection(curSec + 1);
  });
  $('#sds-actions').on('click', '#btn-cancel', function () {
    if (!dirty) { location.href = listUrl; return; }
    App.confirm('尚有未儲存的變更，確定要離開嗎？變更將會遺失。', { title: '放棄變更', okText: '離開', cancelText: '繼續編輯', danger: true }).then(function (ok) {
      if (ok) location.href = listUrl;
    });
  });
  $('#sds-actions').on('click', '#btn-back', function () { location.href = listUrl; });
  $('#sds-actions').on('click', '#btn-to-edit', function () {
    if (App.requireWrite()) location.href = App.pageUrl('sds-form', { mode: 'edit', id: id, section: curSec });
  });
  $('#sds-actions').on('click', '#btn-delete', function () {
    if (!App.requireWrite()) return;
    var refs = Store.get('chemicals').filter(function (c) { return c.sdsId === rec.id; });
    var name = Store.sdsDisplayName(rec) || rec.indexCode;
    if (refs.length) {
      notice('無法刪除', '此 SDS（' + name + '）已被化學品引用，不可刪除。請先解除化學品與 SDS 的關聯。\n被引用：' +
        refs.map(function (c) { return c.nameZh || c.id; }).join('、'));
      return;
    }
    App.confirm('確定要刪除 SDS「' + name + '」（' + rec.indexCode + '）嗎？此動作無法復原。', { title: '刪除 SDS', okText: '刪除', danger: true }).then(function (ok) {
      if (!ok) return;
      Store.remove('sdsList', rec.id);
      dirty = false;
      App.toast('已刪除 SDS', 'success');
      setTimeout(function () { location.href = listUrl; }, 700);
    });
  });

  /* ---------- 啟動 ---------- */
  renderHead();
  renderActions();
  renderAll();
  if (App.qs('parse') === '1' && mode === 'new') {
    // T15：已進入解析流程，移除網址的 parse=1，避免重新整理時再次開啟解析 Dialog
    try { history.replaceState(null, '', App.pageUrl('sds-form', { mode: 'new' })); } catch (e) { /* ignore */ }
    openParse();
  }
});

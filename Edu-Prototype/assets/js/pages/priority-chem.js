/* 優先管理化學品查詢（V2-F06 §3～§4，V2-T06）。判定見 PLAN A-32：依示範摘錄清單與 SDS 成分濃度，非法規判定。
   以學校化學品為列（須有 SDS）；匯出為 V2-T07（三步驟 Dialog＋ODS，見 priority-export.js）。 */
$(document).on('app:ready', function () {
  'use strict';

  var esc = App.esc, schoolId = App.school.id;
  var SUBCATS = PriorityRules.SUBCATS;
  var PDF_LABEL = { yes: '有檔案', no: '無檔案' };
  var DEFAULTS = { pdf: '', status: '有效', subs: [], orgId: '', sub: true, from: '', to: '', keyword: '' };
  var applied = $.extend({}, DEFAULTS);
  var current = [];

  var plist = Store.get('govPriorityList') || { version: '', items: [] };
  $('#pri-notice').html('<span class="poc-badge">示範判定</span>依示範摘錄清單（版本 ' + esc(plist.version) +
    '）與 SDS 成分濃度判定，非法規判定；混合物匯出時每個危害成分一列，匯出列數與此清單筆數不同。');

  /* ---------- 條件區 ---------- */
  function orgOptions() {
    var all = Store.get('orgs').filter(function (o) { return o.schoolId === schoolId; });
    var html = '<option value="">全部</option>';
    (function walk(pid, depth) {
      all.filter(function (o) { return (o.parentId || null) === pid; })
        .sort(function (a, b) { return (a.sort || 0) - (b.sort || 0); })
        .forEach(function (o) {
          html += '<option value="' + o.id + '">' + new Array(depth + 1).join('　') + esc(o.name) + '</option>';
          walk(o.id, depth + 1);
        });
    })(null, 0);
    return html;
  }
  $('#q-org').html(orgOptions());
  $('#q-subcats').html(SUBCATS.map(function (s) {
    return '<label class="chk-inline"><input type="checkbox" class="q-subcat" value="' + s[0] + '">' + esc(s[1]) + '</label>';
  }).join(''));

  function readForm() {
    return {
      pdf: $('#q-pdf').val(), status: $('#q-status').val(),
      subs: $('.q-subcat:checked').map(function () { return $(this).val(); }).get(),
      orgId: $('#q-org').val(), sub: $('#q-sub').prop('checked'),
      from: $('#q-from').val(), to: $('#q-to').val(), keyword: $.trim($('#q-keyword').val())
    };
  }
  function resetForm() {
    $('#q-pdf').val(DEFAULTS.pdf); $('#q-status').val(DEFAULTS.status); $('.q-subcat').prop('checked', false);
    $('#q-org').val(''); $('#q-sub').prop('checked', true); $('#q-from, #q-to, #q-keyword').val('');
  }
  function subLabel(key) { return SUBCATS.filter(function (s) { return s[0] === key; })[0][1]; }

  // 條件摘要：只列非「全部」的條件
  function summaryText(q) {
    var parts = [];
    if (q.status) parts.push('狀態：' + q.status);
    if (q.pdf) parts.push('SDS 檔案：' + PDF_LABEL[q.pdf]);
    if (q.subs.length) parts.push('子分類：' + SUBCATS.filter(function (s) { return q.subs.indexOf(s[0]) >= 0; })
      .map(function (s) { return s[1].replace('第二條', ''); }).join('、'));
    if (q.orgId) { var o = Store.getById('orgs', q.orgId); parts.push('組織：' + (o ? o.name : '') + (q.sub ? '（含下層）' : '')); }
    if (q.from || q.to) parts.push('更新日期：' + (q.from || '…') + '～' + (q.to || '…'));
    if (q.keyword) parts.push('關鍵字：' + q.keyword);
    return parts.length ? parts.join('｜') : '無條件（全部）';
  }

  /* ---------- 資料 ---------- */
  function norm(v) { return String(v || '').replace(/\s+/g, '').toLowerCase(); }
  function chemName(c) { return c.nameZh && c.nameEn ? c.nameZh + ' (' + c.nameEn + ')' : (c.nameZh || c.nameEn || ''); }

  // 同校、有 SDS 的化學品，附其 SDS 與子分類判定；任一子分類 hit 或 unknown 才算候選
  function candidates() {
    var out = [];
    Store.get('chemicals').forEach(function (c) {
      if (c.schoolId !== schoolId || !c.hasSds || !c.sdsId) return;
      var s = Store.getById('sdsList', c.sdsId);
      if (!s) return;
      var cl = Store.sdsPriorityClauses(s);
      var any = SUBCATS.some(function (k) { return cl[k[0]].hit || cl[k[0]].unknown; });
      if (any) out.push({ chem: c, sds: s, cl: cl });
    });
    return out;
  }

  function matches(r, q, scope) {
    var c = r.chem, s = r.sds;
    if (scope && scope.indexOf(c.orgId) < 0) return false;
    if (q.status && s.status !== q.status) return false;
    if (q.pdf === 'yes' && !Store.sdsPdfInfo(s).hasPdf) return false;
    if (q.pdf === 'no' && Store.sdsPdfInfo(s).hasPdf) return false;
    if (q.subs.length && !q.subs.some(function (k) { return r.cl[k].hit || r.cl[k].unknown; })) return false;
    var d = String(c.updatedAt || '').slice(0, 10);
    if (q.from && (!d || d < q.from)) return false;
    if (q.to && (!d || d > q.to)) return false;
    if (q.keyword) {
      var kw = norm(q.keyword);
      var cas = (((s.items.s3 || {}).components) || []).map(function (x) { return x.cas; }).join('\n');
      var hay = [c.nameZh, c.nameEn, Store.sdsDisplayName(s), cas].map(norm).join('\n');
      if (hay.indexOf(kw) < 0) return false;
    }
    return true;
  }

  function hazardIcons(s) {
    var names = (window.SdsSchema && SdsSchema.GHS_NAME) || {};
    var marks = {};
    ((window.SdsSchema && SdsSchema.GHS_PICTOGRAMS) || []).forEach(function (p) { marks[p.code] = p.mark; });
    return (((s.items.s2 || {}).pictograms) || []).map(function (p) {
      return '<span class="pri-ghs" title="' + esc(p + ' ' + (names[p] || '')) + '" data-ghs="' + esc(p) + '"><span>' + esc(marks[p] || p) + '</span></span>';
    }).join('');
  }

  /* ---------- 畫面 ---------- */
  function render() {
    var scope = applied.orgId ? (applied.sub ? Store.orgDescendants(applied.orgId) : [applied.orgId]) : null;
    current = candidates().filter(function (r) { return matches(r, applied, scope); })
      .sort(function (a, b) { return String(b.chem.updatedAt || '').localeCompare(String(a.chem.updatedAt || '')); });

    var $b = $('#pri-body').empty();
    if (!current.length) $b.append('<tr class="empty-row"><td colspan="8">查無符合條件的優先管理化學品</td></tr>');
    current.forEach(function (r) {
      var c = r.chem, s = r.sds;
      var $tr = $('<tr></tr>').attr('data-id', c.id);
      var $act = $('<td class="p-act"></td>');
      $act.append($('<a class="act-icon act-edit write-only" title="編輯">✏️</a>').attr('href', App.pageUrl('chem-form', { mode: 'edit', id: c.id })));
      $act.append($('<a class="act-icon act-view pri-view-only" title="檢視">🔍</a>').attr('href', App.pageUrl('chem-form', { mode: 'view', id: c.id })));
      $tr.append($act);
      $tr.append($('<td class="p-name"></td>').append($('<a class="btn-text-link"></a>')
        .attr('href', App.pageUrl('chem-form', { mode: 'view', id: c.id })).text(chemName(c))));
      var info = Store.sdsPdfInfo(s);
      var $sds = $('<td class="p-sds"></td>').append($('<a class="btn-text-link"></a>')
        .attr('href', App.pageUrl('sds-form', { mode: 'view', id: s.id })).text(Store.sdsDisplayName(s) || s.indexCode));
      if (info.hasPdf) $sds.append($('<span class="file-ok" title="SDS 檔案"></span>').attr('title', info.names.join('、')).text('✓'));
      $tr.append($sds);
      var $sub = $('<td class="p-sub"></td>'), unknownTips = [];
      SUBCATS.forEach(function (k) {
        var o = r.cl[k[0]];
        if (o.hit) $sub.append($('<span class="tag tag-pri"></span>').attr('data-cat', k[0]).attr('title', o.basis.join('、')).text(k[1]));
        if (o.unknown) unknownTips.push(k[1] + '：' + o.basis.join('、'));
      });
      if (unknownTips.length) $sub.append($('<span class="tag tag-warn" data-cat="unknown"></span>').attr('title', unknownTips.join('；')).text('濃度未填，待確認'));
      $tr.append($sub);
      $tr.append($('<td class="p-haz"></td>').html(hazardIcons(s)));
      $tr.append($('<td class="p-org"></td>').text(Store.orgPath(c.orgId)));
      $tr.append($('<td class="p-sup"></td>').text(c.supplierName || ''));
      $tr.append($('<td class="p-upd"></td>').text((c.updatedAt || '').slice(0, 16)));
      $b.append($tr);
    });

    var sdsIds = {};
    current.forEach(function (r) { sdsIds[r.sds.id] = 1; });
    var total = '共 ' + current.length + ' 筆（SDS ' + Object.keys(sdsIds).length + ' 份）';
    $('#list-total, #list-count').text(total);
    var parts = SUBCATS.map(function (k) {
      return k[1] + ' ' + current.filter(function (r) { return r.cl[k[0]].hit; }).length + ' 筆';
    });
    var nUnk = current.filter(function (r) { return SUBCATS.some(function (k) { return r.cl[k[0]].unknown; }); }).length;
    $('#pri-summary').text('符合化學品數（目前查詢結果）：' + parts.join('　｜　') + (nUnk ? '　｜　濃度未填待確認 ' + nUnk + ' 筆' : ''));
    $('#filter-summary').text('（' + summaryText(applied) + '）');
  }

  function doSearch() {
    applied = readForm();
    render();
    Audit.record({ module: '化學品管理', action: '查詢', summary: '查詢優先管理化學品：' + summaryText(applied) });
  }

  $('#btn-search').on('click', doSearch);
  $('#filter-panel input[type=text], #filter-panel input[type=date]').on('keydown', function (e) { if (e.key === 'Enter') doSearch(); });
  $('#btn-clear').on('click', function () { resetForm(); applied = readForm(); render(); });
  /* ---------- 匯出填報檔：三步驟（V2-T07，A-33） ---------- */
  var STEPS = ['說明', '數量來源', '確認'];
  function optHtml(sel) {
    return PriorityExport.QTY_OPTIONS.map(function (o) {
      return '<option value="' + o[0] + '"' + (o[0] === sel ? ' selected' : '') + '>' + esc(o[1]) + '</option>';
    }).join('');
  }
  function stepsHtml(n, skip) {
    return '<ol class="pri-steps">' + STEPS.map(function (t, i) {
      // V2-T09：略過路徑的第二步顯示為「已略過」而非已完成
      if (skip && i === 1 && n > 2) return '<li class="is-skip"><span class="pri-step-no">－</span>' + esc(t) + '（已略過）</li>';
      return '<li class="' + (i + 1 === n ? 'is-on' : (i + 1 < n ? 'is-done' : '')) + '"><span class="pri-step-no">' + (i + 1) + '</span>' + esc(t) + '</li>';
    }).join('') + '</ol>';
  }
  function exportOpts(st) {
    return { skip: st.skip, maxField: st.maxField, yearField: st.yearField, date: Store.today() };
  }

  function stepBody(st) {
    var h = stepsHtml(st.step, st.skip);
    if (st.step === 1) {
      h += '<div class="pri-exp">' +
        '<h4>系統已依下列條件篩選</h4><ul>' +
        '<li>目前查詢條件：' + esc(summaryText(applied)) + '（共 ' + current.length + ' 筆化學品）</li>' +
        '<li>子分類判定依據：示範摘錄清單版本 ' + esc(plist.version) + '；第一款濃度 &gt;1%、第二款濃度 ≥1%、第三款以 SDS 整體具 GHS 危害判定（展示假設，非法規判定）。</li></ul>' +
        '<h4>系統尚未判斷</h4><ul>' +
        '<li>第二款非 CMR 第一級的年運作量門檻</li><li>第三款的最大運作總量臨界量</li>' +
        '<li>運作行為代碼、物理狀態代碼、暴露工作者人數（這些欄位將留白供補填）</li></ul>' +
        '<h4>匯出後需補填</h4><ul><li>D 物理狀態代碼、E 運作用途說明、G 最大運作行為代碼、I 年運作行為代碼、J 暴露工作者人數、K 有／無未滿 18 歲、女性之工作者。</li><li>危害分類代碼為依 SDS 分類從嚴自動帶入（示範對照），請自行核對。</li></ul>' +
        '<p class="pri-exp-note">混合物依危害成分拆列，匯出列數與化學品筆數不同。</p></div>';
    } else if (st.step === 2) {
      h += '<div class="pri-exp"><div class="form-row"><label class="form-label" for="ex-year">年運作總量來源</label><div class="form-field"><select id="ex-year">' + optHtml(st.yearField) + '</select></div></div>' +
        '<div class="form-row"><label class="form-label" for="ex-max">最大運作總量來源</label><div class="form-field"><select id="ex-max">' + optHtml(st.maxField) + '</select></div></div>' +
        '<p class="pri-exp-note">年運作總量＝同一 SDS 引用的化學品所選數量加總 ×12，換算公噸；最大運作總量＝同一 SDS 引用的化學品所選數量加總，換算公噸。公斤、公克依質量換算；公升、毫升以密度 1 換算（展示假設 A-33）。</p></div>';
    } else {
      var res = PriorityExport.build(current, exportOpts(st)), s = res.stats, items = [];
      if (st.skip) {
        items.push('未設定數量來源，最大運作總量（F）與年運作總量（H）欄留白。');
        items.push('未判斷第二款非 CMR 年運作量門檻與第三款臨界量。');
      } else {
        items.push('年運作總量採「' + PriorityExport.optionLabel(st.yearField) + '」加總 ×12 換算公噸；未判斷第二款非 CMR 年運作量門檻。');
        items.push('最大運作總量採「' + PriorityExport.optionLabel(st.maxField) + '」加總換算公噸；第三款臨界量未自動判定。');
      }
      items.push('留白待補填欄位：物理狀態代碼、運作用途說明、最大運作行為代碼、年運作行為代碼、暴露工作者人數、有／無未滿 18 歲、女性之工作者。');
      if (!st.skip && s.densityChems.length) {
        items.push('以下 ' + s.densityChems.length + ' 筆以密度 1 換算：' + s.densityChems.map(function (d) { return d.name + '（' + d.unit + '）'; }).join('、') + '。');
      }
      if (!st.skip && s.unsupported.length) {
        items.push('以下 ' + s.unsupported.length + ' 筆單位無法換算公噸，不計入加總：' + s.unsupported.map(function (d) { return d.name + '（' + (d.unit || '無單位') + '）'; }).join('、') + '。');
      }
      items.push('輸出：ODS 檔（直接產生，三工作表），檔名 ' + res.filename + '；預計列數 ' + s.rowCount + '（依成分拆列）、涵蓋 SDS ' + s.sdsCount + ' 份、化學品 ' + s.chemCount + ' 筆。');
      h += '<div class="pri-exp"><ol class="pri-exp-sum">' + items.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ol>' +
        '<p class="pri-exp-note">匯出僅產生檔案，不代表已向教育部或其他機關報送。<span class="poc-badge">POC 模擬</span></p></div>';
    }
    return h;
  }

  function openExportDialog() {
    if (!current.length) { App.toast('目前查詢結果為空，無法匯出', 'warning'); return; }
    var st = { step: 1, skip: false, yearField: PriorityExport.DEFAULT_YEAR, maxField: PriorityExport.DEFAULT_MAX };
    var dlg = App.dialog({ title: '匯出優先管理化學品填報檔', width: 720, body: '', buttons: [] });
    var $foot = dlg.el.find('.dialog-foot');

    function btn(text, cls, fn) { return $('<button type="button" class="btn"></button>').addClass(cls).text(text).on('click', fn); }
    function show(step) {
      st.step = step;
      dlg.body.html(stepBody(st));
      $foot.empty();
      $foot.append(btn('取消', 'btn-secondary', function () { dlg.close(); }));
      if (step === 1) {
        $foot.append(btn('略過直接匯出', 'btn-secondary', function () { st.skip = true; show(3); }));
        $foot.append(btn('下一步', 'btn-primary', function () { st.skip = false; show(2); }));
      } else if (step === 2) {
        $foot.prepend(btn('上一頁', 'btn-secondary', function () { show(1); }));
        $foot.append(btn('最後一步', 'btn-primary', function () { show(3); }));
      } else {
        $foot.prepend(btn('上一頁', 'btn-secondary', function () { show(st.skip ? 1 : 2); }));
        $foot.append(btn('確認匯出', 'btn-primary', doExport));
      }
    }
    dlg.el.on('change', '#ex-year', function () { st.yearField = $(this).val(); });
    dlg.el.on('change', '#ex-max', function () { st.maxField = $(this).val(); });

    function doExport() {
      try {
        var res = PriorityExport.build(current, exportOpts(st));
        ExportUtil.workbookToFile(res.sheets, res.filename, 'ods');
        var ySrc = st.skip ? '未設定' : PriorityExport.optionLabel(st.yearField);
        var mSrc = st.skip ? '未設定' : PriorityExport.optionLabel(st.maxField);
        Audit.record({ module: '化學品管理', action: '匯出',
          summary: '匯出優先管理化學品填報檔 ' + res.stats.rowCount + ' 列（' + res.filename + '）；年運作＝' + ySrc + '，最大運作＝' + mSrc });
        App.toast('已匯出 ' + res.filename + '（共 ' + res.stats.rowCount + ' 列；僅產生檔案，不代表已報送）', 'success');
        dlg.close();
      } catch (e) {
        App.toast('匯出失敗：' + e.message, 'error');
      }
    }
    show(1);
  }

  $('#btn-export').on('click', openExportDialog);

  render();
});

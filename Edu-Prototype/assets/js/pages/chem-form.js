/* 化學品新增與維護（UI-10）：?mode=new|edit|view&id=。
   展示假設 A-10：有 SDS 時名稱與供應商由 SDS 帶入並唯讀，可「解除關聯改為手填」；A-11：單位選項公斤、公克、公升、毫升。
   無 SDS 的化學品不列入毒化物判斷。 */
$(document).on('app:ready', function () {
  'use strict';

  var schoolId = App.school.id;
  var mode = App.qs('mode') || 'view';
  var id = App.qs('id');
  var listUrl = App.menuUrl('chem');
  var rec = id ? Store.getById('chemicals', id) : null;
  var QTY = ['maxStore', 'avgStore', 'maxUse', 'avgUse'];
  var QTY_LABEL = { maxStore: '最大儲存量', avgStore: '平均儲存量', maxUse: '最大使用量', avgUse: '平均使用量' };
  var stash = { nameZh: '', nameEn: '', supplierName: '', supplierPhone: '', partNo: '' }; // 切回「有 SDS」前的手填內容

  function notice(title, msg, then) {
    App.dialog({ title: title, width: 440, body: '<p class="confirm-msg">' + App.esc(msg).replace(/\n/g, '<br>') + '</p>',
      buttons: [{ text: '我知道了', cls: 'btn-primary', onClick: function () { if (then) then(); } }], onClose: then });
  }

  if (['new', 'edit', 'view'].indexOf(mode) < 0) mode = 'view';
  if ((mode === 'new' || mode === 'edit') && !App.canWrite()) {
    $('#chem-card').hide();
    notice('不允許的操作', '唯讀使用者僅能檢視化學品，無法新增或修改。', function () {
      location.href = rec ? App.pageUrl('chem-form', { mode: 'view', id: id }) : listUrl;
    });
    return;
  }
  if (mode !== 'new' && !rec) {
    $('#chem-card').hide();
    notice('查無資料', '找不到指定的化學品，將回到清單。', function () { location.href = listUrl; });
    return;
  }

  function field(k) { return $('[data-f=' + k + ']'); }
  function inp(k) { return field(k).find('input:not([type=radio]),select,textarea').first(); }
  function setErr(k, msg) { field(k).toggleClass('has-error', !!msg).find('.form-error').first().text(msg || ''); }
  function hasSds() { return $('input[name=hasSds]:checked').val() === 'yes'; }
  function chemTitle(c) { return c.nameZh && c.nameEn ? c.nameZh + ' (' + c.nameEn + ')' : (c.nameZh || c.nameEn || ''); }

  /* ---------- 下拉：組織、SDS、位置 ---------- */
  (function () {
    var all = Store.get('orgs').filter(function (o) { return o.schoolId === schoolId; });
    var html = '<option value="">請選擇組織部門</option>';
    (function walk(pid, depth) {
      all.filter(function (o) { return (o.parentId || null) === pid; }).sort(function (a, b) { return (a.sort || 0) - (b.sort || 0); })
        .forEach(function (o) {
          html += '<option value="' + o.id + '">' + new Array(depth + 1).join('　') + App.esc(o.name) + '</option>';
          walk(o.id, depth + 1);
        });
    })(null, 0);
    inp('orgId').html(html);
  })();

  function buildSdsOptions(keepId) {
    var html = '<option value="">請選擇 SDS</option>';
    Store.get('sdsList').filter(function (s) { return s.schoolId === schoolId && (s.status === '有效' || s.id === keepId); })
      .sort(function (a, b) { return String(a.indexCode).localeCompare(String(b.indexCode)); })
      .forEach(function (s) {
        html += '<option value="' + s.id + '">' + App.esc(Store.sdsDisplayName(s) + ' (' + s.indexCode + ')' + (s.status === '有效' ? '' : '［停用］')) + '</option>';
      });
    inp('sdsId').html(html);
  }

  function buildPosOptions(k, kind) {
    var cur = inp(k).val();
    var html = '<option value="">--不綁定位置--</option>';
    PositionDialog.listFor(kind).forEach(function (p) { html += '<option value="' + p.id + '">' + App.esc(p.name) + '</option>'; });
    inp(k).html(html).val(cur);
    if (inp(k).val() !== cur) inp(k).val('');
  }
  function reloadPositions() { buildPosOptions('usePositionId', '使用'); buildPosOptions('storePositionId', '儲存'); }

  /* ---------- 來源摘要 ---------- */
  function toxItems(sds) {
    var gov = (Store.get('govToxList') || {}).items || [];
    var by = { nameZh: '中文名稱', nameEn: '英文名稱', cas: 'CAS' }, seen = {}, out = [];
    ((sds && sds.toxMatches) || []).forEach(function (m) {
      var key = m.listedNo + '-' + m.seriesNo;
      if (seen[key]) return;
      seen[key] = 1;
      var it = gov.filter(function (g) { return g.listedNo === m.listedNo && g.seriesNo === m.seriesNo; })[0];
      out.push(key + ' ' + (it ? it.nameZh : '') + '（以' + by[m.matchedBy] + '比對：' + m.matchedValue + '）');
    });
    return out;
  }
  function renderSummary() {
    var sds = Store.getById('sdsList', inp('sdsId').val());
    if (!hasSds() || !sds) { $('#row-src').prop('hidden', true); return; }
    var s1 = (sds.items && sds.items.s1) || {};
    var tox = toxItems(sds);
    var html = '<div class="src-title">所選 SDS 第一項：' + App.esc(sds.indexCode) + '（' + App.esc(sds.status) + '，' + (Store.sdsPdfInfo(sds).hasPdf ? '有檔案' : '無檔案') + '）</div>' +
      '<div class="src-row"><b>化學品名稱</b>' + App.esc(Store.sdsDisplayName(sds) || '—') + '</div>' +
      '<div class="src-row"><b>供應者名稱</b>' + App.esc(s1.supplierName || '—') + '</div>' +
      '<div class="src-row"><b>供應者電話</b>' + App.esc(s1.supplierPhone || '—') + '</div>' +
      '<div class="src-row"><b>毒化物識別結果</b>' + (tox.length
        ? '<span class="tag tag-danger">毒化物</span> <span class="src-tox-hit">命中 ' + tox.map(App.esc).join('、') + '</span>'
        : '非毒化物（未命中政府正面表列清單）') + '</div>';
    $('#src-panel').html(html);
    $('#src-extra').html(docsHtml(sds));
    $('#row-src').prop('hidden', false);
  }
  // 相關毒化物文件（經 SDS，T08）
  function docsHtml(sds) {
    var docs = Store.docsForSds(sds.id), today = App.today();
    var html = '<div class="src-panel src-docs"><div class="src-title">相關毒化物文件（經 SDS）</div>';
    if (!docs.length) return html + '<div class="muted">尚未綁定毒化物文件</div></div>';
    return html + '<ul class="src-doc-list">' + docs.map(function (d) {
      return '<li>' + App.esc(d.docType) + '　<a class="btn-text-link" href="' + App.pageUrl('tox-doc-form', { mode: 'view', id: d.id }) + '">' + App.esc(d.docNo) + '</a>' +
        '　有效期限 ' + App.esc(d.validUntil || '—') + (d.validUntil && d.validUntil < today ? ' <span class="tag tag-danger">已逾期</span>' : '') + '</li>';
    }).join('') + '</ul></div>';
  }

  /* ---------- 有／無 SDS 狀態切換 ---------- */
  function fillFromSds() {
    var sds = Store.getById('sdsList', inp('sdsId').val());
    var s1 = (sds && sds.items && sds.items.s1) || {};
    inp('nameZh').val(s1.nameZh || ''); inp('nameEn').val(s1.nameEn || '');
    inp('supplierName').val(s1.supplierName || ''); inp('supplierPhone').val(s1.supplierPhone || ''); inp('partNo').val(s1.partNo || '');
    ['nameZh', 'nameEn'].forEach(function (k) { setErr(k, ''); });
  }
  function applyState() {
    var yes = hasSds();
    var linked = yes && !!inp('sdsId').val();
    $('#row-sds').prop('hidden', !yes);
    $('#row-unlink').prop('hidden', !(linked && mode !== 'view'));
    $('#hint-nosds').prop('hidden', yes);
    ['nameZh', 'nameEn', 'supplierName', 'supplierPhone', 'partNo'].forEach(function (k) { inp(k).prop('readonly', yes); });
    $('#lb-nameZh, #lb-nameEn').toggleClass('required', !yes);
    renderSummary();
  }
  $('input[name=hasSds]').on('change', function () {
    if (hasSds()) {
      ['nameZh', 'nameEn', 'supplierName', 'supplierPhone', 'partNo'].forEach(function (k) { stash[k] = inp(k).val(); });
      fillFromSds();
    } else {
      // 改為手填：保留目前帶入的內容供修改；若先前有手填內容且尚未選 SDS 則還原
      if (!inp('sdsId').val()) ['nameZh', 'nameEn', 'supplierName', 'supplierPhone', 'partNo'].forEach(function (k) { if (stash[k]) inp(k).val(stash[k]); });
    }
    setErr('sdsId', '');
    applyState();
  });
  inp('sdsId').on('change', function () { setErr('sdsId', ''); fillFromSds(); applyState(); });
  $('#btn-unlink').on('click', function () {
    $('input[name=hasSds][value=no]').prop('checked', true);
    applyState();
    App.toast('已解除 SDS 關聯，名稱與供應商可手填（儲存後生效）', 'info');
    inp('nameZh').trigger('focus');
  });

  /* ---------- 單位 ---------- */
  function syncUnit() {
    var u = inp('unit').val();
    $('.unit-suffix').text(u || '單位');
  }
  inp('unit').on('change', function () { setErr('unit', ''); syncUnit(); });

  /* ---------- 帶入資料 ---------- */
  buildSdsOptions(rec && rec.sdsId);
  reloadPositions();
  if (rec) {
    inp('orgId').val(rec.orgId);
    $('input[name=hasSds][value=' + (rec.hasSds ? 'yes' : 'no') + ']').prop('checked', true);
    inp('sdsId').val(rec.sdsId || '');
    ['nameZh', 'nameEn', 'supplierName', 'supplierPhone', 'partNo', 'storeNote', 'operationNote'].forEach(function (k) { inp(k).val(rec[k] || ''); });
    inp('usePositionId').val(rec.usePositionId || ''); inp('storePositionId').val(rec.storePositionId || '');
    inp('unit').val(rec.unit || '');
    QTY.forEach(function (k) { inp(k).val(rec[k] === undefined || rec[k] === null ? '' : rec[k]); });
  } else {
    var u = App.user;
    inp('orgId').val(u && Store.getById('orgs', u.orgId) ? u.orgId : '');
  }
  syncUnit();
  applyState();

  $('.btn-pos').on('click', function () {
    if (!App.requireWrite()) return;
    PositionDialog.open({ onChange: reloadPositions });
  });

  /* ---------- 模式與標題 ---------- */
  var title = mode === 'new' ? '新增化學品' : (mode === 'edit' ? '編輯化學品' : '化學品檢視');
  $('body').attr('data-title', title);
  $('.page-title').text(title);
  $('.breadcrumb .current').text(title);
  document.title = title + ' - 教育部化學雲';

  if (mode === 'view') {
    var viewUnit = rec ? (rec.unit || '') : '';
    $('#chem-card .form-field').each(function () {
      var $f = $(this), k = $f.attr('data-f');
      var $val = $('<div class="view-value"></div>'), text = '';
      if (k === 'hasSds') text = hasSds() ? '有' : '無';
      else if (k === 'sdsId') {
        var s = Store.getById('sdsList', inp('sdsId').val());
        text = s ? Store.sdsDisplayName(s) + ' (' + s.indexCode + ')' : '';
      } else {
        var $in = $f.find('input:not([type=radio]),select,textarea').first();
        if (!$in.length) return;
        text = $in.is('select') ? $in.find('option:selected').text().replace(/^[　\s]+/, '') : $in.val();
        if ($in.is('select') && !$in.val()) text = '';
        if (QTY.indexOf(k) >= 0 && text !== '') text += ' ' + viewUnit;
      }
      $f.closest('.form-row').find('.form-label').removeClass('required');
      if (text) $val.text(text); else $val.html('<span class="muted">—</span>');
      $f.children().not('.hint-gray').remove();
      $f.prepend($val);
    });
    $('#lb-nameZh, #lb-nameEn').removeClass('required');
    $('#btn-save').remove();
    $('.btn-pos').remove();
    $('#row-unlink').remove();
    $('#qty-note').text('最大／平均量為管理設定值，不等同實際結存；每日用量必須使用此處設定的單位');
    $('#btn-cancel').text('返回清單');
    $('#hint-nosds').prop('hidden', hasSdsRec());
  }
  function hasSdsRec() { return !!(rec && rec.hasSds); }

  /* ---------- 儲存 ---------- */
  function num(k) {
    var raw = $.trim(inp(k).val());
    if (raw === '') return { v: '' };
    var n = Number(raw);
    if (isNaN(n) || n < 0) return { err: QTY_LABEL[k] + '須為大於或等於 0 的數值' };
    return { v: n };
  }

  function save() {
    if (!App.requireWrite()) return;
    var yes = hasSds();
    var v = {
      orgId: inp('orgId').val(), hasSds: yes, sdsId: yes ? inp('sdsId').val() : '',
      nameZh: $.trim(inp('nameZh').val()), nameEn: $.trim(inp('nameEn').val()),
      supplierName: $.trim(inp('supplierName').val()), supplierPhone: $.trim(inp('supplierPhone').val()), partNo: $.trim(inp('partNo').val()),
      usePositionId: inp('usePositionId').val(), storePositionId: inp('storePositionId').val(),
      storeNote: $.trim(inp('storeNote').val()), operationNote: $.trim(inp('operationNote').val()), unit: inp('unit').val()
    };
    var err = {};
    if (!v.orgId || !Store.getById('orgs', v.orgId)) err.orgId = '請選擇組織部門';
    if (yes && !v.sdsId) err.sdsId = '請選擇 SDS';
    if (!yes && !v.nameZh && !v.nameEn) err.nameZh = '中文名稱與英文名稱請至少填寫一項';
    if (!v.unit) err.unit = '請選擇數值單位';
    QTY.forEach(function (k) { var r = num(k); if (r.err) err[k] = r.err; else v[k] = r.v; });
    ['orgId', 'sdsId', 'nameZh', 'unit'].concat(QTY).forEach(function (k) { setErr(k, err[k]); });
    var first = Object.keys(err)[0];
    if (first) { inp(first).trigger('focus'); return; }
    if (yes) {
      var s1 = (Store.getById('sdsList', v.sdsId).items || {}).s1 || {};
      v.partNo = s1.partNo || '';
    }
    if (mode === 'new') {
      v.schoolId = schoolId;
      Store.add('chemicals', v, 'CH');
      App.flash('已新增化學品「' + chemTitle(v) + '」', 'success');
    } else {
      Store.update('chemicals', rec.id, v);
      App.flash('已儲存化學品「' + chemTitle(v) + '」', 'success');
    }
    location.href = listUrl;
  }

  $('#btn-save').on('click', save);
  $('#btn-cancel').on('click', function () { location.href = listUrl; });
  $('#chem-card').on('input change', 'input,select,textarea', function () {
    var k = $(this).closest('[data-f]').attr('data-f');
    if (k && k !== 'hasSds') setErr(k, '');
    if (k === 'nameEn') setErr('nameZh', '');
  });
});

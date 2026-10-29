/* 毒化物文件新增與修改（UI-15、UI-16）：?mode=new|edit|view&id=。
   物質與 SDS 先存記憶體草稿，按「儲存」才寫入 Store（同 PLAN 多項目表單慣例）。
   展示假設 A-14：附件只記錄檔名；文件編號同校唯一；濃度 0～100 且下限 ≤ 上限。 */
$(document).on('app:ready', function () {
  'use strict';

  var schoolId = App.school.id;
  var mode = App.qs('mode') || 'view';
  var id = App.qs('id');
  var listUrl = App.menuUrl('tox-doc');
  var rec = id ? Store.getById('toxDocuments', id) : null;
  var FIELDS = ['orgId', 'docType', 'docNo', 'validUntil', 'controlNo', 'operatorName', 'operatorAddress', 'operatorPhone', 'siteName', 'siteAddress', 'sitePhone'];
  var UNITS = ['公斤', '公克', '公升', '毫升'];
  var draft = { substances: [], sdsIds: [], attachmentName: '' };
  var dirty = false;

  function notice(title, msg, then) {
    App.dialog({ title: title, width: 440, body: '<p class="confirm-msg">' + App.esc(msg).replace(/\n/g, '<br>') + '</p>',
      buttons: [{ text: '我知道了', cls: 'btn-primary', onClick: function () { if (then) then(); } }], onClose: then });
  }

  if (['new', 'edit', 'view'].indexOf(mode) < 0) mode = 'view';
  if ((mode === 'new' || mode === 'edit') && !App.canWrite()) {
    $('#doc-card').hide();
    notice('不允許的操作', '唯讀使用者僅能檢視毒化物文件，無法新增或修改。', function () {
      location.href = rec ? App.pageUrl('tox-doc-form', { mode: 'view', id: id }) : listUrl;
    });
    return;
  }
  if (mode !== 'new' && !rec) {
    $('#doc-card').hide();
    notice('查無資料', '找不到指定的毒化物文件，將回到清單。', function () { location.href = listUrl; });
    return;
  }

  function field(k) { return $('[data-f=' + k + ']'); }
  function inp(k) { return field(k).find('input,select,textarea').first(); }
  function setErr(k, msg) { field(k).toggleClass('has-error', !!msg).find('.form-error').first().text(msg || ''); }
  function markDirty() { if (mode === 'view') return; dirty = true; $('#dirty-flag').prop('hidden', false); }

  function govItems() { return (Store.get('govToxList') || {}).items || []; }
  function govItem(s) {
    return govItems().filter(function (g) { return g.listedNo === s.listedNo && g.seriesNo === s.seriesNo; })[0] || null;
  }
  function govLabel(g) { return g.listedNo + '-' + g.seriesNo + ' ' + g.nameZh + ' ' + g.nameEn + ' ' + (g.cas || []).join(' / '); }
  function subKey(s) { return s.listedNo + '-' + s.seriesNo; }

  /* ---------- 組織下拉 ---------- */
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

  /* ---------- 帶入資料 ---------- */
  if (rec) {
    FIELDS.forEach(function (k) { inp(k).val(rec[k] || ''); });
    draft.substances = JSON.parse(JSON.stringify(rec.substances || []));
    draft.sdsIds = (rec.sdsIds || []).slice();
    draft.attachmentName = rec.attachmentName || '';
  } else {
    var u = App.user;
    inp('orgId').val(u && Store.getById('orgs', u.orgId) ? u.orgId : '');
    ['operatorName', 'siteName'].forEach(function (k) { inp(k).val(App.school.name || ''); });
  }

  /* ---------- 附件 ---------- */
  function renderAtt() {
    $('#att-name').html(draft.attachmentName ? '' : '<span class="muted">尚未選擇檔案</span>').append(draft.attachmentName ? document.createTextNode(draft.attachmentName) : '');
    $('#att-remove').prop('hidden', !draft.attachmentName);
  }
  $('#att-file').on('change', function () {
    var f = this.files && this.files[0];
    this.value = '';
    if (!f) return;
    if (!/\.pdf$/i.test(f.name)) { setErr('attachmentName', '附件以 PDF 為主，請選擇 .pdf 檔案'); return; }
    setErr('attachmentName', '');
    draft.attachmentName = f.name;
    markDirty();
    renderAtt();
  });
  $('#att-remove').on('click', function () {
    if (!App.requireWrite()) return;
    draft.attachmentName = '';
    markDirty();
    renderAtt();
  });

  /* ---------- 涵蓋物質表格 ---------- */
  function renderSubs() {
    var $b = $('#sub-body').empty();
    var cols = mode === 'view' ? 5 : 7;
    if (!draft.substances.length) $b.append('<tr class="empty-row"><td colspan="' + cols + '">尚未加入毒化物</td></tr>');
    draft.substances.forEach(function (s, i) {
      var g = govItem(s);
      var $tr = $('<tr></tr>');
      $tr.append($('<td class="c-no"></td>').text(subKey(s)));
      $tr.append($('<td class="c-nm"></td>').text(g ? g.nameZh : '（清單查無此物質）'));
      $tr.append($('<td class="c-cas"></td>').text(g && g.cas && g.cas.length ? g.cas.join('、') : '—'));
      $tr.append($('<td class="c-conc"></td>').text(s.concLow + ' ～ ' + s.concHigh));
      $tr.append($('<td class="c-u"></td>').text(s.unit || '—'));
      if (mode !== 'view') {
        $tr.append($('<td class="col-act2 write-only"></td>').append($('<button type="button" class="act-icon act-sub-edit" title="修改">✏️</button>').attr('data-i', i)));
        $tr.append($('<td class="col-act2 write-only"></td>').append($('<button type="button" class="act-icon act-sub-del" title="移除">🗑️</button>').attr('data-i', i)));
      }
      $b.append($tr);
    });
    if (draft.substances.length) $('#err-subs').text('');
  }
  $('#sub-body').on('click', '.act-sub-edit', function () { if (App.requireWrite()) openSubDialog(parseInt($(this).attr('data-i'), 10)); });
  $('#sub-body').on('click', '.act-sub-del', function () {
    if (!App.requireWrite()) return;
    var i = parseInt($(this).attr('data-i'), 10), s = draft.substances[i], g = govItem(s);
    App.confirm('確定要移除物質「' + subKey(s) + ' ' + (g ? g.nameZh : '') + '」嗎？（按「儲存」後才會寫入文件）', { title: '移除物質', okText: '移除', danger: true }).then(function (ok) {
      if (!ok) return;
      draft.substances.splice(i, 1);
      markDirty();
      renderSubs();
    });
  });
  $('#btn-sub-add').on('click', function () { if (App.requireWrite()) openSubDialog(null); });

  /* ---------- UI-16 新增物質 Dialog ---------- */
  function openSubDialog(idx) {
    var editing = idx !== null && idx !== undefined;
    var cur = editing ? draft.substances[idx] : null;
    var picked = cur ? { listedNo: cur.listedNo, seriesNo: cur.seriesNo } : null;
    var html =
      '<div class="sub-dlg">' +
      '<div class="form-row"><label class="form-label required">毒化物列管編號-序號</label><div class="form-field" data-d="sub"><div class="sub-search"><input type="text" id="d-q" autocomplete="off" placeholder="輸入中文名、英文名、CAS 或列管編號搜尋"><div class="sub-opts" id="d-opts" hidden></div></div><div class="form-error"></div></div></div>' +
      '<div class="form-row"><label class="form-label required">濃度 w/w %</label><div class="form-field" data-d="conc"><div class="conc-line"><input type="number" id="d-low" min="0" max="100" step="any" placeholder="下限"><span>～</span><input type="number" id="d-high" min="0" max="100" step="any" placeholder="上限"></div><div class="form-error"></div></div></div>' +
      '<div class="form-row"><label class="form-label required">單位</label><div class="form-field" data-d="unit"><select id="d-unit"><option value="">請選擇單位</option>' +
      UNITS.map(function (u) { return '<option>' + u + '</option>'; }).join('') + '</select><div class="form-error"></div></div></div>' +
      '</div>';
    var dlg = App.dialog({
      title: editing ? '修改物質' : '新增物質', width: 600, body: html,
      buttons: [
        { text: '儲存', cls: 'btn-primary', onClick: function () { return save(); } },
        { text: '取消', cls: 'btn-secondary' }
      ]
    });
    var $b = dlg.body;
    function dErr(k, msg) { var $f = $b.find('[data-d=' + k + ']'); $f.toggleClass('has-error', !!msg).find('.form-error').text(msg || ''); }
    function isDup(g) {
      return draft.substances.some(function (s, i) { return i !== idx && s.listedNo === g.listedNo && s.seriesNo === g.seriesNo; });
    }
    function showOpts() {
      var q = $.trim($b.find('#d-q').val()).toLowerCase();
      var list = govItems().filter(function (g) { return !q || govLabel(g).toLowerCase().indexOf(q) >= 0; });
      var $o = $b.find('#d-opts').empty();
      if (!list.length) $o.append('<div class="sub-empty">查無符合的政府毒化物清單物質</div>');
      list.forEach(function (g) {
        var $it = $('<div class="sub-opt"></div>').text(govLabel(g)).attr('data-key', g.listedNo + '-' + g.seriesNo);
        if (isDup(g)) { $it.addClass('dup').append(' （已加入）'); }
        $o.append($it);
      });
      $o.prop('hidden', false);
    }
    $b.find('#d-q').on('input focus', function (e) {
      if (e.type === 'input') { picked = null; dErr('sub', ''); }
      showOpts();
    });
    $b.on('mousedown', '.sub-opt', function (e) {
      e.preventDefault();
      var key = $(this).attr('data-key').split('-');
      var g = govItems().filter(function (x) { return x.listedNo === key[0] && x.seriesNo === key[1]; })[0];
      picked = { listedNo: g.listedNo, seriesNo: g.seriesNo };
      $b.find('#d-q').val(govLabel(g));
      $b.find('#d-opts').prop('hidden', true);
      dErr('sub', '');
    });
    $b.on('click', function (e) { if (!$(e.target).closest('.sub-search').length) $b.find('#d-opts').prop('hidden', true); });
    $b.find('#d-low, #d-high').on('input', function () { dErr('conc', ''); });
    $b.find('#d-unit').on('change', function () { dErr('unit', ''); });
    if (cur) {
      $b.find('#d-q').val(govLabel(govItem(cur) || { listedNo: cur.listedNo, seriesNo: cur.seriesNo, nameZh: '', nameEn: '', cas: [] }));
      $b.find('#d-low').val(cur.concLow); $b.find('#d-high').val(cur.concHigh); $b.find('#d-unit').val(cur.unit);
    }

    function save() {
      var err = {};
      var g = picked ? govItem(picked) : null;
      if (!g) err.sub = '請從清單選取毒化物';
      else if (isDup(g)) err.sub = '此物質（' + g.listedNo + '-' + g.seriesNo + ' ' + g.nameZh + '）已在文件中，不可重複加入';
      var lowRaw = $.trim($b.find('#d-low').val()), highRaw = $.trim($b.find('#d-high').val());
      var low = Number(lowRaw), high = Number(highRaw);
      if (lowRaw === '' || highRaw === '') err.conc = '請輸入濃度下限與上限';
      else if (isNaN(low) || isNaN(high) || low < 0 || high > 100 || low > 100 || high < 0) err.conc = '濃度須介於 0～100 之間';
      else if (low > high) err.conc = '濃度下限不可大於上限';
      var unit = $b.find('#d-unit').val();
      if (!unit) err.unit = '請選擇單位';
      ['sub', 'conc', 'unit'].forEach(function (k) { dErr(k, err[k]); });
      if (Object.keys(err).length) {
        if (err.sub) $b.find('#d-q').trigger('focus'); else if (err.conc) $b.find('#d-low').trigger('focus'); else $b.find('#d-unit').trigger('focus');
        return false;
      }
      var item = { listedNo: g.listedNo, seriesNo: g.seriesNo, concLow: low, concHigh: high, unit: unit };
      if (editing) draft.substances[idx] = item; else draft.substances.push(item);
      markDirty();
      renderSubs();
      return true;
    }
  }

  /* ---------- 涵蓋 SDS ---------- */
  function sdsList() { return Store.get('sdsList').filter(function (s) { return s.schoolId === schoolId; }); }
  function toxTag(s) {
    return s && s.toxMatches && s.toxMatches.length ? '<span class="tag tag-danger">毒化物</span>' : '<span class="dim">—</span>';
  }
  function renderSds() {
    var $b = $('#sds-body').empty();
    var cols = mode === 'view' ? 3 : 4;
    if (!draft.sdsIds.length) $b.append('<tr class="empty-row"><td colspan="' + cols + '">尚未選取 SDS</td></tr>');
    draft.sdsIds.forEach(function (sid, i) {
      var s = Store.getById('sdsList', sid);
      var $tr = $('<tr></tr>');
      $tr.append($('<td class="c-nm"></td>').text(s ? Store.sdsDisplayName(s) : sid));
      $tr.append($('<td class="c-idx"></td>').text(s ? s.indexCode : '—'));
      $tr.append($('<td class="c-tox"></td>').html(toxTag(s)));
      if (mode !== 'view') $tr.append($('<td class="col-act2 write-only"></td>').append($('<button type="button" class="act-icon act-sds-del" title="移除">🗑️</button>').attr('data-i', i)));
      $b.append($tr);
    });
  }
  $('#sds-body').on('click', '.act-sds-del', function () {
    if (!App.requireWrite()) return;
    draft.sdsIds.splice(parseInt($(this).attr('data-i'), 10), 1);
    markDirty();
    renderSds();
  });

  $('#btn-sds-pick').on('click', function () {
    if (!App.requireWrite()) return;
    var docs = Store.get('toxDocuments').filter(function (d) { return d.schoolId === schoolId && d.id !== (rec && rec.id); });
    var html = '<div class="sds-dlg"><table class="sds-pick-table"><thead><tr><th></th><th>名稱</th><th>索引碼</th><th>毒化物識別</th><th>已被哪些文件涵蓋</th></tr></thead><tbody>';
    var list = sdsList().sort(function (a, b) { return String(a.indexCode).localeCompare(String(b.indexCode)); });
    list.forEach(function (s) {
      var cov = docs.filter(function (d) { return (d.sdsIds || []).indexOf(s.id) >= 0; });
      html += '<tr><td><input type="checkbox" class="pick-sds" value="' + s.id + '"' + (draft.sdsIds.indexOf(s.id) >= 0 ? ' checked' : '') + ' aria-label="選取 ' + App.esc(s.indexCode) + '"></td>' +
        '<td>' + App.esc(Store.sdsDisplayName(s)) + (s.status === '有效' ? '' : ' <span class="tag tag-off">停用</span>') + '</td>' +
        '<td>' + App.esc(s.indexCode) + '</td><td>' + toxTag(s) + '</td><td>' +
        (cov.length ? '<ul class="covered">' + cov.map(function (d) { return '<li>' + App.esc(d.id) + '（' + App.esc(d.docNo) + '）</li>'; }).join('') + '</ul>' : '<span class="dim">尚未被文件涵蓋</span>') +
        '</td></tr>';
    });
    if (!list.length) html += '<tr><td colspan="5" class="dim">本校尚無 SDS</td></tr>';
    html += '</tbody></table><div class="dlg-note">同一 SDS 可對應多份文件；文件數不影響庫存與運作次數</div></div>';
    App.dialog({
      title: '選取 SDS', width: 780, body: html,
      buttons: [
        { text: '確定', cls: 'btn-primary', onClick: function (api) {
          var picked = api.body.find('.pick-sds:checked').map(function () { return $(this).val(); }).get();
          draft.sdsIds = picked;
          markDirty();
          renderSds();
        } },
        { text: '取消', cls: 'btn-secondary' }
      ]
    });
  });

  /* ---------- 模式與標題 ---------- */
  var title = mode === 'new' ? '新增毒化物文件' : (mode === 'edit' ? '編輯毒化物文件' : '毒化物文件檢視');
  $('body').attr('data-title', title);
  $('.page-title').text(title);
  $('.breadcrumb .current').text(title);
  document.title = title + ' - 教育部化學雲';

  renderAtt();
  renderSubs();
  renderSds();

  if (mode === 'view') {
    $('#doc-card .form-field').each(function () {
      var $f = $(this), k = $f.attr('data-f');
      if (!k || k === 'attachmentName') return;
      var $in = $f.find('input,select,textarea').first();
      if (!$in.length) return;
      var text = $in.is('select') ? $in.find('option:selected').text().replace(/^[　\s]+/, '') : $in.val();
      if ($in.is('select') && !$in.val()) text = '';
      $f.closest('.form-row').find('.form-label').removeClass('required');
      var $val = $('<div class="view-value"></div>');
      if (text) $val.text(text); else $val.html('<span class="muted">—</span>');
      $f.children().remove();
      $f.append($val);
    });
    var $att = field('attachmentName');
    $att.find('.att-line .write-only, .hint-gray, .form-error').remove();
    if (!draft.attachmentName) $('#att-name').html('<span class="muted">—</span>');
    $('.sec-bar, #btn-save, #dirty-flag').remove();
    $('#doc-card th.col-act2').remove();
    $('#btn-cancel').text('返回清單');
    $('#btn-to-edit').prop('hidden', false);
  }

  /* ---------- 儲存 ---------- */
  function save() {
    if (!App.requireWrite()) return;
    var v = {};
    FIELDS.forEach(function (k) { v[k] = $.trim(inp(k).val()); });
    var err = {};
    if (!v.orgId || !Store.getById('orgs', v.orgId)) err.orgId = '請選擇組織部門';
    if (!v.docType) err.docType = '請選擇文件類型';
    if (!v.docNo) err.docNo = '請輸入文件編號';
    else if (Store.get('toxDocuments').some(function (d) { return d.schoolId === schoolId && d.docNo === v.docNo && d.id !== (rec && rec.id); })) err.docNo = '文件編號已存在（同校不可重複）';
    if (!v.validUntil) err.validUntil = '請選擇有效期限';
    ['orgId', 'docType', 'docNo', 'validUntil'].forEach(function (k) { setErr(k, err[k]); });
    var first = Object.keys(err)[0];
    if (first) { inp(first).trigger('focus'); return; }
    v.attachmentName = draft.attachmentName;
    v.substances = draft.substances;
    v.sdsIds = draft.sdsIds;
    if (mode === 'new') {
      v.schoolId = schoolId;
      Store.add('toxDocuments', v, 'DOC');
      App.flash('已新增毒化物文件「' + v.docNo + '」', 'success');
    } else {
      Store.update('toxDocuments', rec.id, v);
      App.flash('已儲存毒化物文件「' + v.docNo + '」', 'success');
    }
    dirty = false;
    location.href = listUrl;
  }

  $('#btn-save').on('click', save);
  $('#btn-cancel').on('click', function () {
    if (mode === 'view' || !dirty) { location.href = listUrl; return; }
    App.confirm('尚未儲存的變更將會遺失，確定要離開嗎？', { title: '放棄變更', okText: '離開', danger: true }).then(function (ok) { if (ok) location.href = listUrl; });
  });
  $('#btn-to-edit').on('click', function () { if (App.requireWrite()) location.href = App.pageUrl('tox-doc-form', { mode: 'edit', id: id }); });
  $('#doc-card').on('input change', '[data-f] input:not([type=file]),[data-f] select', function () {
    var k = $(this).closest('[data-f]').attr('data-f');
    if (k) setErr(k, '');
    markDirty();
  });
});

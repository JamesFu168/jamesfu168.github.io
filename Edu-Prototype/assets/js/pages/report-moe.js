/* 教育部批次申報格式匯出（UI-23）與匯出前資料確認 Dialog（UI-24）。
   匯出為讀取行為，唯讀使用者亦可使用；展示假設 A-15、A-17、A-18。 */
$(document).on('app:ready', function () {
  'use strict';

  var $start = $('#m-start'), $end = $('#m-end');

  function setErr(k, msg) {
    var $e = $('.moe-card .form-error[data-e="' + k + '"]');
    $e.text(msg || '').closest('.form-field').toggleClass('has-error', !!msg);
  }

  // 回傳是否通過驗證，並把錯誤顯示在欄位下方
  function validate() {
    var s = $start.val(), e = $end.val(), ok = true;
    setErr('start', ''); setErr('end', '');
    if (!s) { setErr('start', '請輸入運作紀錄起始日'); ok = false; }
    if (!e) { setErr('end', '請輸入運作紀錄結束日'); ok = false; }
    if (ok && s > e) { setErr('start', '起始日不可晚於結束日'); ok = false; }
    return ok;
  }

  function chemCell(m) {
    if (!m.chemicals.length) return '<span class="dim">無對應化學品</span>';
    return m.chemicals.map(function (c) {
      var cls = c.owned ? '' : ' class="dim"';
      var txt = App.esc(c.id + ' ' + c.name) + (c.owned ? '（' + c.count + ' 筆）' : '（紀錄歸入較晚到期文件）');
      return '<div' + cls + '>' + txt + '</div>';
    }).join('');
  }

  function renderPreview() {
    var $body = $('#moe-body').empty(), $empty = $('#moe-empty').text(''), $total = $('#moe-total').text('');
    var s = $start.val(), e = $end.val();
    if (!s || !e || s > e) { $empty.text('請輸入起始日與結束日，將顯示預計匯出清單。'); return null; }
    var files = MoeBatch.build(s, e, '', '');
    if (!files.length) { $empty.text('目前學校範圍內沒有毒化物文件涵蓋列管物質，無可匯出的檔案。'); return files; }
    files.forEach(function (f, i) {
      var m = f.meta;
      var $tr = $('<tr></tr>');
      $tr.append($('<td></td>').text(i + 1));
      $tr.append($('<td></td>').html(App.esc(m.docType) + '<br>' + App.esc(m.docNo) + ' <span class="dim">(' + App.esc(m.docId) + ')</span>'));
      $tr.append($('<td></td>').text(m.controlNo || ''));
      $tr.append($('<td></td>').text(m.listedNo + '-' + m.seriesNo + ' ' + m.nameZh));
      $tr.append($('<td></td>').html(chemCell(m)));
      $tr.append($('<td class="num"></td>').text(m.recordCount));
      $tr.append($('<td class="mid"></td>').html(m.noChange ? '<span class="tag tag-off">是</span>' : '否'));
      $body.append($tr);
    });
    $total.text('預計匯出 ' + files.length + ' 個 XLS，共 ' + files.reduce(function (a, f) { return a + f.meta.recordCount; }, 0) + ' 筆運作紀錄');
    return files;
  }

  $start.add($end).on('input change', function () {
    var had = $('.moe-card .form-error').filter(function () { return $(this).text(); }).length;
    if (had) validate();
    renderPreview();
  });

  $('#btn-clear').on('click', function () {
    $start.val(''); $end.val('');
    setErr('start', ''); setErr('end', '');
    renderPreview();
  });

  /* ---------- 匯出前資料確認 Dialog（UI-24） ---------- */
  function openConfirm() {
    var s = $start.val(), e = $end.val();
    var body = '<div class="moe-dlg">' +
      '<p class="moe-intro">以下資料將帶入批次申報 Excel 的負責人與填表人欄位。</p>' +
      '<div class="form-row"><label class="form-label required" for="d-owner">負責人</label><div class="form-field"><input type="text" id="d-owner" maxlength="50" autocomplete="off"><div class="form-error" data-e="owner"></div></div></div>' +
      '<div class="form-row"><label class="form-label required" for="d-filler">填表人</label><div class="form-field"><input type="text" id="d-filler" maxlength="50" autocomplete="off"><div class="form-error" data-e="filler"></div></div></div>' +
      '<p class="rpt-notsend">匯出僅產生檔案，不代表已向教育部或其他機關報送。<span class="poc-badge">POC 模擬</span></p></div>';
    var dlg = App.dialog({
      title: '匯出前資料確認', width: 480, body: body,
      buttons: [
        { text: '儲存', cls: 'btn-primary', onClick: function (api) {
          var owner = $.trim(api.el.find('#d-owner').val()), filler = $.trim(api.el.find('#d-filler').val()), ok = true;
          api.el.find('.form-error').text('').closest('.form-field').removeClass('has-error');
          if (!owner) { api.el.find('[data-e="owner"]').text('請輸入負責人').closest('.form-field').addClass('has-error'); ok = false; }
          if (!filler) { api.el.find('[data-e="filler"]').text('請輸入填表人').closest('.form-field').addClass('has-error'); ok = false; }
          if (!ok) return false;
          try {
            var files = MoeBatch.build(s, e, owner, filler);
            if (!files.length) { App.toast('沒有可匯出的檔案', 'warning'); return; }
            var zipName = MoeBatch.zipName(s, e);
            MoeBatch.exportZip(files, zipName).then(function () {
              Audit.record({ action: '匯出', summary: '匯出教育部批次申報 ZIP（' + zipName + '，' + files.length + ' 個 XLS，期間 ' + s + '～' + e + '）' });   // V2-T04
              App.toast('已匯出 ' + files.length + ' 個 XLS，ZIP 檔名 ' + zipName + '（僅產生檔案，不代表已報送）', 'success');
            }, function (err) { App.toast('匯出失敗：' + err.message, 'error'); });
          } catch (err) {
            App.toast('匯出失敗：' + err.message, 'error');
          }
        } },
        { text: '取消', cls: 'btn-secondary' }
      ]
    });
    return dlg;
  }

  $('#btn-export').on('click', function () {
    if (!validate()) return;
    var files = renderPreview();
    if (!files || !files.length) { App.toast('目前期間與範圍沒有可匯出的檔案', 'warning'); return; }
    openConfirm();
  });

  renderPreview();
});

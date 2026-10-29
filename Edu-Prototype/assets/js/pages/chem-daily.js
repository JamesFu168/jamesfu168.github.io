/* 每日用量月曆（UI-11）、用量維護 Dialog（UI-12）、期初設定面板（UI-13）。
   展示假設 A-12（一日多筆、未來日期不可輸入、過去無紀錄顯示未回報）、A-13（毒化物上月以前已結轉即關帳）。 */
$(document).on('app:ready', function () {
  'use strict';

  var WEEK = ['日', '一', '二', '三', '四', '五', '六'];
  var chemId = App.qs('id');
  var chem = chemId ? Store.getById('chemicals', chemId) : null;

  function notice(title, bodyHtml, after) {
    App.dialog({
      title: title, width: 440, body: '<p class="confirm-msg">' + bodyHtml + '</p>',
      buttons: [{ text: '我知道了', cls: 'btn-primary', onClick: function () { if (after) after(); } }],
      onClose: after
    });
  }

  if (!chem || chem.schoolId !== App.school.id) {
    notice('找不到化學品', '找不到指定的化學品，將返回化學品清單。', function () { location.href = App.pageUrl('chem-list'); });
    $('#page-content').hide();
    return;
  }

  var unit = chem.unit || '';
  var isTox = Store.chemIsTox(chem);
  var today = Store.today();
  var curMonth = today.slice(0, 7);
  var maxMonth = Store.shiftMonth(curMonth, 1);
  var month = /^\d{4}-\d{2}$/.test(App.qs('month') || '') ? App.qs('month') : curMonth;
  if (month > maxMonth) month = maxMonth;

  function chemName() { return chem.nameZh && chem.nameEn ? chem.nameZh + ' (' + chem.nameEn + ')' : (chem.nameZh || chem.nameEn || ''); }
  function fmtQty(n) {
    if (n === null || n === undefined || isNaN(n)) return '—';
    return String(parseFloat(Number(n).toFixed(4)));
  }
  function withUnit(n) { return n === null ? '—' : fmtQty(n) + ' ' + unit; }
  function signed(action, qty) { return (Store.actionDir(action) > 0 ? '+' : '−') + fmtQty(qty); }
  function monthLabel(m) { return m.slice(0, 4) + ' 年 ' + parseInt(m.slice(5, 7), 10) + ' 月'; }
  function pad2(n) { return n < 10 ? '0' + n : '' + n; }
  function recsOn(date) {
    return Store.get('dailyRecords').filter(function (r) { return r.chemicalId === chemId && r.date === date; })
      .sort(function (a, b) { return String(a.id).localeCompare(String(b.id)); });
  }

  /* ---------- 識別區 ---------- */
  $('#d-name').text(chemName());
  $('#d-tox').prop('hidden', !isTox);
  $('#d-org').text(Store.orgPath(chem.orgId));
  $('#d-unit').text(unit || '—');
  $('#btn-back').attr('href', App.pageUrl('chem-list'));
  $('.op-unit').text(unit);

  /* ---------- 月曆與摘要 ---------- */
  function render() {
    var closed = Store.isMonthClosed(chemId, month);
    var sum = Store.getMonthSummary(chemId, month);
    $('#month-title').text(monthLabel(month));
    $('#btn-next').prop('disabled', month >= maxMonth);
    $('#btn-today').prop('disabled', month === curMonth);

    var pre = month === curMonth ? '本月' : '當月';
    $('#s-open').prev().text(pre + '期初結餘');
    $('#s-inc').prev().text(pre + '增加合計');
    $('#s-dec').prev().text(pre + '減少合計');
    $('#s-next').prev().text(month < curMonth ? '期末結餘（次月期初）' : '預計次月期初');
    $('#opening-panel .opening-title').text(pre + '尚無期初結餘：沒有上月可承接資料，請輸入當月期初結餘量');
    $('#opening-panel .write-only').prop('hidden', closed);
    var firstManual = null;
    Store.get('openingBalances').forEach(function (o) {
      if (o.chemicalId === chemId && o.source === 'manual' && (firstManual === null || o.month < firstManual)) firstManual = o.month;
    });
    var noOpen = sum.opening === null;
    $('#summary').toggleClass('no-opening', noOpen);
    $('#opening-panel').prop('hidden', !noOpen);
    if (!noOpen) {
      $('#s-open').text(withUnit(sum.opening));
      $('#s-open-src').text('來源：' + (sum.openingSource === 'manual' ? '人工輸入' : '自動結轉'));
      $('#s-inc').text('+' + withUnit(sum.inc));
      $('#s-dec').text('−' + withUnit(sum.dec));
      var nowBal = month === curMonth ? Store.getDailyBalance(chemId, today) : (month < curMonth ? sum.closing : null);
      $('#s-now').text(withUnit(nowBal));
      $('#s-next').text(withUnit(sum.closing));
      $('#s-closed').html(isTox ? (closed ? '<span class="tag tag-off">已關帳</span>' : '<span class="tag tag-ok">未關帳</span>') : '<span class="muted">不適用</span>');
    }

    var first = new Date(parseInt(month.slice(0, 4), 10), parseInt(month.slice(5, 7), 10) - 1, 1).getDay();
    var days = Store.daysInMonth(month);
    var $g = $('#cal-body').empty();
    for (var i = 0; i < first; i++) $g.append('<div class="cal-cell pad"></div>');
    for (var d = 1; d <= days; d++) {
      var date = month + '-' + pad2(d);
      var future = date > today;
      var $c = $('<div class="cal-cell"></div>').attr('data-date', date);
      $c.append($('<div class="day-num"></div>').append($('<span></span>').text(d + ' 日')));
      if (date === today) $c.addClass('today');
      if (future) {
        $c.addClass('future').attr('title', '未來日期不可輸入');
      } else {
        $c.addClass('clickable').attr({ tabindex: 0, role: 'button', 'aria-label': date + ' 用量維護' });
        var recs = recsOn(date);
        // T07b：每月 1 號固定顯示期初結餘；沒有紀錄的日期格留白
        if (d === 1 && !noOpen) $c.append($('<div class="chip chip-open"></div>').text('期初結餘 ' + withUnit(sum.opening) + '（' + (sum.openingSource === 'manual' ? '人工輸入' : '自動結轉') + '）'));
        if (recs.length) {
          recs.forEach(function (r) {
            if (!r.changed) { $c.append('<div class="chip chip-none">已回報無變動</div>'); return; }
            var dir = Store.actionDir(r.action);
            $c.append($('<div class="chip"></div>').addClass(dir > 0 ? 'chip-inc' : 'chip-dec').text(r.action + ' (' + (dir > 0 ? '+' : '−') + ')' + fmtQty(r.qty) + ' ' + unit));
          });
        }
        if (recs.length && !noOpen) {
          var bal = Store.getDailyBalance(chemId, date);
          $c.append($('<div class="chip chip-bal"></div>').text('結餘 ' + withUnit(bal)));
        }
      }
      $g.append($c);
    }
    var tail = (7 - ((first + days) % 7)) % 7;
    for (var j = 0; j < tail; j++) $g.append('<div class="cal-cell pad"></div>');
  }

  $('#btn-prev').on('click', function () { month = Store.shiftMonth(month, -1); render(); });
  $('#btn-next').on('click', function () { if (month < maxMonth) { month = Store.shiftMonth(month, 1); render(); } });
  $('#btn-today').on('click', function () { month = curMonth; render(); });

  $('#cal-body').on('click', '.cal-cell.clickable', function () { openDialog($(this).attr('data-date')); });
  $('#cal-body').on('keydown', '.cal-cell.clickable', function (e) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDialog($(this).attr('data-date')); }
  });

  /* ---------- 期初輸入面板（UI-13） ---------- */
  $('#btn-op-save').on('click', function () {
    if (!App.requireWrite()) return;
    var raw = $.trim($('#op-qty').val());
    var v = Number(raw);
    var $f = $('#op-qty').closest('.form-field').removeClass('has-error');
    $('#op-error').text('');
    if (raw === '' || isNaN(v)) { $f.addClass('has-error'); $('#op-error').text('請輸入期初結餘量'); return; }
    if (v < 0) { $f.addClass('has-error'); $('#op-error').text('期初結餘量不可為負數'); return; }
    if (Store.getOpening(chemId, month)) { render(); return; }
    // 清掉該月殘留的 carry 後寫入人工期初
    var list = Store.get('openingBalances');
    for (var i = list.length - 1; i >= 0; i--) {
      if (list[i].chemicalId === chemId && list[i].month === month && list[i].source === 'carry') list.splice(i, 1);
    }
    Store.add('openingBalances', { chemicalId: chemId, month: month, qty: v, source: 'manual', createdBy: App.user.id });
    $('#op-qty').val('');
    App.toast('已儲存 ' + monthLabel(month) + ' 期初結餘', 'success');
    render();
  });
  $('#op-qty').on('keydown', function (e) {
    if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault();
    if (e.key === 'Enter') $('#btn-op-save').trigger('click');
  });

  /* ---------- 用量維護 Dialog（UI-12） ---------- */
  function openDialog(date) {
    var closed = Store.isMonthClosed(chemId, date.slice(0, 7));
    var viewOnly = closed || !App.canWrite();
    var editingId = null;
    var $body = $('<div></div>');
    var wd = WEEK[new Date(date.replace(/-/g, '/')).getDay()];

    var $head = $('<div class="dd-head"></div>')
      .append($('<div class="dd-date"></div>').text(date).append($('<small></small>').text('週' + wd)))
      .append($('<div class="dd-chem"></div>').text('化學品：' + chemName() + '　單位：' + unit));
    $body.append($head);
    if (closed) $body.append('<div class="dd-closed">本月已關帳，不可增刪改</div>');
    $body.append('<div class="dd-sec-title">當日既有紀錄</div>');
    var $listBox = $('<div class="dd-list"></div>');
    $body.append($listBox);

    var $form = null;
    if (!viewOnly) {
      $form = $(
        '<div class="dd-form">' +
        '<div class="dd-edit-bar"><span class="dd-sec-title" id="dd-form-title">新增紀錄</span><button type="button" class="btn-text-link" id="dd-cancel-edit" hidden>取消修改</button></div>' +
        '<div class="form-row"><label class="form-label required">是否有變動</label><div class="form-field"><div class="radio-line">' +
        '<label><input type="radio" name="dd-changed" value="1" checked>有</label><label><input type="radio" name="dd-changed" value="0">無</label></div><div class="form-error" data-e="changed"></div></div></div>' +
        '<div class="form-row dd-row-action"><label class="form-label required" for="dd-action">運作行為</label><div class="form-field"><select id="dd-action"></select><div class="form-error" data-e="action"></div></div></div>' +
        '<div class="form-row dd-row-qty"><label class="form-label required" for="dd-qty">用量</label><div class="form-field"><div class="form-inline"><input type="number" id="dd-qty" min="0" step="any" autocomplete="off"><span class="unit-addon"></span></div><div class="form-error" data-e="qty"></div><div class="form-hint">必須使用化學品設定單位，不提供換算</div></div></div>' +
        '<div class="form-row"><label class="form-label">檔案</label><div class="form-field"><div class="dd-file"><input type="file" id="dd-file"><span class="poc-badge">POC 模擬</span></div><div class="form-hint" id="dd-file-hint">僅保存檔名，不實際上傳</div></div></div>' +
        '<div class="form-row"><label class="form-label" for="dd-note">備註</label><div class="form-field"><textarea id="dd-note" maxlength="300"></textarea></div></div>' +
        '</div>');
      var opts = '<option value="">請選擇</option>';
      Store.ACTIONS.forEach(function (a) { opts += '<option value="' + a.name + '">' + a.name + '（' + (a.dir > 0 ? '＋增加' : '－減少') + '）</option>'; });
      $form.find('#dd-action').html(opts);
      $form.find('.unit-addon').text(unit);
      $body.append($form);
    }

    function fv(sel) { return $form.find(sel); }
    function setChanged(v) {
      fv('input[name=dd-changed][value=' + v + ']').prop('checked', true);
      toggleRows();
    }
    function toggleRows() {
      var yes = fv('input[name=dd-changed]:checked').val() === '1';
      fv('.dd-row-action, .dd-row-qty').prop('hidden', !yes);
    }
    function clearErrors() { $form.find('.form-error').text(''); $form.find('.form-field').removeClass('has-error'); }
    function showError(key, msg) { var $e = fv('[data-e=' + key + ']').text(msg); $e.closest('.form-field').addClass('has-error'); }
    function resetForm() {
      editingId = null;
      fv('#dd-form-title').text('新增紀錄');
      fv('#dd-cancel-edit').prop('hidden', true);
      setChanged('1');
      fv('#dd-action').val('');
      fv('#dd-qty').val('');
      fv('#dd-file').val('');
      fv('#dd-file-hint').text('僅保存檔名，不實際上傳');
      fv('#dd-note').val('');
      clearErrors();
    }

    function renderList() {
      var recs = recsOn(date);
      var $t = $('<table class="dd-table"><thead><tr><th>運作行為</th><th>用量</th><th>備註</th><th class="dd-act write-only">操作</th></tr></thead><tbody></tbody></table>');
      var $tb = $t.find('tbody');
      if (!recs.length) $tb.append('<tr><td colspan="4" class="dd-empty">尚無紀錄（尚未回報）</td></tr>');
      recs.forEach(function (r) {
        var $tr = $('<tr></tr>').attr('data-id', r.id);
        if (r.changed) {
          var dir = Store.actionDir(r.action);
          $tr.append($('<td></td>').text(r.action));
          $tr.append($('<td></td>').append($('<span></span>').addClass(dir > 0 ? 'dd-inc' : 'dd-dec').text(signed(r.action, r.qty) + ' ' + unit)));
        } else {
          $tr.append('<td><span class="tag tag-off">已回報無變動</span></td><td>—</td>');
        }
        var note = r.note || '';
        if (r.fileName) note += (note ? '　' : '') + '[檔案：' + r.fileName + ']';
        $tr.append($('<td></td>').text(note || '—'));
        var $act = $('<td class="dd-act write-only"></td>');
        if (!viewOnly) {
          $act.append($('<button type="button" class="btn-text-link dd-edit">修改</button>').attr('data-id', r.id));
          $act.append(' ');
          $act.append($('<button type="button" class="btn-text-link dd-del">刪除</button>').attr('data-id', r.id).css('color', 'var(--c-danger)'));
        }
        $tr.append($act);
        $tb.append($tr);
      });
      if (viewOnly) $t.find('.dd-act').remove();
      $listBox.empty().append($t);
    }
    renderList();

    if ($form) {
      resetForm();
      $form.on('change', 'input[name=dd-changed]', function () {
        var v = $(this).val();
        if (v === '0') {
          var others = recsOn(date).filter(function (r) { return r.changed && r.id !== editingId; });
          if (others.length) {
            setChanged('1');
            notice('不可選擇無變動', '該日已有有異動紀錄，不可再新增「無變動」。如需回報無變動，請先刪除當日有異動紀錄。');
            return;
          }
        }
        toggleRows();
      });
      $form.on('keydown', '#dd-qty', function (e) { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); });
      $form.on('change', '#dd-file', function () {
        var f = this.files && this.files[0];
        fv('#dd-file-hint').text(f ? '已選擇：' + f.name + '（僅保存檔名）' : '僅保存檔名，不實際上傳');
      });
      $form.on('click', '#dd-cancel-edit', resetForm);
    }

    $listBox.on('click', '.dd-edit', function () {
      if (!App.requireWrite() || !$form) return;
      var r = Store.getById('dailyRecords', $(this).attr('data-id'));
      if (!r) return;
      resetForm();
      editingId = r.id;
      fv('#dd-form-title').text('修改紀錄');
      fv('#dd-cancel-edit').prop('hidden', false);
      setChanged(r.changed ? '1' : '0');
      fv('#dd-action').val(r.action || '');
      fv('#dd-qty').val(r.changed ? r.qty : '');
      fv('#dd-file-hint').text(r.fileName ? '原檔案：' + r.fileName + '（重新選擇可更換）' : '僅保存檔名，不實際上傳');
      fv('#dd-note').val(r.note || '');
      fv('#dd-note').closest('.dd-form')[0].scrollIntoView({ block: 'nearest' });
    });
    $listBox.on('click', '.dd-del', function () {
      if (!App.requireWrite() || viewOnly) return;
      var id = $(this).attr('data-id');
      var r = Store.getById('dailyRecords', id);
      if (!r) return;
      var desc = r.changed ? r.action + ' ' + signed(r.action, r.qty) + ' ' + unit : '無變動回報';
      App.confirm('確定要刪除 ' + date + ' 的紀錄「' + desc + '」嗎？', { title: '刪除紀錄', okText: '刪除', danger: true }).then(function (ok) {
        if (!ok) return;
        Store.remove('dailyRecords', id);
        if (editingId === id && $form) resetForm();
        renderList();
        render();
        App.toast('已刪除紀錄', 'success');
      });
    });

    function save(api) {
      if (!App.requireWrite()) return false;
      clearErrors();
      var yes = fv('input[name=dd-changed]:checked').val() === '1';
      var action = fv('#dd-action').val();
      var rawQty = $.trim(fv('#dd-qty').val());
      var qty = Number(rawQty);
      var ok = true;
      if (yes) {
        if (!action) { showError('action', '此欄位必填'); ok = false; }
        if (rawQty === '') { showError('qty', '此欄位必填'); ok = false; }
        else if (isNaN(qty) || qty < 0) { showError('qty', '用量必須為大於或等於 0 的數值'); ok = false; }
      }
      var existing = recsOn(date).filter(function (r) { return r.id !== editingId; });
      if (!yes) {
        if (existing.some(function (r) { return r.changed; })) {
          showError('changed', '該日已有有異動紀錄，不可再新增無變動');
          ok = false;
        } else if (existing.some(function (r) { return !r.changed; })) {
          showError('changed', '該日已有「無變動」回報');
          ok = false;
        }
      }
      if (!ok) return false;

      var file = fv('#dd-file')[0].files && fv('#dd-file')[0].files[0];
      var rec = {
        changed: yes, action: yes ? action : null, qty: yes ? qty : 0,
        note: $.trim(fv('#dd-note').val()), reportedBy: App.user.id, reportedAt: nowStr()
      };
      var removedNoChange = false;
      if (yes) {
        existing.forEach(function (r) { if (!r.changed) { Store.remove('dailyRecords', r.id); removedNoChange = true; } });
      }
      if (editingId) {
        var old = Store.getById('dailyRecords', editingId);
        rec.fileName = file ? file.name : (old ? old.fileName || '' : '');
        Store.update('dailyRecords', editingId, rec);
      } else {
        rec.chemicalId = chemId;
        rec.date = date;
        rec.fileName = file ? file.name : '';
        Store.add('dailyRecords', rec);
      }
      api.close();
      render();
      App.toast(removedNoChange ? '已儲存，並移除該日的「無變動」回報' : '已儲存 ' + date + ' 用量紀錄', 'success');
      return false;
    }

    var buttons = viewOnly
      ? [{ text: '關閉', cls: 'btn-secondary' }]
      : [{ text: '儲存', cls: 'btn-primary write-only', onClick: save }, { text: '取消', cls: 'btn-secondary' }];
    var dlg = App.dialog({ title: '用量維護', width: 640, body: $body, buttons: buttons });
    dlg.el.addClass('daily-dlg');
    if ($form) toggleRows();
  }

  function nowStr() {
    var d = new Date();
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()) + ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes()) + ':' + pad2(d.getSeconds());
  }

  render();
});

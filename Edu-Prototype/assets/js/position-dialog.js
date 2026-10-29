/* 位置維護 Dialog（共用元件，T06 建立；T09／T10 共用）。
   用法：PositionDialog.open({ onChange: reloadFn })，新增或修改位置後會呼叫 reloadFn 讓呼叫端重新載入位置下拉。
   需先載入 jQuery、Store、App；樣式在 assets/css/common.css 的 T06 區段（.pos-dlg）。 */
(function (w) {
  'use strict';

  var USAGES = ['使用', '儲存', '使用及儲存'];

  function schoolPositions() {
    var sid = App.school.id;
    return Store.get('positions').filter(function (p) { return p.schoolId === sid; });
  }

  var PositionDialog = {
    USAGES: USAGES,

    // 依用途取得位置：kind 為 '使用' 或 '儲存'；usage 含該字即可
    listFor: function (kind) {
      return schoolPositions().filter(function (p) { return String(p.usage).indexOf(kind) >= 0; });
    },

    open: function (opts) {
      opts = opts || {};
      var editingId = null;
      var canWrite = App.canWrite();
      var $body = $('<div class="pos-dlg"></div>');
      var $tbl = $('<table class="pos-table"><thead><tr><th>名稱</th><th>建築物</th><th>用途</th><th>備註</th><th class="write-only">操作</th></tr></thead><tbody></tbody></table>');
      var $box = $(
        '<div class="pos-formbox write-only">' +
        '<div class="pos-formbox-title" data-role="title">新增位置</div>' +
        '<div class="form-row"><label class="form-label required">名稱</label><div class="form-field" data-p="name"><input type="text" maxlength="40" placeholder="例如：化學館 201 實驗室"><div class="form-error"></div></div></div>' +
        '<div class="form-row"><label class="form-label">建築物</label><div class="form-field" data-p="building"><input type="text" maxlength="30" placeholder="例如：化學館"></div></div>' +
        '<div class="form-row"><label class="form-label required">用途</label><div class="form-field" data-p="usage"><select>' +
        USAGES.map(function (u) { return '<option value="' + u + '">' + u + '</option>'; }).join('') + '</select></div></div>' +
        '<div class="form-row"><label class="form-label">備註</label><div class="form-field" data-p="note"><input type="text" maxlength="100"></div></div>' +
        '<div class="pos-btns"><button type="button" class="btn btn-primary btn-sm" data-role="save">新增位置</button>' +
        '<button type="button" class="btn btn-secondary btn-sm" data-role="reset" hidden>取消修改</button></div>' +
        '</div>');
      $body.append($tbl, $box);
      if (!canWrite) $box.hide();

      function f(k) { return $box.find('[data-p=' + k + ']'); }
      function val(k) { return $.trim(f(k).find('input,select').val()); }

      function renderList() {
        var $tb = $tbl.find('tbody').empty();
        var list = schoolPositions();
        if (!list.length) $tb.append('<tr><td colspan="5" class="muted">尚無位置資料</td></tr>');
        list.forEach(function (p) {
          var $tr = $('<tr></tr>').attr('data-id', p.id).toggleClass('pos-editing', p.id === editingId);
          $tr.append($('<td></td>').text(p.name), $('<td></td>').text(p.building || '—'), $('<td></td>').text(p.usage), $('<td></td>').text(p.note || '—'));
          $tr.append($('<td class="write-only"></td>').append($('<button type="button" class="btn-text-link pos-edit">修改</button>').attr('data-id', p.id)));
          $tb.append($tr);
        });
      }

      function resetForm() {
        editingId = null;
        f('name').find('input').val(''); f('building').find('input').val(''); f('note').find('input').val('');
        f('usage').find('select').val('使用');
        f('name').removeClass('has-error').find('.form-error').text('');
        $box.find('[data-role=title]').text('新增位置');
        $box.find('[data-role=save]').text('新增位置');
        $box.find('[data-role=reset]').prop('hidden', true);
        renderList();
      }

      $tbl.on('click', '.pos-edit', function () {
        if (!App.requireWrite()) return;
        var p = Store.getById('positions', $(this).attr('data-id'));
        if (!p) return;
        editingId = p.id;
        f('name').find('input').val(p.name); f('building').find('input').val(p.building || '');
        f('usage').find('select').val(p.usage); f('note').find('input').val(p.note || '');
        f('name').removeClass('has-error').find('.form-error').text('');
        $box.find('[data-role=title]').text('修改位置');
        $box.find('[data-role=save]').text('儲存修改');
        $box.find('[data-role=reset]').prop('hidden', false);
        renderList();
        f('name').find('input').trigger('focus');
      });
      $box.find('[data-role=reset]').on('click', resetForm);
      $box.find('[data-role=save]').on('click', function () {
        if (!App.requireWrite()) return;
        var v = { name: val('name'), building: val('building'), usage: val('usage'), note: val('note') };
        var err = '';
        if (!v.name) err = '請輸入位置名稱';
        else if (schoolPositions().some(function (p) { return p.name === v.name && p.id !== editingId; })) err = '已有相同名稱的位置';
        f('name').toggleClass('has-error', !!err).find('.form-error').text(err);
        if (err) { f('name').find('input').trigger('focus'); return; }
        if (editingId) {
          Store.update('positions', editingId, v);
          App.toast('已儲存位置「' + v.name + '」', 'success');
        } else {
          v.schoolId = App.school.id;
          Store.add('positions', v, 'POS');
          App.toast('已新增位置「' + v.name + '」', 'success');
        }
        resetForm();
        if (opts.onChange) opts.onChange();
      });
      $box.on('keydown', 'input', function (e) { if (e.key === 'Enter') $box.find('[data-role=save]').trigger('click'); });

      renderList();
      return App.dialog({ title: '位置維護', width: 680, body: $body, buttons: [{ text: '關閉', cls: 'btn-secondary' }] });
    }
  };

  w.PositionDialog = PositionDialog;
})(window);

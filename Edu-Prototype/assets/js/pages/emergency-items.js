/* 緊急應變內容維護（V2-T08）：?block=manual|contact|map。非唯讀角色皆可維護（A-34）；檔案只存檔名（A-14）。 */
$(document).on('app:ready', function () {
  'use strict';

  var BLOCKS = { manual: '緊急應變手冊', contact: '緊急聯絡資訊', map: '校園平面圖' };
  var TYPE_NAME = { text: '純文字', link: '連結', file: '檔案' };
  var schoolId = App.school.id;
  var block = App.qs('block');
  var overview = App.pageUrl('emergency');

  if (!BLOCKS.hasOwnProperty(block)) {
    App.flash('找不到指定的區塊，已返回緊急應變專區', 'warning');
    location.replace(overview);
    return;
  }
  var blockName = BLOCKS[block];
  document.title = blockName + '－內容維護 - 教育部化學雲';
  $('#btn-back').attr('href', overview);

  function list() {
    return Store.get('emergencyItems').filter(function (x) { return x.schoolId === schoolId && x.block === block; })
      .sort(function (a, b) {
        return (a.sort || 0) - (b.sort || 0) || String(a.updatedAt || '').localeCompare(String(b.updatedAt || ''));
      });
  }
  function summary(it) {
    if (it.type === 'text') { var t = String(it.text || '').replace(/\s+/g, ' '); return t.length > 40 ? t.slice(0, 40) + '…' : t; }
    if (it.type === 'link') return it.url || '';
    return it.fileName || '';
  }

  function render() {
    var rows = list();
    var $b = $('#item-body').empty();
    if (!rows.length) $b.append('<tr class="empty-row"><td colspan="7">尚無資料</td></tr>');
    rows.forEach(function (it) {
      var $tr = $('<tr></tr>').attr('data-id', it.id);
      $tr.append($('<td class="col-act1 write-only"></td>').append($('<button type="button" class="act-icon btn-edit" title="編輯">✏️</button>')));
      $tr.append($('<td class="col-act1 write-only"></td>').append($('<button type="button" class="act-icon btn-del" title="刪除">🗑</button>')));
      $tr.append($('<td class="c-name"></td>').text(it.name));
      $tr.append($('<td class="c-type"></td>').text(TYPE_NAME[it.type] || it.type));
      $tr.append($('<td class="c-sum"></td>').text(summary(it)));
      $tr.append($('<td class="c-by"></td>').text(it.updatedBy || ''));
      $tr.append($('<td class="c-upd"></td>').text((it.updatedAt || '').slice(0, 10)));
      $b.append($tr);
    });
    $('#list-total').text('共 ' + rows.length + ' 筆');
  }

  /* ---------- 新增／編輯 Dialog ---------- */
  function isHttp(u) { return /^https?:\/\/\S+$/i.test(u); }

  function formDialog(cur) {
    if (!App.requireWrite()) return;
    var editing = !!cur;
    var type = editing ? cur.type : 'text';
    var keptFile = editing && cur.type === 'file' ? cur.fileName : '';
    var origUrl = editing && cur.type === 'link' ? cur.url : '';

    var $body = $(
      '<div class="form-row"><label class="form-label">所屬區塊</label><div class="form-field"><div class="emg-readonly" data-f="block"></div></div></div>' +
      '<div class="form-row"><label class="form-label required">名稱</label><div class="form-field" data-f="name"><input type="text" maxlength="60"><div class="form-error"></div></div></div>' +
      '<div class="form-row"><label class="form-label required">內容類型</label><div class="form-field" data-f="type"><div class="form-inline emg-types">' +
        '<label class="chk-inline"><input type="radio" name="emg-type" value="text">純文字</label>' +
        '<label class="chk-inline"><input type="radio" name="emg-type" value="link">連結</label>' +
        '<label class="chk-inline"><input type="radio" name="emg-type" value="file">檔案</label></div></div></div>' +
      '<div class="form-row emg-tf" data-t="text"><label class="form-label required">文字內容</label><div class="form-field" data-f="text"><textarea rows="6" maxlength="1000"></textarea><div class="form-hint">最多 1000 字，換行會保留。</div><div class="form-error"></div></div></div>' +
      '<div class="form-row emg-tf" data-t="link"><label class="form-label required">網址</label><div class="form-field" data-f="url"><input type="text" placeholder="https://"><div class="form-error"></div></div></div>' +
      '<div class="form-row emg-tf" data-t="file"><label class="form-label required">檔案</label><div class="form-field" data-f="file"><input type="file"><div class="form-hint emg-curfile"></div><div class="form-error"></div></div></div>');
    $body.find('[data-f=block]').text(blockName);
    $body.find('[data-f=name] input').val(editing ? cur.name : '');
    $body.find('[data-f=text] textarea').val(editing && cur.type === 'text' ? cur.text : '');
    $body.find('[data-f=url] input').val(origUrl);

    function syncFileHint() {
      $body.find('.emg-curfile').text(keptFile ? '目前檔名：' + keptFile + '（選擇新檔案可替換；POC 僅保存檔名）' : 'POC 僅保存檔名，不上傳實體檔案。');
    }
    function showType() {
      $body.find('input[name=emg-type][value=' + type + ']').prop('checked', true);
      $body.filter('.emg-tf').each(function () { $(this).toggleClass('emg-hide', $(this).attr('data-t') !== type); });
      syncFileHint();
    }
    function hasValue(t) {
      if (t === 'text') return $.trim($body.find('[data-f=text] textarea').val()) !== '';
      if (t === 'link') return $.trim($body.find('[data-f=url] input').val()) !== '';
      return !!keptFile || $body.find('[data-f=file] input')[0].files.length > 0;
    }
    function clearType(t) {
      if (t === 'text') $body.find('[data-f=text] textarea').val('');
      else if (t === 'link') $body.find('[data-f=url] input').val('');
      else { keptFile = ''; $body.find('[data-f=file] input').val(''); }
      $body.find('[data-f=' + (t === 'file' ? 'file' : t === 'link' ? 'url' : 'text') + ']').removeClass('has-error').find('.form-error').text('');
    }
    $body.on('change', 'input[name=emg-type]', function () {
      var next = $(this).val();
      if (next === type) return;
      if (hasValue(type)) {
        App.confirm('切換類型將清除已填內容，確定要切換嗎？', { title: '切換內容類型' }).then(function (ok) {
          if (ok) { clearType(type); type = next; }
          showType();
        });
      } else { type = next; showType(); }
    });
    showType();

    function setErr(f, msg) {
      var $f = $body.find('[data-f=' + f + ']');
      $f.toggleClass('has-error', !!msg).find('.form-error').text(msg || '');
      return !!msg;
    }

    App.dialog({
      title: editing ? '編輯內容' : '新增內容', width: 560, body: $body,
      buttons: [
        { text: '取消', cls: 'btn-secondary' },
        { text: '儲存', cls: 'btn-primary', onClick: function () {
          if (!App.requireWrite()) return false;
          var name = $.trim($body.find('[data-f=name] input').val());
          var bad = false;
          bad = setErr('name', !name ? '請輸入名稱' : name.length > 60 ? '名稱最多 60 字' : '') || bad;
          var patch = { name: name, type: type, text: '', url: '', fileName: '' };
          if (type === 'text') {
            var tx = $body.find('[data-f=text] textarea').val();
            bad = setErr('text', !$.trim(tx) ? '請輸入文字內容' : tx.length > 1000 ? '文字內容最多 1000 字' : '') || bad;
            patch.text = tx;
          } else if (type === 'link') {
            var u = $.trim($body.find('[data-f=url] input').val());
            var ok = isHttp(u) || (!!origUrl && u === origUrl);   // 示範的內部連結（平面圖管理）維持原值可儲存
            bad = setErr('url', !u ? '請輸入網址' : !ok ? '網址須以 http:// 或 https:// 開頭' : '') || bad;
            patch.url = u;
          } else {
            var files = $body.find('[data-f=file] input')[0].files;
            var fn = files.length ? files[0].name : keptFile;
            bad = setErr('file', !fn ? '請選擇檔案' : '') || bad;
            patch.fileName = fn || '';
          }
          if (bad) return false;
          patch.updatedBy = App.user.name;
          if (editing) {
            Store.update('emergencyItems', cur.id, patch);
            App.toast('已更新「' + name + '」', 'success');
          } else {
            var max = 0;
            list().forEach(function (x) { max = Math.max(max, x.sort || 0); });
            patch.schoolId = schoolId; patch.block = block; patch.sort = max + 1;
            Store.add('emergencyItems', patch);
            App.toast('已新增「' + name + '」', 'success');
          }
          render();
        } }
      ]
    });
  }

  $('#btn-add').on('click', function () { formDialog(null); });
  $('#item-body').on('click', '.btn-edit', function () {
    var it = Store.getById('emergencyItems', $(this).closest('tr').attr('data-id'));
    if (it) formDialog(it);
  });
  $('#item-body').on('click', '.btn-del', function () {
    if (!App.requireWrite()) return;
    var it = Store.getById('emergencyItems', $(this).closest('tr').attr('data-id'));
    if (!it) return;
    App.confirm('確定刪除「' + it.name + '」？', { title: '刪除內容', okText: '刪除', danger: true }).then(function (ok) {
      if (!ok) return;
      Store.remove('emergencyItems', it.id);
      App.toast('已刪除「' + it.name + '」', 'success');
      render();
    });
  });

  render();
});

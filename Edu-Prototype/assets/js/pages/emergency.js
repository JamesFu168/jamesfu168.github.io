/* 緊急應變專區總覽（V2-T08）。上半部為固定示範災害資料（A-34），下半部三區塊內容同校共用。 */
$(document).on('app:ready', function () {
  'use strict';

  var BLOCKS = [
    { key: 'manual', title: '緊急應變手冊' },
    { key: 'contact', title: '緊急聯絡資訊' },
    { key: 'map', title: '校園平面圖' }
  ];
  var TYPE_ICON = { '停水': '💧', '豪雨': '🌧', '地震': '📳', '空品': '🌫', '交通': '🚧', '其他': '⚠️' };
  var SEV_CLS = { '注意': 'tag-info', '警戒': 'tag-warn', '危險': 'tag-danger' };
  var schoolId = App.school.id;
  var county = '';   // 目前篩選的縣市，空字串為全部

  function alerts() { return (Store.get('emergencyAlerts') || {}).items || []; }

  /* ---------- 上半部：政府災害資訊（示範） ---------- */
  function renderAlerts() {
    var ver = (Store.get('emergencyAlerts') || {}).version || '';
    var items = alerts();
    var $chips = $('#emg-chips').empty();
    var $cards = $('#emg-cards').empty();
    if (!items.length) {
      $('#emg-meta').text('示範資料時間：—｜狀態：示範資料（未連線）');
      $cards.append('<div class="emg-empty emg-empty-warn">目前無示範事件資料（示範資料未載入）</div>');
      return;
    }
    $('#emg-meta').text('示範資料時間：' + ver + '｜狀態：示範資料（未連線）');

    var counts = {}, order = [];
    items.forEach(function (a) {
      if (!counts[a.county]) { counts[a.county] = 0; order.push(a.county); }
      counts[a.county]++;
    });
    function chip(label, key, n) {
      return $('<button type="button" class="emg-chip"></button>').attr('data-county', key)
        .toggleClass('active', county === key).text(label + ' ' + n);
    }
    $chips.append(chip('全部', '', items.length));
    order.forEach(function (c) { $chips.append(chip(c, c, counts[c])); });

    var list = items.filter(function (a) { return !county || a.county === county; });
    if (!list.length) $cards.append('<div class="emg-empty">此縣市目前無示範事件</div>');
    list.forEach(function (a) {
      var $c = $('<article class="emg-card"></article>').attr('data-id', a.id);
      var $h = $('<div class="emg-card-head"></div>');
      $h.append($('<span class="emg-type"></span>').text((TYPE_ICON[a.type] || '⚠️') + ' ' + a.type));
      $h.append($('<span class="tag"></span>').addClass(SEV_CLS[a.severity] || 'tag-info').text(a.severity));
      $h.append($('<span class="emg-county"></span>').text(a.county));
      $c.append($h);
      $c.append($('<h3 class="emg-card-title"></h3>').text(a.title));
      var $meta = $('<dl class="emg-kv"></dl>');
      $meta.append($('<dt>發布單位</dt>'), $('<dd></dd>').text(a.agency));
      $meta.append($('<dt>生效～到期</dt>'), $('<dd></dd>').text(a.effectiveFrom + ' ～ ' + a.effectiveTo));
      $meta.append($('<dt>影響範圍</dt>'), $('<dd></dd>').text(a.area));
      $c.append($meta);
      $c.append($('<div class="emg-desc"></div>').text(a.description));
      $c.append($('<button type="button" class="btn-text-link emg-more" hidden>展開</button>'));
      $cards.append($c);
    });
    // 描述超過 3 行才顯示展開
    $cards.find('.emg-card').each(function () {
      var d = $(this).find('.emg-desc')[0];
      if (d.scrollHeight > d.clientHeight + 1) $(this).find('.emg-more').prop('hidden', false);
    });
  }

  $('#emg-chips').on('click', '.emg-chip', function () {
    var c = $(this).attr('data-county');
    county = (county === c) ? '' : c;   // 再點同一晶片取消
    renderAlerts();
  });
  $('#emg-cards').on('click', '.emg-more', function () {
    var $d = $(this).siblings('.emg-desc');
    $d.toggleClass('open');
    $(this).text($d.hasClass('open') ? '收合' : '展開');
  });

  /* ---------- 下半部：三區塊 ---------- */
  function blockItems(key) {
    return Store.get('emergencyItems').filter(function (x) { return x.schoolId === schoolId && x.block === key; })
      .sort(function (a, b) {
        return (a.sort || 0) - (b.sort || 0) || String(a.updatedAt || '').localeCompare(String(b.updatedAt || ''));
      });
  }

  function itemNode(it) {
    var $li = $('<li class="emg-item"></li>').attr('data-id', it.id).addClass('emg-t-' + it.type);
    if (it.type === 'text') {
      $li.append($('<div class="emg-iname"></div>').text(it.name));
      $li.append($('<div class="emg-itext"></div>').text(it.text || ''));
    } else if (it.type === 'link') {
      var internal = !/^https?:\/\//i.test(it.url || '');
      var okUrl = !internal || /^(\.\.\/)?(pages\/)?[\w\-]+\.html(\?[\w\-=&%.]*)?$/.test(it.url || '');   // V2-T09：非 http(s) 時只允許頁面相對路徑
      var $a = $('<a class="emg-link"></a>').attr('href', okUrl ? (it.url || '#') : '#').text(it.name);
      if (!internal) $a.attr({ target: '_blank', rel: 'noopener noreferrer' });
      $li.append($('<span class="emg-ico">🔗</span>'), $a);
    } else {
      $li.append($('<span class="emg-ico">📎</span>'),
        $('<button type="button" class="btn-text-link emg-file"></button>').attr('data-id', it.id).text(it.name));
    }
    return $li;
  }

  function renderBlocks() {
    var $wrap = $('#emg-blocks').empty();
    BLOCKS.forEach(function (b) {
      var $sec = $('<section class="card emg-block"></section>').attr('data-block', b.key);
      var $h = $('<div class="emg-block-head"></div>');
      $h.append($('<h2 class="emg-h2"></h2>').text(b.title));
      $h.append($('<a class="act-icon write-only emg-edit" title="維護內容">✏️</a>').attr('href', App.pageUrl('emergency-items', { block: b.key })));
      $sec.append($h);
      var list = blockItems(b.key);
      var $body = $('<div class="emg-block-body"></div>');
      if (!list.length) $body.append('<div class="emg-empty">尚無資料</div>');
      else {
        var $ul = $('<ul class="emg-list"></ul>');
        list.forEach(function (it) { $ul.append(itemNode(it)); });
        $body.append($ul);
      }
      $sec.append($body);
      $sec.append('<div class="emg-note">同校共用（展示假設 A-34）</div>');
      $wrap.append($sec);
    });
  }

  $('#emg-blocks').on('click', 'button.emg-file', function () {
    var it = Store.getById('emergencyItems', $(this).attr('data-id'));
    if (!it) return;
    Audit.record({ module: '緊急應變專區', action: '下載', targetType: 'emergencyItems', targetId: it.id,
      summary: '開啟檔案「' + it.name + '」（POC 僅檔名）' });
    App.dialog({
      title: '檔案說明', width: 460,
      body: '<p class="confirm-msg">POC 僅保存檔名「' + App.esc(it.fileName || it.name) + '」，未上傳實體檔案。</p>',
      buttons: [{ text: '我知道了', cls: 'btn-primary' }]
    });
  });

  renderAlerts();
  renderBlocks();
});

/* 組織與人員管理（UI-03、UI-04）。展示假設 A-04：上層組織清單不含下層人員；組織含子組織／人員／化學品不可刪除；
   不可刪除自己與最後一位系統管理者。 */
$(document).on('app:ready', function () {
  'use strict';

  var ROLES = ['系統管理者', '管理者', '使用者', '唯讀使用者'];
  var schoolId = App.school.id;
  var selectedId = null;
  var expanded = {};
  var query = '';

  /* ---------- 資料輔助 ---------- */
  function orgs() { return Store.get('orgs').filter(function (o) { return o.schoolId === schoolId; }); }
  function users() { return Store.get('users').filter(function (u) { return u.schoolId === schoolId; }); }
  function children(pid) {
    return orgs().filter(function (o) { return (o.parentId || null) === (pid || null); })
      .sort(function (a, b) { return (a.sort || 0) - (b.sort || 0); });
  }
  function root() { return orgs().filter(function (o) { return !o.parentId; })[0] || null; }
  function getOrg(id) { return Store.getById('orgs', id); }
  function hasDescendantMatch(o, q) {
    return children(o.id).some(function (c) { return c.name.toLowerCase().indexOf(q) >= 0 || hasDescendantMatch(c, q); });
  }
  // 下拉用：縮排後的組織清單
  function orgOptions(selected) {
    var html = '';
    (function walk(pid, depth) {
      children(pid).forEach(function (o) {
        html += '<option value="' + o.id + '"' + (o.id === selected ? ' selected' : '') + '>' +
          new Array(depth + 1).join('　') + App.esc(o.name) + '</option>';
        walk(o.id, depth + 1);
      });
    })(null, 0);
    return html;
  }
  function normalizeSort(pid) {
    children(pid).forEach(function (o, i) { if (o.sort !== i + 1) Store.update('orgs', o.id, { sort: i + 1 }); });
  }

  /* ---------- 組織樹 ---------- */
  function renderTree() {
    var q = query.trim().toLowerCase();
    var anyMatch = false;
    function build(pid) {
      var $ul = $('<ul></ul>');
      children(pid).forEach(function (o) {
        var self = q && o.name.toLowerCase().indexOf(q) >= 0;
        var sub = q ? hasDescendantMatch(o, q) : false;
        if (q && !self && !sub) return;
        if (self) anyMatch = true;
        var kids = children(o.id);
        var open = q ? sub : !!expanded[o.id];
        var $li = $('<li role="treeitem"></li>');
        var $row = $('<div class="org-node"></div>').attr('data-id', o.id).toggleClass('selected', o.id === selectedId);
        $row.append($('<button type="button" class="org-caret" aria-label="展開或收合"></button>').text('▶')
          .toggleClass('open', open && kids.length > 0).toggleClass('leaf', kids.length === 0).attr('data-id', o.id));
        var $name = $('<span class="org-name"></span>');
        if (self) {
          var i = o.name.toLowerCase().indexOf(q);
          $name.append(document.createTextNode(o.name.slice(0, i)), $('<mark></mark>').text(o.name.substr(i, q.length)), document.createTextNode(o.name.slice(i + q.length)));
        } else { $name.text(o.name); }
        $row.append($name);
        $li.append($row);
        if (kids.length && open) $li.append(build(o.id));
        $ul.append($li);
      });
      return $ul;
    }
    var $tree = $('#org-tree').empty().append(build(null));
    if (q && !anyMatch) $tree.empty().append('<div class="org-empty">查無符合的組織</div>');
    updateToolbar();
  }

  function updateToolbar() {
    var o = getOrg(selectedId);
    var isRoot = !o || !o.parentId;
    var sibs = o ? children(o.parentId) : [];
    var idx = sibs.map(function (s) { return s.id; }).indexOf(selectedId);
    $('#btn-org-edit').prop('disabled', !o);
    $('#btn-org-del').prop('disabled', isRoot).attr('title', isRoot ? '根節點不可刪除' : '');
    $('#btn-org-up').prop('disabled', isRoot || idx <= 0);
    $('#btn-org-down').prop('disabled', isRoot || idx < 0 || idx >= sibs.length - 1);
  }

  function select(id) {
    selectedId = id;
    renderTree();
    renderUsers();
  }

  function expandAncestors(id) {
    var o = getOrg(id);
    while (o && o.parentId) { expanded[o.parentId] = true; o = getOrg(o.parentId); }
  }

  /* ---------- 人員清單 ---------- */
  function renderUsers() {
    var o = getOrg(selectedId);
    $('#org-title').text(o ? o.name : '');
    var list = users().filter(function (u) { return u.orgId === selectedId; });
    var $b = $('#user-body').empty();
    if (!list.length) {
      $b.append('<tr class="empty-row"><td colspan="8">此組織尚無人員</td></tr>');
    }
    list.forEach(function (u) {
      var $tr = $('<tr></tr>').attr('data-id', u.id);
      $tr.append($('<td class="col-act1 write-only"></td>').append($('<button type="button" class="act-icon btn-user-edit" title="修改">✏️</button>')));
      $tr.append($('<td class="col-act1 write-only"></td>').append($('<button type="button" class="act-icon btn-user-del" title="刪除">🗑</button>')));
      $tr.append($('<td></td>').text(u.empNo || ''));
      $tr.append($('<td></td>').append($('<button type="button" class="btn-text-link btn-user-view"></button>').text(u.account)));
      $tr.append($('<td></td>').append($('<button type="button" class="btn-text-link btn-user-view"></button>').text(u.name)));
      $tr.append($('<td></td>').text(u.role));
      $tr.append($('<td></td>').text(u.email || ''));
      $tr.append($('<td></td>').text(u.title || ''));
      $b.append($tr);
    });
    $('#user-count').text('共 ' + list.length + ' 筆');
  }

  /* ---------- 組織操作 ---------- */
  function notice(title, msg) {
    App.dialog({ title: title, width: 440, body: '<p class="confirm-msg">' + App.esc(msg).replace(/\n/g, '<br>') + '</p>',
      buttons: [{ text: '我知道了', cls: 'btn-primary' }] });
  }

  function orgDialog(mode) {
    if (!App.requireWrite()) return;
    var cur = getOrg(selectedId);
    if (mode === 'edit' && !cur) return;
    var $body = $(
      '<div class="form-row"><label class="form-label required">組織名稱</label><div class="form-field" data-f="name"><input type="text" maxlength="40"><div class="form-error"></div></div></div>' +
      '<div class="form-row"><label class="form-label">上層組織</label><div class="form-field" data-f="parent"><select></select></div></div>');
    $body.find('[data-f=name] input').val(mode === 'edit' ? cur.name : '');
    if (mode === 'add') {
      $body.find('select').html(orgOptions(selectedId));
    } else {
      var p = cur.parentId ? getOrg(cur.parentId) : null;
      $body.find('select').html('<option>' + App.esc(p ? p.name : '（無，根節點）') + '</option>').prop('disabled', true);
      $body.find('[data-f=parent]').append('<div class="form-hint">編輯僅能修改名稱，不變更層級。</div>');
    }
    App.dialog({
      title: mode === 'add' ? '新增組織' : '編輯組織', width: 480, body: $body,
      buttons: [
        { text: '取消', cls: 'btn-secondary' },
        { text: '儲存', cls: 'btn-primary', onClick: function () {
          if (!App.requireWrite()) return false;
          var name = $.trim($body.find('[data-f=name] input').val());
          var parentId = mode === 'add' ? $body.find('select').val() : cur.parentId;
          var $f = $body.find('[data-f=name]');
          var err = '';
          if (!name) err = '請輸入組織名稱';
          else if (orgs().some(function (o) { return o.name === name && (o.parentId || null) === (parentId || null) && (mode === 'add' || o.id !== cur.id); })) err = '同一上層組織下已有相同名稱';
          $f.toggleClass('has-error', !!err).find('.form-error').text(err);
          if (err) return false;
          if (mode === 'add') {
            var sort = children(parentId).length + 1;
            var o = Store.add('orgs', { schoolId: schoolId, parentId: parentId, name: name, sort: sort });
            expanded[parentId] = true;
            expandAncestors(o.id);
            query = ''; $('#org-search').val('');
            App.toast('已新增組織「' + name + '」', 'success');
            select(o.id);
          } else {
            Store.update('orgs', cur.id, { name: name });
            App.toast('已更新組織名稱', 'success');
            renderTree(); renderUsers();
          }
        } }
      ]
    });
  }

  function deleteOrg() {
    if (!App.requireWrite()) return;
    var o = getOrg(selectedId);
    if (!o) return;
    if (!o.parentId) { notice('無法刪除', '「' + o.name + '」為根節點，不可刪除。'); return; }
    var reasons = [];
    var nKids = children(o.id).length;
    var nUsers = users().filter(function (u) { return u.orgId === o.id; }).length;
    var nChem = Store.get('chemicals').filter(function (c) { return c.orgId === o.id; }).length;
    if (nKids) reasons.push('尚有 ' + nKids + ' 個子組織');
    if (nUsers) reasons.push('尚有 ' + nUsers + ' 位人員');
    if (nChem) reasons.push('尚有 ' + nChem + ' 筆化學品引用此組織');
    if (reasons.length) {
      notice('無法刪除組織', '「' + o.name + '」' + reasons.join('、') + '，不可刪除。\n請先移除或轉移相關資料後再刪除。');
      return;
    }
    App.confirm('確定要刪除組織「' + o.name + '」嗎？', { okText: '刪除', danger: true }).then(function (ok) {
      if (!ok) return;
      var pid = o.parentId;
      Store.remove('orgs', o.id);
      normalizeSort(pid);
      App.toast('已刪除組織「' + o.name + '」', 'success');
      select(pid);
    });
  }

  function moveOrg(dir) {
    if (!App.requireWrite()) return;
    var o = getOrg(selectedId);
    if (!o || !o.parentId) return;
    var sibs = children(o.parentId);
    var i = sibs.map(function (s) { return s.id; }).indexOf(o.id);
    var j = i + dir;
    if (j < 0 || j >= sibs.length) return;
    var t = sibs[i]; sibs[i] = sibs[j]; sibs[j] = t;
    sibs.forEach(function (s, k) { if (s.sort !== k + 1) Store.update('orgs', s.id, { sort: k + 1 }); });
    renderTree();
  }

  /* ---------- 人員 Dialog ---------- */
  function row(label, key, inner, required) {
    return '<div class="form-row"><label class="form-label' + (required ? ' required' : '') + '">' + label + '</label>' +
      '<div class="form-field" data-f="' + key + '">' + inner + '<div class="form-error"></div></div></div>';
  }
  function setErr($body, key, msg) {
    $body.find('[data-f=' + key + ']').toggleClass('has-error', !!msg).find('.form-error').text(msg || '');
  }

  function userDialog(mode, userId) {
    var u = userId ? Store.getById('users', userId) : null;
    if (mode !== 'add' && !u) return;
    var view = mode === 'view';
    var $body = $('<div></div>');
    var orgId = u ? u.orgId : selectedId;
    var title = mode === 'add' ? '新增人員' : (view ? '人員資料' : '修改人員');

    if (view) {
      var o = getOrg(u.orgId);
      var vr = function (label, val) {
        return '<div class="form-row"><label class="form-label">' + label + '</label><div class="form-field"><div class="view-value">' + (val ? App.esc(val) : '<span class="muted">—</span>') + '</div></div></div>';
      };
      $body.html('<div class="form-group-title">使用者資料</div>' +
        vr('帳號', u.account) + vr('姓名', u.name) + vr('Email', u.email) + vr('員工編號', u.empNo) + vr('聯絡電話', u.phone) + vr('職稱', u.title) +
        '<div class="form-group-title">角色權限</div>' + vr('角色', u.role) + vr('所屬組織', o ? o.name : ''));
    } else {
      $body.html('<div class="form-group-title">使用者資料</div>' +
        row('帳號', 'account', '<input type="text" maxlength="50" autocomplete="off" placeholder="請輸入登入帳號">', true) +
        row('密碼', 'password', '<input type="password" maxlength="50" autocomplete="new-password">', mode === 'add') +
        row('姓名', 'name', '<input type="text" maxlength="30" placeholder="請輸入姓名">', true) +
        row('Email', 'email', '<input type="text" maxlength="100" placeholder="例如 name@school.edu.tw">', false) +
        row('員工編號', 'empNo', '<input type="text" maxlength="30">', false) +
        row('聯絡電話', 'phone', '<input type="text" maxlength="30">', false) +
        row('職稱', 'title', '<input type="text" maxlength="30">', false) +
        '<div class="form-group-title">角色權限</div>' +
        row('角色', 'role', '<select><option value="">請選擇角色</option>' + ROLES.map(function (r) { return '<option>' + r + '</option>'; }).join('') + '</select>', true) +
        row('所屬組織', 'orgId', '<select>' + orgOptions(orgId) + '</select>', true));
      var $pw = $body.find('[data-f=password] input');
      if (mode === 'edit') {
        $pw.attr('placeholder', '不顯示既有密碼；留空表示不變更');
        ['account', 'name', 'email', 'empNo', 'phone', 'title'].forEach(function (k) { $body.find('[data-f=' + k + '] input').val(u[k] || ''); });
        $body.find('[data-f=role] select').val(u.role);
      } else {
        $pw.attr('placeholder', '請輸入密碼');
        $body.find('[data-f=role] select').val('使用者');
      }
    }

    var buttons;
    if (view) {
      buttons = [
        { text: '修改', cls: 'btn-primary write-only', onClick: function () {
          if (!App.requireWrite()) return false;
          setTimeout(function () { userDialog('edit', u.id); }, 0);
        } },
        { text: '關閉', cls: 'btn-secondary' }
      ];
    } else {
      buttons = [
        { text: '取消', cls: 'btn-secondary' },
        { text: '儲存', cls: 'btn-primary', onClick: function () { return saveUser(mode, u, $body); } }
      ];
    }
    var d = App.dialog({ title: title, width: 640, body: $body, buttons: buttons });
    if (!App.canWrite()) d.el.find('.write-only').hide();
    return d;
  }

  function saveUser(mode, u, $body) {
    if (!App.requireWrite()) return false;
    var v = {};
    ['account', 'password', 'name', 'email', 'empNo', 'phone', 'title'].forEach(function (k) { v[k] = $.trim($body.find('[data-f=' + k + '] input').val()); });
    v.role = $body.find('[data-f=role] select').val();
    v.orgId = $body.find('[data-f=orgId] select').val();
    var err = {};
    if (!v.account) err.account = '請輸入帳號';
    else if (users().some(function (x) { return x.account === v.account && (mode === 'add' || x.id !== u.id); })) err.account = '此帳號已被使用，請改用其他帳號';
    if (mode === 'add' && !v.password) err.password = '請輸入密碼';
    if (!v.name) err.name = '請輸入姓名';
    if (v.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email)) err.email = 'Email 格式不正確';
    if (!v.role) err.role = '請選擇角色';
    else if (ROLES.indexOf(v.role) < 0) err.role = '角色不正確';
    if (!v.orgId || !getOrg(v.orgId)) err.orgId = '請選擇所屬組織';
    if (mode === 'edit' && !err.role && u.role === '系統管理者' && v.role !== '系統管理者' &&
        users().filter(function (x) { return x.role === '系統管理者'; }).length <= 1) {
      err.role = '此為最後一位系統管理者，不可調整為其他角色';
    }
    ['account', 'password', 'name', 'email', 'role', 'orgId'].forEach(function (k) { setErr($body, k, err[k]); });
    var first = Object.keys(err)[0];
    if (first) { $body.find('[data-f=' + first + ']').find('input,select').first().trigger('focus'); return false; }

    if (mode === 'add') {
      var nu = Store.add('users', { schoolId: schoolId, orgId: v.orgId, account: v.account, password: v.password, name: v.name,
        email: v.email, empNo: v.empNo, phone: v.phone, title: v.title, role: v.role });
      App.toast('已新增人員「' + nu.name + '」', 'success');
    } else {
      var patch = { orgId: v.orgId, account: v.account, name: v.name, email: v.email, empNo: v.empNo, phone: v.phone, title: v.title, role: v.role };
      if (v.password) patch.password = v.password;
      Store.update('users', u.id, patch);
      App.toast(v.orgId !== selectedId ? '已儲存，人員已移至「' + getOrg(v.orgId).name + '」' : '已儲存人員資料', 'success');
    }
    if (v.orgId !== selectedId) { expandAncestors(v.orgId); selectedId = v.orgId; }
    renderTree(); renderUsers();
  }

  function deleteUser(id) {
    if (!App.requireWrite()) return;
    var u = Store.getById('users', id);
    if (!u) return;
    if (App.user && u.id === App.user.id) { notice('無法刪除', '不可刪除目前登入的帳號（' + u.account + '　' + u.name + '）。'); return; }
    if (u.role === '系統管理者' && users().filter(function (x) { return x.role === '系統管理者'; }).length <= 1) {
      notice('無法刪除', '「' + u.account + '　' + u.name + '」是最後一位系統管理者，不可刪除。'); return;
    }
    App.confirm('確定要刪除人員嗎？\n帳號：' + u.account + '\n姓名：' + u.name, { okText: '刪除', danger: true }).then(function (ok) {
      if (!ok) return;
      Store.remove('users', u.id);
      App.toast('已刪除人員「' + u.name + '」', 'success');
      renderUsers();
    });
  }

  /* ---------- 事件 ---------- */
  $('#org-tree').on('click', '.org-caret', function (e) {
    e.stopPropagation();
    var id = $(this).attr('data-id');
    if ($(this).hasClass('leaf') || query.trim()) return;
    expanded[id] = !expanded[id];
    renderTree();
  });
  $('#org-tree').on('click', '.org-node', function () { select($(this).attr('data-id')); });
  $('#org-search').on('input', function () { query = $(this).val(); renderTree(); });
  $('#btn-org-add').on('click', function () { orgDialog('add'); });
  $('#btn-org-edit').on('click', function () { orgDialog('edit'); });
  $('#btn-org-del').on('click', deleteOrg);
  $('#btn-org-up').on('click', function () { moveOrg(-1); });
  $('#btn-org-down').on('click', function () { moveOrg(1); });
  $('#btn-user-add').on('click', function () { if (App.requireWrite()) userDialog('add'); });
  $('#user-body').on('click', '.btn-user-view', function () { userDialog('view', $(this).closest('tr').attr('data-id')); });
  $('#user-body').on('click', '.btn-user-edit', function () { if (App.requireWrite()) userDialog('edit', $(this).closest('tr').attr('data-id')); });
  $('#user-body').on('click', '.btn-user-del', function () { deleteUser($(this).closest('tr').attr('data-id')); });

  /* ---------- 初始 ---------- */
  var r = root();
  if (r) {
    expanded[r.id] = true;
    selectedId = r.id;
    children(r.id).forEach(function (c) { expanded[c.id] = true; });
  }
  renderTree();
  renderUsers();
});

/* 示範資料：學校、組織樹、人員、共用位置（PLAN §2.6）。T01／T02 */
(function () {
  'use strict';
  var seed = {};
  seed.schools = [{ id: 'SCH-001', code: 'DEMO01', name: '示範大學', logoText: '示範大學', logoColor: '#1f6fb2' }];
  seed.orgs = [
      { id: 'ORG-001', schoolId: 'SCH-001', parentId: null, name: '示範大學', sort: 1 },
      { id: 'ORG-002', schoolId: 'SCH-001', parentId: 'ORG-001', name: '理學院', sort: 1 },
      { id: 'ORG-003', schoolId: 'SCH-001', parentId: 'ORG-002', name: '化學系', sort: 1 },
      { id: 'ORG-004', schoolId: 'SCH-001', parentId: 'ORG-002', name: '物理系', sort: 2 },
      { id: 'ORG-005', schoolId: 'SCH-001', parentId: 'ORG-001', name: '工學院', sort: 2 },
      { id: 'ORG-006', schoolId: 'SCH-001', parentId: 'ORG-005', name: '化工系', sort: 1 },
      { id: 'ORG-007', schoolId: 'SCH-001', parentId: 'ORG-001', name: '環安中心', sort: 3 }
    ];
  seed.users = [
      { id: 'USR-001', schoolId: 'SCH-001', orgId: 'ORG-001', account: 'admin', password: '1234', name: '王大明', email: 'admin@demo.edu.tw', empNo: 'A0001', phone: '02-2000-0001', title: '中心主任', role: '系統管理者' },
      { id: 'USR-002', schoolId: 'SCH-001', orgId: 'ORG-007', account: 'manager', password: '1234', name: '林美惠', email: 'manager@demo.edu.tw', empNo: 'A0002', phone: '02-2000-0002', title: '環安組長', role: '管理者' },
      { id: 'USR-003', schoolId: 'SCH-001', orgId: 'ORG-003', account: 'user', password: '1234', name: '陳建宏', email: 'user@demo.edu.tw', empNo: 'B0101', phone: '02-2000-0101', title: '助理', role: '使用者' },
      { id: 'USR-004', schoolId: 'SCH-001', orgId: 'ORG-003', account: 'reader', password: '1234', name: '張雅婷', email: 'reader@demo.edu.tw', empNo: 'B0102', phone: '02-2000-0102', title: '行政人員', role: '唯讀使用者' },
      { id: 'USR-005', schoolId: 'SCH-001', orgId: 'ORG-003', account: 'chem.lee', password: '1234', name: '李俊廷', email: 'chem.lee@demo.edu.tw', empNo: 'B0103', phone: '02-2000-0103', title: '研究助理', role: '使用者' },
      { id: 'USR-006', schoolId: 'SCH-001', orgId: 'ORG-004', account: 'phy.wu', password: '1234', name: '吳淑芬', email: 'phy.wu@demo.edu.tw', empNo: 'C0201', phone: '02-2000-0201', title: '實驗室管理員', role: '使用者' },
      { id: 'USR-007', schoolId: 'SCH-001', orgId: 'ORG-004', account: 'phy.chou', password: '1234', name: '周冠宇', email: 'phy.chou@demo.edu.tw', empNo: 'C0202', phone: '02-2000-0202', title: '助教', role: '唯讀使用者' },
      { id: 'USR-008', schoolId: 'SCH-001', orgId: 'ORG-006', account: 'che.huang', password: '1234', name: '黃志豪', email: 'che.huang@demo.edu.tw', empNo: 'D0301', phone: '02-2000-0301', title: '系辦行政', role: '管理者' },
      { id: 'USR-009', schoolId: 'SCH-001', orgId: 'ORG-006', account: 'che.tsai', password: '1234', name: '蔡宜君', email: '', empNo: 'D0302', phone: '', title: '研究生', role: '使用者' }
    ];
  seed.positions = [
      { id: 'POS-001', schoolId: 'SCH-001', name: '化學館 201 實驗室', building: '化學館', usage: '使用', note: '' },
      { id: 'POS-002', schoolId: 'SCH-001', name: '化學館 B1 藥品室', building: '化學館', usage: '儲存', note: '' },
      { id: 'POS-003', schoolId: 'SCH-001', name: '化工館 301 實驗室', building: '化工館', usage: '使用', note: '' },
      { id: 'POS-004', schoolId: 'SCH-001', name: '化工館 3F 藥品櫃', building: '化工館', usage: '儲存', note: '' },
      { id: 'POS-005', schoolId: 'SCH-001', name: '環安中心廢液暫存區', building: '環安中心', usage: '儲存', note: '' },
      { id: 'POS-006', schoolId: 'SCH-001', name: '物理館 105 實驗室', building: '物理館', usage: '使用及儲存', note: '' }
    ];
  Store.registerSeed('schools', 'T01', function () { return seed.schools; });
  Store.registerSeed('orgs', 'T01', function () { return seed.orgs; });
  Store.registerSeed('users', 'T02b', function () { return seed.users; });
  Store.registerSeed('positions', 'T01', function () { return seed.positions; });
})();

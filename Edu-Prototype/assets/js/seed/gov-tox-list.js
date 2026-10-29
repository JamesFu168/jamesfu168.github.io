/* 示範資料：政府毒化物正面表列示範摘錄（來源 docs/plan/seed/gov-tox-list.json）。T01 */
(function () {
  'use strict';
  var GOV_TOX_LIST = {
    "version": "示範摘錄 2026-10-24（來源 PDF 共 26 頁）",
    "items": [
      {
        "listedNo": "001",
        "seriesNo": "01",
        "nameZh": "多氯聯苯",
        "nameEn": "Polychlorinated biphenyls",
        "formula": "C12H10-xClx",
        "cas": [
          "1336-36-3"
        ],
        "controlLevel": "0.1",
        "threshold": "50",
        "toxClass": "1,2",
        "announced": "77.06.22",
        "note": "註 6"
      },
      {
        "listedNo": "003",
        "seriesNo": "01",
        "nameZh": "石綿",
        "nameEn": "Asbestos",
        "formula": "5.5FeO,1.5MgO,8SiO2,H2O",
        "cas": [
          "1332-21-4"
        ],
        "controlLevel": "1",
        "threshold": "500",
        "toxClass": "2",
        "announced": "78.05.01",
        "note": "註 7"
      },
      {
        "listedNo": "009",
        "seriesNo": "01",
        "nameZh": "甲基汞",
        "nameEn": "Methylmercury",
        "formula": "CH3Hg",
        "cas": [
          "22967-92-6"
        ],
        "controlLevel": "1",
        "threshold": "50",
        "toxClass": "1",
        "announced": "78.05.02",
        "note": "註 6"
      },
      {
        "listedNo": "022",
        "seriesNo": "01",
        "nameZh": "汞",
        "nameEn": "Mercury",
        "formula": "Hg",
        "cas": [
          "7439-97-6"
        ],
        "controlLevel": "95",
        "threshold": "50",
        "toxClass": "1",
        "announced": "80.12.07",
        "note": ""
      },
      {
        "listedNo": "036",
        "seriesNo": "01",
        "nameZh": "聯苯胺",
        "nameEn": "Benzidine",
        "formula": "(NH2C6H4)2",
        "cas": [
          "92-87-5"
        ],
        "controlLevel": "1",
        "threshold": "50",
        "toxClass": "2",
        "announced": "81.08.08",
        "note": "註 6"
      },
      {
        "listedNo": "037",
        "seriesNo": "01",
        "nameZh": "鎘",
        "nameEn": "Cadmium",
        "formula": "Cd",
        "cas": [
          "7440-43-9"
        ],
        "controlLevel": "95",
        "threshold": "500",
        "toxClass": "2,3",
        "announced": "81.08.08",
        "note": ""
      },
      {
        "listedNo": "038",
        "seriesNo": "01",
        "nameZh": "苯胺",
        "nameEn": "Aniline",
        "formula": "C6H5NH2",
        "cas": [
          "62-53-3"
        ],
        "controlLevel": "1",
        "threshold": "50",
        "toxClass": "3",
        "announced": "81.08.08",
        "note": ""
      },
      {
        "listedNo": "046",
        "seriesNo": "01",
        "nameZh": "氰化鈉",
        "nameEn": "Sodium cyanide",
        "formula": "NaCN",
        "cas": [
          "143-33-9"
        ],
        "controlLevel": "氰離子含量 1 % 以上",
        "threshold": "500",
        "toxClass": "3",
        "announced": "",
        "note": ""
      },
      {
        "listedNo": "046",
        "seriesNo": "02",
        "nameZh": "氰化鉀",
        "nameEn": "Potassium cyanide",
        "formula": "KCN",
        "cas": [
          "151-50-8"
        ],
        "controlLevel": "氰離子含量 1 % 以上",
        "threshold": "500",
        "toxClass": "3",
        "announced": "",
        "note": ""
      },
      {
        "listedNo": "047",
        "seriesNo": "01",
        "nameZh": "光氣",
        "nameEn": "Phosgene",
        "formula": "COCl2",
        "cas": [
          "75-44-5"
        ],
        "controlLevel": "1",
        "threshold": "5",
        "toxClass": "1,3",
        "announced": "81.08.08",
        "note": ""
      },
      {
        "listedNo": "050",
        "seriesNo": "01",
        "nameZh": "丙烯醯胺",
        "nameEn": "Acrylamide",
        "formula": "CH2CHCONH2",
        "cas": [
          "79-06-1"
        ],
        "controlLevel": "50",
        "threshold": "50",
        "toxClass": "2,3",
        "announced": "82.12.24",
        "note": ""
      },
      {
        "listedNo": "051",
        "seriesNo": "01",
        "nameZh": "丙烯腈",
        "nameEn": "Acrylonitrile",
        "formula": "CH2CHCN",
        "cas": [
          "107-13-1"
        ],
        "controlLevel": "50",
        "threshold": "50",
        "toxClass": "1,2",
        "announced": "82.12.24",
        "note": ""
      },
      {
        "listedNo": "052",
        "seriesNo": "01",
        "nameZh": "苯",
        "nameEn": "Benzene",
        "formula": "C6H6",
        "cas": [
          "71-43-2"
        ],
        "controlLevel": "70",
        "threshold": "50",
        "toxClass": "1,2",
        "announced": "82.12.24",
        "note": ""
      },
      {
        "listedNo": "053",
        "seriesNo": "01",
        "nameZh": "四氯化碳",
        "nameEn": "Carbon tetrachloride",
        "formula": "CCl4",
        "cas": [
          "56-23-5"
        ],
        "controlLevel": "50",
        "threshold": "50",
        "toxClass": "1",
        "announced": "82.12.24",
        "note": ""
      },
      {
        "listedNo": "054",
        "seriesNo": "01",
        "nameZh": "三氯甲烷",
        "nameEn": "Chloroform",
        "formula": "CHCl3",
        "cas": [
          "67-66-3"
        ],
        "controlLevel": "50",
        "threshold": "50",
        "toxClass": "1",
        "announced": "82.12.24",
        "note": ""
      },
      {
        "listedNo": "055",
        "seriesNo": "18",
        "nameZh": "鉻酸鉀",
        "nameEn": "Potassium chromate",
        "formula": "K2CrO4",
        "cas": [
          "7789-00-6"
        ],
        "controlLevel": "六價鉻含量 1 % 以上",
        "threshold": "500",
        "toxClass": "2",
        "announced": "",
        "note": ""
      },
      {
        "listedNo": "055",
        "seriesNo": "20",
        "nameZh": "鉻酸鈉",
        "nameEn": "Sodium chromate",
        "formula": "Na2CrO4",
        "cas": [
          "7775-11-3"
        ],
        "controlLevel": "六價鉻含量 1 % 以上",
        "threshold": "500",
        "toxClass": "2",
        "announced": "",
        "note": ""
      },
      {
        "listedNo": "061",
        "seriesNo": "01",
        "nameZh": "環氧乙烷",
        "nameEn": "Ethylene oxide",
        "formula": "C2H4O",
        "cas": [
          "75-21-8"
        ],
        "controlLevel": "1",
        "threshold": "50",
        "toxClass": "1,2",
        "announced": "86.04.25",
        "note": ""
      },
      {
        "listedNo": "063",
        "seriesNo": "01",
        "nameZh": "四氯乙烯",
        "nameEn": "Tetrachloroethylene",
        "formula": "CCl2CCl2",
        "cas": [
          "127-18-4"
        ],
        "controlLevel": "10",
        "threshold": "350",
        "toxClass": "1,2",
        "announced": "86.10.06",
        "note": ""
      },
      {
        "listedNo": "064",
        "seriesNo": "01",
        "nameZh": "三氯乙烯",
        "nameEn": "Trichloroethylene",
        "formula": "CHClCCl2",
        "cas": [
          "79-01-6"
        ],
        "controlLevel": "10",
        "threshold": "50",
        "toxClass": "1,2",
        "announced": "86.10.06",
        "note": ""
      },
      {
        "listedNo": "065",
        "seriesNo": "01",
        "nameZh": "氯乙烯",
        "nameEn": "Vinyl Chloride",
        "formula": "CH2CHCl",
        "cas": [
          "75-01-4"
        ],
        "controlLevel": "50",
        "threshold": "50",
        "toxClass": "2",
        "announced": "86.10.06",
        "note": ""
      },
      {
        "listedNo": "066",
        "seriesNo": "01",
        "nameZh": "甲醛",
        "nameEn": "Formaldehyde",
        "formula": "HCHO",
        "cas": [
          "50-00-0"
        ],
        "controlLevel": "25",
        "threshold": "50",
        "toxClass": "2,3",
        "announced": "86.10.06",
        "note": ""
      },
      {
        "listedNo": "079",
        "seriesNo": "01",
        "nameZh": "二氯甲烷",
        "nameEn": "Dichloromethane",
        "formula": "CH2Cl2",
        "cas": [
          "75-09-2"
        ],
        "controlLevel": "25",
        "threshold": "--",
        "toxClass": "4",
        "announced": "88.08.16",
        "note": ""
      },
      {
        "listedNo": "080",
        "seriesNo": "01",
        "nameZh": "鄰苯二甲酸二甲酯",
        "nameEn": "Dimethyl phthalate",
        "formula": "C6H4(COOCH3)2",
        "cas": [
          "131-11-3"
        ],
        "controlLevel": "1",
        "threshold": "--",
        "toxClass": "4",
        "announced": "88.08.16",
        "note": ""
      },
      {
        "listedNo": "086",
        "seriesNo": "01",
        "nameZh": "硫酸二甲酯",
        "nameEn": "Dimethyl sulfate",
        "formula": "C2H6O4S",
        "cas": [
          "77-78-1"
        ],
        "controlLevel": "1",
        "threshold": "50",
        "toxClass": "2,3",
        "announced": "88.12.24",
        "note": ""
      },
      {
        "listedNo": "098",
        "seriesNo": "01",
        "nameZh": "二甲基甲醯胺",
        "nameEn": "N,N-Dimethyl formamide",
        "formula": "C3H7NO",
        "cas": [
          "68-12-2"
        ],
        "controlLevel": "30",
        "threshold": "50",
        "toxClass": "2",
        "announced": "88.12.24",
        "note": ""
      },
      {
        "listedNo": "104",
        "seriesNo": "01",
        "nameZh": "乙醛",
        "nameEn": "Acetaldehyde",
        "formula": "C2H4O",
        "cas": [
          "75-07-0"
        ],
        "controlLevel": "1",
        "threshold": "--",
        "toxClass": "4",
        "announced": "88.12.24",
        "note": ""
      },
      {
        "listedNo": "105",
        "seriesNo": "01",
        "nameZh": "乙腈",
        "nameEn": "Acetonitrile",
        "formula": "CH3CN",
        "cas": [
          "75-05-8"
        ],
        "controlLevel": "1",
        "threshold": "--",
        "toxClass": "4",
        "announced": "88.12.24",
        "note": ""
      },
      {
        "listedNo": "165",
        "seriesNo": "01",
        "nameZh": "壬基酚",
        "nameEn": "Nonylphenol",
        "formula": "C6H4(OH)C9H19",
        "cas": [
          "25154-52-3",
          "84852-15-3"
        ],
        "controlLevel": "10",
        "threshold": "50",
        "toxClass": "1",
        "announced": "96.12.17",
        "note": ""
      }
    ]
  };
  Store.registerSeed('govToxList', 'V2-T09', function () { return GOV_TOX_LIST; });
})();

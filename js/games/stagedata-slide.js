// スライディングブロックのステージ(tools/gen_slide.py で自動生成。必ず解けて min が最少手数。手で書き換えない)
// A = 2×2 の大きいブロック。同じ文字のマスが1つのブロック。 . = 空き。出口は下の真ん中
'use strict';

StageData.slide = [
  { min: 4, map: ["BFJM", "CGKN", "D.LN", ".HAA", "EIAA"] },
  { min: 7, map: ["BDGK", "CE.L", ".FHM", "AAIN", "AAJN"] },
  { min: 10, map: [".CFK", "BDGN", ".EHN", "AAIL", "AAJM"] },
  { min: 14, map: ["BGK.", "CNNM", "DHAA", "EIAA", "FJL."] },
  { min: 18, map: ["GG..", "BFJJ", "CFAA", "HHAA", "IIDE"] },
  { min: 22, map: ["B..K", "CEAA", "NFAA", "NGIL", "DHJM"] },
  { min: 27, map: ["BAAK", "CAAN", "DG.N", "EHJL", "FI.M"] },
  { min: 32, map: ["AAHN", "AAIN", "BE..", "CFJL", "DGKM"] },
  { min: 38, map: ["B.AA", "CGAA", "DHJL", "ENNM", "FIK."] },
  { min: 45, map: ["GGAA", "HHAA", "BF.E", ".FII", "CDJJ"] },
];

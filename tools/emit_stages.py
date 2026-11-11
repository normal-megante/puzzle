import json, sys
d = json.load(open(sys.argv[1]))
out = ["// ステージデータ(自動生成して、総当たりで解けることと最少手数を確認済み。手で書き換えない)",
       "// 倉庫番: # 壁 / @ 自分 / $ 箱 / . ゴール   鏡の倉庫番: A 自分 / B 鏡の相手 / a b それぞれのゴール / $ 箱",
       "'use strict';", "", "const StageData = {"]
for key in ('soko', 'mir'):
    out.append(f"  {key}: [")
    for lv in sorted(d[key], key=lambda l: l['min']):
        out.append(f"    {{ min: {lv['min']}, map: {json.dumps(lv['map'])} }},")
    out.append("  ],")
out.append("};")
open(sys.argv[2], 'w', encoding='utf-8', newline='\n').write('\n'.join(out) + '\n')
print('ok')

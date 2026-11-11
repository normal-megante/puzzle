# 合体倉庫番のステージを作って js/games/stagedata-mergebox.js に書き出す。
# 使い方: python tools/gen_mergebox.py   (puzzle フォルダで実行)
# ルール: 箱を押す。同じ数字の箱にぶつけると合体して2倍。目標の数字の箱ができればクリア。
# マップ: # 壁 / @ 自分 / 1,2,3,... 箱(2 の何乗か。1=「2」, 2=「4」, 3=「8」)
import json, random
from collections import deque

DIRS = [(-1, 0), (0, -1), (1, 0), (0, 1)]


def solve(wall, boxes, player, target, cap):
    start = (player, frozenset(boxes.items()))
    dist = {start: 0}
    dq = deque([start])
    while dq:
        st = dq.popleft()
        (px, py), fs = st
        if any(v == target for _, v in fs):
            return dist[st]
        if len(dist) > cap:
            return None
        bx = dict(fs)
        for dx, dy in DIRS:
            n = (px + dx, py + dy)
            if wall[n[1]][n[0]]:
                continue
            nfs = fs
            if n in bx:
                n2 = (n[0] + dx, n[1] + dy)
                if wall[n2[1]][n2[0]]:
                    continue
                nb = dict(bx)
                v = nb.pop(n)
                if n2 in nb:
                    if nb[n2] != v:
                        continue
                    nb[n2] = v + 1
                else:
                    nb[n2] = v
                nfs = frozenset(nb.items())
            ns = (n, nfs)
            if ns not in dist:
                dist[ns] = dist[st] + 1
                dq.append(ns)
    return None


def gen(w, h, vals, target, p, lo, hi, trials, rng, want, cap=60000):
    found = []
    for _ in range(trials):
        W, H = w + 2, h + 2
        wall = [[x in (0, W - 1) or y in (0, H - 1) or rng.random() < p for x in range(W)] for y in range(H)]
        free = [(x, y) for y in range(H) for x in range(W) if not wall[y][x]]
        if len(free) < len(vals) + 6:
            continue
        player = rng.choice(free)
        seen, dq = {player}, deque([player])
        while dq:
            x, y = dq.popleft()
            for dx, dy in DIRS:
                n = (x + dx, y + dy)
                if not wall[n[1]][n[0]] and n not in seen:
                    seen.add(n)
                    dq.append(n)
        for y in range(H):
            for x in range(W):
                if (x, y) not in seen:
                    wall[y][x] = True
        cells = [c for c in seen if c != player]
        if len(cells) < len(vals) + 3:
            continue
        boxes = dict(zip(rng.sample(cells, len(vals)), vals))
        m = solve(wall, boxes, player, target, cap)
        if m is None or not (lo <= m <= hi):
            continue
        rows = [''.join('#' if wall[y][x] else '@' if (x, y) == player else str(boxes[(x, y)]) if (x, y) in boxes else ' '
                        for x in range(W)) for y in range(H)]
        found.append((m, rows))
    found.sort(key=lambda t: t[0])
    step = max(1, len(found) // want)
    picked = found[len(found) - 1 - step * (want - 1)::step][:want] if len(found) >= want else found
    return [{'min': m, 'target': 2 ** target, 'map': rows} for m, rows in picked]


rng = random.Random(2048)
levels = (gen(5, 5, [1, 1], 2, .12, 6, 14, 300, rng, 2)
          + gen(6, 5, [1, 1, 2], 3, .12, 14, 30, 500, rng, 3)
          + gen(6, 6, [2, 2, 3], 4, .14, 22, 45, 500, rng, 2)
          + gen(6, 6, [1, 1, 2, 3], 4, .10, 28, 60, 500, rng, 3, cap=100000))
levels.sort(key=lambda l: l['min'])
out = ["// 合体倉庫番のステージ(tools/gen_mergebox.py で自動生成。必ず解けて min が最少手数。手で書き換えない)",
       "// # 壁 / @ 自分 / 数字 = 箱(1→「2」, 2→「4」, 3→「8」)。target の数字の箱を作ればクリア",
       "'use strict';", "", "StageData.mergebox = ["]
out += [f"  {{ min: {l['min']}, target: {l['target']}, map: {json.dumps(l['map'])} }}," for l in levels]
out.append("];")
open('js/games/stagedata-mergebox.js', 'w', encoding='utf-8', newline='\n').write('\n'.join(out) + '\n')
print([(l['min'], l['target']) for l in levels])

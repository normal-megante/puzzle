# スライディングブロックのステージを作って js/games/stagedata-slide.js に書き出す。
# 使い方: python tools/gen_slide.py   (puzzle フォルダで実行)
# 盤面は 4×5。A = 2×2 の大きいブロック(これを下の真ん中の出口まで動かす)。ほかは 1×1 / 1×2 / 2×1。
# 1マス動かすのを1手と数える。方法は gen_cars.py と同じ(行ける配置を全部調べ、ゴールからの距離で問題を選ぶ)。
import json, random
from collections import deque

W, H = 4, 5
GOAL = (1, 3)
TARGETS = [4, 7, 10, 14, 18, 22, 27, 32, 38, 45]
DIRS = [(-1, 0), (1, 0), (0, -1), (0, 1)]


def cells(w, h, x, y):
    return [(x + i, y + j) for i in range(w) for j in range(h)]


def random_board(rng):
    occ = set()
    pieces = []  # (w, h, x, y)。0番が 2×2
    x, y = rng.randint(0, 2), rng.randint(0, 1)
    pieces.append((2, 2, x, y))
    occ |= set(cells(2, 2, x, y))
    empties = rng.randint(2, 4)
    order = [(x, y) for y in range(H) for x in range(W)]
    rng.shuffle(order)
    for (x, y) in order:
        if (x, y) in occ or W * H - len(occ) <= empties:
            continue
        shapes = [(1, 2), (2, 1), (1, 1), (1, 1)]
        rng.shuffle(shapes)
        for w, h in shapes:
            cs = cells(w, h, x, y)
            if all(0 <= cx < W and 0 <= cy < H and (cx, cy) not in occ for cx, cy in cs):
                if W * H - len(occ) - w * h < empties:
                    continue
                pieces.append((w, h, x, y))
                occ |= set(cs)
                break
    return pieces


def canon(pieces):
    # 同じ形のブロックは区別しない(先頭の 2×2 だけ別扱い)
    return (pieces[0],) + tuple(sorted(pieces[1:]))


def neighbors(st):
    occ = {}
    for i, (w, h, x, y) in enumerate(st):
        for c in cells(w, h, x, y):
            occ[c] = i
    for i, (w, h, x, y) in enumerate(st):
        for dx, dy in DIRS:
            ok = True
            for cx, cy in cells(w, h, x + dx, y + dy):
                if not (0 <= cx < W and 0 <= cy < H) or occ.get((cx, cy), i) != i:
                    ok = False
                    break
            if ok:
                lst = list(st)
                lst[i] = (w, h, x + dx, y + dy)
                yield canon(lst)


def cluster(start, cap=30000):
    seen = {start}
    dq = deque([start])
    while dq:
        for n in neighbors(dq.popleft()):
            if n not in seen:
                seen.add(n)
                dq.append(n)
        if len(seen) > cap:
            return None
    solved = [s for s in seen if (s[0][2], s[0][3]) == GOAL]
    if not solved:
        return None
    dist = {s: 0 for s in solved}
    dq = deque(solved)
    while dq:
        s = dq.popleft()
        for n in neighbors(s):
            if n not in dist:
                dist[n] = dist[s] + 1
                dq.append(n)
    return dist


def to_rows(st):
    g = [['.'] * W for _ in range(H)]
    for i, (w, h, x, y) in enumerate(st):
        for cx, cy in cells(w, h, x, y):
            g[cy][cx] = chr(65 + i)
    return [''.join(r) for r in g]


rng = random.Random(55)
pool = []
for _ in range(90):
    st = canon(random_board(rng))
    dist = cluster(st)
    if dist:
        pool.append((max(dist.values()), dist))
pool.sort(key=lambda t: t[0])
print('max distances:', [p[0] for p in pool[-12:]])

levels = []
for k, t in enumerate(TARGETS):
    # ねらった手数に届く盤面から順番に選ぶ(盤面の数が少ない時は同じ盤面の別の配置も使う)
    cands = [i for i, p in enumerate(pool) if p[0] >= t] or [len(pool) - 1]
    i = cands[k % len(cands)]
    mx, dist = pool[i]
    d = min(t, mx)
    st = rng.choice(sorted(s for s, v in dist.items() if v == d))
    levels.append({'min': d, 'map': to_rows(st)})
levels.sort(key=lambda l: l['min'])

out = ["// スライディングブロックのステージ(tools/gen_slide.py で自動生成。必ず解けて min が最少手数。手で書き換えない)",
       "// A = 2×2 の大きいブロック。同じ文字のマスが1つのブロック。 . = 空き。出口は下の真ん中",
       "'use strict';", "", "StageData.slide = ["]
out += [f"  {{ min: {l['min']}, map: {json.dumps(l['map'])} }}," for l in levels]
out.append("];")
open('js/games/stagedata-slide.js', 'w', encoding='utf-8', newline='\n').write('\n'.join(out) + '\n')
print([l['min'] for l in levels])

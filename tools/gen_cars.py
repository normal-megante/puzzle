# 車ずらしのステージを作って js/games/stagedata-cars.js に書き出す。
# 使い方: python tools/gen_cars.py   (puzzle フォルダで実行)
# 方法: ランダムに車を置く → そこから行ける全部の配置を調べる → 「ゴール済みの配置」からの距離を全配置について求める
#       → ねらった手数ちょうどの配置を問題として採用する(必ず解けて、最少手数も分かる)。
import json, random
from collections import deque

N, EXIT_ROW = 6, 2
TARGETS = [3, 5, 7, 9, 11, 13, 15, 17, 19, 22, 25, 28]


def random_board(rng):
    # 車 = (向き 'h'/'v', 長さ, 固定の行または列)。位置(動く方向の座標)は別に持つ。0番が赤い車。
    cars, pos = [('h', 2, EXIT_ROW)], [rng.randint(0, 2)]
    occ = {(pos[0] + k, EXIT_ROW) for k in range(2)}
    for _ in range(rng.randint(8, 12)):
        for _try in range(30):
            o, ln = rng.choice('hv'), 2 if rng.random() < 0.7 else 3
            line, p = rng.randint(0, N - 1), rng.randint(0, N - ln)
            if o == 'h' and line == EXIT_ROW:
                continue  # 出口の行に横向きの車があると永久に出られない
            cells = {(p + k, line) if o == 'h' else (line, p + k) for k in range(ln)}
            if cells & occ:
                continue
            occ |= cells
            cars.append((o, ln, line))
            pos.append(p)
            break
    return cars, tuple(pos)


def neighbors(cars, st):
    grid = [[False] * N for _ in range(N)]
    for (o, ln, line), p in zip(cars, st):
        for k in range(ln):
            if o == 'h':
                grid[line][p + k] = True
            else:
                grid[p + k][line] = True
    for i, ((o, ln, line), p) in enumerate(zip(cars, st)):
        q = p - 1
        while q >= 0 and not (grid[line][q] if o == 'h' else grid[q][line]):
            yield st[:i] + (q,) + st[i + 1:]
            q -= 1
        q = p + 1
        while q + ln - 1 < N and not (grid[line][q + ln - 1] if o == 'h' else grid[q + ln - 1][line]):
            yield st[:i] + (q,) + st[i + 1:]
            q += 1


def cluster(cars, start, cap=40000):
    seen = {start}
    dq = deque([start])
    while dq:
        for n in neighbors(cars, dq.popleft()):
            if n not in seen:
                seen.add(n)
                dq.append(n)
        if len(seen) > cap:
            return None
    solved = [s for s in seen if s[0] == N - 2]
    if not solved:
        return None
    dist = {s: 0 for s in solved}
    dq = deque(solved)
    while dq:
        s = dq.popleft()
        for n in neighbors(cars, s):
            if n not in dist:
                dist[n] = dist[s] + 1
                dq.append(n)
    return dist


def to_rows(cars, st):
    g = [['.'] * N for _ in range(N)]
    for i, ((o, ln, line), p) in enumerate(zip(cars, st)):
        for k in range(ln):
            if o == 'h':
                g[line][p + k] = chr(65 + i)
            else:
                g[p + k][line] = chr(65 + i)
    return [''.join(r) for r in g]


rng = random.Random(4649)
pool = []  # (最大距離, cars, dist)
for _ in range(400):
    cars, st = random_board(rng)
    dist = cluster(cars, st)
    if dist:
        pool.append((max(dist.values()), cars, dist))
pool.sort(key=lambda t: t[0])
print('max distances:', [p[0] for p in pool[-15:]])

levels, used = [], set()
for t in TARGETS:
    # ねらった手数に届く盤面のうち、まだ使っていないものから選ぶ(届かなければ一番近いもの)
    cands = [i for i, p in enumerate(pool) if p[0] >= t and i not in used] or [max(i for i in range(len(pool)) if i not in used)]
    i = cands[min(len(cands) - 1, rng.randint(0, 3))]
    used.add(i)
    mx, cars, dist = pool[i]
    d = min(t, mx)
    st = rng.choice(sorted(s for s, v in dist.items() if v == d))
    levels.append({'min': d, 'map': to_rows(cars, st)})
levels.sort(key=lambda l: l['min'])

out = ["// 車ずらしのステージ(tools/gen_cars.py で自動生成。必ず解けて min が最少手数。手で書き換えない)",
       "// A = 赤い車(横向き・3行目)。同じ文字のマスが1台の車。 . = 空き",
       "'use strict';", "", "StageData.cars = ["]
out += [f"  {{ min: {l['min']}, map: {json.dumps(l['map'])} }}," for l in levels]
out.append("];")
open('js/games/stagedata-cars.js', 'w', encoding='utf-8', newline='\n').write('\n'.join(out) + '\n')
print([l['min'] for l in levels])

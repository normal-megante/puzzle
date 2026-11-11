# 倉庫番 / 鏡の倉庫番 のステージをランダムに作り、幅優先探索で解けるものだけ選ぶ
import json, random, sys
from collections import deque

DIRS = [(-1, 0), (0, -1), (1, 0), (0, 1)]  # 左 上 右 下
MIRROR = [2, 1, 0, 3]


def make_walls(w, h, p, rng):
    W, H = w + 2, h + 2
    wall = [[x in (0, W - 1) or y in (0, H - 1) or rng.random() < p for x in range(W)] for y in range(H)]
    return W, H, wall


def reach(wall, W, H, start):
    seen = {start}
    dq = deque([start])
    while dq:
        x, y = dq.popleft()
        for dx, dy in DIRS:
            n = (x + dx, y + dy)
            if not wall[n[1]][n[0]] and n not in seen:
                seen.add(n)
                dq.append(n)
    return seen


# ---------- 倉庫番 ----------
def soko_solve(wall, goals, boxes, player, cap):
    goals = frozenset(goals)
    dead = set()
    H, W = len(wall), len(wall[0])
    for y in range(H):
        for x in range(W):
            if not wall[y][x] and (x, y) not in goals:
                if (wall[y][x - 1] or wall[y][x + 1]) and (wall[y - 1][x] or wall[y + 1][x]):
                    dead.add((x, y))
    start = (player, frozenset(boxes))
    dist = {start: (0, 0)}
    dq = deque([start])
    while dq:
        st = dq.popleft()
        (px, py), bx = st
        d, pushes = dist[st]
        if bx == goals:
            return d, pushes
        if len(dist) > cap:
            return None
        for dx, dy in DIRS:
            n = (px + dx, py + dy)
            if wall[n[1]][n[0]]:
                continue
            nb, np_ = bx, pushes
            if n in bx:
                n2 = (n[0] + dx, n[1] + dy)
                if wall[n2[1]][n2[0]] or n2 in bx or n2 in dead:
                    continue
                nb = (bx - {n}) | {n2}
                np_ += 1
            ns = (n, nb)
            if ns not in dist:
                dist[ns] = (d + 1, np_)
                dq.append(ns)
    return None


def soko_gen(w, h, k, p, lo, hi, trials, rng, want, cap=60000):
    found = []
    for _ in range(trials):
        W, H, wall = make_walls(w, h, p, rng)
        free = [(x, y) for y in range(H) for x in range(W) if not wall[y][x]]
        if len(free) < 2 * k + 4:
            continue
        player = rng.choice(free)
        area = reach(wall, W, H, player)
        for y in range(H):
            for x in range(W):
                if (x, y) not in area:
                    wall[y][x] = True
        cells = [c for c in area if c != player]
        if len(cells) < 2 * k + 2:
            continue
        pick = rng.sample(cells, 2 * k)
        goals, boxes = pick[:k], pick[k:]
        res = soko_solve(wall, goals, boxes, player, cap)
        if not res or not (lo <= res[0] <= hi) or res[1] < 2 * k + 1:
            continue
        rows = []
        for y in range(H):
            row = ''
            for x in range(W):
                c = (x, y)
                row += '#' if wall[y][x] else '@' if c == player else '$' if c in boxes else '.' if c in goals else ' '
            rows.append(row)
        found.append((res[0], res[1], rows))
    found.sort(key=lambda t: (t[1], t[0]))
    # 押す回数が多いものを優先しつつ、ばらけるように選ぶ
    step = max(1, len(found) // want)
    picked = found[len(found) - 1 - step * (want - 1)::step][:want] if len(found) >= want else found
    return [{'min': m, 'map': rows} for m, _, rows in picked]


# ---------- 鏡の倉庫番 ----------
def mir_step(wall, a, b, boxes, d):
    def attempt(me, other, boxes, d):
        dx, dy = DIRS[d]
        n = (me[0] + dx, me[1] + dy)
        if wall[n[1]][n[0]] or n == other:
            return me, boxes
        if n in boxes:
            n2 = (n[0] + dx, n[1] + dy)
            if wall[n2[1]][n2[0]] or n2 in boxes or n2 == other:
                return me, boxes
            boxes = (boxes - {n}) | {n2}
        return n, boxes
    a, boxes = attempt(a, b, boxes, d)
    b, boxes = attempt(b, a, boxes, MIRROR[d])
    return a, b, boxes


def mir_solve(wall, a, b, ga, gb, boxes, cap):
    start = (a, b, frozenset(boxes))
    dist = {start: (0, False)}
    dq = deque([start])
    while dq:
        st = dq.popleft()
        d, pushed = dist[st]
        if st[0] == ga and st[1] == gb:
            return d, pushed
        if len(dist) > cap:
            return None
        for k in range(4):
            ns = mir_step(wall, st[0], st[1], st[2], k)
            if ns not in dist:
                dist[ns] = (d + 1, pushed or ns[2] != st[2])
                dq.append(ns)
    return None


def mir_gen(w, h, k, p, lo, hi, trials, rng, want, cap=80000):
    found = []
    for _ in range(trials):
        W, H, wall = make_walls(w, h, p, rng)
        free = [(x, y) for y in range(H) for x in range(W) if not wall[y][x]]
        if len(free) < k + 6:
            continue
        a = rng.choice(free)
        area = reach(wall, W, H, a)
        for y in range(H):
            for x in range(W):
                if (x, y) not in area:
                    wall[y][x] = True
        cells = [c for c in area if c != a]
        if len(cells) < k + 4:
            continue
        pick = rng.sample(cells, 3 + k)
        b, ga, gb, boxes = pick[0], pick[1], pick[2], pick[3:]
        res = mir_solve(wall, a, b, ga, gb, boxes, cap)
        if not res or not (lo <= res[0] <= hi):
            continue
        if k:  # 箱を全部どけても同じ手数で解けるなら、箱の意味がないので捨てる
            easy = mir_solve(wall, a, b, ga, gb, [], cap)
            if not res[1] and easy and easy[0] <= res[0]:
                continue
        rows = []
        for y in range(H):
            row = ''
            for x in range(W):
                c = (x, y)
                row += '#' if wall[y][x] else 'A' if c == a else 'B' if c == b else '$' if c in boxes else 'a' if c == ga else 'b' if c == gb else ' '
            rows.append(row)
        found.append((res[0], rows))
    found.sort(key=lambda t: t[0])
    step = max(1, len(found) // want)
    picked = found[len(found) - 1 - step * (want - 1)::step][:want] if len(found) >= want else found
    return [{'min': m, 'map': rows} for m, rows in picked]


rng = random.Random(20261111)
soko = (soko_gen(5, 5, 1, .12, 8, 16, 400, rng, 2)
        + soko_gen(6, 5, 2, .12, 14, 30, 700, rng, 3)
        + soko_gen(6, 6, 2, .14, 28, 50, 900, rng, 3)
        + soko_gen(7, 6, 3, .12, 35, 80, 700, rng, 2, cap=120000))
mir = (mir_gen(5, 5, 0, .15, 5, 9, 400, rng, 3)
       + mir_gen(6, 6, 1, .15, 9, 16, 600, rng, 3)
       + mir_gen(7, 7, 1, .16, 14, 30, 600, rng, 2)
       + mir_gen(7, 7, 2, .16, 16, 40, 600, rng, 2))
json.dump({'soko': soko, 'mir': mir}, open(sys.argv[1], 'w'), indent=0)
for name, lv in (('soko', soko), ('mir', mir)):
    print(name, [l['min'] for l in lv])
    for l in lv:
        print('\n'.join(l['map']), l['min'], '\n')

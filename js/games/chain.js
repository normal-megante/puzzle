// 連鎖ブロック(2個1組の玉が落ちてくる。同じ色が4個以上つながると消え、落ちてまた消えると「連鎖」)
// grid[行][列] = 0(空)または色番号。cur = 落下中の組 {x, y, o, a, b}:(x,y) に a、向き o のとなりに b。
// 状態 state: idle / play / resolve(消えたり落ちたりの処理中。操作できない) / pause / over
// 見た目(canvas と操作ボタン)は落ちものブロックの CSS(fb-)を流用。
'use strict';

registerPuzzle({
  id: 'chain',
  name: '連鎖ブロック',
  icon: '🫧',
  desc: '同じ色を4個つなげて消そう。連鎖で高得点',

  start(root, api) {
    const W = 6, H = 12;
    const COLORS = ['', '#e5484d', '#3b7dd8', '#2fa66a', '#e0a100'];
    const MARKS = ['', '●', '■', '▲', '◆'];
    const DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0]; // b の位置:上 右 下 左
    let grid, cur, next, score, popped, chainMax, popping = new Set();
    let state = 'idle', before = 'play', timer = null, waits = [], repeat = null;

    root.innerHTML = `
      <div class="stats">
        <div><small>スコア</small><b id="cb-score">0</b></div>
        <div><small>最大連鎖</small><b id="cb-chain">0</b></div>
        <div><small>ベスト</small><b id="cb-best">-</b></div>
      </div>
      <div class="fb-main">
        <canvas id="cb-canvas" class="fb-canvas cb"></canvas>
        <div class="fb-side">
          <small>つぎ</small>
          <canvas id="cb-next" class="fb-next cb"></canvas>
          <button class="btn primary" id="cb-start">スタート</button>
        </div>
      </div>
      <p class="msg" id="cb-msg"></p>
      <div class="fb-pad" id="cb-pad">
        <button class="btn" data-act="left" aria-label="左">←</button>
        <button class="btn" data-act="rot" aria-label="回す">⟳ 回す</button>
        <button class="btn" data-act="right" aria-label="右">→</button>
        <button class="btn" data-act="down" aria-label="下">↓</button>
        <button class="btn" data-act="drop">⤓ 一気に落とす</button>
      </div>
      <p class="note">同じ色(同じ記号)の玉が、たて・よこに4個以上つながると消えます。消えたあとに上の玉が落ちて、また4個つながると<b>連鎖</b>になり、点数が2倍、3倍…と増えます。<br>左から3列目のいちばん上まで積もるとゲームオーバー。パソコンは矢印キー(↑で回す)とスペース、P で一時停止。</p>`;

    const $ = id => root.querySelector('#' + id);
    const canvas = $('cb-canvas'), ctx = canvas.getContext('2d');
    const nextCv = $('cb-next'), nctx = nextCv.getContext('2d');
    const css = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    const wait = (fn, ms) => { waits.push(setTimeout(fn, ms)); };

    const free = (x, y) => x >= 0 && x < W && y < H && (y < 0 || !grid[y][x]);
    const fits = c => free(c.x, c.y) && free(c.x + DX[c.o], c.y + DY[c.o]);
    const randPair = () => ({ a: 1 + Math.floor(Math.random() * 4), b: 1 + Math.floor(Math.random() * 4) });

    function ball(g, x, y, s, c, flash) {
      g.fillStyle = flash ? '#fff' : COLORS[c];
      g.beginPath();
      g.arc(x * s + s / 2, y * s + s / 2, s * 0.44, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = flash ? COLORS[c] : 'rgba(255,255,255,.85)';
      g.font = `${Math.round(s * 0.42)}px sans-serif`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(MARKS[c], x * s + s / 2, y * s + s / 2 + s * 0.03);
    }

    function draw() {
      const dpr = window.devicePixelRatio || 1;
      const cw = canvas.clientWidth;
      if (canvas.width !== Math.round(cw * dpr)) { canvas.width = Math.round(cw * dpr); canvas.height = Math.round(cw * dpr * H / W); }
      const s = canvas.width / W;
      ctx.fillStyle = css('--card');
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'rgba(229,72,77,.18)'; // ここまで積もるとゲームオーバー
      ctx.fillRect(2 * s, 0, s, s);
      grid.forEach((row, y) => row.forEach((v, x) => { if (v) ball(ctx, x, y, s, v, popping.has(y * W + x)); }));
      if (cur && (state === 'play' || state === 'pause')) {
        ball(ctx, cur.x, cur.y, s, cur.a);
        ball(ctx, cur.x + DX[cur.o], cur.y + DY[cur.o], s, cur.b);
      }
      const nw = nextCv.clientWidth;
      nextCv.width = Math.round(nw * dpr); nextCv.height = Math.round(nw * dpr * 2);
      nctx.clearRect(0, 0, nextCv.width, nextCv.height);
      if (next) { ball(nctx, 0, 0, nextCv.width, next.b); ball(nctx, 0, 1, nextCv.width, next.a); }
      $('cb-score').textContent = score;
      $('cb-chain').textContent = chainMax;
      $('cb-start').textContent = state === 'pause' ? '再開' : state === 'over' ? 'もう一度' : state === 'idle' ? 'スタート' : '一時停止';
    }

    function showBest() {
      const b = api.load('best', null);
      $('cb-best').textContent = b === null ? '-' : b;
    }

    function setSpeed() {
      clearInterval(timer);
      timer = setInterval(tick, Math.max(150, 650 - Math.floor(popped / 30) * 60));
    }

    function gameOver() {
      state = 'over';
      clearInterval(timer);
      timer = null;
      const old = api.load('best', null);
      const isNew = old === null || score > old;
      if (isNew) api.save('best', score);
      showBest();
      $('cb-msg').textContent = `ゲームオーバー(スコア ${score}・最大 ${chainMax} 連鎖)` + (isNew && score > 0 ? ' 新記録!' : '');
    }

    function spawn() {
      if (grid[0][2]) { gameOver(); return; }
      cur = { x: 2, y: 0, o: 0, a: next.a, b: next.b };
      next = randPair();
      state = 'play';
    }

    function gravity() {
      for (let x = 0; x < W; x++) {
        let floor = H - 1;
        for (let y = H - 1; y >= 0; y--) {
          const v = grid[y][x];
          if (v) { grid[y][x] = 0; grid[floor][x] = v; floor--; }
        }
      }
    }

    function groups() { // 4個以上つながっているマスの集まり
      const seen = new Set(), out = [];
      for (let i = 0; i < W * H; i++) {
        const v = grid[Math.floor(i / W)][i % W];
        if (!v || seen.has(i)) continue;
        const g = [i];
        seen.add(i);
        for (let k = 0; k < g.length; k++) {
          const x = g[k] % W, y = Math.floor(g[k] / W);
          for (let d = 0; d < 4; d++) {
            const nx = x + DX[d], ny = y + DY[d], j = ny * W + nx;
            if (nx >= 0 && nx < W && ny >= 0 && ny < H && grid[ny][nx] === v && !seen.has(j)) { seen.add(j); g.push(j); }
          }
        }
        if (g.length >= 4) out.push(...g);
      }
      return out;
    }

    function resolve(chain) { // 落とす → 4個以上を光らせる → 消す → くり返し
      gravity();
      const hit = groups();
      if (!hit.length) { popping.clear(); spawn(); draw(); return; }
      popping = new Set(hit);
      chainMax = Math.max(chainMax, chain);
      $('cb-msg').textContent = chain > 1 ? `${chain} 連鎖!` : '';
      draw();
      wait(() => {
        hit.forEach(i => { grid[Math.floor(i / W)][i % W] = 0; });
        score += hit.length * 10 * chain;
        const lvBefore = Math.floor(popped / 30);
        popped += hit.length;
        if (Math.floor(popped / 30) !== lvBefore) setSpeed();
        popping.clear();
        draw();
        wait(() => resolve(chain + 1), 220);
      }, 260);
    }

    function lock() {
      [[cur.x, cur.y, cur.a], [cur.x + DX[cur.o], cur.y + DY[cur.o], cur.b]].forEach(([x, y, c]) => { if (y >= 0) grid[y][x] = c; });
      cur = null;
      state = 'resolve';
      $('cb-msg').textContent = '';
      resolve(1);
    }

    function tick() {
      if (state !== 'play') return;
      if (fits({ ...cur, y: cur.y + 1 })) cur.y++; else lock();
      draw();
    }

    function act(a) {
      if (state !== 'play') return;
      if (a === 'left' && fits({ ...cur, x: cur.x - 1 })) cur.x--;
      else if (a === 'right' && fits({ ...cur, x: cur.x + 1 })) cur.x++;
      else if (a === 'down') { if (fits({ ...cur, y: cur.y + 1 })) { cur.y++; score++; } else lock(); }
      else if (a === 'drop') { while (fits({ ...cur, y: cur.y + 1 })) { cur.y++; score++; } lock(); }
      else if (a === 'rot') {
        const o = (cur.o + 1) % 4;
        // 壁やほかの玉にぶつかる時は、横か上にずらして回す
        const t = [[0, 0], [-1, 0], [1, 0], [0, -1]].map(([dx, dy]) => ({ ...cur, o, x: cur.x + dx, y: cur.y + dy })).find(fits);
        if (t) cur = t;
      }
      draw();
    }

    function startGame() {
      waits.forEach(clearTimeout);
      waits = [];
      grid = Array.from({ length: H }, () => Array(W).fill(0));
      score = 0; popped = 0; chainMax = 0; popping.clear();
      next = randPair();
      $('cb-msg').textContent = '';
      spawn();
      setSpeed();
      draw();
    }

    function toggle() {
      if (state === 'resolve') return; // 消えている最中は止めない(すぐ終わる)
      if (state === 'play') { state = 'pause'; $('cb-msg').textContent = '一時停止中'; }
      else if (state === 'pause') { state = 'play'; $('cb-msg').textContent = ''; }
      else startGame();
      draw();
    }

    const stopRepeat = () => { clearTimeout(repeat); clearInterval(repeat); repeat = null; };
    $('cb-pad').addEventListener('pointerdown', e => {
      const el = e.target.closest('[data-act]');
      if (!el) return;
      e.preventDefault();
      const a = el.dataset.act;
      act(a);
      stopRepeat();
      if (a === 'left' || a === 'right' || a === 'down') {
        repeat = setTimeout(() => { repeat = setInterval(() => act(a), 70); }, 220);
      }
    });
    document.addEventListener('pointerup', stopRepeat);
    document.addEventListener('pointercancel', stopRepeat);
    $('cb-start').addEventListener('click', toggle);
    function onKey(e) {
      const a = { ArrowLeft: 'left', ArrowRight: 'right', ArrowDown: 'down', ArrowUp: 'rot', ' ': 'drop' }[e.key];
      if (a) { e.preventDefault(); act(a); }
      else if (e.key === 'p' || e.key === 'P') toggle();
    }
    document.addEventListener('keydown', onKey);
    const onHide = () => { if (document.hidden && state === 'play') toggle(); };
    document.addEventListener('visibilitychange', onHide);

    grid = Array.from({ length: H }, () => Array(W).fill(0));
    score = 0; popped = 0; chainMax = 0; cur = null; next = null;
    showBest();
    draw();

    return () => {
      clearInterval(timer);
      waits.forEach(clearTimeout);
      stopRepeat();
      document.removeEventListener('pointerup', stopRepeat);
      document.removeEventListener('pointercancel', stopRepeat);
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('visibilitychange', onHide);
    };
  },
});

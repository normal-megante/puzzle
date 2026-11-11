// 落ちものブロック(上から落ちてくるブロックを並べ、横一列そろえると消える)
// grid[行][列] = 0(空)または色番号。cur = 今落ちているブロック {m: 形の行列, x, y, c: 色番号}。
// 画面は canvas に描く。ゲームの進行は setInterval(tick)。画面を離れると止まる(後片付けで clearInterval)。
'use strict';

registerPuzzle({
  id: 'fall',
  name: '落ちものブロック',
  icon: '🧱',
  desc: '落ちてくるブロックを並べて、横一列そろえて消そう',

  start(root, api) {
    const W = 10, H = 18;
    const SHAPES = [
      [[1, 1, 1, 1]],
      [[1, 1], [1, 1]],
      [[0, 1, 0], [1, 1, 1]],
      [[0, 1, 1], [1, 1, 0]],
      [[1, 1, 0], [0, 1, 1]],
      [[1, 0, 0], [1, 1, 1]],
      [[0, 0, 1], [1, 1, 1]],
    ];
    const COLORS = ['', '#1fa3a3', '#e0a100', '#8e5bd6', '#2fa66a', '#e5484d', '#3b7dd8', '#c9762a'];
    let grid, cur, next, score, lines, level, timer = null, state = 'idle'; // idle / play / pause / over
    let repeat = null;

    root.innerHTML = `
      <div class="stats">
        <div><small>スコア</small><b id="fb-score">0</b></div>
        <div><small>消した列</small><b id="fb-lines">0</b></div>
        <div><small>レベル</small><b id="fb-level">1</b></div>
        <div><small>ベスト</small><b id="fb-best">-</b></div>
      </div>
      <div class="fb-main">
        <canvas id="fb-canvas" class="fb-canvas"></canvas>
        <div class="fb-side">
          <small>つぎ</small>
          <canvas id="fb-next" class="fb-next"></canvas>
          <button class="btn primary" id="fb-start">スタート</button>
        </div>
      </div>
      <p class="msg" id="fb-msg"></p>
      <div class="fb-pad" id="fb-pad">
        <button class="btn" data-act="left" aria-label="左">←</button>
        <button class="btn" data-act="rot" aria-label="回す">⟳ 回す</button>
        <button class="btn" data-act="right" aria-label="右">→</button>
        <button class="btn" data-act="down" aria-label="下">↓</button>
        <button class="btn" data-act="drop">⤓ 一気に落とす</button>
      </div>
      <p class="note">横一列がすき間なくそろうと消えます。一度にたくさん消すほど高得点。10列消すごとにレベルが上がって速くなります。<br>← → ↓ は押しっぱなしで連続して動きます。パソコンは矢印キー(↑で回す)とスペース(一気に落とす)、P で一時停止。</p>`;

    const $ = id => root.querySelector('#' + id);
    const canvas = $('fb-canvas'), ctx = canvas.getContext('2d');
    const nextCv = $('fb-next'), nctx = nextCv.getContext('2d');
    const css = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

    const rotate = m => m[0].map((_, c) => m.map(row => row[c]).reverse());
    const collide = (m, x, y) => m.some((row, r) => row.some((v, c) => v
      && (x + c < 0 || x + c >= W || y + r >= H || (y + r >= 0 && grid[y + r][x + c]))));
    const randPiece = () => { const c = 1 + Math.floor(Math.random() * SHAPES.length); return { m: SHAPES[c - 1], c }; };

    function drawCell(g, x, y, s, color, ghost) {
      if (ghost) { g.strokeStyle = color; g.lineWidth = 2; g.strokeRect(x * s + 3, y * s + 3, s - 6, s - 6); return; }
      g.fillStyle = color;
      g.fillRect(x * s + 1, y * s + 1, s - 2, s - 2);
      g.fillStyle = 'rgba(255,255,255,.25)';
      g.fillRect(x * s + 1, y * s + 1, s - 2, Math.max(2, s * 0.14));
    }

    function draw() {
      const dpr = window.devicePixelRatio || 1;
      const cw = canvas.clientWidth;
      if (canvas.width !== Math.round(cw * dpr)) { canvas.width = Math.round(cw * dpr); canvas.height = Math.round(cw * dpr * H / W); }
      const s = canvas.width / W;
      ctx.fillStyle = css('--card');
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = css('--line');
      ctx.lineWidth = 1;
      for (let x = 1; x < W; x++) { ctx.beginPath(); ctx.moveTo(x * s, 0); ctx.lineTo(x * s, canvas.height); ctx.stroke(); }
      for (let y = 1; y < H; y++) { ctx.beginPath(); ctx.moveTo(0, y * s); ctx.lineTo(canvas.width, y * s); ctx.stroke(); }
      grid.forEach((row, y) => row.forEach((v, x) => { if (v) drawCell(ctx, x, y, s, COLORS[v]); }));
      if (cur && state !== 'idle') {
        let gy = cur.y;
        while (!collide(cur.m, cur.x, gy + 1)) gy++; // 落ちる先の目安
        cur.m.forEach((row, r) => row.forEach((v, c) => { if (v && gy + r >= 0) drawCell(ctx, cur.x + c, gy + r, s, COLORS[cur.c], true); }));
        cur.m.forEach((row, r) => row.forEach((v, c) => { if (v && cur.y + r >= 0) drawCell(ctx, cur.x + c, cur.y + r, s, COLORS[cur.c]); }));
      }
      const nw = nextCv.clientWidth;
      nextCv.width = Math.round(nw * dpr); nextCv.height = Math.round(nw * dpr / 2);
      nctx.clearRect(0, 0, nextCv.width, nextCv.height);
      if (next) {
        const ns = nextCv.width / 4;
        next.m.forEach((row, r) => row.forEach((v, c) => { if (v) drawCell(nctx, c + (4 - row.length) / 2, r + (2 - next.m.length) / 2, ns, COLORS[next.c]); }));
      }
      $('fb-score').textContent = score;
      $('fb-lines').textContent = lines;
      $('fb-level').textContent = level;
      $('fb-start').textContent = state === 'play' ? '一時停止' : state === 'pause' ? '再開' : state === 'over' ? 'もう一度' : 'スタート';
    }

    function showBest() {
      const b = api.load('best', null);
      $('fb-best').textContent = b === null ? '-' : b;
    }

    function setSpeed() {
      clearInterval(timer);
      timer = setInterval(tick, Math.max(90, 700 - (level - 1) * 60));
    }

    function spawn() {
      cur = { m: next.m, c: next.c, x: Math.floor((W - next.m[0].length) / 2), y: 0 };
      next = randPiece();
      if (collide(cur.m, cur.x, cur.y)) gameOver();
    }

    function gameOver() {
      state = 'over';
      clearInterval(timer);
      timer = null;
      const old = api.load('best', null);
      const isNew = old === null || score > old;
      if (isNew) api.save('best', score);
      showBest();
      $('fb-msg').textContent = `ゲームオーバー(スコア ${score})` + (isNew && score > 0 ? ' 新記録!' : '');
    }

    function lock() {
      cur.m.forEach((row, r) => row.forEach((v, c) => { if (v && cur.y + r >= 0) grid[cur.y + r][cur.x + c] = cur.c; }));
      const kept = grid.filter(row => row.some(v => !v));
      const cleared = H - kept.length;
      if (cleared) {
        grid = Array.from({ length: cleared }, () => Array(W).fill(0)).concat(kept);
        score += [0, 100, 300, 500, 800][cleared] * level;
        lines += cleared;
        const newLevel = 1 + Math.floor(lines / 10);
        if (newLevel !== level) { level = newLevel; setSpeed(); }
      }
      spawn();
    }

    function tick() {
      if (state !== 'play') return;
      if (collide(cur.m, cur.x, cur.y + 1)) lock(); else cur.y++;
      draw();
    }

    function act(a) {
      if (state !== 'play') return;
      if (a === 'left' && !collide(cur.m, cur.x - 1, cur.y)) cur.x--;
      else if (a === 'right' && !collide(cur.m, cur.x + 1, cur.y)) cur.x++;
      else if (a === 'down') { if (collide(cur.m, cur.x, cur.y + 1)) lock(); else { cur.y++; score++; } }
      else if (a === 'drop') { while (!collide(cur.m, cur.x, cur.y + 1)) { cur.y++; score += 2; } lock(); }
      else if (a === 'rot') {
        const m = rotate(cur.m);
        const kick = [0, -1, 1, -2, 2].find(k => !collide(m, cur.x + k, cur.y)); // 壁ぎわでは横にずらして回す
        if (kick !== undefined) { cur.m = m; cur.x += kick; }
      }
      draw();
    }

    function startGame() {
      grid = Array.from({ length: H }, () => Array(W).fill(0));
      score = 0; lines = 0; level = 1;
      next = randPiece();
      state = 'play';
      $('fb-msg').textContent = '';
      spawn();
      setSpeed();
      draw();
    }

    function toggle() {
      if (state === 'play') { state = 'pause'; $('fb-msg').textContent = '一時停止中'; }
      else if (state === 'pause') { state = 'play'; $('fb-msg').textContent = ''; }
      else startGame();
      draw();
    }

    const stopRepeat = () => { clearTimeout(repeat); clearInterval(repeat); repeat = null; };
    $('fb-pad').addEventListener('pointerdown', e => {
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
    $('fb-start').addEventListener('click', toggle);
    function onKey(e) {
      const a = { ArrowLeft: 'left', ArrowRight: 'right', ArrowDown: 'down', ArrowUp: 'rot', ' ': 'drop' }[e.key];
      if (a) { e.preventDefault(); act(a); }
      else if (e.key === 'p' || e.key === 'P') toggle();
    }
    document.addEventListener('keydown', onKey);
    const onHide = () => { if (document.hidden && state === 'play') toggle(); }; // 別のアプリに切り替えたら一時停止
    document.addEventListener('visibilitychange', onHide);

    grid = Array.from({ length: H }, () => Array(W).fill(0));
    score = 0; lines = 0; level = 1; cur = null; next = null;
    showBest();
    draw();

    return () => {
      clearInterval(timer);
      stopRepeat();
      document.removeEventListener('pointerup', stopRepeat);
      document.removeEventListener('pointercancel', stopRepeat);
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('visibilitychange', onHide);
    };
  },
});

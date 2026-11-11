// 数字合体(4×4。同じ数字をぶつけると合体して2倍になる)
// g[位置] = 数字(0 は空き)。途中の状態は自動保存する。
'use strict';

registerPuzzle({
  id: 'merge',
  name: '数字合体',
  icon: '🔗',
  desc: '同じ数字をくっつけて 2048 を作ろう',

  start(root, api) {
    const N = 4, GOAL = 2048;
    let g, score, reached, over;

    root.innerHTML = `
      <div class="row"><button class="btn primary" id="n-new">新しいゲーム</button></div>
      <div class="stats">
        <div><small>スコア</small><b id="n-score">0</b></div>
        <div><small>ベスト</small><b id="n-best">0</b></div>
      </div>
      <div class="n-board" id="n-board"></div>
      <p class="msg" id="n-msg"></p>
      <p class="note">盤面をスワイプ(パソコンは矢印キー)すると、全部の数字がその方向に動きます。<br>途中の状態は自動で保存されます。</p>`;

    const $ = id => root.querySelector('#' + id);
    const board = $('n-board');

    function paint(pop = []) {
      board.innerHTML = '';
      g.forEach((v, i) => {
        const d = document.createElement('div');
        d.className = 'n-tile' + (v ? '' : ' empty') + (pop.includes(i) ? ' pop' : '') + (v >= 1000 ? ' small' : '');
        if (v) {
          d.textContent = v;
          d.style.background = `hsl(${(200 + Math.log2(v) * 28) % 360} 60% 46%)`;
        }
        board.appendChild(d);
      });
      $('n-score').textContent = score;
      const best = Math.max(api.load('best', 0), score);
      api.save('best', best);
      $('n-best').textContent = best;
      $('n-msg').textContent = over ? `ゲームオーバー(スコア ${score})` : reached ? `🎉 ${GOAL} 達成! このまま続けられます` : '';
      api.save('state', { g, score, reached });
    }

    function addTile() {
      const empty = g.map((v, i) => (v ? -1 : i)).filter(i => i >= 0);
      const i = empty[Math.floor(Math.random() * empty.length)];
      g[i] = Math.random() < 0.9 ? 2 : 4;
      return i;
    }

    function stuck() {
      return g.every((v, i) => v
        && (i % N === N - 1 || g[i + 1] !== v)
        && (i >= N * (N - 1) || g[i + N] !== v));
    }

    function move(dir) { // 0=左 1=上 2=右 3=下
      if (over) return;
      let moved = false;
      const pop = [];
      for (let a = 0; a < N; a++) {
        // 動く方向の先頭から順に並べた位置
        const idx = [0, 1, 2, 3].map(b => [a * N + b, b * N + a, a * N + N - 1 - b, (N - 1 - b) * N + a][dir]);
        const vals = idx.map(i => g[i]).filter(v => v);
        const out = [];
        for (let k = 0; k < vals.length; k++) {
          if (vals[k] === vals[k + 1]) {
            out.push(vals[k] * 2);
            score += vals[k] * 2;
            pop.push(idx[out.length - 1]);
            if (vals[k] * 2 === GOAL) reached = true;
            k++;
          } else out.push(vals[k]);
        }
        idx.forEach((i, k) => {
          const v = out[k] || 0;
          if (g[i] !== v) moved = true;
          g[i] = v;
        });
      }
      if (!moved) return;
      pop.push(addTile());
      over = stuck();
      paint(pop);
    }

    function newGame() {
      g = Array(N * N).fill(0);
      score = 0; reached = false; over = false;
      paint([addTile(), addTile()]);
    }

    // スワイプ
    let sx = 0, sy = 0, down = false;
    board.addEventListener('pointerdown', e => { down = true; sx = e.clientX; sy = e.clientY; });
    board.addEventListener('pointercancel', () => { down = false; });
    board.addEventListener('pointerup', e => {
      if (!down) return;
      down = false;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
      move(Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 0 : 2) : (dy < 0 ? 1 : 3));
    });
    function onKey(e) {
      const dir = ['ArrowLeft', 'ArrowUp', 'ArrowRight', 'ArrowDown'].indexOf(e.key);
      if (dir < 0) return;
      e.preventDefault();
      move(dir);
    }
    document.addEventListener('keydown', onKey);
    $('n-new').addEventListener('click', newGame);

    const saved = api.load('state', null);
    if (saved && Array.isArray(saved.g) && saved.g.length === N * N) {
      g = saved.g; score = saved.score || 0; reached = !!saved.reached; over = stuck();
      paint();
    } else newGame();

    return () => document.removeEventListener('keydown', onKey);
  },
});

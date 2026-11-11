// さめがめ(同じ色が2個以上つながったかたまりを消す)
// cols[列] = その列のブロック(下から順)。消すと上が落ち、空いた列は左に詰まる。
'use strict';

registerPuzzle({
  id: 'same',
  name: 'さめがめ',
  icon: '🟦',
  desc: '同じ色のかたまりを消して高得点をねらおう',

  start(root, api) {
    const W = 10, H = 12;
    const COLORS = ['#e5484d', '#3b7dd8', '#2fa66a', '#e0a100', '#8e5bd6'];
    const MARKS = ['●', '■', '▲', '◆', '★']; // 色が見分けにくい人のための記号
    let colors = api.load('colors', 4);
    if (![3, 4, 5].includes(colors)) colors = 4;
    let cols, score, done, prev;

    root.innerHTML = `
      <div class="row" id="s-sizes">
        ${[3, 4, 5].map(s => `<button class="btn" data-colors="${s}">${s}色</button>`).join('')}
        <button class="btn primary" id="s-new">新しいゲーム</button>
      </div>
      <div class="stats">
        <div><small>スコア</small><b id="s-score">0</b></div>
        <div><small>残り</small><b id="s-left">0</b></div>
        <div><small>ベスト</small><b id="s-best">-</b></div>
      </div>
      <div class="row">
        <button class="btn" id="s-undo">1手戻す</button>
      </div>
      <div class="s-board" id="s-board"></div>
      <p class="msg" id="s-msg"></p>
      <p class="note">同じ色が2個以上つながったかたまりをタップで消します。一度にたくさん消すほど高得点((個数−2)²点)。<br>全部消すと +1000 点。問題によっては全部消せないこともあります。</p>`;

    const $ = id => root.querySelector('#' + id);
    const board = $('s-board');
    board.style.setProperty('--w', W);

    function showBest() {
      const b = api.load('best' + colors, null);
      $('s-best').textContent = b === null ? '-' : b;
    }

    function group(c, r) { // つながっている同じ色のマス [[列, 段], ...]
      const v = cols[c][r], seen = new Set([c + ',' + r]), out = [[c, r]];
      for (let k = 0; k < out.length; k++) {
        const [x, y] = out[k];
        for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
          if (cols[nx] && cols[nx][ny] === v && !seen.has(nx + ',' + ny)) {
            seen.add(nx + ',' + ny);
            out.push([nx, ny]);
          }
        }
      }
      return out;
    }

    function hasMoves() {
      return cols.some((col, c) => col.some((v, r) => col[r + 1] === v || (cols[c + 1] && cols[c + 1][r] === v)));
    }

    function paint() {
      let html = '';
      for (let row = H - 1; row >= 0; row--) {
        for (let c = 0; c < W; c++) {
          const v = cols[c] ? cols[c][row] : undefined;
          html += v === undefined
            ? '<span class="s-cell"></span>'
            : `<button class="s-cell" data-c="${c}" data-r="${row}" style="background:${COLORS[v]}">${MARKS[v]}</button>`;
        }
      }
      board.innerHTML = html;
      $('s-score').textContent = score;
      $('s-left').textContent = cols.reduce((a, col) => a + col.length, 0);
      $('s-undo').disabled = !prev || done;
    }

    function newGame() {
      cols = Array.from({ length: W }, () => Array.from({ length: H }, () => Math.floor(Math.random() * colors)));
      score = 0; done = false; prev = null;
      root.querySelectorAll('[data-colors]').forEach(b => b.classList.toggle('on', +b.dataset.colors === colors));
      $('s-msg').textContent = '';
      showBest();
      paint();
    }

    function finish(cleared) {
      done = true;
      if (cleared) score += 1000;
      const old = api.load('best' + colors, null);
      const isNew = old === null || score > old;
      if (isNew) api.save('best' + colors, score);
      showBest();
      $('s-msg').textContent = (cleared ? '🎉 全部消した! ' : '消せるかたまりがなくなりました。') + `スコア ${score}` + (isNew ? '(新記録)' : '');
    }

    function tap(c, r) {
      if (done) return;
      const g = group(c, r);
      if (g.length < 2) return;
      prev = { cols: cols.map(col => col.slice()), score };
      const kill = new Set(g.map(([x, y]) => x + ',' + y));
      cols = cols.map((col, x) => col.filter((_, y) => !kill.has(x + ',' + y))).filter(col => col.length);
      score += (g.length - 2) ** 2;
      if (!cols.length) finish(true);
      else if (!hasMoves()) finish(false);
      paint();
    }

    board.addEventListener('click', e => {
      const b = e.target.closest('[data-c]');
      if (b) tap(+b.dataset.c, +b.dataset.r);
    });
    $('s-undo').addEventListener('click', () => {
      if (!prev || done) return;
      cols = prev.cols; score = prev.score; prev = null;
      paint();
    });
    $('s-sizes').addEventListener('click', e => {
      const s = e.target.dataset.colors;
      if (s) { colors = +s; api.save('colors', colors); }
      if (s || e.target.id === 's-new') newGame();
    });
    newGame();
  },
});

// 3マッチ(となり合う2個を入れかえて、同じ色を3個以上ならべて消す。20手でスコアを競う)
// g[位置] = 色番号(0〜4)。-1 は消えて空いたマス(すぐ上から落ちてきて埋まる)。
// busy = 消える・落ちるの処理中(操作できない)。
'use strict';

registerPuzzle({
  id: 'match3',
  name: '3マッチ',
  icon: '💎',
  desc: '入れかえて3個そろえて消そう。20手でハイスコアをねらえ',

  start(root, api) {
    const N = 7, MOVES = 20;
    const COLORS = ['#e5484d', '#3b7dd8', '#2fa66a', '#e0a100', '#8e5bd6'];
    const MARKS = ['●', '■', '▲', '◆', '★'];
    let g, sel, score, left, busy, over, waits = [], popping = new Set();
    let cellEls = [];

    root.innerHTML = `
      <div class="row"><button class="btn primary" id="m3-new">新しいゲーム</button></div>
      <div class="stats">
        <div><small>スコア</small><b id="m3-score">0</b></div>
        <div><small>残りの手数</small><b id="m3-left">0</b></div>
        <div><small>ベスト</small><b id="m3-best">-</b></div>
      </div>
      <div class="m3-board" id="m3-board"></div>
      <p class="msg" id="m3-msg"></p>
      <p class="note">となり合う2個を入れかえます(1個目をタップ → となりをタップ。または動かしたい方向へスワイプ)。<br>たて・よこに同じ色(同じ記号)が3個以上ならぶ入れかえだけができます。消えたあと続けて消えると点数が2倍、3倍…と増えます。<br>動かせる所がなくなった時は、自動でまぜ直します。</p>`;

    const $ = id => root.querySelector('#' + id);
    const board = $('m3-board');
    board.style.setProperty('--n', N);
    board.innerHTML = Array.from({ length: N * N }, (_, i) => `<button class="m3-cell" data-i="${i}"></button>`).join('');
    cellEls = [...board.children];
    const wait = (fn, ms) => { waits.push(setTimeout(fn, ms)); };
    const rnd = () => Math.floor(Math.random() * COLORS.length);

    function matches(a) { // 3個以上ならんでいるマス
      const out = new Set();
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        const v = a[r * N + c];
        if (v < 0) continue;
        if (c + 2 < N && a[r * N + c + 1] === v && a[r * N + c + 2] === v) [0, 1, 2].forEach(k => out.add(r * N + c + k));
        if (r + 2 < N && a[(r + 1) * N + c] === v && a[(r + 2) * N + c] === v) [0, 1, 2].forEach(k => out.add((r + k) * N + c));
      }
      return out;
    }

    function hasMove(a) {
      for (let i = 0; i < N * N; i++) {
        for (const j of [i % N < N - 1 ? i + 1 : -1, i + N < N * N ? i + N : -1]) {
          if (j < 0) continue;
          [a[i], a[j]] = [a[j], a[i]];
          const ok = matches(a).size > 0;
          [a[i], a[j]] = [a[j], a[i]];
          if (ok) return true;
        }
      }
      return false;
    }

    function freshBoard() { // 最初からそろっている所がなく、動かせる所がある盤面
      for (;;) {
        const a = [];
        for (let i = 0; i < N * N; i++) {
          let v;
          do v = rnd(); while ((i % N >= 2 && a[i - 1] === v && a[i - 2] === v) || (i >= 2 * N && a[i - N] === v && a[i - 2 * N] === v));
          a.push(v);
        }
        if (hasMove(a)) return a;
      }
    }

    function paint() {
      cellEls.forEach((el, i) => {
        const v = g[i];
        el.className = 'm3-cell' + (i === sel ? ' sel' : '') + (popping.has(i) ? ' pop' : '') + (v < 0 ? ' empty' : '');
        el.style.background = v < 0 ? '' : COLORS[v];
        el.textContent = v < 0 ? '' : MARKS[v];
      });
      $('m3-score').textContent = score;
      $('m3-left').textContent = left;
    }

    function showBest() {
      const b = api.load('best', null);
      $('m3-best').textContent = b === null ? '-' : b;
    }

    function finish() {
      over = true;
      const old = api.load('best', null);
      const isNew = old === null || score > old;
      if (isNew) api.save('best', score);
      showBest();
      $('m3-msg').textContent = `おしまい! スコア ${score}` + (isNew ? '(新記録)' : '');
    }

    function cascade(mult) {
      const m = matches(g);
      if (!m.size) {
        busy = false;
        if (left <= 0) finish();
        else if (!hasMove(g)) { g = freshBoard(); $('m3-msg').textContent = '動かせる所がないので、まぜ直しました'; }
        paint();
        return;
      }
      popping = m;
      if (mult > 1) $('m3-msg').textContent = `${mult} 連続!(×${mult})`;
      paint();
      wait(() => {
        score += m.size * 10 * mult;
        m.forEach(i => { g[i] = -1; });
        popping = new Set();
        for (let c = 0; c < N; c++) { // 落として、上から新しいのを足す
          const col = [];
          for (let r = N - 1; r >= 0; r--) if (g[r * N + c] >= 0) col.push(g[r * N + c]);
          for (let r = N - 1, k = 0; r >= 0; r--, k++) g[r * N + c] = k < col.length ? col[k] : rnd();
        }
        paint();
        wait(() => cascade(mult + 1), 240);
      }, 240);
    }

    function trySwap(a, b) {
      if (busy || over || b < 0) return;
      [g[a], g[b]] = [g[b], g[a]];
      if (!matches(g).size) {
        [g[a], g[b]] = [g[b], g[a]];
        $('m3-msg').textContent = 'そこは入れかえてもそろいません';
        paint();
        return;
      }
      $('m3-msg').textContent = '';
      left--;
      busy = true;
      cascade(1);
    }

    const adjacent = (a, b) => Math.abs(a % N - b % N) + Math.abs(Math.floor(a / N) - Math.floor(b / N)) === 1;

    let down = null;
    board.addEventListener('pointerdown', e => {
      const el = e.target.closest('[data-i]');
      down = el ? { i: +el.dataset.i, x: e.clientX, y: e.clientY } : null;
    });
    board.addEventListener('pointerup', e => {
      if (!down || busy || over) { down = null; return; }
      const { i } = down, dx = e.clientX - down.x, dy = e.clientY - down.y;
      down = null;
      if (Math.max(Math.abs(dx), Math.abs(dy)) >= 18) { // スワイプ
        const horiz = Math.abs(dx) > Math.abs(dy);
        const x = i % N + (horiz ? Math.sign(dx) : 0), y = Math.floor(i / N) + (horiz ? 0 : Math.sign(dy));
        sel = -1;
        trySwap(i, x < 0 || y < 0 || x >= N || y >= N ? -1 : y * N + x);
      } else if (sel >= 0 && adjacent(sel, i)) { const a = sel; sel = -1; trySwap(a, i); }
      else { sel = sel === i ? -1 : i; paint(); }
    });

    function newGame() {
      waits.forEach(clearTimeout);
      waits = [];
      g = freshBoard();
      sel = -1; score = 0; left = MOVES; busy = false; over = false; popping = new Set();
      $('m3-msg').textContent = '';
      showBest();
      paint();
    }
    $('m3-new').addEventListener('click', newGame);
    newGame();

    return () => waits.forEach(clearTimeout);
  },
});

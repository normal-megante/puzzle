// 重力スライド(オリジナル)
// 盤面を左右に90度回す。壁(-1)は盤面といっしょに回り、色ブロック(1〜)だけが下に落ちる。
// 同じ色のブロックが全部たて・よこでつながればクリア。
// 問題はランダムに作り、総当たり(幅優先探索)で最少手数がねらった範囲のものだけ採用する。
'use strict';

registerPuzzle({
  id: 'gravity',
  name: '重力スライド',
  icon: '🌀',
  desc: 'オリジナル:盤面を回してブロックを落とし、同じ色をくっつけよう',

  start(root, api) {
    const LEVELS = {
      easy: { name: 'かんたん', size: 5, colors: 2, per: 2, walls: 3, lo: 3, hi: 6 },
      mid: { name: 'ふつう', size: 6, colors: 3, per: 2, walls: 5, lo: 5, hi: 9 },
      hard: { name: 'むずかしい', size: 7, colors: 3, per: 3, walls: 7, lo: 8, hi: 16 },
    };
    const COLORS = ['', '#e5484d', '#3b7dd8', '#2fa66a'];
    const MARKS = ['', '●', '■', '▲'];
    let lv = api.load('level', 'easy');
    if (!LEVELS[lv]) lv = 'easy';
    let n, g, first, moves, min, history, done, busy = false, animTimer = null;

    root.innerHTML = `
      <div class="row" id="y-levels">
        ${Object.entries(LEVELS).map(([k, v]) => `<button class="btn" data-level="${k}">${v.name}</button>`).join('')}
      </div>
      <div class="row">
        <button class="btn" id="y-undo">1手戻す</button>
        <button class="btn" id="y-retry">最初から</button>
        <button class="btn primary" id="y-new">新しい問題</button>
      </div>
      <div class="stats">
        <div><small>手数(最少 <span id="y-min"></span>)</small><b id="y-moves">0</b></div>
        <div><small>クリアした数</small><b id="y-clears">0</b></div>
      </div>
      <div class="y-wrap"><div class="y-board" id="y-board"></div></div>
      <p class="msg" id="y-msg"></p>
      <div class="row">
        <button class="btn y-rot" id="y-left">⟲ 左に回す</button>
        <button class="btn y-rot" id="y-right">右に回す ⟳</button>
      </div>
      <p class="note">ボタン(パソコンは ← → キー)で盤面を90度回します。灰色の壁は盤面といっしょに回り、<b>色ブロックだけが下に落ちます</b>。<br>同じ色(同じ記号)のブロックが全部、たて・よこでつながればクリア。全部の色を同時にそろえる必要があります。</p>`;

    const $ = id => root.querySelector('#' + id);
    const board = $('y-board');

    function rotate(a, dir) { // dir: 1=右回り -1=左回り
      const b = Array(n * n);
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
        b[r * n + c] = dir > 0 ? a[(n - 1 - c) * n + r] : a[c * n + (n - 1 - r)];
      }
      return b;
    }
    function fall(a) {
      const b = a.slice();
      for (let c = 0; c < n; c++) {
        let floor = n - 1;
        for (let r = n - 1; r >= 0; r--) {
          const v = b[r * n + c];
          if (v === -1) floor = r - 1;
          else if (v > 0) { b[r * n + c] = 0; b[floor * n + c] = v; floor--; }
        }
      }
      return b;
    }
    const turn = (a, dir) => fall(rotate(a, dir));

    function solved(a) {
      for (let col = 1; col < COLORS.length; col++) {
        const cells = a.map((v, i) => (v === col ? i : -1)).filter(i => i >= 0);
        if (!cells.length) continue;
        const seen = new Set([cells[0]]), q = [cells[0]];
        for (let k = 0; k < q.length; k++) {
          const i = q[k];
          for (const j of [i % n > 0 ? i - 1 : -1, i % n < n - 1 ? i + 1 : -1, i - n, i + n]) {
            if (j >= 0 && j < n * n && a[j] === col && !seen.has(j)) { seen.add(j); q.push(j); }
          }
        }
        if (seen.size < cells.length) return false;
      }
      return true;
    }

    function minMoves(a) { // 解けなければ -1
      const dist = new Map([[a.join(), 0]]), q = [a];
      for (let k = 0; k < q.length && k < 4000; k++) {
        const d = dist.get(q[k].join());
        if (solved(q[k])) return d;
        for (const dir of [1, -1]) {
          const b = turn(q[k], dir);
          if (!dist.has(b.join())) { dist.set(b.join(), d + 1); q.push(b); }
        }
      }
      return -1;
    }

    function generate() {
      const L = LEVELS[lv];
      n = L.size;
      for (let attempt = 0; ; attempt++) {
        const cells = Array.from({ length: n * n }, (_, i) => i).sort(() => Math.random() - 0.5);
        let a = Array(n * n).fill(0), k = 0;
        for (let w = 0; w < L.walls; w++) a[cells[k++]] = -1;
        for (let col = 1; col <= L.colors; col++) for (let p = 0; p < L.per; p++) a[cells[k++]] = col;
        a = fall(a);
        if (solved(a)) continue;
        const m = minMoves(a);
        // 何度作ってもだめな時は、少しずつ条件をゆるめる
        if (m >= Math.max(2, L.lo - Math.floor(attempt / 300)) && m <= L.hi) { first = a; min = m; return; }
      }
    }

    function paint() {
      board.innerHTML = g.map(v => v === -1 ? '<span class="y-cell wall"></span>'
        : v > 0 ? `<span class="y-cell"><i style="background:${COLORS[v]}">${MARKS[v]}</i></span>`
          : '<span class="y-cell"></span>').join('');
      $('y-moves').textContent = moves;
      $('y-undo').disabled = !history.length || done;
    }

    function reset() {
      clearTimeout(animTimer);
      busy = false;
      board.style.transition = 'none';
      board.style.transform = '';
      g = first.slice();
      moves = 0; history = []; done = false;
      $('y-msg').textContent = '';
      paint();
    }

    function newGame() {
      generate();
      board.style.setProperty('--n', n);
      root.querySelectorAll('[data-level]').forEach(b => b.classList.toggle('on', b.dataset.level === lv));
      $('y-min').textContent = min;
      $('y-clears').textContent = api.load('clears_' + lv, 0);
      reset();
    }

    function doTurn(dir) {
      if (done || busy) return;
      busy = true;
      history.push(g);
      // 先に盤面が回る様子を見せてから、回した後(落ちた後)の状態に切り替える
      board.style.transition = 'transform .25s ease-in-out';
      board.style.transform = `rotate(${dir * 90}deg)`;
      animTimer = setTimeout(() => {
        board.style.transition = 'none';
        board.style.transform = '';
        g = turn(g, dir);
        moves++;
        busy = false;
        if (solved(g)) {
          done = true;
          const clears = api.load('clears_' + lv, 0) + 1;
          api.save('clears_' + lv, clears);
          $('y-clears').textContent = clears;
          $('y-msg').textContent = `🎉 クリア! ${moves}手` + (moves <= min ? '(最少手数!)' : '');
        }
        paint();
      }, 260);
    }

    $('y-left').addEventListener('click', () => doTurn(-1));
    $('y-right').addEventListener('click', () => doTurn(1));
    function onKey(e) {
      if (e.key === 'ArrowLeft') { e.preventDefault(); doTurn(-1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); doTurn(1); }
    }
    document.addEventListener('keydown', onKey);
    $('y-undo').addEventListener('click', () => {
      if (done || busy || !history.length) return;
      g = history.pop();
      moves--;
      paint();
    });
    $('y-retry').addEventListener('click', reset);
    $('y-new').addEventListener('click', newGame);
    $('y-levels').addEventListener('click', e => {
      const k = e.target.dataset.level;
      if (k) { lv = k; api.save('level', lv); newGame(); }
    });
    newGame();

    return () => { clearTimeout(animTimer); document.removeEventListener('keydown', onKey); };
  },
});

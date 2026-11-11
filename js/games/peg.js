// ペグソリティア(駒をとなりの駒を飛びこえて動かし、飛びこえた駒を取る。最後の1個にすればクリア)
// 盤面は十字形(7×7 の四すみ 2×2 を除いた33マス)。peg[位置] = 駒があるか。hole[位置] = 盤面のマスか。
// 「クラシック」は真ん中だけ空の定番の配置。ほかは、駒1個の状態から「逆向きの手」をくり返して作る(必ず解ける)。
'use strict';

registerPuzzle({
  id: 'peg',
  name: 'ペグソリティア',
  icon: '🔘',
  desc: '駒を飛びこえて取っていき、最後の1個にしよう',

  start(root, api) {
    const N = 7;
    const LEVELS = { easy: ['かんたん', 6], mid: ['ふつう', 12], hard: ['むずかしい', 20], classic: ['クラシック', 0] };
    const hole = Array.from({ length: N * N }, (_, i) => {
      const r = Math.floor(i / N), c = i % N;
      return (r >= 2 && r <= 4) || (c >= 2 && c <= 4);
    });
    const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    let lv = api.load('level', 'easy');
    if (!LEVELS[lv]) lv = 'easy';
    let first, peg, sel, history, done;
    let cellEls = [];

    // a から d の向きに1つ先(mid)と2つ先(to)。盤面の外なら null
    function line(a, d) {
      const r = Math.floor(a / N), c = a % N;
      const r2 = r + DIRS[d][1] * 2, c2 = c + DIRS[d][0] * 2;
      if (r2 < 0 || c2 < 0 || r2 >= N || c2 >= N) return null;
      const mid = (r + DIRS[d][1]) * N + c + DIRS[d][0], to = r2 * N + c2;
      return hole[mid] && hole[to] ? { mid, to } : null;
    }
    const jumpsFrom = (p, a) => [0, 1, 2, 3].map(d => line(a, d)).filter(l => l && p[a] && p[l.mid] && !p[l.to]);

    function generate() {
      if (lv === 'classic') { first = hole.map((h, i) => h && i !== 24); return; }
      for (;;) {
        const cells = hole.map((h, i) => (h ? i : -1)).filter(i => i >= 0);
        const p = Array(N * N).fill(false);
        p[cells[Math.floor(Math.random() * cells.length)]] = true;
        let made = 0;
        for (let guard = 0; made < LEVELS[lv][1] && guard < 400; guard++) {
          // 逆向きの手:駒 a を取りのぞき、そのとなり(mid)と2つ先(to)に駒を置く
          const a = cells[Math.floor(Math.random() * cells.length)];
          const l = line(a, Math.floor(Math.random() * 4));
          if (!p[a] || !l || p[l.mid] || p[l.to]) continue;
          p[a] = false; p[l.mid] = true; p[l.to] = true;
          made++;
        }
        if (made === LEVELS[lv][1]) { first = p; return; }
      }
    }

    root.innerHTML = `
      <div class="row" id="pg-levels">
        ${Object.entries(LEVELS).map(([k, v]) => `<button class="btn" data-level="${k}">${v[0]}</button>`).join('')}
      </div>
      <div class="row">
        <button class="btn" id="pg-undo">1手戻す</button>
        <button class="btn" id="pg-retry">最初から</button>
        <button class="btn primary" id="pg-new">新しい問題</button>
      </div>
      <div class="stats">
        <div><small>残りの駒</small><b id="pg-left">0</b></div>
        <div><small>クリアした数</small><b id="pg-clears">0</b></div>
      </div>
      <div class="pg-board" id="pg-board"></div>
      <p class="msg" id="pg-msg"></p>
      <p class="note">動かしたい駒をタップ → 行き先(光っている穴)をタップ。<br>駒は、<b>となりの駒を1つ飛びこえて</b>、その先の空いている穴へ動けます(たて・よこだけ)。飛びこえられた駒は取りのぞかれます。<br>駒が最後の1個になればクリア。「クラシック」は昔からある定番の配置で、かなりの難問です。</p>`;

    const $ = id => root.querySelector('#' + id);
    const board = $('pg-board');
    board.innerHTML = hole.map((h, i) => h ? `<button class="pg-cell" data-i="${i}"></button>` : '<span></span>').join('');
    cellEls = [...board.children];

    function paint() {
      const targets = sel >= 0 ? jumpsFrom(peg, sel).map(l => l.to) : [];
      cellEls.forEach((el, i) => {
        if (hole[i]) el.className = 'pg-cell' + (peg[i] ? ' peg' : '') + (i === sel ? ' sel' : '') + (targets.includes(i) ? ' can' : '');
      });
      $('pg-left').textContent = peg.filter(Boolean).length;
      $('pg-undo').disabled = !history.length || done;
    }

    function reset() {
      peg = first.slice();
      sel = -1; history = []; done = false;
      $('pg-msg').textContent = '';
      paint();
    }

    function newGame() {
      generate();
      root.querySelectorAll('[data-level]').forEach(b => b.classList.toggle('on', b.dataset.level === lv));
      $('pg-clears').textContent = api.load('clears_' + lv, 0);
      reset();
    }

    board.addEventListener('click', e => {
      const el = e.target.closest('[data-i]');
      if (!el || done) return;
      const i = +el.dataset.i;
      const jump = sel >= 0 ? jumpsFrom(peg, sel).find(l => l.to === i) : null;
      if (jump) {
        history.push(peg.slice());
        peg[sel] = false; peg[jump.mid] = false; peg[i] = true;
        sel = jumpsFrom(peg, i).length ? i : -1; // 続けて飛べるなら、そのまま選んでおく
        const left = peg.filter(Boolean).length;
        if (left === 1) {
          done = true; sel = -1;
          const clears = api.load('clears_' + lv, 0) + 1;
          api.save('clears_' + lv, clears);
          $('pg-clears').textContent = clears;
          $('pg-msg').textContent = '🎉 最後の1個! クリア';
        } else if (!peg.some((v, a) => v && jumpsFrom(peg, a).length)) {
          $('pg-msg').textContent = `動かせる駒がなくなりました(残り${left}個)。「1手戻す」か「最初から」でやり直せます`;
        }
      } else sel = peg[i] && sel !== i ? i : -1;
      paint();
    });
    $('pg-undo').addEventListener('click', () => {
      if (done || !history.length) return;
      peg = history.pop();
      sel = -1;
      $('pg-msg').textContent = '';
      paint();
    });
    $('pg-retry').addEventListener('click', reset);
    $('pg-new').addEventListener('click', newGame);
    $('pg-levels').addEventListener('click', e => {
      const k = e.target.dataset.level;
      if (k) { lv = k; api.save('level', lv); newGame(); }
    });
    newGame();
  },
});

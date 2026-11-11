// ひとりリバーシ(詰めリバーシ)
// 黒だけを打つ。リバーシと同じく、白をはさむと黒になる(1個もはさめない所には打てない)。
// 決められた手数以内に、白を全部黒にすればクリア。
// b[位置]: 0=空 1=黒 2=白。問題はランダムに作り、総当たりで「最少手数がちょうどねらいどおり」のものを採用する。
'use strict';

registerPuzzle({
  id: 'flip',
  name: 'ひとりリバーシ',
  icon: '⚫',
  desc: '決められた手数で、白い石を全部黒にひっくり返そう',

  start(root, api) {
    const LEVELS = {
      easy: { name: 'かんたん', size: 5, moves: 2, stones: 9 },
      mid: { name: 'ふつう', size: 6, moves: 3, stones: 13 },
      hard: { name: 'むずかしい', size: 6, moves: 4, stones: 16 },
    };
    let lv = api.load('level', 'easy');
    if (!LEVELS[lv]) lv = 'easy';
    let n, first, b, limit, history, done;
    let cellEls = [];

    root.innerHTML = `
      <div class="row" id="r-levels">
        ${Object.entries(LEVELS).map(([k, v]) => `<button class="btn" data-level="${k}">${v.name}</button>`).join('')}
      </div>
      <div class="row">
        <button class="btn" id="r-undo">1手戻す</button>
        <button class="btn" id="r-retry">最初から</button>
        <button class="btn primary" id="r-new">新しい問題</button>
      </div>
      <div class="stats">
        <div><small>残りの手数</small><b id="r-left">0</b></div>
        <div><small>白い石</small><b id="r-white">0</b></div>
        <div><small>クリアした数</small><b id="r-clears">0</b></div>
      </div>
      <div class="r-board" id="r-board"></div>
      <p class="msg" id="r-msg"></p>
      <p class="note">あなたは黒です。黒い石で白をはさめる場所(小さい点のマス)にだけ打てて、はさんだ白は黒になります(たて・よこ・ななめ)。<br>相手は打ってきません。残りの手数のうちに白を全部なくせばクリア。手数はぎりぎりなので、1手もむだにできません。</p>`;

    const $ = id => root.querySelector('#' + id);
    const board = $('r-board');

    function flips(a, pos) { // pos に黒を打ったとき、ひっくり返る白のマス
      if (a[pos]) return [];
      const out = [], x0 = pos % n, y0 = Math.floor(pos / n);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const line = [];
        let x = x0 + dx, y = y0 + dy;
        while (x >= 0 && y >= 0 && x < n && y < n && a[y * n + x] === 2) { line.push(y * n + x); x += dx; y += dy; }
        if (line.length && x >= 0 && y >= 0 && x < n && y < n && a[y * n + x] === 1) out.push(...line);
      }
      return out;
    }

    function solvable(a, depth) {
      if (!a.includes(2)) return true;
      if (depth === 0) return false;
      for (let p = 0; p < n * n; p++) {
        const f = flips(a, p);
        if (!f.length) continue;
        const c = a.slice();
        c[p] = 1;
        f.forEach(i => { c[i] = 1; });
        if (solvable(c, depth - 1)) return true;
      }
      return false;
    }

    function generate() {
      const L = LEVELS[lv];
      n = L.size;
      for (let attempt = 0; ; attempt++) {
        // 真ん中から、となり合うマスへ石を広げていく
        const a = Array(n * n).fill(0);
        const blob = [Math.floor(n / 2) * n + Math.floor(n / 2)];
        while (blob.length < L.stones) {
          const from = blob[Math.floor(Math.random() * blob.length)];
          const x = from % n + Math.floor(Math.random() * 3) - 1, y = Math.floor(from / n) + Math.floor(Math.random() * 3) - 1;
          if (x >= 0 && y >= 0 && x < n && y < n && !blob.includes(y * n + x)) blob.push(y * n + x);
        }
        blob.forEach(i => { a[i] = Math.random() < 0.3 ? 1 : 2; });
        if (!a.includes(1)) continue;
        // ねらった手数より少ない手数では解けず、ねらった手数なら解ける問題だけ採用
        if (solvable(a, L.moves - 1) || !solvable(a, L.moves)) continue;
        first = a; limit = L.moves;
        return;
      }
    }

    function paint() {
      const left = limit - history.length;
      cellEls.forEach((el, i) => {
        el.className = 'r-cell' + (b[i] === 1 ? ' black' : b[i] === 2 ? ' white' : '')
          + (!done && left > 0 && flips(b, i).length ? ' can' : '');
      });
      $('r-left').textContent = left;
      $('r-white').textContent = b.filter(v => v === 2).length;
      $('r-undo').disabled = !history.length || done;
    }

    function reset() {
      b = first.slice();
      history = []; done = false;
      $('r-msg').textContent = '';
      paint();
    }

    function newGame() {
      generate();
      board.style.setProperty('--n', n);
      board.innerHTML = first.map((_, i) => `<button class="r-cell" data-i="${i}" aria-label="${Math.floor(i / n) + 1}行${i % n + 1}列"></button>`).join('');
      cellEls = [...board.children];
      root.querySelectorAll('[data-level]').forEach(el => el.classList.toggle('on', el.dataset.level === lv));
      $('r-clears').textContent = api.load('clears_' + lv, 0);
      reset();
    }

    board.addEventListener('click', e => {
      const el = e.target.closest('[data-i]');
      if (!el || done || history.length >= limit) return;
      const i = +el.dataset.i, f = flips(b, i);
      if (!f.length) return;
      history.push(b.slice());
      b[i] = 1;
      f.forEach(k => { b[k] = 1; });
      if (!b.includes(2)) {
        done = true;
        const clears = api.load('clears_' + lv, 0) + 1;
        api.save('clears_' + lv, clears);
        $('r-clears').textContent = clears;
        $('r-msg').textContent = '🎉 全部黒になった!';
      } else if (history.length >= limit) {
        $('r-msg').textContent = '手数がなくなりました…「1手戻す」か「最初から」でやり直せます';
      } else if (!b.some((_, k) => flips(b, k).length)) {
        $('r-msg').textContent = '打てる場所がなくなりました…「1手戻す」か「最初から」でやり直せます';
      }
      paint();
    });
    $('r-undo').addEventListener('click', () => {
      if (done || !history.length) return;
      b = history.pop();
      $('r-msg').textContent = '';
      paint();
    });
    $('r-retry').addEventListener('click', reset);
    $('r-new').addEventListener('click', newGame);
    $('r-levels').addEventListener('click', e => {
      const k = e.target.dataset.level;
      if (k) { lv = k; api.save('level', lv); newGame(); }
    });
    newGame();
  },
});

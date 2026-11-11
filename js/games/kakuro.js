// カックロ(足し算のクロスワード)
// white[位置]=数字を入れるマスか。runs = 白マスのつながり [{cells, sum, clue(ヒントを書く黒マスの位置), horiz}]。grid[位置]=入れた数字。
// ルール:白マスに 1〜9 を入れる。ひとつながりの白マスの合計がヒントの数になり、その中で同じ数字は使えない。
// 問題は自動で作る:白黒の形(長さ1のつながりを作らない)→ 数字を入れる → 合計をヒントにする → 総当たりで答えが1つか確認。
'use strict';

registerPuzzle({
  id: 'kakuro',
  name: 'カックロ',
  icon: '➕',
  desc: '足し算のクロスワード。合計がヒントになるよう数字を入れよう',

  start(root, api) {
    const WHITE = { 6: 0.78, 7: 0.7, 8: 0.64 }; // 白マスの割合。大きい盤面ほど黒を増やす(白が多いと答えが1つになりにくい)
    let n = api.load('size', 6);
    if (![6, 7, 8].includes(n)) n = 6;
    let white, runs, runsOf, grid, sel, done;
    let cellEls = [];

    function buildRuns() {
      runs = [];
      for (const horiz of [true, false]) {
        for (let a = 0; a < n; a++) {
          let cells = [];
          for (let b = 0; b <= n; b++) {
            const i = horiz ? a * n + b : b * n + a;
            if (b < n && white[i]) { cells.push(i); continue; }
            if (cells.length) runs.push({ cells, horiz, clue: cells[0] - (horiz ? 1 : n), sum: 0 });
            cells = [];
          }
        }
      }
      runsOf = white.map((w, i) => (w ? runs.filter(r => r.cells.includes(i)) : []));
    }

    function makeShape() {
      for (;;) {
        white = Array.from({ length: n * n }, (_, i) => i >= n && i % n > 0 && Math.random() < WHITE[n]);
        for (let changed = true; changed;) { // 長さ1のつながりになる白マスは黒にする
          changed = false;
          for (let i = 0; i < n * n; i++) {
            if (!white[i]) continue;
            const h = (i % n > 0 && white[i - 1]) || (i % n < n - 1 && white[i + 1]);
            const v = (i >= n && white[i - n]) || (i + n < n * n && white[i + n]);
            if (!h || !v) { white[i] = false; changed = true; }
          }
        }
        const cells = white.map((w, i) => (w ? i : -1)).filter(i => i >= 0);
        if (cells.length < (n - 1) * (n - 1) * (n === 6 ? 0.55 : n === 7 ? 0.5 : 0.45)) continue;
        const seen = new Set([cells[0]]), q = [cells[0]]; // 白マスが全部つながっていること
        for (let k = 0; k < q.length; k++) {
          for (const j of [q[k] - 1, q[k] + 1, q[k] - n, q[k] + n]) {
            if (j >= 0 && j < n * n && white[j] && !seen.has(j) && (Math.abs(j - q[k]) === n || Math.floor(j / n) === Math.floor(q[k] / n))) { seen.add(j); q.push(j); }
          }
        }
        if (seen.size === cells.length) return cells;
      }
    }

    // 解を数える(fill=true のときは、ヒントを無視してランダムな答えを1つ作る)
    function search(cells, limit, fill) {
      const g = Array(n * n).fill(0);
      let count = 0, steps = 0, found = null;
      (function rec(k) {
        if (count >= limit || ++steps > 40000) return;
        if (k === cells.length) { count++; found = g.slice(); return; }
        const i = cells[k];
        const order = [1, 2, 3, 4, 5, 6, 7, 8, 9];
        if (fill) order.sort(() => Math.random() - 0.5);
        for (const v of order) {
          let ok = true;
          for (const r of runsOf[i]) {
            let s = v, left = 0;
            for (const c of r.cells) { if (c === i) continue; if (g[c] === v) ok = false; if (g[c]) s += g[c]; else left++; }
            if (!ok) break;
            // 合計のチェック:全部うまったらぴったり。途中なら、残りのマスに入れられる範囲に収まること
            if (!fill && (left === 0 ? s !== r.sum : s + left > r.sum || s + left * 9 < r.sum)) { ok = false; break; }
          }
          if (!ok) continue;
          g[i] = v;
          rec(k + 1);
          g[i] = 0;
          if (count >= limit) return;
        }
      })(0);
      return { count: steps > 40000 ? 2 : count, found };
    }

    function generate() {
      const t0 = Date.now();
      for (;;) {
        const cells = makeShape();
        buildRuns();
        if (runs.some(r => r.cells.length > 9)) continue;
        const sol = search(cells, 1, true).found;
        if (!sol) continue;
        runs.forEach(r => { r.sum = r.cells.reduce((a, c) => a + sol[c], 0); });
        // 答えが1つの問題ができるまで作り直す。1.5秒たっても作れなければ、今の問題で出す(ルールどおりなら正解にする)
        if (search(cells, 2, false).count === 1 || Date.now() - t0 > 1500) return;
      }
    }

    root.innerHTML = `
      <div class="row" id="kr-sizes">
        ${[6, 7, 8].map(s => `<button class="btn" data-size="${s}">${s}×${s}</button>`).join('')}
        <button class="btn primary" id="kr-new">新しい問題</button>
      </div>
      <div class="stats">
        <div><small>時間</small><b id="kr-time">0:00</b></div>
        <div><small>ベスト時間</small><b id="kr-best">-</b></div>
      </div>
      <div class="kr-board" id="kr-board"></div>
      <p class="msg" id="kr-msg"></p>
      <div class="d-pad" id="kr-pad">
        ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => `<button class="btn" data-d="${d}">${d}</button>`).join('')}
        <button class="btn" data-d="0">消す</button>
      </div>
      <p class="note">白いマスを選んで 1〜9 を入れます。黒マスの数字がヒントです。<br><b>右上の数字</b>=そこから右に続く白マスの合計、<b>左下の数字</b>=そこから下に続く白マスの合計。<br>ひとつながりの白マスの中では、同じ数字を2回使えません(重なると赤い数字になります)。合計が合わないヒントは赤、合えば薄くなります。大きい盤面では、答えが1つとは限りません。</p>`;

    const $ = id => root.querySelector('#' + id);
    const board = $('kr-board');
    const timer = api.timer($('kr-time'));

    function showBest() {
      const b = api.load('best' + n, null);
      $('kr-best').textContent = b === null ? '-' : api.fmtTime(b);
    }

    function paint() {
      let ok = true;
      const dup = new Set();
      runs.forEach((r, k) => {
        const v = r.cells.map(c => grid[c]);
        r.cells.forEach(c => { if (grid[c] && v.filter(x => x === grid[c]).length > 1) dup.add(c); });
        const full = !v.includes(0), s = v.reduce((a, b) => a + b, 0);
        const el = board.querySelector(`[data-run="${k}"]`);
        el.className = (r.horiz ? 'r' : 'd') + (full && s === r.sum ? ' ok' : (full && s !== r.sum) || s > r.sum ? ' bad' : '');
        if (!full || s !== r.sum) ok = false;
      });
      cellEls.forEach((el, i) => {
        if (!white[i]) return;
        el.className = 'kr-cell' + (i === sel ? ' sel' : '') + (dup.has(i) ? ' bad' : '');
        el.textContent = grid[i] || '';
      });
      return ok && !dup.size;
    }

    function newGame() {
      generate();
      grid = Array(n * n).fill(0);
      sel = -1; done = false;
      board.style.setProperty('--n', n);
      board.innerHTML = white.map((w, i) => {
        if (w) return `<button class="kr-cell" data-i="${i}"></button>`;
        const clues = runs.map((r, k) => (r.clue === i ? `<i class="${r.horiz ? 'r' : 'd'}" data-run="${k}">${r.sum}</i>` : '')).join('');
        return `<span class="kr-cell black${clues ? ' clue' : ''}">${clues}</span>`;
      }).join('');
      cellEls = [...board.children];
      root.querySelectorAll('[data-size]').forEach(b => b.classList.toggle('on', +b.dataset.size === n));
      timer.reset();
      $('kr-msg').textContent = '';
      showBest();
      paint();
    }

    function input(d) {
      if (done || sel < 0) return;
      grid[sel] = grid[sel] === d ? 0 : d;
      timer.start();
      if (paint()) {
        done = true;
        const time = timer.stop();
        const old = api.load('best' + n, null);
        const isNew = old === null || time < old;
        if (isNew) api.save('best' + n, time);
        showBest();
        $('kr-msg').textContent = `🎉 クリア! ${api.fmtTime(time)}` + (isNew ? '(新記録)' : '');
      }
    }

    board.addEventListener('click', e => {
      const el = e.target.closest('[data-i]');
      if (el) { sel = +el.dataset.i; paint(); }
    });
    $('kr-pad').addEventListener('click', e => {
      const el = e.target.closest('[data-d]');
      if (el) input(+el.dataset.d);
    });
    function onKey(e) {
      if (/^[0-9]$/.test(e.key)) input(+e.key);
      else if (e.key === 'Backspace' || e.key === 'Delete') input(0);
      else {
        const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -n, ArrowDown: n }[e.key];
        if (!step || sel < 0) return;
        e.preventDefault();
        const to = sel + step;
        if (to >= 0 && to < n * n && white[to] && (Math.abs(step) === n || Math.floor(to / n) === Math.floor(sel / n))) { sel = to; paint(); }
      }
    }
    document.addEventListener('keydown', onKey);
    $('kr-sizes').addEventListener('click', e => {
      const s = e.target.dataset.size;
      if (s) { n = +s; api.save('size', n); }
      if (s || e.target.id === 'kr-new') newGame();
    });
    newGame();

    return () => { timer.reset(); document.removeEventListener('keydown', onKey); };
  },
});

// 計算ブロック(ケンケン系。4×4 / 5×5 / 6×6)
// 各行・各列に 1〜N を1つずつ入れる。太線で囲まれたブロックは、中の数字を計算すると左上の数になる。
// cage[位置] = ブロック番号。cages[k] = { cells, op, target }。grid[位置] = 入れた数字、notes = メモ(ビット)。
// 問題は自動で作る:答えの盤面 → ランダムにブロック分け → 計算を決める → 答えが1つだけか総当たりで確認。
'use strict';

registerPuzzle({
  id: 'kenken',
  name: '計算ブロック',
  icon: '➗',
  desc: '計算のヒントを使って、各行・列に数字を1つずつ入れよう',

  start(root, api) {
    let n = api.load('size', 4);
    if (![4, 5, 6].includes(n)) n = 4;
    let cage, cages, grid, notes, sel, done, noteMode = false;
    let cellEls = [];

    const calc = (op, v) => {
      if (op === '+') return v.reduce((a, b) => a + b, 0);
      if (op === '×') return v.reduce((a, b) => a * b, 1);
      if (op === '−') return Math.abs(v[0] - v[1]);
      if (op === '÷') return Math.max(...v) % Math.min(...v) ? -1 : Math.max(...v) / Math.min(...v);
      return v[0];
    };

    function countSolutions(limit) {
      const g = Array(n * n).fill(0), rows = Array(n).fill(0), cols = Array(n).fill(0);
      let count = 0;
      (function rec(i) {
        if (count >= limit) return;
        if (i === n * n) { count++; return; }
        const r = Math.floor(i / n), c = i % n, cg = cages[cage[i]];
        for (let v = 1; v <= n; v++) {
          if (rows[r] >> v & 1 || cols[c] >> v & 1) continue;
          g[i] = v;
          const vals = cg.cells.map(k => g[k]).filter(x => x);
          let ok = true;
          if (vals.length === cg.cells.length) ok = calc(cg.op, vals) === cg.target;
          else if (cg.op === '+') ok = calc('+', vals) < cg.target;
          else if (cg.op === '×') ok = cg.target % calc('×', vals) === 0;
          if (ok) { rows[r] |= 1 << v; cols[c] |= 1 << v; rec(i + 1); rows[r] &= ~(1 << v); cols[c] &= ~(1 << v); }
          g[i] = 0;
        }
      })(0);
      return count;
    }

    function generate() {
      const shuffle = a => a.sort(() => Math.random() - 0.5);
      for (let attempt = 0; ; attempt++) {
        // 答え:ずらして並べた盤面の、行・列・数字をまぜる
        const rp = shuffle([...Array(n).keys()]), cp = shuffle([...Array(n).keys()]), dp = shuffle([...Array(n).keys()]);
        const sol = Array.from({ length: n * n }, (_, i) => dp[(rp[Math.floor(i / n)] + cp[i % n]) % n] + 1);
        // ブロック分け:空いているマスから始めて、となりへ広げる
        cage = Array(n * n).fill(-1);
        cages = [];
        for (const s of shuffle([...Array(n * n).keys()])) {
          if (cage[s] >= 0) continue;
          const r = Math.random();
          const size = r < 0.08 ? 1 : r < 0.5 ? 2 : r < 0.88 ? 3 : 4;
          const cells = [s];
          cage[s] = cages.length;
          while (cells.length < size) {
            const opts = cells.flatMap(k => [k % n > 0 ? k - 1 : -1, k % n < n - 1 ? k + 1 : -1, k - n, k + n])
              .filter(k => k >= 0 && k < n * n && cage[k] < 0);
            if (!opts.length) break;
            const k = opts[Math.floor(Math.random() * opts.length)];
            cage[k] = cages.length;
            cells.push(k);
          }
          cells.sort((a, b) => a - b);
          const v = cells.map(k => sol[k]);
          let op = '';
          if (cells.length === 2) {
            const opts = ['+', '×', '−', '−'];
            if (Math.max(...v) % Math.min(...v) === 0) opts.push('÷', '÷');
            op = opts[Math.floor(Math.random() * opts.length)];
          } else if (cells.length > 2) op = Math.random() < 0.5 ? '+' : '×';
          cages.push({ cells, op, target: calc(op, v) });
        }
        if (countSolutions(2) === 1 || attempt > 300) return;
      }
    }

    root.innerHTML = `
      <div class="row" id="kk-sizes">
        ${[4, 5, 6].map(s => `<button class="btn" data-size="${s}">${s}×${s}</button>`).join('')}
        <button class="btn primary" id="kk-new">新しい問題</button>
      </div>
      <div class="stats">
        <div><small>時間</small><b id="kk-time">0:00</b></div>
        <div><small>ベスト時間</small><b id="kk-best">-</b></div>
      </div>
      <div class="kk-board" id="kk-board"></div>
      <p class="msg" id="kk-msg"></p>
      <div class="d-pad" id="kk-pad"></div>
      <div class="row"><button class="btn" id="kk-note" aria-pressed="false">✏️ メモ:OFF</button></div>
      <p class="note">各行・各列に 1〜<span id="kk-n"></span> を1つずつ入れます(同じ行・列で重なると赤くなります)。<br>太い線で囲まれたブロックは、中の数字を<b>全部足す(+)/全部かける(×)/大きい方から小さい方を引く(−)/大きい方を小さい方で割る(÷)</b>と、左上の数になります。記号のないブロックはその数字そのままです。<br>ブロックの中では同じ数字を使ってもかまいません(行・列が別なら)。計算が合わないブロックは左上の数が赤くなります。</p>`;

    const $ = id => root.querySelector('#' + id);
    const board = $('kk-board');
    const timer = api.timer($('kk-time'));

    function showBest() {
      const b = api.load('best' + n, null);
      $('kk-best').textContent = b === null ? '-' : api.fmtTime(b);
    }

    function paint() {
      let allOk = !grid.includes(0);
      const cageBad = cages.map(cg => {
        const v = cg.cells.map(k => grid[k]);
        return !v.includes(0) && calc(cg.op, v) !== cg.target;
      });
      if (cageBad.includes(true)) allOk = false;
      cellEls.forEach((el, i) => {
        const v = grid[i], r = Math.floor(i / n), c = i % n;
        const dup = v && grid.some((w, j) => j !== i && w === v && (Math.floor(j / n) === r || j % n === c));
        if (dup) allOk = false;
        el.classList.toggle('sel', i === sel);
        el.classList.toggle('bad', !!dup);
        el.classList.toggle('cbad', cageBad[cage[i]]);
        const body = el.querySelector('span');
        if (v) body.textContent = v;
        else if (notes[i]) {
          body.innerHTML = '<span class="d-notes">' + Array.from({ length: 9 }, (_, k) =>
            `<i>${k < n && notes[i] >> (k + 1) & 1 ? k + 1 : ''}</i>`).join('') + '</span>';
        } else body.textContent = '';
      });
      return allOk;
    }

    function newGame() {
      generate();
      grid = Array(n * n).fill(0);
      notes = Array(n * n).fill(0);
      sel = -1; done = false;
      board.style.setProperty('--n', n);
      board.innerHTML = cage.map((k, i) => {
        const r = Math.floor(i / n), c = i % n;
        const cls = (c < n - 1 && cage[i + 1] !== k ? ' br' : '') + (r < n - 1 && cage[i + n] !== k ? ' bb' : '');
        const label = cages[k].cells[0] === i ? `<b>${cages[k].target}${cages[k].op}</b>` : '';
        return `<button class="kk-cell${cls}" data-i="${i}">${label}<span></span></button>`;
      }).join('');
      cellEls = [...board.children];
      $('kk-pad').innerHTML = Array.from({ length: n }, (_, k) => `<button class="btn" data-d="${k + 1}">${k + 1}</button>`).join('')
        + '<button class="btn" data-d="0">消す</button>';
      $('kk-n').textContent = n;
      root.querySelectorAll('[data-size]').forEach(b => b.classList.toggle('on', +b.dataset.size === n));
      timer.reset();
      $('kk-msg').textContent = '';
      showBest();
      paint();
    }

    function input(d) {
      if (done || sel < 0 || d > n) return;
      timer.start();
      if (d === 0) { grid[sel] = 0; notes[sel] = 0; }
      else if (noteMode) { if (!grid[sel]) notes[sel] ^= 1 << d; }
      else { grid[sel] = grid[sel] === d ? 0 : d; notes[sel] = 0; }
      if (paint()) {
        done = true;
        const time = timer.stop();
        const old = api.load('best' + n, null);
        const isNew = old === null || time < old;
        if (isNew) api.save('best' + n, time);
        showBest();
        $('kk-msg').textContent = `🎉 クリア! ${api.fmtTime(time)}` + (isNew ? '(新記録)' : '');
      }
    }

    board.addEventListener('click', e => {
      const el = e.target.closest('[data-i]');
      if (el) { sel = +el.dataset.i; paint(); }
    });
    $('kk-pad').addEventListener('click', e => {
      const el = e.target.closest('[data-d]');
      if (el) input(+el.dataset.d);
    });
    $('kk-note').addEventListener('click', () => {
      noteMode = !noteMode;
      const b = $('kk-note');
      b.classList.toggle('on', noteMode);
      b.setAttribute('aria-pressed', noteMode);
      b.textContent = `✏️ メモ:${noteMode ? 'ON' : 'OFF'}`;
    });
    $('kk-sizes').addEventListener('click', e => {
      const s = e.target.dataset.size;
      if (s) { n = +s; api.save('size', n); }
      if (s || e.target.id === 'kk-new') newGame();
    });
    function onKey(e) {
      if (/^[0-9]$/.test(e.key)) input(+e.key);
      else if (e.key === 'Backspace' || e.key === 'Delete') input(0);
      else {
        const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
        if (!d) return;
        e.preventDefault();
        const x = (sel < 0 ? 0 : sel % n) + d[0], y = (sel < 0 ? 0 : Math.floor(sel / n)) + d[1];
        if (x >= 0 && y >= 0 && x < n && y < n) { sel = y * n + x; paint(); }
      }
    }
    document.addEventListener('keydown', onKey);
    newGame();

    return () => { timer.reset(); document.removeEventListener('keydown', onKey); };
  },
});

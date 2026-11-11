// お絵かきロジック(5×5 / 8×8 / 10×10)
// cell[位置]: 0=空 1=塗り 2=✕(塗らない目印)。行・列ごとの「続けて塗る数」のヒントを全部満たせばクリア。
// 問題はランダムな模様から作り、ヒントだけで理詰めで解けるもの(=答えが1つ)を選ぶ。
'use strict';

registerPuzzle({
  id: 'nono',
  name: 'お絵かきロジック',
  icon: '🖼️',
  desc: '数字のヒントをたよりにマスを塗ろう',

  start(root, api) {
    let n = api.load('size', 5);
    if (![5, 8, 10].includes(n)) n = 5;
    let rowClue, colClue, cell, mode = 1, done;
    let cellEls = [], rowEls = [], colEls = [];

    const runs = line => { // 続けて塗られている数の並び
      const out = [];
      let k = 0;
      for (const v of line) { if (v === 1) k++; else if (k) { out.push(k); k = 0; } }
      if (k) out.push(k);
      return out;
    };

    // 1列ぶんの理詰め:ヒントに合う塗り方を全部ためして、どの塗り方でも同じになるマスを確定する。
    // line: -1=未定 0=空 1=塗り。矛盾したら null。
    function solveLine(clue, line) {
      const len = line.length, res = Array(len).fill(-2), arr = Array(len).fill(0);
      let any = false;
      const rest = clue.map((_, i) => clue.slice(i).reduce((a, b) => a + b + 1, -1)); // i 番目以降に必要な長さ
      (function place(ci, pos) {
        if (ci === clue.length) {
          for (let i = pos; i < len; i++) if (line[i] === 1) return;
          for (let i = pos; i < len; i++) arr[i] = 0;
          any = true;
          for (let i = 0; i < len; i++) res[i] = res[i] === -2 ? arr[i] : res[i] === arr[i] ? res[i] : -1;
          return;
        }
        for (let s = pos; s + rest[ci] <= len; s++) {
          if (s > pos && line[s - 1] === 1) break; // 塗りマスを飛ばすことはできない
          const end = s + clue[ci];
          let ok = end === len || line[end] !== 1;
          for (let i = s; ok && i < end; i++) if (line[i] === 0) ok = false;
          if (!ok) continue;
          for (let i = pos; i < s; i++) arr[i] = 0;
          for (let i = s; i < end; i++) arr[i] = 1;
          if (end < len) arr[end] = 0;
          place(ci + 1, Math.min(len, end + 1));
        }
      })(0, 0);
      return any ? res : null;
    }

    function logicSolvable(rc, cc) {
      const g = Array(n * n).fill(-1);
      for (let changed = true; changed;) {
        changed = false;
        for (let k = 0; k < 2 * n; k++) {
          const idx = Array.from({ length: n }, (_, i) => (k < n ? k * n + i : i * n + (k - n)));
          const res = solveLine(k < n ? rc[k] : cc[k - n], idx.map(i => g[i]));
          if (!res) return false;
          idx.forEach((i, j) => { if (g[i] === -1 && res[j] !== -1) { g[i] = res[j]; changed = true; } });
        }
      }
      return !g.includes(-1);
    }

    function generate() {
      for (let attempt = 0; ; attempt++) {
        const sol = Array.from({ length: n * n }, () => (Math.random() < 0.58 ? 1 : 0));
        rowClue = Array.from({ length: n }, (_, r) => runs(sol.slice(r * n, r * n + n)));
        colClue = Array.from({ length: n }, (_, c) => runs(sol.filter((_, i) => i % n === c)));
        if (rowClue.some(c => !c.length) || colClue.some(c => !c.length)) continue; // 空っぽの列はつまらない
        if (logicSolvable(rowClue, colClue) || attempt > 3000) return;
      }
    }

    root.innerHTML = `
      <div class="row" id="e-sizes">
        ${[5, 8, 10].map(s => `<button class="btn" data-size="${s}">${s}×${s}</button>`).join('')}
        <button class="btn primary" id="e-new">新しい問題</button>
      </div>
      <div class="stats">
        <div><small>時間</small><b id="e-time">0:00</b></div>
        <div><small>ベスト時間</small><b id="e-best">-</b></div>
      </div>
      <div class="row" id="e-modes">
        <button class="btn" data-mode="1">■ 塗る</button>
        <button class="btn" data-mode="2">✕ 塗らない目印</button>
        <button class="btn" id="e-clear">全部消す</button>
      </div>
      <div class="e-board" id="e-board"></div>
      <p class="msg" id="e-msg"></p>
      <p class="note">数字は、その行・列で<b>続けて塗るマスの数</b>です(「3 1」なら、3マス続き → 1マス以上あけて → 1マス)。<br>タップ、または指でなぞって塗ります。もう一度なぞると消えます。ヒントどおりになった行・列の数字は薄くなります。<br>「✕」は「ここは塗らない」と自分で覚えておくための目印で、クリアの判定には関係しません。</p>`;

    const $ = id => root.querySelector('#' + id);
    const board = $('e-board');
    const timer = api.timer($('e-time'));

    function showBest() {
      const b = api.load('best' + n, null);
      $('e-best').textContent = b === null ? '-' : api.fmtTime(b);
    }

    function paint() {
      cellEls.forEach((el, i) => {
        el.classList.toggle('fill', cell[i] === 1);
        el.classList.toggle('x', cell[i] === 2);
      });
      let all = true;
      for (let k = 0; k < n; k++) {
        const rOk = runs(cell.slice(k * n, k * n + n)).join() === rowClue[k].join();
        const cOk = runs(cell.filter((_, i) => i % n === k)).join() === colClue[k].join();
        rowEls[k].classList.toggle('ok', rOk);
        colEls[k].classList.toggle('ok', cOk);
        all = all && rOk && cOk;
      }
      root.querySelectorAll('[data-mode]').forEach(b => b.classList.toggle('on', +b.dataset.mode === mode));
      return all;
    }

    function newGame() {
      generate();
      cell = Array(n * n).fill(0);
      done = false;
      board.style.setProperty('--n', n);
      board.style.setProperty('--clue', Math.ceil(n / 2) * 0.62);
      board.style.gridTemplateColumns = `${Math.ceil(n / 2) * 0.62}fr repeat(${n}, 1fr)`;
      let html = '<span></span>' + colClue.map(c => `<span class="e-col">${c.map(v => `<i>${v}</i>`).join('')}</span>`).join('');
      for (let r = 0; r < n; r++) {
        html += `<span class="e-row">${rowClue[r].join(' ')}</span>`;
        for (let c = 0; c < n; c++) {
          html += `<button class="e-cell${c % 5 === 4 && c < n - 1 ? ' br' : ''}${r % 5 === 4 && r < n - 1 ? ' bb' : ''}" data-i="${r * n + c}"></button>`;
        }
      }
      board.innerHTML = html;
      cellEls = [...board.querySelectorAll('.e-cell')];
      rowEls = [...board.querySelectorAll('.e-row')];
      colEls = [...board.querySelectorAll('.e-col')];
      root.querySelectorAll('[data-size]').forEach(b => b.classList.toggle('on', +b.dataset.size === n));
      timer.reset();
      $('e-msg').textContent = '';
      showBest();
      paint();
    }

    // なぞり塗り:最初に触ったマスで「塗る/消す」を決め、なぞったマス全部に同じことをする
    let drag = null;
    const cellAt = e => {
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const c = el && el.closest('[data-i]');
      return c && board.contains(c) ? +c.dataset.i : -1;
    };
    function apply(i) {
      if (done || i < 0 || cell[i] === drag) return;
      cell[i] = drag;
      timer.start();
      if (paint()) {
        done = true;
        const time = timer.stop();
        const old = api.load('best' + n, null);
        const isNew = old === null || time < old;
        if (isNew) api.save('best' + n, time);
        showBest();
        $('e-msg').textContent = `🎉 完成! ${api.fmtTime(time)}` + (isNew ? '(新記録)' : '');
      }
    }
    const stopDrag = () => { drag = null; };
    board.addEventListener('pointerdown', e => {
      const i = cellAt(e);
      if (i < 0 || done) return;
      drag = cell[i] === mode ? 0 : mode;
      apply(i);
    });
    board.addEventListener('pointermove', e => { if (drag !== null) apply(cellAt(e)); });
    document.addEventListener('pointerup', stopDrag);
    document.addEventListener('pointercancel', stopDrag);

    $('e-modes').addEventListener('click', e => {
      const m = e.target.dataset.mode;
      if (m) { mode = +m; paint(); }
    });
    $('e-clear').addEventListener('click', () => { if (!done) { cell.fill(0); paint(); } });
    $('e-sizes').addEventListener('click', e => {
      const s = e.target.dataset.size;
      if (s) { n = +s; api.save('size', n); }
      if (s || e.target.id === 'e-new') newGame();
    });
    newGame();

    return () => {
      timer.reset();
      document.removeEventListener('pointerup', stopDrag);
      document.removeEventListener('pointercancel', stopDrag);
    };
  },
});

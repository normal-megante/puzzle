// 数独(やさしい / ふつう / むずかしい)
// 問題はその場で作る:完成盤面をランダムに作り、「答えが1つだけ」を保ちながら数字を抜いていく。
// given[i]=最初からある数字(0=空) / grid[i]=今の数字 / notes[i]=メモ(ビット: 1<<数字) / sol[i]=答え
'use strict';

registerPuzzle({
  id: 'sudoku',
  name: '数独',
  icon: '✏️',
  desc: 'タテ・ヨコ・3×3 の枠に 1〜9 を1つずつ入れよう',

  start(root, api) {
    const LEVELS = { easy: ['やさしい', 40], mid: ['ふつう', 32], hard: ['むずかしい', 26] }; // 残すヒントの数
    let lv = api.load('level', 'easy');
    if (!LEVELS[lv]) lv = 'easy';
    let given, grid, notes, sol, sel, hints, done, noteMode = false;
    let cellEls = [];

    // 解を limit 個まで数える(rand=true なら数字の順番をランダムにして、最初の解を first に入れる)
    function solve(src, limit, rand) {
      const g = src.slice(), R = Array(9).fill(0), C = Array(9).fill(0), B = Array(9).fill(0);
      const box = i => Math.floor(i / 27) * 3 + Math.floor(i % 9 / 3);
      g.forEach((v, i) => { if (v) { R[Math.floor(i / 9)] |= 1 << v; C[i % 9] |= 1 << v; B[box(i)] |= 1 << v; } });
      let n = 0, first = null;
      (function rec() {
        let best = -1, bm = 0, bc = 10;
        for (let i = 0; i < 81 && bc > 1; i++) { // 候補がいちばん少ないマスから埋める
          if (g[i]) continue;
          const m = ~(R[Math.floor(i / 9)] | C[i % 9] | B[box(i)]) & 0x3fe;
          let c = 0;
          for (let v = 1; v <= 9; v++) c += m >> v & 1;
          if (c < bc) { bc = c; best = i; bm = m; }
        }
        if (best < 0) { n++; first = first || g.slice(); return; }
        const order = [1, 2, 3, 4, 5, 6, 7, 8, 9];
        if (rand) order.sort(() => Math.random() - 0.5);
        const r = Math.floor(best / 9), c = best % 9, b = box(best);
        for (const v of order) {
          if (!(bm >> v & 1)) continue;
          g[best] = v; R[r] |= 1 << v; C[c] |= 1 << v; B[b] |= 1 << v;
          rec();
          g[best] = 0; R[r] &= ~(1 << v); C[c] &= ~(1 << v); B[b] &= ~(1 << v);
          if (n >= limit) return;
        }
      })();
      return { n, first };
    }

    function generate() {
      sol = solve(Array(81).fill(0), 1, true).first;
      given = sol.slice();
      const order = Array.from({ length: 81 }, (_, i) => i).sort(() => Math.random() - 0.5);
      let clues = 81;
      for (const i of order) {
        if (clues <= LEVELS[lv][1]) break;
        const v = given[i];
        given[i] = 0;
        if (solve(given, 2, false).n === 1) clues--;
        else given[i] = v;
      }
    }

    root.innerHTML = `
      <div class="row" id="d-levels">
        ${Object.entries(LEVELS).map(([k, v]) => `<button class="btn" data-level="${k}">${v[0]}</button>`).join('')}
        <button class="btn primary" id="d-new">新しい問題</button>
      </div>
      <div class="stats">
        <div><small>時間</small><b id="d-time">0:00</b></div>
        <div><small>ベスト時間</small><b id="d-best">-</b></div>
      </div>
      <div class="d-board" id="d-board"></div>
      <p class="msg" id="d-msg"></p>
      <div class="d-pad" id="d-pad">
        ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => `<button class="btn" data-d="${d}">${d}</button>`).join('')}
        <button class="btn" data-d="0">消す</button>
      </div>
      <div class="row">
        <button class="btn" id="d-note" aria-pressed="false">✏️ メモ:OFF</button>
        <button class="btn" id="d-hint">💡 ヒント</button>
      </div>
      <p class="note">マスを選んでから数字を押します。同じ列・枠で数字が重なると赤くなります(答えと違うだけでは赤くなりません)。<br>メモがONの間は、小さい候補の数字を書き込めます。ヒントは選んだマスの答えを入れます(使った回数はクリア時に表示)。<br>途中の状態は自動で保存されます。</p>`;

    const $ = id => root.querySelector('#' + id);
    const board = $('d-board');
    const timer = api.timer($('d-time'));
    board.innerHTML = Array.from({ length: 81 }, (_, i) =>
      `<button class="d-cell${i % 9 === 2 || i % 9 === 5 ? ' br' : ''}${Math.floor(i / 9) === 2 || Math.floor(i / 9) === 5 ? ' bb' : ''}" data-i="${i}"></button>`).join('');
    cellEls = [...board.children];

    const peers = (i, j) => i !== j && (Math.floor(i / 9) === Math.floor(j / 9) || i % 9 === j % 9
      || (Math.floor(i / 27) === Math.floor(j / 27) && Math.floor(i % 9 / 3) === Math.floor(j % 9 / 3)));

    function showBest() {
      const b = api.load('best_' + lv, null);
      $('d-best').textContent = b === null ? '-' : api.fmtTime(b);
    }

    function saveState() {
      api.save('state', { lv, given, grid, notes, sol, hints, done, time: timer.value() });
    }

    function paint() {
      const selVal = sel >= 0 ? grid[sel] : 0;
      cellEls.forEach((el, i) => {
        const v = grid[i];
        let cls = el.className.replace(/ (given|sel|peer|same|bad)\b/g, '');
        if (given[i]) cls += ' given';
        if (i === sel) cls += ' sel';
        else if (sel >= 0 && peers(i, sel)) cls += ' peer';
        if (v && v === selVal && i !== sel) cls += ' same';
        if (v && grid.some((w, j) => w === v && peers(i, j))) cls += ' bad';
        el.className = cls;
        if (v) el.textContent = v;
        else if (notes[i]) {
          el.innerHTML = '<span class="d-notes">' + [1, 2, 3, 4, 5, 6, 7, 8, 9]
            .map(d => `<i>${notes[i] >> d & 1 ? d : ''}</i>`).join('') + '</span>';
        } else el.textContent = '';
      });
      root.querySelectorAll('#d-pad [data-d]').forEach(b => {
        const d = +b.dataset.d;
        b.classList.toggle('dim', d > 0 && grid.filter(v => v === d).length >= 9);
      });
      root.querySelectorAll('[data-level]').forEach(b => b.classList.toggle('on', b.dataset.level === lv));
    }

    function newGame() {
      generate();
      grid = given.slice();
      notes = Array(81).fill(0);
      sel = -1; hints = 0; done = false;
      timer.reset();
      $('d-msg').textContent = '';
      showBest();
      paint();
      saveState();
    }

    function input(d) {
      if (done || sel < 0 || given[sel]) return;
      timer.start();
      if (d === 0) { grid[sel] = 0; notes[sel] = 0; }
      else if (noteMode) { if (!grid[sel]) notes[sel] ^= 1 << d; }
      else {
        grid[sel] = grid[sel] === d ? 0 : d;
        if (grid[sel]) { // 入れた数字を、同じ列・枠のメモから消す
          notes[sel] = 0;
          for (let j = 0; j < 81; j++) if (peers(sel, j)) notes[j] &= ~(1 << d);
        }
      }
      check();
    }

    function check() {
      if (grid.every((v, i) => v === sol[i])) {
        done = true;
        const time = timer.stop();
        const old = api.load('best_' + lv, null);
        const isNew = hints === 0 && (old === null || time < old);
        if (isNew) api.save('best_' + lv, time);
        showBest();
        $('d-msg').textContent = `🎉 クリア! ${api.fmtTime(time)}`
          + (hints ? `(ヒント${hints}回。ヒントを使うとベストには記録されません)` : isNew ? '(新記録)' : '');
      }
      paint();
      saveState();
    }

    board.addEventListener('click', e => {
      const el = e.target.closest('[data-i]');
      if (el) { sel = +el.dataset.i; paint(); }
    });
    $('d-pad').addEventListener('click', e => {
      const el = e.target.closest('[data-d]');
      if (el) input(+el.dataset.d);
    });
    $('d-note').addEventListener('click', () => {
      noteMode = !noteMode;
      const b = $('d-note');
      b.classList.toggle('on', noteMode);
      b.setAttribute('aria-pressed', noteMode);
      b.textContent = `✏️ メモ:${noteMode ? 'ON' : 'OFF'}`;
    });
    $('d-hint').addEventListener('click', () => {
      if (done) return;
      if (sel < 0 || given[sel] || grid[sel] === sol[sel]) { $('d-msg').textContent = '空いているマス(またはまちがっているマス)を選んでから押してください'; return; }
      $('d-msg').textContent = '';
      timer.start();
      grid[sel] = sol[sel]; notes[sel] = 0; hints++;
      check();
    });
    $('d-levels').addEventListener('click', e => {
      const k = e.target.dataset.level;
      if (k) { lv = k; api.save('level', lv); }
      if (k || e.target.id === 'd-new') newGame();
    });
    function onKey(e) {
      if (/^[0-9]$/.test(e.key)) input(+e.key);
      else if (e.key === 'Backspace' || e.key === 'Delete') input(0);
      else {
        const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -9, ArrowDown: 9 }[e.key];
        if (!step) return;
        e.preventDefault();
        const to = (sel < 0 ? 0 : sel) + step;
        if (to >= 0 && to < 81 && (Math.abs(step) === 9 || Math.floor(to / 9) === Math.floor(sel / 9) || sel < 0)) { sel = to; paint(); }
      }
    }
    document.addEventListener('keydown', onKey);

    const s = api.load('state', null);
    if (s && s.given && s.given.length === 81 && LEVELS[s.lv]) {
      ({ lv, given, grid, notes, sol, hints, done } = s);
      sel = -1;
      timer.set(s.time || 0);
      showBest();
      paint();
      if (done) $('d-msg').textContent = '🎉 クリア済み。「新しい問題」で次へ';
    } else newGame();

    return () => { saveState(); timer.reset(); document.removeEventListener('keydown', onKey); };
  },
});

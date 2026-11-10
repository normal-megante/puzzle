// 15パズル(3×3 / 4×4 / 5×5)
// cells[位置] = タイル番号(0 は空きマス)。完成形からランダムに動かして混ぜるので必ず解ける。
'use strict';

registerPuzzle({
  id: 'fifteen',
  name: '15パズル',
  icon: '🔢',
  desc: '数字をスライドして順番に並べよう',

  start(root, api) {
    let n = api.load('size', 4);
    let cells, blank, moves, startAt, timer, done;
    const els = {}; // タイル番号 → ボタン要素

    root.innerHTML = `
      <div class="row" id="f-sizes">
        ${[3, 4, 5].map(s => `<button class="btn" data-size="${s}">${s}×${s}</button>`).join('')}
        <button class="btn primary" id="f-new">混ぜ直す</button>
      </div>
      <div class="stats">
        <div><small>手数</small><b id="f-moves">0</b></div>
        <div><small>時間</small><b id="f-time">0:00</b></div>
        <div><small>ベスト(手数 / 時間)</small><b id="f-best">-</b></div>
      </div>
      <div class="f-board" id="f-board"></div>
      <p class="msg" id="f-msg"></p>
      <p class="note">空きマスと同じ行・列のタイルをタップすると、まとめて動きます。<br>時間は最初の1手から計り始めます。パソコンは矢印キーでも動かせます。</p>`;

    const $ = id => root.querySelector('#' + id);
    const board = $('f-board');

    function showBest() {
      const b = api.load('best' + n, null);
      $('f-best').textContent = b ? `${b.moves} / ${api.fmtTime(b.time)}` : '-';
    }

    function place(num) {
      const pos = cells.indexOf(num);
      const el = els[num];
      el.style.transform = `translate(${(pos % n) * 100}%, ${Math.floor(pos / n) * 100}%)`;
      el.classList.toggle('home', pos === num - 1);
    }

    function swap(pos) { // pos のタイルを空きマスへ
      cells[blank] = cells[pos];
      cells[pos] = 0;
      blank = pos;
    }

    function neighbors(pos) {
      const r = [];
      if (pos >= n) r.push(pos - n);
      if (pos < n * (n - 1)) r.push(pos + n);
      if (pos % n > 0) r.push(pos - 1);
      if (pos % n < n - 1) r.push(pos + 1);
      return r;
    }

    function solved() {
      return cells.every((v, i) => v === (i === n * n - 1 ? 0 : i + 1));
    }

    function newGame() {
      clearInterval(timer);
      timer = null; moves = 0; done = false;
      cells = Array.from({ length: n * n }, (_, i) => (i + 1) % (n * n));
      blank = n * n - 1;
      do {
        let prev = -1;
        for (let i = 0; i < n * n * 40; i++) {
          const opts = neighbors(blank).filter(p => p !== prev);
          const pick = opts[Math.floor(Math.random() * opts.length)];
          prev = blank;
          swap(pick);
        }
      } while (solved());

      board.style.setProperty('--n', n);
      board.innerHTML = '';
      for (let num = 1; num < n * n; num++) {
        const b = document.createElement('button');
        b.className = 'f-tile';
        b.innerHTML = `<span>${num}</span>`;
        b.addEventListener('click', () => tap(cells.indexOf(num)));
        els[num] = b;
        board.appendChild(b);
        place(num);
      }
      $('f-moves').textContent = '0';
      $('f-time').textContent = '0:00';
      $('f-msg').textContent = '';
      root.querySelectorAll('[data-size]').forEach(b => b.classList.toggle('on', +b.dataset.size === n));
      showBest();
    }

    function tap(pos) {
      if (done || pos === blank) return;
      const sameRow = Math.floor(pos / n) === Math.floor(blank / n);
      const sameCol = pos % n === blank % n;
      if (!sameRow && !sameCol) return;
      const step = (sameRow ? 1 : n) * (pos > blank ? 1 : -1);
      while (blank !== pos) {
        const from = blank + step;
        const num = cells[from];
        swap(from);
        place(num);
        moves++;
      }
      if (!timer) {
        startAt = Date.now();
        timer = setInterval(() => {
          $('f-time').textContent = api.fmtTime((Date.now() - startAt) / 1000);
        }, 250);
      }
      $('f-moves').textContent = moves;
      if (solved()) win();
    }

    function win() {
      done = true;
      clearInterval(timer);
      const time = (Date.now() - startAt) / 1000;
      $('f-time').textContent = api.fmtTime(time);
      const old = api.load('best' + n, null);
      const best = old
        ? { moves: Math.min(old.moves, moves), time: Math.min(old.time, time) }
        : { moves, time };
      const isNew = !old || best.moves < old.moves || best.time < old.time;
      api.save('best' + n, best);
      showBest();
      $('f-msg').textContent = `🎉 クリア! ${moves}手・${api.fmtTime(time)}` + (isNew ? '(新記録)' : '');
    }

    function onKey(e) {
      // 矢印の向きにタイルが動く(例:↑なら空きマスの下のタイルが上へ)
      const d = { ArrowUp: n, ArrowDown: -n, ArrowLeft: 1, ArrowRight: -1 }[e.key];
      if (!d) return;
      const pos = blank + d;
      if (pos < 0 || pos >= n * n) return;
      if (Math.abs(d) === 1 && Math.floor(pos / n) !== Math.floor(blank / n)) return;
      e.preventDefault();
      tap(pos);
    }

    $('f-sizes').addEventListener('click', e => {
      const s = e.target.dataset.size;
      if (s) { n = +s; api.save('size', n); }
      if (s || e.target.id === 'f-new') newGame();
    });
    document.addEventListener('keydown', onKey);
    newGame();

    return () => {
      clearInterval(timer);
      document.removeEventListener('keydown', onKey);
    };
  },
});

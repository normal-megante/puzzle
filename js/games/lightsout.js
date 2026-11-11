// ライツアウト(3×3 / 4×4 / 5×5)
// lit[位置] = 点灯中か。全部消えた状態からランダムに押して問題を作るので必ず解ける。
'use strict';

registerPuzzle({
  id: 'lightsout',
  name: 'ライツアウト',
  icon: '💡',
  desc: '押すと十字に反転。全部のライトを消そう',

  start(root, api) {
    let n = api.load('size', 5);
    let lit, first, moves, startAt, timer, done;
    let cellEls = [];

    root.innerHTML = `
      <div class="row" id="l-sizes">
        ${[3, 4, 5].map(s => `<button class="btn" data-size="${s}">${s}×${s}</button>`).join('')}
      </div>
      <div class="row">
        <button class="btn" id="l-retry">最初から</button>
        <button class="btn primary" id="l-new">新しい問題</button>
      </div>
      <div class="stats">
        <div><small>手数</small><b id="l-moves">0</b></div>
        <div><small>時間</small><b id="l-time">0:00</b></div>
        <div><small>ベスト(手数 / 時間)</small><b id="l-best">-</b></div>
      </div>
      <div class="l-board" id="l-board"></div>
      <p class="msg" id="l-msg"></p>
      <p class="note">マスを押すと、そのマスと上下左右が反転します。黄色のライトを全部消せばクリア。<br>「最初から」は同じ問題をやり直します(時間はそのまま続きます)。</p>`;

    const $ = id => root.querySelector('#' + id);
    const board = $('l-board');

    function showBest() {
      const b = api.load('best' + n, null);
      $('l-best').textContent = b ? `${b.moves} / ${api.fmtTime(b.time)}` : '-';
    }

    function toggle(pos) { // 盤面データだけ反転
      const r = Math.floor(pos / n), c = pos % n;
      for (const [dr, dc] of [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]]) {
        const rr = r + dr, cc = c + dc;
        if (rr >= 0 && rr < n && cc >= 0 && cc < n) lit[rr * n + cc] = !lit[rr * n + cc];
      }
    }

    function draw() {
      cellEls.forEach((el, i) => {
        el.classList.toggle('on', lit[i]);
        el.setAttribute('aria-pressed', lit[i]);
      });
      $('l-moves').textContent = moves;
    }

    function reset(keepTimer) {
      if (!keepTimer) { clearInterval(timer); timer = null; $('l-time').textContent = '0:00'; }
      lit = first.slice();
      moves = 0; done = false;
      $('l-msg').textContent = '';
      draw();
    }

    function newGame() {
      lit = Array(n * n).fill(false);
      do {
        for (let i = 0; i < n * n; i++) if (Math.random() < 0.5) toggle(i);
      } while (!lit.includes(true));
      first = lit.slice();

      board.style.setProperty('--n', n);
      board.innerHTML = '';
      cellEls = lit.map((_, i) => {
        const b = document.createElement('button');
        b.className = 'l-cell';
        b.setAttribute('aria-label', `${Math.floor(i / n) + 1}行${i % n + 1}列`);
        b.addEventListener('click', () => press(i));
        board.appendChild(b);
        return b;
      });
      root.querySelectorAll('[data-size]').forEach(b => b.classList.toggle('on', +b.dataset.size === n));
      showBest();
      reset(false);
    }

    function press(pos) {
      if (done) return;
      toggle(pos);
      moves++;
      if (!timer) {
        startAt = Date.now();
        timer = setInterval(() => {
          $('l-time').textContent = api.fmtTime((Date.now() - startAt) / 1000);
        }, 250);
      }
      draw();
      if (!lit.includes(true)) win();
    }

    function win() {
      done = true;
      clearInterval(timer);
      const time = (Date.now() - startAt) / 1000;
      $('l-time').textContent = api.fmtTime(time);
      const old = api.load('best' + n, null);
      const best = old
        ? { moves: Math.min(old.moves, moves), time: Math.min(old.time, time) }
        : { moves, time };
      const isNew = !old || best.moves < old.moves || best.time < old.time;
      api.save('best' + n, best);
      showBest();
      $('l-msg').textContent = `🎉 クリア! ${moves}手・${api.fmtTime(time)}` + (isNew ? '(新記録)' : '');
    }

    $('l-sizes').addEventListener('click', e => {
      const s = e.target.dataset.size;
      if (s) { n = +s; api.save('size', n); newGame(); }
    });
    $('l-new').addEventListener('click', newGame);
    $('l-retry').addEventListener('click', () => { if (!done) reset(true); });
    newGame();

    return () => clearInterval(timer);
  },
});

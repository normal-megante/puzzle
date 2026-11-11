// 氷の床(動き出すと岩か壁に当たるまで止まらない。ゴールの上で止まればクリア)
// 問題はランダムに作り、総当たり(幅優先探索)で「解ける・最少手数が十分ある」ものだけ採用する。
'use strict';

registerPuzzle({
  id: 'ice',
  name: '氷の床',
  icon: '🧊',
  desc: 'すべる床。岩や壁でうまく止まってゴールへ',

  start(root, api) {
    const LEVELS = {
      easy: { name: 'かんたん', size: 6, min: 4 },
      mid: { name: 'ふつう', size: 8, min: 7 },
      hard: { name: 'むずかしい', size: 10, min: 10 },
    };
    const DIRS = [[-1, 0], [0, -1], [1, 0], [0, 1]]; // 左 上 右 下 → [x, y]
    let lv = api.load('level', 'easy');
    if (!LEVELS[lv]) lv = 'easy';
    let n, rock, startPos, goal, pos, moves, min, done;
    let player;

    root.innerHTML = `
      <div class="row" id="i-levels">
        ${Object.entries(LEVELS).map(([k, v]) => `<button class="btn" data-level="${k}">${v.name}</button>`).join('')}
      </div>
      <div class="row">
        <button class="btn" id="i-retry">最初の位置に戻る</button>
        <button class="btn primary" id="i-new">新しい問題</button>
      </div>
      <div class="stats">
        <div><small>手数(最少 <span id="i-min"></span>)</small><b id="i-moves">0</b></div>
        <div><small>クリアした数</small><b id="i-clears">0</b></div>
      </div>
      <div class="i-board" id="i-board"></div>
      <p class="msg" id="i-msg"></p>
      <div class="i-pad" id="i-pad">
        <button class="btn" data-dir="1" aria-label="上">↑</button>
        <button class="btn" data-dir="0" aria-label="左">←</button>
        <button class="btn" data-dir="3" aria-label="下">↓</button>
        <button class="btn" data-dir="2" aria-label="右">→</button>
      </div>
      <p class="note">盤面をスワイプ、下の矢印ボタン、矢印キーのどれでも動かせます。<br>🐧 は岩(■)か壁に当たるまで止まりません。旗 🚩 を通り過ぎてもクリアにならず、旗の上で止まる必要があります。</p>`;

    const $ = id => root.querySelector('#' + id);
    const board = $('i-board');

    function slide(p, d) {
      let x = p % n, y = Math.floor(p / n);
      const [dx, dy] = DIRS[d];
      while (true) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= n || ny >= n || rock[ny * n + nx]) break;
        x = nx; y = ny;
      }
      return y * n + x;
    }

    function generate() {
      const need = LEVELS[lv].min;
      for (let attempt = 0; ; attempt++) {
        rock = Array.from({ length: n * n }, () => Math.random() < 0.14);
        const free = rock.map((r, i) => (r ? -1 : i)).filter(i => i >= 0);
        startPos = free[Math.floor(Math.random() * free.length)];
        const dist = new Map([[startPos, 0]]);
        const queue = [startPos];
        for (let k = 0; k < queue.length; k++) {
          for (let d = 0; d < 4; d++) {
            const to = slide(queue[k], d);
            if (!dist.has(to)) { dist.set(to, dist.get(queue[k]) + 1); queue.push(to); }
          }
        }
        const far = queue[queue.length - 1]; // いちばん遠い停止位置
        // 何度作ってもだめな時は、少しずつ条件をゆるめる
        if (dist.get(far) >= Math.max(2, need - Math.floor(attempt / 300))) {
          goal = far;
          min = dist.get(far);
          return;
        }
      }
    }

    function place() {
      player.style.transform = `translate(${(pos % n) * 100}%, ${Math.floor(pos / n) * 100}%)`;
      $('i-moves').textContent = moves;
    }

    function reset() {
      pos = startPos; moves = 0; done = false;
      $('i-msg').textContent = '';
      place();
    }

    function newGame() {
      n = LEVELS[lv].size;
      generate();
      board.style.setProperty('--n', n);
      board.innerHTML = rock.map((r, i) =>
        `<span class="i-cell${r ? ' rock' : ''}">${i === goal ? '🚩' : ''}</span>`).join('')
        + '<span class="i-player" id="i-player">🐧</span>';
      player = $('i-player');
      root.querySelectorAll('[data-level]').forEach(b => b.classList.toggle('on', b.dataset.level === lv));
      $('i-min').textContent = min;
      $('i-clears').textContent = api.load('clears_' + lv, 0);
      reset();
    }

    function move(d) {
      if (done) return;
      const to = slide(pos, d);
      if (to === pos) return;
      pos = to;
      moves++;
      place();
      if (pos === goal) {
        done = true;
        const clears = api.load('clears_' + lv, 0) + 1;
        api.save('clears_' + lv, clears);
        $('i-clears').textContent = clears;
        $('i-msg').textContent = `🎉 ゴール! ${moves}手` + (moves <= min ? '(最少手数!)' : '');
      }
    }

    api.swipe(board, move);
    function onKey(e) {
      const d = ['ArrowLeft', 'ArrowUp', 'ArrowRight', 'ArrowDown'].indexOf(e.key);
      if (d < 0) return;
      e.preventDefault();
      move(d);
    }
    document.addEventListener('keydown', onKey);
    $('i-pad').addEventListener('click', e => {
      const b = e.target.closest('[data-dir]');
      if (b) move(+b.dataset.dir);
    });
    $('i-levels').addEventListener('click', e => {
      const k = e.target.dataset.level;
      if (k) { lv = k; api.save('level', lv); newGame(); }
    });
    $('i-new').addEventListener('click', newGame);
    $('i-retry').addEventListener('click', reset);
    newGame();

    return () => document.removeEventListener('keydown', onKey);
  },
});

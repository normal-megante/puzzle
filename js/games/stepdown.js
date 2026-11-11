// カウントダウン迷路(オリジナル)
// マスに入るたびにそのマスの数字が1減る。0 のマスには入れない。全部を 0 にして、最後に 🏁 のマスにいればクリア。
// 問題は「ランダムに歩いた道」から作る(各マスの数字 = その道で入った回数)ので、必ず解ける。
'use strict';

registerPuzzle({
  id: 'stepdown',
  name: 'カウントダウン迷路',
  icon: '🔻',
  desc: 'オリジナル:踏むと数字が減る床。全部 0 にしてゴール',

  start(root, api) {
    const LEVELS = {
      easy: { name: 'かんたん', size: 4, len: 13, luck: 12 }, // luck = でたらめに歩いて解ける割合の上限(%)
      mid: { name: 'ふつう', size: 5, len: 24, luck: 4 },
      hard: { name: 'むずかしい', size: 6, len: 38, luck: 1 },
    };
    const DIRS = [[-1, 0], [0, -1], [1, 0], [0, 1]]; // 左 上 右 下
    let lv = api.load('level', 'easy');
    if (!LEVELS[lv]) lv = 'easy';
    let n, num0, num, startPos, goal, pos, history, done;
    let cellEls = [];

    root.innerHTML = `
      <div class="row" id="z-levels">
        ${Object.entries(LEVELS).map(([k, v]) => `<button class="btn" data-level="${k}">${v.name}</button>`).join('')}
      </div>
      <div class="row">
        <button class="btn" id="z-undo">1手戻す</button>
        <button class="btn" id="z-retry">最初から</button>
        <button class="btn primary" id="z-new">新しい問題</button>
      </div>
      <div class="stats">
        <div><small>残りの合計</small><b id="z-left">0</b></div>
        <div><small>クリアした数</small><b id="z-clears">0</b></div>
      </div>
      <div class="z-board" id="z-board"></div>
      <p class="msg" id="z-msg"></p>
      <div class="i-pad" id="z-pad">
        <button class="btn" data-dir="1" aria-label="上">↑</button>
        <button class="btn" data-dir="0" aria-label="左">←</button>
        <button class="btn" data-dir="3" aria-label="下">↓</button>
        <button class="btn" data-dir="2" aria-label="右">→</button>
      </div>
      <p class="note">青いマスがあなたです。となりのマスに入ると、<b>入ったマスの数字が1減ります</b>。0 のマスにはもう入れません。<br>全部の数字を 0 にして、最後に 🏁 のマスにいればクリア。となりのマスのタップ、スワイプ、矢印ボタン、矢印キーで動けます。</p>`;

    const $ = id => root.querySelector('#' + id);
    const board = $('z-board');

    const step = (p, d) => {
      const x = p % n + DIRS[d][0], y = Math.floor(p / n) + DIRS[d][1];
      return x < 0 || y < 0 || x >= n || y >= n ? -1 : y * n + x;
    };

    function generate() {
      n = LEVELS[lv].size;
      let tries = 0;
      for (;;) {
        const cnt = Array(n * n).fill(0);
        let cur = Math.floor(Math.random() * n * n), prev = -1, steps = 0;
        const s = cur;
        while (steps < LEVELS[lv].len) {
          // まだ通っていないマスを選びやすく、すぐ引き返しにくくする。同じマスは3回まで。
          const opts = [0, 1, 2, 3].map(d => step(cur, d)).filter(c => c >= 0 && cnt[c] < 3);
          if (!opts.length) break;
          const weights = opts.map(c => (c === prev ? 0.3 : 1) * (cnt[c] === 0 ? 3 : 1));
          let r = Math.random() * weights.reduce((a, b) => a + b, 0), k = 0;
          while (r > weights[k]) r -= weights[k++];
          prev = cur;
          cur = opts[k];
          cnt[cur]++;
          steps++;
        }
        if (steps < LEVELS[lv].len * 0.85 || cur === s) continue;
        // でたらめに歩いても解けてしまう問題は簡単すぎるので捨てる(200回試して成功率を見る)
        let wins = 0;
        for (let t = 0; t < 200; t++) {
          const a = cnt.slice();
          let p = s, left = steps;
          for (;;) {
            const opts = [0, 1, 2, 3].map(d => step(p, d)).filter(c => a[c] > 0);
            if (!opts.length) break;
            p = opts[Math.floor(Math.random() * opts.length)];
            a[p]--;
            left--;
          }
          if (left === 0 && p === cur) wins++;
        }
        if (wins <= LEVELS[lv].luck * 2 || ++tries > 300) {
          num0 = cnt; startPos = s; goal = cur;
          return;
        }
      }
    }

    function paint() {
      cellEls.forEach((el, i) => {
        const wall = num0[i] === 0 && i !== startPos;
        el.className = 'z-cell' + (wall ? ' wall' : num[i] === 0 ? ' zero' : '') + (i === pos ? ' me' : '');
        el.innerHTML = wall ? '' : `${num[i]}${i === goal ? '<i>🏁</i>' : ''}`;
      });
      $('z-left').textContent = num.reduce((a, b) => a + b, 0);
      $('z-undo').disabled = !history.length || done;
    }

    function reset() {
      num = num0.slice();
      pos = startPos; history = []; done = false;
      $('z-msg').textContent = '';
      paint();
    }

    function newGame() {
      generate();
      board.style.setProperty('--n', n);
      board.innerHTML = num0.map((_, i) => `<button data-i="${i}"></button>`).join('');
      cellEls = [...board.children];
      root.querySelectorAll('[data-level]').forEach(b => b.classList.toggle('on', b.dataset.level === lv));
      $('z-clears').textContent = api.load('clears_' + lv, 0);
      reset();
    }

    function check() {
      const left = num.reduce((a, b) => a + b, 0);
      if (left === 0) {
        if (pos !== goal) { $('z-msg').textContent = '全部 0 になりましたが、最後が 🏁 のマスではありません'; return; }
        done = true;
        const clears = api.load('clears_' + lv, 0) + 1;
        api.save('clears_' + lv, clears);
        $('z-clears').textContent = clears;
        $('z-msg').textContent = '🎉 クリア!';
      } else if (![0, 1, 2, 3].some(d => num[step(pos, d)] > 0)) {
        $('z-msg').textContent = '行き止まり…「1手戻す」か「最初から」でやり直せます';
      } else $('z-msg').textContent = '';
    }

    function moveTo(to) {
      if (done || to < 0 || !(num[to] > 0)) return;
      history.push(pos);
      pos = to;
      num[to]--;
      check();
      paint();
    }
    const move = d => moveTo(step(pos, d));

    board.addEventListener('click', e => {
      const el = e.target.closest('[data-i]');
      if (!el) return;
      const i = +el.dataset.i;
      const d = [0, 1, 2, 3].find(k => step(pos, k) === i);
      if (d !== undefined) move(d);
    });
    api.swipe(board, move);
    function onKey(e) {
      const d = ['ArrowLeft', 'ArrowUp', 'ArrowRight', 'ArrowDown'].indexOf(e.key);
      if (d >= 0) { e.preventDefault(); move(d); }
    }
    document.addEventListener('keydown', onKey);
    $('z-pad').addEventListener('click', e => {
      const el = e.target.closest('[data-dir]');
      if (el) move(+el.dataset.dir);
    });
    $('z-undo').addEventListener('click', () => {
      if (done || !history.length) return;
      num[pos]++;
      pos = history.pop();
      check();
      paint();
    });
    $('z-retry').addEventListener('click', reset);
    $('z-new').addEventListener('click', newGame);
    $('z-levels').addEventListener('click', e => {
      const k = e.target.dataset.level;
      if (k) { lv = k; api.save('level', lv); newGame(); }
    });
    newGame();

    return () => document.removeEventListener('keydown', onKey);
  },
});

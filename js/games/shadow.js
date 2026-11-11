// 影のパズル(オリジナル)
// マス目にブロックを積む(h[マス] = 高さ 0〜3)。上と左のバーは「影」=その列・その行でいちばん高い山の高さ。
// 影を目標の形にぴったり合わせ、使うブロックを上限以下にすればクリア。✕ のマスには置けない。
// 問題の作り方:各行に1つずつ山を置く(列も1つずつ)答えを先に作る。その合計がブロック数の最小なので、それを上限にする。
'use strict';

registerPuzzle({
  id: 'shadow',
  name: '影のパズル',
  icon: '🔦',
  desc: 'オリジナル:ブロックを積んで、影を目標の形にしよう',

  start(root, api) {
    const LEVELS = {
      easy: { name: 'かんたん', size: 4, block: 0.25 },
      mid: { name: 'ふつう', size: 5, block: 0.35 },
      hard: { name: 'むずかしい', size: 6, block: 0.45 },
    };
    const MAXH = 3;
    let lv = api.load('level', 'easy');
    if (!LEVELS[lv]) lv = 'easy';
    let n, blocked, colT, rowT, limit, h, done;

    root.innerHTML = `
      <div class="row" id="sh-levels">
        ${Object.entries(LEVELS).map(([k, v]) => `<button class="btn" data-level="${k}">${v.name}</button>`).join('')}
      </div>
      <div class="row">
        <button class="btn" id="sh-clear">全部どける</button>
        <button class="btn primary" id="sh-new">新しい問題</button>
      </div>
      <div class="stats">
        <div><small>使ったブロック / 上限</small><b id="sh-used">0</b></div>
        <div><small>クリアした数</small><b id="sh-clears">0</b></div>
      </div>
      <div class="sh-board" id="sh-board"></div>
      <p class="msg" id="sh-msg"></p>
      <p class="note">マスをタップするとブロックが1個ずつ積み上がります(3個の次は0個に戻ります)。数字は積んだ高さです。<br><b>上のバー</b>はその列を正面から照らした影、<b>左のバー</b>はその行を横から照らした影で、どちらも「いちばん高い山の高さ」になります。<br>点線のわくが目標の影です。全部のバーを目標ぴったりにして(赤はオーバー)、ブロックを上限以下におさえればクリア。✕ のマスには置けません。</p>`;

    const $ = id => root.querySelector('#' + id);
    const board = $('sh-board');

    function generate() {
      n = LEVELS[lv].size;
      const perm = Array.from({ length: n }, (_, i) => i).sort(() => Math.random() - 0.5);
      const heights = perm.map(() => 1 + Math.floor(Math.random() * MAXH));
      rowT = heights.slice();
      colT = Array(n).fill(0);
      perm.forEach((c, r) => { colT[c] = heights[r]; });
      // 答えのマス以外を、ランダムに「置けないマス」にする
      blocked = Array.from({ length: n * n }, (_, i) => perm[Math.floor(i / n)] !== i % n && Math.random() < LEVELS[lv].block);
      limit = heights.reduce((a, b) => a + b, 0);
    }

    const colMax = c => Math.max(...h.filter((_, i) => i % n === c));
    const rowMax = r => Math.max(...h.slice(r * n, r * n + n));

    function bar(cur, target) { // 影のバー1本ぶん(下から MAXH 段)
      let s = '';
      for (let k = 1; k <= MAXH; k++) {
        s += `<i class="${k <= target ? 'goal' : ''}${k <= cur ? (k <= target ? ' on' : ' over') : ''}"></i>`;
      }
      return s;
    }

    function paint() {
      let ok = true;
      board.querySelectorAll('.sh-col').forEach((el, c) => {
        el.innerHTML = bar(colMax(c), colT[c]);
        el.classList.toggle('ok', colMax(c) === colT[c]);
        ok = ok && colMax(c) === colT[c];
      });
      board.querySelectorAll('.sh-row').forEach((el, r) => {
        el.innerHTML = bar(rowMax(r), rowT[r]);
        el.classList.toggle('ok', rowMax(r) === rowT[r]);
        ok = ok && rowMax(r) === rowT[r];
      });
      board.querySelectorAll('[data-i]').forEach(el => {
        const v = h[+el.dataset.i];
        el.textContent = v || '';
        el.dataset.h = v;
      });
      const used = h.reduce((a, b) => a + b, 0);
      $('sh-used').textContent = `${used} / ${limit}`;
      $('sh-used').classList.toggle('sh-bad', used > limit);
      return ok ? used : -1;
    }

    function reset() {
      h = Array(n * n).fill(0);
      done = false;
      $('sh-msg').textContent = '';
      paint();
    }

    function newGame() {
      generate();
      board.style.gridTemplateColumns = `1.4fr repeat(${n}, 1fr)`;
      board.style.setProperty('--n', n);
      let html = '<span></span>' + colT.map(() => '<span class="sh-col"></span>').join('');
      for (let r = 0; r < n; r++) {
        html += '<span class="sh-row"></span>';
        for (let c = 0; c < n; c++) {
          const i = r * n + c;
          html += blocked[i] ? '<span class="sh-cell blocked">✕</span>' : `<button class="sh-cell" data-i="${i}"></button>`;
        }
      }
      board.innerHTML = html;
      root.querySelectorAll('[data-level]').forEach(b => b.classList.toggle('on', b.dataset.level === lv));
      $('sh-clears').textContent = api.load('clears_' + lv, 0);
      reset();
    }

    board.addEventListener('click', e => {
      const el = e.target.closest('[data-i]');
      if (!el || done) return;
      const i = +el.dataset.i;
      h[i] = (h[i] + 1) % (MAXH + 1);
      const used = paint();
      if (used < 0) { $('sh-msg').textContent = ''; return; }
      if (used > limit) { $('sh-msg').textContent = `影は合っています!あとはブロックを ${used - limit} 個へらせばクリア`; return; }
      done = true;
      const clears = api.load('clears_' + lv, 0) + 1;
      api.save('clears_' + lv, clears);
      $('sh-clears').textContent = clears;
      $('sh-msg').textContent = `🎉 クリア! ${used}個で完成`;
    });
    $('sh-clear').addEventListener('click', reset);
    $('sh-new').addEventListener('click', newGame);
    $('sh-levels').addEventListener('click', e => {
      const k = e.target.dataset.level;
      if (k) { lv = k; api.save('level', lv); newGame(); }
    });
    newGame();
  },
});

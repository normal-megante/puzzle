// パイプつなぎ(タップでパイプを回して、水源から全部のパイプに水を流す)
// mask[位置] = 開いている向きのビット(上1 右2 下4 左8)。
// 問題は「全マスをつなぐ木」をランダムに作ってから各マスを回して作るので、必ず解ける。
'use strict';

registerPuzzle({
  id: 'pipes',
  name: 'パイプつなぎ',
  icon: '🚰',
  desc: 'パイプを回して、全部に水を流そう',

  start(root, api) {
    const DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0]; // 上 右 下 左
    let n = api.load('size', 5);
    if (![5, 7, 9].includes(n)) n = 5;
    let mask, src, taps, done;
    let cellEls = [];

    root.innerHTML = `
      <div class="row" id="p-sizes">
        ${[5, 7, 9].map(s => `<button class="btn" data-size="${s}">${s}×${s}</button>`).join('')}
        <button class="btn primary" id="p-new">新しい問題</button>
      </div>
      <div class="stats">
        <div><small>つながった数</small><b id="p-wet">0</b></div>
        <div><small>時間</small><b id="p-time">0:00</b></div>
        <div><small>ベスト時間</small><b id="p-best">-</b></div>
      </div>
      <div class="p-board" id="p-board"></div>
      <p class="msg" id="p-msg"></p>
      <p class="note">マスをタップすると、パイプが右に90度回ります。水源(真ん中の大きい丸)から水が届いたパイプは青くなります。<br>全部のパイプが青くなり、どこからも水がもれていなければクリア。</p>`;

    const $ = id => root.querySelector('#' + id);
    const board = $('p-board');
    const timer = api.timer($('p-time'));

    const next = (i, d) => {
      const x = i % n + DX[d], y = Math.floor(i / n) + DY[d];
      return x < 0 || y < 0 || x >= n || y >= n ? -1 : y * n + x;
    };
    const joined = (i, d) => { // i の d 向きが、となりとつながっているか
      const j = next(i, d);
      return j >= 0 && (mask[i] >> d & 1) && (mask[j] >> ((d + 2) % 4) & 1) ? j : -1;
    };

    function flow() {
      const seen = new Set([src]), queue = [src];
      for (let k = 0; k < queue.length; k++) {
        for (let d = 0; d < 4; d++) {
          const j = joined(queue[k], d);
          if (j >= 0 && !seen.has(j)) { seen.add(j); queue.push(j); }
        }
      }
      return seen;
    }

    function leaks() {
      return mask.some((m, i) => [0, 1, 2, 3].some(d => (m >> d & 1) && joined(i, d) < 0));
    }

    function showBest() {
      const b = api.load('best' + n, null);
      $('p-best').textContent = b === null ? '-' : api.fmtTime(b);
    }

    function paint() {
      const wet = flow();
      cellEls.forEach((el, i) => {
        const m = mask[i];
        const d = (m & 1 ? 'M1 1V0' : '') + (m & 2 ? 'M1 1H2' : '') + (m & 4 ? 'M1 1V2' : '') + (m & 8 ? 'M1 1H0' : '');
        const ends = [1, 2, 4, 8].includes(m); // 行き止まりのパイプ
        el.className = 'p-cell' + (wet.has(i) ? ' wet' : '');
        el.innerHTML = `<svg viewBox="0 0 2 2" aria-hidden="true"><path d="${d}"/><circle cx="1" cy="1" r="${i === src ? 0.55 : ends ? 0.38 : 0.25}"/></svg>`;
      });
      $('p-wet').textContent = `${wet.size} / ${n * n}`;
      return wet.size;
    }

    function newGame() {
      // ランダムな木を作る(つながっているマスの集まりに、となりのマスを1つずつ足していく)
      mask = Array(n * n).fill(0);
      src = Math.floor(n * n / 2);
      const inTree = new Set([src]);
      const edges = [0, 1, 2, 3].map(d => [src, d]);
      while (edges.length) {
        const [a, d] = edges.splice(Math.floor(Math.random() * edges.length), 1)[0];
        const b = next(a, d);
        if (b < 0 || inTree.has(b)) continue;
        mask[a] |= 1 << d;
        mask[b] |= 1 << ((d + 2) % 4);
        inTree.add(b);
        for (let e = 0; e < 4; e++) edges.push([b, e]);
      }
      do { // 各マスをランダムに回す
        mask = mask.map(m => {
          for (let k = Math.floor(Math.random() * 4); k > 0; k--) m = ((m << 1) & 15) | (m >> 3);
          return m;
        });
      } while (flow().size === n * n);

      taps = 0; done = false;
      board.style.setProperty('--n', n);
      board.innerHTML = mask.map((_, i) => `<button class="p-cell" data-i="${i}"></button>`).join('');
      cellEls = [...board.children];
      root.querySelectorAll('[data-size]').forEach(b => b.classList.toggle('on', +b.dataset.size === n));
      timer.reset();
      $('p-msg').textContent = '';
      showBest();
      paint();
    }

    board.addEventListener('click', e => {
      const el = e.target.closest('[data-i]');
      if (!el || done) return;
      const i = +el.dataset.i;
      mask[i] = ((mask[i] << 1) & 15) | (mask[i] >> 3);
      taps++;
      timer.start();
      if (paint() === n * n && !leaks()) {
        done = true;
        const time = timer.stop();
        const old = api.load('best' + n, null);
        const isNew = old === null || time < old;
        if (isNew) api.save('best' + n, time);
        showBest();
        $('p-msg').textContent = `🎉 クリア! ${api.fmtTime(time)}・${taps}回タップ` + (isNew ? '(新記録)' : '');
      }
    });
    $('p-sizes').addEventListener('click', e => {
      const s = e.target.dataset.size;
      if (s) { n = +s; api.save('size', n); }
      if (s || e.target.id === 'p-new') newGame();
    });
    newGame();

    return () => timer.reset();
  },
});

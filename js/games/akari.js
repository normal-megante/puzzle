// 美術館(照明を置いて、白いマスを全部照らす)
// black[位置]=黒マスか / num[位置]=黒マスの数字(-1 は数字なし) / st[位置]: 0=なし 1=照明 2=✕(置かない目印)
// ルール:照明は上下左右に、黒マスに当たるまで光が届く。照明どうしは照らし合えない。数字の黒マスは、となりの照明の数。
// 問題は自動で作る:黒マスをばらまく → 正しい置き方を1つ作る → 数字を付ける → 総当たりで答えが1つか確認 → 数字を少し消す。
'use strict';

registerPuzzle({
  id: 'akari',
  name: '美術館',
  icon: '🏛️',
  desc: '照明を置いて、部屋をすみずみまで照らそう',

  start(root, api) {
    let n = api.load('size', 6);
    if (![6, 7, 8].includes(n)) n = 6;
    let black, num, vis, st, done;
    let cellEls = [];

    const adj = i => [i % n > 0 ? i - 1 : -1, i % n < n - 1 ? i + 1 : -1, i - n, i + n].filter(k => k >= 0 && k < n * n);

    function computeVis() { // 各白マスから見えるマス(自分は含まない)
      vis = black.map((b, i) => {
        if (b) return [];
        const out = [];
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          let x = i % n + dx, y = Math.floor(i / n) + dy;
          while (x >= 0 && y >= 0 && x < n && y < n && !black[y * n + x]) { out.push(y * n + x); x += dx; y += dy; }
        }
        return out;
      });
    }

    function countSolutions(limit) {
      const W = black.map((b, i) => (b ? -1 : i)).filter(i => i >= 0);
      const order = new Map(W.map((c, k) => [c, k]));
      // checkAt[k] = k 番目のマスを決めた時点で「もう照らされていないとおかしい」マス
      const checkAt = W.map(() => []);
      W.forEach(c => checkAt[Math.max(order.get(c), ...vis[c].map(v => order.get(v)))].push(c));
      const numbered = black.map((b, i) => (b && num[i] >= 0 ? i : -1)).filter(i => i >= 0);
      const adjB = black.map((b, i) => (b ? [] : adj(i).filter(k => black[k] && num[k] >= 0)));
      const placed = {}, rem = {};
      numbered.forEach(b => { placed[b] = 0; rem[b] = adj(b).filter(k => !black[k]).length; });
      if (numbered.some(b => rem[b] < num[b])) return 0;
      const lit = new Int8Array(n * n);
      let count = 0;
      (function rec(k) {
        if (count >= limit) return;
        if (k === W.length) { count++; return; }
        const c = W[k];
        for (const bulb of [1, 0]) {
          if (bulb && lit[c]) continue;
          adjB[c].forEach(b => { rem[b]--; placed[b] += bulb; });
          if (bulb) { lit[c]++; vis[c].forEach(v => lit[v]++); }
          if (adjB[c].every(b => placed[b] <= num[b] && placed[b] + rem[b] >= num[b]) && checkAt[k].every(v => lit[v] > 0)) rec(k + 1);
          if (bulb) { lit[c]--; vis[c].forEach(v => lit[v]--); }
          adjB[c].forEach(b => { rem[b]++; placed[b] -= bulb; });
        }
      })(0);
      return count;
    }

    function generate() {
      const shuffle = a => a.sort(() => Math.random() - 0.5);
      for (;;) {
        black = Array.from({ length: n * n }, () => Math.random() < 0.22);
        computeVis();
        const whites = shuffle(black.map((b, i) => (b ? -1 : i)).filter(i => i >= 0));
        if (whites.length < n * n * 0.6) continue;
        // 正しい置き方:まだ暗いマスに順に照明を置いていく(暗いマス=どの照明からも見えないので、必ず置ける)
        const lit = Array(n * n).fill(false), bulb = Array(n * n).fill(false);
        whites.forEach(c => { if (!lit[c]) { bulb[c] = true; lit[c] = true; vis[c].forEach(v => { lit[v] = true; }); } });
        num = black.map((b, i) => (b ? adj(i).filter(k => bulb[k]).length : -1));
        if (countSolutions(2) !== 1) continue;
        // 答えが1つのままなら、数字を消して難しくする(黒マスの4割まで)
        const blacks = shuffle(black.map((b, i) => (b ? i : -1)).filter(i => i >= 0));
        let removed = 0;
        for (const b of blacks) {
          if (removed >= blacks.length * 0.4) break;
          const keep = num[b];
          num[b] = -1;
          if (countSolutions(2) === 1) removed++; else num[b] = keep;
        }
        return;
      }
    }

    root.innerHTML = `
      <div class="row" id="ak-sizes">
        ${[6, 7, 8].map(s => `<button class="btn" data-size="${s}">${s}×${s}</button>`).join('')}
        <button class="btn primary" id="ak-new">新しい問題</button>
      </div>
      <div class="stats">
        <div><small>暗いマス</small><b id="ak-dark">0</b></div>
        <div><small>時間</small><b id="ak-time">0:00</b></div>
        <div><small>ベスト時間</small><b id="ak-best">-</b></div>
      </div>
      <div class="row"><button class="btn" id="ak-clear">全部消す</button></div>
      <div class="ak-board" id="ak-board"></div>
      <p class="msg" id="ak-msg"></p>
      <p class="note">白いマスをタップすると 💡 照明 → ✕(置かない目印)→ 空 の順に変わります。<br>照明の光は上下左右に、黒いマスに当たるまで届きます。<b>白いマスを全部照らせばクリア</b>。ただし、<br>・照明どうしが照らし合ってはいけません(赤くなります)<br>・数字のある黒マスは、上下左右のとなりに、その数だけ照明が必要です(多すぎると赤、ぴったりで薄くなります)</p>`;

    const $ = id => root.querySelector('#' + id);
    const board = $('ak-board');
    const timer = api.timer($('ak-time'));

    function showBest() {
      const b = api.load('best' + n, null);
      $('ak-best').textContent = b === null ? '-' : api.fmtTime(b);
    }

    function paint() {
      const lit = Array(n * n).fill(false);
      st.forEach((s, i) => { if (s === 1) { lit[i] = true; vis[i].forEach(v => { lit[v] = true; }); } });
      let ok = true, dark = 0;
      cellEls.forEach((el, i) => {
        if (black[i]) {
          if (num[i] < 0) return;
          const c = adj(i).filter(k => st[k] === 1).length;
          el.className = 'ak-cell black' + (c === num[i] ? ' ok' : c > num[i] ? ' bad' : '');
          if (c !== num[i]) ok = false;
          return;
        }
        const clash = st[i] === 1 && vis[i].some(v => st[v] === 1);
        if (clash) ok = false;
        if (!lit[i]) { dark++; ok = false; }
        el.className = 'ak-cell' + (lit[i] ? ' lit' : '') + (clash ? ' bad' : '');
        el.textContent = st[i] === 1 ? '💡' : st[i] === 2 ? '✕' : '';
      });
      $('ak-dark').textContent = dark;
      return ok;
    }

    function newGame() {
      generate();
      st = Array(n * n).fill(0);
      done = false;
      board.style.setProperty('--n', n);
      board.innerHTML = black.map((b, i) => b
        ? `<span class="ak-cell black">${num[i] >= 0 ? num[i] : ''}</span>`
        : `<button class="ak-cell" data-i="${i}"></button>`).join('');
      cellEls = [...board.children];
      root.querySelectorAll('[data-size]').forEach(b => b.classList.toggle('on', +b.dataset.size === n));
      timer.reset();
      $('ak-msg').textContent = '';
      showBest();
      paint();
    }

    board.addEventListener('click', e => {
      const el = e.target.closest('[data-i]');
      if (!el || done) return;
      const i = +el.dataset.i;
      st[i] = (st[i] + 1) % 3;
      timer.start();
      if (paint()) {
        done = true;
        const time = timer.stop();
        const old = api.load('best' + n, null);
        const isNew = old === null || time < old;
        if (isNew) api.save('best' + n, time);
        showBest();
        $('ak-msg').textContent = `🎉 クリア! ${api.fmtTime(time)}` + (isNew ? '(新記録)' : '');
      }
    });
    $('ak-clear').addEventListener('click', () => { if (!done) { st.fill(0); paint(); } });
    $('ak-sizes').addEventListener('click', e => {
      const s = e.target.dataset.size;
      if (s) { n = +s; api.save('size', n); }
      if (s || e.target.id === 'ak-new') newGame();
    });
    newGame();

    return () => timer.reset();
  },
});

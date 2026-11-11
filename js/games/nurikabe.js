// ぬりかべ(マスを「海(黒)」と「島(白)」にぬり分ける)
// num[位置]=島の大きさの数字(なければ 0)/ st[位置]: 0=未定(白あつかい) 1=海 2=・(島と決めた目印)
// ルール:①数字1つにつき島1つ。島の大きさ=数字 ②島どうしはたて・よこにとなり合わない ③海は全部ひとつながり ④海に 2×2 のかたまりを作らない
// 問題は自動で作る:海だけの盤面から、2×2 の海がなくなるまで島を置いたり広げたりする(海がつながったままになるように)。
// 答えは1つとは限らないので、ルールを全部満たしていればクリアとする。
'use strict';

registerPuzzle({
  id: 'nurikabe',
  name: 'ぬりかべ',
  icon: '🏝️',
  desc: '数字の大きさの島を残して、まわりを海でぬろう',

  start(root, api) {
    let n = api.load('size', 5);
    if (![5, 6, 7].includes(n)) n = 5;
    let num, st, done;
    let cellEls = [];

    const adj = i => [i % n > 0 ? i - 1 : -1, i % n < n - 1 ? i + 1 : -1, i - n, i + n].filter(k => k >= 0 && k < n * n);

    function connected(cells) { // cells(位置の配列)がひとつながりか
      if (!cells.length) return false;
      const set = new Set(cells), seen = new Set([cells[0]]), q = [cells[0]];
      for (let k = 0; k < q.length; k++) for (const j of adj(q[k])) if (set.has(j) && !seen.has(j)) { seen.add(j); q.push(j); }
      return seen.size === cells.length;
    }

    function blocks(isSea) { // 2×2 が全部海になっている所の左上マス
      const out = [];
      for (let r = 0; r < n - 1; r++) for (let c = 0; c < n - 1; c++) {
        const i = r * n + c;
        if (isSea[i] && isSea[i + 1] && isSea[i + n] && isSea[i + n + 1]) out.push(i);
      }
      return out;
    }

    function generate() {
      for (;;) {
        const isl = Array(n * n).fill(-1); // 島の番号。-1 は海
        const size = [];
        let ok = false;
        for (let guard = 0; guard < 600; guard++) {
          const isSea = isl.map(v => v < 0);
          const bl = blocks(isSea);
          if (!bl.length) { ok = true; break; }
          let c, id;
          if (size.length && Math.random() < 0.6) { // 島を1マス広げる
            id = Math.floor(Math.random() * size.length);
            const opts = isl.map((v, i) => (v < 0 && adj(i).some(k => isl[k] === id) && adj(i).every(k => isl[k] < 0 || isl[k] === id) ? i : -1)).filter(i => i >= 0);
            if (!opts.length || size[id] >= 6) continue;
            c = opts[Math.floor(Math.random() * opts.length)];
          } else { // 2×2 の海の中に、島を置く(または、となりの島を広げる)
            const b = bl[Math.floor(Math.random() * bl.length)];
            c = b + [0, 1, n, n + 1][Math.floor(Math.random() * 4)];
            const ids = [...new Set(adj(c).map(k => isl[k]).filter(v => v >= 0))];
            if (ids.length > 1 || (ids.length === 1 && size[ids[0]] >= 6)) continue;
            id = ids.length ? ids[0] : size.length;
          }
          isl[c] = id;
          if (!connected(isl.map((v, i) => (v < 0 ? i : -1)).filter(i => i >= 0))) { isl[c] = -1; continue; }
          size[id] = (size[id] || 0) + 1;
        }
        if (!ok || size.length < 2) continue;
        num = Array(n * n).fill(0);
        size.forEach((s, id) => {
          const cells = isl.map((v, i) => (v === id ? i : -1)).filter(i => i >= 0);
          num[cells[Math.floor(Math.random() * cells.length)]] = s;
        });
        return;
      }
    }

    root.innerHTML = `
      <div class="row" id="nk-sizes">
        ${[5, 6, 7].map(s => `<button class="btn" data-size="${s}">${s}×${s}</button>`).join('')}
        <button class="btn primary" id="nk-new">新しい問題</button>
      </div>
      <div class="stats">
        <div><small>できた島</small><b id="nk-count">0</b></div>
        <div><small>時間</small><b id="nk-time">0:00</b></div>
        <div><small>ベスト時間</small><b id="nk-best">-</b></div>
      </div>
      <div class="row"><button class="btn" id="nk-clear">全部もどす</button></div>
      <div class="nk-board" id="nk-board"></div>
      <p class="msg" id="nk-msg"></p>
      <p class="note">マスをタップすると 海(黒)→ ・(島と決めた目印)→ 白 の順に変わります。白と ・ はどちらも島として数えます。<br>①<b>数字は島の大きさ</b>(マスの数)。島1つに数字は1つだけ。ぴったりの島は数字が緑になります。<br>②島どうしは、たて・よこにくっつけません(あいだを海で区切る)。<br>③<b>海は全部ひとつながり</b>。④海に <b>2×2 のかたまり</b>を作ってはいけません(赤くなります)。<br>答えは1つとは限りません。</p>`;

    const $ = id => root.querySelector('#' + id);
    const board = $('nk-board');
    const timer = api.timer($('nk-time'));

    function showBest() {
      const b = api.load('best' + n, null);
      $('nk-best').textContent = b === null ? '-' : api.fmtTime(b);
    }

    function paint() {
      const isSea = st.map(s => s === 1);
      const bad = new Set();
      blocks(isSea).forEach(i => [i, i + 1, i + n, i + n + 1].forEach(k => bad.add(k)));
      // 島(白マスのかたまり)ごとに、大きさと数字を調べる
      const comp = Array(n * n).fill(-1), okNum = new Set();
      let islandsOk = true, total = 0;
      for (let s = 0; s < n * n; s++) {
        if (isSea[s] || comp[s] >= 0) continue;
        const cells = [s];
        comp[s] = s;
        for (let k = 0; k < cells.length; k++) for (const j of adj(cells[k])) if (!isSea[j] && comp[j] < 0) { comp[j] = s; cells.push(j); }
        const nums = cells.filter(c => num[c]);
        if (nums.length === 1 && num[nums[0]] === cells.length) okNum.add(nums[0]); else islandsOk = false;
      }
      num.forEach(v => { if (v) total++; });
      cellEls.forEach((el, i) => {
        el.className = 'nk-cell' + (isSea[i] ? ' sea' : '') + (bad.has(i) ? ' bad' : '') + (num[i] ? ' num' : '') + (okNum.has(i) ? ' ok' : '');
        if (!num[i]) el.textContent = st[i] === 2 ? '・' : '';
      });
      $('nk-count').textContent = `${okNum.size} / ${total}`;
      const sea = isSea.map((b, i) => (b ? i : -1)).filter(i => i >= 0);
      const seaOk = connected(sea);
      $('nk-msg').textContent = islandsOk && !bad.size && sea.length && !seaOk ? '島は全部できていますが、海がひとつながりになっていません' : '';
      return islandsOk && !bad.size && seaOk;
    }

    function newGame() {
      generate();
      st = Array(n * n).fill(0);
      done = false;
      board.style.setProperty('--n', n);
      board.innerHTML = num.map((v, i) => v ? `<span class="nk-cell num">${v}</span>` : `<button class="nk-cell" data-i="${i}"></button>`).join('');
      cellEls = [...board.children];
      root.querySelectorAll('[data-size]').forEach(b => b.classList.toggle('on', +b.dataset.size === n));
      timer.reset();
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
        $('nk-msg').textContent = `🎉 クリア! ${api.fmtTime(time)}` + (isNew ? '(新記録)' : '');
      }
    });
    $('nk-clear').addEventListener('click', () => { if (!done) { st.fill(0); paint(); } });
    $('nk-sizes').addEventListener('click', e => {
      const s = e.target.dataset.size;
      if (s) { n = +s; api.save('size', n); }
      if (s || e.target.id === 'nk-new') newGame();
    });
    newGame();

    return () => timer.reset();
  },
});

// 橋をかけろ(島を橋でつなぐ。島の数字 = その島から出る橋の本数)
// isl = 島 [{pos, num}] / edges = 橋をかけられる島の組 [{a, b, horiz, cells(間のマス)}] / val[e] = その組の橋の本数(0〜2)
// ルール:橋はたて・よこだけ。同じ組に2本まで。橋どうしは交差できない。最後に全部の島がつながっていること。
// 問題は自動で作る:島を1つずつ橋でのばして正しい形を作る → 数字を付ける → 総当たりで答えが1つか確認。
'use strict';

registerPuzzle({
  id: 'hashi',
  name: '橋をかけろ',
  icon: '🌉',
  desc: '島の数字の本数だけ橋をかけて、全部の島をつなごう',

  start(root, api) {
    const LEVELS = { 7: 8, 9: 12, 11: 16 }; // 盤面の大きさ → 島の数
    let n = api.load('size', 7);
    if (!LEVELS[n]) n = 7;
    let isl, edges, cross, val, done;

    function buildEdges() {
      const at = new Map(isl.map((s, k) => [s.pos, k]));
      edges = [];
      isl.forEach((s, a) => {
        for (const [step, horiz] of [[1, true], [n, false]]) { // 右と下にだけ探す(重複しないように)
          const cells = [];
          for (let p = s.pos + step; p < n * n && (!horiz || Math.floor(p / n) === Math.floor(s.pos / n)); p += step) {
            if (at.has(p)) { if (cells.length) edges.push({ a, b: at.get(p), horiz, cells }); break; }
            cells.push(p);
          }
        }
      });
      cross = edges.map((e, i) => edges.map((f, j) => (i !== j && e.horiz !== f.horiz && e.cells.some(c => f.cells.includes(c)) ? j : -1)).filter(j => j >= 0));
    }

    function connected(v) {
      const seen = new Set([0]), q = [0];
      for (let k = 0; k < q.length; k++) {
        edges.forEach((e, i) => {
          if (!v[i]) return;
          const o = e.a === q[k] ? e.b : e.b === q[k] ? e.a : -1;
          if (o >= 0 && !seen.has(o)) { seen.add(o); q.push(o); }
        });
      }
      return seen.size === isl.length;
    }

    function countSolutions(limit) {
      const v = Array(edges.length).fill(0), sum = isl.map(() => 0);
      // room[島] = まだ決めていない橋の組で、最大あと何本かけられるか
      const room = isl.map((_, k) => edges.filter(e => e.a === k || e.b === k).length * 2);
      let count = 0, steps = 0;
      (function rec(i) {
        if (count >= limit || ++steps > 400000) return;
        if (i === edges.length) { if (connected(v)) count++; return; }
        const { a, b } = edges[i];
        room[a] -= 2; room[b] -= 2;
        for (let x = 0; x <= 2; x++) {
          if (x && cross[i].some(j => v[j])) break;
          if (sum[a] + x > isl[a].num || sum[b] + x > isl[b].num) break;
          if (sum[a] + x + room[a] < isl[a].num || sum[b] + x + room[b] < isl[b].num) continue;
          v[i] = x; sum[a] += x; sum[b] += x;
          rec(i + 1);
          v[i] = 0; sum[a] -= x; sum[b] -= x;
        }
        room[a] += 2; room[b] += 2;
      })(0);
      return steps > 400000 ? 2 : count;
    }

    function generate() {
      const want = LEVELS[n];
      for (let attempt = 0; ; attempt++) {
        const occ = Array(n * n).fill(0); // 0=空 1=島 2=橋
        const first = Math.floor(Math.random() * n * n);
        occ[first] = 1;
        const list = [first], deg = { [first]: 0 };
        for (let tries = 0; list.length < want && tries < 600; tries++) {
          const from = list[Math.floor(Math.random() * list.length)];
          const [dx, dy] = [[1, 0], [-1, 0], [0, 1], [0, -1]][Math.floor(Math.random() * 4)];
          const len = 2 + Math.floor(Math.random() * 3);
          const x = from % n + dx * len, y = Math.floor(from / n) + dy * len;
          if (x < 0 || y < 0 || x >= n || y >= n) continue;
          const t = y * n + x, between = [];
          for (let k = 1; k < len; k++) between.push(from + (dx + dy * n) * k);
          if (occ[t] || between.some(c => occ[c])) continue;
          // 新しい島が、ほかの島のすぐとなりにならないようにする
          if ([x > 0 ? t - 1 : -1, x < n - 1 ? t + 1 : -1, t - n, t + n].some(k => k >= 0 && k < n * n && occ[k] === 1)) continue;
          between.forEach(c => { occ[c] = 2; });
          occ[t] = 1;
          const bridges = Math.random() < 0.4 ? 2 : 1;
          deg[from] += bridges;
          deg[t] = bridges;
          list.push(t);
        }
        if (list.length < want) continue;
        isl = list.sort((a, b) => a - b).map(pos => ({ pos, num: deg[pos] }));
        buildEdges();
        if (countSolutions(2) === 1 || attempt > 400) return;
      }
    }

    root.innerHTML = `
      <div class="row" id="hs-sizes">
        ${Object.keys(LEVELS).map(s => `<button class="btn" data-size="${s}">${s}×${s}</button>`).join('')}
        <button class="btn primary" id="hs-new">新しい問題</button>
      </div>
      <div class="stats">
        <div><small>できた島</small><b id="hs-count">0</b></div>
        <div><small>時間</small><b id="hs-time">0:00</b></div>
        <div><small>ベスト時間</small><b id="hs-best">-</b></div>
      </div>
      <div class="row"><button class="btn" id="hs-clear">橋を全部消す</button></div>
      <div class="hs-board" id="hs-board"></div>
      <p class="msg" id="hs-msg"></p>
      <p class="note">島と島のあいだをタップする(または島から橋をかけたい方向へスワイプする)と、橋が 1本 → 2本 → なし の順に変わります。<br><b>島の数字 = その島から出る橋の合計本数</b>。ぴったりになった島は緑、多すぎると赤になります。<br>橋はたて・よこだけで、交差はできません。全部の島がぴったりになり、<b>全部がひとつながり</b>になればクリア。</p>`;

    const $ = id => root.querySelector('#' + id);
    const board = $('hs-board');
    const timer = api.timer($('hs-time'));

    function showBest() {
      const b = api.load('best' + n, null);
      $('hs-best').textContent = b === null ? '-' : api.fmtTime(b);
    }

    function paint() {
      board.querySelectorAll('[data-e]').forEach(el => {
        el.innerHTML = '<i></i>'.repeat(val[+el.dataset.e]);
      });
      let good = 0;
      board.querySelectorAll('[data-k]').forEach(el => {
        const k = +el.dataset.k;
        const d = edges.reduce((s, e, i) => s + (e.a === k || e.b === k ? val[i] : 0), 0);
        el.className = 'hs-isl' + (d === isl[k].num ? ' ok' : d > isl[k].num ? ' bad' : '');
        if (d === isl[k].num) good++;
      });
      $('hs-count').textContent = `${good} / ${isl.length}`;
      return good === isl.length;
    }

    function newGame() {
      generate();
      val = Array(edges.length).fill(0);
      done = false;
      const pct = v => v / n * 100 + '%';
      board.innerHTML = edges.map((e, i) => {
        const a = isl[e.a].pos, len = e.cells.length + 1;
        const x = a % n, y = Math.floor(a / n);
        return e.horiz
          ? `<button class="hs-edge h" data-e="${i}" style="left:${pct(x + 0.5)};top:${pct(y + 0.2)};width:${pct(len)};height:${pct(0.6)}" aria-label="橋"></button>`
          : `<button class="hs-edge v" data-e="${i}" style="left:${pct(x + 0.2)};top:${pct(y + 0.5)};width:${pct(0.6)};height:${pct(len)}" aria-label="橋"></button>`;
      }).join('') + isl.map((s, k) =>
        `<span class="hs-isl" data-k="${k}" style="left:${pct(s.pos % n + 0.09)};top:${pct(Math.floor(s.pos / n) + 0.09)};width:${pct(0.82)};height:${pct(0.82)}">${s.num}</span>`).join('');
      board.style.setProperty('--n', n);
      root.querySelectorAll('[data-size]').forEach(b => b.classList.toggle('on', +b.dataset.size === n));
      timer.reset();
      $('hs-msg').textContent = '';
      showBest();
      paint();
    }

    function cycle(i) {
      if (done || i < 0) return;
      if (!val[i] && cross[i].some(j => val[j])) { $('hs-msg').textContent = '橋は交差できません'; return; }
      $('hs-msg').textContent = '';
      val[i] = (val[i] + 1) % 3;
      timer.start();
      if (!paint()) return;
      if (!connected(val)) { $('hs-msg').textContent = '数字は全部合っていますが、島がひとつながりになっていません'; return; }
      done = true;
      const time = timer.stop();
      const old = api.load('best' + n, null);
      const isNew = old === null || time < old;
      if (isNew) api.save('best' + n, time);
      showBest();
      $('hs-msg').textContent = `🎉 クリア! ${api.fmtTime(time)}` + (isNew ? '(新記録)' : '');
    }

    // 島からのスワイプ:その方向にある一番近い島との橋を切り替える
    let down = null;
    board.addEventListener('pointerdown', e => {
      const el = e.target.closest('[data-k]');
      down = el ? { k: +el.dataset.k, x: e.clientX, y: e.clientY } : null;
    });
    board.addEventListener('pointerup', e => {
      if (!down) return;
      const { k } = down, dx = e.clientX - down.x, dy = e.clientY - down.y;
      down = null;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 14) return;
      const horiz = Math.abs(dx) > Math.abs(dy), forward = (horiz ? dx : dy) > 0;
      cycle(edges.findIndex(ed => ed.horiz === horiz && (forward ? ed.a === k : ed.b === k)));
    });
    board.addEventListener('click', e => {
      const el = e.target.closest('[data-e]');
      if (el) cycle(+el.dataset.e);
    });
    $('hs-clear').addEventListener('click', () => { if (!done) { val.fill(0); $('hs-msg').textContent = ''; paint(); } });
    $('hs-sizes').addEventListener('click', e => {
      const s = e.target.dataset.size;
      if (s) { n = +s; api.save('size', n); }
      if (s || e.target.id === 'hs-new') newGame();
    });
    newGame();

    return () => timer.reset();
  },
});

// スリザーリンク(点と点を線でつないで、1本の輪っかを作る)
// マスは n×n。線を引ける場所(辺)は、横向きが (n+1)×n 本、縦向きが n×(n+1) 本。
// H[r*n + c] = r 行目の上側の横線(r は 0〜n)/ V[r*(n+1) + c] = c 列目の左側の縦線(c は 0〜n)。値: 0=なし 1=線 2=✕(引かない目印)
// clue[マス] = そのマスのまわり4辺のうち線になる本数(-1 はヒントなし)。
// 問題は自動で作る:「内側」のマスのかたまりを広げていき(穴や角だけの接触を作らない)、その境目を輪っかにする。
// 答えは1つとは限らないので、ヒントを全部満たす1本の輪っかができていればクリアとする。
'use strict';

registerPuzzle({
  id: 'slither',
  name: 'スリザーリンク',
  icon: '⭕',
  desc: '数字をヒントに線を引いて、1本の輪っかを作ろう',

  start(root, api) {
    let n = api.load('size', 5);
    if (![5, 6, 7].includes(n)) n = 5;
    let clue, H, V, done;

    function generate() {
      for (;;) {
        const inside = Array(n * n).fill(false);
        const at = (r, c) => r >= 0 && c >= 0 && r < n && c < n && inside[r * n + c];
        const okToAdd = i => {
          const r = Math.floor(i / n), c = i % n;
          inside[i] = true;
          let ok = true;
          // 角だけでふれ合う形(ななめに内側・たてよこは外側)は、輪っかが自分にさわってしまうので作らない
          for (let dr = -1; dr <= 0 && ok; dr++) for (let dc = -1; dc <= 0; dc++) {
            const a = at(r + dr, c + dc), b = at(r + dr, c + dc + 1), d = at(r + dr + 1, c + dc), e = at(r + dr + 1, c + dc + 1);
            if ((a && e && !b && !d) || (b && d && !a && !e)) { ok = false; break; }
          }
          if (ok) { // 外側のマスが全部、盤面の外までつながっていること(穴を作らない)
            const seen = new Set(), q = [];
            for (let k = 0; k < n * n; k++) {
              const kr = Math.floor(k / n), kc = k % n;
              if (!inside[k] && (kr === 0 || kc === 0 || kr === n - 1 || kc === n - 1)) { seen.add(k); q.push(k); }
            }
            for (let k = 0; k < q.length; k++) {
              const x = q[k];
              for (const j of [x % n > 0 ? x - 1 : -1, x % n < n - 1 ? x + 1 : -1, x - n, x + n]) {
                if (j >= 0 && j < n * n && !inside[j] && !seen.has(j)) { seen.add(j); q.push(j); }
              }
            }
            ok = seen.size === inside.filter(v => !v).length;
          }
          if (!ok) inside[i] = false;
          return ok;
        };
        inside[Math.floor(Math.random() * n * n)] = true;
        const target = Math.floor(n * n * (0.45 + Math.random() * 0.15));
        for (let guard = 0, size = 1; size < target && guard < 2000; guard++) {
          const i = Math.floor(Math.random() * n * n);
          if (inside[i]) continue;
          if (![i % n > 0 ? i - 1 : -1, i % n < n - 1 ? i + 1 : -1, i - n, i + n].some(j => j >= 0 && j < n * n && inside[j])) continue;
          if (okToAdd(i)) size++;
        }
        if (inside.filter(v => v).length < target * 0.8) continue;
        clue = inside.map((v, i) => {
          const r = Math.floor(i / n), c = i % n;
          return [at(r - 1, c), at(r + 1, c), at(r, c - 1), at(r, c + 1)].filter(o => o !== v).length;
        });
        clue = clue.map(v => (Math.random() < 0.36 ? -1 : v)); // ヒントを一部かくす
        return;
      }
    }

    const edgesOf = i => { // マス i のまわりの4辺の値
      const r = Math.floor(i / n), c = i % n;
      return [H[r * n + c], H[(r + 1) * n + c], V[r * (n + 1) + c], V[r * (n + 1) + c + 1]];
    };

    function isLoop() { // 線が、枝分かれも切れ目もない1本の輪っかになっているか
      const deg = new Map(), links = [];
      const add = (a, b) => { links.push([a, b]); deg.set(a, (deg.get(a) || 0) + 1); deg.set(b, (deg.get(b) || 0) + 1); };
      const P = n + 1; // 点は (n+1)×(n+1) 個
      H.forEach((v, k) => { if (v === 1) { const r = Math.floor(k / n), c = k % n; add(r * P + c, r * P + c + 1); } });
      V.forEach((v, k) => { if (v === 1) { const r = Math.floor(k / P), c = k % P; add(r * P + c, (r + 1) * P + c); } });
      if (!links.length || [...deg.values()].some(d => d !== 2)) return false;
      const seen = new Set([links[0][0]]), q = [links[0][0]];
      for (let k = 0; k < q.length; k++) {
        for (const [a, b] of links) {
          const o = a === q[k] ? b : b === q[k] ? a : -1;
          if (o >= 0 && !seen.has(o)) { seen.add(o); q.push(o); }
        }
      }
      return seen.size === deg.size;
    }

    root.innerHTML = `
      <div class="row" id="sl-sizes">
        ${[5, 6, 7].map(s => `<button class="btn" data-size="${s}">${s}×${s}</button>`).join('')}
        <button class="btn primary" id="sl-new">新しい問題</button>
      </div>
      <div class="stats">
        <div><small>合っている数字</small><b id="sl-count">0</b></div>
        <div><small>時間</small><b id="sl-time">0:00</b></div>
        <div><small>ベスト時間</small><b id="sl-best">-</b></div>
      </div>
      <div class="row"><button class="btn" id="sl-clear">線を全部消す</button></div>
      <div class="sl-board" id="sl-board"></div>
      <p class="msg" id="sl-msg"></p>
      <p class="note">点と点のあいだをタップすると 線 → ✕(引かない目印)→ なし の順に変わります。<br><b>数字は、そのマスのまわり4辺のうち線を引く本数</b>です(ぴったりで緑、多すぎると赤)。数字のないマスは何本でもかまいません。<br>全部の数字を満たし、線が<b>枝分かれも切れ目もない1本の輪っか</b>になればクリア。答えは1つとは限りません。</p>`;

    const $ = id => root.querySelector('#' + id);
    const board = $('sl-board');
    const timer = api.timer($('sl-time'));

    function showBest() {
      const b = api.load('best' + n, null);
      $('sl-best').textContent = b === null ? '-' : api.fmtTime(b);
    }

    function paint() {
      board.querySelectorAll('[data-h]').forEach(el => { el.dataset.v = H[+el.dataset.h]; });
      board.querySelectorAll('[data-vv]').forEach(el => { el.dataset.v = V[+el.dataset.vv]; });
      let good = 0, total = 0;
      board.querySelectorAll('[data-cell]').forEach(el => {
        const i = +el.dataset.cell;
        if (clue[i] < 0) return;
        total++;
        const c = edgesOf(i).filter(v => v === 1).length;
        el.className = 'sl-cell' + (c === clue[i] ? ' ok' : c > clue[i] ? ' bad' : '');
        if (c === clue[i]) good++;
      });
      $('sl-count').textContent = `${good} / ${total}`;
      return good === total;
    }

    function newGame() {
      generate();
      H = Array((n + 1) * n).fill(0);
      V = Array(n * (n + 1)).fill(0);
      done = false;
      // (2n+1)×(2n+1) の格子:点・横線・点… / 縦線・マス・縦線…
      let html = '';
      for (let r = 0; r <= 2 * n; r++) for (let c = 0; c <= 2 * n; c++) {
        const R = r >> 1, C = c >> 1;
        if (r % 2 === 0 && c % 2 === 0) html += '<span class="sl-dot"></span>';
        else if (r % 2 === 0) html += `<button class="sl-edge h" data-h="${R * n + C}" aria-label="線"></button>`;
        else if (c % 2 === 0) html += `<button class="sl-edge v" data-vv="${R * (n + 1) + C}" aria-label="線"></button>`;
        else html += `<span class="sl-cell" data-cell="${R * n + C}">${clue[R * n + C] >= 0 ? clue[R * n + C] : ''}</span>`;
      }
      board.innerHTML = html;
      board.style.gridTemplateColumns = `repeat(${n}, 1fr 3fr) 1fr`;
      board.style.gridTemplateRows = `repeat(${n}, 1fr 3fr) 1fr`;
      board.style.setProperty('--n', n);
      root.querySelectorAll('[data-size]').forEach(b => b.classList.toggle('on', +b.dataset.size === n));
      timer.reset();
      $('sl-msg').textContent = '';
      showBest();
      paint();
    }

    board.addEventListener('click', e => {
      const el = e.target.closest('.sl-edge');
      if (!el || done) return;
      if (el.dataset.h !== undefined) H[+el.dataset.h] = (H[+el.dataset.h] + 1) % 3;
      else V[+el.dataset.vv] = (V[+el.dataset.vv] + 1) % 3;
      timer.start();
      $('sl-msg').textContent = '';
      if (!paint()) return;
      if (!isLoop()) { $('sl-msg').textContent = '数字は全部合っていますが、線が1本の輪っかになっていません'; return; }
      done = true;
      const time = timer.stop();
      const old = api.load('best' + n, null);
      const isNew = old === null || time < old;
      if (isNew) api.save('best' + n, time);
      showBest();
      $('sl-msg').textContent = `🎉 クリア! ${api.fmtTime(time)}` + (isNew ? '(新記録)' : '');
    });
    $('sl-clear').addEventListener('click', () => { if (!done) { H.fill(0); V.fill(0); $('sl-msg').textContent = ''; paint(); } });
    $('sl-sizes').addEventListener('click', e => {
      const s = e.target.dataset.size;
      if (s) { n = +s; api.save('size', n); }
      if (s || e.target.id === 'sl-new') newGame();
    });
    newGame();

    return () => timer.reset();
  },
});

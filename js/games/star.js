// スターバトル(各行・各列・各ブロックに星を1つずつ。星どうしはななめにもとなり合えない)
// region[位置]=ブロック番号 / st[位置]: 0=なし 1=星 2=・(置かない目印)
// 問題は自動で作る:正しい星の置き方を先に作る → 各星からブロックを広げる → 総当たりで答えが1つか確認。
'use strict';

registerPuzzle({
  id: 'star',
  name: 'スターバトル',
  icon: '⭐',
  desc: '各行・各列・各ブロックに星を1つずつ置こう',

  start(root, api) {
    let n = api.load('size', 5);
    if (![5, 6, 8].includes(n)) n = 5;
    let region, st, done;
    let cellEls = [];

    function countSolutions(limit) {
      let count = 0;
      (function rec(r, cols, regs, prev) {
        if (count >= limit) return;
        if (r === n) { count++; return; }
        for (let c = 0; c < n; c++) {
          const g = region[r * n + c];
          if (cols >> c & 1 || regs >> g & 1 || Math.abs(c - prev) < 2) continue;
          rec(r + 1, cols | 1 << c, regs | 1 << g, c);
        }
      })(0, 0, 0, -9);
      return count;
    }

    function generate() {
      for (;;) {
        // 星の置き方:各行1つ、列もばらばら、上下の行で列が2以上はなれる
        const p = [];
        (function place(r) {
          if (r === n) return true;
          const opts = [...Array(n).keys()].filter(c => !p.includes(c) && (r === 0 || Math.abs(c - p[r - 1]) >= 2)).sort(() => Math.random() - 0.5);
          for (const c of opts) { p[r] = c; if (place(r + 1)) return true; }
          p.length = r;
          return false;
        })(0);
        if (p.length < n) continue;
        // ブロック:星のマスから、となりの空きマスへランダムに広げる
        region = Array(n * n).fill(-1);
        p.forEach((c, r) => { region[r * n + c] = r; });
        for (let left = n * n - n; left > 0;) {
          const i = Math.floor(Math.random() * n * n);
          if (region[i] < 0) continue;
          const opts = [i % n > 0 ? i - 1 : -1, i % n < n - 1 ? i + 1 : -1, i - n, i + n].filter(k => k >= 0 && k < n * n && region[k] < 0);
          if (!opts.length) continue;
          region[opts[Math.floor(Math.random() * opts.length)]] = region[i];
          left--;
        }
        if (countSolutions(2) === 1) return;
      }
    }

    root.innerHTML = `
      <div class="row" id="st-sizes">
        ${[5, 6, 8].map(s => `<button class="btn" data-size="${s}">${s}×${s}</button>`).join('')}
        <button class="btn primary" id="st-new">新しい問題</button>
      </div>
      <div class="stats">
        <div><small>置いた星</small><b id="st-count">0</b></div>
        <div><small>時間</small><b id="st-time">0:00</b></div>
        <div><small>ベスト時間</small><b id="st-best">-</b></div>
      </div>
      <div class="row"><button class="btn" id="st-clear">全部消す</button></div>
      <div class="st-board" id="st-board"></div>
      <p class="msg" id="st-msg"></p>
      <p class="note">マスをタップすると ★ → ・(置かない目印)→ 空 の順に変わります。<br><b>各行・各列・太線で囲まれた各ブロック(色分け)に、星を1つずつ</b>置けばクリア。<br>星どうしは、たて・よこ・<b>ななめ</b>でもとなり合えません。ルールに合わない星は赤くなります。</p>`;

    const $ = id => root.querySelector('#' + id);
    const board = $('st-board');
    const timer = api.timer($('st-time'));

    function showBest() {
      const b = api.load('best' + n, null);
      $('st-best').textContent = b === null ? '-' : api.fmtTime(b);
    }

    function paint() {
      const stars = st.map((s, i) => (s === 1 ? i : -1)).filter(i => i >= 0);
      let ok = stars.length === n;
      cellEls.forEach((el, i) => {
        const x = i % n, y = Math.floor(i / n);
        const bad = st[i] === 1 && stars.some(j => j !== i && (j % n === x || Math.floor(j / n) === y || region[j] === region[i]
          || (Math.abs(j % n - x) <= 1 && Math.abs(Math.floor(j / n) - y) <= 1)));
        if (bad) ok = false;
        el.classList.toggle('bad', bad);
        el.textContent = st[i] === 1 ? '★' : st[i] === 2 ? '・' : '';
      });
      $('st-count').textContent = `${stars.length} / ${n}`;
      return ok;
    }

    function newGame() {
      generate();
      st = Array(n * n).fill(0);
      done = false;
      board.style.setProperty('--n', n);
      board.innerHTML = region.map((g, i) => {
        const r = Math.floor(i / n), c = i % n;
        const cls = (c < n - 1 && region[i + 1] !== g ? ' br' : '') + (r < n - 1 && region[i + n] !== g ? ' bb' : '');
        return `<button class="st-cell${cls}" data-i="${i}" style="background:hsl(${Math.round(g * 360 / n)} 65% 55% / .22)"></button>`;
      }).join('');
      cellEls = [...board.children];
      root.querySelectorAll('[data-size]').forEach(b => b.classList.toggle('on', +b.dataset.size === n));
      timer.reset();
      $('st-msg').textContent = '';
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
        $('st-msg').textContent = `🎉 クリア! ${api.fmtTime(time)}` + (isNew ? '(新記録)' : '');
      }
    });
    $('st-clear').addEventListener('click', () => { if (!done) { st.fill(0); paint(); } });
    $('st-sizes').addEventListener('click', e => {
      const s = e.target.dataset.size;
      if (s) { n = +s; api.save('size', n); }
      if (s || e.target.id === 'st-new') newGame();
    });
    newGame();

    return () => timer.reset();
  },
});

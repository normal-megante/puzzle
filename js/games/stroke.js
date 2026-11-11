// 一筆書き と 色が混ざる一筆書き(オリジナル)。1ファイルで2つ登録する。
// 共通:スタートから、となりのマスへ線をのばし、全部のマスを1回ずつ通る。
// 色つき:絵の具マスを通ると筆の色が混ざる(赤1・黄2・青4 のビットの足し合わせ)。水マス💧で白に戻る。
//         最後は 🏁 のマスで、筆が目標の色になっていればクリア。
// 問題はその場で作る:ランダムな一筆書きの道を先に作り、通らなかったマスを壁にする(必ず解ける)。
'use strict';

(() => {
  const NAMES = ['白', '赤', '黄', 'オレンジ', '青', '紫', '緑', '黒'];
  const HEX = ['#b9bfd0', '#e5484d', '#e0b000', '#f08a24', '#3b7dd8', '#8e5bd6', '#2fa66a', '#3a3a3a'];
  const WASH = 8;
  const mix = (c, item) => (item === WASH ? 0 : c | item);

  function make({ id, name, icon, desc, color, levels, note }) {
    registerPuzzle({
      id, name, icon, desc,
      start(root, api) {
        let lv = api.load('level', 'easy');
        if (!levels[lv]) lv = 'easy';
        let w, open, item, startPos, goal, target, path, done, openCount;

        root.innerHTML = `
          <div class="row" id="o-levels">
            ${Object.entries(levels).map(([k, v]) => `<button class="btn" data-level="${k}">${v.name}</button>`).join('')}
          </div>
          <div class="row">
            <button class="btn" id="o-undo">1手戻す</button>
            <button class="btn" id="o-retry">最初から</button>
            <button class="btn primary" id="o-new">新しい問題</button>
          </div>
          <div class="stats">
            <div><small>残りのマス</small><b id="o-left">0</b></div>
            ${color ? '<div><small>今の筆の色</small><b id="o-cur"></b></div><div><small>目標の色</small><b id="o-target"></b></div>' : ''}
            <div><small>クリアした数</small><b id="o-clears">0</b></div>
          </div>
          <div class="o-board" id="o-board"></div>
          <p class="msg" id="o-msg"></p>
          <p class="note">${note}<br>となりのマスをタップするか、指でなぞると線がのびます。通ったマスをタップすると、そこまで戻れます。</p>`;

        const $ = x => root.querySelector('#' + x);
        const board = $('o-board');
        const swatch = c => `<span class="o-sw" style="background:${HEX[c]}"></span>${NAMES[c]}`;

        const nbrs = i => {
          const out = [];
          if (i % w > 0) out.push(i - 1);
          if (i % w < w - 1) out.push(i + 1);
          if (i >= w) out.push(i - w);
          if (i < w * (w - 1)) out.push(i + w);
          return out;
        };
        const brush = upto => path.slice(0, upto + 1).reduce((c, p) => mix(c, item[p]), 0);

        function randomPath() {
          const want = w * w - Math.floor(Math.random() * 3);
          for (;;) {
            const seen = new Set();
            let cur = Math.floor(Math.random() * w * w);
            const p = [cur];
            seen.add(cur);
            while (p.length < want) {
              const ns = nbrs(cur).filter(n => !seen.has(n));
              if (!ns.length) break;
              // 行き止まりを作りにくいよう、先の選択肢が少ないマスを優先(少しランダム)
              const score = n => nbrs(n).filter(m => !seen.has(m)).length + Math.random() * 1.2;
              cur = ns.map(n => [score(n), n]).sort((a, b) => a[0] - b[0])[0][1];
              p.push(cur);
              seen.add(cur);
            }
            if (p.length >= want) return p;
          }
        }

        // 色つき用:全部の一筆書きのうち、目標の色になる割合(多すぎると簡単すぎる)
        function matchRatio() {
          let steps = 0, total = 0, match = 0;
          const seen = new Uint8Array(w * w);
          (function dfs(cur, len, c) {
            if (++steps > 200000) return;
            c = mix(c, item[cur]);
            if (cur === goal) {
              if (len === openCount) { total++; if (c === target) match++; }
              return;
            }
            seen[cur] = 1;
            for (const n of nbrs(cur)) if (open[n] && !seen[n]) dfs(n, len + 1, c);
            seen[cur] = 0;
          })(startPos, 1, 0);
          return steps > 200000 || !total ? 0 : match / total;
        }

        function generate() {
          w = levels[lv].size;
          for (let attempt = 0; ; attempt++) {
            const p = randomPath();
            open = Array(w * w).fill(false);
            p.forEach(i => { open[i] = true; });
            openCount = p.length;
            startPos = p[0];
            goal = p[p.length - 1];
            item = Array(w * w).fill(0);
            if (!color) return;
            const spots = p.slice(1, -1).sort(() => Math.random() - 0.5);
            const bits = [1, 2, 4].sort(() => Math.random() - 0.5);
            for (let k = 0; k < levels[lv].paints; k++) item[spots[k]] = bits[k % 3];
            for (let k = 0; k < levels[lv].washes; k++) item[spots[levels[lv].paints + k]] = WASH;
            target = p.reduce((c, i) => mix(c, item[i]), 0);
            if (target && (attempt > 40 || matchRatio() <= 0.5)) return;
          }
        }

        function paint() {
          const head = path[path.length - 1];
          const xy = i => `${i % w + 0.5} ${Math.floor(i / w) + 0.5}`;
          let svg = '';
          for (let k = 1; k < path.length; k++) {
            svg += `<path d="M${xy(path[k - 1])} L${xy(path[k])}" stroke="${color ? HEX[brush(k)] : 'var(--accent)'}"/>`;
          }
          const hc = color ? HEX[brush(path.length - 1)] : 'var(--accent)';
          svg += `<circle cx="${head % w + 0.5}" cy="${Math.floor(head / w) + 0.5}" r=".3" fill="${hc}" stroke="var(--text)" stroke-width=".05"/>`;
          board.querySelector('svg').innerHTML = svg;
          board.querySelectorAll('[data-i]').forEach(el => {
            el.classList.toggle('visited', path.includes(+el.dataset.i));
          });
          $('o-left').textContent = openCount - path.length;
          if (color) $('o-cur').innerHTML = swatch(brush(path.length - 1));
          $('o-undo').disabled = path.length < 2 || done;
        }

        function reset() {
          path = [startPos];
          done = false;
          $('o-msg').textContent = '';
          paint();
        }

        function newGame() {
          generate();
          board.style.setProperty('--w', w);
          board.innerHTML = open.map((o, i) => {
            let inner = '';
            if (item[i] === WASH) inner = '💧';
            else if (item[i]) inner = `<span class="o-paint" style="background:${HEX[item[i]]}">${NAMES[item[i]]}</span>`;
            else if (color && i === goal) inner = `<span class="o-goal" style="border-color:${HEX[target]}">🏁</span>`;
            else if (i === startPos) inner = '<span class="o-start">S</span>';
            return `<span class="o-cell${o ? '' : ' wall'}" data-i="${i}">${inner}</span>`;
          }).join('') + `<svg viewBox="0 0 ${w} ${w}" aria-hidden="true"></svg>`;
          root.querySelectorAll('[data-level]').forEach(b => b.classList.toggle('on', b.dataset.level === lv));
          if (color) $('o-target').innerHTML = swatch(target);
          $('o-clears').textContent = api.load('clears_' + lv, 0);
          reset();
        }

        function check() {
          if (path.length < openCount) { $('o-msg').textContent = ''; return; }
          const head = path[path.length - 1], c = brush(path.length - 1);
          if (color && head !== goal) { $('o-msg').textContent = '最後は 🏁 のマスで終わる必要があります'; return; }
          if (color && c !== target) { $('o-msg').textContent = `色がちがいます(今:${NAMES[c]} / 目標:${NAMES[target]})`; return; }
          done = true;
          const clears = api.load('clears_' + lv, 0) + 1;
          api.save('clears_' + lv, clears);
          $('o-clears').textContent = clears;
          $('o-msg').textContent = '🎉 クリア!';
        }

        // tap=true のときだけ、途中のマスまで一気に戻れる(なぞっている最中の誤操作を防ぐ)
        function handle(i, tap) {
          if (done || i < 0 || !open[i]) return;
          const head = path[path.length - 1];
          const k = path.indexOf(i);
          if (k >= 0) {
            if (k < path.length - 1 && (tap || k === path.length - 2)) { path.length = k + 1; paint(); check(); }
            return;
          }
          if (Math.abs(i % w - head % w) + Math.abs(Math.floor(i / w) - Math.floor(head / w)) !== 1) return;
          path.push(i);
          check();
          paint();
        }

        let drag = false;
        const cellAt = e => {
          const el = document.elementFromPoint(e.clientX, e.clientY);
          const c = el && el.closest('[data-i]');
          return c && board.contains(c) ? +c.dataset.i : -1;
        };
        const stopDrag = () => { drag = false; };
        board.addEventListener('pointerdown', e => { drag = true; handle(cellAt(e), true); });
        board.addEventListener('pointermove', e => { if (drag) handle(cellAt(e), false); });
        document.addEventListener('pointerup', stopDrag);
        document.addEventListener('pointercancel', stopDrag);

        $('o-levels').addEventListener('click', e => {
          const k = e.target.dataset.level;
          if (k) { lv = k; api.save('level', lv); newGame(); }
        });
        $('o-new').addEventListener('click', newGame);
        $('o-retry').addEventListener('click', reset);
        $('o-undo').addEventListener('click', () => {
          if (done || path.length < 2) return;
          path.pop();
          paint();
          check();
        });
        newGame();

        return () => {
          document.removeEventListener('pointerup', stopDrag);
          document.removeEventListener('pointercancel', stopDrag);
        };
      },
    });
  }

  make({
    id: 'onestroke', name: '一筆書き', icon: '〰️', desc: '全部のマスを1回ずつ通る線を引こう', color: false,
    levels: { easy: { name: 'かんたん', size: 5 }, mid: { name: 'ふつう', size: 6 }, hard: { name: 'むずかしい', size: 8 } },
    note: 'S のマスから始めて、全部のマスを1回ずつ通ればクリア(暗いマスは壁)。',
  });
  make({
    id: 'colorstroke', name: '色まぜ一筆書き', icon: '🎨', desc: 'オリジナル:絵の具を混ぜながら一筆書き。目標の色でゴール', color: true,
    levels: {
      easy: { name: 'かんたん', size: 4, paints: 3, washes: 1 },
      mid: { name: 'ふつう', size: 5, paints: 4, washes: 1 },
      hard: { name: 'むずかしい', size: 6, paints: 5, washes: 2 },
    },
    note: '全部のマスを1回ずつ通り、最後に 🏁 のマスで終わります。そのとき筆が<b>目標の色</b>(🏁 の輪の色)ならクリア。<br>絵の具のマスを通ると色が混ざります:赤+青=紫、赤+黄=オレンジ、青+黄=緑、3色全部=黒。<b>💧 を通ると白に戻る</b>ので、💧 のあとに通る絵の具が大事です。',
  });
})();

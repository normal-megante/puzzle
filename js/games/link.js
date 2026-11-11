// ナンバーリンク と ワープリンク(オリジナル)。1ファイルで2つ登録する。
// 同じ数字どうしを線でつなぐ。線は交差できない。
// lines[k] = k 番のペアの線(マスの並び。どちらかの端の数字から始まる)。owner[マス] = そのマスを通っている線の番号。
// ワープ版:ワープ穴は2つで1組(warp[マス] = 相手のマス)。組になった穴どうしは「となり合っている」ものとして線を引ける。
// 問題は「盤面をすき間なく埋める線の組」を先に作り、その両端を数字にする(必ず解ける。答えは1つとは限らない)。
'use strict';

(() => {
  const COLORS = ['#e5484d', '#3b7dd8', '#2fa66a', '#e0a100', '#8e5bd6', '#1fa3a3', '#c9762a', '#b0569a', '#6b7185'];
  const WARP_COLORS = ['#111', '#b03090'];

  function make({ id, name, icon, desc, warps, note }) {
    registerPuzzle({
      id, name, icon, desc,
      start(root, api) {
        let n = api.load('size', 5);
        if (![5, 7, 9].includes(n)) n = 5;
        let ends, endOf, warp, lines, owner, active = -1, done;

        root.innerHTML = `
          <div class="row" id="w-sizes">
            ${[5, 7, 9].map(s => `<button class="btn" data-size="${s}">${s}×${s}</button>`).join('')}
            <button class="btn primary" id="w-new">新しい問題</button>
          </div>
          <div class="stats">
            <div><small>つないだ数</small><b id="w-count">0</b></div>
            <div><small>時間</small><b id="w-time">0:00</b></div>
            <div><small>ベスト時間</small><b id="w-best">-</b></div>
          </div>
          <div class="row"><button class="btn" id="w-clear">線を全部消す</button></div>
          <div class="w-board" id="w-board"></div>
          <p class="msg" id="w-msg"></p>
          <p class="note">${note}数字のマスから指でなぞって、同じ数字までつなぎます。線どうしは交差できず、ほかの数字の上も通れません。<br>なぞった線を戻ると短くなります。数字のマスを触り直すと、その数字の線を引き直せます。全部の数字をつなげばクリア。</p>`;

        const $ = x => root.querySelector('#' + x);
        const board = $('w-board');
        const timer = api.timer($('w-time'));

        const nbrs = i => {
          const out = [];
          if (i % n > 0) out.push(i - 1);
          if (i % n < n - 1) out.push(i + 1);
          if (i >= n) out.push(i - n);
          if (i < n * (n - 1)) out.push(i + n);
          if (warp[i] >= 0) out.push(warp[i]);
          return out;
        };

        function generate() {
          for (let attempt = 0; ; attempt++) {
            warp = Array(n * n).fill(-1);
            const count = warps ? (n > 5 ? 2 : 1) : 0;
            while (warp.filter(w => w >= 0).length < count * 2) {
              const a = Math.floor(Math.random() * n * n), b = Math.floor(Math.random() * n * n);
              const far = Math.abs(a % n - b % n) + Math.abs(Math.floor(a / n) - Math.floor(b / n)) >= 3;
              if (far && warp[a] < 0 && warp[b] < 0) { warp[a] = b; warp[b] = a; }
            }
            // 最初は「横一列ずつの線」。線の端を、となりの線の端のマスへ1マスずつのばす(相手は1マス縮む)のをくり返して形をくずす。
            const paths = Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => r * n + c));
            const own = Array.from({ length: n * n }, (_, i) => Math.floor(i / n));
            for (let it = 0; it < n * n * 60; it++) {
              const pi = Math.floor(Math.random() * n), P = paths[pi];
              const tail = Math.random() < 0.5;
              const e = tail ? P[P.length - 1] : P[0];
              const cands = nbrs(e).filter(c => {
                const Q = paths[own[c]];
                if (own[c] === pi || Q.length <= 3 || (Q[0] !== c && Q[Q.length - 1] !== c)) return false;
                return nbrs(c).every(x => x === e || own[x] !== pi); // 自分の線に横からくっつく形は作らない
              });
              if (!cands.length) continue;
              const c = cands[Math.floor(Math.random() * cands.length)];
              const Q = paths[own[c]];
              if (Q[0] === c) Q.shift(); else Q.pop();
              if (tail) P.push(c); else P.unshift(c);
              own[c] = pi;
            }
            ends = paths.map(p => [p[0], p[p.length - 1]]);
            endOf = Array(n * n).fill(-1);
            ends.forEach(([a, b], k) => { endOf[a] = k; endOf[b] = k; });
            if (!warps) return;
            // ワープ版:穴が数字のマスと重ならず、答えの線がどの組のワープも実際に通っている問題だけ採用する
            const used = new Set();
            paths.forEach(p => p.forEach((c, k) => { if (k && warp[c] === p[k - 1]) used.add(Math.min(c, p[k - 1])); }));
            const clash = warp.some((w, i) => w >= 0 && endOf[i] >= 0);
            if ((!clash && used.size === count) || attempt > 3000) return;
          }
        }

        const complete = k => lines[k].length > 1 && endOf[lines[k][lines[k].length - 1]] === k;

        function showBest() {
          const b = api.load('best' + n, null);
          $('w-best').textContent = b === null ? '-' : api.fmtTime(b);
        }

        function paint() {
          const xy = i => `${i % n + 0.5} ${Math.floor(i / n) + 0.5}`;
          board.querySelector('svg').innerHTML = lines.map((l, k) => l.length < 2 ? ''
            // ワープした所では線を切る(M で新しく書き始める)
            : `<path d="${l.map((c, j) => (j === 0 || warp[c] === l[j - 1] ? 'M' : 'L') + xy(c)).join(' ')}" stroke="${COLORS[k]}"/>`).join('');
          board.querySelectorAll('[data-i]').forEach(el => {
            const i = +el.dataset.i, k = endOf[i];
            if (k >= 0) el.firstChild.classList.toggle('ok', complete(k));
            el.classList.toggle('used', owner[i] >= 0 && k < 0);
            el.style.setProperty('--c', owner[i] >= 0 ? COLORS[owner[i]] : 'transparent');
          });
          const count = lines.filter((_, k) => complete(k)).length;
          $('w-count').textContent = `${count} / ${n}`;
          return count;
        }

        function clearLines() {
          lines = ends.map(() => []);
          owner = Array(n * n).fill(-1);
          active = -1; done = false;
          $('w-msg').textContent = '';
          paint();
        }

        function newGame() {
          generate();
          const pairs = warp.map((w, i) => (w > i ? i : -1)).filter(i => i >= 0);
          board.style.setProperty('--n', n);
          board.innerHTML = endOf.map((k, i) => {
            let inner = '';
            if (k >= 0) inner = `<b style="background:${COLORS[k]}">${k + 1}</b>`;
            else if (warp[i] >= 0) {
              const p = pairs.indexOf(Math.min(i, warp[i]));
              inner = `<u style="border-color:${WARP_COLORS[p]}">${'AB'[p]}</u>`;
            }
            return `<span class="w-cell" data-i="${i}">${inner}</span>`;
          }).join('') + `<svg viewBox="0 0 ${n} ${n}" aria-hidden="true"></svg>`;
          root.querySelectorAll('[data-size]').forEach(b => b.classList.toggle('on', +b.dataset.size === n));
          timer.reset();
          showBest();
          clearLines();
        }

        function cut(k, len) { // k の線を len マスまで短くする
          lines[k].splice(len).forEach(c => { owner[c] = -1; });
        }

        function extend(c) {
          const k = active, l = lines[k], head = l[l.length - 1];
          if (c === head) return false;
          if (l.length > 1 && c === l[l.length - 2]) { cut(k, l.length - 1); return true; } // 戻る
          if (complete(k) || !nbrs(head).includes(c)) return false;
          if (owner[c] >= 0 || (endOf[c] >= 0 && endOf[c] !== k)) return false; // ふさがっている
          l.push(c);
          owner[c] = k;
          return true;
        }

        function finishCheck() {
          if (paint() < n) return;
          done = true;
          active = -1;
          const time = timer.stop();
          const old = api.load('best' + n, null);
          const isNew = old === null || time < old;
          if (isNew) api.save('best' + n, time);
          showBest();
          $('w-msg').textContent = `🎉 クリア! ${api.fmtTime(time)}` + (isNew ? '(新記録)' : '')
            + (owner.every(o => o >= 0) ? ' ⭐ 全部のマスを使いました' : '');
        }

        function begin(i) {
          if (done || i < 0) return;
          let k = endOf[i] >= 0 ? endOf[i] : owner[i];
          if (k < 0) {
            // 空いているワープ穴を触った時:相手の穴で止まっている線があれば、こちらへワープして続ける
            k = warp[i] >= 0 ? owner[warp[i]] : -1;
            if (k < 0 || lines[k][lines[k].length - 1] !== warp[i]) return;
            active = k;
            extend(i);
          } else {
            if (endOf[i] >= 0) { cut(k, 0); lines[k] = [i]; owner[i] = k; } // 数字から引き直す
            else cut(k, lines[k].indexOf(i) + 1); // 線の途中から続ける
            active = k;
          }
          timer.start();
          finishCheck();
        }

        function dragTo(i) {
          if (active < 0 || done || i < 0) return;
          // 指が速くてマスを飛ばした時は、同じ行・列なら1マスずつ進める
          for (let guard = 0; guard < n; guard++) {
            const head = lines[active][lines[active].length - 1];
            if (head === i) break;
            const hx = head % n, hy = Math.floor(head / n), x = i % n, y = Math.floor(i / n);
            if (hx !== x && hy !== y) break;
            const next = hx === x ? head + (y > hy ? n : -n) : head + (x > hx ? 1 : -1);
            if (!extend(next)) break;
          }
          finishCheck();
        }

        const cellAt = e => {
          const el = document.elementFromPoint(e.clientX, e.clientY);
          const c = el && el.closest('[data-i]');
          return c && board.contains(c) ? +c.dataset.i : -1;
        };
        const stopDrag = () => { active = -1; };
        board.addEventListener('pointerdown', e => begin(cellAt(e)));
        board.addEventListener('pointermove', e => dragTo(cellAt(e)));
        document.addEventListener('pointerup', stopDrag);
        document.addEventListener('pointercancel', stopDrag);

        $('w-clear').addEventListener('click', () => { if (!done) clearLines(); });
        $('w-sizes').addEventListener('click', e => {
          const s = e.target.dataset.size;
          if (s) { n = +s; api.save('size', n); }
          if (s || e.target.id === 'w-new') newGame();
        });
        newGame();

        return () => {
          timer.reset();
          document.removeEventListener('pointerup', stopDrag);
          document.removeEventListener('pointercancel', stopDrag);
        };
      },
    });
  }

  make({
    id: 'link', name: 'ナンバーリンク', icon: '➰', desc: '同じ数字どうしを、線が交わらないようにつなごう', warps: false, note: '',
  });
  make({
    id: 'warplink', name: 'ワープリンク', icon: '🕳️', desc: 'オリジナル:ワープ穴を使って、同じ数字どうしをつなごう', warps: true,
    note: '<b>同じ文字の輪(A と A)はワープ穴</b>で、中でつながっています。線を穴まで引いたら、いったん指をはなして<b>もう片方の穴をタップ</b>すると、そこから線が続きます。穴を使わずに通りすぎることもできます。<br>',
  });
})();

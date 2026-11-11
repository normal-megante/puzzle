// 倉庫番 と 鏡の倉庫番(オリジナル)。ルールがほぼ同じなので1ファイルで2つ登録する。
// ステージは stagedata.js の StageData.soko / StageData.mir。
// 鏡の倉庫番:自分(A)が動いたあと、相手(B)が左右逆の方向に動く。A と B が同時に自分のゴールに乗ればクリア。
'use strict';

(() => {
  const DIRS = [[-1, 0], [0, -1], [1, 0], [0, 1]]; // 左 上 右 下
  const MIRROR = [2, 1, 0, 3];

  function make({ id, name, icon, desc, mirror, note }) {
    registerPuzzle({
      id, name, icon, desc,
      start(root, api) {
        const stages = mirror ? StageData.mir : StageData.soko;
        let si = Math.min(api.load('stage', 0), stages.length - 1);
        let W, wall, goals, ga, gb, boxes, a, b, moves, history, done;
        let boxEls, aEl, bEl;

        root.innerHTML = `
          <div class="k-stages" id="k-stages">
            ${stages.map((_, i) => `<button class="btn" data-stage="${i}">${i + 1}</button>`).join('')}
          </div>
          <p class="note" style="margin:-4px 0 12px">数字でステージを選べます(後ろほど難しい)。✓ はクリア済み。</p>
          <div class="stats">
            <div><small>手数(最少 <span id="k-min"></span>)</small><b id="k-moves">0</b></div>
            <div><small>このステージのベスト</small><b id="k-best">-</b></div>
          </div>
          <div class="row">
            <button class="btn" id="k-undo">1手戻す</button>
            <button class="btn" id="k-retry">最初から</button>
            <button class="btn primary" id="k-next" hidden>次のステージへ</button>
          </div>
          <div class="k-board" id="k-board"></div>
          <p class="msg" id="k-msg"></p>
          <div class="i-pad" id="k-pad">
            <button class="btn" data-dir="1" aria-label="上">↑</button>
            <button class="btn" data-dir="0" aria-label="左">←</button>
            <button class="btn" data-dir="3" aria-label="下">↓</button>
            <button class="btn" data-dir="2" aria-label="右">→</button>
          </div>
          <p class="note">${note}<br>盤面のスワイプ、矢印ボタン、矢印キーで動かせます。「1手戻す」は何回でも使えます。</p>`;

        const $ = x => root.querySelector('#' + x);
        const board = $('k-board');

        function put(el, pos) {
          el.style.transform = `translate(${(pos % W) * 100}%, ${Math.floor(pos / W) * 100}%)`;
        }

        function paint() {
          boxes.forEach((p, i) => {
            put(boxEls[i], p);
            boxEls[i].classList.toggle('ok', goals.includes(p));
          });
          put(aEl, a);
          if (mirror) put(bEl, b);
          $('k-moves').textContent = moves;
          $('k-undo').disabled = !history.length || done;
        }

        function paintStages() {
          const clear = api.load('clear', {});
          root.querySelectorAll('[data-stage]').forEach((el, i) => {
            el.classList.toggle('on', i === si);
            el.textContent = (clear[i] ? '✓' : '') + (i + 1);
          });
          $('k-best').textContent = clear[si] || '-';
        }

        function load() {
          const map = stages[si].map;
          W = map[0].length;
          wall = []; goals = []; boxes = []; ga = gb = b = -1;
          map.join('').split('').forEach((ch, i) => {
            wall.push(ch === '#');
            if (ch === '.') goals.push(i);
            if (ch === '$') boxes.push(i);
            if (ch === '@' || ch === 'A') a = i;
            if (ch === 'B') b = i;
            if (ch === 'a') ga = i;
            if (ch === 'b') gb = i;
          });
          moves = 0; history = []; done = false;

          board.style.setProperty('--w', W);
          board.innerHTML = wall.map((w, i) =>
            `<span class="k-cell${w ? ' wall' : ''}${goals.includes(i) ? ' goal' : ''}${i === ga ? ' ga' : ''}${i === gb ? ' gb' : ''}"></span>`).join('')
            + boxes.map(() => '<span class="k-obj k-box">📦</span>').join('')
            + '<span class="k-obj k-me" id="k-a"></span>'
            + (mirror ? '<span class="k-obj k-me b" id="k-b"></span>' : '');
          boxEls = [...board.querySelectorAll('.k-box')];
          aEl = $('k-a');
          bEl = $('k-b');
          $('k-min').textContent = stages[si].min;
          $('k-msg').textContent = '';
          $('k-next').hidden = true;
          api.save('stage', si);
          paintStages();
          paint();
        }

        // me を d の向きに1歩。壁・相手・動かせない箱があれば動かない。箱は押す。
        function attempt(me, other, d) {
          const step = DIRS[d][0] + DIRS[d][1] * W;
          const n = me + step;
          if (wall[n] || n === other) return me;
          const bi = boxes.indexOf(n);
          if (bi >= 0) {
            const n2 = n + step;
            if (wall[n2] || boxes.includes(n2) || n2 === other) return me;
            boxes[bi] = n2;
          }
          return n;
        }

        function move(d) {
          if (done) return;
          const before = { a, b, boxes: boxes.slice() };
          a = attempt(a, b, d);
          if (mirror) b = attempt(b, a, MIRROR[d]);
          if (a === before.a && b === before.b) return;
          history.push(before);
          moves++;
          const win = mirror ? (a === ga && b === gb) : boxes.every(p => goals.includes(p));
          if (win) {
            done = true;
            const clear = api.load('clear', {});
            const isNew = !clear[si] || moves < clear[si];
            if (isNew) { clear[si] = moves; api.save('clear', clear); }
            paintStages();
            $('k-msg').textContent = `🎉 クリア! ${moves}手`
              + (moves <= stages[si].min ? '(最少手数!)' : isNew ? '(新記録)' : '');
            $('k-next').hidden = si >= stages.length - 1;
          }
          paint();
        }

        function undo() {
          if (done || !history.length) return;
          ({ a, b, boxes } = history.pop());
          moves--;
          paint();
        }

        api.swipe(board, move);
        function onKey(e) {
          const d = ['ArrowLeft', 'ArrowUp', 'ArrowRight', 'ArrowDown'].indexOf(e.key);
          if (d >= 0) { e.preventDefault(); move(d); }
          else if (e.key === 'z' || e.key === 'Backspace') undo();
        }
        document.addEventListener('keydown', onKey);
        $('k-pad').addEventListener('click', e => {
          const el = e.target.closest('[data-dir]');
          if (el) move(+el.dataset.dir);
        });
        $('k-stages').addEventListener('click', e => {
          const el = e.target.closest('[data-stage]');
          if (el) { si = +el.dataset.stage; load(); }
        });
        $('k-undo').addEventListener('click', undo);
        $('k-retry').addEventListener('click', load);
        $('k-next').addEventListener('click', () => { si++; load(); });
        load();

        return () => document.removeEventListener('keydown', onKey);
      },
    });
  }

  make({
    id: 'sokoban', name: '倉庫番', icon: '📦', desc: '箱を押して、全部しるしの場所へ運ぼう', mirror: false,
    note: '箱 📦 は押すことしかできません(引けません)。全部の箱を ● の場所に置けばクリア。',
  });
  make({
    id: 'mirror', name: '鏡の倉庫番', icon: '🪞', desc: 'オリジナル:鏡写しに動く相手と、同時にゴールしよう', mirror: true,
    note: '青(あなた)が動くと、赤は<b>左右が逆</b>の方向に動きます(上下は同じ)。青が先に動き、そのあと赤が動きます。<br>青は青い輪、赤は赤い輪に、<b>同時に</b>乗ればクリア。箱 📦 はどちらも押せます。おたがいは通り抜けられません。',
  });
})();

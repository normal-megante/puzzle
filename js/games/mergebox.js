// 合体倉庫番(オリジナル:数字合体 × 倉庫番)
// 数字の箱を押す。同じ数字の箱にぶつけると合体して2倍になる。目標の数字の箱を作ればクリア。
// ステージは stagedata-mergebox.js の StageData.mergebox。盤面の見た目は倉庫番の CSS(k-)を流用。
'use strict';

registerPuzzle({
  id: 'mergebox',
  name: '合体倉庫番',
  icon: '🧱',
  desc: 'オリジナル:同じ数字の箱を押してぶつけ、合体させよう',

  start(root, api) {
    const DIRS = [[-1, 0], [0, -1], [1, 0], [0, 1]]; // 左 上 右 下
    const stages = StageData.mergebox;
    let si = Math.min(api.load('stage', 0), stages.length - 1);
    let W, wall, boxes, a, moves, history, done;

    root.innerHTML = `
      <div class="k-stages" id="g-stages">
        ${stages.map((_, i) => `<button class="btn" data-stage="${i}">${i + 1}</button>`).join('')}
      </div>
      <p class="note" style="margin:-4px 0 12px">数字でステージを選べます(後ろほど難しい)。✓ はクリア済み。</p>
      <div class="stats">
        <div><small>作る数字</small><b id="g-target"></b></div>
        <div><small>手数(最少 <span id="g-min"></span>)</small><b id="g-moves">0</b></div>
        <div><small>ベスト</small><b id="g-best">-</b></div>
      </div>
      <div class="row">
        <button class="btn" id="g-undo">1手戻す</button>
        <button class="btn" id="g-retry">最初から</button>
        <button class="btn primary" id="g-next" hidden>次のステージへ</button>
      </div>
      <div class="k-board" id="g-board"></div>
      <p class="msg" id="g-msg"></p>
      <div class="i-pad" id="g-pad">
        <button class="btn" data-dir="1" aria-label="上">↑</button>
        <button class="btn" data-dir="0" aria-label="左">←</button>
        <button class="btn" data-dir="3" aria-label="下">↓</button>
        <button class="btn" data-dir="2" aria-label="右">→</button>
      </div>
      <p class="note">数字の箱は押すことしかできません。<b>同じ数字の箱</b>にぶつけると合体して2倍になります(2+2→4、4+4→8)。<br>ちがう数字の箱にはぶつけられません。「作る数字」の箱ができればクリア。合体の順番をまちがえると作れなくなるので、「1手戻す」を活用してください。</p>`;

    const $ = x => root.querySelector('#' + x);
    const board = $('g-board');
    const put = (el, pos) => { el.style.transform = `translate(${(pos % W) * 100}%, ${Math.floor(pos / W) * 100}%)`; };

    function paint() {
      board.querySelectorAll('.g-box').forEach(el => el.remove());
      boxes.forEach(b => {
        const el = document.createElement('span');
        el.className = 'k-obj g-box';
        el.innerHTML = `<i style="background:hsl(${(200 + Math.log2(b.val) * 28) % 360} 60% 46%)">${b.val}</i>`;
        put(el, b.pos);
        board.appendChild(el);
      });
      put($('g-a'), a);
      $('g-moves').textContent = moves;
      $('g-undo').disabled = !history.length || done;
    }

    function paintStages() {
      const clear = api.load('clear', {});
      root.querySelectorAll('[data-stage]').forEach((el, i) => {
        el.classList.toggle('on', i === si);
        el.textContent = (clear[i] ? '✓' : '') + (i + 1);
      });
      $('g-best').textContent = clear[si] || '-';
    }

    function load() {
      const map = stages[si].map;
      W = map[0].length;
      wall = []; boxes = [];
      [...map.join('')].forEach((ch, i) => {
        wall.push(ch === '#');
        if (ch === '@') a = i;
        if (ch >= '1' && ch <= '9') boxes.push({ pos: i, val: 2 ** +ch });
      });
      moves = 0; history = []; done = false;
      board.style.setProperty('--w', W);
      board.innerHTML = wall.map(w => `<span class="k-cell${w ? ' wall' : ''}"></span>`).join('')
        + '<span class="k-obj k-me" id="g-a"></span>';
      $('g-target').textContent = stages[si].target;
      $('g-min').textContent = stages[si].min;
      $('g-msg').textContent = '';
      $('g-next').hidden = true;
      api.save('stage', si);
      paintStages();
      paint();
    }

    function move(d) {
      if (done) return;
      const step = DIRS[d][0] + DIRS[d][1] * W;
      const n = a + step;
      if (wall[n]) return;
      const before = { a, boxes: boxes.map(b => ({ ...b })) };
      const box = boxes.find(b => b.pos === n);
      if (box) {
        const n2 = n + step;
        if (wall[n2]) return;
        const other = boxes.find(b => b.pos === n2);
        if (other) {
          if (other.val !== box.val) return;
          other.val *= 2; // 合体
          boxes.splice(boxes.indexOf(box), 1);
        } else box.pos = n2;
      }
      history.push(before);
      a = n;
      moves++;
      if (boxes.some(b => b.val === stages[si].target)) {
        done = true;
        const clear = api.load('clear', {});
        const isNew = !clear[si] || moves < clear[si];
        if (isNew) { clear[si] = moves; api.save('clear', clear); }
        paintStages();
        $('g-msg').textContent = `🎉 ${stages[si].target} ができた! ${moves}手`
          + (moves <= stages[si].min ? '(最少手数!)' : isNew ? '(新記録)' : '');
        $('g-next').hidden = si >= stages.length - 1;
      }
      paint();
    }

    function undo() {
      if (done || !history.length) return;
      ({ a, boxes } = history.pop());
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
    $('g-pad').addEventListener('click', e => {
      const el = e.target.closest('[data-dir]');
      if (el) move(+el.dataset.dir);
    });
    $('g-stages').addEventListener('click', e => {
      const el = e.target.closest('[data-stage]');
      if (el) { si = +el.dataset.stage; load(); }
    });
    $('g-undo').addEventListener('click', undo);
    $('g-retry').addEventListener('click', load);
    $('g-next').addEventListener('click', () => { si++; load(); });
    load();

    return () => document.removeEventListener('keydown', onKey);
  },
});

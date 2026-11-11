// スライディングブロック(4×5。ブロックを上下左右にずらし、2×2 の大きいブロックを下の出口へ)
// ステージは stagedata-slide.js の StageData.slide(同じ文字のマスが1つのブロック。A が 2×2)。
// 1マス動かすごとに1手と数える。
'use strict';

registerPuzzle({
  id: 'slide',
  name: 'スライディングブロック',
  icon: '🧩',
  desc: 'ブロックをずらして、大きいブロックを出口へ',

  start(root, api) {
    const W = 4, H = 5, GX = 1, GY = 3;
    const stages = StageData.slide;
    let si = Math.min(api.load('stage', 0), stages.length - 1);
    let pieces, moves, history, done, drag = null;

    root.innerHTML = `
      <div class="k-stages" id="sb-stages">
        ${stages.map((_, i) => `<button class="btn" data-stage="${i}">${i + 1}</button>`).join('')}
      </div>
      <p class="note" style="margin:-4px 0 12px">数字でステージを選べます(後ろほど難しい)。✓ はクリア済み。</p>
      <div class="stats">
        <div><small>手数(最少 <span id="sb-min"></span>)</small><b id="sb-moves">0</b></div>
        <div><small>このステージのベスト</small><b id="sb-best">-</b></div>
      </div>
      <div class="row">
        <button class="btn" id="sb-undo">1手戻す</button>
        <button class="btn" id="sb-retry">最初から</button>
        <button class="btn primary" id="sb-next" hidden>次のステージへ</button>
      </div>
      <div class="sb-board" id="sb-board"></div>
      <p class="msg" id="sb-msg"></p>
      <p class="note">ブロックを指でつかんで、空いている方へずらします(上下左右どちらにも動かせます)。<br>赤い大きいブロックを、下の真ん中の出口(緑のしるし)まで動かせばクリア。1マス動かすごとに1手と数えます。</p>`;

    const $ = x => root.querySelector('#' + x);
    const board = $('sb-board');

    function paint() {
      pieces.forEach(p => {
        p.el.style.left = p.x / W * 100 + '%';
        p.el.style.top = p.y / H * 100 + '%';
      });
      $('sb-moves').textContent = moves;
      $('sb-undo').disabled = !history.length || done;
    }

    function paintStages() {
      const clear = api.load('clear', {});
      root.querySelectorAll('[data-stage]').forEach((el, i) => {
        el.classList.toggle('on', i === si);
        el.textContent = (clear[i] ? '✓' : '') + (i + 1);
      });
      $('sb-best').textContent = clear[si] || '-';
    }

    function load() {
      const map = stages[si].map, by = {};
      map.forEach((row, y) => [...row].forEach((ch, x) => {
        if (ch !== '.') (by[ch] = by[ch] || []).push([x, y]);
      }));
      board.innerHTML = '<span class="sb-exit"></span>';
      pieces = Object.keys(by).sort().map((ch, i) => {
        const xs = by[ch].map(c => c[0]), ys = by[ch].map(c => c[1]);
        const p = { x: Math.min(...xs), y: Math.min(...ys) };
        p.w = Math.max(...xs) - p.x + 1;
        p.h = Math.max(...ys) - p.y + 1;
        p.el = document.createElement('div');
        p.el.className = 'sb-piece' + (i === 0 ? ' main' : p.w > p.h ? ' wide' : p.h > p.w ? ' tall' : '');
        p.el.dataset.p = i;
        p.el.style.width = p.w / W * 100 + '%';
        p.el.style.height = p.h / H * 100 + '%';
        p.el.innerHTML = '<span></span>';
        board.appendChild(p.el);
        return p;
      });
      moves = 0; history = []; done = false; drag = null;
      $('sb-min').textContent = stages[si].min;
      $('sb-msg').textContent = '';
      $('sb-next').hidden = true;
      api.save('stage', si);
      paintStages();
      paint();
    }

    function canMove(p, dx, dy) {
      const x = p.x + dx, y = p.y + dy;
      if (x < 0 || y < 0 || x + p.w > W || y + p.h > H) return false;
      return pieces.every(o => o === p || x >= o.x + o.w || o.x >= x + p.w || y >= o.y + o.h || o.y >= y + p.h);
    }

    function tryMove(p, dx, dy) {
      if (done || !canMove(p, dx, dy)) return false;
      history.push(pieces.map(o => [o.x, o.y]));
      p.x += dx; p.y += dy;
      moves++;
      if (pieces[0].x === GX && pieces[0].y === GY) {
        done = true;
        const clear = api.load('clear', {});
        const isNew = !clear[si] || moves < clear[si];
        if (isNew) { clear[si] = moves; api.save('clear', clear); }
        paintStages();
        $('sb-msg').textContent = `🎉 脱出! ${moves}手`
          + (moves <= stages[si].min ? '(最少手数!)' : isNew ? '(新記録)' : '');
        $('sb-next').hidden = si >= stages.length - 1;
      }
      paint();
      return true;
    }

    // つかんだまま半マスぶん指が動くたびに、その方向へ1マス動かす
    board.addEventListener('pointerdown', e => {
      const el = e.target.closest('[data-p]');
      if (!el || done) return;
      drag = { p: pieces[+el.dataset.p], x: e.clientX, y: e.clientY, cell: board.clientWidth / W };
      try { el.setPointerCapture(e.pointerId); } catch { /* 取れなくても動く */ }
    });
    board.addEventListener('pointermove', e => {
      if (!drag) return;
      for (let guard = 0; guard < 6; guard++) {
        const dx = e.clientX - drag.x, dy = e.clientY - drag.y, half = drag.cell * 0.5;
        if (Math.max(Math.abs(dx), Math.abs(dy)) < half) break;
        const horiz = Math.abs(dx) > Math.abs(dy);
        const sx = horiz ? Math.sign(dx) : 0, sy = horiz ? 0 : Math.sign(dy);
        if (!tryMove(drag.p, sx, sy)) break;
        drag.x += sx * drag.cell;
        drag.y += sy * drag.cell;
      }
    });
    const endDrag = () => { drag = null; };
    board.addEventListener('pointerup', endDrag);
    board.addEventListener('pointercancel', endDrag);

    $('sb-stages').addEventListener('click', e => {
      const el = e.target.closest('[data-stage]');
      if (el) { si = +el.dataset.stage; load(); }
    });
    $('sb-undo').addEventListener('click', () => {
      if (done || !history.length) return;
      history.pop().forEach(([x, y], i) => { pieces[i].x = x; pieces[i].y = y; });
      moves--;
      paint();
    });
    $('sb-retry').addEventListener('click', load);
    $('sb-next').addEventListener('click', () => { si++; load(); });
    load();
  },
});

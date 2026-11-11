// 車ずらし(6×6。車は前後にしか動かない。赤い車を右の出口まで動かす)
// ステージは stagedata-cars.js の StageData.cars(同じ文字のマスが1台。A が赤い車)。
// 1回のドラッグ(何マス動かしても)を1手と数える。
'use strict';

registerPuzzle({
  id: 'cars',
  name: '車ずらし',
  icon: '🚗',
  desc: 'じゃまな車をずらして、赤い車を出口へ',

  start(root, api) {
    const N = 6;
    const COLORS = ['#e5484d', '#3b7dd8', '#2fa66a', '#e0a100', '#8e5bd6', '#1fa3a3', '#c9762a', '#6b7185', '#7a9a2e', '#b0569a', '#4d6fb0', '#9c8a5a', '#5aa0a0'];
    const stages = StageData.cars;
    let si = Math.min(api.load('stage', 0), stages.length - 1);
    let cars, moves, history, done, drag = null;

    root.innerHTML = `
      <div class="k-stages" id="v-stages">
        ${stages.map((_, i) => `<button class="btn" data-stage="${i}">${i + 1}</button>`).join('')}
      </div>
      <p class="note" style="margin:-4px 0 12px">数字でステージを選べます(後ろほど難しい)。✓ はクリア済み。</p>
      <div class="stats">
        <div><small>手数(最少 <span id="v-min"></span>)</small><b id="v-moves">0</b></div>
        <div><small>このステージのベスト</small><b id="v-best">-</b></div>
      </div>
      <div class="row">
        <button class="btn" id="v-undo">1手戻す</button>
        <button class="btn" id="v-retry">最初から</button>
        <button class="btn primary" id="v-next" hidden>次のステージへ</button>
      </div>
      <div class="v-board" id="v-board"></div>
      <p class="msg" id="v-msg"></p>
      <p class="note">車を指でつかんで、前後にずらします(横向きの車は左右、縦向きの車は上下だけ)。<br>赤い車を右はしの出口(緑のしるし)まで動かせばクリア。1回ずらすごとに1手と数えます。</p>`;

    const $ = x => root.querySelector('#' + x);
    const board = $('v-board');

    function place(c, p) { // p は動く方向の位置(ドラッグ中は小数)
      c.el.style.left = (c.h ? p : c.x) / N * 100 + '%';
      c.el.style.top = (c.h ? c.y : p) / N * 100 + '%';
    }

    function paint() {
      cars.forEach(c => place(c, c.h ? c.x : c.y));
      $('v-moves').textContent = moves;
      $('v-undo').disabled = !history.length || done;
    }

    function paintStages() {
      const clear = api.load('clear', {});
      root.querySelectorAll('[data-stage]').forEach((el, i) => {
        el.classList.toggle('on', i === si);
        el.textContent = (clear[i] ? '✓' : '') + (i + 1);
      });
      $('v-best').textContent = clear[si] || '-';
    }

    function load() {
      const map = stages[si].map, byLetter = {};
      map.forEach((row, y) => [...row].forEach((ch, x) => {
        if (ch !== '.') (byLetter[ch] = byLetter[ch] || []).push([x, y]);
      }));
      board.innerHTML = '<span class="v-exit"></span>';
      cars = Object.keys(byLetter).sort().map((ch, i) => {
        const cells = byLetter[ch];
        const h = cells[0][1] === cells[1][1];
        const el = document.createElement('div');
        el.className = 'v-car';
        el.dataset.car = i;
        el.style.width = (h ? cells.length : 1) / N * 100 + '%';
        el.style.height = (h ? 1 : cells.length) / N * 100 + '%';
        el.innerHTML = `<span style="background:${COLORS[i % COLORS.length]}">${i === 0 ? '🚗' : ''}</span>`;
        board.appendChild(el);
        return { h, len: cells.length, x: cells[0][0], y: cells[0][1], el };
      });
      moves = 0; history = []; done = false; drag = null;
      $('v-min').textContent = stages[si].min;
      $('v-msg').textContent = '';
      $('v-next').hidden = true;
      api.save('stage', si);
      paintStages();
      paint();
    }

    function range(c) { // この車が動ける位置の [最小, 最大]
      const occ = new Set();
      cars.forEach(o => {
        if (o === c) return;
        for (let k = 0; k < o.len; k++) occ.add(o.h ? (o.x + k) + ',' + o.y : o.x + ',' + (o.y + k));
      });
      const free = p => !occ.has(c.h ? p + ',' + c.y : c.x + ',' + p);
      const cur = c.h ? c.x : c.y;
      let lo = cur, hi = cur;
      while (lo > 0 && free(lo - 1)) lo--;
      while (hi + c.len < N && free(hi + c.len)) hi++;
      return [lo, hi];
    }

    function moveTo(c, p) {
      const cur = c.h ? c.x : c.y;
      if (p === cur) { paint(); return; }
      history.push(cars.map(o => [o.x, o.y]));
      if (c.h) c.x = p; else c.y = p;
      moves++;
      if (cars[0].x === N - 2) {
        done = true;
        const clear = api.load('clear', {});
        const isNew = !clear[si] || moves < clear[si];
        if (isNew) { clear[si] = moves; api.save('clear', clear); }
        paintStages();
        $('v-msg').textContent = `🎉 脱出! ${moves}手`
          + (moves <= stages[si].min ? '(最少手数!)' : isNew ? '(新記録)' : '');
        $('v-next').hidden = si >= stages.length - 1;
      }
      paint();
    }

    board.addEventListener('pointerdown', e => {
      const el = e.target.closest('[data-car]');
      if (!el || done) return;
      const c = cars[+el.dataset.car];
      const [lo, hi] = range(c);
      drag = { c, lo, hi, from: c.h ? c.x : c.y, start: c.h ? e.clientX : e.clientY, cell: board.clientWidth / N, p: c.h ? c.x : c.y };
      el.classList.add('drag');
      try { el.setPointerCapture(e.pointerId); } catch { /* 取れなくても動く */ }
    });
    board.addEventListener('pointermove', e => {
      if (!drag) return;
      const d = ((drag.c.h ? e.clientX : e.clientY) - drag.start) / drag.cell;
      drag.p = Math.min(drag.hi, Math.max(drag.lo, drag.from + d));
      place(drag.c, drag.p);
    });
    function endDrag() {
      if (!drag) return;
      const { c, p } = drag;
      drag = null;
      c.el.classList.remove('drag');
      moveTo(c, Math.round(p));
    }
    board.addEventListener('pointerup', endDrag);
    board.addEventListener('pointercancel', endDrag);

    $('v-stages').addEventListener('click', e => {
      const el = e.target.closest('[data-stage]');
      if (el) { si = +el.dataset.stage; load(); }
    });
    $('v-undo').addEventListener('click', () => {
      if (done || !history.length) return;
      history.pop().forEach(([x, y], i) => { cars[i].x = x; cars[i].y = y; });
      moves--;
      paint();
    });
    $('v-retry').addEventListener('click', load);
    $('v-next').addEventListener('click', () => { si++; load(); });
    load();
  },
});

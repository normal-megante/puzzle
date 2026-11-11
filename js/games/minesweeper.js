// マインスイーパー(初級 / 中級 / 上級)
// 地雷は最初の1マスを開けた時に置く(そのマスと周り8マスには置かない)ので、1手目で負けない。
// 旗:長押し / 右クリック / 旗モード。数字マスをタップ=周りの旗の数が合っていれば残りをまとめて開ける。
'use strict';

registerPuzzle({
  id: 'minesweeper',
  name: 'マインスイーパー',
  icon: '💣',
  desc: '数字をヒントに、地雷のないマスを全部開けよう',

  start(root, api) {
    const LEVELS = {
      easy: { name: '初級', w: 9, h: 9, m: 10 },
      mid: { name: '中級', w: 11, h: 15, m: 28 },
      hard: { name: '上級', w: 13, h: 20, m: 52 },
    };
    let lv = api.load('level', 'easy');
    if (!LEVELS[lv]) lv = 'easy';
    let w, h, m, mine, open, flag, count, placed, state, opened, flags, hit, startAt, timer;
    let flagMode = false;
    let cellEls = [];

    root.innerHTML = `
      <div class="row" id="m-levels">
        ${Object.entries(LEVELS).map(([k, v]) => `<button class="btn" data-level="${k}">${v.name}</button>`).join('')}
        <button class="btn primary" id="m-new">新しいゲーム</button>
      </div>
      <div class="stats">
        <div><small>残りの地雷</small><b id="m-left">0</b></div>
        <div><small>時間</small><b id="m-time">0:00</b></div>
        <div><small>ベスト時間</small><b id="m-best">-</b></div>
      </div>
      <div class="row">
        <button class="btn" id="m-flag" aria-pressed="false">🚩 旗モード:OFF</button>
      </div>
      <p class="note" style="margin:-4px 0 12px">旗は、マスの長押し(パソコンは右クリック)でも立てられます。<br>旗モードがONの間は、タップで旗を立てます。</p>
      <div class="m-board" id="m-board"></div>
      <p class="msg" id="m-msg"></p>
      <p class="note">最初の1マスは必ず安全です。数字は周り8マスにある地雷の数。<br>開いた数字をタップすると、周りの旗の数が合っていれば残りをまとめて開けます(旗が間違っていると負けます)。</p>`;

    const $ = id => root.querySelector('#' + id);
    const board = $('m-board');

    function neighbors(i) {
      const r = Math.floor(i / w), c = i % w, out = [];
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        const rr = r + dr, cc = c + dc;
        if ((dr || dc) && rr >= 0 && rr < h && cc >= 0 && cc < w) out.push(rr * w + cc);
      }
      return out;
    }

    function showBest() {
      const b = api.load('best_' + lv, null);
      $('m-best').textContent = b === null ? '-' : api.fmtTime(b);
    }

    function paint() {
      const over = state !== 'play';
      cellEls.forEach((el, i) => {
        let cls = 'm-cell', txt = '';
        if (open[i]) {
          cls += ' open';
          if (mine[i]) txt = '💣';
          else if (count[i]) { txt = count[i]; cls += ' n' + count[i]; }
        } else if (flag[i]) {
          txt = (state === 'lost' && !mine[i]) ? '❌' : '🚩';
        } else if (over && mine[i]) {
          txt = state === 'won' ? '🚩' : '💣';
        }
        if (i === hit) cls += ' hit';
        el.className = cls;
        el.textContent = txt;
      });
      $('m-left').textContent = state === 'won' ? 0 : m - flags;
    }

    function newGame() {
      clearInterval(timer);
      timer = null;
      ({ w, h, m } = LEVELS[lv]);
      const size = w * h;
      mine = Array(size).fill(false);
      open = Array(size).fill(false);
      flag = Array(size).fill(false);
      count = Array(size).fill(0);
      placed = false; state = 'play'; opened = 0; flags = 0; hit = -1;

      board.style.setProperty('--w', w);
      board.innerHTML = '';
      cellEls = mine.map((_, i) => {
        const b = document.createElement('button');
        b.dataset.i = i;
        board.appendChild(b);
        return b;
      });
      root.querySelectorAll('[data-level]').forEach(b => b.classList.toggle('on', b.dataset.level === lv));
      $('m-time').textContent = '0:00';
      $('m-msg').textContent = '';
      showBest();
      paint();
    }

    function placeMines(safe) {
      const banned = new Set([safe, ...neighbors(safe)]);
      const cand = [];
      for (let i = 0; i < w * h; i++) if (!banned.has(i)) cand.push(i);
      for (let k = 0; k < m; k++) { // 候補から m 個をランダムに選ぶ
        const j = k + Math.floor(Math.random() * (cand.length - k));
        [cand[k], cand[j]] = [cand[j], cand[k]];
        mine[cand[k]] = true;
      }
      for (let i = 0; i < w * h; i++) count[i] = neighbors(i).filter(j => mine[j]).length;
      placed = true;
      startAt = Date.now();
      timer = setInterval(() => {
        $('m-time').textContent = api.fmtTime((Date.now() - startAt) / 1000);
      }, 250);
    }

    function openCell(start) { // 0 のマスは周りも続けて開く
      const stack = [start];
      while (stack.length) {
        const i = stack.pop();
        if (open[i] || flag[i]) continue;
        open[i] = true;
        opened++;
        if (count[i] === 0) stack.push(...neighbors(i));
      }
    }

    function toggleFlag(i) {
      if (state !== 'play' || open[i]) return;
      flag[i] = !flag[i];
      flags += flag[i] ? 1 : -1;
      paint();
    }

    function finish(won, at) {
      state = won ? 'won' : 'lost';
      clearInterval(timer);
      const time = (Date.now() - startAt) / 1000;
      $('m-time').textContent = api.fmtTime(time);
      if (won) {
        const old = api.load('best_' + lv, null);
        const isNew = old === null || time < old;
        if (isNew) api.save('best_' + lv, time);
        showBest();
        $('m-msg').textContent = `🎉 クリア! ${api.fmtTime(time)}` + (isNew ? '(新記録)' : '');
      } else {
        hit = at;
        open[at] = true;
        $('m-msg').textContent = '💥 地雷を踏んでしまった…';
      }
    }

    function tapCell(i) {
      if (state !== 'play') return;
      if (flagMode && !open[i]) { toggleFlag(i); return; }
      if (flag[i]) return;

      let targets = [i];
      if (open[i]) { // 数字マス:周りの旗の数が合っていれば残りを開ける
        const ns = neighbors(i);
        if (!count[i] || ns.filter(j => flag[j]).length !== count[i]) return;
        targets = ns.filter(j => !flag[j] && !open[j]);
        if (!targets.length) return;
      } else if (!placed) {
        placeMines(i);
      }

      const boom = targets.find(j => mine[j]);
      if (boom !== undefined) finish(false, boom);
      else {
        targets.forEach(openCell);
        if (opened === w * h - m) finish(true);
      }
      paint();
    }

    // --- 入力(タップ / 長押し / 右クリック) ---
    const idx = e => { const el = e.target.closest('[data-i]'); return el ? +el.dataset.i : -1; };
    let pressTimer = null, longFired = false, lastType = 'mouse', sx = 0, sy = 0;
    const cancelPress = () => { clearTimeout(pressTimer); pressTimer = null; };

    board.addEventListener('pointerdown', e => {
      lastType = e.pointerType;
      longFired = false;
      const i = idx(e);
      if (i < 0 || e.button !== 0) return;
      sx = e.clientX; sy = e.clientY;
      cancelPress();
      pressTimer = setTimeout(() => {
        pressTimer = null;
        longFired = true;
        if (state === 'play' && !open[i]) {
          toggleFlag(i);
          if (navigator.vibrate) navigator.vibrate(30);
        }
      }, 400);
    });
    board.addEventListener('pointermove', e => {
      if (pressTimer && Math.hypot(e.clientX - sx, e.clientY - sy) > 10) cancelPress();
    });
    for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) board.addEventListener(ev, cancelPress);
    board.addEventListener('click', e => {
      if (longFired) { longFired = false; return; }
      const i = idx(e);
      if (i >= 0) tapCell(i);
    });
    board.addEventListener('contextmenu', e => {
      e.preventDefault(); // スマホの長押しメニューも止める
      const i = idx(e);
      if (i >= 0 && lastType === 'mouse') toggleFlag(i);
    });

    $('m-levels').addEventListener('click', e => {
      const k = e.target.dataset.level;
      if (k) { lv = k; api.save('level', lv); }
      if (k || e.target.id === 'm-new') newGame();
    });
    $('m-flag').addEventListener('click', () => {
      flagMode = !flagMode;
      const b = $('m-flag');
      b.classList.toggle('on', flagMode);
      b.setAttribute('aria-pressed', flagMode);
      b.textContent = `🚩 旗モード:${flagMode ? 'ON' : 'OFF'}`;
    });
    newGame();

    return () => { clearInterval(timer); cancelPress(); };
  },
});

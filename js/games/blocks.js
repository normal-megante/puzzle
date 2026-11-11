// ブロック置き(いろいろな形のピースを 8×8 の盤面に置く。たて・よこ1列がうまると消える)
// grid[位置] = 0(空)または色番号。tray = 手持ちのピース3つ(置いたら null)。3つとも置くと新しい3つが出る。
// 手持ちのどのピースも置けなくなったらゲームオーバー。
// 操作:ピースを指でつかんで盤面まで引っぱり、はなす(ピースは指より少し上に表示して、指でかくれないようにする)。
'use strict';

registerPuzzle({
  id: 'blocks',
  name: 'ブロック置き',
  icon: '🟪',
  desc: 'ピースを置いて、たて・よこの列をそろえて消そう',

  start(root, api) {
    const N = 8;
    const COLORS = ['', '#e5484d', '#3b7dd8', '#2fa66a', '#e0a100', '#8e5bd6', '#1fa3a3', '#f08a24'];
    // ピースの形(■ のあるマスを [列, 行] で書く)
    const SHAPES = [
      [[0, 0]],
      [[0, 0], [1, 0]], [[0, 0], [0, 1]],
      [[0, 0], [1, 0], [2, 0]], [[0, 0], [0, 1], [0, 2]],
      [[0, 0], [1, 0], [0, 1]], [[0, 0], [1, 0], [1, 1]], [[0, 0], [0, 1], [1, 1]], [[1, 0], [0, 1], [1, 1]],
      [[0, 0], [1, 0], [0, 1], [1, 1]],
      [[0, 0], [1, 0], [2, 0], [3, 0]], [[0, 0], [0, 1], [0, 2], [0, 3]],
      [[0, 0], [1, 0], [2, 0], [1, 1]], [[1, 0], [0, 1], [1, 1], [2, 1]],
      [[0, 0], [0, 1], [0, 2], [1, 2]], [[0, 0], [1, 0], [2, 0], [0, 1]], [[1, 0], [1, 1], [1, 2], [0, 2]], [[2, 0], [0, 1], [1, 1], [2, 1]],
      [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]], [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]],
      [[0, 0], [1, 0], [2, 0], [0, 1], [0, 2]], [[0, 0], [1, 0], [2, 0], [2, 1], [2, 2]],
      [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1], [0, 2], [1, 2], [2, 2]],
    ];
    let grid, tray, score, over, drag = null;
    let cellEls = [];

    root.innerHTML = `
      <div class="row"><button class="btn primary" id="bp-new">新しいゲーム</button></div>
      <div class="stats">
        <div><small>スコア</small><b id="bp-score">0</b></div>
        <div><small>ベスト</small><b id="bp-best">-</b></div>
      </div>
      <div class="bp-board" id="bp-board"></div>
      <p class="msg" id="bp-msg"></p>
      <div class="bp-tray" id="bp-tray"></div>
      <p class="note">下のピースを指でつかんで、盤面まで引っぱってはなすと置けます(置ける場所は色がついて見えます)。ピースは回せません。<br>たて・よこの1列が全部うまると消えます。一度に何列も消すと高得点。3つとも置くと次の3つが出ます。<br>どのピースも置けなくなるとおしまいです。</p>`;

    const $ = id => root.querySelector('#' + id);
    const board = $('bp-board'), trayEl = $('bp-tray');
    board.innerHTML = Array.from({ length: N * N }, () => '<span class="bp-cell"></span>').join('');
    cellEls = [...board.children];

    const fits = (shape, x, y) => shape.every(([dx, dy]) => x + dx >= 0 && y + dy >= 0 && x + dx < N && y + dy < N && !grid[(y + dy) * N + x + dx]);
    const fitsAnywhere = shape => { for (let i = 0; i < N * N; i++) if (fits(shape, i % N, Math.floor(i / N))) return true; return false; };
    const newPiece = () => ({ shape: SHAPES[Math.floor(Math.random() * SHAPES.length)], c: 1 + Math.floor(Math.random() * 7) });

    function showBest() {
      const b = api.load('best', null);
      $('bp-best').textContent = b === null ? '-' : b;
    }

    function paint(hint) { // hint = { cells: [位置...], c } ドラッグ中の「ここに置ける」表示
      cellEls.forEach((el, i) => {
        const h = hint && hint.cells.includes(i);
        el.style.background = grid[i] ? COLORS[grid[i]] : h ? COLORS[hint.c] : '';
        el.className = 'bp-cell' + (grid[i] ? ' on' : h ? ' hint' : '');
      });
      trayEl.innerHTML = tray.map((p, k) => {
        if (!p) return '<span class="bp-slot"></span>';
        const w = Math.max(...p.shape.map(s => s[0])) + 1, h = Math.max(...p.shape.map(s => s[1])) + 1;
        const cells = p.shape.map(([x, y]) => `<i style="grid-column:${x + 1};grid-row:${y + 1};background:${COLORS[p.c]}"></i>`).join('');
        return `<button class="bp-slot${fitsAnywhere(p.shape) ? '' : ' dead'}${drag && drag.k === k ? ' lifted' : ''}" data-k="${k}" aria-label="ピース${k + 1}">`
          + `<span class="bp-piece" style="grid-template-columns:repeat(${w},1fr);aspect-ratio:${w}/${h};width:${w * 20}%">${cells}</span></button>`;
      }).join('');
      $('bp-score').textContent = score;
    }

    function finish() {
      over = true;
      const old = api.load('best', null);
      const isNew = old === null || score > old;
      if (isNew) api.save('best', score);
      showBest();
      $('bp-msg').textContent = `置けるピースがなくなりました。スコア ${score}` + (isNew && score > 0 ? '(新記録)' : '');
    }

    function place(k, x, y) {
      const p = tray[k];
      p.shape.forEach(([dx, dy]) => { grid[(y + dy) * N + x + dx] = p.c; });
      score += p.shape.length;
      tray[k] = null;
      // そろった列を消す(たて・よこを同時に調べてから消す)
      const rows = [], cols = [];
      for (let a = 0; a < N; a++) {
        if ([...Array(N).keys()].every(b => grid[a * N + b])) rows.push(a);
        if ([...Array(N).keys()].every(b => grid[b * N + a])) cols.push(a);
      }
      rows.forEach(r => { for (let c = 0; c < N; c++) grid[r * N + c] = 0; });
      cols.forEach(c => { for (let r = 0; r < N; r++) grid[r * N + c] = 0; });
      const lines = rows.length + cols.length;
      if (lines) { score += lines * lines * 10; $('bp-msg').textContent = lines > 1 ? `${lines}列まとめて消した!` : ''; }
      if (tray.every(t => !t)) tray = [newPiece(), newPiece(), newPiece()];
      if (!tray.some(t => t && fitsAnywhere(t.shape))) finish();
    }

    // --- ドラッグ ---
    let ghost = null;
    function target(e) { // 指の位置から、ピースの左上を置くマス [列, 行] を求める
      const r = board.getBoundingClientRect(), cell = r.width / N;
      const w = Math.max(...drag.p.shape.map(s => s[0])) + 1, h = Math.max(...drag.p.shape.map(s => s[1])) + 1;
      const gx = e.clientX - w * cell / 2, gy = e.clientY - drag.lift - h * cell; // ピースは指の上に出す
      ghost.style.left = gx + 'px';
      ghost.style.top = gy + 'px';
      return [Math.round((gx - r.left) / cell), Math.round((gy - r.top) / cell)];
    }
    trayEl.addEventListener('pointerdown', e => {
      const el = e.target.closest('[data-k]');
      if (!el || over) return;
      e.preventDefault();
      const k = +el.dataset.k, p = tray[k];
      const cell = board.getBoundingClientRect().width / N;
      drag = { k, p, lift: e.pointerType === 'mouse' ? 0 : 36 };
      ghost = document.createElement('div');
      ghost.className = 'bp-ghost';
      ghost.innerHTML = p.shape.map(([x, y]) => `<i style="left:${x * cell}px;top:${y * cell}px;width:${cell - 2}px;height:${cell - 2}px;background:${COLORS[p.c]}"></i>`).join('');
      document.body.appendChild(ghost);
      $('bp-msg').textContent = '';
      const [x, y] = target(e);
      paint(fits(p.shape, x, y) ? { cells: p.shape.map(([dx, dy]) => (y + dy) * N + x + dx), c: p.c } : null);
    });
    function onMove(e) {
      if (!drag) return;
      const [x, y] = target(e), p = drag.p;
      const hint = fits(p.shape, x, y) ? { cells: p.shape.map(([dx, dy]) => (y + dy) * N + x + dx), c: p.c } : null;
      cellEls.forEach((el, i) => { // 軽くするため、盤面のマスだけ更新する
        const h = hint && hint.cells.includes(i);
        el.style.background = grid[i] ? COLORS[grid[i]] : h ? COLORS[p.c] : '';
        el.className = 'bp-cell' + (grid[i] ? ' on' : h ? ' hint' : '');
      });
    }
    function onUp(e) {
      if (!drag) return;
      const [x, y] = e.type === 'pointercancel' ? [-9, -9] : target(e);
      const { k, p } = drag;
      drag = null;
      ghost.remove();
      ghost = null;
      if (fits(p.shape, x, y)) place(k, x, y);
      paint();
    }
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onUp);

    function newGame() {
      grid = Array(N * N).fill(0);
      tray = [newPiece(), newPiece(), newPiece()];
      score = 0; over = false;
      $('bp-msg').textContent = '';
      showBest();
      paint();
    }
    $('bp-new').addEventListener('click', newGame);
    newGame();

    return () => {
      if (ghost) ghost.remove();
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', onUp);
    };
  },
});

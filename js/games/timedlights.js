// 時限ライツアウト(オリジナル)
// ふつうのライツアウトと同じく押すと十字に反転するが、押した効果は K 手しか続かない。
// queue = まだ効いている「押し」[{pos, left}]。1手ごとに left が減り、0 になるとその押しが元に戻る。
// → いつも「最後の K 手」だけが有効。問題は K 個のマスを押して作るので、その K 個を続けて押せば解ける。
'use strict';

registerPuzzle({
  id: 'timedlights',
  name: '時限ライツアウト',
  icon: '⏳',
  desc: 'オリジナル:押した効果は数手で消える。その間に全部消そう',

  start(root, api) {
    const N = 5;
    let K = api.load('window', 3);
    if (![3, 4, 5].includes(K)) K = 3;
    let lit, first, queue, moves, done;
    let cellEls = [];

    root.innerHTML = `
      <div class="row" id="tl-sizes">
        ${[3, 4, 5].map(k => `<button class="btn" data-k="${k}">${k}手もつ</button>`).join('')}
      </div>
      <p class="note" style="margin:-4px 0 12px">数が大きいほど難しくなります(続けて押す必要があるマスの数が増えます)。</p>
      <div class="row">
        <button class="btn" id="tl-retry">最初から</button>
        <button class="btn primary" id="tl-new">新しい問題</button>
      </div>
      <div class="stats">
        <div><small>手数</small><b id="tl-moves">0</b></div>
        <div><small>ベスト手数</small><b id="tl-best">-</b></div>
      </div>
      <div class="l-board tl" id="tl-board"></div>
      <p class="msg" id="tl-msg"></p>
      <p class="note">押すと、そのマスと上下左右が反転します。ただし<b>押した効果は <span id="tl-k"></span> 手しか続きません</b>。<br>マスの数字は「あと何手で効果が切れるか」。次に押した時に 1 のマスは元に戻ります。<br>つまり有効なのは最後の <span id="tl-k2"></span> 手だけ。続けて押すと全部消える <span id="tl-k3"></span> マスの組み合わせを探そう。</p>`;

    const $ = id => root.querySelector('#' + id);
    const board = $('tl-board');
    board.style.setProperty('--n', N);

    function toggle(pos) {
      const r = Math.floor(pos / N), c = pos % N;
      for (const [dr, dc] of [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]]) {
        const rr = r + dr, cc = c + dc;
        if (rr >= 0 && rr < N && cc >= 0 && cc < N) lit[rr * N + cc] = !lit[rr * N + cc];
      }
    }

    function showBest() {
      const b = api.load('best' + K, null);
      $('tl-best').textContent = b === null ? '-' : b;
    }

    function paint() {
      cellEls.forEach((el, i) => {
        el.classList.toggle('on', lit[i]);
        const q = queue.filter(x => x.pos === i).pop();
        el.textContent = q ? q.left : '';
      });
      $('tl-moves').textContent = moves;
    }

    function reset() {
      lit = first.slice();
      queue = []; moves = 0; done = false;
      $('tl-msg').textContent = '';
      paint();
    }

    function newGame() {
      const cells = Array.from({ length: N * N }, (_, i) => i).sort(() => Math.random() - 0.5).slice(0, K);
      lit = Array(N * N).fill(false);
      cells.forEach(toggle);
      first = lit.slice();
      board.innerHTML = '';
      cellEls = lit.map((_, i) => {
        const b = document.createElement('button');
        b.className = 'l-cell';
        b.addEventListener('click', () => press(i));
        board.appendChild(b);
        return b;
      });
      root.querySelectorAll('[data-k]').forEach(b => b.classList.toggle('on', +b.dataset.k === K));
      ['tl-k', 'tl-k2', 'tl-k3'].forEach(id => { $(id).textContent = K; });
      showBest();
      reset();
    }

    function press(pos) {
      if (done) return;
      moves++;
      queue.forEach(q => { q.left--; });
      queue.filter(q => q.left === 0).forEach(q => toggle(q.pos)); // 効果切れ:元に戻す
      queue = queue.filter(q => q.left > 0);
      toggle(pos);
      queue.push({ pos, left: K });
      if (!lit.includes(true)) {
        done = true;
        const old = api.load('best' + K, null);
        const isNew = old === null || moves < old;
        if (isNew) api.save('best' + K, moves);
        showBest();
        $('tl-msg').textContent = `🎉 クリア! ${moves}手` + (isNew ? '(新記録)' : '');
      }
      paint();
    }

    $('tl-sizes').addEventListener('click', e => {
      const k = e.target.dataset.k;
      if (k) { K = +k; api.save('window', K); newGame(); }
    });
    $('tl-new').addEventListener('click', newGame);
    $('tl-retry').addEventListener('click', reset);
    newGame();
  },
});

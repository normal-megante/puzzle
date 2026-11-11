// ハノイの塔(円盤 3〜7 枚)
// pegs[棒] = 円盤の大きさの配列(下から順)。左の棒から右の棒へ全部移す。
'use strict';

registerPuzzle({
  id: 'hanoi',
  name: 'ハノイの塔',
  icon: '🗼',
  desc: '円盤を1枚ずつ動かして、右の棒に全部移そう',

  start(root, api) {
    let n = api.load('discs', 4);
    if (!(n >= 3 && n <= 7)) n = 4;
    let pegs, sel, moves, done;

    root.innerHTML = `
      <div class="row" id="h-sizes">
        ${[3, 4, 5, 6, 7].map(s => `<button class="btn" data-discs="${s}">${s}枚</button>`).join('')}
      </div>
      <div class="row"><button class="btn primary" id="h-new">最初から</button></div>
      <div class="stats">
        <div><small>手数(最少 <span id="h-min"></span>)</small><b id="h-moves">0</b></div>
        <div><small>時間</small><b id="h-time">0:00</b></div>
        <div><small>ベスト手数</small><b id="h-best">-</b></div>
      </div>
      <div class="h-board" id="h-board">
        ${[0, 1, 2].map(p => `<button class="h-peg" data-peg="${p}" aria-label="${['左', '真ん中', '右'][p]}の棒"></button>`).join('')}
      </div>
      <p class="msg" id="h-msg"></p>
      <p class="note">棒をタップして一番上の円盤を選び、移したい棒をタップします。<br>小さい円盤の上に大きい円盤は置けません。ゴールは右の棒(★)です。</p>`;

    const $ = id => root.querySelector('#' + id);
    const pegEls = [...root.querySelectorAll('.h-peg')];
    const timer = api.timer($('h-time'));

    function showBest() {
      const b = api.load('best' + n, null);
      $('h-best').textContent = b === null ? '-' : b;
    }

    function paint() {
      pegEls.forEach((el, p) => {
        el.innerHTML = (p === 2 ? '<span class="h-goal">★</span>' : '') + pegs[p].slice().reverse().map((d, k) =>
          `<span class="h-disc${p === sel && k === 0 ? ' up' : ''}" style="width:${28 + 72 * d / n}%;background:hsl(${d * 47 % 360} 62% 50%)"></span>`
        ).join('');
      });
      $('h-moves').textContent = moves;
    }

    function newGame() {
      pegs = [Array.from({ length: n }, (_, i) => n - i), [], []];
      sel = -1; moves = 0; done = false;
      root.querySelectorAll('[data-discs]').forEach(b => b.classList.toggle('on', +b.dataset.discs === n));
      $('h-min').textContent = 2 ** n - 1;
      $('h-msg').textContent = '';
      timer.reset();
      showBest();
      paint();
    }

    function tapPeg(p) {
      if (done) return;
      $('h-msg').textContent = '';
      if (sel < 0) {
        if (pegs[p].length) sel = p;
      } else if (sel === p) {
        sel = -1;
      } else {
        const d = pegs[sel].at(-1), top = pegs[p].at(-1);
        if (top !== undefined && top < d) {
          $('h-msg').textContent = '小さい円盤の上には置けません';
        } else {
          pegs[p].push(pegs[sel].pop());
          moves++;
          timer.start();
          if (pegs[2].length === n) win();
        }
        sel = -1;
      }
      paint();
    }

    function win() {
      done = true;
      const time = timer.stop();
      const old = api.load('best' + n, null);
      const isNew = old === null || moves < old;
      if (isNew) api.save('best' + n, moves);
      showBest();
      $('h-msg').textContent = `🎉 クリア! ${moves}手・${api.fmtTime(time)}`
        + (moves === 2 ** n - 1 ? '(最少手数!)' : isNew ? '(新記録)' : '');
    }

    $('h-board').addEventListener('click', e => {
      const el = e.target.closest('[data-peg]');
      if (el) tapPeg(+el.dataset.peg);
    });
    $('h-sizes').addEventListener('click', e => {
      const s = e.target.dataset.discs;
      if (s) { n = +s; api.save('discs', n); newGame(); }
    });
    $('h-new').addEventListener('click', newGame);
    newGame();

    return () => timer.reset();
  },
});

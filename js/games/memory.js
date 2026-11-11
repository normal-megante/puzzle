// 神経衰弱(12 / 16 / 20 枚)
// st[位置]: 0=裏 1=めくり中 2=そろった
'use strict';

registerPuzzle({
  id: 'memory',
  name: '神経衰弱',
  icon: '🃏',
  desc: 'カードをめくって同じ絵のペアを見つけよう',

  start(root, api) {
    const PICS = ['🍎', '🍌', '🍇', '🍓', '🍊', '🍉', '🍒', '🥝', '🍑', '🍍'];
    let n = api.load('cards', 16);
    if (![12, 16, 20].includes(n)) n = 16;
    let cards, st, openIdx, tries, done, hideTimer = null;
    let cardEls = [];

    root.innerHTML = `
      <div class="row" id="c-sizes">
        ${[12, 16, 20].map(s => `<button class="btn" data-cards="${s}">${s}枚</button>`).join('')}
        <button class="btn primary" id="c-new">配り直す</button>
      </div>
      <div class="stats">
        <div><small>めくった回数</small><b id="c-tries">0</b></div>
        <div><small>時間</small><b id="c-time">0:00</b></div>
        <div><small>ベスト(回数 / 時間)</small><b id="c-best">-</b></div>
      </div>
      <div class="c-board" id="c-board"></div>
      <p class="msg" id="c-msg"></p>
      <p class="note">2枚めくって1回と数えます。はずれたカードは少し待つと裏に戻ります(待たずに次をめくってもOK)。</p>`;

    const $ = id => root.querySelector('#' + id);
    const board = $('c-board');
    const timer = api.timer($('c-time'));

    function showBest() {
      const b = api.load('best' + n, null);
      $('c-best').textContent = b ? `${b.tries} / ${api.fmtTime(b.time)}` : '-';
    }

    function paint() {
      cardEls.forEach((el, i) => {
        el.className = 'c-card' + (st[i] ? ' open' : '') + (st[i] === 2 ? ' matched' : '');
        el.textContent = st[i] ? cards[i] : '';
        el.setAttribute('aria-label', st[i] ? cards[i] : '裏向きのカード');
      });
      $('c-tries').textContent = tries;
    }

    function closeOpen() {
      clearTimeout(hideTimer);
      hideTimer = null;
      openIdx.forEach(i => { st[i] = 0; });
      openIdx = [];
    }

    function newGame() {
      clearTimeout(hideTimer);
      cards = PICS.slice(0, n / 2).flatMap(p => [p, p]);
      for (let i = cards.length - 1; i > 0; i--) { // シャッフル
        const j = Math.floor(Math.random() * (i + 1));
        [cards[i], cards[j]] = [cards[j], cards[i]];
      }
      st = Array(n).fill(0);
      openIdx = []; tries = 0; done = false;
      board.innerHTML = '';
      cardEls = cards.map((_, i) => {
        const b = document.createElement('button');
        b.addEventListener('click', () => tap(i));
        board.appendChild(b);
        return b;
      });
      root.querySelectorAll('[data-cards]').forEach(b => b.classList.toggle('on', +b.dataset.cards === n));
      timer.reset();
      $('c-msg').textContent = '';
      showBest();
      paint();
    }

    function tap(i) {
      if (done || st[i] !== 0) return;
      if (openIdx.length === 2) closeOpen();
      timer.start();
      st[i] = 1;
      openIdx.push(i);
      if (openIdx.length === 2) {
        tries++;
        const [a, b] = openIdx;
        if (cards[a] === cards[b]) {
          st[a] = st[b] = 2;
          openIdx = [];
          if (st.every(s => s === 2)) win();
        } else {
          hideTimer = setTimeout(() => { closeOpen(); paint(); }, 900);
        }
      }
      paint();
    }

    function win() {
      done = true;
      const time = timer.stop();
      const old = api.load('best' + n, null);
      const best = old
        ? { tries: Math.min(old.tries, tries), time: Math.min(old.time, time) }
        : { tries, time };
      const isNew = !old || best.tries < old.tries || best.time < old.time;
      api.save('best' + n, best);
      showBest();
      $('c-msg').textContent = `🎉 クリア! ${tries}回・${api.fmtTime(time)}` + (isNew ? '(新記録)' : '');
    }

    $('c-sizes').addEventListener('click', e => {
      const s = e.target.dataset.cards;
      if (s) { n = +s; api.save('cards', n); }
      if (s || e.target.id === 'c-new') newGame();
    });
    newGame();

    return () => { clearTimeout(hideTimer); timer.reset(); };
  },
});

// ひとりにしてくれ(重なっている数字を黒くぬって、各行・各列で同じ数字が1つずつになるようにする)
// val[位置]=数字 / st[位置]: 0=そのまま 1=黒 2=○(残すと決めた目印)
// ルール:①白いマスでは、各行・各列に同じ数字が2つあってはいけない ②黒マスはたて・よこにとなり合えない ③白マスは全部ひとつながり
// 問題は自動で作る:数字が重ならない盤面 → 黒マスの場所をこれ以上置けなくなるまで決める → 黒マスの数字を同じ行か列の数字に書きかえる。
// 答えは1つとは限らないので、ルールを全部満たしていればクリアとする。
'use strict';

registerPuzzle({
  id: 'hitori',
  name: 'ひとりにしてくれ',
  icon: '⬛',
  desc: '重なった数字を黒くぬって、同じ数字をひとりぼっちにしよう',

  start(root, api) {
    let n = api.load('size', 5);
    if (![5, 6, 8].includes(n)) n = 5;
    let val, st, done;
    let cellEls = [];

    const adj = i => [i % n > 0 ? i - 1 : -1, i % n < n - 1 ? i + 1 : -1, i - n, i + n].filter(k => k >= 0 && k < n * n);

    function whitesConnected(isBlack) {
      const start = isBlack.indexOf(false);
      if (start < 0) return false;
      const seen = new Set([start]), q = [start];
      for (let k = 0; k < q.length; k++) for (const j of adj(q[k])) if (!isBlack[j] && !seen.has(j)) { seen.add(j); q.push(j); }
      return seen.size === isBlack.filter(b => !b).length;
    }

    function generate() {
      const shuffle = a => a.sort(() => Math.random() - 0.5);
      const rp = shuffle([...Array(n).keys()]), cp = shuffle([...Array(n).keys()]), dp = shuffle([...Array(n).keys()]);
      val = Array.from({ length: n * n }, (_, i) => dp[(rp[Math.floor(i / n)] + cp[i % n]) % n] + 1);
      const black = Array(n * n).fill(false);
      for (const c of shuffle([...Array(n * n).keys()])) {
        if (adj(c).some(k => black[k])) continue;
        black[c] = true;
        if (!whitesConnected(black)) black[c] = false;
      }
      black.forEach((b, c) => {
        if (!b) return;
        const opts = [...Array(n * n).keys()].filter(k => !black[k] && k !== c && (Math.floor(k / n) === Math.floor(c / n) || k % n === c % n));
        val[c] = val[opts[Math.floor(Math.random() * opts.length)]];
      });
    }

    root.innerHTML = `
      <div class="row" id="ht-sizes">
        ${[5, 6, 8].map(s => `<button class="btn" data-size="${s}">${s}×${s}</button>`).join('')}
        <button class="btn primary" id="ht-new">新しい問題</button>
      </div>
      <div class="stats">
        <div><small>重なっている数字</small><b id="ht-dup">0</b></div>
        <div><small>時間</small><b id="ht-time">0:00</b></div>
        <div><small>ベスト時間</small><b id="ht-best">-</b></div>
      </div>
      <div class="row"><button class="btn" id="ht-clear">全部もどす</button></div>
      <div class="ht-board" id="ht-board"></div>
      <p class="msg" id="ht-msg"></p>
      <p class="note">マスをタップすると 黒 → ○(残すと決めた目印)→ もとに戻る の順に変わります。<br>①同じ行・列で数字が重なっているマス(赤い数字)を、黒くぬって消します。<br>②<b>黒マスどうしは、たて・よこにとなり合えません</b>(赤くなります)。<br>③<b>白いマスは全部ひとつながり</b>でなければいけません(黒マスで分断しない)。<br>3つとも満たせばクリア。答えは1つとは限りません。</p>`;

    const $ = id => root.querySelector('#' + id);
    const board = $('ht-board');
    const timer = api.timer($('ht-time'));

    function showBest() {
      const b = api.load('best' + n, null);
      $('ht-best').textContent = b === null ? '-' : api.fmtTime(b);
    }

    function paint() {
      const isBlack = st.map(s => s === 1);
      let dups = 0, touching = false;
      cellEls.forEach((el, i) => {
        const r = Math.floor(i / n), c = i % n;
        const dup = !isBlack[i] && val.some((v, j) => j !== i && !isBlack[j] && v === val[i] && (Math.floor(j / n) === r || j % n === c));
        const touch = isBlack[i] && adj(i).some(k => isBlack[k]);
        if (dup) dups++;
        if (touch) touching = true;
        el.className = 'ht-cell' + (isBlack[i] ? ' black' : st[i] === 2 ? ' keep' : '') + (dup ? ' dup' : '') + (touch ? ' bad' : '');
      });
      $('ht-dup').textContent = dups;
      const split = !whitesConnected(isBlack);
      $('ht-msg').textContent = touching ? '黒マスがとなり合っています' : split ? '白いマスが分断されています' : '';
      return dups === 0 && !touching && !split;
    }

    function newGame() {
      generate();
      st = Array(n * n).fill(0);
      done = false;
      board.style.setProperty('--n', n);
      board.innerHTML = val.map((v, i) => `<button class="ht-cell" data-i="${i}">${v}</button>`).join('');
      cellEls = [...board.children];
      root.querySelectorAll('[data-size]').forEach(b => b.classList.toggle('on', +b.dataset.size === n));
      timer.reset();
      showBest();
      paint();
    }

    board.addEventListener('click', e => {
      const el = e.target.closest('[data-i]');
      if (!el || done) return;
      const i = +el.dataset.i;
      st[i] = (st[i] + 1) % 3;
      timer.start();
      if (paint()) {
        done = true;
        const time = timer.stop();
        const old = api.load('best' + n, null);
        const isNew = old === null || time < old;
        if (isNew) api.save('best' + n, time);
        showBest();
        $('ht-msg').textContent = `🎉 クリア! ${api.fmtTime(time)}` + (isNew ? '(新記録)' : '');
      }
    });
    $('ht-clear').addEventListener('click', () => { if (!done) { st.fill(0); paint(); } });
    $('ht-sizes').addEventListener('click', e => {
      const s = e.target.dataset.size;
      if (s) { n = +s; api.save('size', n); }
      if (s || e.target.id === 'ht-new') newGame();
    });
    newGame();

    return () => timer.reset();
  },
});

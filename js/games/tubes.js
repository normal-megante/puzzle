// 色水そろえ(試験管の色水をうつしかえて、同じ色だけにそろえる)
// tubes[k] = その試験管に入っている色の並び(下から順。最大 CAP 個)。
// うつせる条件:うつす先が空、または一番上が同じ色で、まだ空きがある。同じ色が続いている分はまとめて動く(入る分だけ)。
// 問題はランダムにまぜて作り、実際に解けるかを探索で確かめたものだけ出す。
'use strict';

registerPuzzle({
  id: 'tubes',
  name: '色水そろえ',
  icon: '🧪',
  desc: '試験管の色水をうつしかえて、同じ色にそろえよう',

  start(root, api) {
    const CAP = 4;
    const COLORS = ['#e5484d', '#3b7dd8', '#2fa66a', '#e0a100', '#8e5bd6', '#1fa3a3', '#f08a24', '#b0569a'];
    const MARKS = ['●', '■', '▲', '◆', '★', '♥', '♣', '✚'];
    let colors = api.load('colors', 4);
    if (![4, 6, 8].includes(colors)) colors = 4;
    let first, tubes, sel, moves, history, done;

    root.innerHTML = `
      <div class="row" id="tb-sizes">
        ${[4, 6, 8].map(s => `<button class="btn" data-colors="${s}">${s}色</button>`).join('')}
      </div>
      <div class="row">
        <button class="btn" id="tb-undo">1手戻す</button>
        <button class="btn" id="tb-retry">最初から</button>
        <button class="btn primary" id="tb-new">新しい問題</button>
      </div>
      <div class="stats">
        <div><small>手数</small><b id="tb-moves">0</b></div>
        <div><small>そろった色</small><b id="tb-count">0</b></div>
        <div><small>クリアした数</small><b id="tb-clears">0</b></div>
      </div>
      <div class="tb-board" id="tb-board"></div>
      <p class="msg" id="tb-msg"></p>
      <p class="note">うつしたい試験管をタップ → うつす先の試験管をタップ。<br>うつせるのは、<b>うつす先が空</b>か、<b>一番上が同じ色</b>で空きがある時だけ。同じ色が続いている分はまとめて動きます。<br>全部の試験管が「同じ色だけでいっぱい」か「空」になればクリア。空の試験管が2本あるので、うまく使いましょう。</p>`;

    const $ = id => root.querySelector('#' + id);
    const board = $('tb-board');

    const top = t => t[t.length - 1];
    const uniform = t => t.length === CAP && t.every(c => c === t[0]);
    const solvedAll = ts => ts.every(t => !t.length || uniform(t));
    const canPour = (ts, a, b) => a !== b && ts[a].length && ts[b].length < CAP && (!ts[b].length || top(ts[b]) === top(ts[a]));
    function pour(ts, a, b) { // 同じ色が続いている分を、入るだけうつす
      const c = top(ts[a]);
      while (ts[a].length && top(ts[a]) === c && ts[b].length < CAP) ts[b].push(ts[a].pop());
    }

    function solvable(start) { // 深さ優先で探す(調べた形は覚えておく)。見つからない・時間切れなら false
      const seen = new Set();
      let steps = 0;
      const key = ts => ts.map(t => t.join('')).sort().join('|');
      return (function rec(ts) {
        if (solvedAll(ts)) return true;
        const k = key(ts);
        if (seen.has(k) || ++steps > 30000) return false;
        seen.add(k);
        for (let a = 0; a < ts.length; a++) {
          if (!ts[a].length || uniform(ts[a])) continue;
          for (let b = 0; b < ts.length; b++) {
            if (!canPour(ts, a, b)) continue;
            if (!ts[b].length && ts[a].every(c => c === ts[a][0])) continue; // 1色だけの管を空の管へ移すのはむだ
            const next = ts.map(t => t.slice());
            pour(next, a, b);
            if (rec(next)) return true;
          }
        }
        return false;
      })(start);
    }

    function generate() {
      for (;;) {
        const all = [];
        for (let c = 0; c < colors; c++) for (let k = 0; k < CAP; k++) all.push(c);
        all.sort(() => Math.random() - 0.5);
        const ts = Array.from({ length: colors }, (_, i) => all.slice(i * CAP, i * CAP + CAP)).concat([[], []]);
        if (ts.some(uniform)) continue; // 最初からそろっている管がある問題は出さない
        if (solvable(ts)) { first = ts; return; }
      }
    }

    function paint() {
      board.innerHTML = tubes.map((t, i) => `<button class="tb-tube${i === sel ? ' sel' : ''}${uniform(t) ? ' full' : ''}" data-t="${i}" aria-label="試験管${i + 1}">`
        + t.map(c => `<i style="background:${COLORS[c]}">${MARKS[c]}</i>`).join('') + '</button>').join('');
      $('tb-moves').textContent = moves;
      $('tb-count').textContent = `${tubes.filter(uniform).length} / ${colors}`;
      $('tb-undo').disabled = !history.length || done;
    }

    function reset() {
      tubes = first.map(t => t.slice());
      sel = -1; moves = 0; history = []; done = false;
      $('tb-msg').textContent = '';
      paint();
    }

    function newGame() {
      generate();
      board.style.setProperty('--cols', colors === 4 ? 6 : colors === 6 ? 4 : 5);
      root.querySelectorAll('[data-colors]').forEach(b => b.classList.toggle('on', +b.dataset.colors === colors));
      $('tb-clears').textContent = api.load('clears' + colors, 0);
      reset();
    }

    board.addEventListener('click', e => {
      const el = e.target.closest('[data-t]');
      if (!el || done) return;
      const i = +el.dataset.t;
      $('tb-msg').textContent = '';
      if (sel < 0) { if (tubes[i].length) sel = i; }
      else if (sel === i) sel = -1;
      else if (canPour(tubes, sel, i)) {
        history.push(tubes.map(t => t.slice()));
        pour(tubes, sel, i);
        moves++;
        sel = -1;
        if (solvedAll(tubes)) {
          done = true;
          const clears = api.load('clears' + colors, 0) + 1;
          api.save('clears' + colors, clears);
          $('tb-clears').textContent = clears;
          $('tb-msg').textContent = `🎉 クリア! ${moves}手`;
        }
      } else if (tubes[i].length) sel = i; // うつせない時は、選び直しとして扱う
      else sel = -1;
      paint();
    });
    $('tb-undo').addEventListener('click', () => {
      if (done || !history.length) return;
      tubes = history.pop();
      moves--;
      sel = -1;
      paint();
    });
    $('tb-retry').addEventListener('click', reset);
    $('tb-new').addEventListener('click', newGame);
    $('tb-sizes').addEventListener('click', e => {
      const s = e.target.dataset.colors;
      if (s) { colors = +s; api.save('colors', colors); newGame(); }
    });
    newGame();
  },
});

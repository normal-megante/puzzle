// ヒット&ブロー(3桁 / 4桁。数字はすべて違う)
'use strict';

registerPuzzle({
  id: 'hitblow',
  name: 'ヒット&ブロー',
  icon: '🎯',
  desc: 'ヒントをたよりに、隠れた数字の並びを当てよう',

  start(root, api) {
    let len = api.load('len', 4);
    if (len !== 3 && len !== 4) len = 4;
    let answer, cur, tries, done;

    root.innerHTML = `
      <div class="row" id="b-sizes">
        ${[3, 4].map(s => `<button class="btn" data-len="${s}">${s}桁</button>`).join('')}
        <button class="btn primary" id="b-new">新しいゲーム</button>
      </div>
      <div class="stats">
        <div><small>回数</small><b id="b-tries">0</b></div>
        <div><small>ベスト回数</small><b id="b-best">-</b></div>
      </div>
      <div class="b-cur" id="b-cur"></div>
      <div class="b-pad" id="b-pad">
        ${[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map(d => `<button class="btn" data-d="${d}">${d}</button>`).join('')}
        <button class="btn" data-act="del" aria-label="1文字消す">⌫</button>
        <button class="btn primary" data-act="ok">決定</button>
      </div>
      <p class="note" style="margin-bottom:12px">同じ数字は2回使えません。<br><b>ヒット</b>=数字も場所も正解 / <b>ブロー</b>=数字は合っているが場所が違う</p>
      <p class="msg" id="b-msg"></p>
      <ol class="b-log" id="b-log"></ol>
      <div class="row"><button class="btn" id="b-giveup">降参して答えを見る</button></div>`;

    const $ = id => root.querySelector('#' + id);

    function showBest() {
      const b = api.load('best' + len, null);
      $('b-best').textContent = b === null ? '-' : b;
    }

    function paint() {
      $('b-cur').innerHTML = Array.from({ length: len }, (_, i) => `<span>${cur[i] ?? ''}</span>`).join('');
      root.querySelectorAll('[data-d]').forEach(b => { b.disabled = done || cur.includes(+b.dataset.d); });
      $('b-tries').textContent = tries;
    }

    function newGame() {
      const ds = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
      for (let i = ds.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [ds[i], ds[j]] = [ds[j], ds[i]];
      }
      answer = ds.slice(0, len);
      cur = []; tries = 0; done = false;
      $('b-log').innerHTML = '';
      $('b-msg').textContent = '';
      root.querySelectorAll('[data-len]').forEach(b => b.classList.toggle('on', +b.dataset.len === len));
      showBest();
      paint();
    }

    function submit() {
      if (done) return;
      if (cur.length < len) { $('b-msg').textContent = `${len}個の数字を入れてください`; return; }
      $('b-msg').textContent = '';
      tries++;
      const hit = cur.filter((d, i) => answer[i] === d).length;
      const blow = cur.filter(d => answer.includes(d)).length - hit;
      const li = document.createElement('li');
      li.innerHTML = `<b>${cur.join('')}</b><span>${hit} ヒット・${blow} ブロー</span>`;
      $('b-log').prepend(li);
      if (hit === len) {
        done = true;
        const old = api.load('best' + len, null);
        const isNew = old === null || tries < old;
        if (isNew) api.save('best' + len, tries);
        showBest();
        $('b-msg').textContent = `🎉 正解! ${tries}回で当てました` + (isNew ? '(新記録)' : '');
      }
      cur = [];
      paint();
    }

    function input(d) {
      if (done || cur.length >= len || cur.includes(d)) return;
      cur.push(d);
      paint();
    }
    function del() { if (!done) { cur.pop(); paint(); } }

    $('b-pad').addEventListener('click', e => {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.d !== undefined) input(+b.dataset.d);
      else if (b.dataset.act === 'del') del();
      else submit();
    });
    function onKey(e) {
      if (/^[0-9]$/.test(e.key)) input(+e.key);
      else if (e.key === 'Backspace') del();
      else if (e.key === 'Enter') { e.preventDefault(); submit(); }
    }
    document.addEventListener('keydown', onKey);
    $('b-sizes').addEventListener('click', e => {
      const s = e.target.dataset.len;
      if (s) { len = +s; api.save('len', len); }
      if (s || e.target.id === 'b-new') newGame();
    });
    $('b-giveup').addEventListener('click', () => {
      if (done) return;
      done = true;
      $('b-msg').textContent = `答えは ${answer.join('')} でした`;
      paint();
    });
    newGame();

    return () => document.removeEventListener('keydown', onKey);
  },
});

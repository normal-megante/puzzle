// 光の順番(光った順番を覚えて、同じ順にタップする。1回成功するごとに1つ長くなる)
// phase: idle=開始前 / show=お手本を表示中 / input=入力待ち / over=まちがえた
'use strict';

registerPuzzle({
  id: 'seq',
  name: '光の順番',
  icon: '✨',
  desc: '光った順番を覚えて、同じ順にタップしよう',

  start(root, api) {
    let n = api.load('pads', 4);
    if (n !== 4 && n !== 9) n = 4;
    let sound = api.load('sound', false);
    let seq = [], idx = 0, phase = 'idle', timers = [], audio = null;
    let padEls = [];

    root.innerHTML = `
      <div class="row" id="q-sizes">
        ${[4, 9].map(s => `<button class="btn" data-pads="${s}">${s}マス</button>`).join('')}
        <button class="btn primary" id="q-start">スタート</button>
      </div>
      <div class="stats">
        <div><small>成功した長さ</small><b id="q-level">0</b></div>
        <div><small>ベスト</small><b id="q-best">-</b></div>
      </div>
      <div class="q-board" id="q-board"></div>
      <p class="msg" id="q-msg"></p>
      <div class="row"><button class="btn" id="q-sound"></button></div>
      <p class="note">「スタート」を押すとマスが順番に光ります。光り終わったら、同じ順番でタップしてください。<br>成功するたびに1つずつ長くなり、少しずつ速くなります。音は端末の音量で鳴ります(マナーモードでは鳴らないことがあります)。</p>`;

    const $ = id => root.querySelector('#' + id);
    const board = $('q-board');
    const later = (fn, ms) => { timers.push(setTimeout(fn, ms)); };
    const clearAll = () => { timers.forEach(clearTimeout); timers = []; };

    function beep(p, ok = true) {
      if (!sound) return;
      try {
        audio = audio || new (window.AudioContext || window.webkitAudioContext)();
        const o = audio.createOscillator(), g = audio.createGain();
        o.frequency.value = ok ? 262 * 2 ** (p * (n === 4 ? 4 : 2) / 12) : 110;
        g.gain.value = 0.15;
        o.connect(g).connect(audio.destination);
        o.start();
        o.stop(audio.currentTime + (ok ? 0.25 : 0.5));
      } catch { /* 音が出せない端末でも遊べる */ }
    }

    function flash(p, ms) {
      padEls[p].classList.add('lit');
      beep(p);
      later(() => padEls[p].classList.remove('lit'), ms);
    }

    function showBest() {
      const b = api.load('best' + n, null);
      $('q-best').textContent = b === null ? '-' : b;
    }

    function setup() {
      clearAll();
      seq = []; phase = 'idle';
      const side = Math.sqrt(n);
      board.style.setProperty('--n', side);
      board.innerHTML = Array.from({ length: n }, (_, i) =>
        `<button class="q-pad" data-p="${i}" style="--c:hsl(${Math.round(i * 360 / n)} 70% 50%)" aria-label="${i + 1}番"></button>`).join('');
      padEls = [...board.children];
      root.querySelectorAll('[data-pads]').forEach(b => b.classList.toggle('on', +b.dataset.pads === n));
      $('q-level').textContent = 0;
      $('q-msg').textContent = '';
      $('q-sound').textContent = `🔊 音:${sound ? 'ON' : 'OFF'}`;
      $('q-sound').classList.toggle('on', sound);
      showBest();
    }

    function nextRound() {
      seq.push(Math.floor(Math.random() * n));
      idx = 0; phase = 'show';
      $('q-msg').textContent = '👀 よく見て…';
      const gap = Math.max(320, 650 - seq.length * 18);
      seq.forEach((p, k) => later(() => flash(p, gap * 0.6), 500 + k * gap));
      later(() => { phase = 'input'; $('q-msg').textContent = '👉 あなたの番'; }, 500 + seq.length * gap);
    }

    function tap(p) {
      if (phase !== 'input') return;
      if (p !== seq[idx]) {
        phase = 'over';
        beep(0, false);
        const score = seq.length - 1;
        const old = api.load('best' + n, null);
        const isNew = score > 0 && (old === null || score > old);
        if (isNew) api.save('best' + n, score);
        showBest();
        padEls[seq[idx]].classList.add('lit'); // 正しかったマスを見せる
        $('q-msg').textContent = `まちがい… 記録は ${score}` + (isNew ? '(新記録)' : '') + '。光っているのが正解でした';
        return;
      }
      flash(p, 180);
      idx++;
      if (idx === seq.length) {
        phase = 'show';
        $('q-level').textContent = seq.length;
        $('q-msg').textContent = '⭕ 正解!';
        later(nextRound, 800);
      }
    }

    board.addEventListener('click', e => {
      const el = e.target.closest('[data-p]');
      if (el) tap(+el.dataset.p);
    });
    $('q-start').addEventListener('click', () => { setup(); nextRound(); });
    $('q-sizes').addEventListener('click', e => {
      const s = e.target.dataset.pads;
      if (s) { n = +s; api.save('pads', n); setup(); }
    });
    $('q-sound').addEventListener('click', () => {
      sound = !sound;
      api.save('sound', sound);
      $('q-sound').textContent = `🔊 音:${sound ? 'ON' : 'OFF'}`;
      $('q-sound').classList.toggle('on', sound);
      if (sound) beep(0);
    });
    setup();

    return () => { clearAll(); if (audio) audio.close(); };
  },
});

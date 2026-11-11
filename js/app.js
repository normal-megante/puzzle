// パズル集の土台:パズルの登録、メニュー表示、画面切り替え、記録の保存
// 各パズルは js/games/*.js で registerPuzzle({...}) を呼んで登録する。
//   { id, name, icon, desc, start(root, api) }  start は「後片付け関数」を返してよい
'use strict';

const Puzzles = [];
function registerPuzzle(p) { Puzzles.push(p); }

function fmtTime(sec) {
  sec = Math.floor(sec);
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
}

// パズルごとの保存領域つき共通機能
function makeApi(id) {
  const key = k => `puzzle.${id}.${k}`;
  return {
    load(k, def) {
      try {
        const v = localStorage.getItem(key(k));
        return v === null ? def : JSON.parse(v);
      } catch { return def; }
    },
    save(k, v) {
      try { localStorage.setItem(key(k), JSON.stringify(v)); } catch { /* 保存不可でも遊べる */ }
    },
    fmtTime,
    // スワイプ検出。cb(向き) 向き: 0=左 1=上 2=右 3=下。el には CSS で touch-action: none を付ける。
    swipe(el, cb) {
      let sx = 0, sy = 0, down = false;
      el.addEventListener('pointerdown', e => { down = true; sx = e.clientX; sy = e.clientY; });
      el.addEventListener('pointercancel', () => { down = false; });
      el.addEventListener('pointerup', e => {
        if (!down) return;
        down = false;
        const dx = e.clientX - sx, dy = e.clientY - sy;
        if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
        cb(Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 0 : 2) : (dy < 0 ? 1 : 3));
      });
    },
    // 時間表示つきタイマー。start() は何度呼んでもよい。stop() は経過秒を返す。
    timer(el) {
      let t0 = 0, id = null, sec = 0;
      const show = () => { el.textContent = fmtTime(sec); };
      const tick = () => { sec = (Date.now() - t0) / 1000; show(); };
      return {
        start() { if (!id) { t0 = Date.now() - sec * 1000; id = setInterval(tick, 250); } },
        stop() { if (id) { clearInterval(id); id = null; tick(); } return sec; },
        reset() { clearInterval(id); id = null; sec = 0; show(); },
        set(s) { sec = s; if (id) t0 = Date.now() - sec * 1000; show(); }, // 途中保存からの再開用
        value() { if (id) sec = (Date.now() - t0) / 1000; return sec; },
      };
    },
  };
}

(() => {
  let cleanup = null;

  // メニューの分類。新しいパズルの id をどこかに足す(足し忘れると「その他」に出る)。
  const CATEGORIES = [
    ['オリジナル', ['mirror', 'mergebox', 'colorstroke', 'warplink', 'stepdown', 'gravity', 'shadow', 'timedlights']],
    ['動かす', ['fifteen', 'sokoban', 'cars', 'slide', 'ice', 'hanoi']],
    ['線・つなぐ', ['link', 'hashi', 'onestroke', 'pipes']],
    ['数字・論理', ['sudoku', 'kenken', 'nono', 'akari', 'star', 'minesweeper', 'lightsout', 'flip', 'hitblow', 'merge']],
    ['消す・覚える', ['same', 'match3', 'memory', 'seq']],
    ['アクション', ['fall', 'chain']],
  ];

  function showMenu(view) {
    const listed = new Set(CATEGORIES.flatMap(c => c[1]));
    const rest = Puzzles.filter(p => !listed.has(p.id)).map(p => p.id);
    for (const [title, ids] of [...CATEGORIES, ['その他', rest]]) {
      const items = ids.map(id => Puzzles.find(p => p.id === id)).filter(Boolean);
      if (!items.length) continue;
      const h = document.createElement('h2');
      h.className = 'menu-title';
      h.textContent = title;
      const list = document.createElement('div');
      list.className = 'menu';
      for (const p of items) {
        const a = document.createElement('a');
        a.className = 'card';
        a.href = '#' + p.id;
        a.innerHTML = `<span class="card-icon"></span><b></b><small></small>`;
        a.querySelector('.card-icon').textContent = p.icon;
        a.querySelector('b').textContent = p.name;
        a.querySelector('small').textContent = p.desc;
        list.appendChild(a);
      }
      view.append(h, list);
    }
  }

  function route() {
    const view = document.getElementById('view');
    const back = document.getElementById('back');
    const title = document.getElementById('title');
    if (cleanup) { try { cleanup(); } catch (e) { console.error(e); } cleanup = null; }
    view.innerHTML = '';
    window.scrollTo(0, 0);

    const p = Puzzles.find(x => x.id === location.hash.slice(1));
    if (p) {
      back.hidden = false;
      title.textContent = p.name;
      document.title = p.name + ' - パズル集';
      cleanup = p.start(view, makeApi(p.id)) || null;
    } else {
      back.hidden = true;
      title.textContent = 'パズル集';
      document.title = 'パズル集';
      showMenu(view);
    }
  }

  window.addEventListener('hashchange', route);
  window.addEventListener('DOMContentLoaded', () => {
    document.getElementById('back').addEventListener('click', () => { location.hash = ''; });
    route();
  });
})();

// オフライン対応(http/https で開いた時だけ。ダブルクリックで開いた時は何もしない)
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(console.error));
}

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
    // 時間表示つきタイマー。start() は何度呼んでもよい。stop() は経過秒を返す。
    timer(el) {
      let t0 = 0, id = null, sec = 0;
      const show = () => { el.textContent = fmtTime(sec); };
      const tick = () => { sec = (Date.now() - t0) / 1000; show(); };
      return {
        start() { if (!id) { t0 = Date.now() - sec * 1000; id = setInterval(tick, 250); } },
        stop() { if (id) { clearInterval(id); id = null; tick(); } return sec; },
        reset() { clearInterval(id); id = null; sec = 0; show(); },
      };
    },
  };
}

(() => {
  let cleanup = null;

  function showMenu(view) {
    const list = document.createElement('div');
    list.className = 'menu';
    for (const p of Puzzles) {
      const a = document.createElement('a');
      a.className = 'card';
      a.href = '#' + p.id;
      a.innerHTML = `<span class="card-icon"></span><span><b></b><small></small></span>`;
      a.querySelector('.card-icon').textContent = p.icon;
      a.querySelector('b').textContent = p.name;
      a.querySelector('small').textContent = p.desc;
      list.appendChild(a);
    }
    view.appendChild(list);
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

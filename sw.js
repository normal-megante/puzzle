// オフライン対応。方針:ネット優先(つながれば常に最新)、つながらない時だけ保存分を使う。
// → ファイルの中身を直しただけなら、ここは触らなくてよい。
// → ファイルを「追加」した時だけ、下の FILES に1行足す(このファイルが変わると自動で入れ直される)。
'use strict';

const CACHE = 'puzzle-v1';
const FILES = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/style.css',
  'js/app.js',
  'js/games/fifteen.js',
  'js/games/lightsout.js',
  'js/games/minesweeper.js',
  'js/games/merge.js',
  'js/games/memory.js',
  'js/games/hanoi.js',
  'js/games/hitblow.js',
  'js/games/same.js',
  'js/games/ice.js',
  'js/games/stagedata.js',
  'js/games/sokoban.js',
  'js/games/sudoku.js',
  'js/games/stroke.js',
  'js/games/timedlights.js',
  'js/games/stagedata-cars.js',
  'js/games/cars.js',
  'js/games/pipes.js',
  'js/games/seq.js',
  'icons/icon-192.png',
  'icons/icon-512.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  // 同じ github.io に他のアプリもあるので、消すのは自分の古いキャッシュ(puzzle-*)だけ
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('puzzle-') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    fetch(req)
      .then(res => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match('index.html')))
  );
});

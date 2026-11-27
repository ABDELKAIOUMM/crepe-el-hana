/* ═══════════════════════════════════════════════════════════════════
   مكتبة مشتركة — لوحة التحكم + الموقع
   ───────────────────────────────────────────────────────────────────
   • تحميل الصور المرفوعة من IndexedDB (تخزين دائم بلا حدود)
   • قواعد الصور الميتة (مصدر واحد للجميع)
   • أدوات مساعدة

   لازم تتحمّل **قبل** admin.js و site-data.js.
   ═══════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  var LS_KEY   = 'crepeElHana_data_v1';
  var SCALE_KEY= 'crepeElHana_scale_v1';
  var IMGS_KEY = 'crepeElHana_images_v1';
  var IDB_NAME = 'crepeElHanaImg';
  var IDB_STORE= 'imgs';

  /* ═══ قواعد الصور الميتة — مصدر واحد ═══
     أي مسار هنا بيعني إن الصورة اتشالت من السيرفر.
     ملاحظة مهمة: مسارات assets/upload/ مش ميتة أبداً —
     الصور المرفوعة بتتخزن في IndexedDB عند العميل. */
  var DEAD_RE = /sq-professional-overhead|professional-overhead-pizza-isolated/i;

  var SEC_FALLBACK = {
    pizza: 'assets/webp/section-pizza.webp',
    syrian: 'assets/webp/section-syrian.webp',
    pasta: 'assets/webp/section-pasta.webp',
    sweet_crepe: 'assets/webp/section-crepe.webp',
    waffle: 'assets/webp/section-waffle.webp'
  };

  function isUploadPath(p) {
    return !!p && (p.indexOf('assets/upload/') === 0 || p.indexOf('data:image') === 0);
  }

  function isDeadPath(p) {
    if (!p) return true;
    if (p.indexOf('data:image') === 0) return false;
    if (isUploadPath(p)) return false;   /* دايماً صالح */
    return DEAD_RE.test(p);
  }

  /* ═══════════ IndexedDB ═══════════ */
  var _db = null, _dbFailed = false, _cache = {};

  function openDb() {
    return new Promise(function (res, rej) {
      if (_db) return res(_db);
      if (_dbFailed) return rej(new Error('idb unavailable'));
      var idb = global.indexedDB;
      if (!idb) { _dbFailed = true; return rej(new Error('no indexedDB')); }
      try {
        var rq = idb.open(IDB_NAME, 1);
        rq.onupgradeneeded = function (e) {
          var db = e.target.result;
          if (!db.objectStoreNames.contains(IDB_STORE)) db.createObjectStore(IDB_STORE);
        };
        rq.onsuccess = function (e) { _db = e.target.result; res(_db); };
        rq.onerror = function (e) { _dbFailed = true; rej(e.target.error || new Error('idb error')); };
      } catch (e) { _dbFailed = true; rej(e); }
    });
  }

  function idbPut(path, dataUrl) {
    return openDb().then(function (db) {
      return new Promise(function (res, rej) {
        var tx = db.transaction(IDB_STORE, 'readwrite');
        tx.objectStore(IDB_STORE).put(dataUrl, path);
        tx.oncomplete = function () { res(true); };
        tx.onerror = function (e) { rej(e.target.error || new Error('idb write')); };
      });
    });
  }

  function idbGet(path) {
    return openDb().then(function (db) {
      return new Promise(function (res) {
        try {
          var tx = db.transaction(IDB_STORE, 'readonly');
          var rq = tx.objectStore(IDB_STORE).get(path);
          rq.onsuccess = function () { res(rq.result || null); };
          rq.onerror = function () { res(null); };
        } catch (e) { res(null); }
      });
    }).catch(function () { return null; });
  }

  function idbDel(path) {
    return openDb().then(function (db) {
      return new Promise(function (res) {
        try {
          var tx = db.transaction(IDB_STORE, 'readwrite');
          tx.objectStore(IDB_STORE).delete(path);
          tx.oncomplete = function () { res(true); };
          tx.onerror = function () { res(false); };
        } catch (e) { res(false); }
      });
    }).catch(function () { return false; });
  }

  function idbKeys() {
    return openDb().then(function (db) {
      return new Promise(function (res) {
        try {
          var tx = db.transaction(IDB_STORE, 'readonly');
          var rq = tx.objectStore(IDB_STORE).getAllKeys();
          rq.onsuccess = function () { res(rq.result || []); };
          rq.onerror = function () { res([]); };
        } catch (e) { res([]); }
      });
    }).catch(function () { return []; });
  }

  function cacheGet(path) { return _cache[path] || null; }
  function cacheSet(path, du) { if (path && du) _cache[path] = du; }
  function cacheDel(path) { delete _cache[path]; }

  /* ═══════════ تحميل الصور من IndexedDB ═══════════
     بنجيب كل الصور المرفوعة ونحطها في الـmanifest كـdataUrl،
     فالموقع يقدر يعرضها. */
  function loadUploadedImages(cb) {
    idbKeys().then(function (keys) {
      if (!keys.length) { cb && cb([]); return; }
      Promise.all(keys.map(function (k) {
        return idbGet(k).then(function (du) {
          if (du) { _cache[k] = du; return { path: k, dataUrl: du }; }
          return null;
        });
      })).then(function (list) {
        list = list.filter(Boolean);
        cb && cb(list);
      });
    }).catch(function () { cb && cb([]); });
  }

  /* ═══════════ قراءة metadata الصور من localStorage ═══════════ */
  function readImagesMeta() {
    try {
      return JSON.parse(localStorage.getItem(IMGS_KEY) || 'null') || [];
    } catch (e) { return []; }
  }

  function readSavedData() {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || 'null'); } catch (e) { return null; }
  }

  global.CH = {
    LS_KEY: LS_KEY, SCALE_KEY: SCALE_KEY, IMGS_KEY: IMGS_KEY,
    IDB_NAME: IDB_NAME, IDB_STORE: IDB_STORE,
    DEAD_RE: DEAD_RE, SEC_FALLBACK: SEC_FALLBACK,
    isUploadPath: isUploadPath, isDeadPath: isDeadPath,
    openDb: openDb, idbPut: idbPut, idbGet: idbGet, idbDel: idbDel, idbKeys: idbKeys,
    cacheGet: cacheGet, cacheSet: cacheSet, cacheDel: cacheDel,
    loadUploadedImages: loadUploadedImages,
    readImagesMeta: readImagesMeta, readSavedData: readSavedData
  };
})(typeof window !== 'undefined' ? window : this);

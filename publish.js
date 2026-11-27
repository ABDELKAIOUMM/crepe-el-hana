/* ═══════════════════════════════════════════════════════════════════
   النشر على الموقع — لوحة التحكم
   ───────────────────────────────────────────────────────────────────
   «حفظ» بيحفظ في المتصفح بس (محلي).
   «نشر» بيرفع التعديلات لـ GitHub Pages عشان **الزوار** يشوفوها.

   الطريقة: GitHub REST API
     1) نجيب الـsha الحالي للملف من الـrepo
     2) نرفع data.json + الصور المرفوعة (assets/upload/*)
     3) commit على gh-pages

   التوكن: من GitHub → Settings → Developer settings → Personal access
           tokens → scope: contents (repo).
   التوكن بيتخزن في المتصفح بس، ومش بينسلش لأي حد.
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var LS_TOKEN = 'crepeElHana_gh_token';
  var LS_REPO = 'crepeElHana_gh_repo';
  var LS_BRANCH = 'crepeElHana_gh_branch';
  var DEFAULT_REPO = 'ABDELKAIOUMM/crepe-el-hana';
  var DEFAULT_BRANCH = 'gh-pages';

  function getToken() { try { return localStorage.getItem(LS_TOKEN) || ''; } catch (e) { return ''; } }
  function setToken(t) { try { localStorage.setItem(LS_TOKEN, t || ''); } catch (e) {} }
  function getRepo() { try { return localStorage.getItem(LS_REPO) || DEFAULT_REPO; } catch (e) { return DEFAULT_REPO; } }
  function setRepo(r) { try { localStorage.setItem(LS_REPO, r || DEFAULT_REPO); } catch (e) {} }
  function getBranch() { try { return localStorage.getItem(LS_BRANCH) || DEFAULT_BRANCH; } catch (e) { return DEFAULT_BRANCH; } }
  function setBranch(b) { try { localStorage.setItem(LS_BRANCH, b || DEFAULT_BRANCH); } catch (e) {} }

  function apiBase(repo) {
    return 'https://api.github.com/repos/' + repo + '/contents/';
  }

  function headers(token) {
    return {
      'Authorization': 'Bearer ' + token,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    };
  }

  /* جلب محتوى ملف من الـrepo */
  function getFile(repo, branch, path, token) {
    return fetch(apiBase(repo) + encodeURIComponent(path) + '?ref=' + encodeURIComponent(branch), {
      headers: headers(token)
    }).then(function (r) {
      if (r.status === 404) return null;           /* الملف مش موجود */
      if (!r.ok) return r.json().then(function (j) { throw new Error(j.message || ('HTTP ' + r.status)); });
      return r.json();
    });
  }

  /* رفع (أو تحديث) ملف على الـrepo */
  function putFile(repo, branch, path, contentB64, sha, message, token) {
    var body = {
      message: message,
      content: contentB64,
      branch: branch
    };
    if (sha) body.sha = sha;
    return fetch(apiBase(repo) + encodeURIComponent(path), {
      method: 'PUT',
      headers: Object.assign({}, headers(token), { 'Content-Type': 'application/json' }),
      body: JSON.stringify(body)
    }).then(function (r) {
      return r.json().then(function (j) {
        if (!r.ok) throw new Error(j.message || ('HTTP ' + r.status));
        return j;
      });
    });
  }

  /* base64 من نص — متوافق مع العربية (UTF-8) */
  function utf8ToBase64(str) {
    var bytes = new TextEncoder().encode(str);
    var bin = '';
    var CHUNK = 0x8000;
    for (var i = 0; i < bytes.length; i += CHUNK) {
      bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
    }
    return btoa(bin);
  }

  /* ═══════════ نجمع الحزم المطلوب نشرها ═══════════
     - data.json: بيانات الموقع بعد التعديلات
     - assets/upload/*: الصور المرفوعة (base64 من IndexedDB) */
  function collectPayload(CH, data) {
    var files = [];
    var out = JSON.stringify(data, null, 2);
    files.push({ path: 'data.json', content: utf8ToBase64(out), type: 'json' });

    /* الصور المرفوعة */
    var jobs = [];
    if (CH && CH.idbKeys && CH.idbGet) {
      jobs.push(
        CH.idbKeys().then(function (keys) {
          return Promise.all(keys.map(function (k) {
            return CH.idbGet(k).then(function (du) {
              if (!du) return null;
              var m = /^data:image\/(\w+);base64,(.*)$/.exec(du);
              var b64 = m ? m[2] : du.replace(/^data:[^,]+,/, '');
              return { path: k, content: b64, type: 'img' };
            });
          })).then(function (list) { return list.filter(Boolean); });
        })
      );
    }
    return Promise.all(jobs).then(function (extra) {
      return files.concat.apply(files, extra);
    });
  }

  /* ═══════════ النشر ═══════════ */
  function publish(opts) {
    var repo = opts.repo || getRepo();
    var branch = opts.branch || getBranch();
    var token = opts.token || getToken();
    var CH = window.CH || {};
    var data = opts.data;

    if (!token) return Promise.reject(new Error('مفيش توكن — حطه في إعدادات النشر'));
    if (!data) return Promise.reject(new Error('مفيش بيانات للنشر'));

    var log = opts.onLog || function () {};

    log('⏳ بنجمع الملفات…');
    return collectPayload(CH, data).then(function (files) {
      log('📦 ' + files.length + ' ملف جاهز للنشر');
      var msg = '🚀 نشر من لوحة التحكم: ' + new Date().toISOString().slice(0, 16).replace('T', ' ');

      /* ننشر ملف ورا ملف (GitHub API بيقبل ملف واحد لكل commit) */
      var chain = Promise.resolve();
      var done = 0;
      files.forEach(function (f) {
        chain = chain.then(function () {
          return getFile(repo, branch, f.path, token).then(function (existing) {
            var sha = existing ? existing.sha : null;
            return putFile(repo, branch, f.path, f.content, sha, msg + ' (' + f.path + ')', token)
              .then(function () {
                done++;
                log('✅ ' + f.path + ' (' + done + '/' + files.length + ')');
              });
          });
        });
      });
      return chain.then(function () {
        log('🎉 تم النشر بنجاح على ' + repo + ' (' + branch + ')');
        return { files: files.length };
      });
    });
  }

  window.CH_PUBLISH = {
    publish: publish,
    getToken: getToken, setToken: setToken,
    getRepo: getRepo, setRepo: setRepo,
    getBranch: getBranch, setBranch: setBranch,
    collectPayload: collectPayload,
    DEFAULT_REPO: DEFAULT_REPO, DEFAULT_BRANCH: DEFAULT_BRANCH
  };
})();

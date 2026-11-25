/* ══════════════════════════════════════════════════════════
   محمّل البيانات — يقرأ التعديلات من localStorage (لوحة التحكم)
   ويطبّقها على الموقع. لو مفيش تعديلات، بيستخدم data.json الأصلي.
   ══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var LS_KEY = 'crepeElHana_data_v1';
  var SCALE_KEY = 'crepeElHana_scale_v1';

  /* ═══════════ إصلاح مسارات الصور القديمة/الميتة ═══════════
     لو المستخدم عنده تعديلات قديمة في المتصفح (localStorage) بتشير
     لصور اتشالت من السيرفر → بنصلّحها أوتوماتيك ونعرض الصورة الصح.
     بدون ده، أي صورة يتغيّر مسارها بتفضل مكسورة عنده. */
  var DEAD_RE = /hero-pizza|burger\.webp|crepe\.webp|sweet-crepe\.webp|sq-professional-overhead|professional-overhead-pizza-isolated|assets\/upload\/pngwing/i;

  var SEC_FALLBACK = {
    pizza: 'assets/webp/real-بيتزا-مارجريتا.webp',
    syrian: 'assets/webp/real-سوري-برجر-سادة.webp',
    pasta: 'assets/webp/real-باستا-إستربس.webp',
    sweet_crepe: 'assets/webp/real-كريب-شيكولاتة-نوتيلا.webp',
    waffle: 'assets/webp/real-وافل-شيكولاتة.webp'
  };

  function repairDeadPaths(menu, content, catalog, base) {
    var fixed = 0;

    /* ═══ قائمة الصور الموجودة فعلاً (من data.json المنشور) ═══
       أي مسار بره القائمة دي = ميت (404) → لازم يتصلح. */
    var validPaths = null;
    if (base && base._images && base._images.length) {
      validPaths = {};
      base._images.forEach(function (im) { if (im && im.path) validPaths[im.path] = 1; });
    }

    /* مسار ميت؟ (1) pattern معروف، (2) أو مش موجود في قائمة الصور المنشورة */
    function isDead(path) {
      if (!path) return true;
      if (DEAD_RE.test(path)) return true;
      if (validPaths && !/^data:image\//.test(path)) return !validPaths[path];
      return false;
    }

    /* صور الأقسام */
    if (content && content.sections) {
      content.sections.forEach(function (s) {
        if (isDead(s.img)) {
          s.img = SEC_FALLBACK[s.key] || SEC_FALLBACK.pizza; fixed++;
        }
      });
    }
    /* catalog — بنصلّحه قبل الـmenu عشان الـmenu ياخد منه المسار الصح.
       ولو اتصلح بعد الـmenu، الـmenu هياخد منه المسار الميت تاني. */
    if (catalog) {
      Object.keys(catalog).forEach(function (ck) {
        (catalog[ck].items || []).forEach(function (ci, i) {
          if (isDead(ci.img)) {
            ci.img = (menu && menu[ck] && menu[ck].items && menu[ck].items[i] && menu[ck].items[i].img && !isDead(menu[ck].items[i].img))
              ? menu[ck].items[i].img
              : (base && base.menu && base.menu.filter(function (x) { return x.key === ck; })[0]
                 && base.menu.filter(function (x) { return x.key === ck; })[0].items[i]
                 && base.menu.filter(function (x) { return x.key === ck; })[0].items[i].img)
              || SEC_FALLBACK[ck] || SEC_FALLBACK.pizza;
            fixed++;
          }
        });
      });
    }
    /* صور الأصناف */
    if (menu) {
      menu.forEach(function (sec) {
        (sec.items || []).forEach(function (it, i) {
          if (isDead(it.img)) {
            it.img = (catalog && catalog[sec.key] && catalog[sec.key].items && catalog[sec.key].items[i] && catalog[sec.key].items[i].img && !isDead(catalog[sec.key].items[i].img))
              ? catalog[sec.key].items[i].img
              : (base && base.menu && base.menu.filter(function (x) { return x.key === sec.key; })[0]
                 && base.menu.filter(function (x) { return x.key === sec.key; })[0].items[i]
                 && base.menu.filter(function (x) { return x.key === sec.key; })[0].items[i].img)
              || SEC_FALLBACK[sec.key] || SEC_FALLBACK.pizza;
            fixed++;
          }
        });
      });
    }
    return fixed;
  }

  function applyScale(s) {
    s = s || {};
    var r = document.documentElement.style;
    r.setProperty('--sc-base', (s.base || 100) / 100);
    r.setProperty('--sc-hero', (s.hero || 100) / 100);
    r.setProperty('--sc-sectionTitle', (s.sectionTitle || 100) / 100);
    r.setProperty('--sc-menuTitle', (s.menuTitle || 100) / 100);
    r.setProperty('--sc-price', (s.price || 100) / 100);
    r.setProperty('--sc-btn', (s.btn || 100) / 100);
    r.setProperty('--sc-desc', (s.desc || 100) / 100);
  }

  function setText(sel, val) {
    if (!val) return;
    var els = document.querySelectorAll(sel);
    for (var i = 0; i < els.length; i++) {
      if (els[i].children.length === 0) els[i].textContent = val;
    }
  }

  function applyContent(c) {
    if (!c) return;
    var b = c.brand || {}, h = c.hero || {}, hm = c.home || {},
        mn = c.menu || {}, p = c.product || {};

    /* ── الهوية ── */
    document.title = document.title.split('—')[0].trim() + ' — ' + (b.name || '');
    var brand = document.querySelector('.brand');
    if (brand && b.name) {
      brand.innerHTML = '<span class="mark">' + esc(b.logoEmoji || '🍕') + '</span>' +
        esc(b.name.replace(b.name2 || '', '')) + '<b>' + esc(b.name2 || '') + '</b>';
    }
    setText('.eyebrow', h.eyebrow);

    /* ── البطل ── */
    var h1 = document.querySelector('.hero-copy h1');
    if (h1 && h.title1) {
      h1.innerHTML = esc(h.title1) + '<br><span>' + esc(h.title2 || '') + '</span>';
    }
    setText('.hero-copy p', h.desc);
    var heroBtn = document.querySelector('.hero-copy .button.primary');
    if (heroBtn) heroBtn.textContent = h.cta || heroBtn.textContent;
    var navBtn = document.querySelector('.nav .button.primary');
    if (navBtn) navBtn.textContent = h.cta2 || navBtn.textContent;

    /* ── أقسام الرئيسية ── */
    var st = document.querySelector('.section-title h2');
    if (st) st.textContent = hm.sectionsTitle || st.textContent;
    var sp = document.querySelector('.section-title p');
    if (sp) sp.textContent = hm.sectionsSub || sp.textContent;
    var steps = document.querySelectorAll('.game-steps .step span');
    for (var i = 0; i < steps.length && hm.steps && hm.steps[i]; i++) {
      steps[i].textContent = hm.steps[i];
    }

    /* ── بطاقات الأقسام (اسم + وصف + صورة) ── */
    var cards = document.querySelectorAll('.category-grid .category');
    var secs = c.sections || [];
    for (var j = 0; j < cards.length && j < secs.length; j++) {
      var s = secs[j], card = cards[j];
      var num = card.querySelector('.category-content > span');
      var ttl = card.querySelector('.category-content h2');
      var dsc = card.querySelector('.category-content p');
      if (num) num.textContent = s.num || num.textContent;
      if (ttl) ttl.textContent = s.title || ttl.textContent;
      if (dsc) dsc.textContent = s.desc || dsc.textContent;
      var im = card.querySelector('img');
      if (im && s.img) {
        /* لو الصورة اترفعت من اللوحة → بتكون dataUrl في الـmanifest.
           لازم نمرّرها من imageSrc() عشان تظهر، وإلا الـpath بيطلع 404. */
        var src = (typeof imageSrc === 'function') ? imageSrc(s.img) : s.img;
        /* نحفظ الصورة الأصلية من الـHTML كشبكة أمان */
        if (!im.getAttribute('data-fallback-src')) {
          im.setAttribute('data-fallback-src', im.getAttribute('src') || '');
        }
        if (im.getAttribute('src') !== src) im.setAttribute('src', src);
        im.removeAttribute('srcset');
        /* شبكة أمان: لو الصورة الجديدة مش موجودة → نرجع لأصل الـHTML،
           ولو هي كمان مش موجودة → نظهر إيموجي بدل مربع مكسور. */
        im.onerror = function () {
          var fbSrc = this.getAttribute('data-fallback-src');
          if (fbSrc && this.getAttribute('src') !== fbSrc) {
            this.setAttribute('src', fbSrc);
            return;
          }
          this.style.visibility = 'hidden';
          var holder = this.parentElement;
          if (holder && !holder.querySelector('.cat-fallback')) {
            var fb = document.createElement('span');
            fb.className = 'cat-fallback';
            fb.setAttribute('aria-hidden', 'true');
            fb.textContent = '🍽️';
            holder.appendChild(fb);
          }
        };
        im.style.visibility = '';
      }
      var href = card.getAttribute('href');
      if (href && s.key) card.setAttribute('href', 'category.html?cat=' + s.key);
    }

    /* ── صفحة القائمة ── */
    var mEy = document.querySelector('.page-head .eyebrow');
    if (mEy) mEy.textContent = mn.eyebrow || mEy.textContent;
    var mH1 = document.querySelector('.page-head h1');
    if (mH1 && mn.title) {
      mH1.innerHTML = esc(mn.title) + ' <span class="hl">' + esc(mn.titleHl || '') + '</span>';
    }
    var mP = document.querySelector('.page-head p');
    if (mP) mP.textContent = mn.desc || mP.textContent;
    var crumb = document.querySelector('.breadcrumb span');
    if (crumb) crumb.textContent = mn.crumb || crumb.textContent;

    /* ── صفحة المنتج ── */
    var bH2 = document.querySelector('.builder h2');
    if (bH2) bH2.textContent = p.builderTitle || bH2.textContent;
    var hint = document.querySelector('.builder .hint');
    if (hint) hint.textContent = p.hint || hint.textContent;
    var ot = document.querySelectorAll('.option-title');
    if (ot[0] && p.sizeLabel) ot[0].innerHTML = esc(p.sizeLabel) +
      ' <span class="required">' + esc(p.sizeRequired || 'مطلوب') + '</span>';
    if (ot[1] && p.extrasLabel) ot[1].innerHTML = esc(p.extrasLabel) +
      ' <span class="required">' + esc(p.extrasRequired || 'اختياري') + '</span>';
    var notesLbl = document.querySelectorAll('.option-title')[2];
    if (notesLbl && p.notesLabel) notesLbl.textContent = p.notesLabel;
    var notes = document.getElementById('notes');
    if (notes && p.notesPlaceholder) notes.placeholder = p.notesPlaceholder;
    var qtyLbl = document.querySelector('.qty-row > b');
    if (qtyLbl && p.qtyLabel) qtyLbl.textContent = p.qtyLabel;
    var sums = document.querySelectorAll('.summary .sum-line span');
    if (sums[0] && p.sumItem) sums[0].textContent = p.sumItem;
    if (sums[1] && p.sumExtras) sums[1].textContent = p.sumExtras;
    if (sums[2] && p.sumTotal) sums[2].textContent = p.sumTotal;
    var pFoot = document.querySelector('footer .wrap');
    if (pFoot && p.footer) pFoot.textContent = p.footer;
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* نصدّر دالة إعادة التطبيق عشان site.js يناديها بعد رسم الصفحة */
  window.__reapplyContent = function(){ applyContent(window.__CONTENT_OVERRIDE); };

  /* ── نطبّق التعديلات ── */
  var saved = null;
  try { saved = JSON.parse(localStorage.getItem(LS_KEY) || 'null'); } catch (e) { saved = null; }

  if (saved) {
    try {
      var sc = JSON.parse(localStorage.getItem(SCALE_KEY) || 'null');
      applyScale(sc);
    } catch (e) {}

    /* ══ ندمج المحفوظ فوق الأحدث (data.json) ══
      原因: لو استبدلنا بالكامل، الحقول الجديدة (extras/sizeKeys/_images)
       هتضيع خالص والمستخدم مش هيشوف أي تعديل جديد. */
    fetch('data.json?v=' + Date.now())
      .then(function (r) { return r.json(); })
      .then(function (d) {
        var base = d || {};

        /* 1) قائمة الأصناف: item-wise merge
              - اللي في المحفوظ (تعديل المستخدم) → يفضل
              - اللي ناقص في المحفوظ但在 base → يتضاف */
        var mergedMenu = base.menu ? JSON.parse(JSON.stringify(base.menu)) : [];
        if (saved.menu && saved.menu.length) {
          mergedMenu = mergedMenu.map(function (bm) {
            var sm = null;
            for (var i = 0; i < saved.menu.length; i++) {
              if (saved.menu[i].key === bm.key) { sm = saved.menu[i]; break; }
            }
            if (!sm) return bm;   // القسم ده مش موجود في المحفوظ → خده من base
            var out = JSON.parse(JSON.stringify(bm));
            // كل صنف: لو موجود في المحفوظ → نأخذ تعديلاته، ونضيف أي حقل ناقص من base
            out.items = bm.items.map(function (bi) {
              var si = null;
              for (var j = 0; j < (sm.items || []).length; j++) {
                if ((sm.items[j].id && sm.items[j].id === bi.id) || sm.items[j].name === bi.name) {
                  si = sm.items[j]; break;
                }
              }
              if (!si) return bi;   // صنف جديد في base → خده
              var merged = JSON.parse(JSON.stringify(bi));
              // تعديلات المستخدم (الصورة/الاسم/الأسعار) هي اللي ليها الأولوية
              for (var k in si) {
                if (Object.prototype.hasOwnProperty.call(si, k)) merged[k] = si[k];
              }
              // لو المستخدم حذف الصورة (img = '' فارغ) → نخلّيها بدون صورة
              // ومش نرجّع الصورة الأصلية من base
              if (si.img === '' || si.img === null) {
                merged.img = '';
                merged.__noImg = 1;
              } else {
                delete merged.__noImg;
              }
              // بس لو المحفوظ كان قديم ومش فيه حقول جديدة (زي id) نكملها من base
              if (!merged.id) merged.id = bi.id;
              return merged;
            });
            // أصناف موجودة في المحفوظ ومش في base (المستخدم زاد صنف) → نضيفها
            (sm.items || []).forEach(function (si) {
              var exists = out.items.some(function (x) {
                return (si.id && x.id === si.id) || x.name === si.name;
              });
              if (!exists) out.items.push(JSON.parse(JSON.stringify(si)));
            });
            return out;
          });
        }

        window.__MENU_OVERRIDE = mergedMenu.length ? mergedMenu : saved.menu;
        window.__CONTENT_OVERRIDE = (saved.content && Object.keys(saved.content).length)
          ? saved.content : base.content;
        window.__RESTAURANT_OVERRIDE = (saved.restaurant && Object.keys(saved.restaurant).length)
          ? saved.restaurant : base.restaurant;
        window.__CATALOG_OVERRIDE = (saved.catalog && saved.catalog.length)
          ? saved.catalog : base.catalog;

        /* 2) الحقول الجديدة: لو مش في المحفوظ → من base (وده اللي كان ناقص) */
        window.__SIZEKEYS_OVERRIDE = (saved.sizeKeys && Object.keys(saved.sizeKeys).length)
          ? saved.sizeKeys : base.sizeKeys;
        window.__EXTRAS_OVERRIDE = (saved.extras && Object.keys(saved.extras).length)
          ? saved.extras : base.extras;
        window.__IMAGES_MANIFEST = (saved._images && saved._images.length)
          ? saved._images : base._images;

        /* ═══ إصلاح أي مسار صورة ميتة في تعديلات المستخدم المحفوظة ═══ */
        var __fixed = repairDeadPaths(
          window.__MENU_OVERRIDE,
          window.__CONTENT_OVERRIDE,
          window.__CATALOG_OVERRIDE,
          base
        );
        if (__fixed) {
          console.warn('[Site] تم إصلاح ' + __fixed + ' مسار صورة قديم في التعديلات المحفوظة');
          /* نحفظ التصحيح عشان يتثبت */
          try {
            var __s = JSON.parse(localStorage.getItem(LS_KEY) || 'null');
            if (__s) {
              __s.menu = window.__MENU_OVERRIDE;
              __s.content = window.__CONTENT_OVERRIDE;
              __s.catalog = window.__CATALOG_OVERRIDE;
              localStorage.setItem(LS_KEY, JSON.stringify(__s));
            }
          } catch (e) { /* تجاهل */ }
        }

        applyContent(window.__CONTENT_OVERRIDE);
        /* ═══ مهم: إعادة الرسم لازم تتم بعد ما site.js يجهّز دواله ═══
           أحياناً الـfetch بيخلص قبل ما site.js يتحمّل → بنحفظ الدالة
           ونتknظر لحد ما تكون جاهزة (poll خفيف) */
        (function tryReapply(attempt) {
          if (typeof window.__reapplyData === 'function') {
            window.__reapplyData();
            return;
          }
          if (attempt < 40) setTimeout(function () { tryReapply(attempt + 1); }, 50);
        })(0);
      })
      .catch(function () {
        /* فشل الـfetch → نرجع للمحفوظ زي ما كان */
        if (saved.menu) {
          window.__MENU_OVERRIDE = saved.menu;
          window.__CONTENT_OVERRIDE = saved.content;
          window.__RESTAURANT_OVERRIDE = saved.restaurant;
          window.__CATALOG_OVERRIDE = saved.catalog;
        }
        if (saved.sizeKeys) window.__SIZEKEYS_OVERRIDE = saved.sizeKeys;
        if (saved.extras) window.__EXTRAS_OVERRIDE = saved.extras;
        if (saved._images) window.__IMAGES_MANIFEST = saved._images;
        repairDeadPaths(window.__MENU_OVERRIDE, window.__CONTENT_OVERRIDE, window.__CATALOG_OVERRIDE, null);
        applyContent(window.__CONTENT_OVERRIDE);
        (function tryReapply(attempt) {
          if (typeof window.__reapplyData === 'function') {
            window.__reapplyData();
            return;
          }
          if (attempt < 40) setTimeout(function () { tryReapply(attempt + 1); }, 50);
        })(0);
      });
  } else {
    // مفيش تعديلات — نحمّل data.json الأصلي (عشان يدعم التعديلات المحفوظة على جهاز تاني)
    fetch('data.json?v=' + Date.now())
      .then(function (r) { return r.json(); })
      .then(function (d) {
        window.__MENU_OVERRIDE = d.menu;
        window.__CONTENT_OVERRIDE = d.content;
        window.__RESTAURANT_OVERRIDE = d.restaurant;
        window.__CATALOG_OVERRIDE = d.catalog;
        window.__SIZEKEYS_OVERRIDE = d.sizeKeys;
        window.__EXTRAS_OVERRIDE = d.extras;
        window.__IMAGES_MANIFEST = d._images;
        applyContent(d.content);
        if (window.__reapplyData) window.__reapplyData();
      })
      .catch(function () { /* تجاهل */ });
  }
})();

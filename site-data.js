/* ══════════════════════════════════════════════════════════
   محمّل البيانات — يقرأ التعديلات من localStorage (لوحة التحكم)
   ويطبّقها على الموقع. لو مفيش تعديلات، بيستخدم data.json الأصلي.
   ══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* كل الثوابت من المكتبة المشتركة ch-core.js (مصدر واحد للجميع) */
  var CH = window.CH || {};
  var LS_KEY   = CH.LS_KEY   || 'crepeElHana_data_v1';
  var SCALE_KEY= CH.SCALE_KEY|| 'crepeElHana_scale_v1';

  /* ═══════════ بناء catalog من menu (مصدر واحد للحقيقة) ═══════════
     الـcatalog هو نفس الأصناف بصيغة تانية (title/crumb/intro/items price).
     بنبدأ من catalog المنشور (base) ونحدّث كل صنف بالبيانات من الـmenu المدمج،
     وبنضيف أقسام/أصناف جديدة لو المستخدم زادها. */
  function buildCatalogFromMenu(menu, baseCatalog, savedCatalog) {
    var out = {};
    /* 1) ننسخ الأساس (catalog المنشور) */
    var src = (baseCatalog && Object.keys(baseCatalog).length) ? baseCatalog : {};
    Object.keys(src).forEach(function (k) {
      out[k] = JSON.parse(JSON.stringify(src[k]));
      out[k].items = out[k].items || [];
    });
    /* 2) لو فيه catalog محفوظ (تعديلات قديمة) ندمجه كمان */
    if (savedCatalog && Object.keys(savedCatalog).length) {
      Object.keys(savedCatalog).forEach(function (k) {
        if (!out[k]) out[k] = JSON.parse(JSON.stringify(savedCatalog[k]));
        out[k].items = out[k].items || [];
      });
    }
    if (!menu || !menu.length) return out;

    /* 3) لكل قسم في الـmenu: حدّث الـcatalog المقابل */
    menu.forEach(function (sec) {
      var key = sec.key;
      if (!out[key]) {
        out[key] = {
          title: sec.title || key,
          crumb: sec.title || key,
          eyebrow: '',
          intro: sec.desc || '',
          items: []
        };
      }
      out[key].title = sec.title || out[key].title;
      out[key].crumb = out[key].crumb || sec.title || key;
      if (sec.desc) out[key].intro = sec.desc;

      /* خريطة: الصنف بالـid أو بالاسم */
      var byId = {}, byName = {};
      (out[key].items || []).forEach(function (ci, i) {
        if (ci.id) byId[ci.id] = i;
        byName[ci.name] = i;
      });

      (sec.items || []).forEach(function (it) {
        var idx = (it.id && byId[it.id] !== undefined) ? byId[it.id]
                : (byName[it.name] !== undefined ? byName[it.name] : -1);
        if (idx === -1) {
          /* صنف جديد ⇒ نضيفه للـcatalog */
          var ni = {
            id: it.id || (key + '-' + it.name),
            name: it.name,
            price: effectivePrice(it),
            img: it.img || '',
            tag: 'مميز',
            desc: it.desc || '',
            menuKey: key
          };
          out[key].items.push(ni);
          byId[ni.id] = out[key].items.length - 1;
          byName[ni.name] = out[key].items.length - 1;
          return;
        }
        var ci = out[key].items[idx];
        if (it.name) ci.name = it.name;
        if (it.desc !== undefined && it.desc !== null) ci.desc = it.desc;
        /* الصورة: لو المستخدم رفع صورة ⇒ لازم تنطبق */
        if (it.img !== undefined && it.img !== null) ci.img = it.img;
        /* السعر: من الأحجام أو السعر المفرد */
        var p = effectivePrice(it);
        if (p !== null && p !== undefined) ci.price = p;
        ci.menuKey = key;
      });
    });
    return out;
  }

  /* سعر الصنف: لو عنده أحجام ⇒ متوسط/أول سعر، لو مفرد ⇒ السعر */
  function effectivePrice(it) {
    if (!it) return null;
    if (it.sizes && it.sizes.length) {
      var first = it.sizes[0].price;
      return (first !== undefined && first !== null) ? first : null;
    }
    if (it.price !== undefined && it.price !== null) return it.price;
    if (it.small !== undefined && it.small !== null) return it.small;
    if (it.medium !== undefined && it.medium !== null) return it.medium;
    if (it.large !== undefined && it.large !== null) return it.large;
    return null;
  }

  /* ═══════════ إصلاح مسارات الصور القديمة/الميتة ═══════════
     لو المستخدم عنده تعديلات قديمة في المتصفح (localStorage) بتشير
     لصور اتشالت من السيرفر → بنصلّحها أوتوماتيك ونعرض الصورة الصح.
     بدون ده، أي صورة يتغيّر مسارها بتفضل مكسورة عنده. */
  var DEAD_RE = CH.DEAD_RE || /sq-professional-overhead|professional-overhead-pizza-isolated/i;

  var SEC_FALLBACK = CH.SEC_FALLBACK || {
    pizza: 'assets/webp/section-pizza.webp',
    syrian: 'assets/webp/section-syrian.webp',
    pasta: 'assets/webp/section-pasta.webp',
    sweet_crepe: 'assets/webp/section-crepe.webp',
    waffle: 'assets/webp/section-waffle.webp'
  };

  function repairDeadPaths(menu, content, catalog, base, userImages) {
    var fixed = 0;

    /* ═══ قائمة الصور الموجودة فعلاً (من data.json المنشور) ═══
       أي مسار بره القائمة دي = ميت (404) → لازم يتصلح. */
    var validPaths = null;
    if (base && base._images && base._images.length) {
      validPaths = {};
      base._images.forEach(function (im) { if (im && im.path) validPaths[im.path] = 1; });
    }

    /* ═══ الصور اللي المستخدم رفعها بنفسه (عنده dataUrl ليها)
       → دي مش ماتة، ومينفعش نفرط فيها. */
    var userPaths = {};
    (userImages || []).forEach(function (im) {
      if (im && im.path && im.dataUrl) userPaths[im.path] = 1;
    });

    /* مسار ميت؟ (1) pattern معروف، (2) أو مش موجود في قائمة الصور المنشورة
       (3) ومش صورة رفعها المستخدم */
    function isDead(path) {
      if (!path) return true;
      if (/^data:image\//.test(path)) return false;
      /* الصور المرفوعة (assets/upload/...) ⇒ دايماً صالحة
         (بتتخزن في IndexedDB عند العميل) */
      if (CH.isUploadPath ? CH.isUploadPath(path) : path.indexOf('assets/upload/') === 0) return false;
      if (userPaths[path]) return false;
      if (DEAD_RE.test(path)) return true;
      if (validPaths) return !validPaths[path];
      return false;
    }

    /* صور الأقسام */
    if (content && content.sections) {
      /* ═══ لو المستخدم غيّر صورة القسم بنفسه (رفعها) → نسيبها.
             بس لو القيمة المحفوظة قديمة ومش زي المنشور (من نسخة سابقة)
             → نرجّعها للمنشور. */
      var baseSec = {};
      if (base && base.content && base.content.sections) {
        base.content.sections.forEach(function (bs) { baseSec[bs.key] = bs.img; });
      }
      content.sections.forEach(function (s) {
        var isUserUpload = /^data:image\//.test(s.img || '')
          || userPaths[s.img || '']
          || (CH.isUploadPath ? CH.isUploadPath(s.img || '') : (s.img || '').indexOf('assets/upload/') === 0);
        var published = baseSec[s.key];
        if (published && !isUserUpload && s.img !== published && !isDead(s.img)) {
          /* قيمة محفوظة من نسخة أقدم — نرجّعها للمنشور */
          s.img = published; fixed++;
          return;
        }
        if (isDead(s.img)) {
          s.img = published || SEC_FALLBACK[s.key] || SEC_FALLBACK.pizza; fixed++;
        }
      });
    }
    /* ═══ مساعد: نجيب قائمة قسم من الـmenu — الـmenu ممكن يكون:
           - مصفوفة أقسام: [{key:'pizza', items:[...]}, ...]
           - كائن بالأقسام: {pizza:{items:[...]}} */
    function menuSection(key) {
      if (!menu) return null;
      if (Array.isArray(menu)) {
        for (var q = 0; q < menu.length; q++) {
          if (menu[q] && menu[q].key === key) return menu[q];
        }
        return null;
      }
      return menu[key] || null;
    }
    function baseSection(key) {
      if (!base || !base.menu) return null;
      for (var q = 0; q < base.menu.length; q++) {
        if (base.menu[q] && base.menu[q].key === key) return base.menu[q];
      }
      return null;
    }

    /* catalog — بنصلّحه قبل الـmenu عشان الـmenu ياخد منه المسار الصح.
       ولو اتصلح بعد الـmenu، الـmenu هياخد منه المسار الميت تاني. */
    if (catalog) {
      Object.keys(catalog).forEach(function (ck) {
        var ms = menuSection(ck);
        var bs = baseSection(ck);
        (catalog[ck].items || []).forEach(function (ci, i) {
          if (isDead(ci.img)) {
            ci.img = (ms && ms.items && ms.items[i] && ms.items[i].img && !isDead(ms.items[i].img))
              ? ms.items[i].img
              : (bs && bs.items && bs.items[i] && bs.items[i].img)
              || SEC_FALLBACK[ck] || SEC_FALLBACK.pizza;
            fixed++;
          }
        });
      });
    }
    /* صور الأصناف */
    if (menu) {
      var menuList = Array.isArray(menu) ? menu : Object.keys(menu).map(function (k) {
        var sec = menu[k] || {};
        if (!sec.key) sec.key = k;
        return sec;
      });
      menuList.forEach(function (sec) {
        if (!sec) return;
        (sec.items || []).forEach(function (it, i) {
          if (isDead(it.img)) {
            var cs = catalog && catalog[sec.key];
            var bs = baseSection(sec.key);
            it.img = (cs && cs.items && cs.items[i] && cs.items[i].img && !isDead(cs.items[i].img))
              ? cs.items[i].img
              : (bs && bs.items && bs.items[i] && bs.items[i].img)
              || SEC_FALLBACK[sec.key] || SEC_FALLBACK.pizza;
            fixed++;
          }
        });
      });
    }
    return fixed;
  }

  /* ═══════════ تحميل الصور المرفوعة من IndexedDB ═══════════
     الصور المرفوعة من اللوحة بتتخزن في IndexedDB (مش في localStorage).
     الموقع لازم يجيبها من هناك ويضيفها للـmanifest كـdataUrl،
     وإلا مش هيعرف يعرضها (المسار fake على السيرفر ⇒ 404). */
  function injectUploadedImages(cb) {
    if (!CH.loadUploadedImages) { cb && cb(); return; }
    CH.loadUploadedImages(function (list) {
      if (!list || !list.length) { cb && cb(); return; }
      var man = window.__IMAGES_MANIFEST || [];
      var byPath = {};
      man.forEach(function (im) { if (im && im.path) byPath[im.path] = im; });
      list.forEach(function (u) {
        if (byPath[u.path]) {
          /* موجودة ⇒ نحدّث الـdataUrl بتاعها */
          byPath[u.path].dataUrl = u.dataUrl;
          if (!byPath[u.path].dim) byPath[u.path].dim = '';
        } else {
          man.push({ path: u.path, name: u.path.split('/').pop(), dataUrl: u.dataUrl });
        }
      });
      window.__IMAGES_MANIFEST = man;
      cb && cb(list.length);
    });
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
        /* ═══ catalog مولّد من الـmenu المدمج ═══
           الـCMS بيعدّل data.menu، والـcatalog مصفوفة موازية لوحدها.
           لو اعتمدنا على catalog المحفوظ بس، أي تعديل على صورة/اسم صنف
           في اللوحة كان هيتجاهل في صفحة «قائمة الأكل».
           الحل: نبني الـcatalog من الـmenu المدمج (مصدر واحد). */
        window.__CATALOG_OVERRIDE = buildCatalogFromMenu(window.__MENU_OVERRIDE, base.catalog, saved.catalog);
        window.__CONTENT_OVERRIDE = (saved.content && Object.keys(saved.content).length)
          ? saved.content : base.content;
        window.__RESTAURANT_OVERRIDE = (saved.restaurant && Object.keys(saved.restaurant).length)
          ? saved.restaurant : base.restaurant;
        /* 2) الحقول الجديدة: لو مش في المحفوظ → من base (وده اللي كان ناقص) */
        window.__SIZEKEYS_OVERRIDE = (saved.sizeKeys && Object.keys(saved.sizeKeys).length)
          ? saved.sizeKeys : base.sizeKeys;
        window.__EXTRAS_OVERRIDE = (saved.extras && Object.keys(saved.extras).length)
          ? saved.extras : base.extras;
        window.__IMAGES_MANIFEST = (saved._images && saved._images.length)
          ? saved._images : base._images;

        /* ═══ الصور المرفوعة من IndexedDB → نضيفها للـmanifest ═══ */
        injectUploadedImages(function () {
        /* ═══ إصلاح أي مسار صورة ميتة في تعديلات المستخدم المحفوظة ═══ */
        var __fixed = repairDeadPaths(
          window.__MENU_OVERRIDE,
          window.__CONTENT_OVERRIDE,
          window.__CATALOG_OVERRIDE,
          base,
          window.__IMAGES_MANIFEST
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
        });   /* end injectUploadedImages */
      })
      .catch(function () {
        /* فشل الـfetch → نرجع للمحفوظ زي ما كان */
        if (saved.menu) {
          window.__MENU_OVERRIDE = saved.menu;
          window.__CONTENT_OVERRIDE = saved.content;
          window.__RESTAURANT_OVERRIDE = saved.restaurant;
          window.__CATALOG_OVERRIDE = (saved.catalog && Object.keys(saved.catalog).length)
            ? saved.catalog : (base && base.catalog);
        }
        if (saved.sizeKeys) window.__SIZEKEYS_OVERRIDE = saved.sizeKeys;
        if (saved.extras) window.__EXTRAS_OVERRIDE = saved.extras;
        if (saved._images) window.__IMAGES_MANIFEST = saved._images;
        repairDeadPaths(window.__MENU_OVERRIDE, window.__CONTENT_OVERRIDE, window.__CATALOG_OVERRIDE, null, window.__IMAGES_MANIFEST);
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
        window.__CATALOG_OVERRIDE = buildCatalogFromMenu(window.__MENU_OVERRIDE, d.catalog, null);
        window.__SIZEKEYS_OVERRIDE = d.sizeKeys;
        window.__EXTRAS_OVERRIDE = d.extras;
        window.__IMAGES_MANIFEST = d._images;
        /* ═══ الصور المرفوعة من IndexedDB (لو موجودة على الجهاز) ═══ */
        injectUploadedImages(function () {
          applyContent(d.content);
          if (window.__reapplyData) window.__reapplyData();
        });
      })
      .catch(function () { /* تجاهل */ });
  }
})();

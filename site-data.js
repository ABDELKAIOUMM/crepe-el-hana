/* ══════════════════════════════════════════════════════════
   محمّل البيانات — يقرأ التعديلات من localStorage (لوحة التحكم)
   ويطبّقها على الموقع. لو مفيش تعديلات، بيستخدم data.json الأصلي.
   ══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var LS_KEY = 'crepeElHana_data_v1';
  var SCALE_KEY = 'crepeElHana_scale_v1';

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
      if (im && s.img) im.src = s.img;
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

    // نعطّل الـ hardcoded ونستخدم المحفوظ
    if (saved.menu) {
      window.__MENU_OVERRIDE = saved.menu;
      window.__CONTENT_OVERRIDE = saved.content;
      window.__RESTAURANT_OVERRIDE = saved.restaurant;
      window.__CATALOG_OVERRIDE = saved.catalog;
    }
    if (saved.sizeKeys) window.__SIZEKEYS_OVERRIDE = saved.sizeKeys;
    if (saved.extras) window.__EXTRAS_OVERRIDE = saved.extras;
    if (saved._images) window.__IMAGES_MANIFEST = saved._images;
    applyContent(saved.content);

    if (saved.restaurant) {
      try { window.__REST_OVERRIDE = saved.restaurant; } catch (e) {}
    }
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

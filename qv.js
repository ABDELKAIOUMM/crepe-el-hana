/* ══════════════════════════════════════════════════════════════
   نافذة العرض السريع (Quick View) — 75% من مساحة الشاشة
   بتتفتح بـ:
   • الضغط على سعر الصنف → تضيف للسلة + تعرض النافذة
   • الضغط على صورة الصنف → تفتح النافذة (وفيها زر لصفحة المنتج)
   ══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var BACKDROP_ID = 'qvBackdrop';
  var SHEET_ID = 'qvSheet';
  var state = null;       // {cat, item, size, qty, extras, extrasPrice}
  var lastFocus = null;

  /* ─────────────── بناء النافذة ─────────────── */
  function ensureShell() {
    if (document.getElementById(SHEET_ID)) return;

    var bd = document.createElement('div');
    bd.id = BACKDROP_ID;
    bd.className = 'qv-backdrop';
    bd.addEventListener('click', close);

    var sheet = document.createElement('div');
    sheet.id = SHEET_ID;
    sheet.className = 'qv-sheet';
    sheet.setAttribute('role', 'dialog');
    sheet.setAttribute('aria-modal', 'true');
    sheet.innerHTML =
      '<button type="button" class="qv-close" aria-label="اقفل">&times;</button>' +
      '<div class="qv-grid">' +
        '<div class="qv-media"><div class="qv-imgwrap"></div>' +
          '<button type="button" class="qv-openpage">افتح صفحة المنتج ←</button></div>' +
        '<div class="qv-info">' +
          '<span class="qv-cat"></span>' +
          '<h3 class="qv-title"></h3>' +
          '<p class="qv-desc"></p>' +
          '<div class="qv-sizes"></div>' +
          '<div class="qv-extras"></div>' +
          '<div class="qv-foot">' +
            '<div class="qv-qty"><button type="button" data-q="-1">−</button>' +
              '<b class="qv-qtyv">1</b><button type="button" data-q="1">+</button></div>' +
            '<div class="qv-total"><span>الإجمالي</span><b class="qv-totalv">0 ج.م</b></div>' +
          '</div>' +
          '<button type="button" class="qv-add">ضيف للسلة</button>' +
          '<p class="qv-hint"></p>' +
        '</div>' +
      '</div>';

    document.body.appendChild(bd);
    document.body.appendChild(sheet);

    sheet.querySelector('.qv-close').addEventListener('click', close);
    sheet.querySelector('.qv-openpage').addEventListener('click', openProductPage);
    sheet.querySelector('.qv-add').addEventListener('click', addToCart);
    sheet.querySelectorAll('.qv-qty button').forEach(function (b) {
      b.addEventListener('click', function () { setQty(state.qty + (+b.dataset.q)); });
    });
    sheet.addEventListener('click', function (e) { e.stopPropagation(); });
    bd.addEventListener('click', close);

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && document.body.classList.contains('qv-open')) close();
    });
  }

  /* ─────────────── بيانات الصنف ─────────────── */
  function findItem(cat, id) {
    var menu = (typeof getMenu === 'function') ? getMenu() : (window.__MENU_OVERRIDE || []);
    for (var i = 0; i < menu.length; i++) {
      if (menu[i].key !== cat) continue;
      var items = menu[i].items || [];
      for (var j = 0; j < items.length; j++) {
        if (items[j].id === id) return { cat: cat, sec: menu[i], item: items[j] };
      }
    }
    return null;
  }

  /* أسعار المقاسات: [label, price, delta] — نفس منطق صفحة المنتج */
  function sizeRows(sec, item) {
    if (!sec.sizes || !sec.sizes.length) return [];
    var sk = (typeof getSizeKeys === 'function' ? getSizeKeys() : {})[sec.key] || {};
    var base = null;
    sec.sizes.forEach(function (s) {
      var k = sk[s] || s;
      if (item[k] != null && (base === null || item[k] < base)) base = item[k];
    });
    base = base || 0;
    return sec.sizes.map(function (s) {
      var k = sk[s] || s;
      var p = item[k] != null ? item[k] : base;
      return { label: s, price: p, delta: p - base };
    });
  }

  /* الإضافات: من data.extras */
  function extraRows(cat) {
    var live = (typeof getExtrasData === 'function') ? getExtrasData() : null;
    var arr = live && live[cat];
    if (!arr || !arr.length) return [];
    return arr.map(function (e) { return { name: e.name, price: +e.price || 0 }; });
  }

  function esc(s) {
    if (typeof window.__escHTML === 'function') return window.__escHTML(s);
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function imgSrc(path) {
    return (typeof imageSrc === 'function') ? imageSrc(path) : path;
  }

  /* ─────────────── الفتح ─────────────── */
  window.openQuickView = function (cat, id, opts) {
    opts = opts || {};
    ensureShell();
    var found = findItem(cat, id);
    if (!found) return;

    var rows = sizeRows(found.sec, found.item);

    /* المقاس المحدد سلفاً (اللي اتضغط عليه في السعر) — لو موجود بنستخدمه */
    var preSize = opts.size || '';
    var preRow = null;
    if (preSize && rows.length) {
      for (var ri = 0; ri < rows.length; ri++) {
        if (rows[ri].label === preSize) { preRow = rows[ri]; break; }
      }
    }
    var defRow = preRow || (rows.length ? rows[0] : null);

    state = {
      cat: cat,
      item: found.item,
      sec: found.sec,
      rows: rows,
      extras: extraRows(cat),
      size: defRow ? defRow.label : '',
      sizePrice: defRow ? defRow.price : (found.item.price || 0),
      onePrice: !rows.length,
      qty: 1,
      picked: [],
      extrasPrice: 0,
      fromPrice: !!opts.fromPrice,
      addedSig: null
    };

    var sheet = document.getElementById(SHEET_ID);
    var bd = document.getElementById(BACKDROP_ID);

    /* الصورة */
    var wrap = sheet.querySelector('.qv-imgwrap');
    if (found.item.img) {
      wrap.innerHTML = '<img alt="" loading="lazy" decoding="async" src="' +
        esc(imgSrc(found.item.img)) + '">';
    } else {
      wrap.innerHTML = '<span class="qv-emoji">' + esc(found.sec.emoji || '🍽️') + '</span>';
    }

    /* العنوان والوصف */
    sheet.querySelector('.qv-cat').textContent = found.sec.title || '';
    sheet.querySelector('.qv-title').textContent = found.item.name || '';
    var desc = sheet.querySelector('.qv-desc');
    desc.textContent = found.item.desc || '';
    desc.style.display = found.item.desc ? '' : 'none';

    /* المقاسات */
    var sizeBox = sheet.querySelector('.qv-sizes');
    if (rows.length) {
      sizeBox.style.display = '';
      sizeBox.innerHTML = '<b class="qv-lab">اختار الحجم</b>' +
        '<div class="qv-opts">' + rows.map(function (r) {
          var on = (defRow && r.label === defRow.label);
          return '<label class="qv-opt' + (on ? ' on' : '') + '">' +
            '<input type="radio" name="qvsize" value="' + esc(r.label) + '" ' +
            (on ? 'checked' : '') + ' data-price="' + r.price + '">' +
            '<b>' + esc(r.label) + '</b>' +
            '<span>' + r.price + ' ج.م</span></label>';
        }).join('') + '</div>';
      sizeBox.querySelectorAll('input[name=qvsize]').forEach(function (inp) {
        inp.addEventListener('change', function () {
          state.size = inp.value;
          state.sizePrice = +inp.dataset.price;
          sizeBox.querySelectorAll('.qv-opt').forEach(function (l) {
            l.classList.toggle('on', l.contains(inp));
          });
          renderTotal();
        });
      });
    } else {
      sizeBox.style.display = 'none';
      sizeBox.innerHTML = '';
    }

    /* الإضافات */
    var exBox = sheet.querySelector('.qv-extras');
    if (state.extras.length) {
      exBox.style.display = '';
      exBox.innerHTML = '<b class="qv-lab">الإضافات <i>اختياري</i></b>' +
        '<div class="qv-opts ex">' + state.extras.map(function (e, i) {
          return '<label class="qv-opt">' +
            '<input type="checkbox" value="' + esc(e.name) + '" data-price="' + e.price + '">' +
            '<b>' + esc(e.name) + '</b><span>+ ' + e.price + ' ج.م</span></label>';
        }).join('') + '</div>';
      exBox.querySelectorAll('input[type=checkbox]').forEach(function (inp) {
        inp.addEventListener('change', function () {
          state.picked = [];
          state.extrasPrice = 0;
          exBox.querySelectorAll('input:checked').forEach(function (c) {
            state.picked.push(c.value);
            state.extrasPrice += (+c.dataset.price || 0);
          });
          exBox.querySelectorAll('.qv-opt').forEach(function (l) {
            l.classList.toggle('on', l.contains(inp));
          });
          renderTotal();
        });
      });
    } else {
      exBox.style.display = 'none';
      exBox.innerHTML = '';
    }

    /* أزرار السلّة / صفحة المنتج */
    sheet.querySelector('.qv-add').textContent = 'ضيف للسلة';
    sheet.querySelector('.qv-add').classList.remove('added');
    sheet.querySelector('.qv-openpage').style.display = '';
    sheet.querySelector('.qv-hint').textContent =
      'اختار الإضافات والكمية، وبعدين اضغط "ضيف للسلة".' +
      ' أو افتح صفحة المنتج للتفاصيل الكاملة.';

    renderTotal();

    lastFocus = document.activeElement;
    document.body.classList.add('qv-open');
    bd.classList.add('on');
    sheet.classList.add('on');
    setTimeout(function () { sheet.querySelector('.qv-close').focus(); }, 60);
  };

  /* ─────────────── الكمية والإجمالي ─────────────── */
  function setQty(n) {
    if (!state) return;
    state.qty = Math.max(1, n);
    document.querySelector('#' + SHEET_ID + ' .qv-qtyv').textContent = state.qty;
    renderTotal();
  }

  function renderTotal() {
    if (!state) return;
    var unit = (state.sizePrice || state.item.price || 0) + state.extrasPrice;
    var total = unit * state.qty;
    var el = document.querySelector('#' + SHEET_ID + ' .qv-totalv');
    if (el) el.textContent = total + ' ج.م';
  }

  /* بصمة الصنف: cat + name + size + extras — لتحديد نفس السطر */
  function itemSignature() {
    return state.cat + '|' + state.item.name + '|' + (state.size || '') +
      '|' + state.picked.slice().join(',');
  }

  /* ─────────────── الإضافة للسلة ─────────────── */
  function addToCart() {
    if (!state) return;

    /* لو الصنف ده اتضاف قبل كده بنفس المقاس والإضافات بالظبط،
       والزر بيقول «اتضاف» → معناها المستخدم عايز يزيد واحد.
       بنزوّد الكمية المعروضة واحد (وبالتالي السطر في السلة بيزيد 1). */
    var sig = itemSignature();
    if (state.addedSig === sig) {
      state.qty = state.qty + 1;
      document.querySelector('#' + SHEET_ID + ' .qv-qtyv').textContent = state.qty;
      renderTotal();
    }
    /* ملاحظة: qv.add بيبعت state.qty، و WAOrder.replace بيزوّد الكميةexisting.
       عشان ما يحصلش مضاعفة: لو الصنف مضاف قبل كده بنفس البصمة،
       بنبعت qty = 1 (يعني +1) مش state.qty كلها. */
    var addQty = (state.addedSig === sig) ? 1 : state.qty;

    /* لو بنفتح نافذة السلة بعدين → نقفل دي الأول (عشان متبقاش فوقها) */
    setTimeout(function () {
      var m = document.getElementById('waModal');
      if (m && m.classList.contains('open')) window.closeQuickView();
    }, 0);

    var payload = {
      cat: state.cat,
      name: state.item.name,
      size: state.size,
      price: state.sizePrice || state.item.price || 0,
      qty: addQty,
      extras: state.picked.slice(),
      extrasPrice: state.extrasPrice
    };

    /* لو الصنف ده بالظبط متضاف قبل كده بنفس الحجم والإضافات →
       نحدّث كميته بدل ما نضيف سطر تاني (منع التكرار).
       لو الإضافات اتغيّرت → السطر الجديد يبقى منفصل (عشان الإجمالي يبقى صح). */
    var replaced = false;
    try {
      if (window.WAOrder && window.WAOrder.items && window.WAOrder.replace) {
        replaced = !!window.WAOrder.replace(payload, { silent: true });
      }
    } catch (e) { replaced = false; }

    if (!replaced && window.WAOrder && window.WAOrder.add) {
      window.WAOrder.add(payload, { silent: true });
    }

    state.addedSig = itemSignature();
    var btn = document.querySelector('#' + SHEET_ID + ' .qv-add');
    btn.classList.add('added');
    btn.textContent = 'اتضاف للسلة ✓';
    if (window.__qvToast) window.__qvToast('اتضاف للسلة: ' + state.item.name);
    else if (typeof toast === 'function') toast('✅ اتضاف للسلة', 'ok');
  }

  /* ─────────────── صفحة المنتج ─────────────── */
  function openProductPage() {
    if (!state) return;
    var url = 'product.html?cat=' + encodeURIComponent(state.cat) +
      '&id=' + encodeURIComponent(state.item.id);
    location.href = url;
  }

  /* ─────────────── الإغلاق ─────────────── */
  window.closeQuickView = function () {
    var sheet = document.getElementById(SHEET_ID);
    var bd = document.getElementById(BACKDROP_ID);
    if (!sheet) return;
    sheet.classList.remove('on');
    bd.classList.remove('on');
    document.body.classList.remove('qv-open');
    state = null;
    if (lastFocus && lastFocus.focus) { try { lastFocus.focus(); } catch (e) {} }
  };

  function close() { window.closeQuickView(); }

  /* ─────────────── ربط الكروت ─────────────── */
  function bindCards() {
    var menu = (typeof getMenu === 'function') ? getMenu() : [];
    menu.forEach(function (sec) {
      (sec.items || []).forEach(function (it) {
        var card = document.querySelector('[data-qv-item="' + it.id + '"]');
        if (!card) return;
        if (card.dataset.qvBound === '1') return;
        card.dataset.qvBound = '1';

        /* الصورة → تفتح النافذة */
        var imgBtn = card.querySelector('[data-qv-img]');
        if (imgBtn) {
          imgBtn.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            window.openQuickView(sec.key, it.id, { fromPrice: false });
          });
        }

        /* السعر → يضيف للسلة ويفتح النافذة */
        card.querySelectorAll('[data-qv-price]').forEach(function (btn) {
          btn.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            var label = btn.dataset.qvPrice || '';
            var one = btn.dataset.qvPriceOne === '1';

            /* بنفتح النافذة على المقاس اللي اتضغط عليه (من غير إضافة للسلة).
               الإضافة بتتم بس لما المستخدم يضغط "ضيف للسلة" جوّه النافذة. */
            window.openQuickView(sec.key, it.id, {
              fromPrice: true,
              size: one ? '' : label
            });
          });
        });
      });
    });
  }

  /* إعادة الربط بعد إعادة رسم القائمة */
  var origReapply = window.__reapplyData;
  window.__reapplyData = function () {
    if (origReapply) origReapply.apply(this, arguments);
    setTimeout(bindCards, 40);
  };

  /* لو نافذة السلة اتفتحت → نقفل نافذة العرض السريع (عشان متبقاش فوقها) */
  document.addEventListener('click', function (e) {
    var waOpen = document.getElementById('waModal');
    if (waOpen && waOpen.classList.contains('open')) {
      if (state) window.closeQuickView();
    }
  }, true);

  document.addEventListener('DOMContentLoaded', function () { setTimeout(bindCards, 250); });
  if (document.readyState !== 'loading') setTimeout(bindCards, 250);

  window.__qvBind = bindCards;
  window.__qvState = function () { return state; };
})();

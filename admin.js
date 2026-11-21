/* ══════════════════════════════════════════════════════════
   لوحة تحكم كريب الهنا — المنطق
   ══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var PASS = 'hana2026';           // كلمة سر الدخول
  var LS_KEY = 'crepeElHana_data_v1';
  var SCALE_KEY = 'crepeElHana_scale_v1';
  var IMGS_KEY = 'crepeElHana_images_v1';

  var data = null;       // بيانات الموقع
  var images = [];       // الصور المتاحة (مسار + اسم)
  var scale = {};        // معاملات تكبير النصوص
  var dirty = false;
  var curMenu = 0;
  var curCat = 'pizza';
  var selImg = null;
  var curConfirm = null;

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };

  /* ═══════════ 1) الحفظ والتحميل ═══════════ */
  function loadAll() {
    data = JSON.parse(localStorage.getItem(LS_KEY) || 'null');
    scale = JSON.parse(localStorage.getItem(SCALE_KEY) || 'null') || {};
    images = JSON.parse(localStorage.getItem(IMGS_KEY) || 'null') || [];
  }

  function saveData(silent) {
    localStorage.setItem(LS_KEY, JSON.stringify(data));
    localStorage.setItem(SCALE_KEY, JSON.stringify(scale));
    localStorage.setItem(IMGS_KEY, JSON.stringify(images));
    dirty = false;
    setSaveState('saved');
    if (!silent) toast('✅ اتحفظ كل التعديلات', 'ok');
  }

  function setSaveState(s) {
    var el = $('#saveState');
    el.className = 'save-state ' + s;
    el.textContent = s === 'dirty' ? '● فيه تعديلات' : (s === 'saved' ? '● محفوظ' : '● محفوظ');
  }

  function markDirty() {
    dirty = true;
    setSaveState('dirty');
  }

  /* ═══════════ 2) تحميل من data.json (أول مرة) ═══════════ */
  function fetchDefaults() {
    return fetch('data.json?v=' + Date.now())
      .then(function (r) { return r.json(); })
      .then(function (d) {
        data = d;
        scanImages();
        saveData(true);
      });
  }

  function scanImages() {
    // نقرأ قائمة الصور من الـ manifest الموجود في data.json
    if (data && data._images) {
      images = data._images.slice();
      return;
    }
    images = [];
  }

  /* ═══════════ 3) الدخول ═══════════ */
  function initLogin() {
    $('#loginForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var v = $('#pass').value;
      if (v === PASS) {
        $('#loginErr').hidden = true;
        $('#login').hidden = true;
        $('#app').hidden = false;
        boot();
      } else {
        $('#loginErr').hidden = false;
        $('#pass').value = '';
        $('#pass').focus();
      }
    });
  }

  function boot() {
    loadAll();
    /* دايماً بنجيب الأحدث من data.json وبندمج فوقه المحفوظ.
       Reason: لو اعتمدنا على المحفوظ بس، الحقول الجديدة (extras/صور جديدة)
       هتفضل ناقصة والمستخدم مش هيشوفها. */
    fetch('data.json?v=' + Date.now())
      .then(function (r) { return r.json(); })
      .then(function (d) {
        data = mergeDefaults(d);
        scanImages();
        saveData(true);
        applyScale();
        renderAll();
        setSaveState('saved');
      })
      .catch(function (e) {
        // فشل الشبكة → نكمّل بالمحفوظ
        if (!data) { toast('❌ فشل تحميل البيانات: ' + e.message, 'err'); return; }
        scanImages();
        applyScale();
        renderAll();
        setSaveState('saved');
      });
  }

  /* ═══ دمج الأحدث (data.json) مع المحفوظ (تعديلات المستخدم) ═══ */
  function mergeDefaults(base) {
    var saved = null;
    try { saved = JSON.parse(localStorage.getItem(LS_KEY) || 'null'); } catch (e) { saved = null; }
    if (!saved) return base;

    var out = JSON.parse(JSON.stringify(base));

    // القائمة: item-wise merge (تعديلات المستخدم ليها الأولوية)
    if (saved.menu && saved.menu.length && out.menu) {
      out.menu.forEach(function (bm) {
        var sm = null;
        saved.menu.forEach(function (x) { if (x.key === bm.key) sm = x; });
        if (!sm) return;
        bm.items.forEach(function (bi) {
          var si = null;
          (sm.items || []).forEach(function (x) {
            if ((x.id && x.id === bi.id) || x.name === bi.name) si = x;
          });
          if (!si) return;
          for (var k in si) {
            if (Object.prototype.hasOwnProperty.call(si, k)) bi[k] = si[k];
          }
          if (!bi.id) bi.id = si.id;
        });
        // أصناف زادها المستخدم
        (sm.items || []).forEach(function (si) {
          var exists = bm.items.some(function (x) {
            return (si.id && x.id === si.id) || x.name === si.name;
          });
          if (!exists) bm.items.push(JSON.parse(JSON.stringify(si)));
        });
      });
    }

    // محتوى/مطعم/كتالوج: لو المحفوظ فيه شغل، يفضّل
    if (saved.content && Object.keys(saved.content).length) out.content = saved.content;
    if (saved.restaurant && Object.keys(saved.restaurant).length) out.restaurant = saved.restaurant;
    if (saved.catalog && saved.catalog.length) out.catalog = saved.catalog;

    // الحقول الجديدة: لو المحفوظ قديم وفاضي → من base
    if (!saved.extras || !Object.keys(saved.extras).length) out.extras = base.extras;
    if (!saved.sizeKeys || !Object.keys(saved.sizeKeys).length) out.sizeKeys = base.sizeKeys;
    if (!saved._images || !saved._images.length) out._images = base._images;

    // لو المحفوظ فيه extras ناقصة (قسم مش موجود) → نكمّل من base
    if (out.extras && base.extras) {
      for (var k2 in base.extras) {
        if (!out.extras[k2]) out.extras[k2] = base.extras[k2];
      }
    }
    return out;
  }

  /* ═══════════ 4) التصيير العام ═══════════ */
  function renderAll() {
    renderTabs();
    renderSections();
    renderMenu();
    renderExtras();
    renderImages();
    renderContent();
    renderInfo();
    renderScale();
    $('#verInfo').textContent = 'الإصدار ' + (data.version || 1) + ' — ' +
      (data.menu.length) + ' قسم / ' +
      (data.menu.reduce(function (a, m) { return a + m.items.length; }, 0)) + ' صنف';
  }

  /* ═══════════ 5) التبويبات ═══════════ */
  function renderTabs() {
    // كل تبويب يرسم نفسه لما تفتحه — عشان التعديلات تظهر فوراً
    var onOpen = {
      sections: renderSections,
      items: renderMenu,
      extras: renderExtras,
      images: renderImages,
      content: renderContent,
      info: renderInfo
    };
    $$('#tabs .tb-tab').forEach(function (b) {
      b.onclick = function () {
        $$('#tabs .tb-tab').forEach(function (x) { x.classList.remove('active'); });
        b.classList.add('active');
        $$('.panel').forEach(function (p) { p.hidden = p.dataset.panel !== b.dataset.tab; });
        var fn = onOpen[b.dataset.tab];
        if (fn) { try { fn(); } catch (e) { console.error('render ' + b.dataset.tab, e); } }
        window.scrollTo({ top: 0, behavior: 'smooth' });
      };
    });
  }

  /* ═══════════ 6) الأقسام ═══════════ */
  function renderSections() {
    var grid = $('#sectionsGrid');
    var cs = data.content.sections;
    grid.innerHTML = cs.map(function (s, i) {
      return '' +
        '<div class="sec-card" data-i="' + i + '">' +
          '<div class="sec-num">' + esc(s.num) + '</div>' +
          '<img class="sec-img" src="' + esc(s.img) + '" alt="" loading="lazy">' +
          '<div class="sec-thumb-row">' +
            '<img src="' + esc(s.img) + '" alt="">' +
            '<input class="inp sm" data-f="img" value="' + esc(s.img) + '">' +
            '<button class="btn ghost sm" data-pick="' + i + '">🖼️</button>' +
          '</div>' +
          '<div class="ce-2">' +
            '<label class="fld"><span>رقم القسم</span><input class="inp sm" data-f="num" value="' + esc(s.num) + '"></label>' +
            '<label class="fld"><span>العنوان</span><input class="inp sm" data-f="title" value="' + esc(s.title) + '"></label>' +
          '</div>' +
          '<label class="fld"><span>الوصف</span><input class="inp sm" data-f="desc" value="' + esc(s.desc) + '"></label>' +
          '<label class="fld"><span>المفتاح (URL)</span><input class="inp sm" data-f="key" value="' + esc(s.key) + '"></label>' +
          '<div class="row-inline">' +
            '<button class="btn danger ghost sm" data-del="' + i + '">− حذف القسم</button>' +
          '</div>' +
        '</div>';
    }).join('');

    grid.querySelectorAll('.sec-card').forEach(function (card) {
      var i = +card.dataset.i;
      card.querySelectorAll('[data-f]').forEach(function (inp) {
        inp.oninput = function () {
          data.content.sections[i][inp.dataset.f] = inp.value;
          if (inp.dataset.f === 'img') {
            card.querySelector('.sec-img').src = inp.value;
            card.querySelector('.sec-thumb-row img').src = inp.value;
          }
          markDirty();
        };
      });
      var del = card.querySelector('[data-del]');
      if (del) del.onclick = function () {
        confirmBox('حذف القسم', 'متأكد إنك عايز تحذف «' + data.content.sections[i].title + '»؟')(
          function () {
            data.content.sections.splice(i, 1);
            markDirty(); renderSections();
          });
      };
      var pick = card.querySelector('[data-pick]');
      if (pick) pick.onclick = function () {
        openPicker(function (path) {
          data.content.sections[i].img = path;
          markDirty(); renderSections();
        });
      };
    });
  }

  $('#addSection').onclick = function () {
    data.content.sections.push({
      key: 'new' + (data.content.sections.length + 1),
      num: String(data.content.sections.length + 1).padStart(2, '0'),
      title: 'قسم جديد', desc: 'وصف القسم', img: 'assets/webp/sq-professional-overhead-pizza-isolated-dar-2.webp'
    });
    markDirty(); renderSections();
  };
  $('#delSection').onclick = function () {
    if (data.content.sections.length <= 1) return toast('❌ لازم يفضل قسم واحد على الأقل', 'err');
    confirmBox('حذف آخر قسم', 'متأكد؟')(
      function () {
        data.content.sections.pop(); markDirty(); renderSections();
      });
  };

  /* المفتاح الحقيقي لعمود الحجم */
  function colKeyOf(m, label) {
    var sk = (data.sizeKeys && data.sizeKeys[m.key]) || {};
    return sk[label] || label;
  }


  /* ═══════════ منتقي صورة للمنتج ═══════════ */
  /* بنبني dropdown اختيار من الصور المتاحة */
  function imgOptions(cur) {
    var opts = ['<option value="">— بدون صورة —</option>'];

    /* نرتّب: المربعة (sq-*) الأول لأنها الأنسب لبطاقات المنتجات،
       وبعدها الباقي. ونحسب نوع كل صورة من أبعادها. */
    var list = images.map(function (im) {
      var w = im.w || 0, h = im.h || 0;
      var square = w && h && Math.abs(w - h) < 40;
      var landscape = w && h && w > h * 1.3;
      return { im: im, square: square, landscape: landscape };
    });
    list.sort(function (a, b) {
      if (a.square !== b.square) return a.square ? -1 : 1;
      return (a.im.name || '').localeCompare(b.im.name || '');
    });

    list.forEach(function (o) {
      var im = o.im;
      var sel = (im.path === cur) ? ' selected' : '';
      var dims = im.dim ? im.dim : (im.w && im.h ? (im.w + '×' + im.h) : '');
      var badge = o.square ? '🟩 مربعة' : (o.landscape ? '🟨 أفقية' : '⬜');
      var label = (im.name || im.path) + (dims ? '  (' + dims + ')' : '') + '  ' + badge;
      opts.push('<option value="' + esc(im.path) + '"' + sel + '>' + esc(label) + '</option>');
    });
    return opts.join('');
  }

  /* حقل اختيار صورة جاهز (select) */
  function imgField(cur, attr) {
    return '<select class="inp sm img-sel" ' + attr + '>' + imgOptions(cur) + '</select>';
  }

  /* زر رفع صورة مباشرة للمنتج */
  function imgUploadBtn(attr) {
    return '<button type="button" class="btn ghost sm img-up" ' + attr + '>📤 رفع</button>';
  }

  /* لما نرفع صورة للمنتج: نضيفها للقائمة ونختارها */
  function pickUploadedFor(target, dataUrl, name) {
    var path = 'assets/upload/' + String(name).replace(/[^\w.\-]/g, '_');
    images.push({ path: path, name: name, dataUrl: dataUrl });
    target.value = path;
    markDirty();
    toast('✅ اتحدّثت صورة المنتج', 'ok');
  }

  /* ═══════════ 7) الأصناف والأسعار ═══════════ */
  function renderMenu() {
    var tabs = $('#menuTabs');
    tabs.innerHTML = data.menu.map(function (m, i) {
      return '<button class="subtab' + (i === curMenu ? ' active' : '') + '" data-i="' + i + '">' +
        esc(m.emoji || '') + ' ' + esc(m.title) + ' (' + m.items.length + ')</button>';
    }).join('');
    tabs.querySelectorAll('.subtab').forEach(function (b) {
      b.onclick = function () { curMenu = +b.dataset.i; renderMenu(); };
    });

    var m = data.menu[curMenu];
    $('#menuTitle').textContent = 'قسم: ' + m.title;
    $('#menuDesc').value = m.desc || '';
    $('#menuEmoji').value = m.emoji || '';

    var hasSizes = !!m.sizes;
    var cols = hasSizes ? m.sizes : ['price'];
    // خريطة: اسم العرض (عربي) → المفتاح في البيانات (إنجليزي)
    var sk = (data.sizeKeys && data.sizeKeys[m.key]) || {};
    var colKey = function (c) { return (hasSizes && sk[c]) ? sk[c] : c; };
    $('#sizeRow').innerHTML = hasSizes
      ? '<div class="size-note">ℹ️ القسم ده بيستخدم أحجام: <b>' + m.sizes.join(' / ') + '</b> — الأسعار دي للأصناف اللي في القسم ده.</div>'
      : '';

    var head = '<div class="it-row head"><div>اسم الصنف</div>' +
      cols.map(function (c) { return '<div>' + esc(c) + '</div>'; }).join('') +
      '<div>الصورة</div><div></div></div>';

    var rows = m.items.map(function (it, i) {
      var inputs = cols.map(function (c) {
        var k = colKey(c);
        var v = it[k];
        return '<div><input class="inp num" data-c="' + esc(c) + '" data-k="' + esc(k) + '" data-i="' + i + '" type="number" min="0" step="1" value="' +
          (v == null ? '' : v) + '"></div>';
      }).join('');

      // عمود الصورة: معاينة + اختيار + رفع
      var thumb = it.img
        ? '<img class="it-thumb" src="' + esc(it.img) + '" alt="">'
        : '<span class="it-thumb it-thumb-empty">📷</span>';
      var imgCell = '<div class="it-img-cell">' + thumb +
        imgField(it.img || '', 'data-img-i="' + i + '"') +
        imgUploadBtn('data-imgup-i="' + i + '"') +
        '</div>';
      return '<div class="it-row">' +
        '<div class="nm"><input class="inp" data-c="name" data-i="' + i + '" value="' + esc(it.name) + '"></div>' +
        inputs +
        imgCell +
        '<div><button class="it-del" data-del="' + i + '" title="حذف">✕</button></div>' +
      '</div>';
    }).join('');

    /* شرح المقاس المناسب — حسب نوع القسم */
    var isPizza = (m.key === 'pizza');
    var sizeHint = isPizza
      ? '<div class="size-hint"><b>🖼️ المقاس المناسب للبيتزا:</b> صورة <b>مربعة</b> (الأبعاد متساوية) — ' +
        'علامة 🟩 في القائمة. الكارت بيعرض الصورة كاملة من غير قص. ' +
        '<br><span class="sh-dim">المقاس المثالي: <b>800×800</b> أو على الأقل <b>400×400</b> بكسل. ' +
        'لو رفعت صورة أكبر يبقى الموقع بيصغّرها أوتوماتيك.</span></div>'
      : '<div class="size-hint"><b>🖼️ المقاس المناسب:</b> صورة <b>مربعة</b> 800×800 أو 400×400 بكسل ' +
        'علامة 🟩 — أو أي مقاس بيشتغل، الموقع بيظبطها تلقائي. ' +
        '<span class="sh-dim">الأفضل 800×800 للصفحة الرئيسية و 400×400 للهاتف.</span></div>';

    $('#itemsTable').innerHTML = sizeHint + head + (rows || '<div class="it-empty">مفيش أصناف — اضغط «+ صنف جديد»</div>');

    $('#itemsTable').querySelectorAll('[data-c]').forEach(function (inp) {
      inp.oninput = function () {
        var i = +inp.dataset.i;
        var c = (inp.dataset.k || inp.dataset.c);
        var v = (c === 'name') ? inp.value : (inp.value === '' ? 0 : +inp.value);
        m.items[i][c] = v;
        markDirty();
      };
    });
    // منتقي صورة الصنف (menu)
    $('#itemsTable').querySelectorAll('[data-img-i]').forEach(function (sel) {
      sel.onchange = function () {
        var i = +sel.dataset.imgI;
        m.items[i].img = sel.value;
        if (!sel.value) delete m.items[i].img;
        markDirty();
        renderMenu();
      };
    });
    // رفع صورة للصنف (menu)
    $('#itemsTable').querySelectorAll('[data-imgup-i]').forEach(function (b) {
      b.onclick = function () {
        var i = +b.dataset.imgupI;
        var inp = document.createElement('input');
        inp.type = 'file';
        inp.accept = 'image/*';
        inp.onchange = function () {
          var f = inp.files[0];
          if (!f) return;
          var rd = new FileReader();
          rd.onload = function (e) {
            var path = 'assets/upload/' + String(f.name).replace(/[^\w.\-]/g, '_');
            images.push({ path: path, name: f.name, dataUrl: e.target.result });
            m.items[i].img = path;
            markDirty();
            renderMenu();
            toast('✅ اتحدّثت صورة المنتج', 'ok');
          };
          rd.readAsDataURL(f);
        };
        inp.click();
      };
    });

    // الحذف
    $('#itemsTable').querySelectorAll('[data-del]').forEach(function (b) {
      b.onclick = function () {
        var i = +b.dataset.del;
        confirmBox('حذف الصنف', 'متأكد إنك عايز تحذف «' + m.items[i].name + '»؟')(
          function () { m.items.splice(i, 1); markDirty(); renderMenu(); });
      };
    });

    $('#addSize').hidden = !hasSizes;
    $('#delSize').hidden = !hasSizes;
  }

  $('#menuDesc').oninput = function () { data.menu[curMenu].desc = this.value; markDirty(); };
  $('#menuEmoji').oninput = function () { data.menu[curMenu].emoji = this.value; markDirty(); };

  $('#addItem').onclick = function () {
    var m = data.menu[curMenu];
    var it = { name: 'صنف جديد' };
    if (m.sizes) m.sizes.forEach(function (s) { it[colKeyOf(m, s)] = 0; });
    else it.price = 0;
    m.items.push(it);
    markDirty(); renderMenu();
  };

  $('#addSize').onclick = function () {
    var m = data.menu[curMenu];
    var n = 'حجم ' + (m.sizes.length + 1);
    m.sizes.push(n);
    m.items.forEach(function (it) { it[n] = 0; });
    markDirty(); renderMenu();
  };

  $('#delSize').onclick = function () {
    var m = data.menu[curMenu];
    if (m.sizes.length <= 1) return toast('❌ لازم يفضل حجم واحد على الأقل', 'err');
    var last = m.sizes.pop();
    confirmBox('حذف الحجم', 'متأكد إنك عايز تحذف «' + last + '»؟ الأسعار بتاعته هتتشال.')(
      function () {
        var lk = colKeyOf(m, last);
        m.items.forEach(function (it) { delete it[lk]; });
        markDirty(); renderMenu();
      });
  };

  /* ═══════════ 8) الإضافات — extras ═══════════ */
  function renderExtras() {
    var cats = Object.keys(data.extras || {});
    if (!cats.length) { $('#extrasEditor').innerHTML = '<div class="it-empty">مفيش إضافات</div>'; return; }

    var tabs = cats.map(function (k) {
      var m = data.menu.find(function (x) { return x.key === k; });
      return '<button class="subtab' + (k === curCat ? ' active' : '') + '" data-k="' + esc(k) + '">' +
        esc(m ? m.title : k) + '</button>';
    }).join('');

    var list = (data.extras[curCat] || []).map(function (e, i) {
      return '<div class="cat-item ex-item">' +
        '<div class="ci-main"><b>' + esc(e.name) + '</b></div>' +
        '<div class="cat-prices"><span class="chip">💰 <input class="inp sm" data-ep="price" data-i="' + i + '" type="number" min="0" value="' + e.price + '"> ج.م</span></div>' +
        '<input class="inp sm" data-ep="name" data-i="' + i + '" value="' + esc(e.name) + '">' +
        '<button class="it-del" data-exdel="' + i + '">✕</button>' +
      '</div>';
    }).join('');

    $('#extrasEditor').innerHTML =
      '<div class="cat-tabs" id="exTabs">' + tabs + '</div>' +
      '<div class="cat-editor"><h4 style="font-size:15px;color:var(--orange);margin-bottom:10px">إضافات قسم: ' +
        esc((data.menu.find(function (x) { return x.key === curCat; }) || {}).title || curCat) +
      '</h4>' +
      '<div class="cat-list">' + (list || '<div class="it-empty">مفيش إضافات</div>') + '</div>' +
      '<div class="panel-foot"><button class="btn ghost" id="addExtra">+ إضافة جديدة</button></div>' +
      '</div>';

    $('#exTabs').querySelectorAll('.subtab').forEach(function (b) {
      b.onclick = function () { curCat = b.dataset.k; renderExtras(); };
    });

    $('#extrasEditor').querySelectorAll('[data-ep]').forEach(function (inp) {
      inp.oninput = function () {
        var i = +inp.dataset.i, p = inp.dataset.ep;
        data.extras[curCat][i][p] = (p === 'price') ? +inp.value : inp.value;
        markDirty();
      };
    });
    $('#extrasEditor').querySelectorAll('[data-exdel]').forEach(function (b) {
      b.onclick = function () {
        var i = +b.dataset.exdel;
        confirmBox('حذف الإضافة', 'حذف «' + data.extras[curCat][i].name + '»؟')(
          function () { data.extras[curCat].splice(i, 1); markDirty(); renderExtras(); });
      };
    });
    $('#addExtra').onclick = function () {
      data.extras[curCat].push({ name: 'إضافة جديدة', price: 0 });
      markDirty(); renderExtras();
    };
  }

  /* ═══════════ 9) الصور ═══════════ */
  function renderImages() {
    var g = $('#imgsGallery');
    if (!images.length) {
      g.innerHTML = '<div class="it-empty">مفيش صور — ارفع صورة عشان تبدأ</div>';
      return;
    }
    g.innerHTML = images.map(function (im, i) {
      return '<div class="img-card' + (selImg === im.path ? ' sel' : '') + '" data-i="' + i + '">' +
        '<img src="' + esc(im.path) + '" alt="" loading="lazy">' +
        (im.dim ? '<span class="img-dim">' + esc(im.dim) + '</span>' : '') +
        '<div class="img-meta"><b>' + esc(im.name) + '</b><small>' + esc(im.path) + '</small></div>' +
      '</div>';
    }).join('');
    g.querySelectorAll('.img-card').forEach(function (c) {
      c.onclick = function () {
        var im = images[+c.dataset.i];
        selImg = im.path;
        renderImages();
        $('#lbImg').src = im.path;
        $('#lbCap').textContent = im.name + ' — ' + im.path + (im.dim ? ' — ' + im.dim : '');
        $('#lightbox').hidden = false;
      };
    });
  }

  $('#delImg').onclick = function () {
    if (!selImg) return toast('❌ اختار صورة الأول', 'err');
    confirmBox('حذف الصورة', 'حذف «' + selImg + '»؟')(
      function () {
        images = images.filter(function (x) { return x.path !== selImg; });
        selImg = null;
        markDirty(); renderImages();
      });
  };

  $('#lbClose').onclick = function () { $('#lightbox').hidden = true; };
  $('#lightbox').onclick = function (e) { if (e.target.id === 'lightbox') $('#lightbox').hidden = true; };

  // رفع صورة
  var zone = $('#uploadZone');
  zone.onclick = function () { $('#fileInput').click(); };
  zone.ondragover = function (e) { e.preventDefault(); zone.classList.add('drag'); };
  zone.ondragleave = function () { zone.classList.remove('drag'); };
  zone.ondrop = function (e) {
    e.preventDefault(); zone.classList.remove('drag');
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  };
  $('#fileInput').onchange = function () { if (this.files[0]) handleFile(this.files[0]); };

  function handleFile(file) {
    if (!/^image\//.test(file.type)) return toast('❌ الملف ده مش صورة', 'err');
    var reader = new FileReader();
    reader.onload = function (e) {
      var img = new Image();
      img.onload = function () {
        var w = img.width, h = img.height;
        var ratio = (w / h).toFixed(2);
        var ideal = ratio > 1.2 && ratio < 1.5 ? '✅ النسبة قريبة من 4:3'
          : (w < 400 ? '⚠️ العرض صغير — يفضل 400 بكسل على الأقل'
          : (w > 1600 ? '⚠️ العرض كبير — يفضل أقل من 1200 بكسل'
          : '✅ حجم مناسب'));
        var path = 'assets/upload/' + file.name.replace(/[^\w.\-]/g, '_');
        images.push({ path: path, name: file.name, dim: w + '×' + h, dataUrl: e.target.result });
        data._images = images.slice();
        selImg = path;
        markDirty();
        $('#upPreview').hidden = false;
        $('#upPreview').innerHTML =
          '<div class="up-preview-box">' +
            '<img src="' + esc(e.target.result) + '" alt="">' +
            '<div><b>' + esc(file.name) + '</b><br>' +
            '<small style="color:var(--muted)">المقاس: <b style="color:var(--orange)">' + w + '×' + h + '</b> بكسل · النسبة ' + ratio + '</small><br>' +
            '<small style="color:' + (ideal.startsWith('✅') ? 'var(--green)' : 'var(--orange)') + '">' + ideal + '</small></div>' +
          '</div>';
        renderImages();
        toast('✅ اتضافت الصورة: ' + file.name, 'ok');
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  // منتقي الصور
  function openPicker(cb) {
    var wrap = document.createElement('div');
    wrap.className = 'modal';
    wrap.innerHTML = '<div class="modal-card" style="width:min(760px,100%)">' +
      '<h3>اختار صورة</h3>' +
      '<div class="imgs-gallery" style="max-height:60vh;overflow:auto">' +
      images.map(function (im) {
        return '<div class="img-card" data-p="' + esc(im.path) + '">' +
          '<img src="' + esc(im.dataUrl || im.path) + '" alt="">' +
          '<div class="img-meta"><b>' + esc(im.name) + '</b></div></div>';
      }).join('') + '</div>' +
      '<div class="modal-actions" style="margin-top:16px"><button class="btn ghost" data-cancel>إلغاء</button></div>' +
      '</div>';
    document.body.appendChild(wrap);
    wrap.querySelectorAll('[data-p]').forEach(function (c) {
      c.onclick = function () { cb(c.dataset.p); wrap.remove(); };
    });
    wrap.querySelector('[data-cancel]').onclick = function () { wrap.remove(); };
    wrap.onclick = function (e) { if (e.target === wrap) wrap.remove(); };
  }

  /* ═══════════ 10) النصوص ═══════════ */
  var TEXT_MAP = [
    { grp: 'الهوية', fields: [
      { path: 'content.brand.name', l: 'اسم المطعم' },
      { path: 'content.brand.name2', l: 'اسم المطعم (الجزء الملوّن)' },
      { path: 'content.brand.english', l: 'الاسم بالإنجليزي' },
      { path: 'content.brand.logoEmoji', l: 'إيموجي اللوجو' },
      { path: 'content.brand.tagline', l: 'الشعار النصي' }
    ]},
    { grp: 'الصفحة الرئيسية', fields: [
      { path: 'content.hero.eyebrow', l: 'العنوان الصغير فوق' },
      { path: 'content.hero.title1', l: 'العنوان — السطر 1' },
      { path: 'content.hero.title2', l: 'العنوان — السطر 2' },
      { path: 'content.hero.desc', l: 'الوصف', ta: 1 },
      { path: 'content.hero.cta', l: 'زر «شوف القائمة»' },
      { path: 'content.hero.cta2', l: 'زر «قائمة الأكل» في الترويسة' }
    ]},
    { grp: 'أقسام الرئيسية', fields: [
      { path: 'content.home.sectionsTitle', l: 'عنوان قسم «أقسامنا»' },
      { path: 'content.home.sectionsSub', l: 'وصف قسم «أقسامنا»' }
    ]},
    { grp: 'صفحة القائمة', fields: [
      { path: 'content.menu.eyebrow', l: 'العنوان الصغير' },
      { path: 'content.menu.title', l: 'العنوان' },
      { path: 'content.menu.titleHl', l: 'العنوان الملوّن' },
      { path: 'content.menu.crumb', l: 'مسار التنقل' },
      { path: 'content.menu.desc', l: 'الوصف', ta: 1 }
    ]},
    { grp: 'صفحة المنتج', fields: [
      { path: 'content.product.builderTitle', l: 'عنوان صندوق الطلب' },
      { path: 'content.product.hint', l: 'التلميح' },
      { path: 'content.product.sizeLabel', l: 'عنوان الأحجام' },
      { path: 'content.product.sizeRequired', l: 'كلمة «مطلوب»' },
      { path: 'content.product.extrasLabel', l: 'عنوان الإضافات' },
      { path: 'content.product.extrasRequired', l: 'كلمة «اختياري»' },
      { path: 'content.product.notesLabel', l: 'عنوان الملاحظات' },
      { path: 'content.product.notesPlaceholder', l: 'نص حقل الملاحظات' },
      { path: 'content.product.qtyLabel', l: 'عنوان الكمية' },
      { path: 'content.product.sumItem', l: 'سطر الملخص: سعر الأكلة' },
      { path: 'content.product.sumExtras', l: 'سطر الملخص: الإضافات' },
      { path: 'content.product.sumTotal', l: 'سطر الملخص: الإجمالي' },
      { path: 'content.product.footer', l: 'نص الفوتر' }
    ]},
    { grp: 'خطوات الطلب', fields: [
      { path: 'content.home.steps.0', l: 'الخطوة 1' },
      { path: 'content.home.steps.1', l: 'الخطوة 2' },
      { path: 'content.home.steps.2', l: 'الخطوة 3' },
      { path: 'content.home.steps.3', l: 'الخطوة 4' }
    ]}
  ];

  function getPath(o, path) {
    return path.split('.').reduce(function (a, k) { return a == null ? a : a[k]; }, o);
  }
  function setPath(o, path, v) {
    var ks = path.split('.'), last = ks.pop();
    var t = ks.reduce(function (a, k) { return a[k] = a[k] || {}; }, o);
    t[last] = v;
  }

  function renderContent() {
    $('#contentEditor').innerHTML = TEXT_MAP.map(function (g) {
      return '<div class="ce-group"><h4>📝 ' + esc(g.grp) + '</h4>' +
        g.fields.map(function (f) {
          var v = getPath(data, f.path);
          return '<label class="fld"><span>' + esc(f.l) + '</span>' +
            (f.ta
              ? '<textarea class="inp" data-p="' + esc(f.path) + '">' + esc(v) + '</textarea>'
              : '<input class="inp" data-p="' + esc(f.path) + '" value="' + esc(v) + '">') +
            '</label>';
        }).join('') + '</div>';
    }).join('');
    $('#contentEditor').querySelectorAll('[data-p]').forEach(function (el) {
      el.oninput = function () { setPath(data, el.dataset.p, el.value); markDirty(); };
    });
  }

  /* ═══════════ 11) بيانات المطعم ═══════════ */
  function renderInfo() {
    var r = data.restaurant;
    $('#infoEditor').innerHTML =
      '<div class="ce-group"><h4>📞 بيانات المطعم</h4>' +
        '<div class="ce-2">' +
          '<label class="fld"><span>اسم المطعم</span><input class="inp" data-p="name" value="' + esc(r.name) + '"></label>' +
          '<label class="fld"><span>الاسم بالإنجليزي</span><input class="inp" data-p="english" value="' + esc(r.english) + '"></label>' +
        '</div>' +
        '<label class="fld"><span>رقم واتساب (<code>201004388613</code>)</span><input class="inp" data-p="whatsapp" value="' + esc(r.whatsapp) + '"></label>' +
        '<label class="fld"><span>العنوان</span><input class="inp" data-p="address" value="' + esc(r.address) + '"></label>' +
        '<label class="fld"><span>صفحة الفيسبوك</span><input class="inp" data-p="facebook" value="' + esc(r.facebook) + '"></label>' +
        '<label class="fld"><span>أرقام الحجز (افصل بينهم بفاصلة)</span><input class="inp" id="phones" value="' + esc(r.phones.join(', ')) + '"></label>' +
      '</div>';
    $('#infoEditor').querySelectorAll('[data-p]').forEach(function (el) {
      el.oninput = function () { data.restaurant[el.dataset.p] = el.value; markDirty(); };
    });
    $('#phones').oninput = function () {
      data.restaurant.phones = this.value.split(/[,،]/).map(function (s) { return s.trim(); }).filter(Boolean);
      markDirty();
    };
  }

  /* ═══════════ 12) تكبير وتصغير النصوص ═══════════ */
  var SCALE_TARGETS = [
    { k: 'base', l: 'حجم الخط الأساسي', d: 'كل النصوص العادية', min: 80, max: 130 },
    { k: 'hero', l: 'عنوان البطل (Hero)', d: 'الكلام الكبير فوق «عايز تاكل إيه»', min: 70, max: 150 },
    { k: 'sectionTitle', l: 'عناوين الأقسام', d: 'زي «اختار القسم اللي يعجبك»', min: 70, max: 150 },
    { k: 'menuTitle', l: 'عناوين البطاقات', d: 'أسماء الأصناف في القايمة', min: 75, max: 140 },
    { k: 'price', l: 'الأسعار', d: 'أرقام الأسعار في القايمة', min: 75, max: 150 },
    { k: 'btn', l: 'الأزرار', d: 'حجم نص الأزرار', min: 75, max: 140 },
    { k: 'desc', l: 'الأوصاف', d: 'النصوص التوضيحية', min: 80, max: 130 }
  ];

  function renderScale() {
    $('#scaleBox').innerHTML =
      SCALE_TARGETS.map(function (t) {
        var v = scale[t.k] || 100;
        return '<div class="scale-row">' +
          '<label>' + esc(t.l) + '<small>' + esc(t.d) + '</small></label>' +
          '<input type="range" data-s="' + t.k + '" min="' + t.min + '" max="' + t.max + '" value="' + v + '">' +
          '<div class="scale-val" data-v="' + t.k + '">' + v + '%</div>' +
        '</div>';
      }).join('') +
      '<div class="scale-preview">' +
        '<div style="font-size:' + (scale.base || 100) / 100 + 'em">النص الأساسي — وده بيكبر ويصغر</div>' +
        '<div style="font-size:' + (scale.hero || 100) / 100 + 'em;font-weight:900;color:var(--red);margin-top:9px">عنوان كبير</div>' +
        '<div style="font-size:' + (scale.price || 100) / 100 + 'em;color:var(--orange);font-weight:800;margin-top:9px">120 ج.م</div>' +
      '</div>' +
      '<div class="panel-foot"><button class="btn ghost" id="scaleReset">↺ رجّع الافتراضي</button></div>';

    $('#scaleBox').querySelectorAll('[data-s]').forEach(function (r) {
      r.oninput = function () {
        scale[r.dataset.s] = +r.value;
        $('#scaleBox').querySelector('[data-v="' + r.dataset.s + '"]').textContent = r.value + '%';
        applyScale();
        markDirty();
      };
    });
    $('#scaleReset').onclick = function () {
      scale = {};
      applyScale(); markDirty(); renderScale();
    };
  }

  function applyScale() {
    var s = scale || {};
    var set = function (sel, prop, key, def) {
      var v = s[key] || def;
      $$(sel).forEach(function (el) { el.style[prop] = (v / 100) + 'em'; });
    };
    document.documentElement.style.setProperty('--sc-base', (s.base || 100) / 100);
    document.documentElement.style.setProperty('--sc-hero', (s.hero || 100) / 100);
    document.documentElement.style.setProperty('--sc-sectionTitle', (s.sectionTitle || 100) / 100);
    document.documentElement.style.setProperty('--sc-menuTitle', (s.menuTitle || 100) / 100);
    document.documentElement.style.setProperty('--sc-price', (s.price || 100) / 100);
    document.documentElement.style.setProperty('--sc-btn', (s.btn || 100) / 100);
    document.documentElement.style.setProperty('--sc-desc', (s.desc || 100) / 100);
  }

  /* ═══════════ 13) استيراد / تصدير ═══════════ */
  $('#btnExport').onclick = function () {
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'crepe-el-hana-data.json';
    a.click();
    toast('⬇ اتصدّر الملف', 'ok');
  };

  $('#btnImport').onclick = function () {
    var inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'application/json';
    inp.onchange = function () {
      var f = inp.files[0]; if (!f) return;
      var r = new FileReader();
      r.onload = function (e) {
        try {
          data = JSON.parse(e.target.result);
          markDirty(); renderAll(); saveData();
          toast('✅ اتستورد الملف', 'ok');
        } catch (err) { toast('❌ ملف غير صالح', 'err'); }
      };
      r.readAsText(f);
    };
    inp.click();
  };

  $('#btnSave').onclick = function () { saveData(); };
  $('#btnLogout').onclick = function () {
    if (dirty) {
      confirmBox('فيه تعديلات مش متحفوظة', 'تحب تحفظها الأول؟')(
        function () { saveData(true); location.reload(); },
        function () { location.reload(); });
    } else location.reload();
  };

  /* ═══════════ 14) تأكيد + توست ═══════════ */
  function confirmBox(title, msg) {
    $('#confirmTitle').textContent = title;
    $('#confirmMsg').textContent = msg;
    $('#confirm').hidden = false;
    return function (yes, no) {
      $('#confirmYes').onclick = function () { $('#confirm').hidden = true; if (yes) yes(); };
      $('#confirmNo').onclick = function () { $('#confirm').hidden = true; if (no) no(); };
    };
  }

  function toast(msg, kind) {
    var t = $('#toast');
    t.textContent = msg;
    t.className = 'toast ' + (kind || '');
    t.hidden = false;
    clearTimeout(t._tm);
    t._tm = setTimeout(function () { t.hidden = true; }, 2600);
  }

  /* ═══════════ 15) الاختصارات ═══════════ */
  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); saveData(); }
  });
  window.addEventListener('beforeunload', function (e) {
    if (dirty) { e.preventDefault(); e.returnValue = ''; }
  });

  initLogin();
})();

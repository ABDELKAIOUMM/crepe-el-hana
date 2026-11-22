/* ============================================================
   كريب الهنا — نظام الطلب على واتساب
   - سلة طلب: زر + بجانب كل سعر
   - شريط ثابت أسفل الشاشة يعرض العدد والإجمالي
   - نافذة تأكيد الطلب
   ============================================================ */
(function () {
  'use strict';

  const WA = (typeof restaurant !== 'undefined' && restaurant.whatsapp) ? restaurant.whatsapp : '201004388613';

  let cart = [];
  let modal = null;
  let bar = null;

  /* ═══ حفظ السلة بين الصفحات ═══
     السلة كانت في الذاكرة بس — فلما بتنتقل من صفحة لمنطقة (زي «ضيف صنف تاني»)
     كانت بتضيع. دلوقتي بنحفظها في sessionStorage عشان تفضل موجودة
     طول ما التبويب مفتوح (وبتتمسح لما يقفل). */
  const CART_KEY = 'crepeElHana_cart_v1';

  function saveCart() {
    try { sessionStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch (e) {}
  }
  function loadCart() {
    try {
      const raw = sessionStorage.getItem(CART_KEY);
      if (!raw) return;
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) cart = arr;
    } catch (e) {}
  }

  /* ============================================================
     1) نافذة الطلب
     ============================================================ */
  function buildModal() {
    const wrap = document.createElement('div');
    wrap.id = 'waModal';
    wrap.setAttribute('aria-hidden', 'true');
    wrap.innerHTML = `
      <div class="wa-backdrop" data-wa-close></div>
      <div class="wa-sheet" role="dialog" aria-modal="true" aria-labelledby="waTitle">
        <button class="wa-close" type="button" data-wa-close aria-label="إغلاق">✕</button>

        <div class="wa-head">
          <span class="wa-head-icon">🛒</span>
          <div>
            <h3 id="waTitle">إكمال الطلب</h3>
            <p>بص على أكلتك واكتب بياناتك عشان نبعتها</p>
          </div>
        </div>

        <div class="wa-items" id="waItems"></div>

        <div class="wa-offer" id="waOffer">
          <div class="wa-offer-top">
            <span class="wa-offer-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
            </span>
            <div>
              <b id="waOfferTitle">اقتربت من مشروب مجاني</b>
              <small id="waOfferText">ضيف أكل أكتر واحصل على مشروب مجاني مع الطلب.</small>
            </div>
          </div>
          <div class="wa-offer-track"><i id="waOfferBar"></i></div>
        </div>

        <div class="wa-summary">
          <div><span>عدد الأكلات</span><b id="waCount">0</b></div>
          <div class="wa-total"><span>الإجمالي</span><b id="waTotal">0 ج.م</b></div>
        </div>

        <div class="wa-fields">
          <label class="wa-field">
            <span>الاسم <i>*</i></span>
            <input type="text" id="waName" placeholder="اسمك" autocomplete="name">
          </label>
          <label class="wa-field">
            <span>العنوان / مكان التوصيل</span>
            <input type="text" id="waAddress" placeholder="مثال: المنيل، شارع عبد الهادي" autocomplete="street-address">
          </label>
          <label class="wa-field wa-field-notes">
            <span>ملاحظات</span>
            <textarea id="waNotes" placeholder="مثال: من غير بصل، الصوص لوحده..."></textarea>
          </label>
          <div class="wa-type">
            <span>هتاخده إزاي</span>
            <div class="wa-type-opts">
              <label class="wa-radio"><input type="radio" name="waType" value="توصيل" checked><b>🛵 توصيل</b></label>
              <label class="wa-radio"><input type="radio" name="waType" value="تاخده من المحل"><b>🏪 تاخده من المحل</b></label>
            </div>
          </div>
        </div>

        <button class="wa-send" type="button" id="waSend">
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M17.5 14.4c-.3-.2-1.7-.9-2-1-.3-.1-.5-.1-.7.2s-.8 1-.9 1.2c-.2.2-.3.2-.6.1-1.7-.9-2.8-1.6-3.9-3.5-.3-.5.3-.5.8-1.5.1-.2 0-.4 0-.5s-.7-1.6-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.1.2 2.1 3.2 5.1 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.7-.7 2-1.4.2-.7.2-1.3.2-1.4-.1-.2-.3-.3-.6-.4zM12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2zm0 18.2c-1.6 0-3.1-.4-4.4-1.2l-.3-.2-3.1.8.8-3-.2-.3A8.2 8.2 0 1 1 12 20.2z"/></svg>
          ابعت الطلب على واتساب
        </button>

        <button class="wa-continue" type="button" id="waContinue">+ ضيف أكلة تانية</button>
        <p class="wa-hint">لما تدوس «ابعت» هيتحل واتساب برسالة الطلب جاهزة تتبعت — مش محتاج رقمك، هنكلمك عليه</p>

        <!-- ═══ نافذة تعديل صنف ═══ -->
        <div class="wa-edit" id="waEdit" aria-hidden="true">
          <div class="wa-edit-backdrop" data-wa-edit-close></div>
          <div class="wa-edit-box" role="dialog" aria-modal="true" aria-labelledby="waEditTitle">
            <button class="wa-edit-close" type="button" data-wa-edit-close aria-label="إغلاق">✕</button>

            <div class="wa-edit-head">
              <h4 id="waEditTitle">تعديل الطلب</h4>
              <p class="wa-edit-sub">غيّر المقاس أو الإضافات أو الكمية أو الملاحظات</p>
            </div>

            <div class="wa-edit-scroll">
              <div class="wa-edit-name"></div>

              <div class="wa-edit-block" id="waEditSizes">
                <b class="wa-edit-lab">الحجم</b>
                <div class="wa-edit-opts" id="waEditSizesOpts"></div>
              </div>

              <div class="wa-edit-block" id="waEditExtras">
                <b class="wa-edit-lab">الإضافات <i>دوس عليها تاني تشيلها</i></b>
                <div class="wa-edit-opts" id="waEditExtrasOpts"></div>
                <p class="wa-edit-hint" id="waEditExtrasHint"></p>
              </div>

              <div class="wa-edit-block">
                <b class="wa-edit-lab">الكمية</b>
                <div class="wa-edit-qty">
                  <button type="button" data-wa-edit-q="-1" aria-label="نقص">−</button>
                  <b id="waEditQty">1</b>
                  <button type="button" data-wa-edit-q="1" aria-label="زوّد">+</button>
                </div>
              </div>

              <div class="wa-edit-block">
                <b class="wa-edit-lab">ملاحظات للطلب</b>
                <textarea id="waEditNotes" placeholder="مثال: دي لصاحبي محمد، من غير بصل..."></textarea>
              </div>
            </div>

            <div class="wa-edit-foot">
              <div class="wa-edit-total">
                <span>الإجمالي</span><b id="waEditTotal">0 ج.م</b>
              </div>
              <div class="wa-edit-actions">
                <button type="button" class="wa-edit-save" id="waEditSave">احفظ التعديل</button>
                <button type="button" class="wa-edit-cancel" data-wa-edit-close">إلغاء</button>
              </div>
            </div>
          </div>
        </div>
      </div>`;
    document.body.appendChild(wrap);
    return wrap;
  }

  /* ============================================================
     2) شريط السلة الثابت أسفل الشاشة
     ============================================================ */
  function buildBar() {
    if (bar) return bar;
    bar = document.createElement('button');
    bar.type = 'button';
    bar.className = 'wa-cartbar';
    bar.setAttribute('aria-label', 'إكمال الطلب');
    bar.innerHTML = `
      <span class="wa-cartbar-icon">🛒</span>
      <span class="wa-cartbar-text"><b id="waBarCount">0 أكلات</b><em id="waBarTotal">0 ج.م</em></span>
      <span class="wa-cartbar-cta">إكمال الطلب ◀</span>`;
    bar.addEventListener('click', openModal);
    document.body.appendChild(bar);
    return bar;
  }

  function updateBar() {
    if (!bar) return;
    const n = cart.reduce((a, x) => a + (x.qty || 0), 0);
    const total = cart.reduce((a, x) => a + unitPrice(x) * x.qty, 0);
    const countEl = bar.querySelector('#waBarCount');
    const totalEl = bar.querySelector('#waBarTotal');
    if (countEl) countEl.textContent = n === 1 ? 'أكلة واحدة' : (n === 2 ? 'أكلتين' : n + ' أكلات');
    if (totalEl) totalEl.textContent = total + ' ج.م';
    bar.classList.toggle('show', n > 0);
    document.body.classList.toggle('wa-has-cart', n > 0);
  }

  /* ============================================================
     3) سلة الطلب
     ============================================================ */
  /* سعر الصنف الواحد شامل الإضافات */
  function unitPrice(it) {
    return (+it.price || 0) + (+it.extrasPrice || 0);
  }

  function addToCart(item, opts) {
    opts = opts || {};
    const qty = Math.max(1, +(item.qty || 1));
    // المفتاح لازم يشمل الإضافات — عشان نفس الأكلة بنفس الحجم
    // لكن بإضافات مختلفة ما تتدمجش في سطر واحد وتلخبط الإجمالي
    const extras = Array.isArray(item.extras) ? item.extras.slice() : [];
    const extrasPrice = +(item.extrasPrice || 0);
    const key = item.cat + '|' + item.name + '|' + (item.size || '') + '|' + extras.join(',');
    const found = cart.find(x => x.key === key);
    if (found) {
      found.qty += qty;
    } else {
      cart.push(Object.assign({}, item, {
        key: key, qty: qty, extras: extras, extrasPrice: extrasPrice
      }));
    }

    saveCart();
    updateBar();
    renderCart();

    if (opts.silent) return;           // إضافة صامتة
    openModal();                        // فتح النافذة
  }

  /* تحديث صنف موجود بدل إضافته من جديد.
     بتدور على نفس (cat + name + size + extras):
       - لو السطر موجود → بتزوّد كميته (نفس الصنف بنفس الإضافات)
       - لو مفيش → بترجع false (يبقى سطر جديد عادي)
     السطر الجديد بيتعمل لما الإضافات تتغيّر (لأن المفتاح بيختلف).
     بترجع true لو اتحدّث فعلاً. */
  function replaceInCart(item, opts) {
    opts = opts || {};
    const qty = Math.max(1, +(item.qty || 1));
    const extras = Array.isArray(item.extras) ? item.extras.slice() : [];
    const extrasPrice = +(item.extrasPrice || 0);
    const key = item.cat + '|' + item.name + '|' + (item.size || '') + '|' + extras.join(',');
    const found = cart.find(x => x.key === key);
    if (!found) return false;
    found.qty += qty;
    found.price = item.price;
    found.extrasPrice = extrasPrice;
    saveCart();
    updateBar();
    renderCart();
    if (!opts.silent) openModal();
    return true;
  }

  /* ============================================================
     3ب) تعديل صنف من جوّه السلة
     ============================================================ */
  let editing = null;   // {index, size, sizePrice, picked[], extrasPrice, qty, notes}

  /* المقاسات المتاحة للصنف ده + سعر كل مقاس.
     الأول: البيانات المتسجلة مع الصنف (sizes).
     الاحتياط: القايمة نفسها لو مش موجودة. */
  function editSizeRows(item) {
    const rows = [];

    /* 1) متسجل مع الصنف — الأدق */
    if (Array.isArray(item.sizes) && item.sizes.length) {
      item.sizes.forEach(function (r) {
        rows.push({ label: r.label, price: +r.price || 0 });
      });
      return rows;
    }

    /* 2) من القايمة */
    if (typeof getMenu !== 'function') return rows;
    let menu = [];
    try { menu = getMenu(); } catch (e) { return rows; }
    const sec = menu.find(m => m.key === item.cat);
    if (!sec) return rows;
    const sk = (typeof getSizeKeys === 'function' ? getSizeKeys() : {}) || {};
    const keys = sk[sec.key] || {};
    (sec.sizes || []).forEach(function (label) {
      const k = keys[label] || label;
      const src = (item && item[k] != null) ? item : (item && item.item ? item.item : null);
      const price = src && src[k] != null ? src[k] : null;
      if (price != null) rows.push({ label: label, price: +price });
    });
    return rows;
  }

  /* الإضافات المتاحة للفئة + سعر كل واحدة */
  function editExtraRows(cat) {
    const rows = [];
    if (typeof getExtrasData !== 'function') return rows;
    let ex = null;
    try { ex = getExtrasData(); } catch (e) { return rows; }
    if (!ex) return rows;
    (ex[cat] || []).forEach(function (e) {
      const name = Array.isArray(e) ? e[0] : e.name;
      const price = Array.isArray(e) ? e[1] : e.price;
      rows.push({ name: name, price: +price || 0 });
    });
    return rows;
  }

  function openEdit(index) {
    if (!modal) return;
    const item = cart[index];
    if (!item) return;

    editing = {
      index: index,
      size: item.size || '',
      sizePrice: +(item.price || 0),
      picked: Array.isArray(item.extras) ? item.extras.slice() : [],
      extrasPrice: +(item.extrasPrice || 0),
      qty: Math.max(1, +(item.qty || 1)),
      notes: item.notes || ''
    };

    const box = modal.querySelector('#waEdit');
    if (!box) return;

    /* الاسم */
    const nameEl = box.querySelector('.wa-edit-name');
    if (nameEl) nameEl.innerHTML = '<b>' + escapeHtml(item.name) + '</b>';

    /* المقاسات */
    const sizeRows = editSizeRows(item);
    const sizeBlock = box.querySelector('#waEditSizes');
    const sizeOpts = box.querySelector('#waEditSizesOpts');
    if (sizeBlock && sizeOpts) {
      if (sizeRows.length) {
        sizeBlock.style.display = '';
        sizeOpts.innerHTML = sizeRows.map(function (r) {
          const on = (editing.size === r.label);
          return '<label class="wa-edit-opt' + (on ? ' on' : '') + '">' +
            '<input type="radio" name="waEditSize" value="' + escapeHtml(r.label) + '" ' +
            'data-price="' + r.price + '"' + (on ? ' checked' : '') + '>' +
            '<b>' + escapeHtml(r.label) + '</b>' +
            '<span>' + r.price + ' ج.م</span></label>';
        }).join('');
        sizeOpts.querySelectorAll('input[name=waEditSize]').forEach(function (inp) {
          inp.addEventListener('change', function () {
            editing.size = inp.value;
            editing.sizePrice = +inp.dataset.price;
            sizeOpts.querySelectorAll('.wa-edit-opt').forEach(function (l) {
              const cb = l.querySelector('input');
              l.classList.toggle('on', !!(cb && cb.checked));
            });
            renderEditTotal();
          });
        });
      } else {
        sizeBlock.style.display = 'none';
        sizeOpts.innerHTML = '';
      }
    }

    /* الإضافات */
    const exRows = editExtraRows(item.cat);
    const exBlock = box.querySelector('#waEditExtras');
    const exOpts = box.querySelector('#waEditExtrasOpts');
    if (exBlock && exOpts) {
      if (exRows.length) {
        exBlock.style.display = '';
        exOpts.innerHTML = exRows.map(function (r) {
          const on = editing.picked.indexOf(r.name) !== -1;
          return '<label class="wa-edit-opt ex' + (on ? ' on' : '') + '">' +
            '<input type="checkbox" value="' + escapeHtml(r.name) + '" data-price="' + r.price + '"' +
            (on ? ' checked' : '') + '>' +
            '<b>' + escapeHtml(r.name) + '</b>' +
            '<span>+ ' + r.price + ' ج.م</span></label>';
        }).join('');
        exOpts.querySelectorAll('input[type=checkbox]').forEach(function (inp) {
          inp.addEventListener('change', function () {
            /* دوس تاني = يشيل */
            editing.picked = [];
            editing.extrasPrice = 0;
            exOpts.querySelectorAll('input:checked').forEach(function (c) {
              editing.picked.push(c.value);
              editing.extrasPrice += (+c.dataset.price || 0);
            });
            exOpts.querySelectorAll('.wa-edit-opt').forEach(function (l) {
              const cb = l.querySelector('input');
              l.classList.toggle('on', !!(cb && cb.checked));
            });
            renderEditTotal();
            renderEditHint();
          });
        });
      } else {
        exBlock.style.display = 'none';
        exOpts.innerHTML = '';
      }
    }

    /* الكمية */
    const qtyEl = box.querySelector('#waEditQty');
    if (qtyEl) qtyEl.textContent = editing.qty;

    /* الملاحظات — بنسمع على الـinput عشان نحفظ القيمة */
    const notesEl = box.querySelector('#waEditNotes');
    if (notesEl) {
      notesEl.value = editing.notes;
      notesEl.oninput = function () {
        if (editing) editing.notes = this.value;
      };
    }

    renderEditTotal();
    renderEditHint();

    box.classList.add('open');
    box.setAttribute('aria-hidden', 'false');
  }

  function renderEditHint() {
    const box = modal && modal.querySelector('#waEdit');
    if (!box || !editing) return;
    const hint = box.querySelector('#waEditExtrasHint');
    if (!hint) return;
    const n = editing.picked.length;
    hint.textContent = n
      ? 'مختار: ' + n + ' — دوس عليها تاني لو عايز تشيلها.'
      : 'مفيش إضافات مختارة.';
    hint.classList.toggle('none', n === 0);
  }

  function renderEditTotal() {
    const box = modal && modal.querySelector('#waEdit');
    if (!box || !editing) return;
    const t = box.querySelector('#waEditTotal');
    if (!t) return;
    const unit = editing.sizePrice + editing.extrasPrice;
    t.textContent = (unit * editing.qty) + ' ج.م';
  }

  function closeEdit() {
    const box = modal && modal.querySelector('#waEdit');
    if (!box) return;
    box.classList.remove('open');
    box.setAttribute('aria-hidden', 'true');
    editing = null;
  }

  /* حفظ التعديل على السطر */
  function saveEdit() {
    if (!editing) return;
    const item = cart[editing.index];
    if (!item) { closeEdit(); return; }

    item.size = editing.size;
    item.price = editing.sizePrice;
    item.extras = editing.picked.slice();
    item.extrasPrice = editing.extrasPrice;
    item.qty = editing.qty;
    item.notes = editing.notes;
    /* المفتاح بيتحدّث لأن المقاس/الإضافات اتغيّروا */
    item.key = item.cat + '|' + item.name + '|' + (item.size || '') + '|' + item.extras.join(',');

    saveCart();
    updateBar();
    renderCart();
    closeEdit();
    toastAdded('تم تعديل الطلب ✓');
  }

  function removeFromCart(key) {
    cart = cart.filter(x => x.key !== key);
    saveCart();
    updateBar();
    renderCart();
  }

  function renderCart() {
    if (!modal) return;
    const itemsEl = modal.querySelector('#waItems');
    const countEl = modal.querySelector('#waCount');
    const totalEl = modal.querySelector('#waTotal');

    if (!cart.length) {
      itemsEl.innerHTML = '<div class="wa-empty">🛒 مفيش أكلات — ضيف أكلات من القائمة</div>';
      countEl.textContent = '0';
      totalEl.textContent = '0 ج.م';
      return;
    }

    itemsEl.innerHTML = cart.map((it, i) => `
      <div class="wa-item">
        <div class="wa-item-info">
          <b>${escapeHtml(it.name)}</b>
          ${it.size ? `<span>${escapeHtml(it.size)}</span>` : ''}
          ${it.extras && it.extras.length ? `<span class="wa-item-extras">+ ${it.extras.map(escapeHtml).join('، ')}</span>` : ''}
          ${it.notes ? `<span class="wa-item-notes">&#9998; ${escapeHtml(it.notes)}</span>` : ''}
          <em>${it.price} ج.م${it.extrasPrice ? ' + ' + it.extrasPrice + ' إضافات' : ''} × ${it.qty}</em>
        </div>
        <div class="wa-item-side">
          <b class="wa-item-sum">${it.price * it.qty} ج.م</b>
          <div class="wa-item-qty">
            <button type="button" data-wa-minus="${i}" aria-label="نقص">−</button>
            <span>${it.qty}</span>
            <button type="button" data-wa-plus="${i}" aria-label="زوّد">+</button>
          </div>
          <div class="wa-item-btns">
            <button class="wa-item-edit" type="button" data-wa-edit="${i}" aria-label="عدّل ${escapeHtml(it.name)}">✎ تعديل</button>
            <button class="wa-item-del" type="button" data-wa-del="${i}" aria-label="شيل">شيل</button>
          </div>
        </div>
      </div>`).join('');

    countEl.textContent = cart.reduce((a, x) => a + x.qty, 0);
    const total = cart.reduce((a, x) => a + unitPrice(x) * x.qty, 0);
    totalEl.textContent = total + ' ج.م';
    renderOffer(total);
  }

  /* 🎁 عرض «مشروب مجاني» — بيحسب في السلة ويشجع يطلب أكتر */
  function renderOffer(total) {
    const box = modal && modal.querySelector('#waOffer');
    if (!box) return;
    const title = box.querySelector('#waOfferTitle');
    const text = box.querySelector('#waOfferText');
    const bar = box.querySelector('#waOfferBar');

    if (total < 300) {
      const left = 300 - total;
      title.textContent = 'اقتربت من مشروب مجاني';
      text.textContent = 'ضيف بـ ' + left + ' ج.م بس وتاخد مشروب مجاني مع الطلب.';
      bar.style.width = Math.min(100, (total / 300) * 100) + '%';
      box.classList.remove('achieved');
    } else if (total < 500) {
      const left = 500 - total;
      title.textContent = 'مشروب مجاني اتفتح!';
      text.textContent = 'ممتاز! ضيف ' + left + ' ج.م بس وتحصل على توصيل مجاني كمان.';
      bar.style.width = ((total / 500) * 100) + '%';
      box.classList.add('achieved');
    } else {
      title.textContent = 'التوصيل المجاني اتفتح!';
      text.textContent = 'تهانينا، طلبك مؤهل للتوصيل المجاني والمشروب المجاني.';
      bar.style.width = '100%';
      box.classList.add('achieved');
    }
  }

  /* ============================================================
     4) فتح/إغلاق
     ============================================================ */
  function openModal() {
    if (!modal) modal = buildModal();
    renderCart();
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('wa-open');
    setTimeout(() => {
      const n = modal.querySelector('#waName');
      if (n && !n.value) n.focus();
    }, 260);
  }

  function closeModal() {
    if (!modal) return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('wa-open');
  }

  /* ============================================================
     5) رسالة واتساب
     ============================================================ */
  function buildMessage() {
    const name = (modal.querySelector('#waName').value || '').trim();
    const address = (modal.querySelector('#waAddress').value || '').trim();
    const notes = (modal.querySelector('#waNotes').value || '').trim();
    const type = (modal.querySelector('input[name=waType]:checked') || {}).value || 'توصيل';
    const total = cart.reduce((a, x) => a + unitPrice(x) * x.qty, 0);
    const count = cart.reduce((a, x) => a + x.qty, 0);

    let msg = `أهلاً ${name || ''} 👋\nعايز أطلب من ${restaurant.name}\n`;
    msg += '━━━━━━━━━━━━━━━\n';
    cart.forEach((it, i) => {
      msg += `${i + 1}. ${it.name}`;
      if (it.size) msg += ` — ${it.size}`;
      if (it.extras && it.extras.length) msg += `\n   إضافات: ${it.extras.join('، ')}`;
      if (it.notes) msg += `\n   - ${it.notes}`;
      msg += `\n   ${unitPrice(it)} ج.م × ${it.qty} = ${unitPrice(it) * it.qty} ج.م\n`;
    });
    msg += '━━━━━━━━━━━━━━━\n';
    msg += `📦 عدد الأكلات: ${count}\n`;
    msg += `💰 الإجمالي: ${total} ج.م\n`;
    msg += `🛵 نوع الطلب: ${type}\n`;
    if (address) msg += `📍 العنوان: ${address}\n`;
    if (notes) msg += `📝 ملاحظات: ${notes}\n`;
    msg += '\n🙏 شكراً ليكم.';
    return msg;
  }

  function sendToWhatsApp() {
    if (!cart.length) return;
    const name = (modal.querySelector('#waName').value || '').trim();
    const err = modal.querySelector('#waErr');
    if (err) err.remove();

    if (!name) return waError('لو سمحت اكتب الاسم');

    const url = 'https://wa.me/' + WA + '?text=' + encodeURIComponent(buildMessage());
    window.open(url, '_blank', 'noopener');
    closeModal();
    cart = [];
    try { sessionStorage.removeItem(CART_KEY); } catch (e) {}
    updateBar();
    renderCart();
  }

  function waError(text) {
    const old = modal.querySelector('#waErr');
    if (old) old.remove();
    const div = document.createElement('div');
    div.id = 'waErr';
    div.className = 'wa-error';
    div.textContent = '⚠️ ' + text;
    modal.querySelector('.wa-fields').prepend(div);
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  /* ============================================================
     6) رسالة "أُضيف" صغيرة
     ============================================================ */
  function toastAdded(text) {
    const old = document.querySelector('.wa-toast');
    if (old) old.remove();
    const g = document.createElement('div');
    g.className = 'wa-toast';
    g.innerHTML = '✓ ' + escapeHtml(text) + ' <b>اتضاف للسلة</b>';
    document.body.appendChild(g);
    setTimeout(() => {
      g.classList.add('out');
      setTimeout(() => g.remove(), 300);
    }, 1900);
  }

  /* ============================================================
     7) زر + بجانب كل سعر
     ============================================================ */
  window.injectAddButtons=function injectAddButtons() {
    /* ═══ قرار: الإضافة للسلة مسموحة من صفحة المنتج بس ═══
       ممنوع أي زر `+` أو سعر يضيف للسلة من صفحة القائمة.
       كل اللي بنعمله هنا: نظّف أي أزرار + قديمة ونخلي السعر يفتح نافذة العرض. */

    // 1) إزالة أي أزرار + موجودة (من نسخة قديمة)
    document.querySelectorAll('.wa-add, .wa-add-wrap').forEach(el => {
      if (el.classList.contains('wa-add-wrap')) {
        // نunwrap الصف ونرجّع السعر مكانه
        const pill = el.querySelector('.price-pill');
        if (pill) { el.parentElement.insertBefore(pill, el); }
        el.remove();
      } else {
        el.remove();
      }
    });
    document.querySelectorAll('.wa-added').forEach(el => el.classList.remove('wa-added'));

    // 2) روابط الكروت (السعر الواحد) → ما تضيفش، بس تفتح النافذة (qv.js بيربطها)
    document.querySelectorAll('.menu-card:not(.menu-card-sizes) .button').forEach(b => {
      b.removeAttribute('onclick');
    });

    // 3) سعر البيتزا: نشيل أي onclick قديم ونترك الربط لـ qv.js
    document.querySelectorAll('.price-pill').forEach(pill => {
      pill.removeAttribute('onclick');
      pill.classList.add('wa-clickable');
    });
  }

  /* ============================================================
     8) الربط العام
     ============================================================ */
  document.addEventListener('click', e => {
    const closeBtn = e.target.closest('[data-wa-close]');
    if (closeBtn) { closeModal(); return; }

    const plus = e.target.closest('[data-wa-plus]');
    if (plus) { cart[+plus.dataset.waPlus].qty++; updateBar(); renderCart(); return; }

    const minus = e.target.closest('[data-wa-minus]');
    if (minus) {
      const i = +minus.dataset.waMinus;
      cart[i].qty--;
      if (cart[i].qty <= 0) cart.splice(i, 1);
      updateBar(); renderCart(); return;
    }

    const del = e.target.closest('[data-wa-del]');
    if (del) { cart.splice(+del.dataset.waDel, 1); updateBar(); renderCart(); return; }

    /* ── تعديل صنف ── */
    const editBtn = e.target.closest('[data-wa-edit]');
    if (editBtn) { openEdit(+editBtn.dataset.waEdit); return; }

    const editClose = e.target.closest('[data-wa-edit-close]');
    if (editClose) { closeEdit(); return; }

    const editQ = e.target.closest('[data-wa-edit-q]');
    if (editQ && editing) {
      editing.qty = Math.max(1, editing.qty + (+editQ.dataset.waEditQ));
      const q = modal && modal.querySelector('#waEditQty');
      if (q) q.textContent = editing.qty;
      renderEditTotal();
      return;
    }

    if (e.target.closest('#waEditSave')) { saveEdit(); return; }

    if (e.target.closest('#waSend')) { sendToWhatsApp(); return; }

    if (e.target.closest('#waContinue')) { closeModal(); return; }
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      /* لو نافذة التعديل مفتوحة → نقفلها بس (مش السلة كلها) */
      const box = modal && modal.querySelector('#waEdit');
      if (box && box.classList.contains('open')) { closeEdit(); return; }
      closeModal();
      return;
    }
  });

  /* ============================================================
     9) الواجهة العامة
     ============================================================ */
  window.WAOrder = {
    open: openModal,
    close: closeModal,
    add: addToCart,
    replace: replaceInCart,
    remove: removeFromCart,
    get count() { return cart.reduce((a, x) => a + (x.qty || 0), 0); },
    get total() { return cart.reduce((a, x) => a + unitPrice(x) * x.qty, 0); },
    get items() { return cart.slice(); }
  };

  /* ============================================================
     10) التهيئة
     ============================================================ */
  /* ============================================================
     3ج) زر «اطلب دلوقتي» — أسرع مسار للطلب
     ============================================================ */
  let orderFab = null;

  function buildOrderFab() {
    if (orderFab) return orderFab;
    if (document.getElementById('waOrderFab')) return null;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'waOrderFab';
    btn.className = 'wa-orderfab';
    btn.setAttribute('aria-label', 'اطلب دلوقتي على واتساب');
    btn.innerHTML =
      '<span class="wa-orderfab-icon" aria-hidden="true">' +
        '<svg viewBox="0 0 24 24" width="21" height="21"><path fill="currentColor" d="M17.5 14.4c-.3-.2-1.7-.9-2-1-.3-.1-.5-.1-.7.2s-.8 1-.9 1.2c-.2.2-.3.2-.6.1-1.7-.9-2.8-1.6-3.9-3.5-.3-.5.3-.5.8-1.5.1-.2 0-.4 0-.5s-.7-1.6-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.1.2 2.1 3.2 5.1 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.7-.7 2-1.4.2-.7.2-1.3.2-1.4-.1-.2-.3-.3-.6-.4zM12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2zm0 18.2c-1.6 0-3.1-.4-4.4-1.2l-.3-.2-3.1.8.8-3-.2-.3A8.2 8.2 0 1 1 12 20.2z"/></svg>' +
      '</span>' +
      '<span class="wa-orderfab-text"><b>اطلب دلوقتي</b><em>على واتساب</em></span>';

    btn.addEventListener('click', function () {
      /* لو السلة فيها أكل → نفتح السلة (عشان يراجع ويكمّل).
         لو فاضية → نبعث رسالة ترحيب على واتساب على طول. */
      if (cart.length) { openModal(); return; }
      const name = (typeof restaurant !== 'undefined' && restaurant.name) || 'كريب الهنا';
      const msg = `أهلاً 👋\nعايز أطلب من ${name}\n\nمن فضلك ابعتلي الأصناف المتاحة وأسعارها.`;
      window.open('https://wa.me/' + WA + '?text=' + encodeURIComponent(msg), '_blank', 'noopener');
    });

    document.body.appendChild(btn);
    orderFab = btn;
    return btn;
  }

  function init() {
    loadCart();                        // نسترجع السلة المحفوظة (بين الصفحات)
    buildBar();
    buildOrderFab();
    if (!modal) modal = buildModal();   // نبنيها مبكراً حتى تكون جاهزة
    injectAddButtons();
    updateBar();

    // إعادة حقن الأزرار عند تبديل التبويبات (لأن المحتوى يُعاد بناؤه)
    const tabs = document.getElementById('menuTabs');
    if (tabs && !tabs.dataset.waBound) {
      tabs.dataset.waBound = '1';
      tabs.addEventListener('click', () => setTimeout(injectAddButtons, 120));
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
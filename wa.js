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

    updateBar();
    renderCart();

    if (opts.silent) return;           // إضافة صامتة (زر +)
    openModal();                        // فتح النافذة (سلوك سابق)
  }

  function removeFromCart(key) {
    cart = cart.filter(x => x.key !== key);
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
          <em>${it.price} ج.م${it.extrasPrice ? ' + ' + it.extrasPrice + ' إضافات' : ''} × ${it.qty}</em>
        </div>
        <div class="wa-item-side">
          <b class="wa-item-sum">${it.price * it.qty} ج.م</b>
          <div class="wa-item-qty">
            <button type="button" data-wa-minus="${i}" aria-label="نقص">−</button>
            <span>${it.qty}</span>
            <button type="button" data-wa-plus="${i}" aria-label="زوّد">+</button>
          </div>
          <button class="wa-item-del" type="button" data-wa-del="${i}" aria-label="شيل">شيل</button>
        </div>
      </div>`).join('');

    countEl.textContent = cart.reduce((a, x) => a + x.qty, 0);
    const total = cart.reduce((a, x) => a + unitPrice(x) * x.qty, 0);
    totalEl.textContent = total + ' ج.م';
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
    // أزرار الأسعار في البيتزا
    document.querySelectorAll('.menu-table tbody td[data-label]:not(.pz-name)').forEach(td => {
      if (td.querySelector('.wa-add')) return;
      const pill = td.querySelector('.price-pill');
      if (!pill) return;
      const row = td.closest('tr');
      const nameEl = row ? row.querySelector('.pz-name .mi-name, .pz-name b') : null;
      const name = nameEl ? nameEl.textContent : '';
      const size = td.dataset.label;
      const price = (pill.textContent.match(/\d+/) || ['0'])[0];
      const cat = (row && row.closest('.menu-panel')) ? row.closest('.menu-panel').id.replace('panel-', '') : '';
      const item = { cat: cat, name: name, size: size, price: +price, qty: 1 };

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'wa-add';
      btn.setAttribute('aria-label', 'ضيف ' + name + ' ' + size + ' للسلة');
      btn.innerHTML = '+';
      btn.addEventListener('click', e => {
        e.stopPropagation();
        addToCart(item, { silent: true });
        toastAdded(name + (size ? ' (' + size + ')' : ''));
        btn.classList.add('added');
        setTimeout(() => btn.classList.remove('added'), 700);
      });

      // نلفّ الزرالسعر والزر + داخل صف-flex
      let wrap = pill.parentElement.querySelector('.wa-add-wrap');
      if (!wrap) {
        wrap = document.createElement('span');
        wrap.className = 'wa-add-wrap';
        pill.parentElement.insertBefore(wrap, pill);
        wrap.appendChild(pill);
      }
      wrap.appendChild(btn);

      // الضغط على بطاقة السعر كاملة يضيف للسلة
      // نُزيل الـ onclick القديم حتى لا يُنفَّذ مرتين
      pill.removeAttribute('onclick');
      pill.classList.add('wa-clickable');
      pill.setAttribute('role', 'button');
      pill.setAttribute('tabindex', '0');
      pill.setAttribute('aria-label', 'ضيف ' + name + ' ' + size + ' للسلة');
      pill.addEventListener('click', e => {
        e.stopPropagation();
        addToCart(item, { silent: true });
        toastAdded(name + (size ? ' (' + size + ')' : ''));
        pill.classList.add('wa-added');
        setTimeout(() => pill.classList.remove('wa-added'), 700);
      });
      pill.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pill.click(); }
      });
    });

    // ═══ كروت بأحجام (البيتزا): ربط زر + الموجود بالسلة ═══
    document.querySelectorAll('.menu-card-sizes').forEach(card => {
      const panel = card.closest('.menu-panel');
      const cat = panel ? panel.id.replace('panel-', '') : '';
      const nameEl = card.querySelector('h3');
      const name = nameEl ? nameEl.textContent.trim() : '';
      card.querySelectorAll('.price-row').forEach(row => {
        const pill = row.querySelector('.price-pill');
        const btn = row.querySelector('.wa-add');
        if (!pill || !btn) return;
        const size = pill.dataset.size || '';
        const price = (pill.querySelector('.pr-price')||pill).textContent.match(/\d+/);
        const item = { cat: cat, name: name, size: size, price: +(price ? price[0] : 0), qty: 1 };

        btn.addEventListener('click', e => {
          e.stopPropagation();
          addToCart(item, { silent: true });
          toastAdded(name);
          row.classList.add('wa-added');
          setTimeout(() => row.classList.remove('wa-added'), 700);
        });
      });
    });

    // بطاقات السعر الواحد
    document.querySelectorAll('.menu-card:not(.menu-card-sizes)').forEach(card => {
      if (card.querySelector('.wa-add')) return;
      const h3 = card.querySelector('h3');
      const priceEl = card.querySelector('.card-price');
      const panel = card.closest('.menu-panel');
      if (!h3 || !priceEl) return;
      const name = h3.textContent;
      const price = (priceEl.textContent.match(/\d+/) || ['0'])[0];
      const cat = panel ? panel.id.replace('panel-', '') : '';
      const item = { cat: cat, name: name, size: '', price: +price, qty: 1 };

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'wa-add wa-add-card';
      btn.setAttribute('aria-label', 'ضيف ' + name + ' للسلة');
      btn.innerHTML = '+';
      btn.addEventListener('click', e => {
        e.stopPropagation();
        addToCart(item, { silent: true });
        toastAdded(name);
        btn.classList.add('added');
        setTimeout(() => btn.classList.remove('added'), 700);
      });
      card.appendChild(btn);

      // الضغط على البطاقة كاملة يضيف للسلة
      // زر "اطلب" داخل البطاقة: نُبقيه لكن بلا onclick قديم
      const orderBtn = card.querySelector('.button');
      if (orderBtn) {
        orderBtn.removeAttribute('onclick');
        orderBtn.addEventListener('click', e => {
          e.stopPropagation();
          addToCart(item, { silent: true });
          toastAdded(name);
        });
      }
      card.classList.add('wa-clickable');
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
      card.setAttribute('aria-label', 'ضيف ' + name + ' للسلة');
      card.addEventListener('click', e => {
        // لا نُفعّلها إن ضغط المستخدم زر «اطلب» الخاص
        if (e.target.closest('.button')) return;
        e.stopPropagation();
        addToCart(item, { silent: true });
        toastAdded(name);
        card.classList.add('wa-added');
        setTimeout(() => card.classList.remove('wa-added'), 700);
      });
      card.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); card.click(); }
      });
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

    if (e.target.closest('#waSend')) { sendToWhatsApp(); return; }

    if (e.target.closest('#waContinue')) { closeModal(); return; }
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
  });

  /* ============================================================
     9) الواجهة العامة
     ============================================================ */
  window.WAOrder = {
    open: openModal,
    close: closeModal,
    add: addToCart,
    remove: removeFromCart,
    get count() { return cart.reduce((a, x) => a + (x.qty || 0), 0); },
    get total() { return cart.reduce((a, x) => a + unitPrice(x) * x.qty, 0); },
    get items() { return cart.slice(); }
  };

  /* ============================================================
     10) التهيئة
     ============================================================ */
  function init() {
    buildBar();
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
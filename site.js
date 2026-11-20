const __catalog_default={pizza:{title:'أنواع البيتزا',crumb:'البيتزا',eyebrow:'مخبوزة طازجة على اللهب',intro:'من البيتزا الكلاسيكية إلى السي فود واللحوم. اختر النوع ثم خصّص الحجم والإضافات.',items:[{id:'tuna',name:'بيتزا تونة',price:220,img:'assets/webp/professional-overhead-pizza-isolated-dar-1.webp',tag:'سي فود',desc:'تونة، فلفل ألوان، زيتون، بصل وموزاريلا.'},{id:'pepperoni',name:'بيتزا بيبروني',price:240,img:'assets/webp/professional-overhead-pizza-isolated-dar-4.webp',tag:'الأكثر طلباً',desc:'بيبروني، موزاريلا وصوص طماطم فاير بايت.'},{id:'chicken',name:'بيتزا تشيكن رانش',price:250,img:'assets/webp/hero-pizza.webp',tag:'مميزة',desc:'دجاج مشوي، فلفل، جبن وصوص رانش.'},{id:'margherita',name:'بيتزا مارجريتا',price:180,img:'assets/webp/professional-overhead-pizza-isolated-dar-2.webp',tag:'نباتي',desc:'موزاريلا، ريحان وصوص طماطم غني.'},{id:'meat',name:'بيتزا عشاق اللحوم',price:280,img:'assets/webp/professional-overhead-pizza-isolated-dar-3.webp',tag:'جديد',desc:'لحم مفروم، سجق، بيبروني وموزاريلا.'},{id:'supreme',name:'بيتزا فاير سوبريم',price:290,img:'assets/webp/professional-overhead-pizza-isolated-dar-5.webp',tag:'حارة',desc:'تشكيلة لحوم وخضروات مع الصوص الحار.'}]},burger:{title:'أنواع البرجر',crumb:'البرجر',eyebrow:'مشوي عند الطلب',intro:'برجر لحم ودجاج بخلطاتنا الخاصة. اختار أكلتك وضيف الجبن والصوص اللي يعجبك.',items:[{id:'smash',name:'دبل سماش برجر',price:230,img:'assets/webp/burger.webp',tag:'الأكثر طلباً',desc:'قطعتان لحم، شيدر، بصل وصوص خاص.'},{id:'classic',name:'كلاسيك بيف برجر',price:170,img:'assets/webp/burger.webp',tag:'كلاسيك',desc:'لحم مشوي، خس، طماطم وصوص البرجر.'},{id:'chickenburger',name:'كرسبي تشيكن',price:190,img:'assets/webp/burger.webp',tag:'مقرمش',desc:'دجاج مقرمش، كول سلو ومايونيز حار.'}]},crepe:{title:'أنواع الكريب',crumb:'الكريب',eyebrow:'محشو حتى آخر لقمة',intro:'كريب حادق وكريب حلو، وفيه إضافات كتير تختارها بنفسك.',items:[{id:'chickencrepe',name:'كريب تشيكن رانش',price:170,img:'assets/webp/crepe.webp',tag:'الأكثر طلباً',desc:'دجاج، جبن، فلفل وصوص رانش.'},{id:'mixcrepe',name:'كريب ميكس لحوم',price:210,img:'assets/webp/crepe.webp',tag:'مميز',desc:'برجر، سجق، بانيه ومزيج الجبن.'},{id:'nutella',name:'كريب نوتيلا وفراولة',price:140,img:'assets/webp/sweet-crepe.webp',tag:'حلو',desc:'شوكولاتة بالبندق وفراولة وموز.'}]}};
const catalog=(window.__CATALOG_OVERRIDE&&Object.keys(window.__CATALOG_OVERRIDE).length)?window.__CATALOG_OVERRIDE:__catalog_default;
let currentProduct=null,currentCat='pizza',qty=1;

// ===== بيانات المطعم — كريب الهنا =====
const __restaurant_default={name:'كريب الهنا',english:'Crepe El Hana',phones:['01004388613','01147157120','0223656975'],address:'16 ش عبد الهادي متفرع من ش عبد العزيز آل سعود - المنيل',facebook:'crepeelhana',whatsapp:'201004388613'};
const restaurant=Object.assign({}, __restaurant_default, window.__RESTAURANT_OVERRIDE||{});
// ===== قائمة الأكل =====
const __menu_default=[
{key:'pizza',title:'البيتزا',emoji:'🍕',desc:'بيتزا طازة بثلاث أحجام',sizes:['صغير','وسط','كبير'],items:[
{name:'بيتزا مارجريتا',small:80,medium:90,large:135},
{name:'بيتزا خضار',small:80,medium:90,large:135},
{name:'بيتزا سوسيس',small:95,medium:110,large:170},
{name:'بيتزا ميكس جبن',small:90,medium:100,large:150},
{name:'بيتزا سجق',small:95,medium:110,large:170},
{name:'بيتزا فراخ',small:95,medium:110,large:170},
{name:'بيتزا مشروم',small:95,medium:105,large:160},
{name:'بيتزا بسطرمة',small:95,medium:110,large:170},
{name:'بيتزا تونة',small:95,medium:110,large:170},
{name:'بيتزا فراخ كرسبى',small:95,medium:110,large:170},
{name:'بيتزا سلامى',small:95,medium:110,large:170},
{name:'بيتزا سوبر سوبريم',small:100,medium:110,large:170},
{name:'بيتزا فراخ بانيه ناجتس',small:95,medium:110,large:170},
{name:'بيتزا فراخ رانش',small:100,medium:115,large:175},
{name:'بيتزا فراخ باربيكيو',small:100,medium:115,large:175},
{name:'بيتزا مكس فراخ',small:115,medium:155,large:205},
{name:'بيتزا مكس لحوم',small:130,medium:155,large:210}
]},
{key:'syrian',title:'سوري',emoji:'🥙',desc:'ساندوتشات سوري بخلطات مميزة',items:[
{name:'سوري بطاطس فارم',price:30},{name:'سوري برجر سادة',price:65},{name:'سوري برجر بيض',price:80},{name:'سوري برجر جبنة',price:80},{name:'سوري برجر ميكس',price:90},{name:'سوري سوسيس ميكسكانو',price:80},{name:'سوري هوت دوج',price:80},{name:'سوري كفتة جريل',price:80},{name:'سوري تونة',price:80},{name:'سوري فراخ بانيه',price:80},{name:'سوري فراخ الأجريك',price:90},{name:'سوري فراخ شيش طاووق',price:90},{name:'سوري سوبر كرانشي',price:90},{name:'سوري كرسبى',price:90},{name:'سوري زنجر',price:90},{name:'سوري تشيكن إسبشال موتزاريلا',price:100},{name:'سوري كوردن بلو',price:100},{name:'سوري فاهيتا فراخ',price:95},{name:'سوري شاورما فراخ',price:90}
]},
{key:'pasta',title:'الباستا',emoji:'🍝',desc:'باستا طازة بالصوصات المختلفة',items:[
{name:'باستا نجرسكو فراخ',price:75},{name:'باستا الفريدو فراخ',price:75},{name:'باستا بلونيز مفروم',price:75},{name:'باستا سجق',price:75},{name:'باستا سوسيس',price:75},{name:'باستا زنجر',price:75},{name:'باستا إستربس',price:75},{name:'باستا بانيه',price:75},{name:'باستا كرسبى',price:75}
]},
{key:'sweet_crepe',title:'الكريب الحلو',emoji:'🥞',desc:'كريب حلو بالشوكولا والكريمة',items:[
{name:'كريب شيكولاتة نوتيلا',price:45},{name:'كريب شيكولاتة نيو كريمة',price:45},{name:'كريب ميكس تيلا',price:65},{name:'كريب شيكولاتة بيضاء',price:50},{name:'كريب كراميل',price:45},{name:'كريب لوتس',price:50}
]},
{key:'waffle',title:'الوافل',emoji:'🧇',desc:'وافل طازة بالشوكولا والفاكهة',items:[
{name:'وافل شيكولاتة',price:50},{name:'وافل كراميل',price:70},{name:'وافل شيكولاتة نيو كريمة',price:70},{name:'وافل شيكولاتة بيضاء',price:50},{name:'وافل شيكولاتة موز',price:85},{name:'وافل لوتس',price:75},{name:'وافل شيكولاتة نوعين فاكهة',price:85},{name:'وافل شيكولاتة مارس',price:85},{name:'وافل مالتيزرز',price:85},{name:'وافل اسنيكرز',price:85},{name:'وافل شيكولاتة مورو',price:80},{name:'وافل شيكولاتة ميكس صوصات',price:85}
]}
];
const menu=(window.__MENU_OVERRIDE&&window.__MENU_OVERRIDE.length)?window.__MENU_OVERRIDE:__menu_default;
// ===== عرض قائمة الأكل (تبويبات) =====
function panelHTML(m){
  const head=`<div class="menu-head"><span class="menu-head-emoji">${m.emoji}</span><div><h2>${m.title}</h2><p>${m.desc}</p></div></div>`;
  if(m.sizes){
    const rows=m.items.map((it,i)=>`<tr class="reveal" style="transition-delay:${i*0.03}s"><td class="pz-name" data-label="الأكلة"><span class="mi-thumb">${it.img?`<img src="${it.img}" alt="" loading="lazy">`:''}</span><b>${it.name}</b></td><td data-label="صغير"><button class="price-pill" onclick="orderItem('${m.key}','${it.name}','صغير',${it.small})">${it.small}<i>ج.م</i></button></td><td data-label="وسط"><button class="price-pill" onclick="orderItem('${m.key}','${it.name}','وسط',${it.medium})">${it.medium}<i>ج.م</i></button></td><td data-label="كبير"><button class="price-pill" onclick="orderItem('${m.key}','${it.name}','كبير',${it.large})">${it.large}<i>ج.م</i></button></td></tr>`).join('');
    return head+`<div class="table-wrap"><table class="menu-table"><thead><tr><th>الأكلة</th><th>صغير</th><th>وسط</th><th>كبير</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }
  const cards=m.items.map((it,i)=>`<article class="menu-card reveal" style="transition-delay:${i*0.03}s">${it.img?`<span class="card-img"><img src="${it.img}" alt="" loading="lazy"></span>`:`<span class="card-emoji">${m.emoji}</span>`}<h3>${it.name}</h3><div class="card-bottom"><span class="card-price">${it.price} <i>ج.م</i></span><button class="button primary" onclick="orderItem('${m.key}','${it.name}','',${it.price})">اطلبها ←</button></div></article>`).join('');
  return head+`<div class="menu-cards">${cards}</div>`;
}
function renderMenu(){
  const tabsEl=document.getElementById('menuTabs'),panelsEl=document.getElementById('menuPanels');
  if(!tabsEl||!panelsEl)return;
  let active=params().get('cat')||'pizza';
  if(!menu.some(m=>m.key===active))active='pizza';
  tabsEl.innerHTML=menu.map(m=>`<button class="menu-tab ${m.key===active?'active':''}" data-key="${m.key}" onclick="switchTab('${m.key}')"><span>${m.emoji}</span><b>${m.title}</b></button>`).join('');
  panelsEl.innerHTML=menu.map(m=>`<section class="menu-panel ${m.key===active?'active':''}" id="panel-${m.key}">${panelHTML(m)}</section>`).join('');
  observe();
  if(window.__reapplyContent) window.__reapplyContent();
}
function switchTab(k){
  document.querySelectorAll('.menu-tab').forEach(t=>t.classList.toggle('active',t.dataset.key===k));
  document.querySelectorAll('.menu-panel').forEach(p=>p.classList.toggle('active',p.id==='panel-'+k));
  const act=document.querySelector('.menu-tab.active');
  if(act)act.scrollIntoView({behavior:'smooth',block:'nearest',inline:'center'});
  observe();
}
function orderItem(cat,name,size,price){
  if(window.WAOrder&&window.WAOrder.add){window.WAOrder.add({cat:cat,name:name,size:size||'',price:+price,qty:1},{silent:true});return;}
  const line=size?`🍽️ ${name} — الحجم: ${size}`:`🍽️ ${name}`;
  const msg=`أهلاً، عايز أطلب من ${restaurant.name}:\n\n${line}\n💰 السعر: ${price} ج.م\n\nالاسم:\nالعنوان:\nملاحظات:`;
  window.open('https://wa.me/'+restaurant.whatsapp+'?text='+encodeURIComponent(msg),'_blank','noopener');
}
function params(){return new URLSearchParams(location.search)}
function renderProduct(){currentCat=params().get('cat')||'pizza';let id=params().get('id')||'tuna';const c=catalog[currentCat]||catalog.pizza;currentProduct=c.items.find(x=>x.id===id)||c.items[0];productImage.src=currentProduct.img;productName.textContent=currentProduct.name;productCrumb.textContent=currentProduct.name;productDesc.textContent=currentProduct.desc;catLink.textContent=c.crumb;catLink.href=backLink.href=backNav.href=`category.html?cat=${currentCat}`;const sizeData=currentCat==='burger'?[['ساندوتش',0],['كومبو بطاطس ومشروب',70],['دبل لحم',90]]:currentCat==='crepe'?[['عادي',0],['كبير',45],['جامبو',75]]:[['صغير',0],['وسط',55],['كبير',100]];sizes.innerHTML=sizeData.map((s,i)=>`<label class="option ${i===0?'selected':''}"><input type="radio" name="size" value="${s[0]}" data-price="${s[1]}" ${i===0?'checked':''} onchange="updateTotal()"><b>${s[0]}</b><span>${s[1]?'+ '+s[1]+' ج.م':'السعر الأساسي'}</span></label>`).join('');let ex=currentCat==='pizza'?[['جبن إضافي',35],['تونة إضافية',55],['زيتون',20],['هالبينو',20]]:currentCat==='burger'?[['قطعة لحم إضافية',65],['شيدر إضافي',25],['بيكون بقري',40],['صوص إضافي',15]]:[['جبن إضافي',30],['دجاج إضافي',50],['بطاطس داخل الكريب',20],['صوص إضافي',15]];extras.innerHTML=ex.map(e=>`<label class="option"><input type="checkbox" value="${e[0]}" data-price="${e[1]}" onchange="updateTotal()"><b>${e[0]}</b><span>+ ${e[1]} ج.م</span></label>`).join('');document.querySelectorAll('.option input').forEach(x=>x.addEventListener('change',()=>{if(x.type==='radio')document.querySelectorAll('input[name=size]').forEach(r=>r.closest('.option').classList.toggle('selected',r.checked));else x.closest('.option').classList.toggle('selected',x.checked)}));updateTotal();initProductViewer();observe();if(window.__reapplyContent) window.__reapplyContent()}
function changeQty(n){qty=Math.max(1,qty+n);document.getElementById('qty').textContent=qty;updateTotal()}
function updateTotal(){if(!currentProduct)return;let size=+document.querySelector('input[name=size]:checked').dataset.price;let ext=[...document.querySelectorAll('#extras input:checked')].reduce((a,x)=>a+(+x.dataset.price),0);let value=(currentProduct.price+size+ext)*qty;baseLine.textContent=(currentProduct.price+size)+' ج.م';extraLine.textContent=ext+' ج.م';total.textContent=value+' ج.م';updateSmartOffer(value)}
function updateSmartOffer(value){if(!window.smartOffer)return;smartOffer.classList.remove('achieved');if(value<300){let left=300-value;offerTitle.textContent='اقتربت من مشروب مجاني';offerText.textContent=`ضيف أكل بـ ${left} ج.م وتاخد مشروب مجاني مع الطلب.`;offerProgress.style.width=Math.min(100,value/300*100)+'%'}else if(value<500){let left=500-value;offerTitle.textContent='🎉 حصلت على مشروب مجاني';offerText.textContent=`ممتاز! ضيف ${left} ج.م بس وتحصل على توصيل مجاني كمان.`;offerProgress.style.width=(value/500*100)+'%'}else{offerTitle.textContent='التوصيل المجاني اتفتح!';offerText.textContent='تهانينا، طلبك مؤهل للتوصيل المجاني والمشروب المجاني.';offerProgress.style.width='100%';smartOffer.classList.add('achieved')}}
function initProductViewer(){const view=document.getElementById('interactiveView'),img=document.getElementById('productImage');if(!view||!img)return;let active=false,startX=0,rotation=0,target=0;const paint=(x,y)=>{const r=view.getBoundingClientRect();let nx=Math.max(-1,Math.min(1,(x-r.left)/r.width*2-1)),ny=Math.max(-1,Math.min(1,(y-r.top)/r.height*2-1));if(!active)target=nx*13;img.style.transform=`perspective(1000px) rotateY(${target}deg) rotateX(${-ny*4}deg) scale(1.055)`;view.style.setProperty('--shine-x',((nx+1)*50)+'%');view.style.setProperty('--shine-y',((ny+1)*50)+'%')};view.addEventListener('pointerdown',e=>{active=true;startX=e.clientX;rotation=target;view.classList.add('dragging');view.setPointerCapture(e.pointerId)});view.addEventListener('pointermove',e=>{if(active)target=rotation+(e.clientX-startX)*.28;paint(e.clientX,e.clientY)});view.addEventListener('pointerup',()=>{active=false;view.classList.remove('dragging')});view.addEventListener('pointerleave',()=>{if(!active){target=0;img.style.transform=''}})}
function resetProductView(){const img=document.getElementById('productImage');if(img)img.style.transform='perspective(1000px) rotateY(0) rotateX(0) scale(1)'}
function sendOrder(){
  if(window.WAOrder&&window.WAOrder.add){
    const sizeEl=document.querySelector('input[name=size]:checked');
    const ex=[...document.querySelectorAll('#extras input:checked')].map(x=>x.value);
    const exSum=[...document.querySelectorAll('#extras input:checked')].reduce((a,x)=>a+(+x.dataset.price),0);
    const name=document.getElementById('productName').textContent;
    // baseLine = (سعر الأكلة + الحجم) — الإضافات بتتحسب منفصلة في السلة
    const unit=parseFloat((document.getElementById('baseLine').textContent||'0').replace(/[^0-9.]/g,''))||0;
    window.WAOrder.add({cat:currentCat,name:name,size:sizeEl?sizeEl.value:'',price:unit,qty:qty,extras:ex,extrasPrice:exSum});
    return;
  }
  const s=document.querySelector('input[name=size]:checked');
  const ex=[...document.querySelectorAll('#extras input:checked')].map(x=>x.value);
  const message=`أهلاً، عايز أطلب:\n\n🍽️ الأكلة: ${currentProduct.name}\n📏 الحجم / الاختيار: ${s.value}\n➕ الإضافات: ${ex.length?ex.join('، '):'من غير إضافات'}\n🔢 الكمية: ${qty}\n📝 ملاحظات: ${notes.value||'مفيش'}\n💰 الإجمالي: ${total.textContent}`;
  window.open('https://wa.me/'+restaurant.whatsapp+'?text='+encodeURIComponent(message),'_blank','noopener');
}
function observe(){const o=new IntersectionObserver(es=>es.forEach(e=>e.isIntersecting&&e.target.classList.add('show')),{threshold:.08});document.querySelectorAll('.reveal').forEach(x=>o.observe(x))}// Premium interactive background, scroll parallax and page transitions
const canvas=document.createElement('canvas');canvas.className='ambient-canvas';document.body.prepend(canvas);const ctx=canvas.getContext('2d');
const blob1=document.createElement('i'),blob2=document.createElement('i');blob1.className='ambient-blob blob-one';blob2.className='ambient-blob blob-two';document.body.prepend(blob1,blob2);
const wipe=document.createElement('div');wipe.className='page-wipe exit';document.body.appendChild(wipe);
const orb=document.createElement('div');orb.className='cursor-orb';document.body.appendChild(orb);
let mouse={x:innerWidth*.5,y:innerHeight*.3},scrollPos=scrollY,particles=[];
function resizeAmbient(){const d=Math.min(devicePixelRatio||1,2);canvas.width=innerWidth*d;canvas.height=innerHeight*d;canvas.style.width=innerWidth+'px';canvas.style.height=innerHeight+'px';ctx.setTransform(d,0,0,d,0,0);const count=innerWidth<600?22:42;particles=Array.from({length:count},(_,i)=>({x:Math.random()*innerWidth,y:Math.random()*innerHeight,r:Math.random()*1.6+.35,s:Math.random()*.18+.05,p:Math.random()*6.28,a:Math.random()*.32+.08}))}
function drawAmbient(t){ctx.clearRect(0,0,innerWidth,innerHeight);for(const p of particles){p.y-=p.s;p.x+=Math.sin(t*.00025+p.p)*.06;if(p.y<0){p.y=innerHeight+5;p.x=Math.random()*innerWidth}const dx=(mouse.x-innerWidth/2)*.012,dy=(mouse.y-innerHeight/2)*.008;ctx.beginPath();ctx.arc(p.x+dx*(p.r/2),p.y+dy*(p.r/2)+(scrollPos*.025*p.r),p.r,0,Math.PI*2);ctx.fillStyle=`rgba(239,164,73,${p.a})`;ctx.fill()}requestAnimationFrame(drawAmbient)}
resizeAmbient();requestAnimationFrame(drawAmbient);window.addEventListener('resize',resizeAmbient);
window.addEventListener('pointermove',e=>{mouse.x=e.clientX;mouse.y=e.clientY;document.documentElement.style.setProperty('--mx',e.clientX+'px');document.documentElement.style.setProperty('--my',e.clientY+'px');orb.animate({left:e.clientX+'px',top:e.clientY+'px'},{duration:1100,fill:'forwards',easing:'ease-out'})});
let ticking=false;window.addEventListener('scroll',()=>{scrollPos=scrollY;if(!ticking){requestAnimationFrame(()=>{const max=document.body.scrollHeight-innerHeight;document.querySelector('.progress').style.width=(max?scrollY/max*100:0)+'%';blob1.style.transform=`translate3d(0,${scrollY*.12}px,0)`;blob2.style.transform=`translate3d(0,${-scrollY*.08}px,0)`;document.querySelectorAll('.category img,.product-pic img').forEach(img=>{const r=img.getBoundingClientRect();if(r.bottom>0&&r.top<innerHeight)img.style.transform=`translate3d(0,${(r.top-innerHeight/2)*-.018}px,0) scale(1.075)`});ticking=false});ticking=true}});
// Smooth transition for internal HTML pages
setTimeout(()=>wipe.classList.remove('exit'),760);document.addEventListener('click',e=>{const a=e.target.closest('a');if(!a||!a.href||a.target==='_blank'||a.href.startsWith('javascript:'))return;const u=new URL(a.href,location.href);if(u.origin===location.origin&&u.pathname.endsWith('.html')&&u.href!==location.href){e.preventDefault();wipe.className='page-wipe enter';setTimeout(()=>location.href=a.href,650)}});
observe();

/* ---------- زر الصعود للأعلى ---------- */
(function(){
  function initToTop(){
    if(document.getElementById('toTop')) return;
    var btn=document.createElement('button');
    btn.id='toTop';
    btn.type='button';
    btn.className='to-top';
    btn.setAttribute('aria-label','ارجع لفوق');
    btn.title='ارجع لفوق';
    btn.innerHTML='&#8593;';
    document.body.appendChild(btn);

    function onScroll(){
      var y=window.pageYOffset||document.documentElement.scrollTop||0;
      if(y>420) btn.classList.add('show');
      else btn.classList.remove('show');
    }
    btn.addEventListener('click',function(){
      window.scrollTo({top:0,behavior:'smooth'});
    });
    window.addEventListener('scroll',onScroll,{passive:true});
    onScroll();
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',initToTop);
  else initToTop();
})();

/* ---------- وسم صفحة القائمة (لإلغاء تثبيت الترويسة فيها) ---------- */
(function(){
  function mark(){
    if(document.getElementById('menuTabs')) document.documentElement.classList.add('has-menu-page');
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',mark);
  else mark();
})();

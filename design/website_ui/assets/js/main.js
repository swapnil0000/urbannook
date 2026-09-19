/* ===== URBAN NOOK — store logic ===== */

/* Free-to-use images via Lorem Picsum (Unsplash-sourced, free license).
   Swap the `img` URLs with your own product photos when ready. */
const CF='https://d1dhs7xre1cv0d.cloudfront.net/product-images/';
const PRODUCTS = [
  /* ===== REAL products (live) — real photos from Urban Nook API ===== */
  {id:'au1', name:'Brake Caliper Lamp', genre:'Auto', price:1599, seed:'caliper', badge:'Hot',
    img:CF+'019cb457-16df-70af-be27-204839148bc3.webp',
    imgs:[CF+'019cb457-16df-70af-be27-204839148bc3.webp',CF+'019cfd3c-e8ec-7e89-9093-1a588b7a5233.webp',CF+'1.webp',CF+'lambo-1.webp'],
    desc:'Warm red, fiery ambient light — perfect for late-night grinds. A 3D-printed brake-caliper lamp whose glow mimics a red-hot rotor. Pick your marque: BMW, Porsche or Lamborghini.',
    specs:[['Light Source','Neon Tube'],['Power','Adapter (incl.)'],['Base Material','PLA + PETG'],['Shade','Translucent Red'],['Wire Length','2 m'],['Dimensions','27 × 6 × 27 cm']]},
  {id:'de1', name:'Stationery Suit Pen Stand', genre:'Tech', price:299, seed:'penstand', badge:'New',
    img:CF+'019cf390-1037-7593-9173-96d0a8392e86.jpeg',
    imgs:[CF+'019cf390-1037-7593-9173-96d0a8392e86.jpeg',CF+'019cf377-5b40-7335-91ed-0d629aae750b.jpeg',CF+'019cf39b-1014-73a8-81c2-19cdd1210b6a.jpeg',CF+'019cf39e-2f25-7989-a4b3-10fff0db8860.jpeg'],
    desc:'Keep your pens cozy and your desk aesthetic effortlessly cool. A 3D-printed jacket-shaped organiser holding 6–8 pens — available in 10+ colours.',
    specs:[['Capacity','6–8 pens'],['Finish','3D printed layer texture'],['Base Material','PLA / PLA+'],['Weight','200 g'],['Customization','Available']]},
];
const img = (seed,s=600)=>`https://picsum.photos/seed/un-${seed}/${s}/${s}`;
const inr = n=>'₹'+n.toLocaleString('en-IN');
const find = id=>PRODUCTS.find(p=>p.id===id);

/* ---- Cart (localStorage) ---- */
const CART_KEY='urbannook_cart';
const getCart=()=>{try{return JSON.parse(localStorage.getItem(CART_KEY))||[]}catch(e){return[]}};
const saveCart=c=>{localStorage.setItem(CART_KEY,JSON.stringify(c));updateCartCount();};
function addToCart(id,qty=1){
  const c=getCart();const ex=c.find(i=>i.id===id);
  if(ex)ex.qty+=qty;else c.push({id,qty});
  saveCart(c);toast(find(id).name+' added to cart');renderDrawer();openDrawer();
}
function removeFromCart(id){saveCart(getCart().filter(i=>i.id!==id));renderDrawer();renderCartPage();}
function setQty(id,qty){const c=getCart();const it=c.find(i=>i.id===id);if(it){it.qty=Math.max(1,qty);saveCart(c);}renderDrawer();renderCartPage();}
const cartTotal=()=>getCart().reduce((s,i)=>s+find(i.id).price*i.qty,0);
const cartCount=()=>getCart().reduce((s,i)=>s+i.qty,0);
function updateCartCount(){const n=cartCount();document.querySelectorAll('.cart-count').forEach(e=>{e.textContent=n;if(e.classList.contains('bb-cart-count'))e.style.display=n?'block':'none';});}

/* ---- Toast ---- */
let toastT;
function toast(msg){
  let t=document.querySelector('.toast');
  if(!t){t=document.createElement('div');t.className='toast';document.body.appendChild(t);}
  t.textContent=msg;t.classList.add('show');
  clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove('show'),2200);
}

/* ---- Card markup ---- */
function cardHTML(p){
  return `<article class="card reveal">
    <div class="ph">
      ${p.badge?`<span class="badge">${p.badge}</span>`:''}
      <span class="wish" title="Wishlist">♡</span>
      <a href="product.html?id=${p.id}"><img loading="lazy" src="${p.img||img(p.seed)}" alt="${p.name}"></a>
      <span class="glare"></span>
    </div>
    <div class="info">
      <span class="ptag">${p.genre}</span>
      <a href="product.html?id=${p.id}"><h3 class="pname">${p.name}</h3></a>
      <div class="prow">
        <div>${p.was?`<span class="strike">${inr(p.was)}</span>`:''}<span class="price">${inr(p.price)}</span></div>
        <button class="btn btn-primary btn-sm" data-add="${p.id}">Add</button>
      </div>
    </div>
  </article>`;
}

/* ---- Header & Footer injection ---- */
function injectChrome(active){
  const header=`
  <div class="ticker"><div class="ticker-track">
    ${'<span>FREE SHIPPING OVER ₹999</span><span class="dot"></span><span>NEW DROPS EVERY FRIDAY</span><span class="dot"></span><span>UPGRADE YOUR SPACE</span><span class="dot"></span>'.repeat(2)}
  </div></div>
  <header class="site-header"><div class="wrap nav">
    <a href="index.html" class="brand"><span class="b-dot"></span>Urban Nook</a>
    <nav class="nav-links" id="navlinks">
      <a href="index.html" data-p="home">Home</a>
      <a href="shop.html" data-p="shop">Shop</a>
      <a href="shop.html?cat=Anime" data-p="">Anime</a>
      <a href="shop.html?cat=Auto" data-p="">Auto</a>
      <a href="about.html" data-p="about">About</a>
      <a href="contact.html" data-p="contact">Contact</a>
    </nav>
    <div class="nav-right">
      <button class="cart-btn" onclick="openDrawer()">Cart <span class="cart-count">0</span></button>
      <button class="burger" id="burger"><span></span><span></span><span></span></button>
    </div>
  </div></header>`;

  const footer=`
  <footer class="site-footer"><div class="wrap">
    <div class="foot-grid">
      <div class="foot-brand">
        <div class="anton">Urban Nook <span class="red">●</span></div>
        <p>One store. Every fandom. Curated, aesthetic gear to upgrade any workspace — whatever world you rep.</p>
      </div>
      <div class="foot-col"><h5>Shop</h5>
        <a href="shop.html?cat=Anime">Anime</a><a href="shop.html?cat=Auto">Auto</a>
        <a href="shop.html?cat=Tech">Tech</a><a href="shop.html?cat=Gaming">Gaming</a><a href="shop.html?cat=Plants">Plants</a>
      </div>
      <div class="foot-col"><h5>Help</h5>
        <a href="contact.html">Contact</a><a href="#">Shipping</a><a href="#">Returns</a><a href="#">FAQ</a>
      </div>
      <div class="foot-col"><h5>Follow</h5>
        <a href="#">Instagram</a><a href="#">YouTube</a><a href="#">Pinterest</a><a href="#">X / Twitter</a>
      </div>
    </div>
    <div class="foot-bot">
      <span>© ${new Date().getFullYear()} Urban Nook</span>
      <span>Red #E63329 · Off-White #EFEAE0 · Black #141414</span>
    </div>
  </div></footer>`;

  const drawer=`
  <div class="overlay" id="overlay" onclick="closeDrawer()"></div>
  <aside class="drawer" id="drawer">
    <div class="drawer-head"><h3>Your Cart</h3><button class="x" onclick="closeDrawer()">×</button></div>
    <div class="drawer-body" id="drawerBody"></div>
    <div class="drawer-foot" id="drawerFoot"></div>
  </aside>`;

  const bottomBar=`
  <nav class="bottom-bar">
    <a href="index.html" data-bp="home">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/></svg>
      <span>Home</span></a>
    <a href="shop.html" data-bp="shop">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 7h12l1 13H5L6 7z"/><path d="M9 7a3 3 0 0 1 6 0"/></svg>
      <span>Shop</span></a>
    <a href="about.html" data-bp="guide">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5a2 2 0 0 1 2-2h12v18H6a2 2 0 0 1-2-2V5z"/><path d="M8 7h7M8 11h7"/></svg>
      <span>Guide</span></a>
    <a href="cart.html" data-bp="cart">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/><path d="M3 4h2l2.5 12h11"/><path d="M7 8h14l-1.5 7H8"/></svg>
      <span class="bb-cart-count cart-count">0</span>
      <span>Cart</span></a>
    <a href="#" data-bp="menu" onclick="document.getElementById('navlinks').classList.toggle('open');return false;">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
      <span>Menu</span></a>
  </nav>`;

  document.body.insertAdjacentHTML('afterbegin',header);
  document.body.insertAdjacentHTML('beforeend',footer+drawer+bottomBar);

  if(active){const l=document.querySelector(`.nav-links a[data-p="${active}"]`);if(l)l.classList.add('active');}
  const bbMap={home:'home',shop:'shop',product:'shop',cart:'cart',about:'guide'};
  const bbActive=bbMap[active];
  if(bbActive){const b=document.querySelector(`.bottom-bar a[data-bp="${bbActive}"]`);if(b)b.classList.add('active');}
  const burger=document.getElementById('burger');
  burger.addEventListener('click',()=>document.getElementById('navlinks').classList.toggle('open'));
  updateCartCount();renderDrawer();
}

/* ---- Drawer ---- */
function openDrawer(){document.getElementById('overlay').classList.add('open');document.getElementById('drawer').classList.add('open');}
function closeDrawer(){document.getElementById('overlay').classList.remove('open');document.getElementById('drawer').classList.remove('open');}
function renderDrawer(){
  const body=document.getElementById('drawerBody'),foot=document.getElementById('drawerFoot');
  if(!body)return;const c=getCart();
  if(!c.length){body.innerHTML='<div class="empty">Your cart is empty</div>';foot.innerHTML='<a href="shop.html" class="btn btn-ghost btn-block">Start Shopping</a>';return;}
  body.innerHTML=c.map(i=>{const p=find(i.id);return `<div class="ci">
    <img src="${p.img||img(p.seed,120)}" alt="${p.name}">
    <div><div class="nm">${p.name}</div><div class="mt">${p.genre} · Qty ${i.qty}</div><button class="rm" onclick="removeFromCart('${p.id}')">Remove</button></div>
    <div class="pr">${inr(p.price*i.qty)}</div></div>`;}).join('');
  foot.innerHTML=`<div class="tot"><span>Subtotal</span><span>${inr(cartTotal())}</span></div>
    <a href="cart.html" class="btn btn-ghost btn-block" style="margin-bottom:10px">View Cart</a>
    <button class="btn btn-primary btn-block" onclick="toast('Checkout is a demo')">Checkout</button>`;
}

/* ---- Scroll reveal ---- */
function initReveal(){
  const io=new IntersectionObserver((es)=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);}}),{threshold:.12});
  document.querySelectorAll('.reveal').forEach(el=>io.observe(el));
}

/* ---- Global click for add buttons ---- */
document.addEventListener('click',e=>{
  const b=e.target.closest('[data-add]');if(b){addToCart(b.dataset.add);}
  const w=e.target.closest('.wish');if(w){w.textContent=w.textContent==='♡'?'♥':'♡';w.style.color=w.textContent==='♥'?'#fff':'';w.style.background=w.textContent==='♥'?'#E63329':'';}
});

/* ---- Page renderers ---- */
function renderFeatured(){
  const el=document.getElementById('featured');if(!el)return;
  el.innerHTML=PRODUCTS.slice(0,8).map(cardHTML).join('');
}
function renderShop(){
  const grid=document.getElementById('shopGrid');if(!grid)return;
  const params=new URLSearchParams(location.search);
  let cat=params.get('cat')||'All';
  const draw=c=>{
    const list=(c==='All'?PRODUCTS:PRODUCTS.filter(p=>p.genre===c));
    grid.innerHTML=list.length?list.map(cardHTML).join(''):'<div class="empty" style="grid-column:1/-1">This world is dropping soon — check back Friday.</div>';
    document.querySelectorAll('.chip').forEach(ch=>ch.classList.toggle('on',ch.dataset.cat===c));
    initReveal();
  };
  document.querySelectorAll('.chip').forEach(ch=>ch.addEventListener('click',()=>draw(ch.dataset.cat)));
  draw(cat);
}
function renderProduct(){
  const wrap=document.getElementById('productWrap');if(!wrap)return;
  const id=new URLSearchParams(location.search).get('id')||'an1';
  const p=find(id)||PRODUCTS[0];
  document.title=p.name+' — Urban Nook';
  let qty=1;
  const gallery=(p.imgs&&p.imgs.length)?p.imgs:[p.seed,p.seed+'-b',p.seed+'-c',p.seed+'-d'].map(t=>img(t,800));
  wrap.innerHTML=`
    <div class="pd-gallery reveal">
      <div class="main"><img id="pdMain" src="${gallery[0]}" alt="${p.name}"></div>
      <div class="pd-thumbs">${gallery.map((t,i)=>`<img class="${i===0?'on':''}" src="${t}" data-full="${t}" alt="view ${i+1}">`).join('')}</div>
    </div>
    <div class="pd-info reveal">
      <span class="kicker">${p.genre} · Urban Nook</span>
      <h1>${p.name}</h1>
      <div class="pd-price">${p.was?`<span class="strike">${inr(p.was)}</span>`:''}${inr(p.price)}</div>
      <p class="pd-desc">${p.desc||'Designed to upgrade your desk and flex your fandom. Premium build, matte finish, and a footprint that fits any setup. Curated by Urban Nook — your space, your world.'}</p>
      <div style="display:flex;align-items:center;flex-wrap:wrap;gap:12px">
        <div class="qty"><button id="qMinus">−</button><span id="qVal">1</span><button id="qPlus">+</button></div>
        <button class="btn btn-primary" id="pdAdd">Add to Cart</button>
        <button class="btn btn-ghost" onclick="toast('Saved to wishlist')">♡ Save</button>
      </div>
      <div class="pd-meta">
        ${(p.specs||[]).map(([k,v])=>`<div><b>${k}</b> ${v}</div>`).join('')}
        <div><b>Free Shipping</b> On orders over ₹999</div>
        <div><b>Dispatch</b> Ships in 2–4 business days</div>
        <div><b>Returns</b> 7-day easy returns · COD available</div>
        <div><b>SKU</b> UN-${p.id.toUpperCase()}</div>
      </div>
    </div>`;
  const qv=document.getElementById('qVal');
  document.getElementById('qMinus').onclick=()=>{qty=Math.max(1,qty-1);qv.textContent=qty;};
  document.getElementById('qPlus').onclick=()=>{qty++;qv.textContent=qty;};
  document.getElementById('pdAdd').onclick=()=>addToCart(p.id,qty);
  document.querySelectorAll('.pd-thumbs img').forEach(t=>t.onclick=()=>{
    document.getElementById('pdMain').src=t.dataset.full;
    document.querySelectorAll('.pd-thumbs img').forEach(x=>x.classList.remove('on'));t.classList.add('on');
  });
  // related
  const rel=document.getElementById('related');
  if(rel)rel.innerHTML=PRODUCTS.filter(x=>x.genre===p.genre&&x.id!==p.id).concat(PRODUCTS.filter(x=>x.genre!==p.genre)).slice(0,4).map(cardHTML).join('');
}
function renderCartPage(){
  const wrap=document.getElementById('cartItems');if(!wrap)return;
  const c=getCart();
  if(!c.length){wrap.innerHTML='<div class="empty">Your cart is empty</div>';document.getElementById('cartSummary').style.display='none';return;}
  document.getElementById('cartSummary').style.display='block';
  wrap.innerHTML=c.map(i=>{const p=find(i.id);return `<div class="cart-row">
    <img src="${p.img||img(p.seed,180)}" alt="${p.name}">
    <div><div class="pname" style="font-family:Archivo;font-weight:800;text-transform:uppercase">${p.name}</div>
      <div class="ptag mono" style="font-size:11px;color:var(--grey);letter-spacing:.1em;text-transform:uppercase">${p.genre}</div>
      <button class="rm" style="background:none;border:none;color:var(--grey);cursor:pointer;font-size:11px;text-transform:uppercase;letter-spacing:.1em;margin-top:6px" onclick="removeFromCart('${p.id}')">Remove</button></div>
    <div class="qty"><button onclick="setQty('${p.id}',${i.qty-1})">−</button><span>${i.qty}</span><button onclick="setQty('${p.id}',${i.qty+1})">+</button></div>
    <div class="pr mono" style="color:var(--red);font-weight:600;min-width:80px;text-align:right">${inr(p.price*i.qty)}</div>
  </div>`;}).join('');
  const sub=cartTotal(),ship=sub>999||sub===0?0:79,tot=sub+ship;
  document.getElementById('cartSummary').innerHTML=`<h3>Summary</h3>
    <div class="line"><span>Subtotal</span><span>${inr(sub)}</span></div>
    <div class="line"><span>Shipping</span><span>${ship?inr(ship):'FREE'}</span></div>
    <div class="line total"><span>Total</span><span>${inr(tot)}</span></div>
    <button class="btn btn-primary btn-block" style="margin-top:16px" onclick="toast('Checkout is a demo')">Checkout</button>
    <a href="shop.html" class="btn btn-ghost btn-block" style="margin-top:10px">Continue Shopping</a>`;
}

/* ---- Horizontal auto-scroll (mobile, true ring buffer) ---- */
function initAutoScroll(selector,speed){
  const el=document.querySelector(selector);
  if(!el)return;
  const SPEED=speed||0.4; // px per frame ≈ slow drift
  let raf, paused=false, active=false;
  const gap=()=>{const cs=getComputedStyle(el);return parseFloat(cs.columnGap||cs.gap)||0;};
  const scrollable=()=>el.scrollWidth-el.clientWidth>4;
  // As the leftmost card scrolls fully out of view, move it to the end and
  // pull scrollLeft back by its width — the row never reaches an end, no gap.
  function recycle(){
    let first=el.firstElementChild;
    while(first && el.scrollLeft >= first.offsetWidth + gap()){
      const w=first.offsetWidth + gap();
      el.appendChild(first);
      el.scrollLeft -= w;
      first=el.firstElementChild;
    }
  }
  const step=()=>{
    if(!paused && active){
      el.scrollLeft += SPEED;
      recycle();
    }
    raf=requestAnimationFrame(step);
  };
  // Pause only while the user is actively interacting; resume shortly after they stop.
  let resumeT;
  const bump=()=>{paused=true;clearTimeout(resumeT);resumeT=setTimeout(()=>paused=false,1200);};
  ['pointerdown','touchstart','touchmove','wheel'].forEach(ev=>el.addEventListener(ev,bump,{passive:true}));
  const start=()=>{if(scrollable()){active=true;if(!raf)step();}};
  start();
  window.addEventListener('resize',start);
}

/* ---- Boot ---- */
document.addEventListener('DOMContentLoaded',()=>{
  injectChrome(document.body.dataset.page||'');
  renderFeatured();renderShop();renderProduct();renderCartPage();
  initReveal();initAutoScroll('.cats');initAutoScroll('#featured');init2040Motion();
  document.querySelectorAll('form[data-demo]').forEach(f=>f.addEventListener('submit',e=>{e.preventDefault();f.reset();toast('Thanks! This is a demo form');}));
});

/* ===== 2040 MOTION LAYER — custom cursor · grain · magnetic · 3D tilt · Motion springs ===== */
function init2040Motion(){
  const coarse=matchMedia('(pointer:coarse)').matches;
  const reduced=matchMedia('(prefers-reduced-motion:reduce)').matches;

  if(!coarse && !reduced){
    /* film grain */
    if(!document.querySelector('.grain')){const g=document.createElement('div');g.className='grain';g.setAttribute('aria-hidden','true');document.body.appendChild(g);}
    /* custom cursor + trailing ring */
    const cur=document.createElement('div');cur.className='cursor';cur.setAttribute('aria-hidden','true');
    const ring=document.createElement('div');ring.className='cursor-ring';ring.setAttribute('aria-hidden','true');
    document.body.append(cur,ring);
    let mx=innerWidth/2,my=innerHeight/2,rx=mx,ry=my;
    addEventListener('mousemove',e=>{mx=e.clientX;my=e.clientY;},{passive:true});
    (function loop(){rx+=(mx-rx)*.16;ry+=(my-ry)*.16;cur.style.transform=`translate(${mx}px,${my}px) translate(-50%,-50%)`;ring.style.transform=`translate(${rx}px,${ry}px) translate(-50%,-50%)`;requestAnimationFrame(loop);})();
    document.addEventListener('mouseover',e=>{const t=e.target.closest&&e.target.closest('a,button,.card,.chip,input,.cat');ring.classList.toggle('is-hover',!!t);},{passive:true});

    /* magnetic buttons + 3D tilt/glare on cards (event-delegated → survives re-renders) */
    document.addEventListener('mousemove',e=>{
      const mag=e.target.closest&&e.target.closest('.btn,[data-magnet]');
      if(mag){const r=mag.getBoundingClientRect();mag.style.transform=`translate(${(e.clientX-r.left-r.width/2)*.18}px,${(e.clientY-r.top-r.height/2)*.24}px)`;}
      const card=e.target.closest&&e.target.closest('.card');
      if(card && !mag){const r=card.getBoundingClientRect();const px=(e.clientX-r.left)/r.width,py=(e.clientY-r.top)/r.height;card.style.transform=`perspective(900px) rotateY(${(px-.5)*7}deg) rotateX(${(.5-py)*6}deg)`;card.style.setProperty('--gx',px*100+'%');card.style.setProperty('--gy',py*100+'%');}
    },{passive:true});
    document.addEventListener('mouseout',e=>{
      const mag=e.target.closest&&e.target.closest('.btn,[data-magnet]');if(mag&&!mag.contains(e.relatedTarget))mag.style.transform='';
      const card=e.target.closest&&e.target.closest('.card');if(card&&!card.contains(e.relatedTarget))card.style.transform='';
    },{passive:true});
  }

  /* Motion (motion.dev) — spring micro-interactions + scroll-stagger, progressive enhancement */
  (async()=>{ if(reduced)return; try{
    const {inView,animate,stagger,press}=await import('https://cdn.jsdelivr.net/npm/motion@11/+esm');
    // press spring on every button + filter chip
    if(press)document.body.addEventListener('pointerdown',ev=>{
      const b=ev.target.closest('.btn,.chip');
      if(b)animate(b,{scale:.94},{duration:.12}).finished.then(()=>animate(b,{scale:1},{type:'spring',stiffness:460,damping:15}));
    });
    // product-detail info: staggered rise
    inView('.pd-info',({target})=>{animate(target.children,{opacity:[0,1],transform:['translateY(22px)','none']},{delay:stagger(.06),duration:.6,easing:[.16,1,.3,1]});});
    // section headings: slide the accent underline in
    inView('.shop-head h1',({target})=>animate(target,{opacity:[0,1],transform:['translateY(26px)','none']},{duration:.7,easing:[.16,1,.3,1]}));
  }catch(_){/* CDN blocked — CSS transitions + vanilla layer already cover it */}})();
}

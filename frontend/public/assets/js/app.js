// ======== Storage helpers ========
const DB = {
  read(key, fallback){ try{ return JSON.parse(localStorage.getItem(key)) ?? fallback }catch(_){ return fallback } },
  write(key, val){ localStorage.setItem(key, JSON.stringify(val)); },
  uid(){ return Math.random().toString(36).slice(2,9) }
};

// Seed demo data
(function seed(){
  if(!localStorage.getItem('products')){
    DB.write('products', [
      {id:DB.uid(), name:'Abrigo gris', category:'Abrigos', price:120, stock:8},
      {id:DB.uid(), name:'Camiseta negra', category:'Camisetas', price:39.9, stock:30},
      {id:DB.uid(), name:'Pantalón azul', category:'Pantalones', price:89, stock:15}
    ]);
  }
  if(!localStorage.getItem('users')){
    DB.write('users', [
      {id:DB.uid(), name:'Ana Pérez', role:'Admin', status:'Activo'},
      {id:DB.uid(), name:'Juan Díaz', role:'Vendedor', status:'Activo'},
      {id:DB.uid(), name:'María Cruz', role:'Supervisor', status:'Inactivo'}
    ]);
  }
  if(!localStorage.getItem('sales')) DB.write('sales', []);
})();

// Cuentas para login (usuario/contraseña) ligadas por el mismo id que "users"
const Accounts = {
  read(){ return DB.read('accounts', []); },
  write(list){ DB.write('accounts', list); },
  findById(id){ return this.read().find(a=>a.id===id); },
  findByUsername(username){ return this.read().find(a=>a.username?.toLowerCase() === String(username).toLowerCase()); },
  upsert({id, username, password}){
    const list = this.read();
    const i = list.findIndex(a=>a.id===id);
    if(!username){ // si quitan usuario, eliminamos cuenta
      if(i>=0) list.splice(i,1);
      this.write(list);
      return;
    }
    if(i>=0){
      // si no pasan password, mantener el anterior
      list[i].username = username;
      if(password) list[i].password = password;
    }else{
      list.push({ id, username, password: password||'' });
    }
    this.write(list);
  }
};

// ======== Nav active ========
(function(){
  const path = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('nav a').forEach(a=>{
    if(a.getAttribute('href')===path){ a.classList.add('active') }
  });
})();

// ======== Auth + RBAC ========
const ACL = {
  'dashboard.html': ['Admin','Supervisor','Vendedor'],
  'pos.html'       : ['Admin','Supervisor','Vendedor'],
  'inventario.html': ['Admin','Supervisor'],
  'usuarios.html'  : ['Admin'],
  'reportes.html'  : ['Admin','Supervisor']
};

function getSession(){
  try { return JSON.parse(localStorage.getItem('auth')); } catch { return null; }
}
function setSession(s){ localStorage.setItem('auth', JSON.stringify(s)); }

function requireAuth(allowedRoles=null){
  const me = getSession();
  if(!me){ location.href = 'index.html'; return; }

  // Si la página tiene restricción, validamos
  const path = (location.pathname.split('/').pop() || 'dashboard.html');
  const pageRoles = allowedRoles || ACL[path] || null;
  if (pageRoles && !pageRoles.includes(me.role)) {
    // sin permiso → redirigimos al Dashboard
    alert('No tienes permisos para acceder a esta sección.');
    location.href = 'dashboard.html';
    return;
  }

  // Ocultar del menú lo que no pueda ver
  applyRoleUI(me.role);
}

function applyRoleUI(role){
  const canSee = (file)=> (ACL[file]||['Admin','Supervisor','Vendedor']).includes(role);
  const q = (sel) => document.querySelector(sel);

  const links = [
    ['dashboard.html', 'a[href$="dashboard.html"]'],
    ['inventario.html','a[href$="inventario.html"]'],
    ['pos.html',       'a[href$="pos.html"]'],
    ['usuarios.html',  'a[href$="usuarios.html"]'],
    ['reportes.html',  'a[href$="reportes.html"]'],
  ];
  links.forEach(([file, sel])=>{
    const el = q(sel);
    if(el){ el.style.display = canSee(file) ? '' : 'none'; }
  });
}
function logout(){ localStorage.removeItem('auth'); location.href='index.html'; }

// Monta barra superior con nombre/rol (y sin botón rojo)
function renderSessionBar(titleText){
  const wrap = document.querySelector('.topbar');
  if(!wrap) return;
  const me = getSession && getSession();
  // título (si el <h2> existe lo actualizamos)
  const h2 = wrap.querySelector('h2'); if(h2 && titleText) h2.textContent = titleText;
  // info de sesión
  const box = document.getElementById('session-info');
  if (me && box) {
    box.innerHTML = `👤 <strong>${me.name || me.username || 'Usuario'}</strong>
      <span style="color:#6b7280">(${me.role || '—'})</span>`;
  }
}

// ======== UI Helpers ========
function openModal(id){ document.getElementById(id).classList.add('open'); }
function closeModal(id){ document.getElementById(id).classList.remove('open'); }
function fmt(n){ return 'S/ ' + Number(n).toFixed(2) }
function download(filename, content, type='text/csv'){
  const blob = new Blob([content], {type});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; a.click();
}

// ======== Inventory Page ========
function initInventory(){
  const tbody = document.querySelector('#inv-tbody');
  const search = document.querySelector('#inv-search');
  const btnNew = document.querySelector('#btn-new-product');
  const form = document.getElementById('form-product');
  let editingId = null;

  function render(){
    const products = DB.read('products', []);
    const q = (search.value||'').toLowerCase();
    tbody.innerHTML = products.filter(p=>[p.name,p.category].join(' ').toLowerCase().includes(q))
    .map(p=>`<tr>
      <td>${p.name}</td><td>${p.category}</td><td>${fmt(p.price)}</td><td>${p.stock}</td>
      <td><button data-id="${p.id}" class="edit">Editar</button> <button data-id="${p.id}" class="danger del">Borrar</button></td>
    </tr>`).join('');
  }
  render();
  search.addEventListener('input', render);
  btnNew.addEventListener('click', ()=>{ form.reset(); editingId=null; openModal('modal-product'); });
  tbody.addEventListener('click', e=>{
    const id=e.target.getAttribute('data-id'); if(!id) return;
    if(e.target.classList.contains('edit')){
      const p = DB.read('products', []).find(x=>x.id===id);
      form.pid.value = p.id; form.name.value=p.name; form.category.value=p.category; form.price.value=p.price; form.stock.value=p.stock;
      editingId = id; openModal('modal-product');
    } else if(e.target.classList.contains('del')){
      if(confirm('¿Eliminar producto?')){
        DB.write('products', DB.read('products', []).filter(x=>x.id!==id)); render();
      }
    }
  });
  form.addEventListener('submit', e=>{
    e.preventDefault();
    const data = { id: editingId || DB.uid(), name: form.name.value, category: form.category.value, price: Number(form.price.value), stock: Number(form.stock.value) };
    const products = DB.read('products', []);
    const idx = products.findIndex(x=>x.id===data.id);
    if(idx>=0) products[idx]=data; else products.push(data);
    DB.write('products', products); closeModal('modal-product'); render();
  });

  document.getElementById('export-inventory').addEventListener('click', ()=>{
    const rows = [['Nombre','Categoría','Precio','Stock']].concat(DB.read('products', []).map(p=>[p.name,p.category,p.price,p.stock]));
    const csv = rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
    download('inventario.csv', csv);
  });
}

// ======== Users Page ========
function initUsers(){
  const tbody = document.querySelector('#usr-tbody');
  const btnNew = document.querySelector('#btn-new-user');
  const form = document.getElementById('form-user');
  let editingId=null;

  function render(){
    const users = DB.read('users', []);
    tbody.innerHTML = users.map(u=>`<tr>
      <td>${u.name}</td>
      <td>${u.role}</td>
      <td><span class="badge ${u.status==='Activo'?'ok':''}">${u.status}</span></td>
      <td>
        <button class="edit" data-id="${u.id}">Editar</button>
        <button class="danger del" data-id="${u.id}">Borrar</button>
      </td>
    </tr>`).join('');
  }
  render();

  btnNew.addEventListener('click', ()=>{
    form.reset();
    editingId=null;
    openModal('modal-user');
  });

  // 🔹 Editar / Borrar
  tbody.addEventListener('click', e=>{
    const id=e.target.getAttribute('data-id'); if(!id) return;
    if(e.target.classList.contains('edit')){
      const u = DB.read('users', []).find(x=>x.id===id);
      const acc = Accounts.findById(id); // buscamos si tiene credenciales
      editingId=id;
      form.uid.value=id;
      form.name.value=u.name;
      form.role.value=u.role;
      form.status.value=u.status;
      form.username.value = acc?.username || '';
      form.password.value = ''; // nunca rellenar por seguridad
      openModal('modal-user');
    } else if(e.target.classList.contains('del')){
      if(confirm('¿Eliminar usuario?')){
        DB.write('users', DB.read('users', []).filter(x=>x.id!==id));
        // 🔹 borrar también cuenta asociada
        const list = Accounts.read().filter(a=>a.id!==id);
        Accounts.write(list);
        render();
      }
    }
  });

  // 🔹 Guardar
  form.addEventListener('submit', e=>{
    e.preventDefault();
    const data = { 
      id: editingId || DB.uid(), 
      name: form.name.value, 
      role: form.role.value, 
      status: form.status.value 
    };
    const username = (form.username.value||'').trim();
    const password = (form.password.value||'').trim();

    // guardar usuario
    const users = DB.read('users', []);
    const idx = users.findIndex(x=>x.id===data.id);
    if(idx>=0) users[idx]=data; else users.push(data);
    DB.write('users', users);

    // guardar/actualizar credenciales
    Accounts.upsert({ id: data.id, username, password });

    closeModal('modal-user');
    render();
  });
}

// ======== POS Page ========
function initPOS(){
  const tbody = document.querySelector('#pos-tbody');
  const totalEl = document.querySelector('#pos-total');
  const addBtn = document.querySelector('#pos-add');
  const prodSelect = document.querySelector('#pos-prod');
  const qtyInput = document.querySelector('#pos-qty');

  function refreshSelect(){
    prodSelect.innerHTML = DB.read('products', []).map(p=>`<option value="${p.id}">${p.name} (S/ ${p.price.toFixed(2)} | stock ${p.stock})</option>`).join('');
  }
  function cart(){ return window.__cart ||= []; }
  function render(){
    const rows = cart().map((i,idx)=>`<tr>
      <td>${i.name}</td><td>${i.qty}</td><td>${fmt(i.qty*i.price)}</td>
      <td><button class="danger del" data-idx="${idx}">Quitar</button></td>
    </tr>`).join('');
    tbody.innerHTML = rows || '<tr><td colspan="4" class="helper">Agrega productos a la venta</td></tr>';
    const total = cart().reduce((s,i)=>s+i.qty*i.price,0);
    totalEl.textContent = fmt(total);
  }
  refreshSelect(); render();

  addBtn.addEventListener('click', ()=>{
    const id = prodSelect.value; const qty = Number(qtyInput.value||1);
    const p = DB.read('products', []).find(x=>x.id===id);
    if(!p) return;
    if(qty<=0) return alert('Cantidad inválida');
    if(qty>p.stock) return alert('Stock insuficiente');
    cart().push({id, name:p.name, price:p.price, qty}); render();
  });
  tbody.addEventListener('click', e=>{
    const i = e.target.getAttribute('data-idx');
    if(e.target.classList.contains('del')){ cart().splice(Number(i),1); render(); }
  });
  document.getElementById('pos-register').addEventListener('click', ()=>{
    if(cart().length===0) return alert('No hay productos');
    const products = DB.read('products', []);
    for(const item of cart()){
      const p = products.find(x=>x.id===item.id);
      if(!p || p.stock<item.qty){ return alert('Stock cambió, revisa'); }
      p.stock -= item.qty;
    }
    DB.write('products', products);
    const total = cart().reduce((s,i)=>s+i.qty*i.price,0);
    const sale = { id:DB.uid(), date:new Date().toISOString(), items:cart(), total };
    const sales = DB.read('sales', []); sales.push(sale); DB.write('sales', sales);
    window.__cart = []; refreshSelect(); render();
    alert('Venta registrada');
  });
  document.getElementById('pos-cancel').addEventListener('click', ()=>{ window.__cart=[]; render(); });
}

// ======== Dashboard ========
function initDashboard(){
  const kSales  = document.getElementById('kpi-sales');
  const kStock  = document.getElementById('kpi-stock');
  const kAlerts = document.getElementById('kpi-alerts');
  const chartEl = document.getElementById('chart-top');

  if(!kSales || !kStock || !kAlerts){
    console.warn('IDs KPI faltan en el DOM'); return;
  }

  const sales = DB.read('sales', []);
  const products = DB.read('products', []);

  const todayStr = new Date().toDateString();
  const soldToday = sales
    .filter(s => new Date(s.date).toDateString() === todayStr)
    .reduce((sum, s) => sum + (Number(s.total) || 0), 0);
  kSales.textContent = fmt(soldToday);

  const stock = products.reduce((sum, p) => sum + (Number(p.stock) || 0), 0);
  kStock.textContent = stock + ' ítems';

  const low = products.filter(p => (Number(p.stock) || 0) <= 3).length;
  kAlerts.textContent = low + ' con bajo stock';

  if (!chartEl || !chartEl.getContext) { console.warn('Canvas chart-top no encontrado'); return; }
  const ctx = chartEl.getContext('2d');

  const totals = {};
  for (const s of sales) for (const i of (s.items || []))
    totals[i.name] = (totals[i.name] || 0) + (Number(i.qty) || 0);

  const labels = Object.keys(totals);
  const values = Object.values(totals);
  drawBars(ctx, labels, values); // nuestra drawBars muestra "Sin datos" si está vacío
}


// ======== Reports ========
// ======== Reports (con filtro y CSV por rango) ========
function initReports(){
  // Helpers de fechas (locales)
  const toLocalISO = (d)=> {
    const dt = new Date(d);
    const tz = dt.getTimezoneOffset();
    const local = new Date(dt.getTime() - tz*60000);
    return local.toISOString().slice(0,10);
  };
  const addDays = (d, n)=>{ const x=new Date(d); x.setDate(x.getDate()+n); return x; };
  const daysBetween = (from, to)=>{
    const days=[]; 
    let cur = new Date(from);
    const end = new Date(to);
    while(cur <= end){ days.push(toLocalISO(cur)); cur = addDays(cur, 1); }
    return days;
  };

  // DOM
  const fromEl   = document.getElementById('rep-from');
  const toEl     = document.getElementById('rep-to');
  const btnApply = document.getElementById('rep-apply');
  const btnLast7 = document.getElementById('rep-last7');
  const btnThisM = document.getElementById('rep-thismo');
  const expBtn   = document.getElementById('exp-sales'); // ⬅️ botón Exportar Ventas (CSV)

  // Datos
  const sales = DB.read('sales', []);
  const prods = DB.read('products', []);

  // Defaults: últimos 7 días
  const today = new Date();
  const last7 = addDays(today, -6);
  if(!fromEl.value) fromEl.value = toLocalISO(last7);
  if(!toEl.value)   toEl.value   = toLocalISO(today);

  // Exporta CSV filtrando por rango (inclusive)
  function exportSalesCSV(from, to){
    const endOfTo = new Date(to.getFullYear(), to.getMonth(), to.getDate(), 23,59,59,999);
    const rows = [['Fecha','Producto','Cantidad','Precio','Subtotal','Total venta']];

    for(const s of sales){
      const d = new Date(s.date);
      if(d >= from && d <= endOfTo){
        for(const i of s.items){
          rows.push([
            d.toISOString(),
            i.name,
            i.qty,
            i.price,
            (i.qty*i.price).toFixed(2),
            s.total.toFixed(2)
          ]);
        }
      }
    }

    const csv = rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
    const fname = `ventas_${toLocalISO(from)}_a_${toLocalISO(to)}.csv`;
    download(fname, csv);
  }

  // Render principal
  function render(){
    const from = new Date(fromEl.value);
    const to   = new Date(toEl.value);
    if(isNaN(from) || isNaN(to) || from>to){ 
      alert('Rango inválido'); return; 
    }

    // --- Ventas por día (filtrado por rango)
    const labels = daysBetween(from, to);           // todas las fechas del rango
    const totalsByDay = Object.fromEntries(labels.map(d=>[d,0]));

    for(const s of sales){
      const d = new Date(s.date);
      const key = toLocalISO(d);
      if(d>=from && d<=addDays(to,1)){             // inclusivo
        totalsByDay[key] = (totalsByDay[key]||0) + s.total;
      }
    }

    const vals = labels.map(d=> totalsByDay[d] || 0);
    drawLines(document.getElementById('chart-sales').getContext('2d'), labels, vals);

    // --- Inventario proyectado (stock actual)
    drawBars(document.getElementById('chart-inv').getContext('2d'), 
             prods.map(p=>p.name), 
             prods.map(p=>p.stock));

    // ⬅️ enlaza exportación al rango actual en pantalla
    if (expBtn) expBtn.onclick = () => exportSalesCSV(from, to);
  }

  // Acciones rápidas
  btnApply && btnApply.addEventListener('click', render);
  btnLast7 && btnLast7.addEventListener('click', ()=>{
    const t = new Date(); const f = addDays(t,-6);
    fromEl.value = toLocalISO(f); toEl.value = toLocalISO(t); render();
  });
  btnThisM && btnThisM.addEventListener('click', ()=>{
    const t = new Date(); 
    const first = new Date(t.getFullYear(), t.getMonth(), 1);
    fromEl.value = toLocalISO(first); toEl.value = toLocalISO(t); render();
  });

  // Render inicial
  render();
}

// ======== Minimal Canvas Charts ========
function drawBars(ctx, labels, values){
  const w = ctx.canvas.width, h = ctx.canvas.height;
  ctx.clearRect(0,0,w,h);
  const max = Math.max(1,...values);
  const bw = w/(values.length*1.5 || 1);
  ctx.font = '12px system-ui'; ctx.fillStyle = '#111827';
  values.forEach((v,i)=>{
    const x = (i+0.5)*bw*1.5; const bh = (v/max)*(h-30);
    ctx.fillStyle = '#93c5fd'; ctx.fillRect(x, h-20-bh, bw, bh);
    ctx.fillStyle = '#111827'; ctx.fillText(String(labels[i]).slice(0,10), x, h-5);
  });
}

function drawLines(ctx, labels, values){
  const w = ctx.canvas.width, h = ctx.canvas.height;
  ctx.clearRect(0,0,w,h);
  const max = Math.max(1,...values); 
  const step = (w-40)/Math.max(1,values.length-1);

  ctx.beginPath(); 
  ctx.moveTo(20,h-20-(values[0]/max)*(h-40));
  for(let i=1;i<values.length;i++){ 
    ctx.lineTo(20+i*step, h-20-(values[i]/max)*(h-40)); 
  }
  ctx.strokeStyle='#60a5fa'; 
  ctx.lineWidth=2; 
  ctx.stroke();

  ctx.fillStyle='#111827'; 
  ctx.font='12px system-ui';
  labels.forEach((l,i)=> ctx.fillText((l||'').slice(5), 16+i*step, h-5));
}

// --- Utilidad para generar ventas demo (últimos 7 días)
function seedSalesDemo(days=7){
  const products = DB.read('products', []);
  if(products.length===0) return alert('No hay productos para generar ventas demo.');

  const sales = [];
  for(let d=days-1; d>=0; d--){
    const date = new Date(); date.setDate(date.getDate()-d);

    // 0-3 ítems por día
    const items = [];
    const count = Math.floor(Math.random()*4);
    for(let i=0;i<count;i++){
      const p = products[Math.floor(Math.random()*products.length)];
      const qty = 1 + Math.floor(Math.random()*3); // 1..3
      items.push({ id:p.id, name:p.name, price:p.price, qty });
    }
    const total = items.reduce((s,i)=>s+i.qty*i.price,0);
    if(items.length>0){
      sales.push({ id:DB.uid(), date:date.toISOString(), items, total });
    }
  }
  DB.write('sales', sales);
  alert('Ventas demo generadas');
}


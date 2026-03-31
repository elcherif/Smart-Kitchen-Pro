// --- CONFIGURACIÓN E INICIO ---
const PRODUCTOS_BASE = {
    "Leche": "Lácteos", "Huevos": "Lácteos", "Yogur": "Lácteos", "Queso": "Lácteos", "Pollo": "Carnes/Pescados",
    "Ternera": "Carnes/Pescados", "Merluza": "Carnes/Pescados", "Salmón": "Carnes/Pescados", "Atún": "Carnes/Pescados",
    "Tomate": "Fruta/Verdura", "Cebolla": "Fruta/Verdura", "Patatas": "Fruta/Verdura", "Lechuga": "Fruta/Verdura",
    "Manzana": "Fruta/Verdura", "Plátano": "Fruta/Verdura", "Arroz": "Generales", "Pasta": "Generales", "Pan": "Generales",
    "Agua": "Bebidas", "Cerveza": "Bebidas", "Vino": "Bebidas", "Pizza": "Congelados", "Detergente": "Limpieza", "Papel Higiénico": "Limpieza"
};

const EMOJIS = { leche: "🥛", huevo: "🥚", carne: "🥩", pollo: "🍗", pescado: "🐟", fruta: "🍎", verdura: "🥦", bebida: "🥤", limpieza: "🧼", pasta: "🍝", arroz: "🍚" };

let inventario = JSON.parse(localStorage.getItem('smartKitchenDB')) || [];
let listaCompra = JSON.parse(localStorage.getItem('smartKitchenBuy_v2')) || [];
let catalogoObj = JSON.parse(localStorage.getItem('catalogoDB_v2')) || {};
let itemEnTransferencia = null;
let cantidadATransferir = 1;

function obtenerEmoji(n) { 
    const name = n.toLowerCase();
    for(let k in EMOJIS) if(name.includes(k)) return EMOJIS[k];
    return "📦";
}

// --- 1. GESTIÓN DE CANTIDADES (FORMULARIO) ---
function cambiarCantForm(v) {
    const i = document.getElementById('cantidad');
    let n = parseInt(i.value) + v;
    i.value = Math.max(1, n);
}

// --- 2. GESTIÓN DE CANTIDADES (INVENTARIO) ---
function modCantInv(id, v) {
    const p = inventario.find(i => i.id === id);
    if (!p) return;
    p.cantidad += v;
    if (p.cantidad <= 0) {
        if (confirm(`¿Mover "${p.nombre}" a la lista de compra?`)) añadirACompra(p.nombre, 1);
        inventario = inventario.filter(i => i.id !== id);
    }
    guardarYActualizar();
}

// --- 3. GESTIÓN DE CANTIDADES (COMPRA) ---
function modCantCompra(nombre, v) {
    const item = listaCompra.find(i => i.nombre === nombre);
    if (item) {
        item.cantidad += v;
        if (item.cantidad <= 0) listaCompra = listaCompra.filter(i => i.nombre !== nombre);
        guardarYActualizar();
    }
}

function añadirManualACompra() {
    const input = document.getElementById('input-compra-manual');
    const nombre = input.value.trim();
    if (nombre) {
        const existe = listaCompra.find(i => i.nombre.toLowerCase() === nombre.toLowerCase());
        if (existe) existe.cantidad += 1;
        else listaCompra.push({ nombre: nombre, cantidad: 1 });
        input.value = "";
        guardarYActualizar();
    }
}

// --- 4. TRASVASE (MOVER CON CANTIDAD +/-) ---
function abrirTransferencia(id) {
    itemEnTransferencia = id;
    cantidadATransferir = inventario.find(i => i.id === id).cantidad;
    actualizarVista();
}

function modCantTransfer(v) {
    const p = inventario.find(i => i.id === itemEnTransferencia);
    cantidadATransferir = Math.max(1, Math.min(cantidadATransferir + v, p.cantidad));
    actualizarVista();
}

function ejecutarTransferencia() {
    const p = inventario.find(i => i.id === itemEnTransferencia);
    const destino = p.ubicacion === 'frigorifico' ? 'congelador' : 'frigorifico';
    if (cantidadATransferir === p.cantidad) {
        p.ubicacion = destino;
        p.fecha = new Date().toISOString().split('T')[0];
    } else {
        p.cantidad -= cantidadATransferir;
        inventario.push({ ...p, id: Date.now(), cantidad: cantidadATransferir, ubicacion: destino, fecha: new Date().toISOString().split('T')[0] });
    }
    itemEnTransferencia = null;
    guardarYActualizar();
}

// --- 5. LÓGICA DE FORMULARIO ---
function procesarFormulario() {
    const idEd = document.getElementById('edit-id').value;
    const nombre = document.getElementById('nombre').value.trim();
    if (!nombre) return;

    const p = {
        id: idEd ? parseInt(idEd) : Date.now(),
        nombre: nombre,
        categoria: document.getElementById('categoria').value,
        cantidad: parseInt(document.getElementById('cantidad').value) || 1,
        fecha: document.getElementById('fecha').value || new Date().toISOString().split('T')[0],
        ubicacion: document.getElementById('ubicacion').value
    };

    if (idEd) inventario[inventario.findIndex(x => x.id == idEd)] = p;
    else {
        inventario.push(p);
        listaCompra = listaCompra.filter(i => i.nombre.toLowerCase() !== nombre.toLowerCase());
    }
    guardarYActualizar();
    cancelarEdicion();
}

function verificarCategoriaAuto() {
    const n = document.getElementById('nombre').value.trim();
    if (catalogoObj[n]) document.getElementById('categoria').value = catalogoObj[n];
    else for (let p in PRODUCTOS_BASE) if (n.toLowerCase() === p.toLowerCase()) document.getElementById('categoria').value = PRODUCTOS_BASE[p];
}

function completarCompra(nombreItem) {
    const item = listaCompra.find(i => i.nombre === nombreItem);
    if (!item) return;
    document.getElementById('nombre').value = item.nombre;
    document.getElementById('cantidad').value = item.cantidad;
    document.getElementById('fecha').value = new Date().toISOString().split('T')[0];
    verificarCategoriaAuto();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// --- 6. RENDER Y PERSISTENCIA ---
function actualizarVista() {
    const filtro = document.getElementById('buscador').value.toLowerCase();
    const lists = { frigorifico: document.getElementById('lista-frigorifico'), congelador: document.getElementById('lista-congelador'), compra: document.getElementById('lista-compra') };
    Object.values(lists).forEach(l => l.innerHTML = "");

    inventario.filter(p => p.nombre.toLowerCase().includes(filtro)).forEach(p => {
        const li = document.createElement('li');
        const esMoviendo = itemEnTransferencia === p.id;
        li.innerHTML = `
            <div class="linea-principal">
                <div class="item-info"><strong>${obtenerEmoji(p.nombre)} ${p.nombre}</strong><br><small>${p.fecha}</small></div>
                <div class="qty-universal-ctrl">
                    <button onclick="modCantInv(${p.id},-1)">−</button>
                    <span>${p.cantidad}</span>
                    <button onclick="modCantInv(${p.id},1)">+</button>
                </div>
            </div>
            ${esMoviendo ? `
                <div class="transfer-panel">
                    <span style="font-size:0.8rem; font-weight:bold;">TRASPASAR:</span>
                    <div class="qty-universal-ctrl">
                        <button onclick="modCantTransfer(-1)">−</button>
                        <span>${cantidadATransferir}</span>
                        <button onclick="modCantTransfer(1)">+</button>
                    </div>
                    <button class="btn-accion btn-confirm-move" onclick="ejecutarTransferencia()">Mover ✅</button>
                    <button class="btn-accion" onclick="itemEnTransferencia=null; actualizarVista()">✕</button>
                </div>
            ` : `
                <div class="linea-principal" style="margin-top:5px">
                    <button class="btn-accion" onclick="abrirTransferencia(${p.id})">⇄ ${p.ubicacion==='frigorifico'?'Congelar':'Descongelar'}</button>
                    <button class="btn-accion" onclick="prepararEdicion(${p.id})">✏️</button>
                </div>
            `}`;
        lists[p.ubicacion].appendChild(li);
    });

    listaCompra.filter(i => i.nombre.toLowerCase().includes(filtro)).forEach(i => {
        const li = document.createElement('li');
        li.innerHTML = `
            <div class="linea-principal">
                <span>🛒 ${i.nombre}</span>
                <div class="linea-principal" style="gap:10px">
                    <div class="qty-universal-ctrl">
                        <button onclick="modCantCompra('${i.nombre}',-1)">−</button>
                        <span>${i.cantidad}</span>
                        <button onclick="modCantCompra('${i.nombre}',1)">+</button>
                    </div>
                    <button class="btn-accion" onclick="completarCompra('${i.nombre}')">✅</button>
                </div>
            </div>`;
        lists.compra.appendChild(li);
    });
    document.getElementById('stats-content').innerText = `Stock: ${inventario.length} | Compra: ${listaCompra.length}`;
}

function guardarYActualizar() {
    localStorage.setItem('smartKitchenDB', JSON.stringify(inventario));
    localStorage.setItem('smartKitchenBuy_v2', JSON.stringify(listaCompra));
    localStorage.setItem('catalogoDB_v2', JSON.stringify(catalogoObj));
    actualizarVista();
    renderCatalogo();
}

function renderCatalogo() {
    const dl = document.getElementById('lista-sugerencias');
    const lista = [...new Set([...Object.keys(PRODUCTOS_BASE), ...Object.keys(catalogoObj)])].sort();
    dl.innerHTML = lista.map(p => `<option value="${p}">`).join("");
}

function prepararEdicion(id) {
    const p = inventario.find(i => i.id === id);
    document.getElementById('edit-id').value = p.id;
    document.getElementById('nombre').value = p.nombre;
    document.getElementById('cantidad').value = p.cantidad;
    document.getElementById('categoria').value = p.categoria;
    document.getElementById('ubicacion').value = p.ubicacion;
    document.getElementById('btn-principal').innerText = "Guardar Cambios";
    document.getElementById('btn-cancelar').style.display = "inline-block";
    window.scrollTo(0,0);
}

function cancelarEdicion() {
    document.getElementById('edit-id').value = "";
    document.getElementById('nombre').value = "";
    document.getElementById('btn-principal').innerText = "Añadir Producto";
    document.getElementById('btn-cancelar').style.display = "none";
}

// --- 7. EXTRAS (WHATSAPP, BACKUP, ETC) ---
function compartirWhatsApp() {
    let m = "❄️ *INVENTARIO*\n";
    inventario.forEach(p => m += `• ${obtenerEmoji(p.nombre)} ${p.nombre} (${p.cantidad})\n`);
    window.open(`https://wa.me/?text=${encodeURIComponent(m)}`);
}
function compartirWhatsAppCompra() {
    let m = "🛒 *LISTA COMPRA*\n";
    listaCompra.forEach(i => m += `• ${i.nombre} (${i.cantidad})\n`);
    window.open(`https://wa.me/?text=${encodeURIComponent(m)}`);
}
function exportarCopiaSeguridad() {
    const blob = new Blob([JSON.stringify({ inventario, listaCompra, catalogo: catalogoObj })], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `Cocina_Backup.json`; a.click();
}
function validarYPrevisualizar(e) {
    const reader = new FileReader();
    reader.onload = (ev) => { window.datosTemp = JSON.parse(ev.target.result); document.getElementById('btn-confirmar-import').style.display = 'inline-block'; };
    reader.readAsText(e.target.files[0]);
}
function ejecutarRestauracion() {
    inventario = window.datosTemp.inventario; listaCompra = window.datosTemp.listaCompra; catalogoObj = window.datosTemp.catalogo;
    guardarYActualizar(); document.getElementById('btn-confirmar-import').style.display = 'none';
}
function borrarTodo() { if(confirm("¿Seguro que quieres borrarlo todo?")) { localStorage.clear(); location.reload(); } }
function borrarFiltro() { document.getElementById('buscador').value = ""; actualizarVista(); }
function actualizarLabelFecha() { document.getElementById('label-fecha').innerText = document.getElementById('ubicacion').value === 'frigorifico' ? 'F. Caducidad' : 'F. Congelación'; }
function guardarEnCatalogo() { const n = document.getElementById('nombre').value.trim(); if(n) { catalogoObj[n] = document.getElementById('categoria').value; guardarYActualizar(); alert("Aprendido!"); } }

// INICIO APP
renderCatalogo();
actualizarVista();


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
    const nombreLower = nombre.toLowerCase();
    const item = listaCompra.find(i => i.nombre.toLowerCase() === nombreLower);
    if (item) {
        item.cantidad += v;
        if (item.cantidad <= 0) listaCompra = listaCompra.filter(i => i.nombre.toLowerCase() !== nombreLower);
        guardarYActualizar();
    }
}

// ISSUE #4: Función faltante - añadirACompra()
function añadirACompra(nombre, cantidad) {
    const nombreLower = nombre.toLowerCase();
    const existe = listaCompra.find(i => i.nombre.toLowerCase() === nombreLower);
    if (existe) existe.cantidad += cantidad;
    else listaCompra.push({ nombre: nombre, cantidad });
    guardarYActualizar();
}

function añadirManualACompra() {
    const input = document.getElementById('input-compra-manual');
    const nombre = input.value.trim();
    if (nombre) {
        const nombreLower = nombre.toLowerCase();
        const existe = listaCompra.find(i => i.nombre.toLowerCase() === nombreLower);
        if (existe) existe.cantidad += 1;
        else listaCompra.push({ nombre: nombre, cantidad: 1 });
        input.value = "";
        guardarYActualizar();
    }
}

// --- 4. TRASVASE (MOVER CON CANTIDAD +/-) ---
function abrirTransferencia(id) {
    const item = inventario.find(i => i.id === id);
    if (!item) return;
    itemEnTransferencia = id;
    cantidadATransferir = item.cantidad;
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
        const nombreLower = nombre.toLowerCase();
        listaCompra = listaCompra.filter(i => i.nombre.toLowerCase() !== nombreLower);
    }
    guardarYActualizar();
    cancelarEdicion();
}

function verificarCategoriaAuto() {
    const n = document.getElementById('nombre').value.trim();
    const nLower = n.toLowerCase();
    
    // Buscar en catálogo (case-insensitive)
    for (let key in catalogoObj) {
        if (key.toLowerCase() === nLower) {
            document.getElementById('categoria').value = catalogoObj[key];
            return;
        }
    }
    
    // Buscar en base de productos
    for (let p in PRODUCTOS_BASE) {
        if (nLower === p.toLowerCase()) {
            document.getElementById('categoria').value = PRODUCTOS_BASE[p];
            return;
        }
    }
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
        
        const div = document.createElement('div');
        div.className = 'linea-principal';
        
        const itemInfo = document.createElement('div');
        itemInfo.className = 'item-info';
        itemInfo.innerHTML = `<strong>${obtenerEmoji(p.nombre)} ${p.nombre}</strong><br><small>${p.fecha}</small>`;
        
        const qtyCtrl = document.createElement('div');
        qtyCtrl.className = 'qty-universal-ctrl';
        
        const btnMinus = document.createElement('button');
        btnMinus.textContent = '−';
        btnMinus.addEventListener('click', () => modCantInv(p.id, -1));
        
        const qtySpan = document.createElement('span');
        qtySpan.textContent = p.cantidad;
        
        const btnPlus = document.createElement('button');
        btnPlus.textContent = '+';
        btnPlus.addEventListener('click', () => modCantInv(p.id, 1));
        
        qtyCtrl.appendChild(btnMinus);
        qtyCtrl.appendChild(qtySpan);
        qtyCtrl.appendChild(btnPlus);
        
        div.appendChild(itemInfo);
        div.appendChild(qtyCtrl);
        li.appendChild(div);
        
        if (esMoviendo) {
            const transferPanel = document.createElement('div');
            transferPanel.className = 'transfer-panel';
            
            const label = document.createElement('span');
            label.style.fontSize = '0.8rem';
            label.style.fontWeight = 'bold';
            label.textContent = 'TRASPASAR:';
            
            const qtyTransfer = document.createElement('div');
            qtyTransfer.className = 'qty-universal-ctrl';
            
            const btnMinusT = document.createElement('button');
            btnMinusT.textContent = '−';
            btnMinusT.addEventListener('click', () => modCantTransfer(-1));
            
            const qtySpanT = document.createElement('span');
            qtySpanT.textContent = cantidadATransferir;
            
            const btnPlusT = document.createElement('button');
            btnPlusT.textContent = '+';
            btnPlusT.addEventListener('click', () => modCantTransfer(1));
            
            qtyTransfer.appendChild(btnMinusT);
            qtyTransfer.appendChild(qtySpanT);
            qtyTransfer.appendChild(btnPlusT);
            
            const btnConfirm = document.createElement('button');
            btnConfirm.className = 'btn-accion btn-confirm-move';
            btnConfirm.textContent = 'Mover ✅';
            btnConfirm.addEventListener('click', () => ejecutarTransferencia());
            
            const btnCancel = document.createElement('button');
            btnCancel.className = 'btn-accion';
            btnCancel.textContent = '✕';
            btnCancel.addEventListener('click', () => { itemEnTransferencia = null; actualizarVista(); });
            
            transferPanel.appendChild(label);
            transferPanel.appendChild(qtyTransfer);
            transferPanel.appendChild(btnConfirm);
            transferPanel.appendChild(btnCancel);
            li.appendChild(transferPanel);
        } else {
            const div2 = document.createElement('div');
            div2.className = 'linea-principal';
            div2.style.marginTop = '5px';
            
            const btnTransfer = document.createElement('button');
            btnTransfer.className = 'btn-accion';
            btnTransfer.textContent = `⇄ ${p.ubicacion === 'frigorifico' ? 'Congelar' : 'Descongelar'}`;
            btnTransfer.addEventListener('click', () => abrirTransferencia(p.id));
            
            const btnEdit = document.createElement('button');
            btnEdit.className = 'btn-accion';
            btnEdit.textContent = '✏️';
            btnEdit.addEventListener('click', () => prepararEdicion(p.id));
            
            div2.appendChild(btnTransfer);
            div2.appendChild(btnEdit);
            li.appendChild(div2);
        }
        
        lists[p.ubicacion].appendChild(li);
    });

    listaCompra.filter(i => i.nombre.toLowerCase().includes(filtro)).forEach(i => {
        const li = document.createElement('li');
        
        const div1 = document.createElement('div');
        div1.className = 'linea-principal';
        
        const span = document.createElement('span');
        span.textContent = `🛒 ${i.nombre}`;
        
        const div2 = document.createElement('div');
        div2.className = 'linea-principal';
        div2.style.gap = '10px';
        
        const qtyCtrl = document.createElement('div');
        qtyCtrl.className = 'qty-universal-ctrl';
        
        const btnMinus = document.createElement('button');
        btnMinus.textContent = '−';
        btnMinus.addEventListener('click', () => modCantCompra(i.nombre, -1));
        
        const qtySpan = document.createElement('span');
        qtySpan.textContent = i.cantidad;
        
        const btnPlus = document.createElement('button');
        btnPlus.textContent = '+';
        btnPlus.addEventListener('click', () => modCantCompra(i.nombre, 1));
        
        qtyCtrl.appendChild(btnMinus);
        qtyCtrl.appendChild(qtySpan);
        qtyCtrl.appendChild(btnPlus);
        
        const btnCheck = document.createElement('button');
        btnCheck.className = 'btn-accion';
        btnCheck.textContent = '✅';
        btnCheck.addEventListener('click', () => completarCompra(i.nombre));
        
        div2.appendChild(qtyCtrl);
        div2.appendChild(btnCheck);
        
        div1.appendChild(span);
        div1.appendChild(div2);
        li.appendChild(div1);
        lists.compra.appendChild(li);
    });
    
    document.getElementById('stats-content').innerText = `Stock: ${inventario.length} | Compra: ${listaCompra.length}`;
    
    // Mostrar/ocultar botón de filtro según haya texto
    const hasFilter = document.getElementById('buscador').value.trim().length > 0;
    document.getElementById('btn-borrar-filtro').style.display = hasFilter ? 'inline-block' : 'none';
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
    if (!p) return;
    document.getElementById('edit-id').value = p.id;
    document.getElementById('nombre').value = p.nombre;
    document.getElementById('cantidad').value = p.cantidad;
    document.getElementById('categoria').value = p.categoria;
    document.getElementById('ubicacion').value = p.ubicacion;
    document.getElementById('fecha').value = p.fecha;
    document.getElementById('btn-principal').innerText = "Guardar Cambios";
    document.getElementById('btn-cancelar').style.display = "inline-block";
    window.scrollTo(0,0);
}

function cancelarEdicion() {
    document.getElementById('edit-id').value = "";
    document.getElementById('nombre').value = "";
    document.getElementById('cantidad').value = "1";
    document.getElementById('categoria').value = "Generales";
    document.getElementById('ubicacion').value = "frigorifico";
    document.getElementById('fecha').value = new Date().toISOString().split('T')[0];
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
    const a = document.createElement('a'); 
    const url = URL.createObjectURL(blob);
    a.href = url;
    a.download = `Cocina_Backup_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url); // Limpiar referencia
}

// ISSUE #3: Falta validación de JSON
function validarYPrevisualizar(e) {
    const reader = new FileReader();
    reader.onload = (ev) => { 
        try {
            window.datosTemp = JSON.parse(ev.target.result); 
            document.getElementById('btn-confirmar-import').style.display = 'inline-block'; 
        } catch (err) {
            alert('El archivo no es un backup válido.');
            console.error('Error al parsear JSON:', err);
        }
    };
    reader.readAsText(e.target.files[0]);
}

function ejecutarRestauracion() {
    // Validar que existan datos temporales
    if (!window.datosTemp || !window.datosTemp.inventario) {
        alert('Error: No hay datos temporales válidos para restaurar');
        return;
    }
    
    inventario = window.datosTemp.inventario; 
    listaCompra = window.datosTemp.listaCompra || []; 
    catalogoObj = window.datosTemp.catalogo || {};
    guardarYActualizar(); 
    document.getElementById('btn-confirmar-import').style.display = 'none';
    window.datosTemp = null; // Limpiar datos temporales
}

function borrarTodo() { 
    if(confirm("¿Seguro que quieres borrarlo todo?")) { 
        localStorage.clear(); 
        location.reload(); 
    } 
}

function borrarFiltro() { 
    document.getElementById('buscador').value = ""; 
    actualizarVista(); 
}

function actualizarLabelFecha() { 
    document.getElementById('label-fecha').innerText = document.getElementById('ubicacion').value === 'frigorifico' ? 'F. Caducidad' : 'F. Congelación'; 
}

function guardarEnCatalogo() { 
    const n = document.getElementById('nombre').value.trim(); 
    if(n) { 
        catalogoObj[n] = document.getElementById('categoria').value; 
        guardarYActualizar(); 
        alert("Aprendido!"); 
    } 
}

// Inicializar fecha actual al cargar
document.addEventListener('DOMContentLoaded', () => {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('fecha').value = today;
    renderCatalogo();
    actualizarVista();
});

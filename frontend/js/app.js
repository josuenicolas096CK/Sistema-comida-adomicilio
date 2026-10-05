const API = location.port === '3002' ? '/api' : 'http://127.0.0.1:3002/api';
const CART_KEY = 'lbm_cart';
const DELIVERY_KEY = 'lbm_delivery';
const LAST_ORDER_KEY = 'lbm_last_order';
const $ = id => document.getElementById(id);
const money = value => `Q${Number(value || 0).toFixed(2)}`;
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const safeImage = value => {
    if (!value) return '';
    try {
        const url = new URL(value, value.startsWith('/docs/') ? new URL(API, location.href).origin : location.href);
        return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
    } catch { return ''; }
};
const readStorage = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
};
async function requestApi(path, options) {
    return fetch(`${API}${path}`, options);
}
let cart = readStorage(CART_KEY, []);
if (!Array.isArray(cart)) cart = [];
cart = cart.filter(item => Number.isInteger(Number(item.id)) && Number(item.id) > 0 && Number.isFinite(Number(item.precio)) && Number.isInteger(Number(item.quantity)) && Number(item.quantity) > 0)
    .map(item => ({ ...item, id: Number(item.id), precio: Number(item.precio), quantity: Number(item.quantity) }));
let products = [];
let activeFilter = 'all';

function setText(id, value) { if ($(id)) $(id).textContent = value; }
function imageMarkup(product, className) {
    const source = safeImage(product.imagen_url);
    return source ? `<img src="${escapeHtml(source)}" alt="${escapeHtml(product.nombre)}" class="${className}" loading="lazy">` :
        `<div class="${className} product-placeholder" role="img" aria-label="Imagen no disponible">🍽️</div>`;
}
function showMessage(message, target) {
    let box = $(target || 'app-message');
    if (!box) {
        box = document.createElement('p');
        box.id = target || 'app-message';
        box.className = 'form-message';
        const anchor = $('btn-confirm-order') || $('checkout-shipping-form') || $('menu-cards-grid') || document.querySelector('main');
        anchor?.parentNode.insertBefore(box, anchor);
    }
    box.textContent = message;
    box.hidden = false;
}
function getTotals() {
    const subtotal = Math.round(cart.reduce((sum, item) => sum + Number(item.precio) * item.quantity, 0) * 100) / 100;
    return { subtotal, total: subtotal, count: cart.reduce((sum, item) => sum + item.quantity, 0) };
}
function saveCart() {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    renderCart();
}
function addProduct(id) {
    const product = products.find(item => item.id === Number(id));
    if (!product) return;
    const existing = cart.find(item => item.id === product.id);
    if (existing) existing.quantity++;
    else cart.push({ id: product.id, nombre: product.nombre, precio: Number(product.precio), imagen_url: product.imagen_url, quantity: 1 });
    saveCart();
    openDrawer();
}
function updateQuantity(id, delta) {
    const item = cart.find(product => product.id === Number(id));
    if (!item) return;
    item.quantity += delta;
    if (item.quantity <= 0) cart = cart.filter(product => product.id !== item.id);
    saveCart();
}
function openDrawer() {
    $('cart-drawer')?.classList.add('open');
    $('cart-drawer-overlay')?.classList.add('open');
    $('cart-drawer')?.setAttribute('aria-hidden', 'false');
}
function closeDrawer() {
    $('cart-drawer')?.classList.remove('open');
    $('cart-drawer-overlay')?.classList.remove('open');
    $('cart-drawer')?.setAttribute('aria-hidden', 'true');
}
function renderCart() {
    const totals = getTotals();
    setText('header-cart-badge', totals.count);
    if ($('header-cart-badge')) $('header-cart-badge').style.display = totals.count ? 'flex' : 'none';
    if ($('drawer-items-list')) $('drawer-items-list').innerHTML = cart.map(item => `
        <article class="drawer-item">
            ${imageMarkup(item, 'drawer-item-img')}
            <div class="drawer-item-info">
                <div class="drawer-item-top"><h4 class="drawer-item-title">${escapeHtml(item.nombre)}</h4>
                    <button type="button" class="drawer-item-remove" data-action="remove" data-id="${item.id}" aria-label="Eliminar ${escapeHtml(item.nombre)}">&times;</button></div>
                <span class="drawer-item-unit">${money(item.precio)} c/u</span>
                <div class="drawer-item-controls"><div class="quantity-selector small">
                    <button type="button" class="qty-btn" data-action="decrease" data-id="${item.id}" aria-label="Disminuir cantidad">−</button>
                    <span class="qty-display">${item.quantity}</span>
                    <button type="button" class="qty-btn" data-action="increase" data-id="${item.id}" aria-label="Aumentar cantidad">+</button>
                </div><span class="drawer-item-total">${money(item.precio * item.quantity)}</span></div>
            </div>
        </article>`).join('');
    if ($('drawer-empty-state')) $('drawer-empty-state').hidden = cart.length > 0;
    if ($('drawer-footer')) $('drawer-footer').hidden = cart.length === 0;
    setText('drawer-subtotal', money(totals.subtotal));
    setText('drawer-total', money(totals.total));
    if ($('page-cart-items')) $('page-cart-items').innerHTML = cart.map(item => `
        <article class="page-cart-row">${imageMarkup(item, 'page-cart-img')}
            <div><h3>${escapeHtml(item.nombre)}</h3><p>${money(item.precio)} c/u</p>
                <div class="quantity-selector small"><button type="button" class="qty-btn" data-action="decrease" data-id="${item.id}">−</button>
                <span class="qty-display">${item.quantity}</span><button type="button" class="qty-btn" data-action="increase" data-id="${item.id}">+</button></div>
            </div><strong>${money(item.precio * item.quantity)}</strong>
            <button type="button" class="drawer-item-remove" data-action="remove" data-id="${item.id}" aria-label="Eliminar ${escapeHtml(item.nombre)}">&times;</button>
        </article>`).join('');
    if ($('cart-page-empty')) $('cart-page-empty').style.display = cart.length ? 'none' : 'block';
    if ($('cart-page-layout')) $('cart-page-layout').style.display = cart.length ? '' : 'none';
    setText('page-count', `Subtotal (${totals.count} artículos)`);
    setText('page-subtotal', money(totals.subtotal));
    setText('page-tax', money(totals.subtotal * 0.12 / 1.12));
    setText('page-total', money(totals.total));
    renderCheckout();
}
function productCard(product, featured = false) {
    return `<article class="card"><figure class="card-media">${imageMarkup(product, 'card-img')}
        <span class="category-tag">${escapeHtml(product.categoria || 'Del menú')}</span></figure>
        <div class="card-body"><div class="card-heading"><h3 class="card-title">${escapeHtml(product.nombre)}</h3>
        <span class="card-price">${money(product.precio)}</span></div>
        <p class="card-desc">${escapeHtml(product.descripcion || 'Preparado especialmente para ti.')}</p>
        ${featured ? '<a href="menu.html" class="btn btn-outline btn-menu-link">VER EN EL MENÚ →</a>' :
        `<button type="button" class="btn btn-add-cart" data-action="add" data-id="${product.id}">🛒 AGREGAR AL CARRITO</button>`}
        </div></article>`;
}
function categoryOf(product) {
    const value = (product.categoria || '').toLowerCase();
    if (value.includes('tradicional')) return 'tradicional';
    if (value.includes('entrada')) return 'entradas';
    if (value.includes('fuerte') || value.includes('principal')) return 'fuertes';
    if (value.includes('postre')) return 'postres';
    if (value.includes('bebida')) return 'bebidas';
    return 'otros';
}
function renderProducts() {
    if ($('menu-cards-grid')) {
        const filtered = activeFilter === 'all' ? products : products.filter(product => categoryOf(product) === activeFilter);
        $('menu-cards-grid').innerHTML = filtered.length ? filtered.map(product => productCard(product)).join('') :
            '<p class="section-desc">No hay productos en esta categoría.</p>';
    }
    if ($('featured-products')) $('featured-products').innerHTML = [...products.filter(product => product.imagen_url), ...products.filter(product => !product.imagen_url)].slice(0, 3).map(product => productCard(product, true)).join('') ||
        '<p class="section-desc">Pronto tendremos platillos disponibles.</p>';
    if ($('home-categories')) {
        const groups = ['entradas', 'fuertes', 'postres', 'bebidas'];
        $('home-categories').innerHTML = groups.map(group => {
            const selected = products.filter(product => categoryOf(product) === group).slice(0, 2);
            if (!selected.length) return '';
            const title = { entradas: 'Entradas', fuertes: 'Platos Fuertes', postres: 'Postres', bebidas: 'Bebidas' }[group];
            return `<div class="menu-category"><div class="category-banner bg-${group === 'fuertes' ? 'principales' : group}"><h3 class="category-title">${title}</h3></div>
                <ul class="menu-list">${selected.map(product => `<li class="menu-item"><div class="item-heading">
                    <h4 class="item-name">${escapeHtml(product.nombre)}</h4><span class="item-price">${money(product.precio)}</span></div>
                    <p class="item-desc">${escapeHtml(product.descripcion || '')}</p></li>`).join('')}</ul></div>`;
        }).join('') || '<p class="section-desc">Explora todos los productos en nuestro menú.</p>';
    }
}
async function loadProducts() {
    if ($('confirmation-details')) return;
    try {
        const response = await requestApi('/productos');
        if (!response.ok) throw new Error();
        products = await response.json();
        const previousCount = cart.length;
        cart = cart.flatMap(item => {
            const current = products.find(product => product.id === item.id);
            return current ? [{ ...item, nombre: current.nombre, precio: Number(current.precio), imagen_url: current.imagen_url }] : [];
        });
        if (cart.length !== previousCount) showMessage('Se retiraron del carrito productos que ya no están disponibles.');
        saveCart();
        renderPayment();
        renderProducts();
    } catch {
        showMessage('No se pudo cargar el menú. Comprueba que el servidor y la base de datos estén activos.');
        if ($('btn-confirm-order')) $('btn-confirm-order').disabled = true;
    }
}
function deliveryFromForm() {
    const value = id => $(id)?.value.trim() || '';
    return {
        nombre: value('customer-name'), telefono: value('customer-phone'), correo: value('customer-email'),
        direccion: value('customer-address'), zona: value('shipping-zone-select'), ciudad: value('customer-city'),
        codigo_postal: value('customer-postal')
    };
}
function fullAddress(delivery) {
    return [delivery.direccion, delivery.zona, delivery.ciudad, delivery.codigo_postal].filter(Boolean).join(', ');
}
function renderCheckout() {
    if (!$('checkout-mini-cart')) return;
    $('checkout-mini-cart').innerHTML = cart.map(item => `<div class="mini-cart-item">${imageMarkup(item, 'mini-cart-img')}
        <div class="mini-cart-item-details"><div class="mini-cart-item-title">${escapeHtml(item.nombre)}</div>
        <div class="mini-cart-item-qty">Cantidad: ${item.quantity}</div></div>
        <span class="mini-cart-item-price">${money(item.precio * item.quantity)}</span></div>`).join('') ||
        '<p>Tu carrito está vacío. <a href="menu.html">Explorar menú</a></p>';
    const totals = getTotals();
    setText('checkout-subtotal', money(totals.subtotal));
    setText('checkout-total', money(totals.total));
}
function initCheckout() {
    const form = $('checkout-shipping-form');
    if (!form) return;
    const saved = readStorage(DELIVERY_KEY, {});
    for (const [id, value] of Object.entries({ 'customer-name': saved.nombre, 'customer-phone': saved.telefono,
        'customer-email': saved.correo, 'customer-address': saved.direccion, 'shipping-zone-select': saved.zona,
        'customer-city': saved.ciudad, 'customer-postal': saved.codigo_postal })) {
        if ($(id) && value) $(id).value = value;
    }
    form.addEventListener('submit', event => {
        event.preventDefault();
        if (!cart.length) return showMessage('Agrega al menos un platillo antes de continuar.');
        if (!form.reportValidity()) return;
        const delivery = deliveryFromForm();
        if (fullAddress(delivery).length > 255) return showMessage('La dirección completa no debe superar 255 caracteres.');
        localStorage.setItem(DELIVERY_KEY, JSON.stringify(delivery));
        location.href = 'pago.html';
    });
    renderCheckout();
}
function renderPayment() {
    if (!$('payment-total-amount')) return;
    const delivery = readStorage(DELIVERY_KEY, null);
    if (!cart.length || !delivery) {
        showMessage('Completa tu carrito y los datos de entrega antes de confirmar.');
        if ($('btn-confirm-order')) $('btn-confirm-order').disabled = true;
        return;
    }
    const totals = getTotals();
    setText('review-customer', delivery.nombre);
    setText('review-contact', `${delivery.telefono} · ${delivery.correo}`);
    setText('review-address', fullAddress(delivery));
    setText('payment-subtotal-amount', money(totals.subtotal));
    setText('payment-total-amount', money(totals.total));
    setText('btn-confirm-order', `CONFIRMAR PEDIDO (${money(totals.total)})`);
}
function initPayment() {
    if (!$('btn-confirm-order')) return;
    renderPayment();
    $('btn-confirm-order').addEventListener('click', async () => {
        if (!$('accept-terms')?.checked) return showMessage('Acepta los términos para continuar.');
        if (!cart.length) return showMessage('Tu carrito está vacío.');
        const delivery = readStorage(DELIVERY_KEY, null);
        if (!delivery) return showMessage('Completa los datos de entrega.');
        const button = $('btn-confirm-order');
        button.disabled = true;
        showMessage('Guardando tu pedido…');
        try {
            const response = await requestApi('/pedidos', { method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cliente: { nombre: delivery.nombre, correo: delivery.correo,
                    telefono: delivery.telefono, direccion: fullAddress(delivery) },
                    items: cart.map(item => ({ id: item.id, cantidad: item.quantity })) }) });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'No se pudo guardar el pedido.');
            sessionStorage.setItem(LAST_ORDER_KEY, JSON.stringify(result));
            cart = [];
            saveCart();
            location.href = 'confirmacion.html';
        } catch (error) {
            showMessage(error.message || 'No se pudo guardar el pedido.');
            button.disabled = false;
        }
    });
}
function initConfirmation() {
    if (!$('confirmation-details')) return;
    let order;
    try { order = JSON.parse(sessionStorage.getItem(LAST_ORDER_KEY)); } catch { /* sin pedido */ }
    if (!order?.pedido_id || !order?.cliente || !Array.isArray(order.items)) {
        $('confirmation-details').innerHTML = '<p class="form-message">No hay un pedido reciente para mostrar. <a href="menu.html">Ir al menú</a></p>';
        return;
    }
    setText('order-number', `#LBM-${order.pedido_id}`);
    setText('estimated-time', 'Pendiente de preparación');
    setText('order-customer-name', order.cliente.nombre);
    setText('order-customer-address', order.cliente.direccion);
    $('order-items-list').innerHTML = order.items.map(item => `<li class="confirmation-item"><span><strong>${item.cantidad}x</strong> ${escapeHtml(item.nombre)}</span>
        <span>${money(Number(item.precio_unitario) * item.cantidad)}</span></li>`).join('');
    setText('order-subtotal', money(order.total));
    setText('order-tax', money(Number(order.total) * 0.12 / 1.12));
    setText('order-total', money(order.total));
}
document.addEventListener('click', event => {
    const control = event.target.closest('[data-action]');
    if (control) {
        const { action, id } = control.dataset;
        if (action === 'add') addProduct(id);
        if (action === 'increase') updateQuantity(id, 1);
        if (action === 'decrease') updateQuantity(id, -1);
        if (action === 'remove') { cart = cart.filter(item => item.id !== Number(id)); saveCart(); }
    }
    const filter = event.target.closest('[data-filter]');
    if (filter) {
        activeFilter = filter.dataset.filter;
        document.querySelectorAll('[data-filter]').forEach(button => button.classList.toggle('active', button === filter));
        renderProducts();
    }
    if (event.target.closest('#open-cart-btn')) openDrawer();
    if (event.target.closest('#close-cart-drawer, #cart-drawer-overlay')) closeDrawer();
    if (event.target.closest('.link-empty-cart')) { event.preventDefault(); cart = []; saveCart(); }
});
document.addEventListener('DOMContentLoaded', () => {
    renderCart();
    initCheckout();
    initPayment();
    initConfirmation();
    loadProducts();
});

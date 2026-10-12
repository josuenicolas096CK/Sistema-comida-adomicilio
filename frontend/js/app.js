const API = location.port === '3002' ? '/api' : 'http://127.0.0.1:3002/api';
const CART_KEY = 'lbm_cart';
const DELIVERY_KEY = 'lbm_delivery';
const LAST_ORDER_KEY = 'lbm_last_order';
const ORDER_REFERENCE_KEY = 'lbm_order_reference';
const $ = id => document.getElementById(id);
const money = value => `Q${Number(value || 0).toFixed(2)}`;
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const safeImage = value => {
    if (!value) return '';
    try {
        const url = new URL(value, value.startsWith('/') ? new URL(API, location.href).origin : location.href);
        return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
    } catch { return ''; }
};
const readStorage = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
};
const readSessionStorage = (key, fallback) => {
    try { return JSON.parse(sessionStorage.getItem(key)) ?? fallback; } catch { return fallback; }
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
let homeActiveFilter = 'tradicional';
let checkoutConfig = null;
const totalLabel = value => value == null ? 'Calculando…' : money(value);

async function loadCheckoutConfig() {
    if ($('confirmation-details')) return;
    try {
        const response = await requestApi('/configuracion');
        if (!response.ok) throw new Error();
        const config = await response.json();
        if (!Number.isFinite(Number(config.costo_envio)) || Number(config.costo_envio) < 0) throw new Error();
        checkoutConfig = config;
        renderCart();
        renderPayment();
    } catch {
        showMessage('No se pudo calcular el envío. Comprueba que el servidor esté activo.');
        if ($('btn-confirm-order')) $('btn-confirm-order').disabled = true;
    }
}

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
    const envio = !cart.length ? 0 : checkoutConfig ? Number(checkoutConfig.costo_envio) : null;
    const total = envio == null ? null : Math.round((subtotal + envio) * 100) / 100;
    return { subtotal, envio, total, count: cart.reduce((sum, item) => sum + item.quantity, 0) };
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
    setText('drawer-shipping', totalLabel(totals.envio));
    setText('drawer-total', totalLabel(totals.total));
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
    setText('page-shipping', totalLabel(totals.envio));
    setText('page-total', totalLabel(totals.total));
    renderCheckout();
}
function productCard(product) {
    const image = imageMarkup(product, 'card-img');
    const canExpand = Boolean($('product-image-dialog')) && safeImage(product.imagen_url);
    const media = canExpand
        ? `<button type="button" class="product-image-trigger" data-action="zoom" data-id="${Number(product.id)}" aria-label="Ampliar imagen de ${escapeHtml(product.nombre)}">${image}<span class="product-image-hint" aria-hidden="true">Ampliar imagen</span></button>`
        : image;
    return `<article class="card"><figure class="card-media">${media}
        <span class="category-tag">${escapeHtml(product.categoria || 'Del menú')}</span></figure>
        <div class="card-body"><div class="card-heading"><h3 class="card-title">${escapeHtml(product.nombre)}</h3>
        <span class="card-price">${money(product.precio)}</span></div>
        <p class="card-desc">${escapeHtml(product.descripcion || 'Preparado especialmente para ti.')}</p>
        <button type="button" class="btn btn-add-cart" data-action="add" data-id="${product.id}">🛒 AGREGAR AL CARRITO</button>
        </div></article>`;
}
function openProductImage(id) {
    const dialog = $('product-image-dialog');
    const product = products.find(item => item.id === Number(id));
    const source = product && safeImage(product.imagen_url);
    if (!dialog || !source) return;
    $('product-image-large').src = source;
    $('product-image-large').alt = product.nombre;
    setText('product-image-title', product.nombre);
    dialog.showModal();
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
    if ($('featured-products')) $('featured-products').innerHTML = [...products.filter(product => product.imagen_url), ...products.filter(product => !product.imagen_url)].slice(0, 3).map(product => productCard(product)).join('') ||
        '<p class="section-desc">Pronto tendremos platillos disponibles.</p>';
    renderHomeCatalog();
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
function renderHomeCatalog() {
    if (!$('home-catalog-grid')) return;
    const selected = homeActiveFilter === 'all' ? products : products.filter(product => categoryOf(product) === homeActiveFilter);
    $('home-catalog-grid').innerHTML = selected.length ? selected.map(product => productCard(product)).join('') :
        '<p class="section-desc">No hay platillos en esta categoría.</p>';
}
async function loadProducts() {
    if ($('confirmation-details')) return;
    try {
        const response = await requestApi('/productos');
        if (!response.ok) throw new Error();
        products = await response.json();
        if (!Array.isArray(products)) throw new Error('La API no devolvió una lista de productos.');
        const previousCount = cart.length;
        cart = cart.flatMap(item => {
            const current = products.find(product => product.id === item.id);
            return current ? [{ ...item, nombre: current.nombre, precio: Number(current.precio), imagen_url: current.imagen_url }] : [];
        });
        if (cart.length !== previousCount) showMessage('Se retiraron del carrito productos que ya no están disponibles.');
        saveCart();
        renderPayment();
        renderProducts();
        if (!products.length) showMessage('La conexión funciona, pero la tabla productos está vacía. Carga el catálogo con database/seed.sql.');
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
    setText('checkout-tax', money(totals.subtotal * 0.12 / 1.12));
    setText('checkout-shipping', totalLabel(totals.envio));
    setText('checkout-total', totalLabel(totals.total));
}
function initCheckout() {
    const form = $('checkout-shipping-form');
    if (!form) return;
    // Solo se recupera un borrador si el cliente volvió expresamente a editarlo.
    localStorage.removeItem(DELIVERY_KEY);
    const editing = new URLSearchParams(location.search).has('editar');
    const saved = editing ? readSessionStorage(DELIVERY_KEY, {}) : {};
    if (!editing) {
        sessionStorage.removeItem(DELIVERY_KEY);
        sessionStorage.removeItem(LAST_ORDER_KEY);
    }
    window.addEventListener('pageshow', () => {
        if (!editing) form.reset();
    });
    for (const [id, value] of Object.entries({ 'customer-name': saved.nombre, 'customer-phone': saved.telefono,
        'customer-email': saved.correo, 'customer-address': saved.direccion, 'shipping-zone-select': saved.zona,
        'customer-city': saved.ciudad, 'customer-postal': saved.codigo_postal })) {
        if ($(id) && value) $(id).value = value;
    }
    form.addEventListener('submit', event => {
        event.preventDefault();
        if (!cart.length) return showMessage('Agrega al menos un platillo antes de continuar.');
        if (!checkoutConfig) return showMessage('Espera a que se calcule el costo de envío.');
        if (!form.reportValidity()) return;
        const delivery = deliveryFromForm();
        if (fullAddress(delivery).length > 255) return showMessage('La dirección completa no debe superar 255 caracteres.');
        sessionStorage.setItem(DELIVERY_KEY, JSON.stringify(delivery));
        location.href = 'pago.html';
    });
    renderCheckout();
}
function renderPayment() {
    if (!$('payment-total-amount')) return;
    const delivery = readSessionStorage(DELIVERY_KEY, null);
    if (!cart.length || !delivery) {
        showMessage('Completa tu carrito y los datos de entrega antes de confirmar.');
        if ($('btn-confirm-order')) $('btn-confirm-order').disabled = true;
        return;
    }
    const totals = getTotals();
    setText('review-customer', delivery.nombre);
    setText('review-contact', [delivery.telefono, delivery.correo].filter(Boolean).join(' · '));
    setText('review-address', fullAddress(delivery));
    setText('payment-subtotal-amount', money(totals.subtotal));
    setText('payment-tax-amount', money(totals.subtotal * 0.12 / 1.12));
    setText('payment-shipping-amount', totalLabel(totals.envio));
    setText('payment-total-amount', totalLabel(totals.total));
    setText('payment-estimate', checkoutConfig
        ? `Tiempo estimado: ${checkoutConfig.estimacion_min_minutos}–${checkoutConfig.estimacion_max_minutos} minutos`
        : 'Tiempo estimado: calculando…');
    setText('btn-confirm-order', `CONFIRMAR PEDIDO (${totalLabel(totals.total)})`);
    $('btn-confirm-order').disabled = !checkoutConfig;
}
function initPayment() {
    if (!$('btn-confirm-order')) return;
    renderPayment();
    document.querySelectorAll('input[name="metodo_pago"]').forEach(input => input.addEventListener('change', () => {
        document.querySelectorAll('.method-option').forEach(option => option.classList.toggle('selected', option.querySelector('input')?.checked));
    }));
    $('btn-confirm-order').addEventListener('click', async () => {
        if (!$('accept-terms')?.checked) return showMessage('Acepta los términos para continuar.');
        if (!cart.length) return showMessage('Tu carrito está vacío.');
        if (!checkoutConfig) return showMessage('No se pudo calcular el envío. Intenta de nuevo.');
        const delivery = readSessionStorage(DELIVERY_KEY, null);
        if (!delivery) return showMessage('Completa los datos de entrega.');
        const metodoPago = document.querySelector('input[name="metodo_pago"]:checked')?.value;
        if (!metodoPago) return showMessage('Selecciona un método de pago.');
        const button = $('btn-confirm-order');
        button.disabled = true;
        showMessage('Guardando tu pedido…');
        let savedOrderId = null;
        try {
            const response = await requestApi('/pedidos', { method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cliente: { nombre: delivery.nombre, correo: delivery.correo,
                    telefono: delivery.telefono },
                    entrega: { direccion: delivery.direccion, zona: delivery.zona,
                        ciudad: delivery.ciudad, codigo_postal: delivery.codigo_postal },
                    metodo_pago: metodoPago,
                    items: cart.map(item => ({ id: item.id, cantidad: item.quantity })) }) });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'No se pudo guardar el pedido.');
            savedOrderId = result.pedido_id;
            sessionStorage.setItem(LAST_ORDER_KEY, JSON.stringify(result));
            try {
                localStorage.setItem(ORDER_REFERENCE_KEY, JSON.stringify({ pedido_id: result.pedido_id, consulta_token: result.consulta_token }));
            } catch { /* El comprobante sigue disponible durante esta sesión. */ }
            sessionStorage.removeItem(DELIVERY_KEY);
            localStorage.removeItem(DELIVERY_KEY);
            cart = [];
            saveCart();
            location.href = 'confirmacion.html';
        } catch (error) {
            if (savedOrderId) {
                cart = [];
                try { saveCart(); } catch { /* El servidor ya guardó el pedido. */ }
                showMessage(`El pedido #${savedOrderId} se guardó, pero no se pudo abrir el comprobante. Anota este número y contacta al restaurante.`);
                return;
            }
            showMessage(error.message || 'No se pudo guardar el pedido.');
            button.disabled = false;
        }
    });
}
function renderConfirmation(order) {
    setText('order-number', `#LBM-${order.pedido_id}`);
    const statusNames = { pendiente: 'Pendiente de preparación', en_preparacion: 'En preparación', entregado: 'Entregado' };
    setText('estimated-time', statusNames[order.estado] || 'Estado no disponible');
    setText('order-estimate', order.estimacion_min_minutos && order.estimacion_max_minutos
        ? `Tiempo estimado de entrega: ${order.estimacion_min_minutos}–${order.estimacion_max_minutos} minutos desde la confirmación`
        : 'Tiempo estimado de entrega no registrado.');
    setText('order-customer-name', order.cliente.nombre);
    setText('order-customer-address', order.cliente.direccion);
    $('order-items-list').innerHTML = order.items.map(item => `<li class="confirmation-item"><span><strong>${item.cantidad}x</strong> ${escapeHtml(item.nombre)}</span>
        <span>${money(Number(item.precio_unitario) * item.cantidad)}</span></li>`).join('');
    const subtotal = Number(order.subtotal ?? order.total);
    setText('order-subtotal', money(subtotal));
    setText('order-tax', money(subtotal * 0.12 / 1.12));
    setText('order-shipping', money(order.costo_envio));
    setText('order-payment-method', { efectivo: 'Efectivo contra entrega', transferencia: 'Transferencia' }[order.metodo_pago] || 'No registrado');
    setText('order-total', money(order.total));
    const statusIndex = { pendiente: 0, en_preparacion: 1, entregado: 2 }[order.estado] ?? 0;
    document.querySelectorAll('.tracker-step').forEach((step, index) => {
        step.classList.toggle('completed', index < statusIndex);
        step.classList.toggle('active', index === statusIndex);
        if (index === statusIndex) step.setAttribute('aria-current', 'step');
        else step.removeAttribute('aria-current');
    });
    const progress = document.querySelector('.tracker-progress-bar');
    if (progress) progress.style.width = `${statusIndex * 33.3}%`;
}
async function initConfirmation() {
    if (!$('confirmation-details')) return;
    const order = readSessionStorage(LAST_ORDER_KEY, null);
    const reference = order?.consulta_token ? order : readStorage(ORDER_REFERENCE_KEY, null);
    if (!reference?.pedido_id || !/^[a-f0-9]{64}$/i.test(reference.consulta_token || '')) {
        $('confirmation-details').innerHTML = '<p class="form-message">No hay un pedido reciente guardado en este navegador. <a href="menu.html">Ir al menú</a></p>';
        return;
    }
    if (order?.cliente && Array.isArray(order.items)) renderConfirmation(order);
    try {
        const response = await requestApi(`/pedidos/${encodeURIComponent(reference.pedido_id)}`, {
            headers: { Authorization: `Bearer ${reference.consulta_token}` }
        });
        if (!response.ok) throw new Error();
        const current = await response.json();
        sessionStorage.setItem(LAST_ORDER_KEY, JSON.stringify(current));
        renderConfirmation(current);
    } catch {
        if (order?.cliente && Array.isArray(order.items)) {
            showMessage('El comprobante se muestra con los últimos datos guardados en este navegador; no se pudo actualizar desde el servidor.');
        } else {
            $('confirmation-details').innerHTML = '<p class="form-message">No se pudo consultar tu pedido. Comprueba que el servidor esté activo y vuelve a cargar esta página.</p>';
        }
    }
}
document.addEventListener('click', event => {
    const control = event.target.closest('[data-action]');
    if (control) {
        const { action, id } = control.dataset;
        if (action === 'zoom') openProductImage(id);
        if (action === 'close-image') $('product-image-dialog')?.close();
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
    const homeFilter = event.target.closest('[data-home-filter]');
    if (homeFilter) {
        homeActiveFilter = homeFilter.dataset.homeFilter;
        document.querySelectorAll('[data-home-filter]').forEach(button => {
            const active = button === homeFilter;
            button.classList.toggle('active', active);
            button.setAttribute('aria-pressed', String(active));
        });
        renderHomeCatalog();
    }
    if (event.target.closest('#open-cart-btn')) openDrawer();
    if (event.target.closest('#close-cart-drawer, #cart-drawer-overlay')) closeDrawer();
    if (event.target.closest('.link-empty-cart')) { event.preventDefault(); cart = []; saveCart(); }
});
document.addEventListener('click', event => {
    const dialog = $('product-image-dialog');
    if (event.target === dialog) dialog.close();
});
document.addEventListener('DOMContentLoaded', () => {
    renderCart();
    initCheckout();
    initPayment();
    initConfirmation();
    loadCheckoutConfig();
    loadProducts();
});

/**
 * ==============================================================================
 * SISTEMA DE COMIDA A DOMICILIO - "LA BUENA MESA"
 * ==============================================================================
 * Archivo: app.js
 * Descripción: Controlador principal interactivo para el frontend.
 * Contiene el catálogo de platillos, gestión del estado del carrito en localStorage,
 * control del carrito desplegable (drawer), filtrado por categorías, cálculo de
 * subtotales, envío e impuestos, y generación de pedidos.
 * ==============================================================================
 */

// ==============================================================================
// 1. CATÁLOGO DE PRODUCTOS DISPONIBLES
// ==============================================================================
const MENU_PRODUCTS = [
    {
        id: 1,
        name: "Jocón Tradicional",
        category: "tradicional",
        price: 68.00,
        description: "Pollo tierno en salsa verde tradicional de tomatillo, cilantro y pepitoria, servido con arroz recién hecho.",
        image: "../docs/img/jocon.jpeg",
        featured: true
    },
    {
        id: 2,
        name: "Chomin Casero",
        category: "tradicional",
        price: 59.50,
        description: "Fideos tradicionales salteados con verduras frescas de la huerta, pollo o carne en un recado ligero y aromático.",
        image: "../docs/img/chomin.jpeg",
        featured: true
    },
    {
        id: 3,
        name: "Chuchitos Típicos (Orden)",
        category: "tradicional",
        price: 13.00,
        description: "Pequeños tamales de masa de maíz envueltos en tuza, rellenos de recado de tomate y carne, con queso seco artesanal.",
        image: "../docs/img/chuchito.png",
        featured: true
    },
    {
        id: 4,
        name: "Salmorejo Cordobés",
        category: "entradas",
        price: 65.00,
        description: "Crema de tomate fresca emulsionada con aceite de oliva virgen extra, virutas de jamón curado y huevo duro picado.",
        image: "../docs/img/HomeRestaurante.png",
        featured: false
    },
    {
        id: 5,
        name: "Pimientos del Padrón",
        category: "entradas",
        price: 70.00,
        description: "Pequeños pimientos verdes fritos al punto y sazonados con sal gruesa marina del Pacífico.",
        image: "../docs/img/MenuRestaurante.png",
        featured: false
    },
    {
        id: 6,
        name: "Entrecot de Ternera a la Leña",
        category: "fuertes",
        price: 250.00,
        description: "400g de ternera madurada cocinada a las brasas, servido con papas panaderas al romero y pimientos asados.",
        image: "../docs/img/jocon.jpeg",
        featured: false
    },
    {
        id: 7,
        name: "Bacalao al Pil-Pil",
        category: "fuertes",
        price: 155.00,
        description: "Lomo de bacalao confitado a baja temperatura en su propia gelatina con ajo dorado y guindilla.",
        image: "../docs/img/chomin.jpeg",
        featured: false
    },
    {
        id: 8,
        name: "Torrija Caramelizada",
        category: "postres",
        price: 65.50,
        description: "Pan artesanal empapado en leche infusionada con canela y cítricos, caramelizado con azúcar y helado artesanal.",
        image: "../docs/img/ConfirmacionYPagoRestaurante.png",
        featured: false
    },
    {
        id: 9,
        name: "Crema Catalana Quemada",
        category: "postres",
        price: 50.00,
        description: "Clásica crema pastelera perfumada con cáscara de naranja y canela, con una crujiente capa de azúcar quemada.",
        image: "../docs/img/CarritoRestaurante.png",
        featured: false
    },
    {
        id: 10,
        name: "Sangría de Cava de la Casa (Jarra)",
        category: "bebidas",
        price: 80.00,
        description: "Refrescante sangría preparada con cava premium, fruta fresca de temporada y toques aromáticos cítricos.",
        image: "../docs/img/TomaDatosRestaurante.png",
        featured: false
    },
    {
        id: 11,
        name: "Cerveza Artesana 'Buena Mesa'",
        category: "bebidas",
        price: 35.00,
        description: "Cerveza rubia de malta ligera y refrescante elaborada localmente, perfecta para maridar con platos típicos.",
        image: "../docs/img/chuchito.png",
        featured: false
    }
];

// ==============================================================================
// 2. GESTIÓN DEL CARRITO (LOCALSTORAGE)
// ==============================================================================
const CartManager = {
    // Clave de almacenamiento en localStorage
    STORAGE_KEY: 'lbm_cart',

    // Obtener los productos actuales del carrito
    getCart() {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error("Error al cargar el carrito:", e);
            return [];
        }
    },

    // Guardar el estado del carrito
    saveCart(cart) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(cart));
        this.updateCartBadges();
        this.renderDrawerCart();
        window.dispatchEvent(new CustomEvent('cartUpdated', { detail: { cart } }));
    },

    // Agregar un producto al carrito
    addToCart(productId, quantity = 1, options = {}) {
        const product = MENU_PRODUCTS.find(p => p.id === productId);
        if (!product) return;

        const cart = this.getCart();
        const existingIndex = cart.findIndex(item => item.id === productId);

        if (existingIndex > -1) {
            cart[existingIndex].quantity += quantity;
        } else {
            cart.push({
                id: product.id,
                name: product.name,
                price: product.price,
                image: product.image,
                category: product.category,
                quantity: quantity,
                portion: options.portion || 'Estándar',
                notes: options.notes || ''
            });
        }

        this.saveCart(cart);
        this.openDrawer();
        this.showToast(`¡"${product.name}" agregado al carrito!`);
    },

    // Modificar cantidad (+ / -)
    updateQuantity(productId, delta) {
        let cart = this.getCart();
        const item = cart.find(i => i.id === productId);
        if (!item) return;

        item.quantity += delta;
        if (item.quantity <= 0) {
            cart = cart.filter(i => i.id !== productId);
        }

        this.saveCart(cart);
    },

    // Eliminar un producto
    removeItem(productId) {
        let cart = this.getCart();
        cart = cart.filter(i => i.id !== productId);
        this.saveCart(cart);
        this.showToast("Producto eliminado del carrito");
    },

    // Vaciar completamente el carrito
    clearCart() {
        this.saveCart([]);
        this.showToast("El carrito ha sido vaciado");
    },

    // Obtener cálculos financieros (subtotal, envío gratis si > Q300, impuestos IVA 12%)
    getCalculations(customShipping = null) {
        const cart = this.getCart();
        const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
        const count = cart.reduce((acc, item) => acc + item.quantity, 0);

        // Regla de envío: Gratis si subtotal >= 300 o carrito vacío; de lo contrario Q25 (o personalizado por zona)
        let shipping = 0;
        if (subtotal > 0) {
            if (subtotal >= 300) {
                shipping = 0;
            } else if (customShipping !== null) {
                shipping = customShipping;
            } else {
                shipping = 25.00;
            }
        }

        // El IVA en Guatemala es 12% (desglose informativo)
        const iva = subtotal * 0.12;
        const total = subtotal + shipping;

        return {
            subtotal,
            shipping,
            isFreeShipping: subtotal >= 300 && subtotal > 0,
            iva,
            total,
            count
        };
    },

    // Actualizar los contadores visuales del carrito en la cabecera
    updateCartBadges() {
        const cart = this.getCart();
        const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);
        document.querySelectorAll('.cart-badge').forEach(badge => {
            badge.textContent = totalItems;
            badge.style.display = totalItems > 0 ? 'flex' : 'none';
        });
    },

    // Abrir el drawer desplegable
    openDrawer() {
        const drawer = document.getElementById('cart-drawer');
        const overlay = document.getElementById('cart-drawer-overlay');
        if (drawer && overlay) {
            drawer.classList.add('open');
            overlay.classList.add('open');
            drawer.setAttribute('aria-hidden', 'false');
            document.body.style.overflow = 'hidden'; // Evitar scroll de fondo
        }
    },

    // Cerrar el drawer desplegable
    closeDrawer() {
        const drawer = document.getElementById('cart-drawer');
        const overlay = document.getElementById('cart-drawer-overlay');
        if (drawer && overlay) {
            drawer.classList.remove('open');
            overlay.classList.remove('open');
            drawer.setAttribute('aria-hidden', 'true');
            document.body.style.overflow = '';
        }
    },

    // Renderizar el contenido dentro del drawer desplegable
    renderDrawerCart() {
        const itemsContainer = document.getElementById('drawer-items-list');
        const subtotalEl = document.getElementById('drawer-subtotal');
        const totalEl = document.getElementById('drawer-total');
        const shippingEl = document.getElementById('drawer-shipping');
        const emptyStateEl = document.getElementById('drawer-empty-state');
        const footerEl = document.getElementById('drawer-footer');

        if (!itemsContainer) return;

        const cart = this.getCart();
        const calc = this.getCalculations();

        if (cart.length === 0) {
            itemsContainer.innerHTML = '';
            if (emptyStateEl) emptyStateEl.style.display = 'block';
            if (footerEl) footerEl.style.display = 'none';
            return;
        }

        if (emptyStateEl) emptyStateEl.style.display = 'none';
        if (footerEl) footerEl.style.display = 'block';

        itemsContainer.innerHTML = cart.map(item => `
            <article class="drawer-item" data-id="${item.id}">
                <img src="${item.image}" alt="${item.name}" class="drawer-item-img">
                <div class="drawer-item-info">
                    <div class="drawer-item-top">
                        <h4 class="drawer-item-title">${item.name}</h4>
                        <button class="drawer-item-remove" onclick="CartManager.removeItem(${item.id})" title="Eliminar">&times;</button>
                    </div>
                    <span class="drawer-item-unit">Q${item.price.toFixed(2)} c/u</span>
                    <div class="drawer-item-controls">
                        <div class="quantity-selector small">
                            <button type="button" class="qty-btn" onclick="CartManager.updateQuantity(${item.id}, -1)">-</button>
                            <span class="qty-display">${item.quantity}</span>
                            <button type="button" class="qty-btn" onclick="CartManager.updateQuantity(${item.id}, 1)">+</button>
                        </div>
                        <span class="drawer-item-total">Q${(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                </div>
            </article>
        `).join('');

        if (subtotalEl) subtotalEl.textContent = `Q${calc.subtotal.toFixed(2)}`;
        if (shippingEl) {
            shippingEl.textContent = calc.isFreeShipping ? '¡GRATIS!' : `Q${calc.shipping.toFixed(2)}`;
            shippingEl.style.color = calc.isFreeShipping ? '#10b618' : 'inherit';
        }
        if (totalEl) totalEl.textContent = `Q${calc.total.toFixed(2)}`;
    },

    // Notificación toast flotante
    showToast(message) {
        let toast = document.getElementById('lbm-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'lbm-toast';
            toast.className = 'lbm-toast';
            document.body.appendChild(toast);
        }
        toast.textContent = message;
        toast.classList.add('visible');
        clearTimeout(this._toastTimer);
        this._toastTimer = setTimeout(() => {
            toast.classList.remove('visible');
        }, 2800);
    }
};

// ==============================================================================
// 3. INICIALIZACIÓN Y EVENTOS GLOBALES
// ==============================================================================
document.addEventListener('DOMContentLoaded', () => {
    // 1. Inicializar contadores del carrito
    CartManager.updateCartBadges();
    CartManager.renderDrawerCart();

    // 2. Escuchadores para abrir/cerrar Drawer
    document.querySelectorAll('.cart-btn, .open-cart-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Si tiene clase que evita abrir drawer o si se desea ir directo a carrito.html con Ctrl/Cmd
            if (!btn.classList.contains('no-drawer')) {
                e.preventDefault();
                CartManager.openDrawer();
            }
        });
    });

    const closeDrawerBtn = document.getElementById('close-cart-drawer');
    const overlay = document.getElementById('cart-drawer-overlay');
    if (closeDrawerBtn) closeDrawerBtn.addEventListener('click', () => CartManager.closeDrawer());
    if (overlay) overlay.addEventListener('click', () => CartManager.closeDrawer());

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') CartManager.closeDrawer();
    });

    // 3. Inicializar vistas específicas según la página activa
    initMenuPage();
    initCartPage();
    initCheckoutPage();
    initPaymentPage();
    initConfirmationPage();
});

// ==============================================================================
// 4. PÁGINA DEL MENÚ (menu.html) - FILTROS Y BOTONES DE AGREGAR
// ==============================================================================
function initMenuPage() {
    const grid = document.getElementById('menu-cards-grid');
    const filterButtons = document.querySelectorAll('.filter-btn');

    if (!grid) return;

    // Función para renderizar los platillos
    function renderDishes(category = 'all') {
        const filtered = category === 'all' 
            ? MENU_PRODUCTS 
            : MENU_PRODUCTS.filter(p => p.category === category);

        grid.innerHTML = filtered.map(dish => `
            <article class="card" data-category="${dish.category}">
                <figure class="card-media">
                    <img src="${dish.image}" alt="${dish.name}" class="card-img" loading="lazy">
                    <span class="category-tag">${formatCategoryName(dish.category)}</span>
                </figure>
                <div class="card-body">
                    <div class="card-heading">
                        <h4 class="card-title">${dish.name}</h4>
                        <span class="card-price">Q${dish.price.toFixed(2)}</span>
                    </div>
                    <p class="card-desc">${dish.description}</p>
                    <button type="button" class="btn btn-add-cart" onclick="CartManager.addToCart(${dish.id})">
                        &#128722; AGREGAR AL CARRITO
                    </button>
                </div>
            </article>
        `).join('');
    }

    function formatCategoryName(cat) {
        const map = {
            tradicional: 'Tradicional',
            entradas: 'Entrada',
            fuertes: 'Plato Fuerte',
            postres: 'Postre',
            bebidas: 'Bebida'
        };
        return map[cat] || cat;
    }

    // Eventos de botones de filtrado
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const category = btn.getAttribute('data-filter') || 'all';
            renderDishes(category);
        });
    });

    // Render inicial
    renderDishes('all');
}

// ==============================================================================
// 5. VISTA INDEPENDIENTE DEL CARRITO (carrito.html)
// ==============================================================================
function initCartPage() {
    const cartListContainer = document.getElementById('page-cart-items');
    if (!cartListContainer) return;

    function renderFullCart() {
        const cart = CartManager.getCart();
        const calc = CartManager.getCalculations();

        const emptyMessage = document.getElementById('cart-page-empty');
        const layout = document.getElementById('cart-page-layout');
        const emptyLink = document.querySelector('.link-empty-cart');

        if (cart.length === 0) {
            if (emptyMessage) emptyMessage.style.display = 'block';
            if (layout) layout.style.display = 'none';
            if (emptyLink) emptyLink.style.display = 'none';
            return;
        }

        if (emptyMessage) emptyMessage.style.display = 'none';
        if (layout) layout.style.display = 'grid';
        if (emptyLink) {
            emptyLink.style.display = 'inline-block';
            emptyLink.onclick = (e) => {
                e.preventDefault();
                if (confirm('¿Estás seguro de que deseas vaciar tu carrito?')) {
                    CartManager.clearCart();
                    renderFullCart();
                }
            };
        }

        cartListContainer.innerHTML = cart.map(item => `
            <article class="cart-item" data-id="${item.id}">
                <figure class="cart-item-figure">
                    <img src="${item.image}" alt="${item.name}" class="cart-item-img">
                </figure>
                <div class="cart-item-details">
                    <header class="cart-item-header">
                        <h4 class="cart-item-title">${item.name}</h4>
                        <div class="quantity-selector">
                            <button type="button" class="qty-btn" onclick="CartManager.updateQuantity(${item.id}, -1)">-</button>
                            <input type="text" value="${item.quantity}" class="qty-input" readonly>
                            <button type="button" class="qty-btn" onclick="CartManager.updateQuantity(${item.id}, 1)">+</button>
                        </div>
                        <span class="cart-item-price-total">Q${(item.price * item.quantity).toFixed(2)}</span>
                    </header>
                    <p class="cart-item-desc">${item.notes || 'Preparado fresco al momento con ingredientes tradicionales.'}</p>
                    <span class="cart-item-unit-price">Precio unitario: Q${item.price.toFixed(2)}</span>
                    
                    <footer class="cart-item-options">
                        <div class="option-group">
                            <label>Porción</label>
                            <select onchange="updateItemPortion(${item.id}, this.value)">
                                <option value="Individual" ${item.portion === 'Individual' ? 'selected' : ''}>Individual</option>
                                <option value="Doble" ${item.portion === 'Doble' ? 'selected' : ''}>Doble (+Q20)</option>
                                <option value="Familiar" ${item.portion === 'Familiar' ? 'selected' : ''}>Familiar (+Q45)</option>
                            </select>
                        </div>
                        <div class="option-group">
                            <label>Especificaciones</label>
                            <input type="text" placeholder="Ej. Sin cebolla, extra salsa..." value="${item.notes || ''}" onchange="updateItemNotes(${item.id}, this.value)">
                        </div>
                        <button type="button" class="btn-remove" onclick="CartManager.removeItem(${item.id})" title="Eliminar platillo">
                            &#128465;
                        </button>
                    </footer>
                </div>
            </article>
        `).join('');

        // Actualizar sidebar de resumen
        const subtotalEl = document.getElementById('page-subtotal');
        const countEl = document.getElementById('page-count');
        const shippingEl = document.getElementById('page-shipping');
        const taxEl = document.getElementById('page-tax');
        const totalEl = document.getElementById('page-total');
        const promoBanner = document.getElementById('promo-shipping-banner');

        if (subtotalEl) subtotalEl.textContent = `Q${calc.subtotal.toFixed(2)}`;
        if (countEl) countEl.textContent = `${calc.count} artículos`;
        if (shippingEl) {
            shippingEl.textContent = calc.isFreeShipping ? '¡GRATIS!' : `Q${calc.shipping.toFixed(2)}`;
            shippingEl.className = calc.isFreeShipping ? 'text-success' : '';
        }
        if (taxEl) taxEl.textContent = `Q${calc.iva.toFixed(2)}`;
        if (totalEl) totalEl.textContent = `Q${calc.total.toFixed(2)}`;

        if (promoBanner) {
            if (calc.isFreeShipping) {
                promoBanner.innerHTML = '&#10004; <strong>¡Felicidades!</strong> Tu pedido califica para <strong>Envío GRATIS</strong>.';
                promoBanner.style.backgroundColor = '#e8f7ee';
                promoBanner.style.color = '#155724';
            } else {
                const missing = 300 - calc.subtotal;
                promoBanner.innerHTML = `&#128666; Agrega <strong>Q${missing.toFixed(2)}</strong> más para obtener <strong>Envío GRATIS</strong>.`;
                promoBanner.style.backgroundColor = '#fdf2f2';
                promoBanner.style.color = 'var(--clr-secondary)';
            }
        }
    }

    window.updateItemPortion = function(id, portion) {
        const cart = CartManager.getCart();
        const item = cart.find(i => i.id === id);
        if (item) {
            item.portion = portion;
            CartManager.saveCart(cart);
        }
    };

    window.updateItemNotes = function(id, notes) {
        const cart = CartManager.getCart();
        const item = cart.find(i => i.id === id);
        if (item) {
            item.notes = notes;
            CartManager.saveCart(cart);
        }
    };

    window.addEventListener('cartUpdated', renderFullCart);
    renderFullCart();
}

// ==============================================================================
// 6. PÁGINA DE CHECKOUT (checkout.html)
// ==============================================================================
function initCheckoutPage() {
    const form = document.getElementById('checkout-shipping-form');
    if (!form) return;

    const miniCartContainer = document.getElementById('checkout-mini-cart');
    const subtotalEl = document.getElementById('checkout-subtotal');
    const shippingEl = document.getElementById('checkout-shipping');
    const totalEl = document.getElementById('checkout-total');
    const zoneSelect = document.getElementById('shipping-zone-select');

    // Tarifas de envío por zona
    const ZONE_RATES = {
        'Zona 14': 0.00, // Promo especial
        'Zona 15': 15.00,
        'Zona 10': 15.00,
        'Zona 1': 20.00,
        'Zona 2': 25.00,
        'Zona 3': 30.00,
        'Otras Zonas': 35.00
    };

    function updateCheckoutSummary() {
        const cart = CartManager.getCart();
        if (cart.length === 0) {
            window.location.href = 'carrito.html';
            return;
        }

        const selectedZone = zoneSelect ? zoneSelect.value : 'Zona 14';
        const zoneShippingRate = ZONE_RATES[selectedZone] || 25.00;
        const calc = CartManager.getCalculations(zoneShippingRate);

        if (miniCartContainer) {
            miniCartContainer.innerHTML = cart.map(item => `
                <div class="mini-cart-item">
                    <img src="${item.image}" alt="${item.name}">
                    <div class="mini-cart-item-details">
                        <div class="mini-cart-item-title">${item.name}</div>
                        <div class="mini-cart-item-qty">Cantidad: ${item.quantity} | ${item.portion || 'Estándar'}</div>
                    </div>
                    <div class="mini-cart-item-price">Q${(item.price * item.quantity).toFixed(2)}</div>
                </div>
            `).join('');
        }

        if (subtotalEl) subtotalEl.textContent = `Q${calc.subtotal.toFixed(2)}`;
        if (shippingEl) {
            shippingEl.textContent = calc.shipping === 0 ? '¡GRATIS!' : `Q${calc.shipping.toFixed(2)}`;
            shippingEl.className = calc.shipping === 0 ? 'text-success' : '';
        }
        if (totalEl) totalEl.textContent = `Q${calc.total.toFixed(2)}`;
    }

    if (zoneSelect) {
        zoneSelect.addEventListener('change', updateCheckoutSummary);
    }

    // Manejar envío del formulario
    form.addEventListener('submit', (e) => {
        e.preventDefault();

        // Validar formulario semántico HTML5
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const deliveryMethod = form.querySelector('input[name="delivery_method"]:checked')?.value || 'delivery';
        const formData = {
            fullName: document.getElementById('customer-name')?.value || '',
            phone: document.getElementById('customer-phone')?.value || '',
            email: document.getElementById('customer-email')?.value || '',
            address: document.getElementById('customer-address')?.value || '',
            zone: zoneSelect ? zoneSelect.value : 'Zona 14',
            city: document.getElementById('customer-city')?.value || 'Guatemala',
            postalCode: document.getElementById('customer-postal')?.value || '01014',
            deliveryDate: document.getElementById('customer-date')?.value || 'Hoy',
            deliveryTime: document.getElementById('customer-time')?.value || 'Lo antes posible (35-50 min)',
            notes: document.getElementById('customer-notes')?.value || '',
            deliveryMethod: deliveryMethod
        };

        localStorage.setItem('lbm_shipping_info', JSON.stringify(formData));
        window.location.href = 'pago.html';
    });

    updateCheckoutSummary();
}

// ==============================================================================
// 7. PÁGINA DE PAGO (pago.html)
// ==============================================================================
function initPaymentPage() {
    const confirmBtn = document.getElementById('btn-confirm-order');
    if (!confirmBtn) return;

    const cart = CartManager.getCart();
    if (cart.length === 0) {
        window.location.href = 'carrito.html';
        return;
    }

    // Cargar datos de envío
    const shippingInfo = JSON.parse(localStorage.getItem('lbm_shipping_info') || '{}');
    const addressPreview = document.getElementById('preview-address');
    const timePreview = document.getElementById('preview-time');

    if (addressPreview && shippingInfo.address) {
        addressPreview.textContent = `${shippingInfo.address}, ${shippingInfo.zone || 'Guatemala'}.`;
    }
    if (timePreview && shippingInfo.deliveryTime) {
        timePreview.textContent = `Estimado: ${shippingInfo.deliveryDate || 'Hoy'} - ${shippingInfo.deliveryTime}`;
    }

    // Manejo de propinas
    let selectedTip = 30.00;
    const tipButtons = document.querySelectorAll('.tip-btn');
    const tipDisplay = document.getElementById('payment-tip-amount');
    const totalDisplay = document.getElementById('payment-total-amount');

    function updatePaymentTotals() {
        const calc = CartManager.getCalculations();
        const grandTotal = calc.total + selectedTip;

        if (tipDisplay) tipDisplay.textContent = `Q${selectedTip.toFixed(2)}`;
        if (totalDisplay) totalDisplay.textContent = `Q${grandTotal.toFixed(2)}`;
        confirmBtn.textContent = `CONFIRMAR PEDIDO (Q${grandTotal.toFixed(2)})`;
    }

    tipButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            tipButtons.forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            const val = btn.getAttribute('data-tip');
            if (val === 'custom') {
                const custom = prompt('Ingresa el monto de propina en Quetzales (Q):', '20');
                selectedTip = parseFloat(custom) || 0;
            } else {
                selectedTip = parseFloat(val) || 0;
            }
            updatePaymentTotals();
        });
    });

    // Manejar confirmación de pedido
    confirmBtn.addEventListener('click', () => {
        const terms = document.getElementById('accept-terms');
        if (terms && !terms.checked) {
            alert('Por favor, acepta los términos y condiciones antes de confirmar el pedido.');
            return;
        }

        const paymentMethodEl = document.querySelector('input[name="payment"]:checked');
        const paymentMethod = paymentMethodEl ? paymentMethodEl.value : 'tarjeta';

        const calc = CartManager.getCalculations();
        const orderId = `LBM-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;

        const orderData = {
            orderId: orderId,
            createdAt: new Date().toISOString(),
            estimatedDeliveryMinutes: '35 - 50 minutos',
            items: cart,
            shippingInfo: shippingInfo,
            paymentMethod: paymentMethod,
            subtotal: calc.subtotal,
            shipping: calc.shipping,
            iva: calc.iva,
            tip: selectedTip,
            total: calc.total + selectedTip
        };

        // Guardar la orden para la pantalla de confirmación
        localStorage.setItem('lbm_last_order', JSON.stringify(orderData));

        // Vaciar el carrito
        CartManager.clearCart();

        // Redirigir a confirmación
        window.location.href = 'confirmacion.html';
    });

    updatePaymentTotals();
}

// ==============================================================================
// 8. PÁGINA DE CONFIRMACIÓN (confirmacion.html)
// ==============================================================================
function initConfirmationPage() {
    const orderContainer = document.getElementById('confirmation-details');
    if (!orderContainer) return;

    const orderRaw = localStorage.getItem('lbm_last_order');
    if (!orderRaw) {
        orderContainer.innerHTML = `
            <div style="text-align: center; padding: 50px 20px;">
                <h3 style="font-family: var(--font-heading); color: var(--clr-secondary); font-size: 1.8rem; margin-bottom: 15px;">No hay pedidos recientes</h3>
                <p style="color: var(--clr-text-light); margin-bottom: 25px;">Explora nuestro menú para realizar tu primera orden.</p>
                <a href="menu.html" class="btn btn-primary">VER EL MENÚ</a>
            </div>
        `;
        return;
    }

    const order = JSON.parse(orderRaw);

    // Llenar datos de la orden
    const orderNumberEl = document.getElementById('order-number');
    const estimatedTimeEl = document.getElementById('estimated-time');
    const customerNameEl = document.getElementById('order-customer-name');
    const customerAddressEl = document.getElementById('order-customer-address');
    const paymentMethodEl = document.getElementById('order-payment-method');
    const itemsListEl = document.getElementById('order-items-list');

    const subtotalEl = document.getElementById('order-subtotal');
    const shippingEl = document.getElementById('order-shipping');
    const tipEl = document.getElementById('order-tip');
    const taxEl = document.getElementById('order-tax');
    const totalEl = document.getElementById('order-total');

    if (orderNumberEl) orderNumberEl.textContent = order.orderId;
    if (estimatedTimeEl) estimatedTimeEl.textContent = order.estimatedDeliveryMinutes || '35-50 min';
    if (customerNameEl) customerNameEl.textContent = order.shippingInfo.fullName || 'Estimado Cliente';
    if (customerAddressEl) {
        customerAddressEl.textContent = `${order.shippingInfo.address || 'Recoger en restaurante'}, ${order.shippingInfo.zone || ''}`;
    }
    if (paymentMethodEl) {
        const methodMap = {
            tarjeta: 'Tarjeta de Crédito / Débito (Pagado)',
            efectivo: 'Efectivo contra entrega',
            transferencia: 'Transferencia Bancaria'
        };
        paymentMethodEl.textContent = methodMap[order.paymentMethod] || order.paymentMethod;
    }

    if (itemsListEl && order.items) {
        itemsListEl.innerHTML = order.items.map(item => `
            <li class="confirmation-item">
                <div class="confirmation-item-info">
                    <strong>${item.quantity}x</strong> ${item.name} 
                    <span class="text-muted">(${item.portion || 'Estándar'})</span>
                </div>
                <div class="confirmation-item-price">Q${(item.price * item.quantity).toFixed(2)}</div>
            </li>
        `).join('');
    }

    if (subtotalEl) subtotalEl.textContent = `Q${order.subtotal.toFixed(2)}`;
    if (shippingEl) shippingEl.textContent = order.shipping === 0 ? '¡GRATIS!' : `Q${order.shipping.toFixed(2)}`;
    if (tipEl) tipEl.textContent = `Q${order.tip.toFixed(2)}`;
    if (taxEl) taxEl.textContent = `Q${order.iva.toFixed(2)}`;
    if (totalEl) totalEl.textContent = `Q${order.total.toFixed(2)}`;
}

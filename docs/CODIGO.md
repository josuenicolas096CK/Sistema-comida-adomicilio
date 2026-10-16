# Guía del código — La Buena Mesa

Este documento explica qué hace cada archivo del proyecto y cómo viajan los datos desde el menú hasta MySQL. La guía de instalación para ejecutar el proyecto está en `README.md`; aquí se describe la implementación.

## 1. Mapa general

```text
Navegador (frontend/*.html + frontend/js/*.js)
  ├─ GET /api/productos y /api/configuracion
  ├─ POST /api/pedidos
  └─ GET /api/pedidos/:id o /api/seguimiento/:codigo
                 │
                 ▼
        backend/server.js (Express)
                 │
                 ▼
        backend/routes/productos.js
                 │
                 ▼
        backend/config/db.js (mysql2)
                 │
                 ▼
            pedidos_db (MySQL)
```

Express entrega las páginas y la API desde el mismo servidor. Por eso el frontend usa rutas relativas `/api/...`: funciona con el puerto indicado por `backend/.env` sin cambiar el JavaScript.

## 2. Archivos de la raíz

| Archivo | Función |
| --- | --- |
| `README.md` | Requisitos, instalación, importación de la base, arranque, prueba y rutas disponibles. Es el punto de entrada para quien evalúa el proyecto. |
| `schema.sql` | Crea `pedidos_db`, las seis tablas, sus claves foráneas y los 30 productos iniciales. Se importa una sola vez en una base nueva. |
| `package.json` | Permite ejecutar `npm install`, `npm start` y `npm test` desde la raíz. `postinstall` prepara `backend/.env` y ejecuta `npm ci` dentro de `backend`. |
| `package-lock.json` | Fija los metadatos de instalación del paquete raíz. Es generado por npm; no se edita a mano. |
| `.gitignore` | Excluye `node_modules/`, `.env` y archivos temporales para que no se publiquen dependencias ni credenciales. |

### Tablas creadas por `schema.sql`

| Tabla | Datos principales | Relación |
| --- | --- | --- |
| `usuarios` | Nombre, correo, teléfono y dirección actual del cliente. | `pedidos.usuario_id` apunta a `usuarios.id`. |
| `productos` | Platillo, descripción, precio, categoría y ruta de imagen. | `detalles_pedido.producto_id` apunta a `productos.id`. |
| `pedidos` | Fecha, subtotal, envío, total, estado, pago, código de rastreo y token privado. | Encabeza cada orden. |
| `pedido_entrega` | Nombre, contacto y dirección tal como se usaron en esa orden. | Una fila por pedido; conserva la entrega aunque cambien los datos del usuario. |
| `detalles_pedido` | Producto, cantidad y precio unitario al comprar. | Varias filas por pedido. |
| `resumen_pedidos` | Nombre, dirección, total y número de artículos para consulta rápida. | Una fila por pedido. |

Las imágenes no se guardan como bytes en MySQL. `productos.imagen_url` contiene rutas como `/img/hamburguesa.png`, que Express sirve desde `frontend/img/`. Los precios del pedido se calculan en el servidor con los valores actuales de `productos`, no con los valores enviados por el navegador.

## 3. Backend

| Archivo | Función |
| --- | --- |
| `backend/package.json` | Declara Express, `mysql2`, `dotenv` y CORS; expone el arranque y la prueba integral del backend. |
| `backend/package-lock.json` | Fija versiones exactas de dependencias del backend para `npm ci`. No se edita a mano. |
| `backend/.env.example` | Plantilla pública con `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` y `PORT`. Tiene los valores comunes de XAMPP. |
| `backend/setup.js` | Copia `.env.example` a `backend/.env` únicamente cuando falta. No sobrescribe credenciales ya configuradas. |
| `backend/config/db.js` | Carga `backend/.env` y crea el pool de conexiones de `mysql2/promise`. Todas las rutas comparten ese pool. |
| `backend/config/checkout.js` | Define Q15 de envío, 45–60 minutos estimados y los métodos de pago aceptados. |
| `backend/server.js` | Configura Express, monta `/api`, publica `frontend/` y `docs/img/`, comprueba MySQL y abre el puerto HTTP. Si la base o el puerto fallan, termina con un mensaje claro. |
| `backend/routes/productos.js` | Define los endpoints del catálogo, pedidos y seguimiento. Valida entradas y ejecuta consultas parametrizadas. |
| `backend/smoke-test.js` | Prueba la API real en el puerto 3102. Crea tres pedidos de prueba y los elimina al terminar. Se ejecuta desde la raíz con `npm test`. |

### Endpoints de `backend/routes/productos.js`

| Método y ruta | Qué hace |
| --- | --- |
| `GET /api/configuracion` | Entrega costos, tiempo estimado y métodos de pago al frontend. |
| `GET /api/productos` | Devuelve el catálogo de MySQL. |
| `GET /api/productos/:id` | Devuelve un platillo o 404 si no existe. |
| `POST /api/pedidos` | Valida el formulario y el carrito; guarda usuario, pedido, entrega, detalles y resumen dentro de una transacción. |
| `GET /api/pedidos/:id` | Devuelve el comprobante completo solo con el token privado `Authorization: Bearer <consulta_token>`. |
| `GET /api/seguimiento/:codigo` | Devuelve únicamente código y estado. Acepta `LBM-123`, `lbm123` o `123`. |

En `POST /api/pedidos`, la transacción confirma todas las inserciones juntas o deshace todo si alguna falla. El código público `LBM-<id>` sirve para seguimiento; el `consulta_token` aleatorio permite consultar el comprobante completo. Si el correo es opcional y queda vacío, el usuario recibe un correo interno único en `usuarios` para cumplir su columna `NOT NULL UNIQUE`; `pedido_entrega.correo` queda vacío y `resumen_pedidos.correo` queda `NULL`.

## 4. Páginas del frontend

Todas las páginas cargan `css/style.css` y `css/pages.css`. Casi todas cargan `js/app.js`; seguimiento carga `js/seguimiento.js`. Los elementos con `id` son puntos que JavaScript actualiza; por ejemplo, `menu-cards-grid`, `checkout-total` y `order-number`.

| Archivo | Función |
| --- | --- |
| `frontend/index.html` | Inicio con presentación, favoritos, categorías, catálogo filtrable, información del restaurante y carrito lateral. Los productos visibles se generan desde la API. |
| `frontend/menu.html` | Catálogo completo, filtros por categoría y ventana `<dialog>` para ampliar las imágenes de los platillos. |
| `frontend/carrito.html` | Lista de artículos, controles de cantidad y resumen de subtotal, impuestos incluidos, envío y total. |
| `frontend/checkout.html` | Formulario de nombre, teléfono, correo opcional y dirección de entrega; incluye zonas 1–12. Guarda un borrador solo para pasar a pago o volver a editar. |
| `frontend/pago.html` | Revisión del pedido, selección de efectivo o transferencia y botón que envía el `POST /api/pedidos`. |
| `frontend/confirmacion.html` | Comprobante, código de rastreo, productos, datos de entrega, pago y monto final; consulta el pedido con el token privado. |
| `frontend/seguimiento.html` | Formulario para introducir el código público y mostrar el estado de la orden sin exponer datos personales. |
| `frontend/css/style.css` | Variables de color y tipografía, componentes compartidos, portada, categorías, tarjetas, carrito lateral y reglas responsive generales. |
| `frontend/css/pages.css` | Estilos de páginas interiores: menú, carrito, checkout, pago, confirmación, seguimiento y diseño de impresión. |
| `frontend/js/app.js` | Lógica compartida para API, catálogo, filtros, carrito, checkout, pago y confirmación. |
| `frontend/js/seguimiento.js` | Normaliza el código introducido, consulta el endpoint público y actualiza el indicador visual de estado. |

### Estado y flujo en `frontend/js/app.js`

1. Al cargar una página, `loadProducts()` lee `/api/productos` y `loadCheckoutConfig()` lee `/api/configuracion`.
2. El usuario agrega productos. `cart` se guarda en `localStorage` con la clave `lbm_cart` para conservarlo al recargar.
3. En checkout, `initCheckout()` valida y guarda el borrador de entrega en `sessionStorage` (`lbm_delivery`). Al iniciar un checkout nuevo se eliminan los datos del cliente anterior.
4. En pago, `initPayment()` envía IDs y cantidades; el backend recupera los precios de la base y guarda el pedido.
5. Tras el éxito, el carrito se vacía, el pedido completo se guarda temporalmente en `sessionStorage` (`lbm_last_order`) y la referencia privada se guarda en `localStorage` (`lbm_order_reference`) para reabrir el comprobante en ese navegador.
6. En confirmación, `initConfirmation()` consulta `/api/pedidos/:id` con el token privado. Seguimiento usa solo el código público y muestra el estado.

Los textos de productos que se insertan en HTML pasan por `escapeHtml()`, y `safeImage()` acepta únicamente URL HTTP o HTTPS. Los eventos de botones de productos y carrito se manejan por delegación con `data-action`, ya que las tarjetas se crean después de cargar la API.

### Referencia de funciones de `frontend/js/app.js`

| Función o grupo | Responsabilidad |
| --- | --- |
| `money`, `totalLabel` | Formatean cantidades en quetzales y muestran «Calculando…» antes de conocer el envío. |
| `escapeHtml`, `safeImage`, `imageMarkup` | Protegen el HTML generado y producen la imagen o un marcador cuando falta. |
| `readStorage`, `readSessionStorage` | Recuperan JSON guardado y usan un valor seguro si está dañado. |
| `requestApi`, `loadCheckoutConfig`, `loadProducts` | Consultan la API, reciben la configuración y actualizan el catálogo local. |
| `setText`, `showMessage` | Actualizan texto y avisos visibles en la página. |
| `getTotals` | Calcula subtotal del carrito, envío y total provisional para mostrar. El servidor recalcula el total definitivo. |
| `saveCart`, `addProduct`, `updateQuantity` | Mantienen el carrito y su copia en `localStorage`. |
| `openDrawer`, `closeDrawer`, `renderCart` | Muestran el carrito lateral y la página de carrito con los mismos datos. |
| `productCard`, `openProductImage`, `categoryOf` | Construyen tarjetas, amplían imágenes y clasifican productos para filtros. |
| `renderProducts`, `renderHomeCatalog` | Pintan menú, categorías y productos filtrados en inicio. |
| `deliveryFromForm`, `fullAddress`, `renderCheckout`, `initCheckout` | Leen y validan el formulario de entrega y preparan el resumen de checkout. |
| `renderPayment`, `initPayment` | Muestran el total, validan la aceptación y envían la orden al backend. |
| `renderConfirmation`, `initConfirmation` | Presentan el comprobante y actualizan sus datos desde MySQL usando el token. |
| Manejadores `click` y `DOMContentLoaded` | Coordinan acciones de tarjetas, filtros, carrito y arranque de cada página. |

`frontend/js/seguimiento.js` tiene su propio manejador de envío: valida el código escrito, lo convierte a `LBM-<número>`, consulta `/api/seguimiento/:codigo` y actualiza las tres etapas visuales. No necesita ni envía el token privado.

### CSS y puntos de unión con HTML

`style.css` define variables en `:root` y los componentes compartidos. `pages.css` agrega reglas específicas de páginas interiores, consultas `@media` para pantallas pequeñas y `@media print` para el comprobante. El orden de carga en cada HTML es importante: primero `style.css`, luego `pages.css`, para que las reglas específicas puedan ajustar las generales.

| ID en HTML | Quién lo actualiza |
| --- | --- |
| `featured-products`, `home-categories`, `home-catalog-grid`, `menu-cards-grid` | Catálogo y filtros de `app.js`. |
| `drawer-items-list`, `header-cart-badge`, `page-cart-items` | Estado del carrito en `app.js`. |
| `checkout-shipping-form`, `checkout-total` | Formulario y total provisional de checkout. |
| `btn-confirm-order`, `payment-total-amount` | Envío y resumen de pago. |
| `confirmation-details`, `order-number`, `order-items-list` | Comprobante privado. |
| `tracking-form`, `tracking-result`, `tracking-status` | Consulta pública de `seguimiento.js`. |

## 5. Imágenes y archivos de diseño

| Carpeta o archivo | Función |
| --- | --- |
| `frontend/img/` | Logotipo y fotografías de platillos usadas por las páginas. Las 30 rutas iniciales están en `schema.sql`. |
| `docs/01-Planificacion.md` | Documento histórico de planificación y bocetos de la primera fase. No participa en la ejecución. |
| `docs/img/` | Capturas y archivo de diseño usados por la planificación. Express los puede servir en `/docs/img/` si se necesitan. |

Los archivos de imagen, los `package-lock.json` y los binarios de diseño son recursos generados o multimedia: su función se documenta aquí, no con comentarios dentro de cada archivo.

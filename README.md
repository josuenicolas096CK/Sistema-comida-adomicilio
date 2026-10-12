# La Buena Mesa

Sistema de pedidos de comida a domicilio con frontend HTML/CSS/JavaScript, Express y MySQL.

## Requisitos previos

- Node.js 18 o superior y npm (comprobado con Node.js 18.19.1).
- MySQL 8 o una versión de MariaDB compatible con InnoDB, con permiso para crear la base `pedidos_db`.
- No se necesita Live Server: Express sirve el frontend y la API en el mismo puerto.

## Iniciar

1. En DBeaver, ejecuta `schema.sql` desde la raíz del repositorio. Ese único archivo crea `pedidos_db`, sus tablas y los 30 productos iniciales. Ejecútalo solo en una base nueva; no lo vuelvas a ejecutar sobre la base existente.
2. Copia `backend/.env.example` a `backend/.env` y completa las credenciales de MySQL. `DB_PORT=3306` es el puerto de MySQL; `PORT=3002` es el puerto del servidor web.
3. Si usas una base anterior sin las columnas nuevas de `pedidos`, agrega `subtotal DECIMAL(10,2) NULL`, `costo_envio DECIMAL(10,2) NOT NULL DEFAULT 0`, `metodo_pago ENUM('efectivo','transferencia') NULL`, `consulta_token CHAR(64) NULL UNIQUE` y `codigo_rastreo VARCHAR(32) NULL UNIQUE`. Para los pedidos existentes, asigna `codigo_rastreo = CONCAT('LBM-', id)`. La base de este proyecto ya fue actualizada.
4. En `backend/`, ejecuta `npm install` y `npm start`.
5. Abre `http://127.0.0.1:3002`.

El servidor entrega el sitio, las imágenes locales y la API. Abre siempre la dirección del servidor Node para la demostración; Live Server no es necesario.

Para comprobar el guardado completo contra tu MySQL local, ejecuta `npm run test:smoke` dentro de `backend/`. La prueba crea tres pedidos temporales, comprueba costos, pagos y consultas protegidas, y elimina esos pedidos al terminar.

## API

- `GET /api/productos`: catálogo desde MySQL.
- `GET /api/productos/:id`: detalle de un producto.
- `GET /api/configuracion`: costo de envío, métodos de pago y rango estimado de entrega.
- `POST /api/pedidos`: guarda el cliente en `usuarios`, el total y estado en `pedidos`, la dirección y contacto de esa compra en `pedido_entrega`, los artículos en `detalles_pedido` y una fila de consulta en `resumen_pedidos`. Devuelve el comprobante leído de la base tras guardar.
- `GET /api/pedidos/:id`: devuelve un pedido desde MySQL. Requiere `Authorization: Bearer <consulta_token>`; la clave se entrega al crear el pedido.
- `GET /api/seguimiento/:codigo`: devuelve únicamente el código y el estado de un pedido; no expone datos personales. Acepta `LBM-123`, `lbm123` o `123`.

Los productos iniciales ya están incluidos en `schema.sql`. Las imágenes de los platillos están en `frontend/img`; guarda una ruta como `/img/jocon.jpeg` en `imagen_url`. Los campos `categoria` y `descripcion` alimentan los filtros y tarjetas del sitio. Para agregar productos después, insértalos en la tabla `productos`.

Cada pedido conserva sus propios datos de entrega aunque el mismo cliente vuelva a comprar. El servidor calcula el subtotal y añade Q15 de envío; el IVA se muestra como parte incluida en el subtotal. En pago se puede elegir efectivo contra entrega o transferencia, que se coordina con el restaurante. El tiempo estimado inicial es de 45–60 minutos. Edita estos valores en `backend/config/checkout.js`. Desde el inicio, «Seguir mi pedido» abre `seguimiento.html`; basta introducir el número de orden para consultar el estado, incluso desde otro dispositivo. El comprobante completo sigue protegido por una clave de consulta guardada en el navegador donde se hizo el pedido.

El correo es opcional en checkout. Como `usuarios.correo` exige un valor único, los pedidos sin correo reciben una referencia interna en esa tabla; `pedido_entrega.correo` queda vacío y el comprobante no muestra un correo inventado.

`resumen_pedidos` permite ver en DBeaver una fila por orden con cliente, contacto, dirección, fecha, cantidad de artículos y total. Los pedidos anteriores a `pedido_entrega` pueden carecer de dirección histórica fiable; en esos resúmenes se deja vacía.

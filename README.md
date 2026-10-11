# La Buena Mesa

Sistema de pedidos de comida a domicilio con frontend HTML/CSS/JavaScript, Express y MySQL.

## Iniciar

1. Configura `backend/.env` con `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` y `PORT=3002`. El puerto `3306` corresponde a MySQL; en este entorno el `3000` ya está ocupado por VS Code.
2. Usa tu base existente. `database/schema.sql` documenta la estructura actual y sirve para crear una base nueva; no lo ejecutes sobre una base que ya contiene estas tablas.
3. `database/seed.sql` agrega el catálogo actual a `productos`. Puedes ejecutarlo sobre tu base existente: omite los productos cuyo nombre o ruta de imagen ya estén registrados.
4. En `backend/`, ejecuta `npm install` y `npm start`.
5. Abre `http://127.0.0.1:3002`.

El servidor entrega el sitio, las imágenes locales y la API. También puedes abrir el frontend con Live Server; en ese caso, la API seguirá en `http://127.0.0.1:3002`.

Para comprobar el guardado completo contra tu MySQL local, ejecuta `npm run test:smoke` dentro de `backend/`. La prueba crea dos pedidos temporales, verifica que conserven direcciones distintas y los elimina al terminar.

## API

- `GET /api/productos`: catálogo desde MySQL.
- `GET /api/productos/:id`: detalle de un producto.
- `POST /api/pedidos`: guarda el cliente en `usuarios`, el total y estado en `pedidos`, la dirección y contacto de esa compra en `pedido_entrega`, y los artículos en `detalles_pedido`. Devuelve el comprobante leído de la base tras guardar.

Los productos nuevos se agregan a la tabla `productos`. Las imágenes de los platillos están en `frontend/img`; guarda una ruta como `/img/jocon.jpeg` en `imagen_url`. Los campos `categoria` y `descripcion` alimentan los filtros y tarjetas del sitio. Para cargar el catálogo actual, ejecuta `database/seed.sql`.

Cada pedido conserva sus propios datos de entrega aunque el mismo cliente vuelva a comprar. La base no registra método de pago, propina ni tarifa de envío; el total corresponde a los productos. El comprobante reciente se conserva durante la sesión del navegador.

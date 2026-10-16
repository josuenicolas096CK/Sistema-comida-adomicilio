# La Buena Mesa — sistema de pedidos a domicilio

Aplicación con HTML, CSS y JavaScript; servidor Node.js/Express; base de datos MySQL o MariaDB. El servidor Node entrega tanto las páginas como la API. **No se necesita Live Server ni copiar el proyecto a `htdocs`.**

## Inicio rápido

1. Instala **Node.js 18 o superior** e inicia **MySQL** en XAMPP.
2. En phpMyAdmin (`http://localhost/phpmyadmin`), importa el archivo **`schema.sql`** de la raíz. Esto crea `pedidos_db`, las tablas y los productos. Hazlo solo en una base nueva.
3. Abre una terminal en la **raíz del proyecto** y ejecuta:

   ```bash
   npm install
   npm start
   ```

4. Abre la dirección que muestra la terminal, normalmente **http://127.0.0.1:3002/**. Deja la terminal abierta.

Si MySQL no usa `root` sin contraseña en el puerto 3306, edita `backend/.env` después de `npm install` y antes de `npm start`. Para comprobar automáticamente el catálogo y los pedidos, ejecuta `npm test` en otra terminal; la prueba elimina sus pedidos temporales.

## 1. Requisitos

- Node.js 18 o superior y npm. El proyecto se comprobó con Node.js 18.19.1.
- XAMPP con MariaDB/MySQL y phpMyAdmin, o una instalación equivalente de MySQL 8 o MariaDB compatible con InnoDB.
- Git para clonar el repositorio, o el código descargado desde el enlace de entrega.

XAMPP administra la base de datos; **Node.js es necesario para ejecutar el backend**. Apache solo hace falta si se utiliza phpMyAdmin para importar o revisar la base.

## 2. Obtener el proyecto

Clona la rama de entrega (una vez publicada):

```bash
git clone --branch feature/integracionfinal --single-branch https://github.com/josuenicolas096CK/Sistema-comida-adomicilio.git
cd Sistema-comida-adomicilio
```

Todos los comandos siguientes parten de la raíz del proyecto, donde están `schema.sql` y este README.

## 3. Crear la base de datos con XAMPP

1. En el panel de XAMPP, inicia **Apache** y **MySQL** (puede aparecer como MariaDB).
2. Abre `http://localhost/phpmyadmin`.
3. En la página principal de phpMyAdmin, selecciona **Importar** y elige `schema.sql`, ubicado en la raíz del proyecto. Ejecuta la importación. No hace falta crear las tablas manualmente.
4. Comprueba que exista `pedidos_db` con las tablas `usuarios`, `productos`, `pedidos`, `pedido_entrega`, `detalles_pedido` y `resumen_pedidos`. `productos` debe contener **30 platillos**.

`schema.sql` crea la base, las seis tablas y el catálogo inicial en un solo paso. **Úsalo para una instalación nueva; no lo ejecutes de nuevo sobre una base que ya contiene esas tablas o pedidos.** Si se prefiere DBeaver, se puede ejecutar el mismo archivo allí.

## 4. Instalar y arrancar

Abre una terminal en la raíz del proyecto, donde está este README, y ejecuta:

```bash
npm install
npm start
```

`npm install` instala las dependencias del backend según su `package-lock.json` y crea `backend/.env` solo si no existe. No necesitas `npm init`: el proyecto ya incluye `package.json`. Los valores iniciales corresponden al caso habitual de XAMPP (`root` sin contraseña, MySQL en 3306):

```dotenv
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=pedidos_db
PORT=3002
```

Si tu MySQL usa otro usuario, contraseña o puerto, edita `backend/.env` antes de `npm start`. `DB_PORT` corresponde a MySQL; `PORT` corresponde al sitio web. `.env` no se publica en Git.

Mantén abierta la terminal con `npm start`. Cuando aparezca **`MySQL conectado. Abre http://127.0.0.1:3002/`**, abre esa dirección **en el navegador de la misma computadora**. Node entrega el sitio y la API; no necesitas Live Server ni poner archivos en `htdocs`. Para detenerlo, pulsa `Ctrl+C`.

Si no arranca:

- `npm` no se reconoce: instala Node.js 18 o superior y abre una terminal nueva.
- `No se pudo conectar a MySQL`: inicia MySQL en XAMPP; comprueba `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` y `DB_NAME` en `backend/.env`, y que importaste `schema.sql`.
- `El puerto 3002 ya está ocupado`: cierra la otra instancia del servidor o cambia `PORT` en `backend/.env`; usa en el navegador el puerto indicado al arrancar.
- El navegador no carga: deja abierta la terminal donde se ejecutó `npm start` y usa la dirección exacta que imprime, con `http://`.

## 5. Revisar el funcionamiento

1. En **Inicio** o **Menú**, comprueba que aparecen los platillos con imagen, descripción y precio. Usa los filtros por categoría.
2. Agrega productos al carrito, cambia las cantidades y recarga la página: el carrito se conserva en `localStorage`.
3. Continúa al checkout. Completa nombre, teléfono, dirección, ciudad y una zona del 1 al 12; el correo es opcional.
4. Revisa el subtotal y el envío de **Q15**. El IVA mostrado está incluido en el subtotal. Elige **efectivo contra entrega** o **transferencia** y confirma el pedido. La transferencia se coordina con el restaurante; la aplicación no procesa pagos bancarios.
5. La página de confirmación muestra el código de rastreo `LBM-...`, el resumen y una estimación inicial de **45–60 minutos**.
6. En phpMyAdmin, comprueba el nuevo pedido en `pedidos`, los artículos en `detalles_pedido`, la dirección en `pedido_entrega` y el resumen en `resumen_pedidos`.
7. Abre **Seguir mi pedido** desde Inicio. Escribe el código mostrado; se aceptan formatos como `LBM-123`, `lbm123` o `123`.

El estado inicial es `pendiente`. Este proyecto no incluye un panel de administración: para demostrar un cambio de estado, el evaluador puede ejecutar en la pestaña **SQL** de phpMyAdmin, sustituyendo el código por el de su pedido:

```sql
UPDATE pedidos
SET estado = 'en_preparacion'
WHERE codigo_rastreo = 'LBM-123';
```

Vuelve a consultar el código en la página de seguimiento. También se puede usar `entregado` como estado. Los valores admitidos son `pendiente`, `en_preparacion` y `entregado`.

## 6. Rutas de la API

| Método | Ruta | Función |
| --- | --- | --- |
| GET | `/api/productos` | Lista el catálogo desde la base. |
| GET | `/api/productos/:id` | Consulta un producto. |
| GET | `/api/configuracion` | Devuelve costo de envío, métodos de pago y tiempo estimado. |
| POST | `/api/pedidos` | Guarda el cliente, pedido, entrega, artículos y resumen en una transacción. |
| GET | `/api/pedidos/:id` | Consulta el pedido completo; exige `Authorization: Bearer <consulta_token>`. |
| GET | `/api/seguimiento/:codigo` | Devuelve solo el código y el estado, sin datos personales. |

El `consulta_token` protege los datos completos de una orden; el código `LBM-...` permite ver solo su estado.

## 7. Prueba automática opcional

Con MySQL/MariaDB encendido y `.env` configurado, desde la raíz se puede ejecutar:

```bash
npm test
```

La prueba consulta el catálogo, crea tres pedidos temporales, verifica montos, métodos de pago, guardado y seguimiento, y elimina esos pedidos al terminar. Usa el puerto 3102 durante la prueba.

## Estructura principal

- `schema.sql`: crea `pedidos_db`, las tablas y los 30 productos iniciales.
- `backend/`: servidor Express, configuración y rutas API.
- `frontend/`: páginas, estilos, JavaScript e imágenes locales en `frontend/img`.
- `.gitignore`: excluye `node_modules/` y los archivos `.env`.

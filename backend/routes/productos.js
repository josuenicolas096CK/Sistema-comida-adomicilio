// API del catálogo, creación de pedidos, comprobantes privados y seguimiento público.
const express = require('express');
const { randomUUID, randomBytes } = require('node:crypto');
const router = express.Router();
const pool = require('../config/db');
const checkout = require('../config/checkout');

const round = value => Math.round(value * 100) / 100;
const validText = (value, max) => typeof value === 'string' && value.trim().length > 0 && value.trim().length <= max;
async function productSelect() {
    // Conserva compatibilidad con bases antiguas que además tenían la columna `imagen`.
    const [legacyImage] = await pool.query("SHOW COLUMNS FROM productos LIKE 'imagen'");
    const image = legacyImage.length ? "COALESCE(NULLIF(imagen_url, ''), NULLIF(imagen, ''))" : 'imagen_url';
    return `SELECT id, nombre, descripcion, precio, categoria, ${image} AS imagen_url FROM productos`;
}

async function readOrder(connection, id, token) {
    // Recupera el comprobante completo únicamente si coincide el token privado.
    const [orders] = await connection.query(
        `SELECT p.id, p.codigo_rastreo, p.fecha, p.estado, p.subtotal, p.costo_envio, p.total, p.metodo_pago,
                e.nombre, e.correo, e.telefono, e.direccion, e.zona, e.ciudad, e.codigo_postal
         FROM pedidos p JOIN pedido_entrega e ON e.pedido_id = p.id
         WHERE p.id = ? AND p.consulta_token = ?`,
        [id, token]
    );
    if (!orders.length) return null;
    const [items] = await connection.query(
        'SELECT d.producto_id AS id, pr.nombre, d.cantidad, d.precio_unitario FROM detalles_pedido d JOIN productos pr ON pr.id = d.producto_id WHERE d.pedido_id = ? ORDER BY d.id',
        [id]
    );
    const saved = orders[0];
    return {
        pedido_id: saved.id,
        codigo_rastreo: saved.codigo_rastreo,
        consulta_token: token,
        fecha: saved.fecha,
        estado: saved.estado,
        subtotal: Number(saved.subtotal),
        costo_envio: Number(saved.costo_envio),
        total: Number(saved.total),
        metodo_pago: saved.metodo_pago,
        estimacion_min_minutos: checkout.estimacion_min_minutos,
        estimacion_max_minutos: checkout.estimacion_max_minutos,
        cliente: {
            nombre: saved.nombre,
            correo: saved.correo,
            telefono: saved.telefono,
            direccion: [saved.direccion, saved.zona, saved.ciudad, saved.codigo_postal].filter(Boolean).join(', '),
            zona: saved.zona,
            ciudad: saved.ciudad,
            codigo_postal: saved.codigo_postal
        },
        items: items.map(item => ({
            id: item.id,
            nombre: item.nombre,
            cantidad: item.cantidad,
            precio_unitario: Number(item.precio_unitario)
        }))
    };
}

router.get('/configuracion', (_req, res) => res.json(checkout));

router.get('/productos', async (_req, res) => {
    try {
        const [rows] = await pool.query(`${await productSelect()} ORDER BY id`);
        res.json(rows);
    } catch (error) {
        console.error('Error al consultar productos:', error);
        res.status(500).json({ error: 'No se pudo cargar el menú desde MySQL.' });
    }
});

router.get('/productos/:id', async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'Producto inválido.' });
    try {
        const [rows] = await pool.query(`${await productSelect()} WHERE id = ?`, [id]);
        if (!rows.length) return res.status(404).json({ error: 'Producto no encontrado.' });
        res.json(rows[0]);
    } catch (error) {
        console.error('Error al consultar producto:', error);
        res.status(500).json({ error: 'No se pudo consultar el producto.' });
    }
});

router.get('/pedidos/:id', async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ error: 'Pedido inválido.' });
    // El código público de rastreo no da acceso a nombre, dirección ni artículos.
    const token = /^Bearer ([a-f0-9]{64})$/i.exec(req.get('authorization') || '')?.[1];
    if (!token) return res.status(401).json({ error: 'Se necesita la clave de consulta del pedido.' });
    try {
        const order = await readOrder(pool, id, token.toLowerCase());
        if (!order) return res.status(404).json({ error: 'Pedido no encontrado o clave inválida.' });
        res.json(order);
    } catch (error) {
        console.error('Error al consultar pedido:', error);
        res.status(500).json({ error: 'No se pudo consultar el pedido.' });
    }
});

// Consulta pública: solo muestra el estado, sin datos personales ni artículos.
router.get('/seguimiento/:codigo', async (req, res) => {
    const normalized = req.params.codigo.replace(/\s/g, '');
    const match = /^#?(?:LBM-?)?([1-9]\d*)$/i.exec(normalized);
    if (!match || !Number.isSafeInteger(Number(match[1]))) {
        return res.status(400).json({ error: 'Código de rastreo inválido.' });
    }
    const codigo = `LBM-${Number(match[1])}`;
    try {
        const [rows] = await pool.query('SELECT id, codigo_rastreo, estado FROM pedidos WHERE codigo_rastreo = ?', [codigo]);
        if (!rows.length) return res.status(404).json({ error: 'No encontramos ese código de rastreo.' });
        res.json({ pedido_id: rows[0].id, codigo_rastreo: rows[0].codigo_rastreo, estado: rows[0].estado });
    } catch (error) {
        console.error('Error al consultar seguimiento:', error);
        res.status(500).json({ error: 'No se pudo consultar el estado del pedido.' });
    }
});

router.post('/pedidos', async (req, res) => {
    // Se validan datos y cantidades antes de abrir la transacción de escritura.
    const { cliente: rawClient, entrega: rawDelivery, items, metodo_pago: metodoPago } = req.body || {};
    const cliente = rawClient && typeof rawClient === 'object' && !Array.isArray(rawClient) ? rawClient : {};
    const entrega = rawDelivery && typeof rawDelivery === 'object' && !Array.isArray(rawDelivery) ? rawDelivery : {};
    if (!validText(cliente.nombre, 100) ||
        (cliente.correo != null && (typeof cliente.correo !== 'string' || cliente.correo.trim().length > 150)) ||
        !validText(cliente.telefono, 20) || !validText(entrega.direccion, 255) ||
        !validText(entrega.zona, 50) || !validText(entrega.ciudad, 100) ||
        (entrega.codigo_postal != null && (typeof entrega.codigo_postal !== 'string' || entrega.codigo_postal.trim().length > 20))) {
        return res.status(400).json({ error: 'Completa los datos de contacto y entrega sin superar los límites del formulario.' });
    }
    const nombre = cliente.nombre.trim();
    const correo = cliente.correo?.trim().toLowerCase() || '';
    const telefono = cliente.telefono.trim();
    const calle = entrega.direccion.trim();
    const zona = entrega.zona.trim();
    const ciudad = entrega.ciudad.trim();
    const codigoPostal = entrega.codigo_postal?.trim() || '';
    const direccion = [calle, zona, ciudad, codigoPostal].filter(Boolean).join(', ');
    if (direccion.length > 255) {
        return res.status(400).json({ error: 'La dirección completa no debe superar 255 caracteres.' });
    }
    if (!checkout.metodos_pago.includes(metodoPago)) {
        return res.status(400).json({ error: 'Selecciona un método de pago válido.' });
    }
    if ((correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) ||
        !Array.isArray(items) || items.length === 0 || items.length > 50 ||
        items.some(item => !Number.isInteger(Number(item.id)) || Number(item.id) < 1 ||
            !Number.isInteger(Number(item.cantidad)) || Number(item.cantidad) < 1 || Number(item.cantidad) > 99)) {
        return res.status(400).json({ error: 'Revisa los datos del cliente y los productos del pedido.' });
    }

    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();
        // Se agrupan IDs repetidos; el precio se lee de MySQL, no del carrito enviado.
        const quantities = new Map();
        for (const item of items) quantities.set(Number(item.id), (quantities.get(Number(item.id)) || 0) + Number(item.cantidad));
        if ([...quantities.values()].some(quantity => quantity > 99)) {
            throw Object.assign(new Error('Cantidad inválida.'), { status: 400 });
        }
        const ids = [...quantities.keys()];
        const [products] = await connection.query('SELECT id, nombre, precio FROM productos WHERE id IN (?)', [ids]);
        if (products.length !== ids.length) {
            throw Object.assign(new Error('Uno de los productos ya no está disponible.'), { status: 400 });
        }
        const subtotal = round(products.reduce((sum, product) => sum + Number(product.precio) * quantities.get(product.id), 0));
        const costoEnvio = checkout.costo_envio;
        const total = round(subtotal + costoEnvio);
        const consultaToken = randomBytes(32).toString('hex');
        let existing = [];
        if (correo) [existing] = await connection.query('SELECT id FROM usuarios WHERE correo = ? LIMIT 1', [correo]);
        let usuarioId;
        if (existing.length) {
            usuarioId = existing[0].id;
            await connection.query('UPDATE usuarios SET nombre = ?, telefono = ?, direccion = ? WHERE id = ?', [nombre, telefono, direccion, usuarioId]);
        } else {
            // usuarios.correo es NOT NULL UNIQUE; los pedidos sin correo usan una clave interna distinta.
            const correoUsuario = correo || `sin-correo-${randomUUID()}@example.invalid`;
            const [user] = await connection.query('INSERT INTO usuarios (nombre, correo, telefono, direccion) VALUES (?, ?, ?, ?)', [nombre, correoUsuario, telefono, direccion]);
            usuarioId = user.insertId;
        }
        const [order] = await connection.query(
            'INSERT INTO pedidos (usuario_id, subtotal, costo_envio, total, estado, metodo_pago, consulta_token) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [usuarioId, subtotal, costoEnvio, total, 'pendiente', metodoPago, consultaToken]
        );
        await connection.query('UPDATE pedidos SET codigo_rastreo = ? WHERE id = ?', [`LBM-${order.insertId}`, order.insertId]);
        await connection.query(
            'INSERT INTO pedido_entrega (pedido_id, nombre, correo, telefono, direccion, zona, ciudad, codigo_postal) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [order.insertId, nombre, correo, telefono, calle, zona, ciudad, codigoPostal || null]
        );
        for (const product of products) {
            await connection.query('INSERT INTO detalles_pedido (pedido_id, producto_id, cantidad, precio_unitario) VALUES (?, ?, ?, ?)',
                [order.insertId, product.id, quantities.get(product.id), product.precio]);
        }
        await connection.query(
            `INSERT INTO resumen_pedidos (pedido_id, usuario_id, nombre_cliente, telefono, correo, direccion, total, cantidad_articulos, fecha)
             SELECT p.id, p.usuario_id, e.nombre, e.telefono, NULLIF(e.correo, ''),
                    CONCAT_WS(', ', e.direccion, e.zona, e.ciudad, NULLIF(e.codigo_postal, '')),
                    p.total, (SELECT SUM(d.cantidad) FROM detalles_pedido d WHERE d.pedido_id = p.id), p.fecha
             FROM pedidos p JOIN pedido_entrega e ON e.pedido_id = p.id WHERE p.id = ?`,
            [order.insertId]
        );
        const saved = await readOrder(connection, order.insertId, consultaToken);
        if (!saved) throw new Error('No se pudo verificar el pedido guardado.');
        // Solo se confirma cuando todas las tablas y el comprobante se verificaron.
        await connection.commit();
        res.status(201).json(saved);
    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Error al guardar pedido:', error);
        res.status(error.status || 500).json({ error: error.status ? error.message : 'No se pudo guardar el pedido en MySQL.' });
    } finally {
        if (connection) connection.release();
    }
});

module.exports = router;

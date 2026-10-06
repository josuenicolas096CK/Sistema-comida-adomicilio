const express = require('express');
const router = express.Router();
const pool = require('../config/db');

const round = value => Math.round(value * 100) / 100;
const validText = (value, max) => typeof value === 'string' && value.trim().length > 0 && value.trim().length <= max;
async function productSelect() {
    const [legacyImage] = await pool.query("SHOW COLUMNS FROM productos LIKE 'imagen'");
    const image = legacyImage.length ? "COALESCE(NULLIF(imagen_url, ''), NULLIF(imagen, ''))" : 'imagen_url';
    return `SELECT id, nombre, descripcion, precio, categoria, ${image} AS imagen_url FROM productos`;
}

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

router.post('/pedidos', async (req, res) => {
    const { cliente: rawClient, entrega: rawDelivery, items } = req.body || {};
    const cliente = rawClient && typeof rawClient === 'object' && !Array.isArray(rawClient) ? rawClient : {};
    const entrega = rawDelivery && typeof rawDelivery === 'object' && !Array.isArray(rawDelivery) ? rawDelivery : {};
    if (!validText(cliente.nombre, 100) || !validText(cliente.correo, 150) ||
        !validText(cliente.telefono, 20) || !validText(entrega.direccion, 255) ||
        !validText(entrega.zona, 50) || !validText(entrega.ciudad, 100) ||
        (entrega.codigo_postal != null && (typeof entrega.codigo_postal !== 'string' || entrega.codigo_postal.trim().length > 20))) {
        return res.status(400).json({ error: 'Completa los datos de contacto y entrega sin superar los límites del formulario.' });
    }
    const nombre = cliente.nombre.trim();
    const correo = cliente.correo.trim().toLowerCase();
    const telefono = cliente.telefono.trim();
    const calle = entrega.direccion.trim();
    const zona = entrega.zona.trim();
    const ciudad = entrega.ciudad.trim();
    const codigoPostal = entrega.codigo_postal?.trim() || '';
    const direccion = [calle, zona, ciudad, codigoPostal].filter(Boolean).join(', ');
    if (direccion.length > 255) {
        return res.status(400).json({ error: 'La dirección completa no debe superar 255 caracteres.' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo) ||
        !Array.isArray(items) || items.length === 0 || items.length > 50 ||
        items.some(item => !Number.isInteger(Number(item.id)) || Number(item.id) < 1 ||
            !Number.isInteger(Number(item.cantidad)) || Number(item.cantidad) < 1 || Number(item.cantidad) > 99)) {
        return res.status(400).json({ error: 'Revisa los datos del cliente y los productos del pedido.' });
    }

    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();
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
        const total = round(products.reduce((sum, product) => sum + Number(product.precio) * quantities.get(product.id), 0));
        const [existing] = await connection.query('SELECT id FROM usuarios WHERE correo = ? LIMIT 1', [correo]);
        let usuarioId;
        if (existing.length) {
            usuarioId = existing[0].id;
            await connection.query('UPDATE usuarios SET nombre = ?, telefono = ?, direccion = ? WHERE id = ?', [nombre, telefono, direccion, usuarioId]);
        } else {
            const [user] = await connection.query('INSERT INTO usuarios (nombre, correo, telefono, direccion) VALUES (?, ?, ?, ?)', [nombre, correo, telefono, direccion]);
            usuarioId = user.insertId;
        }
        const [order] = await connection.query('INSERT INTO pedidos (usuario_id, total, estado) VALUES (?, ?, ?)', [usuarioId, total, 'pendiente']);
        await connection.query(
            'INSERT INTO pedido_entrega (pedido_id, nombre, correo, telefono, direccion, zona, ciudad, codigo_postal) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [order.insertId, nombre, correo, telefono, calle, zona, ciudad, codigoPostal || null]
        );
        for (const product of products) {
            await connection.query('INSERT INTO detalles_pedido (pedido_id, producto_id, cantidad, precio_unitario) VALUES (?, ?, ?, ?)',
                [order.insertId, product.id, quantities.get(product.id), product.precio]);
        }
        const [savedOrders] = await connection.query(
            'SELECT p.id, p.estado, p.total, e.nombre, e.correo, e.telefono, e.direccion, e.zona, e.ciudad, e.codigo_postal FROM pedidos p JOIN pedido_entrega e ON e.pedido_id = p.id WHERE p.id = ?',
            [order.insertId]
        );
        const [savedItems] = await connection.query(
            'SELECT d.producto_id AS id, pr.nombre, d.cantidad, d.precio_unitario FROM detalles_pedido d JOIN productos pr ON pr.id = d.producto_id WHERE d.pedido_id = ? ORDER BY d.id',
            [order.insertId]
        );
        await connection.commit();
        const saved = savedOrders[0];
        res.status(201).json({
            pedido_id: saved.id,
            estado: saved.estado,
            total: Number(saved.total),
            cliente: {
                nombre: saved.nombre,
                correo: saved.correo,
                telefono: saved.telefono,
                direccion: [saved.direccion, saved.zona, saved.ciudad, saved.codigo_postal].filter(Boolean).join(', '),
                zona: saved.zona,
                ciudad: saved.ciudad,
                codigo_postal: saved.codigo_postal
            },
            items: savedItems.map(item => ({
                id: item.id,
                nombre: item.nombre,
                cantidad: item.cantidad,
                precio_unitario: Number(item.precio_unitario)
            }))
        });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Error al guardar pedido:', error);
        res.status(error.status || 500).json({ error: error.status ? error.message : 'No se pudo guardar el pedido en MySQL.' });
    } finally {
        if (connection) connection.release();
    }
});

module.exports = router;

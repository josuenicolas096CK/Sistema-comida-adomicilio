const express = require('express');
const router = express.Router();
const pool = require('../config/db');

const clean = (value, max) => typeof value === 'string' ? value.trim().slice(0, max) : '';
const round = value => Math.round(value * 100) / 100;
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
    const { cliente: rawClient, items } = req.body || {};
    const cliente = rawClient && typeof rawClient === 'object' && !Array.isArray(rawClient) ? rawClient : {};
    const nombre = clean(cliente.nombre, 100);
    const correo = clean(cliente.correo, 150).toLowerCase();
    const telefono = clean(cliente.telefono, 20);
    const direccion = clean(cliente.direccion, 255);
    if (!nombre || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo) || !telefono || !direccion ||
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
        for (const product of products) {
            await connection.query('INSERT INTO detalles_pedido (pedido_id, producto_id, cantidad, precio_unitario) VALUES (?, ?, ?, ?)',
                [order.insertId, product.id, quantities.get(product.id), product.precio]);
        }
        await connection.commit();
        res.status(201).json({
            pedido_id: order.insertId,
            estado: 'pendiente',
            total,
            cliente: { nombre, correo, telefono, direccion },
            items: products.map(product => ({
                id: product.id, nombre: product.nombre, cantidad: quantities.get(product.id),
                precio_unitario: Number(product.precio)
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

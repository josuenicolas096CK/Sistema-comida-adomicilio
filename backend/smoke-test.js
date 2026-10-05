// Prueba integral contra MySQL local. Elimina únicamente el pedido de prueba que crea.
require('dotenv').config();
const assert = require('node:assert/strict');
const pool = require('./config/db');
const port = 3102;
process.env.PORT = String(port);
require('./server');

(async () => {
    let orderId;
    const email = `prueba-${Date.now()}@example.invalid`;
    try {
        await new Promise(resolve => setTimeout(resolve, 400));
        const catalogResponse = await fetch(`http://127.0.0.1:${port}/api/productos`);
        assert.equal(catalogResponse.status, 200);
        const products = await catalogResponse.json();
        assert.ok(products.length);
        const product = products[0];
        const response = await fetch(`http://127.0.0.1:${port}/api/pedidos`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                cliente: { nombre: 'Prueba de integración', correo: email, telefono: '55555555', direccion: 'Dirección de prueba, Zona 15, Guatemala' },
                items: [{ id: product.id, cantidad: 2 }]
            })
        });
        const created = await response.json();
        assert.equal(response.status, 201, JSON.stringify(created));
        orderId = created.pedido_id;
        assert.equal(Number(created.total), Number(product.precio) * 2);
        assert.equal(created.items.length, 1);
        assert.equal(created.items[0].cantidad, 2);
        assert.equal(created.cliente.nombre, 'Prueba de integración');
        const [stored] = await pool.query('SELECT p.total, p.estado, u.nombre, u.direccion, d.cantidad, d.precio_unitario FROM pedidos p JOIN usuarios u ON u.id = p.usuario_id JOIN detalles_pedido d ON d.pedido_id = p.id WHERE p.id = ?', [orderId]);
        assert.equal(stored.length, 1);
        assert.equal(Number(stored[0].total), Number(created.total));
        assert.equal(stored[0].estado, 'pendiente');
        assert.equal(stored[0].cantidad, 2);
        console.log('Pedido, detalle, total y cliente en MySQL: correctos.');
    } finally {
        if (orderId) await pool.query('DELETE FROM pedidos WHERE id = ?', [orderId]);
        await pool.query('DELETE FROM usuarios WHERE correo = ?', [email]);
        await pool.end();
    }
})().then(() => process.exit(0)).catch(error => { console.error(error); process.exit(1); });

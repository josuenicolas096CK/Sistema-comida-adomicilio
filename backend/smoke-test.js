// Prueba integral contra MySQL local. Elimina únicamente los pedidos de prueba que crea.
require('dotenv').config();
const assert = require('node:assert/strict');
const pool = require('./config/db');
const port = 3102;
process.env.PORT = String(port);
require('./server');

(async () => {
    const orderIds = [];
    const email = `prueba-${Date.now()}@example.invalid`;
    try {
        await new Promise(resolve => setTimeout(resolve, 400));
        const catalogResponse = await fetch(`http://127.0.0.1:${port}/api/productos`);
        assert.equal(catalogResponse.status, 200);
        const products = await catalogResponse.json();
        assert.ok(products.length);
        const product = products[0];
        async function createOrder(address) {
            const response = await fetch(`http://127.0.0.1:${port}/api/pedidos`, {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    cliente: { nombre: 'Prueba de integración', correo: email, telefono: '55555555' },
                    entrega: { direccion: address, zona: 'Zona 15', ciudad: 'Guatemala', codigo_postal: '01015' },
                    items: [{ id: product.id, cantidad: 2 }]
                })
            });
            const created = await response.json();
            assert.equal(response.status, 201, JSON.stringify(created));
            orderIds.push(created.pedido_id);
            assert.equal(Number(created.total), Number(product.precio) * 2);
            assert.equal(created.items.length, 1);
            assert.equal(created.items[0].cantidad, 2);
            assert.equal(created.cliente.direccion, `${address}, Zona 15, Guatemala, 01015`);
            return created;
        }
        await createOrder('Dirección de prueba A');
        await createOrder('Dirección de prueba B');
        const [stored] = await pool.query(
            'SELECT p.id, p.total, p.estado, e.direccion, e.zona, e.ciudad, d.cantidad FROM pedidos p JOIN pedido_entrega e ON e.pedido_id = p.id JOIN detalles_pedido d ON d.pedido_id = p.id WHERE p.id IN (?) ORDER BY p.id',
            [orderIds]
        );
        assert.equal(stored.length, 2);
        assert.equal(stored[0].direccion, 'Dirección de prueba A');
        assert.equal(stored[1].direccion, 'Dirección de prueba B');
        assert.ok(stored.every(row => row.estado === 'pendiente' && row.cantidad === 2));
        console.log('Dos pedidos del mismo cliente conservaron direcciones y detalles distintos.');
    } finally {
        if (orderIds.length) await pool.query('DELETE FROM pedidos WHERE id IN (?)', [orderIds]);
        await pool.query('DELETE FROM usuarios WHERE correo = ?', [email]);
        await pool.end();
    }
})().then(() => process.exit(0)).catch(error => { console.error(error); process.exit(1); });

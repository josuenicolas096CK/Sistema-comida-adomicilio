// Prueba integral contra MySQL local. Elimina únicamente los pedidos de prueba que crea.
require('dotenv').config();
const assert = require('node:assert/strict');
const pool = require('./config/db');
const port = 3102;
process.env.PORT = String(port);
require('./server');

(async () => {
    const orderIds = [];
    let guestUserId;
    const email = `prueba-${Date.now()}@example.invalid`;
    try {
        await new Promise(resolve => setTimeout(resolve, 400));
        const catalogResponse = await fetch(`http://127.0.0.1:${port}/api/productos`);
        assert.equal(catalogResponse.status, 200);
        const products = await catalogResponse.json();
        assert.ok(products.length);
        const product = products[0];
        const configResponse = await fetch(`http://127.0.0.1:${port}/api/configuracion`);
        assert.equal(configResponse.status, 200);
        const config = await configResponse.json();
        assert.equal(config.costo_envio, 15);
        const productResponse = await fetch(`http://127.0.0.1:${port}/api/productos/${product.id}`);
        assert.equal(productResponse.status, 200);
        assert.equal((await productResponse.json()).id, product.id);
        async function createOrder(address, includeEmail = true) {
            const response = await fetch(`http://127.0.0.1:${port}/api/pedidos`, {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    cliente: { nombre: 'Prueba de integración', correo: includeEmail ? email : '', telefono: '55555555' },
                    entrega: { direccion: address, zona: 'Zona 3', ciudad: 'Guatemala', codigo_postal: '01003' },
                    metodo_pago: includeEmail ? 'efectivo' : 'transferencia',
                    items: [{ id: product.id, cantidad: 2 }]
                })
            });
            const created = await response.json();
            assert.equal(response.status, 201, JSON.stringify(created));
            orderIds.push(created.pedido_id);
            assert.equal(Number(created.subtotal), Number(product.precio) * 2);
            assert.equal(Number(created.costo_envio), config.costo_envio);
            assert.equal(Number(created.total), Number(product.precio) * 2 + config.costo_envio);
            assert.equal(created.metodo_pago, includeEmail ? 'efectivo' : 'transferencia');
            assert.match(created.consulta_token, /^[a-f0-9]{64}$/);
            assert.equal(created.estimacion_min_minutos, config.estimacion_min_minutos);
            assert.equal(created.items.length, 1);
            assert.equal(created.items[0].cantidad, 2);
            assert.equal(created.cliente.direccion, `${address}, Zona 3, Guatemala, 01003`);
            const unauthorized = await fetch(`http://127.0.0.1:${port}/api/pedidos/${created.pedido_id}`);
            assert.equal(unauthorized.status, 401);
            const wrongToken = await fetch(`http://127.0.0.1:${port}/api/pedidos/${created.pedido_id}`, {
                headers: { authorization: `Bearer ${'0'.repeat(64)}` }
            });
            assert.equal(wrongToken.status, 404);
            const lookup = await fetch(`http://127.0.0.1:${port}/api/pedidos/${created.pedido_id}`, {
                headers: { authorization: `Bearer ${created.consulta_token}` }
            });
            assert.equal(lookup.status, 200);
            assert.deepEqual(await lookup.json(), created);
            return created;
        }
        await createOrder('Dirección de prueba A');
        await createOrder('Dirección de prueba B');
        const guestOrder = await createOrder('Dirección de prueba sin correo', false);
        const [[guestUser]] = await pool.query('SELECT usuario_id FROM pedidos WHERE id = ?', [guestOrder.pedido_id]);
        guestUserId = guestUser.usuario_id;
        assert.equal(guestOrder.cliente.correo, '');
        const [stored] = await pool.query(
            'SELECT p.id, p.usuario_id, p.total, p.estado, e.correo, e.direccion, e.zona, e.ciudad, d.cantidad FROM pedidos p JOIN pedido_entrega e ON e.pedido_id = p.id JOIN detalles_pedido d ON d.pedido_id = p.id WHERE p.id IN (?) ORDER BY p.id',
            [orderIds]
        );
        assert.equal(stored.length, 3);
        assert.equal(stored[0].direccion, 'Dirección de prueba A');
        assert.equal(stored[1].direccion, 'Dirección de prueba B');
        assert.equal(stored[2].direccion, 'Dirección de prueba sin correo');
        assert.equal(stored[2].correo, '');
        assert.equal(stored[2].usuario_id, guestUserId);
        assert.ok(stored.every(row => row.estado === 'pendiente' && row.cantidad === 2));
        const [summaries] = await pool.query(
            'SELECT pedido_id, usuario_id, nombre_cliente, correo, direccion, total, cantidad_articulos FROM resumen_pedidos WHERE pedido_id IN (?) ORDER BY pedido_id',
            [orderIds]
        );
        assert.equal(summaries.length, 3);
        assert.deepEqual(summaries.map(row => row.direccion), [
            'Dirección de prueba A, Zona 3, Guatemala, 01003',
            'Dirección de prueba B, Zona 3, Guatemala, 01003',
            'Dirección de prueba sin correo, Zona 3, Guatemala, 01003'
        ]);
        assert.ok(summaries.every(row => row.nombre_cliente === 'Prueba de integración' && row.cantidad_articulos === 2 && Number(row.total) === Number(product.precio) * 2 + config.costo_envio));
        assert.equal(summaries[2].usuario_id, guestUserId);
        assert.equal(summaries[2].correo, null);
        await pool.query("UPDATE pedidos SET estado = 'en_preparacion' WHERE id = ?", [guestOrder.pedido_id]);
        const updated = await fetch(`http://127.0.0.1:${port}/api/pedidos/${guestOrder.pedido_id}`, {
            headers: { authorization: `Bearer ${guestOrder.consulta_token}` }
        });
        assert.equal((await updated.json()).estado, 'en_preparacion');
        console.log('Catálogo, costos, pagos y consulta segura de tres pedidos: correctos.');
    } finally {
        if (orderIds.length) await pool.query('DELETE FROM pedidos WHERE id IN (?)', [orderIds]);
        if (guestUserId) await pool.query('DELETE FROM usuarios WHERE id = ?', [guestUserId]);
        await pool.query('DELETE FROM usuarios WHERE correo = ?', [email]);
        await pool.end();
    }
})().then(() => process.exit(0)).catch(error => { console.error(error); process.exit(1); });

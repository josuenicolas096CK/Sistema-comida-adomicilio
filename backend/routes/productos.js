const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// 1. GET: Obtener todos los productos del menú
router.get('/', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM productos');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener los productos' });
    }
});

// 2. GET/:id: Obtener el detalle de un producto específico por su ID
router.get('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await pool.query('SELECT * FROM productos WHERE id = ?', [id]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }
        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener el producto' });
    }
});

// 3. POST: Registrar un nuevo pedido
router.post('/pedidos', async (req, res) => {
    const { usuario_id, total, items } = req.body;
    try {
        // Insertar cabecera del pedido
        const [result] = await pool.query(
            'INSERT INTO pedidos (usuario_id, total, estado) VALUES (?, ?, ?)',
            [usuario_id, total, 'Pendiente']
        );
        res.json({ mensaje: 'Pedido registrado con éxito', pedido_id: result.insertId });
    } catch (error) {
        res.status(500).json({ error: 'Error al registrar el pedido' });
    }
});

module.exports = router;
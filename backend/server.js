const express = require('express');
const cors = require('cors');
require('dotenv').config();

// 1. Primero inicializamos Express
const app = express();
const PORT = process.env.PORT || 3000;

// 2. Luego los Middlewares
app.use(cors());
app.use(express.json());

// 3. Después cargamos la conexión a la base de datos
require('./config/db');

// 4. Luego importamos y usamos las rutas (¡aquí ya existe 'app'!)
const productosRoutes = require('./routes/productos');
app.use('/api', productosRoutes);

// 5. Ruta de prueba inicial
app.get('/', (req, res) => {
    res.json({ mensaje: '¡Servidor de Comida a Domicilio activo y funcionando! 🚀' });
});

// 6. Finalmente levantamos el servidor
app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});
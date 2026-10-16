-- Instalación de una base nueva: crear tablas y cargar el catálogo inicial.
-- Estructura actual de pedidos_db: usuarios, productos, pedidos,
-- pedido_entrega, detalles_pedido y resumen_pedidos.
-- Ejecutar solo para crear una base nueva; no volver a ejecutar sobre la base existente.
CREATE DATABASE IF NOT EXISTS pedidos_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE pedidos_db;

-- Tabla: usuarios
CREATE TABLE usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    correo VARCHAR(150) NOT NULL UNIQUE,
    telefono VARCHAR(20),
    direccion VARCHAR(255),
    fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Tabla: productos
CREATE TABLE productos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT,
    precio DECIMAL(10,2) NOT NULL,
    categoria VARCHAR(100),
    imagen_url VARCHAR(255)
) ENGINE=InnoDB;

-- Tabla: pedidos
CREATE TABLE pedidos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
    subtotal DECIMAL(10,2),
    costo_envio DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    total DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    estado ENUM('pendiente', 'en_preparacion', 'entregado') NOT NULL DEFAULT 'pendiente',
    metodo_pago ENUM('efectivo', 'transferencia'),
    consulta_token CHAR(64) UNIQUE,
    codigo_rastreo VARCHAR(32) UNIQUE,
    CONSTRAINT fk_pedidos_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB;

-- Tabla: datos de entrega conservados para cada pedido
CREATE TABLE pedido_entrega (
    pedido_id INT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    correo VARCHAR(150) NOT NULL,
    telefono VARCHAR(20) NOT NULL,
    direccion VARCHAR(255) NOT NULL,
    zona VARCHAR(50) NOT NULL,
    ciudad VARCHAR(100) NOT NULL,
    codigo_postal VARCHAR(20),
    CONSTRAINT fk_pedido_entrega_pedido
        FOREIGN KEY (pedido_id) REFERENCES pedidos(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB;

-- Tabla: detalles_pedido
CREATE TABLE detalles_pedido (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pedido_id INT NOT NULL,
    producto_id INT NOT NULL,
    cantidad INT NOT NULL DEFAULT 1,
    precio_unitario DECIMAL(10,2) NOT NULL,
    CONSTRAINT fk_detalles_pedido
        FOREIGN KEY (pedido_id) REFERENCES pedidos(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT fk_detalles_producto
        FOREIGN KEY (producto_id) REFERENCES productos(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
) ENGINE=InnoDB;

-- Tabla: resumen de cada orden para consulta rápida en DBeaver
CREATE TABLE resumen_pedidos (
    pedido_id INT PRIMARY KEY,
    usuario_id INT NOT NULL,
    nombre_cliente VARCHAR(100) NOT NULL,
    telefono VARCHAR(20),
    correo VARCHAR(150),
    direccion VARCHAR(255),
    total DECIMAL(10,2) NOT NULL,
    cantidad_articulos INT NOT NULL DEFAULT 0,
    fecha DATETIME NOT NULL,
    INDEX idx_resumen_fecha (fecha),
    CONSTRAINT fk_resumen_pedido
        FOREIGN KEY (pedido_id) REFERENCES pedidos(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB;

-- Catálogo inicial: 30 productos con precios, descripciones e imágenes locales.
INSERT INTO productos (nombre, descripcion, precio, categoria, imagen_url)
SELECT catalogo.nombre, catalogo.descripcion, catalogo.precio, catalogo.categoria, catalogo.imagen_url
FROM (
    SELECT 'Hamburguesa Clásica' AS nombre, 'Hamburguesa de carne a la plancha con queso, vegetales frescos y salsa de la casa, servida en pan suave.' AS descripcion, 49.00 AS precio, 'Platos Fuertes' AS categoria, '/img/hamburguesa.png' AS imagen_url
    UNION ALL SELECT 'Pizza Pepperoni', 'Pizza horneada con salsa de tomate, queso fundido y rodajas de pepperoni sobre una masa dorada.', 79.00, 'Platos Fuertes', '/img/pizza-pepperoni.webp'
    UNION ALL SELECT 'Alitas BBQ', 'Alitas de pollo bañadas en salsa barbacoa de sabor ahumado, ideales para compartir o disfrutar como entrada.', 54.00, 'Entradas', '/img/alitas-bbq.jpeg'
    UNION ALL SELECT 'Gaseosa de Cola', 'Bebida gaseosa de cola, servida fría para acompañar cualquiera de nuestros platillos.', 12.00, 'Bebidas', '/img/coca-cola.jpeg'
    UNION ALL SELECT 'Jocón Tradicional', 'Pollo en salsa verde de tomatillo, cilantro y pepitoria, acompañado de arroz al estilo guatemalteco.', 68.00, 'Tradicional', '/img/jocon.jpeg'
    UNION ALL SELECT 'Chomin Casero', 'Fideos salteados con verduras frescas y un recado ligero, preparados con el sabor de la cocina casera.', 59.00, 'Tradicional', '/img/chomin.jpeg'
    UNION ALL SELECT 'Chuchitos Típicos', 'Tamales de masa de maíz envueltos en tuza, rellenos con recado de tomate y carne, terminados con queso seco.', 15.00, 'Tradicional', '/img/chuchito.png'
    UNION ALL SELECT 'Brownies de Chocolate', 'Porción de brownie de chocolate con centro suave y cubierta ligeramente crujiente.', 24.00, 'Postres', '/img/brownies.webp'
    UNION ALL SELECT 'Bruschettas', 'Pan tostado con tomate fresco, hierbas y aceite de oliva; una entrada ligera para compartir.', 32.00, 'Entradas', '/img/bruschettas.webp'
    UNION ALL SELECT 'Camarones a la Diabla', 'Camarones salteados en salsa picante de chile y tomate, acompañados de arroz.', 89.00, 'Platos Fuertes', '/img/camaronesaladiabla.webp'
    UNION ALL SELECT 'Churrasco', 'Corte de res a la parrilla acompañado de guarnición y salsa de la casa.', 95.00, 'Platos Fuertes', '/img/churrasco.webp'
    UNION ALL SELECT 'Deditos de Queso', 'Bastones de queso empanizados y dorados, servidos con salsa para acompañar.', 35.00, 'Entradas', '/img/deditosdequeso.webp'
    UNION ALL SELECT 'Fiambre', 'Platillo tradicional guatemalteco con vegetales, embutidos y encurtidos, servido frío.', 85.00, 'Tradicional', '/img/fiambre.webp'
    UNION ALL SELECT 'Garnachas', 'Tortillas pequeñas y crujientes con carne, salsa de tomate, repollo y queso.', 38.00, 'Tradicional', '/img/garnachas.webp'
    UNION ALL SELECT 'Gelatinas', 'Porción de gelatina fresca de sabores variados, ideal para cerrar la comida.', 16.00, 'Postres', '/img/gelatinas.webp'
    UNION ALL SELECT 'Hilachas', 'Carne de res deshebrada en recado de tomate con papas, acompañada de arroz.', 72.00, 'Tradicional', '/img/hilachas.png'
    UNION ALL SELECT 'Horchata', 'Bebida fría y cremosa de arroz con un toque de canela.', 18.00, 'Bebidas', '/img/horchata.webp'
    UNION ALL SELECT 'Agua de Jamaica', 'Infusión fría de flor de jamaica, refrescante y ligeramente ácida.', 17.00, 'Bebidas', '/img/jamaica.webp'
    UNION ALL SELECT 'Jocotes en Miel', 'Jocotes cocidos lentamente en almíbar especiado, un postre tradicional.', 25.00, 'Postres', '/img/jocotesenmiel.webp'
    UNION ALL SELECT 'Lasaña', 'Capas de pasta al horno con salsa de tomate, carne y queso gratinado.', 68.00, 'Platos Fuertes', '/img/lasaña.webp'
    UNION ALL SELECT 'Mojito', 'Bebida fría de limón, hierbabuena y soda, servida con hielo.', 26.00, 'Bebidas', '/img/mojito.webp'
    UNION ALL SELECT 'Pechugas Rellenas', 'Pechuga de pollo rellena y dorada, acompañada de guarnición y salsa de la casa.', 78.00, 'Platos Fuertes', '/img/pechugasrellenas.webp'
    UNION ALL SELECT 'Pepián', 'Pollo en recado espeso de semillas tostadas y especias, acompañado de arroz.', 72.00, 'Tradicional', '/img/pepian.webp'
    UNION ALL SELECT 'Rellenitos', 'Plátanos rellenos de frijol dulce, fritos y espolvoreados con azúcar.', 24.00, 'Postres', '/img/rellenitos.webp'
    UNION ALL SELECT 'Salmón a la Plancha', 'Filete de salmón a la plancha con guarnición de vegetales frescos.', 98.00, 'Platos Fuertes', '/img/salmonalaplancha.webp'
    UNION ALL SELECT 'Refresco de Tamarindo', 'Bebida fría de tamarindo con sabor dulce y ácido.', 17.00, 'Bebidas', '/img/tamarindo.webp'
    UNION ALL SELECT 'Tiramisú de Limón', 'Postre cremoso en capas con un toque fresco de limón.', 29.00, 'Postres', '/img/tiramisudelimon.webp'
    UNION ALL SELECT 'Torrejas', 'Rebanadas de pan bañadas en miel especiada, preparadas al estilo tradicional.', 26.00, 'Postres', '/img/torrejas.webp'
    UNION ALL SELECT 'Tostadas', 'Tortillas de maíz crujientes con frijoles, verduras, salsa y queso.', 30.00, 'Tradicional', '/img/tostadas.webp'
    UNION ALL SELECT 'Vaso de Agua', 'Vaso de agua purificada, servido frío para acompañar tu comida.', 8.00, 'Bebidas', '/img/vasodeagua.jpg'
) AS catalogo
WHERE NOT EXISTS (
    SELECT 1 FROM productos AS existente
    WHERE existente.imagen_url = catalogo.imagen_url
       OR existente.nombre = catalogo.nombre
);

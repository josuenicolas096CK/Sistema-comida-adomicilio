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

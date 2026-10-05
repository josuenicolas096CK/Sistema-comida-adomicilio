-- Completa solo datos faltantes de los productos existentes.
UPDATE productos SET categoria = 'Platos Fuertes' WHERE nombre = 'Hamburguesa Clásica' AND (categoria IS NULL OR categoria = '');
UPDATE productos SET categoria = 'Platos Fuertes' WHERE nombre = 'Pizza Pepperoni' AND (categoria IS NULL OR categoria = '');
UPDATE productos SET categoria = 'Entradas' WHERE nombre = 'Alitas BBQ' AND (categoria IS NULL OR categoria = '');
UPDATE productos SET categoria = 'Bebidas' WHERE nombre = 'Gaseosa de Cola' AND (categoria IS NULL OR categoria = '');
UPDATE productos SET descripcion = 'Hamburguesa recién preparada con ingredientes frescos.' WHERE nombre = 'Hamburguesa Clásica' AND (descripcion IS NULL OR descripcion = '');
UPDATE productos SET descripcion = 'Pizza horneada con pepperoni y queso fundido.' WHERE nombre = 'Pizza Pepperoni' AND (descripcion IS NULL OR descripcion = '');
UPDATE productos SET descripcion = 'Alitas bañadas en salsa BBQ.' WHERE nombre = 'Alitas BBQ' AND (descripcion IS NULL OR descripcion = '');
UPDATE productos SET descripcion = 'Bebida fría para acompañar tu pedido.' WHERE nombre = 'Gaseosa de Cola' AND (descripcion IS NULL OR descripcion = '');

-- Los favoritos que antes estaban escritos directamente en index.html ahora viven en MySQL.
INSERT INTO productos (nombre, descripcion, precio, categoria, imagen_url)
SELECT 'Jocón Tradicional', 'Pollo tierno en salsa verde de tomatillo, cilantro y pepitoria, servido con arroz.', 68.00, 'Tradicional', '/docs/img/jocon.jpeg'
WHERE NOT EXISTS (SELECT 1 FROM productos WHERE nombre = 'Jocón Tradicional');
INSERT INTO productos (nombre, descripcion, precio, categoria, imagen_url)
SELECT 'Chomin Casero', 'Fideos tradicionales salteados con verduras frescas y recado aromático.', 59.50, 'Tradicional', '/docs/img/chomin.jpeg'
WHERE NOT EXISTS (SELECT 1 FROM productos WHERE nombre = 'Chomin Casero');
INSERT INTO productos (nombre, descripcion, precio, categoria, imagen_url)
SELECT 'Chuchitos Típicos', 'Tamales de masa de maíz con recado de tomate, carne y queso seco.', 13.00, 'Tradicional', '/docs/img/chuchito.png'
WHERE NOT EXISTS (SELECT 1 FROM productos WHERE nombre = 'Chuchitos Típicos');

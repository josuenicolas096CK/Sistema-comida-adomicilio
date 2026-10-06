-- Catálogo actual de La Buena Mesa.
-- Ejecutar sobre pedidos_db después de vaciarla; no cambia su estructura.
-- Los precios en quetzales son sugeridos y pueden editarse antes de ejecutar.
-- Las imágenes están en frontend/img y Express las sirve en /img.

USE pedidos_db;

INSERT INTO productos (nombre, descripcion, precio, categoria, imagen_url) VALUES
(
    'Hamburguesa Clásica',
    'Hamburguesa de carne a la plancha con queso, vegetales frescos y salsa de la casa, servida en pan suave.',
    49.00,
    'Platos Fuertes',
    '/img/hamburguesa.png'
),
(
    'Pizza Pepperoni',
    'Pizza horneada con salsa de tomate, queso fundido y rodajas de pepperoni sobre una masa dorada.',
    79.00,
    'Platos Fuertes',
    '/img/pizza-pepperoni.webp'
),
(
    'Alitas BBQ',
    'Alitas de pollo bañadas en salsa barbacoa de sabor ahumado, ideales para compartir o disfrutar como entrada.',
    54.00,
    'Entradas',
    '/img/alitas-bbq.jpeg'
),
(
    'Gaseosa de Cola',
    'Bebida gaseosa de cola, servida fría para acompañar cualquiera de nuestros platillos.',
    12.00,
    'Bebidas',
    '/img/coca-cola.jpeg'
),
(
    'Jocón Tradicional',
    'Pollo en salsa verde de tomatillo, cilantro y pepitoria, acompañado de arroz al estilo guatemalteco.',
    68.00,
    'Tradicional',
    '/img/jocon.jpeg'
),
(
    'Chomin Casero',
    'Fideos salteados con verduras frescas y un recado ligero, preparados con el sabor de la cocina casera.',
    59.00,
    'Tradicional',
    '/img/chomin.jpeg'
),
(
    'Chuchitos Típicos',
    'Tamales de masa de maíz envueltos en tuza, rellenos con recado de tomate y carne, terminados con queso seco.',
    15.00,
    'Tradicional',
    '/img/chuchito.png'
);

-- Comprobación rápida del catálogo cargado.
SELECT id, nombre, precio, categoria, imagen_url FROM productos ORDER BY id;

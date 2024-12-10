-- Crear roles
CREATE ROLE administrador;
CREATE ROLE cliente;
CREATE ROLE vendedor;


-- Asignar todos los permisos sobre todas las tablas de la base de datos al rol 'administrador'
GRANT ALL PRIVILEGES ON DATABASE tu_base_de_datos TO administrador;

-- Asignar permisos completos sobre las tablas
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO administrador;

-- Asignar permisos sobre secuencias (si las usas para autoincrementar)
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO administrador;


-- Asignar permisos de lectura sobre las tablas de productos, pedidos, y carrito
GRANT SELECT ON productos, pedidos, carrito TO cliente;

-- Permitir al cliente ver sus propios pedidos (suponiendo que 'usuario_id' es una columna relacionada)
GRANT SELECT ON pedidos TO cliente WHERE usuario_id = CURRENT_USER;


-- Asignar permisos de lectura sobre productos
GRANT SELECT ON productos TO vendedor;

-- Permitir al vendedor actualizar productos e inventario
GRANT UPDATE ON productos TO vendedor;

-- Permitir al vendedor ver y actualizar pedidos (en función de su estado)
GRANT SELECT, UPDATE ON pedidos TO vendedor WHERE estado IN ('Pendiente', 'Completado');


-- Asignar el rol 'administrador' a un usuario
GRANT administrador TO nombre_usuario;

-- Asignar el rol 'cliente' a un usuario
GRANT cliente TO nombre_usuario;

-- Asignar el rol 'vendedor' a un usuario
GRANT vendedor TO nombre_usuario;

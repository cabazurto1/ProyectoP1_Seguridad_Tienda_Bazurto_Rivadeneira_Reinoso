const express = require('express');
const router = express.Router();
const { Client } = require('pg');

// Conexión a PostgreSQL
const client = new Client({
  connectionString: process.env.DATABASE_URL,
});
client.connect();

// Ruta para obtener todos los pedidos
router.get('/', async (req, res) => {
  try {
    const result = await client.query('SELECT * FROM pedidos');
    res.json(result.rows);
  } catch (err) {
    console.error('Error al consultar pedidos', err);
    res.status(500).send('Error en el servidor');
  }
});

// Ruta para crear un pedido y actualizar el stock
router.post('/', async (req, res) => {
  const { usuario_id, productos } = req.body; // productos: [{ producto_id, cantidad }]

  try {
    await client.query('BEGIN'); // Iniciar transacción

    let total = 0; // Total del pedido

    // Obtener los IDs de los productos para hacer una consulta masiva
    const productIds = productos.map(item => item.producto_id);

    // Consultar el stock y precio de todos los productos solicitados en una sola consulta
    const result = await client.query(
      'SELECT id, stock, precio FROM productos WHERE id = ANY($1)',
      [productIds]
    );

    // Mapear los resultados de la consulta para tener acceso fácil al stock y precio
    const productosStock = result.rows.reduce((acc, row) => {
      acc[row.id] = { stock: row.stock, precio: row.precio };
      return acc;
    }, {});

    // Verificar y actualizar stock de productos
    for (const item of productos) {
      const { producto_id, cantidad } = item;
      const { stock, precio } = productosStock[producto_id];

      if (!stock) throw new Error(`Producto con ID ${producto_id} no encontrado.`);
      if (stock < cantidad) throw new Error(`Stock insuficiente para el producto con ID ${producto_id}.`);

      // Reducir el stock
      await client.query('UPDATE productos SET stock = stock - $1 WHERE id = $2', [cantidad, producto_id]);

      // Sumar al total del pedido
      total += cantidad * precio;
    }

    // Crear el pedido
    const pedidoResult = await client.query(
      'INSERT INTO pedidos (usuario_id, total, estado) VALUES ($1, $2, $3) RETURNING id',
      [usuario_id, total, 'Pendiente']
    );
    const pedidoId = pedidoResult.rows[0].id;

    // Registrar los productos en el carrito asociado al pedido
    for (const item of productos) {
      const { producto_id, cantidad } = item;
      await client.query(
        'INSERT INTO carrito (usuario_id, producto_id, cantidad) VALUES ($1, $2, $3)',
        [usuario_id, producto_id, cantidad]
      );
    }

    await client.query('COMMIT'); // Confirmar transacción
    res.status(201).json({ pedidoId, total });
  } catch (error) {
    await client.query('ROLLBACK'); // Revertir transacción
    console.error('Error al procesar el pedido:', error);
    res.status(400).json({ error: error.message });
  }
});

// Ruta para actualizar el estado de un pedido
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { estado } = req.body;

  try {
    const result = await client.query(
      'UPDATE pedidos SET estado = $1 WHERE id = $2 RETURNING *',
      [estado, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).send('Pedido no encontrado');
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error al actualizar pedido', err);
    res.status(500).send('Error en el servidor');
  }
});

// Ruta para eliminar un pedido
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await client.query('DELETE FROM pedidos WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).send('Pedido no encontrado');
    }
    res.status(204).send();
  } catch (err) {
    console.error('Error al eliminar pedido', err);
    res.status(500).send('Error en el servidor');
  }
});

module.exports = router;

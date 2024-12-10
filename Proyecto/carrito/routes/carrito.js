const express = require('express');
const router = express.Router();
const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

client.connect();

// Ruta para obtener todos los items del carrito
router.get('/', async (req, res) => {
  try {
    const result = await client.query('SELECT * FROM carrito');
    res.json(result.rows);
  } catch (err) {
    console.error('Error en la consulta', err);
    res.status(500).send('Error en el servidor');
  }
});

// Ruta para agregar un producto al carrito
router.post('/', async (req, res) => {
  const { producto_id, cantidad, precio_total } = req.body;

  try {
    const result = await client.query(
      'INSERT INTO carrito (producto_id, cantidad, precio_total) VALUES ($1, $2, $3) RETURNING *',
      [producto_id, cantidad, precio_total]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error al insertar en el carrito', err);
    res.status(500).send('Error en el servidor');
  }
});

// Ruta para actualizar un producto en el carrito
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { producto_id, cantidad, precio_total } = req.body;

  try {
    const result = await client.query(
      'UPDATE carrito SET producto_id = $1, cantidad = $2, precio_total = $3 WHERE id = $4 RETURNING *',
      [producto_id, cantidad, precio_total, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).send('Item en carrito no encontrado');
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error al actualizar el carrito', err);
    res.status(500).send('Error en el servidor');
  }
});

// Ruta para eliminar un producto del carrito
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await client.query('DELETE FROM carrito WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).send('Item en carrito no encontrado');
    }

    res.status(204).send();
  } catch (err) {
    console.error('Error al eliminar el producto del carrito', err);
    res.status(500).send('Error en el servidor');
  }
});

module.exports = router;

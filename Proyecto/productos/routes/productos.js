const express = require('express');
const router = express.Router();
const { Client } = require('pg');

// Configuración para la conexión a la base de datos PostgreSQL
const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

client.connect();

// Ruta para obtener todos los productos
router.get('/', async (req, res) => {
  try {
    const result = await client.query('SELECT * FROM productos');
    res.json(result.rows);
  } catch (err) {
    console.error('Error en la consulta', err);
    res.status(500).send('Error en el servidor');
  }
});

// Ruta para agregar un nuevo producto
router.post('/', async (req, res) => {
  const { nombre, descripcion, precio, categoria, stock, imagenes } = req.body;

  try {
    const result = await client.query(
      'INSERT INTO productos (nombre, descripcion, precio, categoria, stock, imagenes) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [nombre, descripcion, precio, categoria, stock, JSON.stringify(imagenes)]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error al insertar el producto', err);
    res.status(500).send('Error en el servidor');
  }
});

// Ruta para actualizar un producto
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { nombre, descripcion, precio, categoria, stock, imagenes } = req.body;

  try {
    const result = await client.query(
      'UPDATE productos SET nombre = $1, descripcion = $2, precio = $3, categoria = $4, stock = $5, imagenes = $6 WHERE id = $7 RETURNING *',
      [nombre, descripcion, precio, categoria, stock, JSON.stringify(imagenes), id]
    );

    if (result.rows.length === 0) {
      return res.status(404).send('Producto no encontrado');
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error al actualizar el producto', err);
    res.status(500).send('Error en el servidor');
  }
});

// Ruta para eliminar un producto
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await client.query('DELETE FROM productos WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).send('Producto no encontrado');
    }

    res.status(204).send();
  } catch (err) {
    console.error('Error al eliminar el producto', err);
    res.status(500).send('Error en el servidor');
  }
});

module.exports = router;

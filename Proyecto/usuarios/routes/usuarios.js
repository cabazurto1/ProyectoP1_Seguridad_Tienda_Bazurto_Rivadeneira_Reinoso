const express = require('express');
const router = express.Router();
const { Client } = require('pg');

// Configuración para la conexión a la base de datos PostgreSQL
const client = new Client({
  connectionString: process.env.DATABASE_URL,
});
client.connect();

// Ruta para obtener todos los usuarios
router.get('/', async (req, res) => {
  try {
    const result = await client.query('SELECT * FROM usuarios');
    res.json(result.rows);
  } catch (err) {
    console.error('Error en la consulta', err);
    res.status(500).send('Error en el servidor');
  }
});

// Ruta para crear un nuevo usuario
router.post('/', async (req, res) => {
  const { nombre, email, password, rol } = req.body;

  try {
    const result = await client.query(
      'INSERT INTO usuarios (nombre, email, password, rol) VALUES ($1, $2, $3, $4) RETURNING *',
      [nombre, email, password, rol]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error al insertar el usuario', err);
    res.status(500).send('Error en el servidor');
  }
});

// Ruta para actualizar un usuario
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { nombre, email, password, rol } = req.body;

  try {
    const result = await client.query(
      'UPDATE usuarios SET nombre = $1, email = $2, password = $3, rol = $4 WHERE id = $5 RETURNING *',
      [nombre, email, password, rol, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).send('Usuario no encontrado');
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error al actualizar el usuario', err);
    res.status(500).send('Error en el servidor');
  }
});

// Ruta para eliminar un usuario
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await client.query('DELETE FROM usuarios WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).send('Usuario no encontrado');
    }

    res.status(204).send();
  } catch (err) {
    console.error('Error al eliminar el usuario', err);
    res.status(500).send('Error en el servidor');
  }
});

module.exports = router;

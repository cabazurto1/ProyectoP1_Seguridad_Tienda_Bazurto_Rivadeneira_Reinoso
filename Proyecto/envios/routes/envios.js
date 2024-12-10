const express = require('express');
const router = express.Router();
const { Client } = require('pg');

// Configuración para la conexión a la base de datos PostgreSQL
const client = new Client({
  connectionString: process.env.DATABASE_URL,  // Asegúrate de que la variable de entorno DATABASE_URL esté configurada correctamente
});
client.connect();

// Ruta para obtener todos los envíos
router.get('/', async (req, res) => {
  try {
    const result = await client.query('SELECT * FROM envios');
    res.json(result.rows);  // Devuelve todos los envíos
  } catch (err) {
    console.error('Error al obtener los envíos', err);
    res.status(500).send('Error en el servidor');
  }
});

// Ruta para obtener un envío por ID
router.get('/:id', async (req, res) => {
  const { id } = req.params;  // Obtener el id del parámetro en la URL
  try {
    const result = await client.query('SELECT * FROM envios WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).send('Envío no encontrado');
    }
    res.json(result.rows[0]);  // Devuelve el envío encontrado
  } catch (err) {
    console.error('Error al obtener el envío', err);
    res.status(500).send('Error en el servidor');
  }
});

// Ruta para crear un nuevo envío
router.post('/', async (req, res) => {
  const { pedido_id, direccion } = req.body;  // Datos enviados en el cuerpo de la solicitud
  try {
    const result = await client.query(
      'INSERT INTO envios (pedido_id, direccion, estado) VALUES ($1, $2, $3) RETURNING *',
      [pedido_id, direccion, 'En Proceso']  // Estado inicial del envío
    );
    res.status(201).json(result.rows[0]);  // Devuelve el envío creado
  } catch (err) {
    console.error('Error al crear el envío', err);
    res.status(500).send('Error en el servidor');
  }
});

// Ruta para actualizar el estado de un envío
router.put('/:id', async (req, res) => {
  const { id } = req.params;  // Obtener el id del parámetro en la URL
  const { estado } = req.body;  // Estado a actualizar

  try {
    const result = await client.query(
      'UPDATE envios SET estado = $1 WHERE id = $2 RETURNING *',
      [estado, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).send('Envío no encontrado');
    }
    res.json(result.rows[0]);  // Devuelve el envío actualizado
  } catch (err) {
    console.error('Error al actualizar el estado del envío', err);
    res.status(500).send('Error en el servidor');
  }
});

// Ruta para eliminar un envío
router.delete('/:id', async (req, res) => {
  const { id } = req.params;  // Obtener el id del parámetro en la URL

  try {
    const result = await client.query('DELETE FROM envios WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).send('Envío no encontrado');
    }
    res.status(204).send();  // Envío eliminado exitosamente
  } catch (err) {
    console.error('Error al eliminar el envío', err);
    res.status(500).send('Error en el servidor');
  }
});

module.exports = router;

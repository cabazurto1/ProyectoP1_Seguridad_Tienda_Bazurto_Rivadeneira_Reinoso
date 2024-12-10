const express = require('express');
const router = express.Router();
const { Client } = require('pg');

// Configuración de PostgreSQL
const client = new Client({
  connectionString: process.env.DATABASE_URL,
});
client.connect();

// Crear un nuevo ticket
router.post('/', async (req, res) => {
  const { usuario_id, mensaje } = req.body;

  try {
    const query = `
      INSERT INTO tickets (usuario_id, mensaje, estado)
      VALUES ($1, $2, 'Abierto') RETURNING *
    `;
    const result = await client.query(query, [usuario_id, mensaje]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error al crear ticket:', error);
    res.status(500).send('Error al crear ticket.');
  }
});

// Listar tickets abiertos por usuario
router.get('/abiertos/:usuario_id', async (req, res) => {
  const { usuario_id } = req.params;

  try {
    const query = `
      SELECT id, mensaje, estado 
      FROM tickets 
      WHERE usuario_id = $1 AND estado = 'Abierto'
    `;
    const result = await client.query(query, [usuario_id]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error al listar tickets:', error);
    res.status(500).send('Error al listar tickets.');
  }
});

// Cerrar un ticket
router.put('/cerrar/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const query = `
      UPDATE tickets SET estado = 'Cerrado'
      WHERE id = $1 AND estado = 'Abierto' RETURNING *
    `;
    const result = await client.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).send('Ticket no encontrado o ya cerrado.');
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error al cerrar ticket:', error);
    res.status(500).send('Error al cerrar ticket.');
  }
});

module.exports = router;

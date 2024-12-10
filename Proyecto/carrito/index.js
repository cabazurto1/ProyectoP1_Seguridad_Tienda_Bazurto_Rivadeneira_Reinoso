const express = require('express');
const { Client } = require('pg');
const app = express();
const port = 3002;

// Conexión a la base de datos PostgreSQL
const client = new Client({
  connectionString: process.env.DATABASE_URL, // La URL de la base de datos PostgreSQL
});

client.connect();

// Middleware para parsear JSON
app.use(express.json());

// Importamos las rutas de carrito
const carritoRoutes = require('./routes/carrito');
app.use('/carrito', carritoRoutes);  // La ruta base para carrito es "/carrito"

// Iniciamos el servidor
app.listen(port, () => {
  console.log(`Microservicio de carrito corriendo en http://localhost:${port}`);
});

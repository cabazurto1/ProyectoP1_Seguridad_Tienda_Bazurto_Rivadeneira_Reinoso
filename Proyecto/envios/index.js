const express = require('express');
const { Client } = require('pg');
const app = express();
const port = 3005;

// Importar el router de envios.js
const enviosRouter = require('./routes/envios');  // Asegúrate de que la ruta sea correcta

// Conexión a la base de datos PostgreSQL
const client = new Client({
  connectionString: process.env.DATABASE_URL,  // Asegúrate de tener la variable de entorno DATABASE_URL configurada
});

client.connect();

app.use(express.json());  // Middleware para parsear el cuerpo de las solicitudes como JSON

// Usar el router para las rutas relacionadas con 'envios'
app.use('/envios', enviosRouter);

app.listen(port, () => {
  console.log(`Microservicio de envíos corriendo en http://localhost:${port}`);
});

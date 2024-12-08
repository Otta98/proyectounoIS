'use strict';
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize'); // Prevenir inyecciones NoSQL
const xss = require('xss-clean'); // Limpiar datos de entradas para prevenir XSS

const apiRoutes = require('./routes/api.js');
const fccTestingRoutes = require('./routes/fcctesting.js');
const runner = require('./test-runner');

const app = express();

// Middleware de seguridad
app.use(helmet()); // Encabezados seguros
app.use(cors({ origin: '*' })); // Solo para propósitos de prueba
app.use(mongoSanitize()); // Limpiar consultas de MongoDB
app.use(xss()); // Prevenir Cross-Site Scripting (XSS)

// Límite de tasa para prevenir abuso
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // Máximo de 100 solicitudes por IP
});
app.use(limiter);

// Servir archivos estáticos
app.use('/public', express.static(process.cwd() + '/public'));

// Analizar cuerpo de las solicitudes
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Página de inicio
app.route('/')
  .get(function (req, res) {
    res.sendFile(process.cwd() + '/views/index.html');
  });

// Rutas para pruebas de FCC
fccTestingRoutes(app);

// Rutas de la API
apiRoutes(app);

// Middleware para 404
app.use(function (req, res, next) {
  res.status(404)
    .type('text')
    .send('Not Found');
});

// Iniciar servidor y pruebas
const listener = app.listen(process.env.PORT || 3000, function () {
  console.log('Your app is listening on port ' + listener.address().port);
  if (process.env.NODE_ENV === 'test') {
    console.log('Running Tests...');
    setTimeout(function () {
      try {
        runner.run();
      } catch (e) {
        console.log('Tests are not valid:');
        console.error(e);
      }
    }, 3500);
  }
});

module.exports = app; // Para pruebas


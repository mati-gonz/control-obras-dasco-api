const express = require("express");
const bodyParser = require("body-parser");
const { sequelize } = require("./models");
const morgan = require("morgan");
const helmet = require("helmet");
const logger = require("./middleware/logger");
const cors = require("cors");
require("dotenv").config(); // Cargar variables de entorno

const app = express();
const PORT = process.env.PORT || 3000;

// Confía en el primer proxy
app.set("trust proxy", 1); // 1 para confiar en el primer proxy

// Configurar el límite de tamaño para el parsing de JSON y URL encoded
app.use(bodyParser.json({ limit: "10mb" })); // Límite de 10 MB para JSON
app.use(bodyParser.urlencoded({ limit: "10mb", extended: true }));

// O si estás usando `express.json()` directamente sin body-parser:
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// Verificar el entorno de ejecución
const isDevelopment = process.env.NODE_ENV === "development";

// Configurar CORS
app.use(
  cors({
    origin: process.env.FRONTEND_URL, // Asegúrate de tener un FRONTEND_URL definido en producción
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    credentials: true,
  }),
);

// Middleware para procesar JSON
app.use(express.json());

// Configurar logging de solicitudes HTTP
app.use(
  morgan("combined", {
    stream: { write: (message) => logger.info(message.trim()) },
  }),
);

app.use(helmet());

// Importar rutas
const routes = require("./routes");
app.use("/api", routes);

// Middleware para manejar errores
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  // Agrega 'next' como cuarto parámetro
  logger.error(err.message);
  const statusCode = err.status || 500;
  res.status(statusCode).json({
    error: err.message || "Ocurrió un error interno",
  });
});

// Sincronizar la base de datos solo en desarrollo
if (isDevelopment) {
  sequelize
    .sync({ alter: true }) // Sincroniza con alter en desarrollo
    .then(() => {
      app.listen(PORT, () => {
        logger.info(
          `Servidor corriendo en modo desarrollo en el puerto ${PORT}`,
        );
        console.log("Base de datos sincronizada en desarrollo.");
      });
    })
    .catch((err) => {
      logger.error("Error al sincronizar la base de datos:", err);
    });
} else {
  // En producción, solo iniciar el servidor sin sincronizar la base de datos
  app.listen(PORT, () => {
    logger.info(`Servidor corriendo en modo producción en el puerto ${PORT}`);
  });
}

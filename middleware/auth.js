const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "secret";

const verifyToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // El token se espera en el formato "Bearer <token>"

  if (!token) {
    return res.status(401).json({ message: "Acceso denegado" });
  }

  try {
    const verified = jwt.verify(token, JWT_SECRET);
    req.user = verified;
    next(); // Continúa con la siguiente función o ruta
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      // Token expirado
      return res.status(401).json({ message: "Token expirado" });
    } else {
      // Otros errores, como token no válido
      return res.status(403).json({ message: "Token no válido" });
    }
  }
};

module.exports = verifyToken;

// middleware/role.js

const verifyRole = (allowedRoles) => {
  return (req, res, next) => {
    const { role } = req.user;

    // Verificar si el rol del usuario está dentro de los roles permitidos
    if (!allowedRoles.includes(role)) {
      return res.status(403).json({
        message:
          "Acceso denegado: No tienes permiso para realizar esta acción.",
      });
    }

    // Si el rol está permitido, continuar
    next();
  };
};

module.exports = verifyRole;

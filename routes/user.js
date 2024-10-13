const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { User, Work } = require("../models");
const verifyToken = require("../middleware/auth");
const verifyRole = require("../middleware/role");
const rateLimit = require("express-rate-limit");
const router = express.Router();
const { body, validationResult } = require("express-validator");
const owasp = require("owasp-password-strength-test");

// Clave secreta para firmar el JWT (debe almacenarse de manera segura)
const JWT_SECRET = process.env.JWT_SECRET || "secret";
const JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || "default_refresh_secret"; // Nueva clave para el token de refresco

// Configurar el rate limiter
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10, // Limita cada IP a 10 solicitudes por 'windowMs'
  message:
    "Demasiados intentos de login desde esta IP. Por favor, inténtalo de nuevo después de 15 minutos.",
});

router.post(
  "/register",
  [
    body("name")
      .trim()
      .notEmpty()
      .withMessage("El nombre es obligatorio")
      .escape(),
    body("email")
      .isEmail()
      .withMessage("Debe ser un correo electrónico válido")
      .normalizeEmail(),
    body("password").custom((value) => {
      const result = owasp.test(value);
      if (!result.strong) {
        throw new Error(
          "La contraseña no cumple con los requisitos de fortaleza: " +
            result.errors.join(" "),
        );
      }
      return true;
    }),
    body("role")
      .isIn(["admin", "user"])
      .withMessage('El rol debe ser "admin" o "user"')
      .escape(),
  ],
  verifyToken,
  verifyRole(["admin"]),
  async (req, res) => {
    // Validar y manejar los errores
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password, role } = req.body;
    try {
      const hashedPassword = await bcrypt.hash(password, 12);
      const newUser = await User.create({
        name,
        email,
        password: hashedPassword,
        role,
      });
      res
        .status(201)
        .json({ message: "Usuario creado con éxito", user: newUser });
    } catch (error) {
      res.status(500).json({ message: "Error al registrar usuario", error });
    }
  },
);

// Ruta para login con validación de entrada
router.post(
  "/login",
  loginLimiter, // Aplica el limitador de intentos de login
  [
    body("email")
      .isEmail()
      .withMessage("Debe ser un correo electrónico válido")
      .normalizeEmail(),
    body("password")
      .notEmpty()
      .withMessage("La contraseña es obligatoria")
      .escape(),
  ],
  async (req, res) => {
    // Validar y manejar los errores
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;
    try {
      const user = await User.findOne({ where: { email } });
      if (!user)
        return res.status(404).json({ message: "Usuario no encontrado" });

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword)
        return res.status(401).json({ message: "Contraseña incorrecta" });

      const accessToken = jwt.sign(
        { userId: user.id, role: user.role },
        JWT_SECRET,
        { expiresIn: "20m" },
      );
      const refreshToken = jwt.sign(
        { userId: user.id, role: user.role },
        JWT_REFRESH_SECRET,
        { expiresIn: "7d" },
      );

      res.json({ accessToken, refreshToken });
    } catch (error) {
      res.status(500).json({ message: "Error al iniciar sesión", error });
    }
  },
);

// Nueva ruta para refrescar el token de acceso
router.post("/refresh-token", async (req, res) => {
  const { refreshToken } = req.body;

  // Verificamos que el refreshToken haya sido enviado
  if (!refreshToken) {
    return res.status(401).json({ message: "Token de refresco es requerido" });
  }

  try {
    // Verificamos que el refreshToken sea válido
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    // Generamos un nuevo token de acceso (AccessToken)
    const newAccessToken = jwt.sign(
      { userId: decoded.userId, role: decoded.role },
      JWT_SECRET,
      { expiresIn: "20m" }, // Expira en 15 minutos, por ejemplo
    );

    // Enviamos el nuevo AccessToken
    res.json({ accessToken: newAccessToken });
  } catch (error) {
    // Si el refreshToken no es válido o ha expirado, devolvemos un error 403
    console.error("Error verificando token de refresco:", error);
    return res
      .status(403)
      .json({ message: "Token de refresco no válido o ha expirado" });
  }
});

// Ruta para obtener los detalles del usuario autenticado
router.get("/me", verifyToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.userId, {
      attributes: { exclude: ["password"] },
    });
    if (!user)
      return res.status(404).json({ message: "Usuario no encontrado" });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener el usuario", error });
  }
});

// Obtener todos los usuarios con paginación (solo admin)
router.get("/", verifyToken, verifyRole(["admin"]), async (req, res) => {
  const { page = 1, limit = 10 } = req.query; // Paginación por defecto
  const offset = (page - 1) * limit;

  try {
    const users = await User.findAndCountAll({
      offset,
      limit,
      attributes: ["id", "name", "email", "role"], // Seleccionamos solo los campos necesarios
    });

    // Respuesta con datos de paginación
    res.json({
      data: users.rows, // Datos de usuarios para la página actual
      totalItems: users.count, // Número total de usuarios
      totalPages: Math.ceil(users.count / limit), // Total de páginas
      currentPage: page, // Página actual
    });
  } catch (error) {
    res.status(500).json({ message: "Error al obtener los usuarios", error });
  }
});

// Ruta para obtener detalles de un usuario específico junto con sus obras
router.get("/:id", verifyToken, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);

    // Caso 1: Si el usuario está intentando acceder a su propio perfil
    if (req.user.userId === userId) {
      const user = await User.findByPk(userId, {
        attributes: { exclude: ["password"] }, // Excluir la contraseña
        include: { model: Work, as: "works" },
      });

      if (!user) {
        return res.status(404).json({ message: "Usuario no encontrado" });
      }

      return res.json({ data: user });
    }

    // Caso 2: Si el usuario está intentando acceder al perfil de otro usuario, verificar si es admin
    if (req.user.role === "admin") {
      const user = await User.findByPk(userId, {
        attributes: { exclude: ["password"] }, // Excluir la contraseña
        include: { model: Work, as: "works" },
      });

      if (!user) {
        return res.status(404).json({ message: "Usuario no encontrado" });
      }

      return res.json({ data: user });
    }

    // Caso 3: Si el usuario no es admin y está intentando acceder al perfil de otro usuario, bloquear la acción
    return res
      .status(403)
      .json({ message: "No tienes permiso para acceder a este perfil." });
  } catch (error) {
    console.error("Error al obtener el usuario:", error);
    return res
      .status(500)
      .json({ message: "Error al obtener el usuario.", error });
  }
});

// Actualizar un usuario (admin puede actualizar todo, usuario puede cambiar solo su contraseña)
router.put(
  "/:id",
  [
    // Validación de entrada
    body("name")
      .optional()
      .trim()
      .notEmpty()
      .withMessage("El nombre no debe estar vacío")
      .escape(),
    body("email")
      .optional()
      .isEmail()
      .withMessage("Debe ser un correo electrónico válido")
      .normalizeEmail(),
    body("password")
      .optional()
      .isLength({ min: 8 })
      .withMessage("La contraseña debe tener al menos 8 caracteres")
      .matches(/[A-Z]/)
      .withMessage("La contraseña debe contener al menos una letra mayúscula")
      .matches(/[a-z]/)
      .withMessage("La contraseña debe contener al menos una letra minúscula")
      .matches(/\d/)
      .withMessage("La contraseña debe contener al menos un número")
      .matches(/[!@#$%^&*(),.?":{}|<>]/)
      .withMessage("La contraseña debe contener al menos un carácter especial")
      .escape(),
    body("currentPassword").optional().escape(), // Se requiere la contraseña actual para cambiar la contraseña
  ],
  verifyToken,
  async (req, res) => {
    // Validar y manejar los errores
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, role, password, currentPassword } = req.body;
    const userId = req.params.id;

    try {
      const user = await User.findByPk(userId);
      if (!user)
        return res.status(404).json({ message: "Usuario no encontrado" });

      // Caso 1: Si es un usuario regular y está intentando actualizar a otro usuario, no permitimos.
      if (req.user.role !== "admin" && req.user.userId !== parseInt(userId)) {
        return res
          .status(403)
          .json({ message: "No tienes permiso para modificar este usuario." });
      }

      // Caso 2: Si es un usuario regular y quiere cambiar su contraseña, validar la contraseña actual
      if (req.user.role === "user" && password) {
        if (!currentPassword) {
          return res.status(400).json({
            message:
              "Debes proporcionar la contraseña actual para cambiar la contraseña.",
          });
        }

        const validPassword = await bcrypt.compare(
          currentPassword,
          user.password,
        );
        if (!validPassword) {
          return res
            .status(401)
            .json({ message: "La contraseña actual es incorrecta." });
        }

        // Hashear la nueva contraseña
        const hashedPassword = await bcrypt.hash(password, 12);
        await user.update({ password: hashedPassword });
        return res.json({ message: "Contraseña actualizada con éxito" });
      }

      // Caso 3: Si es un admin, puede actualizar cualquier campo
      if (req.user.role === "admin") {
        const updateData = { name, email, role };
        if (password) {
          updateData.password = await bcrypt.hash(password, 12);
        }
        await user.update(updateData);
        return res.json({ message: "Usuario actualizado con éxito", user });
      }

      res.status(400).json({
        message: "No se ha proporcionado ninguna actualización válida.",
      });
    } catch (error) {
      res
        .status(500)
        .json({ message: "Error al actualizar el usuario", error });
    }
  },
);

// Ruta para eliminar un usuario (solo admin)
router.delete("/:id", verifyToken, verifyRole(["admin"]), async (req, res) => {
  try {
    // Verificar si el usuario existe
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    // Verificar si el usuario es un administrador
    if (user.role === "admin") {
      return res.status(403).json({
        message: "No se puede eliminar a un administrador.",
      });
    }

    // Verificar si el usuario tiene obras a cargo
    const userWorks = await Work.findAll({ where: { adminId: req.params.id } });
    if (userWorks.length > 0) {
      return res.status(400).json({
        message: "No se puede eliminar el usuario porque tiene obras a cargo.",
      });
    }

    // Si pasa todas las validaciones, eliminar el usuario
    await user.destroy();
    return res.status(200).json({ message: "Usuario eliminado con éxito." });
  } catch (error) {
    console.error("Error al eliminar el usuario:", error);
    return res.status(500).json({
      message: "Error al eliminar el usuario. Por favor, inténtelo nuevamente.",
      error: error.message,
    });
  }
});

module.exports = router;

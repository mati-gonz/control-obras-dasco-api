// routes/work.js
const express = require("express");
const { Work } = require("../models");
const verifyToken = require("../middleware/auth");
const verifyRole = require("../middleware/role");
const router = express.Router();

// Crear una nueva obra
router.post("/", verifyToken, verifyRole(["admin"]), async (req, res) => {
  const { name, startDate, endDate, totalBudget, adminId } = req.body;
  try {
    const newWork = await Work.create({
      name,
      startDate,
      endDate,
      totalBudget,
      adminId,
    });
    res.status(201).json(newWork);
  } catch (error) {
    res.status(500).json({ message: "Error al crear la obra", error });
  }
});

// Obtener todas las obras pertinentes para el usuario autenticado con paginación
router.get(
  "/",
  verifyToken,
  verifyRole(["admin", "user"]),
  async (req, res) => {
    const { page = 1, limit = 10 } = req.query; // Por defecto, página 1 y 10 resultados por página
    const offset = (page - 1) * limit; // Calcula el desplazamiento de los resultados

    try {
      let works;
      if (req.user.role === "admin") {
        works = await Work.findAndCountAll({
          offset,
          limit,
          attributes: [
            "id",
            "name",
            "startDate",
            "endDate",
            "totalBudget",
            "adminId",
            "isArchived",
          ],
        });
      } else {
        works = await Work.findAndCountAll({
          where: { adminId: req.user.userId },
          offset,
          limit,
          attributes: [
            "id",
            "name",
            "startDate",
            "endDate",
            "totalBudget",
            "adminId",
            "isArchived",
          ],
        });
      }

      // Respuesta con datos de paginación
      res.json({
        data: works.rows, // Los datos de la página actual
        totalItems: works.count, // Número total de obras
        totalPages: Math.ceil(works.count / limit), // Total de páginas
        currentPage: page, // Página actual
      });
    } catch (error) {
      res.status(500).json({ message: "Error al obtener las obras", error });
    }
  },
);

// Obtener una obra por ID
router.get(
  "/:id",
  verifyToken,
  verifyRole(["admin", "user"]),
  async (req, res) => {
    try {
      const work = await Work.findByPk(req.params.id);

      if (!work) {
        return res.status(404).json({ message: "Obra no encontrada" });
      }

      // Si el usuario no es admin, verificar que es el administrador de la obra
      if (req.user.role !== "admin" && work.adminId !== req.user.userId) {
        return res
          .status(403)
          .json({ message: "No tienes acceso a esta obra" });
      }

      res.json(work);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener la obra", error });
    }
  },
);

// Actualizar una obra (solo admin)
router.put("/:id", verifyToken, verifyRole(["admin"]), async (req, res) => {
  const { name, startDate, endDate, totalBudget, adminId } = req.body;
  try {
    const work = await Work.findByPk(req.params.id);

    if (!work) {
      return res.status(404).json({ message: "Obra no encontrada" });
    }

    // Actualizar la obra
    await work.update({ name, startDate, endDate, totalBudget, adminId });
    res.json(work);
  } catch (error) {
    res.status(500).json({ message: "Error al actualizar la obra", error });
  }
});

// Eliminar una obra (solo admin)
router.delete("/:id", verifyToken, verifyRole(["admin"]), async (req, res) => {
  try {
    const work = await Work.findByPk(req.params.id);

    if (!work) {
      return res.status(404).json({ message: "Obra no encontrada" });
    }

    // Eliminar la obra
    await work.destroy();
    res.json({ message: "Obra eliminada con éxito" });
  } catch (error) {
    res.status(500).json({ message: "Error al eliminar la obra", error });
  }
});

module.exports = router;

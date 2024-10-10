const express = require("express");
const { Subgroup, Work } = require("../models");
const verifyToken = require("../middleware/auth");
const verifyRole = require("../middleware/role");
const router = express.Router();

// Crear un nuevo subgrupo dentro de una obra específica
router.post(
  "/:work_id/subgroups",
  verifyToken,
  verifyRole(["admin", "user"]),
  async (req, res) => {
    const { name, budget } = req.body;
    const workId = req.params.work_id;

    try {
      // Verificar que el usuario es admin o administrador de la obra
      const work = await Work.findByPk(workId);
      if (
        !work ||
        (req.user.role !== "admin" && work.adminId !== req.user.userId)
      ) {
        return res.status(403).json({
          message: "No tienes permiso para crear subgrupos en esta obra.",
        });
      }

      const newSubgroup = await Subgroup.create({ name, workId, budget });
      res.status(201).json(newSubgroup);
    } catch (error) {
      console.error("Error al crear el subgrupo:", error); // Asegúrate de capturar e imprimir el error completo
      res
        .status(500)
        .json({ message: "Error al crear el subgrupo", error: error.message });
    }
  },
);

// Obtener todos los subgrupos de una obra específica con paginación
router.get(
  "/:work_id/subgroups",
  verifyToken,
  verifyRole(["admin", "user"]),
  async (req, res) => {
    const workId = req.params.work_id;

    try {
      const subgroups = await Subgroup.findAll({ where: { workId } }); // Sin paginación para pruebas

      res.json({ data: subgroups });
    } catch (error) {
      console.error("Error al obtener los subgrupos:", error);
      res
        .status(500)
        .json({ message: "Error al obtener los subgrupos", error });
    }
  },
);

// Obtener un subgrupo por ID
router.get(
  "/subgroups/:id",
  verifyToken,
  verifyRole(["admin", "user"]),
  async (req, res) => {
    try {
      const subgroup = await Subgroup.findByPk(req.params.id);

      if (!subgroup) {
        return res.status(404).json({ message: "Subgrupo no encontrado" });
      }

      // Verificar que el usuario es admin o administrador de la obra asociada al subgrupo
      const work = await Work.findByPk(subgroup.workId);
      if (req.user.role !== "admin" && work.adminId !== req.user.userId) {
        return res
          .status(403)
          .json({ message: "No tienes acceso a este subgrupo." });
      }

      res.json(subgroup);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener el subgrupo", error });
    }
  },
);

// Actualizar un subgrupo
router.put(
  "/subgroups/:id",
  verifyToken,
  verifyRole(["admin", "user"]),
  async (req, res) => {
    const { name, budget } = req.body;

    try {
      const subgroup = await Subgroup.findByPk(req.params.id);

      if (!subgroup) {
        return res.status(404).json({ message: "Subgrupo no encontrado" });
      }

      // Verificar que el usuario es admin o administrador de la obra asociada al subgrupo
      const work = await Work.findByPk(subgroup.workId);
      if (req.user.role !== "admin" && work.adminId !== req.user.userId) {
        return res.status(403).json({
          message: "No tienes permiso para actualizar este subgrupo.",
        });
      }

      await subgroup.update({ name, budget });
      res.json(subgroup);
    } catch (error) {
      res
        .status(500)
        .json({ message: "Error al actualizar el subgrupo", error });
    }
  },
);

// Eliminar un subgrupo (solo admin)
router.delete(
  "/subgroups/:id",
  verifyToken,
  verifyRole(["admin"]),
  async (req, res) => {
    try {
      const subgroup = await Subgroup.findByPk(req.params.id);

      if (!subgroup) {
        return res.status(404).json({ message: "Subgrupo no encontrado" });
      }

      await subgroup.destroy();
      res.json({ message: "Subgrupo eliminado con éxito" });
    } catch (error) {
      res.status(500).json({ message: "Error al eliminar el subgrupo", error });
    }
  },
);

module.exports = router;

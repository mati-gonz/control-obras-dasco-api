const express = require("express");
const { Part } = require("../models");
const verifyToken = require("../middleware/auth");
const verifyRole = require("../middleware/role");
const router = express.Router();

// Crear una nueva partida dentro de una obra (opcionalmente asociada a un subgrupo)
router.post(
  "/:work_id/parts",
  verifyToken,
  verifyRole(["admin", "user"]),
  async (req, res) => {
    const { name, budget, subgroupId } = req.body;
    const workId = req.params.work_id;

    try {
      const newPart = await Part.create({ name, budget, subgroupId, workId });
      res.status(201).json(newPart);
    } catch (error) {
      res.status(500).json({ message: "Error al crear la partida", error });
    }
  },
);

// Obtener todas las partidas dentro de un subgrupo específico
router.get(
  "/subgroups/:subgroup_id/parts",
  verifyToken,
  verifyRole(["admin", "user"]),
  async (req, res) => {
    const subgroupId = req.params.subgroup_id;
    try {
      const parts = await Part.findAll({ where: { subgroupId } });
      res.json(parts);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener las partidas", error });
    }
  },
);

// Obtener una partida por ID
router.get(
  "/:id",
  verifyToken,
  verifyRole(["admin", "user"]),
  async (req, res) => {
    try {
      const part = await Part.findByPk(req.params.id);
      if (!part) {
        return res.status(404).json({ message: "Partida no encontrada" });
      }
      res.json(part);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener la partida", error });
    }
  },
);

// Obtener todas las partidas de una obra específica con paginación
router.get(
  "/:work_id/parts",
  verifyToken,
  verifyRole(["admin", "user"]),
  async (req, res) => {
    const workId = req.params.work_id;

    try {
      const parts = await Part.findAll({ where: { workId } }); // Sin paginación para pruebas

      res.json({ data: parts });
    } catch (error) {
      console.error("Error al obtener las partidas:", error);
      res.status(500).json({ message: "Error al obtener las partidas", error });
    }
  },
);

// Actualizar una partida
router.put(
  "/parts/:id",
  verifyToken,
  verifyRole(["admin"]),
  async (req, res) => {
    const { name, budget, subgroupId, workId } = req.body;
    try {
      const part = await Part.findByPk(req.params.id);
      if (!part) {
        return res.status(404).json({ message: "Partida no encontrada" });
      }
      await part.update({ name, budget, subgroupId, workId });
      res.json(part);
    } catch (error) {
      res
        .status(500)
        .json({ message: "Error al actualizar la partida", error });
    }
  },
);

// Eliminar una partida
router.delete(
  "/parts/:id",
  verifyToken,
  verifyRole(["admin"]),
  async (req, res) => {
    try {
      const part = await Part.findByPk(req.params.id);
      if (!part) {
        return res.status(404).json({ message: "Partida no encontrada" });
      }
      await part.destroy();
      res.json({ message: "Partida eliminada con éxito" });
    } catch (error) {
      res.status(500).json({ message: "Error al eliminar la partida", error });
    }
  },
);

module.exports = router;

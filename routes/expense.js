const express = require("express");
const { Expense } = require("../models");
const verifyToken = require("../middleware/auth");
const verifyRole = require("../middleware/role");
const router = express.Router();

// Crear un nuevo gasto
router.post(
  "/parts/:part_id/expenses",
  verifyToken,
  verifyRole(["admin", "user"]),
  async (req, res) => {
    const { amount, description, date, subgroupId, workId, receiptUrl } =
      req.body;
    const partId = req.params.part_id;
    const userId = req.user.id; // Obtener el ID del usuario autenticado desde el token

    try {
      // Crear un nuevo gasto con los datos recibidos del frontend
      const newExpense = await Expense.create({
        amount,
        description,
        date,
        partId,
        subgroupId,
        workId,
        userId,
        receiptUrl, // Guardar la URL del recibo directamente
      });

      res.status(201).json(newExpense);
    } catch (error) {
      console.error("Error creando el gasto:", error);
      res.status(500).json({ message: "Error creando el gasto", error });
    }
  },
);

// Obtener todos los gastos de una partida específica
router.get(
  "/parts/:part_id/expenses",
  verifyToken,
  verifyRole(["admin", "user"]),
  async (req, res) => {
    const partId = req.params.part_id;
    try {
      const expenses = await Expense.findAll({ where: { partId } });
      res.json(expenses);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener los gastos", error });
    }
  },
);

// Obtener un gasto por ID
router.get(
  "/expenses/:id",
  verifyToken,
  verifyRole(["admin", "user"]),
  async (req, res) => {
    try {
      const expense = await Expense.findByPk(req.params.id);
      if (!expense) {
        return res.status(404).json({ message: "Gasto no encontrado" });
      }
      res.json(expense);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener el gasto", error });
    }
  },
);

// Actualizar un gasto
router.put(
  "/expenses/:id",
  verifyToken,
  verifyRole(["admin", "user"]),
  async (req, res) => {
    const { amount, description, date, receiptUrl } = req.body; // Recibimos la URL del recibo si se actualiza
    try {
      const expense = await Expense.findByPk(req.params.id);
      if (!expense) {
        return res.status(404).json({ message: "Gasto no encontrado" });
      }

      // Actualizamos el gasto con los datos recibidos
      await expense.update({ amount, description, date, receiptUrl });

      res.json(expense);
    } catch (error) {
      res.status(500).json({ message: "Error al actualizar el gasto", error });
    }
  },
);

// Eliminar un gasto
router.delete(
  "/expenses/:id",
  verifyToken,
  verifyRole(["admin", "user"]),
  async (req, res) => {
    try {
      const expense = await Expense.findByPk(req.params.id);
      if (!expense) {
        return res.status(404).json({ message: "Gasto no encontrado" });
      }

      await expense.destroy();
      res.json({ message: "Gasto eliminado con éxito" });
    } catch (error) {
      res.status(500).json({ message: "Error al eliminar el gasto", error });
    }
  },
);

// Obtener la URL del recibo asociado a un gasto
router.get(
  "/:id/receipt",
  verifyToken,
  verifyRole(["admin", "user"]),
  async (req, res) => {
    try {
      const expense = await Expense.findByPk(req.params.id);

      if (!expense || !expense.receiptUrl) {
        return res
          .status(404)
          .json({ message: "Gasto o recibo no encontrado" });
      }

      // Devolver la URL del recibo almacenado en la base de datos
      res.json({ receiptUrl: expense.receiptUrl });
    } catch (error) {
      res.status(500).json({ message: "Error al obtener el recibo", error });
    }
  },
);

module.exports = router;

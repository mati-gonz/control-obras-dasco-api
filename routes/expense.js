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
    console.log("Payload recibido:", req.body);
    const { amount, description, date, subgroupId, workId, receiptUrl } =
      req.body;
    const partId = req.params.part_id;
    const userId = req.user.id;

    try {
      // Crear el gasto con la URL del recibo proporcionada por el frontend
      const newExpense = await Expense.create({
        amount,
        description,
        date,
        partId,
        subgroupId,
        workId,
        userId,
        receiptUrl, // Solo almacenamos la URL proporcionada por el frontend
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
    const { amount, description, date, receiptUrl } = req.body;
    try {
      const expense = await Expense.findByPk(req.params.id);
      if (!expense) {
        return res.status(404).json({ message: "Gasto no encontrado" });
      }

      // Actualizar el gasto con los nuevos datos y la nueva URL del recibo si se ha proporcionado
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

      // Aquí puedes enviar una notificación al frontend para que elimine el archivo en el servidor cPanel
      if (expense.receiptUrl) {
        // Puedes enviar la URL al frontend para que elimine el archivo
        // Por ejemplo, el frontend puede hacer una petición a PHP en el servidor cPanel para eliminar el archivo
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

      // En lugar de manejar el archivo, solo devolvemos la URL del recibo
      res.json({ receiptUrl: expense.receiptUrl });
    } catch (error) {
      res.status(500).json({ message: "Error al obtener el recibo", error });
    }
  },
);

module.exports = router;

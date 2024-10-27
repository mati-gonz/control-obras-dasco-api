const express = require("express");
const { Transfer, User, Work, Expense } = require("../models");
const verifyToken = require("../middleware/auth");
const verifyRole = require("../middleware/role");
const sequelize = require("../config/database");

const router = express.Router();

// Crear una nueva transferencia
router.post("/", verifyToken, verifyRole(["admin"]), async (req, res) => {
  try {
    const { userId, workId, amount, date, description } = req.body;
    const adminId = req.user.userId; // Obtener el ID del administrador desde el token de autenticación

    // Verificar que el usuario y la obra existen
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    const work = await Work.findByPk(workId);
    if (!work) {
      return res.status(404).json({ message: "Obra no encontrada" });
    }

    // Crear la transferencia
    const newTransfer = await Transfer.create({
      userId,
      workId,
      amount,
      date,
      description,
      adminId, // Asignar el ID del administrador que realiza la transferencia
    });

    return res.status(201).json(newTransfer);
  } catch (error) {
    console.error("Error creando la transferencia:", error);
    res.status(500).json({ message: "Error creando la transferencia", error });
  }
});

// Obtener balance por obra para un usuario
router.get("/balance/:userId/:workId", verifyToken, async (req, res) => {
  try {
    const { userId, workId } = req.params;

    // Calcular suma de transferencias
    const totalTransfers = await Transfer.sum("amount", {
      where: { userId, workId },
    });

    // Calcular suma de gastos
    const totalExpenses = await Expense.sum("amount", {
      where: { userId, workId },
    });

    // Calcular balance
    const balance = (totalTransfers || 0) - (totalExpenses || 0);

    return res.status(200).json({ workId, userId, balance });
  } catch (error) {
    console.error("Error al obtener el balance:", error);
    res.status(500).json({ message: "Error al obtener el balance", error });
  }
});

router.get(
  "/works/:userId",
  verifyToken,
  verifyRole(["admin", "user"]),
  async (req, res) => {
    try {
      const { userId } = req.params;

      // Obtener todas las obras para el usuario sin aplicar where en las asociaciones
      const works = await Work.findAll({
        where: { adminId: userId },
        include: [
          {
            model: Transfer,
            as: "Transfers",
            attributes: ["amount"],
            required: false,
          },
          {
            model: Expense,
            as: "Expenses",
            attributes: ["amount"],
            required: false,
          },
        ],
      });

      // Calcular balances para cada obra
      const workBalances = works.map((work) => {
        const totalTransfers = (work.Transfers || []).reduce(
          (sum, transfer) => sum + (Number(transfer.amount) || 0),
          0,
        );
        const totalExpenses = (work.Expenses || []).reduce(
          (sum, expense) => sum + (Number(expense.amount) || 0),
          0,
        );
        const balance = totalTransfers - totalExpenses;
        return {
          workId: work.id,
          workName: work.name,
          balance,
        };
      });

      console.log("Work Balances:", workBalances); // Agregar log para depurar

      return res.status(200).json(workBalances);
    } catch (error) {
      console.error("Error al obtener las obras con balance:", error);
      res
        .status(500)
        .json({ message: "Error al obtener las obras con balance", error });
    }
  },
);

// Obtener obras con balance para un usuario específico o para todos (si es administrador)
router.get(
  "/works",
  verifyToken,
  verifyRole(["admin", "user"]),
  async (req, res) => {
    try {
      const isAdmin = req.user.role === "admin"; // Obtener el rol desde el token de autenticación
      const userId = req.query.userId;

      // Condicional para obtener todas las obras si es administrador o solo las del usuario
      const whereCondition = isAdmin ? {} : { adminId: userId };

      // Obtener todas las obras para el usuario o todas las obras si es administrador
      const works = await Work.findAll({
        where: whereCondition,
        include: [
          {
            model: Transfer,
            as: "Transfers",
            attributes: ["amount"],
            required: false,
          },
          {
            model: Expense,
            as: "Expenses",
            attributes: ["amount"],
            required: false,
          },
        ],
      });

      // Calcular balances para cada obra
      const workBalances = works.map((work) => {
        const totalTransfers = (work.Transfers || []).reduce(
          (sum, transfer) => sum + (Number(transfer.amount) || 0),
          0,
        );
        const totalExpenses = (work.Expenses || []).reduce(
          (sum, expense) => sum + (Number(expense.amount) || 0),
          0,
        );
        const balance = totalTransfers - totalExpenses;
        return {
          workId: work.id,
          workName: work.name,
          balance,
        };
      });

      return res.status(200).json(workBalances);
    } catch (error) {
      console.error("Error al obtener las obras con balance:", error);
      res.status(500).json({
        message: "Error al obtener las obras con balance",
        error,
      });
    }
  },
);

// Obtener transferencias filtradas por usuario y obra
router.get(
  "/byUserWork",
  verifyToken,
  verifyRole(["admin", "user"]),
  async (req, res) => {
    try {
      const { userId, workId } = req.query;

      const filters = {};
      if (userId) filters.userId = userId;
      if (workId) filters.workId = workId;

      const transfers = await Transfer.findAll({
        where: filters,
        order: [["date", "DESC"]],
        attributes: [
          "id",
          "date",
          [sequelize.fn("COALESCE", sequelize.col("amount"), 0), "amount"],
          "description",
        ],
      });

      return res.status(200).json(transfers);
    } catch (error) {
      console.error("Error al obtener las transferencias:", error);
      res
        .status(500)
        .json({ message: "Error al obtener las transferencias", error });
    }
  },
);

// Obtener una transferencia por ID
router.get(
  "/:id",
  verifyToken,
  verifyRole(["admin", "user"]),
  async (req, res) => {
    try {
      const transfer = await Transfer.findByPk(req.params.id, {
        include: [
          { model: User, attributes: ["name"] },
          { model: Work, attributes: ["name"] },
        ],
      });

      if (!transfer) {
        return res.status(404).json({ message: "Transferencia no encontrada" });
      }

      return res.status(200).json(transfer);
    } catch (error) {
      console.error("Error al obtener la transferencia:", error);
      res
        .status(500)
        .json({ message: "Error al obtener la transferencia", error });
    }
  },
);

// Actualizar una transferencia
router.put("/:id", verifyToken, verifyRole(["admin"]), async (req, res) => {
  try {
    const { amount, date, description } = req.body;
    const transfer = await Transfer.findByPk(req.params.id);

    if (!transfer) {
      return res.status(404).json({ message: "Transferencia no encontrada" });
    }

    // Actualizar los campos de la transferencia
    transfer.amount = amount || transfer.amount;
    transfer.date = date || transfer.date;
    transfer.description = description || transfer.description;
    await transfer.save();

    return res.status(200).json(transfer);
  } catch (error) {
    console.error("Error al actualizar la transferencia:", error);
    res
      .status(500)
      .json({ message: "Error al actualizar la transferencia", error });
  }
});

// Eliminar una transferencia
router.delete("/:id", verifyToken, verifyRole(["admin"]), async (req, res) => {
  try {
    const transfer = await Transfer.findByPk(req.params.id);

    if (!transfer) {
      return res.status(404).json({ message: "Transferencia no encontrada" });
    }

    await transfer.destroy();
    return res
      .status(200)
      .json({ message: "Transferencia eliminada con éxito" });
  } catch (error) {
    console.error("Error al eliminar la transferencia:", error);
    res
      .status(500)
      .json({ message: "Error al eliminar la transferencia", error });
  }
});

module.exports = router;

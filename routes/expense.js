const express = require("express");
const multer = require("multer");
const zlib = require("zlib");
const fs = require("fs");
const path = require("path");
const { Expense } = require("../models");
const verifyToken = require("../middleware/auth");
const verifyRole = require("../middleware/role");
const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir =
      process.env.RECEIPT_STORAGE_PATH || path.join(__dirname, "../receipts/");

    // Crear la carpeta si no existe
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });

// Crear un nuevo gasto
router.post(
  "/parts/:part_id/expenses",
  verifyToken,
  verifyRole(["admin", "user"]),
  upload.single("receipt"),
  async (req, res) => {
    const { amount, description, date, subgroupId, workId } = req.body;
    const partId = req.params.part_id;
    const userId = req.user.id; // Obtener el ID del usuario autenticado desde el token

    try {
      let receiptUrl = null;
      let receiptExtension = null;

      if (req.file) {
        const filePath = path.join(
          process.env.RECEIPT_STORAGE_PATH,
          req.file.filename,
        );
        const compressedFilePath = `${filePath}.gz`;
        receiptExtension = path.extname(req.file.originalname).toLowerCase();

        const fileContents = fs.createReadStream(filePath);
        const writeStream = fs.createWriteStream(compressedFilePath);
        const gzip = zlib.createGzip();

        await new Promise((resolve, reject) => {
          fileContents
            .pipe(gzip)
            .pipe(writeStream)
            .on("finish", async (err) => {
              if (err) reject(err);

              receiptUrl = `${process.env.RECEIPT_STORAGE_PATH}/${path.basename(compressedFilePath)}`;

              fs.unlink(filePath, (err) => {
                if (err)
                  console.error("Error al eliminar el archivo original", err);
              });
              resolve();
            });
        });
      }

      const newExpense = await Expense.create({
        amount,
        description,
        date,
        partId,
        subgroupId,
        workId,
        userId, // Guardar el ID del usuario autenticado
        receiptUrl,
        receiptExtension,
      });

      res.status(201).json(newExpense);
    } catch (error) {
      console.error("Error creando el gasto:", error);
      res.status(500).json({ message: "Error creando el gasto", error });
    }
  },
);

// Actualizar un gasto
router.put(
  "/expenses/:id",
  verifyToken,
  verifyRole(["admin", "user"]),
  upload.single("receipt"), // Manejar el nuevo archivo, si es que se sube uno
  async (req, res) => {
    const { amount, description, date } = req.body;
    try {
      const expense = await Expense.findByPk(req.params.id);
      if (!expense) {
        return res.status(404).json({ message: "Gasto no encontrado" });
      }

      // Si se sube un nuevo archivo, reemplazar el anterior
      if (req.file) {
        const filePath = path.join(
          process.env.RECEIPT_STORAGE_PATH,
          req.file.filename,
        );
        const compressedFilePath = `${filePath}.gz`;
        const receiptExtension = path
          .extname(req.file.originalname)
          .toLowerCase();

        // Comprimir el nuevo archivo
        const fileContents = fs.createReadStream(filePath);
        const writeStream = fs.createWriteStream(compressedFilePath);
        const gzip = zlib.createGzip();

        await new Promise((resolve, reject) => {
          fileContents
            .pipe(gzip)
            .pipe(writeStream)
            .on("finish", async (err) => {
              if (err) reject(err);

              const receiptUrl = `${process.env.RECEIPT_STORAGE_PATH}/${path.basename(compressedFilePath)}`;
              if (expense.receiptUrl) {
                const oldFilePath = path.join(
                  __dirname,
                  "../",
                  expense.receiptUrl,
                );
                fs.unlink(oldFilePath, (err) => {
                  if (err)
                    console.error("Error al eliminar el archivo original", err);
                });
              }

              await expense.update({
                amount,
                description,
                date,
                receiptUrl,
                receiptExtension,
              });
              resolve();
            });
        });
      } else {
        await expense.update({ amount, description, date });
      }

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

      // Eliminar el archivo asociado si existe
      if (expense.receiptUrl) {
        const filePath = path.join(
          process.env.RECEIPT_STORAGE_PATH,
          path.basename(expense.receiptUrl),
        );
        if (fs.existsSync(filePath)) {
          fs.unlink(filePath, (err) => {
            if (err) console.error("Error al eliminar el archivo:", err);
          });
        }
      }

      await expense.destroy();
      res.json({ message: "Gasto eliminado con éxito" });
    } catch (error) {
      res.status(500).json({ message: "Error al eliminar el gasto", error });
    }
  },
);

module.exports = router;

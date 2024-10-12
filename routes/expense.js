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
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage }).single("receipt");

// Crear un nuevo gasto
router.post(
  "/parts/:part_id/expenses",
  (req, res, next) => {
    verifyToken,
      verifyRole(["admin", "user"]),
      upload(req, res, function (err) {
        if (err instanceof multer.MulterError) {
          console.error("Error de Multer:", err);
          return res
            .status(500)
            .json({ message: "Error al subir el archivo", error: err });
        } else if (err) {
          console.error("Error general:", err);
          return res
            .status(500)
            .json({ message: "Error desconocido", error: err });
        }

        // Continuar con el procesamiento normal si no hay errores
        next();
      });
  },
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

// Subir y comprimir un archivo asociado a un gasto
router.post(
  "/expenses/:id/upload",
  verifyToken,
  verifyRole(["admin", "user"]),
  upload.single("receipt"),
  async (req, res) => {
    try {
      const expense = await Expense.findByPk(req.params.id);
      if (!expense) {
        return res.status(404).json({ message: "Gasto no encontrado" });
      }

      const filePath = path.join(
        process.env.RECEIPT_STORAGE_PATH,
        req.file.filename,
      );
      const compressedFilePath = `${filePath}.gz`;

      // Comprimir el archivo
      const fileContents = fs.createReadStream(filePath);
      const writeStream = fs.createWriteStream(compressedFilePath);
      const gzip = zlib.createGzip();

      fileContents
        .pipe(gzip)
        .pipe(writeStream)
        .on("finish", async (err) => {
          if (err) {
            return res
              .status(500)
              .json({ message: "Error al comprimir el archivo", error: err });
          }

          // Guardar la URL del archivo comprimido en la base de datos
          const receiptUrl = `${process.env.RECEIPT_STORAGE_PATH}/${path.basename(compressedFilePath)}`;
          await expense.update({ receiptUrl });

          // Eliminar el archivo original no comprimido si ya no es necesario
          fs.unlink(filePath, (err) => {
            if (err)
              console.error("Error al eliminar el archivo original", err);
          });

          res.json({
            message: "Archivo subido y comprimido con éxito",
            receiptUrl,
          });
        });
    } catch (error) {
      res.status(500).json({ message: "Error al subir el archivo", error });
    }
  },
);

// Descargar y descomprimir un archivo asociado a un gasto
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

      const compressedFilePath = path.join(
        process.env.RECEIPT_STORAGE_PATH,
        path.basename(expense.receiptUrl),
      );

      // Verificar si el archivo existe
      if (!fs.existsSync(compressedFilePath)) {
        return res.status(404).json({ message: "Archivo no encontrado" });
      }

      // Usamos la extensión original almacenada en la base de datos para determinar el tipo de contenido
      let contentType = "application/octet-stream"; // Valor por defecto

      if (expense.receiptExtension === ".png") contentType = "image/png";
      else if (
        expense.receiptExtension === ".jpg" ||
        expense.receiptExtension === ".jpeg"
      )
        contentType = "image/jpeg";
      else if (expense.receiptExtension === ".pdf")
        contentType = "application/pdf";

      // Establecer el tipo de contenido correcto
      res.setHeader("Content-Type", contentType);
      res.setHeader(
        "Content-Disposition",
        `inline; filename=receipt-${expense.id}${expense.receiptExtension}`,
      );

      // Descomprimir y enviar el archivo
      const fileContents = fs.createReadStream(compressedFilePath);
      fileContents.pipe(zlib.createGunzip()).pipe(res);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener el recibo", error });
    }
  },
);

module.exports = router;

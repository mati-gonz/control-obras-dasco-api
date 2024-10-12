const express = require("express");
const { Expense, Part, Work } = require("../models");
const verifyToken = require("../middleware/auth");
const verifyRole = require("../middleware/role");
const multer = require("multer");
const sharp = require("sharp");
const zlib = require("zlib");
const fs = require("fs");
const { uploadFileToS3, deleteFileFromS3, getSignedUrl } = require("../s3"); // Tu archivo s3.js
const router = express.Router();

const toKebabCase = (str) => {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-") // Reemplaza espacios y caracteres especiales con "-"
    .replace(/^-+|-+$/g, ""); // Elimina guiones al principio o final
};

// Configurar multer para manejar la subida de archivos
const upload = multer({ dest: "uploads/" });

router.post(
  "/parts/:part_id/expenses",
  verifyToken,
  verifyRole(["admin", "user"]),
  upload.single("receipt"), // Recepción del archivo
  async (req, res) => {
    try {
      const { amount, description, date, subgroupId } = req.body;
      const partId = req.params.part_id;
      const userId = req.user.id;

      // 1. Obtener la partida (Part) y la obra (Work) asociadas en una sola consulta
      const part = await Part.findByPk(partId, {
        include: { model: Work }, // Usamos la relación para incluir la obra (Work)
      });

      if (!part) {
        return res.status(404).json({ message: "Part no encontrado" });
      }

      const work = part.work; // Obtenemos la obra directamente desde la relación

      // 2. Convertir los nombres de la obra y de la partida a kebab-case
      const workNameKebab = toKebabCase(work.name); // Ej: "Obra de prueba" => "obra-de-prueba"
      const partNameKebab = toKebabCase(part.name); // Ej: "Partida inicial" => "partida-inicial"

      // 3. Crear el gasto con el workId obtenido
      const newExpense = await Expense.create({
        amount,
        description,
        date,
        partId,
        subgroupId,
        workId: work.id, // Obtenemos el workId directamente de la relación
        userId,
      });

      console.log("Gasto creado:", newExpense);

      const expenseId = newExpense.id; // El ID del gasto creado

      // Verifica que los valores no son undefined
      if (!workNameKebab || !partNameKebab || !expenseId) {
        return res
          .status(400)
          .json({ message: "Faltan parámetros para la creación del archivo" });
      }

      // 4. Subir el archivo a S3 con la ruta formateada usando los nombres de la obra y partida
      const receiptUrl = await uploadFileToS3(
        {
          path: req.file.path,
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
        },
        workNameKebab, // Usamos el nombre en kebab-case de la obra
        partNameKebab, // Usamos el nombre en kebab-case de la partida
        expenseId,
      );

      // Actualizar el gasto con la URL del recibo
      await newExpense.update({ receiptUrl });

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
  upload.single("receipt"), // Añadimos el middleware para manejar archivos en la actualización
  async (req, res) => {
    const { amount, description, date } = req.body;
    const file = req.file; // Archivo recibido desde el frontend
    let compressedFilePath = file ? file.path : null;
    try {
      const expense = await Expense.findByPk(req.params.id);
      if (!expense) {
        return res.status(404).json({ message: "Gasto no encontrado" });
      }

      // Si hay un archivo anterior, eliminarlo de S3 antes de subir el nuevo
      if (file) {
        if (expense.receiptUrl) {
          // Llama a la función de eliminación del archivo en S3
          await deleteFileFromS3(expense.receiptUrl);
        }

        // Comprimir el archivo si es necesario y luego subir a S3
        if (file.size > 2 * 1024 * 1024) {
          if (
            ["image/jpeg", "image/png", "image/heic"].includes(file.mimetype)
          ) {
            const compressedPath = `uploads/compressed-${file.filename}.jpg`;
            await sharp(file.path)
              .resize(1024)
              .jpeg({ quality: 80 })
              .toFile(compressedPath);
            compressedFilePath = compressedPath;
          } else if (file.mimetype === "application/pdf") {
            const compressedPath = `uploads/compressed-${file.filename}.pdf.gz`;
            const fileContents = fs.readFileSync(file.path);
            const compressed = zlib.gzipSync(fileContents);
            fs.writeFileSync(compressedPath, compressed);
            compressedFilePath = compressedPath;
          }
        }

        // Subir el nuevo archivo a S3
        const newReceiptUrl = await uploadFileToS3(
          {
            path: compressedFilePath,
            originalname: file.originalname,
            mimetype: file.mimetype,
          },
          expense.workId,
          expense.partId,
          expense.id,
        );

        // Actualizar el gasto con la nueva URL del archivo
        await expense.update({
          amount,
          description,
          date,
          receiptUrl: newReceiptUrl,
        });

        // Eliminar archivos temporales
        fs.unlinkSync(file.path);
        if (compressedFilePath && compressedFilePath !== file.path) {
          fs.unlinkSync(compressedFilePath);
        }
      } else {
        // Si no hay nuevo archivo, simplemente actualizar los otros campos
        await expense.update({ amount, description, date });
      }

      res.json(expense);
    } catch (error) {
      console.error("Error actualizando el gasto:", error);
      res.status(500).json({ message: "Error actualizando el gasto", error });
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

      // Si hay un archivo en S3, eliminarlo antes de borrar el gasto
      if (expense.receiptUrl) {
        await deleteFileFromS3(expense.receiptUrl);
      }

      await expense.destroy();
      res.json({ message: "Gasto eliminado con éxito" });
    } catch (error) {
      console.error("Error al eliminar el gasto:", error);
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

      // Extraer la clave del archivo de la URL del recibo
      const fileKey = expense.receiptUrl.split(".amazonaws.com/")[1]; // Obtiene el "key" del archivo en S3

      // Generar la URL firmada para el acceso temporal
      const signedUrl = getSignedUrl(fileKey);

      // Devolver la URL firmada
      res.json({ signedUrl });
    } catch (error) {
      res.status(500).json({ message: "Error al obtener el recibo", error });
    }
  },
);

module.exports = router;

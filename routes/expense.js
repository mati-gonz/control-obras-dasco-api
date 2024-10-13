const express = require("express");
const { Expense, Part, Work, User } = require("../models");
const verifyToken = require("../middleware/auth");
const verifyRole = require("../middleware/role");
const multer = require("multer");
const sharp = require("sharp");
const zlib = require("zlib");
const { uploadFileToS3, deleteFileFromS3, getSignedUrl } = require("../s3"); // Tu archivo s3.js
const router = express.Router();

const toKebabCase = (str) => {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-") // Reemplaza espacios y caracteres especiales con "-"
    .replace(/^-+|-+$/g, ""); // Elimina guiones al principio o final
};

// Configurar multer para manejar la subida de archivos
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // Límite de 10 MB por archivo
});

router.post(
  "/parts/:part_id/expenses",
  verifyToken,
  verifyRole(["admin", "user"]),
  upload.single("receipt"), // Recepción del archivo
  async (req, res) => {
    try {
      // Asegúrate de que el archivo se recibió antes de continuar
      if (!req.file) {
        return res
          .status(400)
          .json({ message: "No se recibió ningún archivo" });
      }

      const { amount, description, date, subgroupId, userId } = req.body;
      const partId = req.params.part_id;

      const part = await Part.findByPk(partId);
      if (!part) {
        return res.status(404).json({ message: "Part no encontrado" });
      }

      const work = await Work.findOne({ where: { id: part.workId } });
      if (!work) {
        return res.status(404).json({ message: "Work no encontrado" });
      }

      const workNameKebab = toKebabCase(work.name);
      const partNameKebab = toKebabCase(part.name);

      // Crear el gasto
      const newExpense = await Expense.create({
        amount,
        description,
        date,
        partId,
        subgroupId,
        workId: work.id,
        userId: userId || req.user.id,
      });

      const expenseId = newExpense.id;

      // Verifica si hay archivo recibido
      if (req.file) {
        let receiptUrl;

        // Si el archivo es mayor a 2 MB, aplicamos compresión
        if (req.file.size > 2 * 1024 * 1024) {
          // Archivos mayores de 2 MB
          if (
            ["image/jpeg", "image/png", "image/heic"].includes(
              req.file.mimetype,
            )
          ) {
            // Comprimir imagen usando sharp
            const buffer = await sharp(req.file.buffer)
              .resize(1024)
              .jpeg({ quality: 80 })
              .toBuffer();

            // Subir el archivo comprimido a S3
            receiptUrl = await uploadFileToS3(
              {
                buffer,
                originalname: req.file.originalname,
                mimetype: req.file.mimetype,
              },
              workNameKebab,
              partNameKebab,
              expenseId,
            );
          } else if (req.file.mimetype === "application/pdf") {
            // Comprimir PDF usando zlib
            const compressedBuffer = zlib.gzipSync(req.file.buffer);

            // Subir el archivo comprimido a S3
            receiptUrl = await uploadFileToS3(
              {
                buffer: compressedBuffer,
                originalname: req.file.originalname,
                mimetype: req.file.mimetype,
              },
              workNameKebab,
              partNameKebab,
              expenseId,
            );
          }
        } else {
          // Si el archivo es menor a 2 MB, subir directamente sin compresión
          receiptUrl = await uploadFileToS3(
            {
              buffer: req.file.buffer,
              originalname: req.file.originalname,
              mimetype: req.file.mimetype,
            },
            workNameKebab,
            partNameKebab,
            expenseId,
          );
        }

        // Actualizar el gasto con la URL del recibo
        await newExpense.update({ receiptUrl });
      }

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
      const expenses = await Expense.findAll({
        where: { partId },
        include: [
          {
            model: User, // Incluimos el modelo User
            attributes: ["name"], // Solo traemos el atributo 'name'
          },
        ],
      });
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
  "/:id",
  verifyToken,
  verifyRole(["admin", "user"]),
  upload.single("receipt"), // Añadimos el middleware para manejar archivos en la actualización
  async (req, res) => {
    const { amount, description, date } = req.body;
    const file = req.file; // Archivo recibido desde el frontend

    try {
      const expense = await Expense.findByPk(req.params.id);
      if (!expense) {
        return res.status(404).json({ message: "Gasto no encontrado" });
      }

      // Obtener la partida (Part) y la obra (Work) para generar la ruta en S3
      const part = await Part.findByPk(expense.partId);
      if (!part) {
        return res.status(404).json({ message: "Part no encontrado" });
      }
      const work = await Work.findOne({ where: { id: part.workId } });
      if (!work) {
        return res.status(404).json({ message: "Work no encontrado" });
      }

      // Convertir los nombres de la obra y la partida a kebab-case
      const workNameKebab = toKebabCase(work.name);
      const partNameKebab = toKebabCase(part.name);

      // Si hay un archivo anterior, eliminarlo de S3 antes de subir el nuevo
      if (file) {
        if (expense.receiptUrl) {
          // Llama a la función de eliminación del archivo en S3
          await deleteFileFromS3(expense.receiptUrl);
        }

        // Comprimir el archivo si es necesario y luego subir a S3
        let receiptUrl;
        if (file.size > 2 * 1024 * 1024) {
          // Archivos mayores de 2 MB
          if (
            ["image/jpeg", "image/png", "image/heic"].includes(file.mimetype)
          ) {
            // Comprimir imagen usando sharp
            const buffer = await sharp(file.buffer)
              .resize(1024)
              .jpeg({ quality: 80 })
              .toBuffer();

            // Subir el archivo comprimido a S3
            receiptUrl = await uploadFileToS3(
              {
                buffer,
                originalname: file.originalname,
                mimetype: file.mimetype,
              },
              workNameKebab,
              partNameKebab,
              expense.id,
            );
          } else if (file.mimetype === "application/pdf") {
            // Comprimir PDF usando zlib
            const compressedBuffer = zlib.gzipSync(file.buffer);

            // Subir el archivo comprimido a S3
            receiptUrl = await uploadFileToS3(
              {
                buffer: compressedBuffer,
                originalname: file.originalname,
                mimetype: file.mimetype,
              },
              workNameKebab,
              partNameKebab,
              expense.id,
            );
          }
        } else {
          // Si el archivo es menor a 2 MB, subir directamente sin compresión
          receiptUrl = await uploadFileToS3(
            {
              buffer: file.buffer,
              originalname: file.originalname,
              mimetype: file.mimetype,
            },
            workNameKebab,
            partNameKebab,
            expense.id,
          );
        }

        // Actualizar el gasto con la nueva URL del archivo
        await expense.update({
          amount,
          description,
          date,
          receiptUrl, // Actualiza la URL del archivo en la base de datos
        });
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
        return res.status(404).json({ message: "Recibo no encontrado" });
      }

      const fileKey = expense.receiptUrl.split(".amazonaws.com/")[1]; // Extraer la clave del archivo

      // Obtener la URL firmada desde S3. Asegúrate de usar "await" ya que getSignedUrl es asíncrona
      const signedUrl = await getSignedUrl(fileKey); // Aquí estaba el problema: falta await

      // Obtener la extensión del archivo
      const fileExtension = expense.receiptUrl.split(".").pop(); // Extrae la extensión del archivo

      // Devolver la URL firmada y la extensión del archivo
      res.json({ signedUrl, fileExtension });
    } catch (error) {
      console.error("Error obteniendo el recibo:", error);
      res.status(500).json({ message: "Error obteniendo el recibo", error });
    }
  },
);

module.exports = router;

const AWS = require("aws-sdk");
const fs = require("fs");
const path = require("path");

// Configurar las credenciales y la región
AWS.config.update({
  region: "sa-east-1", // Asegúrate de usar la misma región que tu bucket
});

const s3 = new AWS.S3();

const uploadFileToS3 = async (file, workId, partId, expenseId) => {
  // Verifica que los parámetros no sean undefined
  if (!workId || !partId || !expenseId) {
    throw new Error(
      "Faltan parámetros para generar la clave del archivo en S3",
    );
  }

  const fileStream = fs.createReadStream(file.path);

  // Construcción de la ruta (Key) del archivo en S3
  const uploadParams = {
    Bucket: "dasco-uploads",
    Key: `${workId}/${partId}/receipt-${expenseId}${path.extname(file.originalname)}`, // Asegúrate de que workId, partId y expenseId tienen valores válidos
    Body: fileStream,
    ContentType: file.mimetype,
  };

  try {
    const data = await s3.upload(uploadParams).promise();
    return data.Location; // Devuelve la URL completa del archivo en S3
  } catch (err) {
    console.error("Error uploading file: ", err);
    throw err;
  }
};

// Función para eliminar archivos de S3
const deleteFileFromS3 = async (fileUrl) => {
  try {
    const bucketName = "dasco-uploads"; // El nombre de tu bucket S3
    const fileKey = fileUrl.split(".amazonaws.com/")[1]; // Extraemos el nombre del archivo desde la URL

    const params = {
      Bucket: bucketName,
      Key: fileKey,
    };

    await s3.deleteObject(params).promise();
    console.log(`Archivo eliminado de S3: ${fileKey}`);
  } catch (error) {
    console.error("Error eliminando archivo de S3:", error);
  }
};

// Función para generar URL firmada temporalmente
const getSignedUrl = (key) => {
  const params = {
    Bucket: "dasco-uploads", // Reemplaza con el nombre de tu bucket
    Key: key, // La clave (key) del archivo en S3
    Expires: 60 * 60, // El tiempo de expiración de la URL en segundos (ej: 1 hora)
  };

  return s3.getSignedUrl("getObject", params); // Genera la URL firmada
};

module.exports = { uploadFileToS3, deleteFileFromS3, getSignedUrl };

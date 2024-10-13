const {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} = require("@aws-sdk/client-s3");
const {
  getSignedUrl: getSignedUrlV3,
} = require("@aws-sdk/s3-request-presigner");
const fs = require("fs");
const path = require("path");

// Inicializamos el cliente S3
const s3Client = new S3Client({ region: "sa-east-1" });

// Función para subir archivos a S3
const uploadFileToS3 = async (file, workId, partId, expenseId) => {
  if (!workId || !partId || !expenseId) {
    throw new Error(
      "Faltan parámetros para generar la clave del archivo en S3",
    );
  }

  const fileStream = fs.createReadStream(file.path);

  // Parámetros de la carga
  const uploadParams = {
    Bucket: "dasco-uploads",
    Key: `${workId}/${partId}/receipt-${expenseId}${path.extname(file.originalname)}`, // Generamos la key en S3
    Body: fileStream,
    ContentType: file.mimetype,
  };

  try {
    // Subimos el archivo utilizando el comando PutObjectCommand
    const data = await s3Client.send(new PutObjectCommand(uploadParams));
    return `https://dasco-uploads.s3.sa-east-1.amazonaws.com/${uploadParams.Key}`; // Devolvemos la URL pública
  } catch (err) {
    console.error("Error uploading file: ", err);
    throw err;
  }
};

// Función para eliminar archivos de S3
const deleteFileFromS3 = async (fileUrl) => {
  try {
    const bucketName = "dasco-uploads";
    const fileKey = fileUrl.split(".amazonaws.com/")[1]; // Extraemos la clave del archivo desde la URL

    const deleteParams = {
      Bucket: bucketName,
      Key: fileKey,
    };

    // Usamos el comando DeleteObjectCommand para eliminar el archivo
    await s3Client.send(new DeleteObjectCommand(deleteParams));
  } catch (error) {
    console.error("Error eliminando archivo de S3:", error);
  }
};

// Función para generar una URL firmada temporalmente
const getSignedUrl = async (key) => {
  const params = {
    Bucket: "dasco-uploads", // Reemplaza con el nombre de tu bucket
    Key: key, // La clave (key) del archivo en S3
  };

  try {
    // Generamos la URL firmada usando el GetObjectCommand
    const signedUrl = await getSignedUrlV3(
      s3Client,
      new GetObjectCommand(params),
      { expiresIn: 3600 },
    );
    return signedUrl; // Devolvemos la URL firmada
  } catch (err) {
    console.error("Error generando la URL firmada: ", err);
    throw err;
  }
};

module.exports = { uploadFileToS3, deleteFileFromS3, getSignedUrl };

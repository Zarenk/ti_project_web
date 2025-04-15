import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import * as multer from 'multer';

export const multerConfig: MulterOptions = {
  storage: multer.memoryStorage(), // Almacena el archivo en memoria
  limits: {
    fileSize: 5 * 1024 * 1024, // Tamaño máximo del archivo: 5 MB
  },
  fileFilter: (req, file, callback) => {
    // Validar el tipo de archivo (solo PDFs)
    if (file.mimetype !== 'application/pdf') {
      return callback(new Error('Solo se permiten archivos PDF'), false);
    }
    callback(null, true);
  },
};
declare namespace Express {
  export interface Request {
    user?: any;
  }

  export interface Multer {
    File: {
      fieldname: string;
      originalname: string;
      encoding: string;
      mimetype: string;
      size: number;
      buffer: Buffer;
    };
  }
}

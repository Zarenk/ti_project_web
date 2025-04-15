declare module 'pdf-parse' {
<<<<<<< HEAD
    interface PDFParseData {
      numpages: number;
      numrender: number;
      info: {
        [key: string]: any;
      };
      metadata: any;
      text: string;
      version: string;
    }
  
    export default function pdfParse(
      buffer: Buffer | ArrayBuffer | Uint8Array
    ): Promise<PDFParseData>;
=======
    interface PDFParseResult {
      text: string;
      numpages: number;
      numrender: number;
      info: any;
      metadata: any;
      version: string;
    }
  
    function pdfParse(data: Buffer | Uint8Array | ArrayBuffer, options?: any): Promise<PDFParseResult>;
  
    export = pdfParse;
>>>>>>> 23838054d847e31eb0c9647b0de71ae041057ce8
  }
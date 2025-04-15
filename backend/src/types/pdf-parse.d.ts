declare module 'pdf-parse' {
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
  }
declare module "react-qr-reader" {
    import * as React from "react";
  
    export interface QRReaderProps {
      delay?: number;
      onError?: (error: any) => void;
      onScan?: (data: string | null) => void;
      style?: React.CSSProperties;
      facingMode?: string;
      className?: string;
    }
  
    const QrReader: React.ComponentType<QRReaderProps>;
    export default QrReader;
  }
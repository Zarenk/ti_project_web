declare module "react-qr-scanner" {
    import * as React from "react";
  
    export interface QrScannerProps {
      delay?: number;
      onError?: (err: any) => void;
      onScan?: (data: any) => void;
      style?: React.CSSProperties;
      constraints?: MediaTrackConstraints;
    }
  
    const QrScanner: React.ComponentType<QrScannerProps>;
    export default QrScanner;
  }
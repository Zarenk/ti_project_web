"use client";

import { Html5QrcodeScanner } from "html5-qrcode";
import { useEffect } from "react";

interface Props {
  onScanSuccess: (decodedText: string) => void;
  onScanError?: (error: any) => void;
}

export default function Html5QrScanner({ onScanSuccess, onScanError }: Props) {
  useEffect(() => {
    const scanner = new Html5QrcodeScanner("reader", {
      fps: 10,
      qrbox: 250,
    },
    false
);

    scanner.render(
      (decodedText) => {
        onScanSuccess(decodedText);
      },
      (error) => {
        onScanError?.(error);
      }
    );

    return () => {
      scanner.clear().catch(console.error);
    };
  }, []);

  return <div id="reader" className="mx-auto w-full max-w-sm" />;
}

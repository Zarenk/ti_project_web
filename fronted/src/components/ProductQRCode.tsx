"use client"

import { QRCodeCanvas } from "qrcode.react";

interface ProductQRCodeProps {
  value: string;
  size?: number;
}

export default function ProductQRCode({ value, size = 200 }: ProductQRCodeProps) {
  if (!value) return null;

  return (
    <div className="flex flex-col items-center space-y-2">
      <QRCodeCanvas value={value} size={size} />
      <p className="text-sm text-muted-foreground">Contenido: {value}</p>
    </div>
  );
}
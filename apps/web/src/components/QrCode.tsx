"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

interface QrCodeProps {
  value: string;
  size?: number;
  className?: string;
}

/**
 * QR Code renderizado no cliente como data URL.
 * Usado na chamada promocional da tela (Instagram, cardápio, agendamento).
 */
export function QrCode({ value, size = 160, className }: QrCodeProps) {
  const [dataUrl, setDataUrl] = useState<string>("");

  useEffect(() => {
    if (!value) {
      setDataUrl("");
      return;
    }

    let active = true;
    QRCode.toDataURL(value, {
      width: size,
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: "#111827FF", light: "#FFFFFFFF" },
    })
      .then((url) => {
        if (active) setDataUrl(url);
      })
      .catch(() => {
        if (active) setDataUrl("");
      });

    return () => {
      active = false;
    };
  }, [value, size]);

  if (!dataUrl) return null;

  return (
    <img
      src={dataUrl}
      alt="QR Code"
      width={size}
      height={size}
      className={className}
      style={{ imageRendering: "pixelated" }}
    />
  );
}

import React, { useState, useEffect } from "react";
import QRCode from "qrcode";

/**
 * Standard scannable QR Code generator using industry-standard ISO/IEC 18004.
 * Produces crisp, high-contrast, scannable QR codes readable by any phone camera or ticket scanner.
 */
export default function QRCodeVisual({
  value = "EVENTFLOW-PASS-001",
  size = 150,
  darkColor = "#0f172a",
  lightColor = "#ffffff",
  showLabel = true
}) {
  const [dataUrl, setDataUrl] = useState("");

  useEffect(() => {
    let isMounted = true;
    QRCode.toDataURL(value || "EVENTFLOW-PASS", {
      width: size * 2,
      margin: 1,
      color: {
        dark: darkColor || "#0f172a",
        light: lightColor || "#ffffff"
      },
      errorCorrectionLevel: "M"
    })
      .then(url => {
        if (isMounted) setDataUrl(url);
      })
      .catch(err => {
        console.error("QR Code generation failed:", err);
      });
    return () => { isMounted = false; };
  }, [value, size, darkColor, lightColor]);

  return (
    <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center" }}>
      <div
        style={{
          width: size,
          height: size,
          borderRadius: 8,
          background: lightColor,
          padding: 6,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)"
        }}
      >
        {dataUrl ? (
          <img
            src={dataUrl}
            alt={value}
            style={{ width: "100%", height: "100%", display: "block", borderRadius: 4 }}
          />
        ) : (
          <div style={{ width: "100%", height: "100%", background: "#f1f5f9", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 10, color: "#64748b" }}>Generating...</span>
          </div>
        )}
      </div>

      {showLabel && (
        <div
          style={{
            fontFamily: "monospace",
            fontSize: Math.max(10, Math.floor(size * 0.07)),
            fontWeight: 800,
            color: "#1e293b",
            marginTop: 6,
            letterSpacing: "0.08em",
            textAlign: "center",
            wordBreak: "break-all",
            maxWidth: size
          }}
        >
          {value}
        </div>
      )}
    </div>
  );
}

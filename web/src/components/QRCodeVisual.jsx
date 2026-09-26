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
  showLabel = true,
  blurred = false,
  blurText = "Slip In Review",
  blurAmount = 14
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
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          position: "relative",
          overflow: "hidden"
        }}
      >
        {dataUrl ? (
          <img
            src={dataUrl}
            alt={blurred ? "Locked QR Code" : value}
            style={{
              width: "100%",
              height: "100%",
              display: "block",
              borderRadius: 4,
              filter: blurred ? `blur(${blurAmount}px) brightness(0.65) saturate(0.6)` : "none",
              transform: blurred ? "scale(1.2)" : "none",
              opacity: blurred ? 0.3 : 1,
              userSelect: "none",
              pointerEvents: "none",
              transition: "filter 0.3s ease, opacity 0.3s ease"
            }}
          />
        ) : (
          <div style={{ width: "100%", height: "100%", background: "#f1f5f9", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 10, color: "#64748b" }}>Generating...</span>
          </div>
        )}

        {/* Security Locked Overlay when QR is in review / not approved */}
        {blurred && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(15, 23, 42, 0.72)",
              backdropFilter: "blur(6px)",
              WebkitBackdropFilter: "blur(6px)",
              borderRadius: 8,
              padding: 4,
              textAlign: "center",
              zIndex: 2,
              pointerEvents: "none"
            }}
          >
            <span
              style={{
                fontSize: size >= 100 ? 28 : (size >= 48 ? 16 : 12),
                lineHeight: 1,
                marginBottom: size >= 100 ? 6 : (size >= 48 ? 2 : 0),
                filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.6))"
              }}
            >
              🔒
            </span>
            {blurText && size >= 54 && (
              <span
                style={{
                  fontSize: Math.max(8, Math.floor(size * 0.068)),
                  fontWeight: 800,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: "#fef08a",
                  background: "rgba(180, 83, 9, 0.9)",
                  border: "1px solid rgba(245, 158, 11, 0.5)",
                  padding: size >= 100 ? "3px 8px" : "1px 4px",
                  borderRadius: 4,
                  whiteSpace: "nowrap",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.4)"
                }}
              >
                {blurText}
              </span>
            )}
          </div>
        )}
      </div>

      {showLabel && (
        <div
          style={{
            fontFamily: "monospace",
            fontSize: Math.max(10, Math.floor(size * 0.07)),
            fontWeight: 800,
            color: blurred ? "#64748b" : "#1e293b",
            marginTop: 6,
            letterSpacing: "0.08em",
            textAlign: "center",
            wordBreak: "break-all",
            maxWidth: size
          }}
        >
          {blurred ? "•••• •••• ••••" : value}
        </div>
      )}
    </div>
  );
}

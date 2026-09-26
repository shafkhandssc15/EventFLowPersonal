import { useState, useRef } from "react";
import { IcX } from "./Icons.jsx";
import { FALLBACK_IMAGE } from "../api/supabase.js";

export default function ImageUploader({
  value = "",
  onChange = () => {},
  label = "Cover Photo",
  aspectRatio = "16/9",
  maxSizeMb = 5
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  function handleFile(file) {
    setError("");
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file (PNG, JPG, WEBP).");
      return;
    }

    if (file.size > maxSizeMb * 1024 * 1024) {
      setError(`Image size exceeds ${maxSizeMb}MB. Please choose a smaller image.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      onChange(e.target.result);
    };
    reader.readAsDataURL(file);
  }

  function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }

  function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }

  function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  }

  return (
    <div className="form-group" style={{ gridColumn: "1/-1" }}>
      <label className="form-label" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>{label}</span>
        <span style={{ fontSize: 11, color: "var(--c-text-3)", fontWeight: 400 }}>
          Drag &amp; Drop or Upload from Device (Max {maxSizeMb}MB)
        </span>
      </label>

      {error && (
        <div style={{ color: "#ef4444", fontSize: 12, marginBottom: 8 }}>
          {error}
        </div>
      )}

      {value ? (
        /* Image Preview Box */
        <div style={{
          position: "relative",
          width: "100%",
          height: 180,
          borderRadius: "var(--radius-sm)",
          overflow: "hidden",
          border: "1px solid var(--c-border)",
          background: "#0f172a"
        }}>
          <img
            src={value}
            alt="Preview"
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            onError={(e) => { e.currentTarget.src = FALLBACK_IMAGE; }}
          />
          <div style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 60%)"
          }} />

          {/* Action buttons on hover */}
          <div style={{
            position: "absolute",
            bottom: 10,
            right: 10,
            display: "flex",
            gap: 8
          }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ background: "rgba(15,23,42,0.85)", backdropFilter: "blur(4px)" }}
              onClick={() => fileInputRef.current?.click()}
            >
              Change Photo
            </button>
            <button
              type="button"
              className="btn btn-danger btn-sm"
              style={{ background: "rgba(220,38,38,0.85)" }}
              onClick={() => onChange("")}
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        /* Drag & Drop Zone */
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            width: "100%",
            height: 140,
            border: isDragging ? "2px dashed var(--c-blue)" : "2px dashed rgba(255,255,255,0.18)",
            background: isDragging ? "rgba(37,99,235,0.1)" : "rgba(255,255,255,0.02)",
            borderRadius: "var(--radius-sm)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            transition: "all 0.2s ease",
            padding: 16,
            textAlign: "center"
          }}
        >
          <div style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            background: "rgba(37,99,235,0.15)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 8
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--c-blue)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
          </div>

          <div style={{ fontSize: 13, fontWeight: 700, color: "#ffffff" }}>
            Click to upload or drag &amp; drop cover photo
          </div>
          <div style={{ fontSize: 11, color: "var(--c-text-3)", marginTop: 2 }}>
            Supports PNG, JPG, WEBP, or AVIF from your device
          </div>
        </div>
      )}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={e => {
          if (e.target.files && e.target.files.length > 0) {
            handleFile(e.target.files[0]);
          }
        }}
      />
    </div>
  );
}

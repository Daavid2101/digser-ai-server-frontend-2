import React, { useRef, useEffect, useState } from "react";
import "./FileUploadField.css";

const FileUploadField = ({
  label,
  name,
  required,
  files,
  onFileChange,
  onRemove,
  description,
  API_URL,
}) => {
  const dropZoneRef = useRef(null);
  const inputRef = useRef(null);

  // Lokaler State für Dateien und Vorschaubilder
  const [fileList, setFileList] = useState(files || []);
  const [previewUrls, setPreviewUrls] = useState([]);

  // Sync mit Props
  useEffect(() => {
    setFileList(files || []);
  }, [files]);

  // Presigned URLs für Server-Dateien und Object URLs für lokale Dateien holen
  useEffect(() => {
    const initialPreviewUrls = fileList.map((file) => {
      if (file instanceof File) {
        return URL.createObjectURL(file);
      }
      return null;
    });
    setPreviewUrls(initialPreviewUrls);

    const fetchUrls = async () => {
      const updatedUrls = await Promise.all(
        fileList.map(async (file, idx) => {
          if (
            file &&
            typeof file.url === "string" &&
            file.url.startsWith("/temp_file")
          ) {
            try {
              const res = await fetch(`${API_URL}/projects${file.url}`);
              if (!res.ok) throw new Error(res.statusText);
              const { url } = await res.json();
              return url;
            } catch (error) {
              console.error(
                `Fehler beim Abrufen der Presigned URL für ${file.url}:`,
                error
              );
              return null;
            }
          }
          return initialPreviewUrls[idx];
        })
      );
      setPreviewUrls(updatedUrls);
    };

    if (
      fileList.some(
        (file) =>
          file &&
          typeof file.url === "string" &&
          file.url.startsWith("/temp_file")
      )
    ) {
      fetchUrls();
    }
  }, [fileList, API_URL]);

  // Cleanup für Object URLs
  useEffect(() => {
    return () => {
      previewUrls.forEach((url) => {
        if (url && url.startsWith("blob:")) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, [previewUrls]);

  // Handler für neue Dateien
  const handleFileChange = (e) => {
    if (e.target.files) onFileChange(name, Array.from(e.target.files));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files)
      onFileChange(name, Array.from(e.dataTransfer.files));
  };

  const handleDragOver = (e) => e.preventDefault();

  const handleClick = (e) => {
    if (e.shiftKey) {
      e.preventDefault();
      dropZoneRef.current.focus();
    }
  };

  const handlePaste = (e) => {
    const items = e.clipboardData.items;
    const pasted = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].kind === "file") {
        const f = items[i].getAsFile();
        if (f) pasted.push(f);
      }
    }
    if (pasted.length) onFileChange(name, pasted);
  };

  useEffect(() => {
    const dz = dropZoneRef.current;
    dz?.addEventListener("paste", handlePaste);
    return () => dz?.removeEventListener("paste", handlePaste);
  }, [name, onFileChange]);

  return (
    <div className="file-upload-field">
      <label className="field-label">
        {label}
        {required && <span style={{ color: "red" }}> *</span>}:
      </label>
      {description && <div className="upload-description">{description}</div>}
      <div
        className="drop-zone"
        ref={dropZoneRef}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={handleClick}
        tabIndex={0}
      >
        <input
          type="file"
          name={name}
          ref={inputRef}
          onChange={handleFileChange}
          required={required}
          multiple
        />
        {fileList.length > 0 ? (
          <div className="file-preview-list">
            {fileList.map((file, idx) => {
              const src = previewUrls[idx];
              return (
                <div key={idx} className="file-preview">
                  {src ? (
                    <img src={src} alt={file.file_name || file.name} />
                  ) : (
                    <span>{file.file_name || file.name}</span>
                  )}
                  <button
                    type="button"
                    className="remove-btn"
                    onClick={() => onRemove(name, idx, file)}
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <span className="drop-message">
            Drag & drop file(s) here, Shift + click to paste with Ctrl+V, or
            click to select
          </span>
        )}
      </div>
    </div>
  );
};

export default FileUploadField;

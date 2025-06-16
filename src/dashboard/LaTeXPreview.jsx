import React from "react";
import PDFViewer from "./PDFViewer";

const LaTeXPreview = ({ pdfUrl, selectedProject, fetchPdf, togglePreview }) => {
  return (
    <aside className="latex-preview">
      <header className="preview-header">
        <h3>Gutachten Vorschau</h3>
        <button className="preview-collapse-btn" onClick={togglePreview}>
          ×
        </button>
      </header>
      <div className="latex-content scrollable">
        {selectedProject ? (
          <PDFViewer pdfUrl={pdfUrl} />
        ) : (
          <p>Kein Projekt ausgewählt</p>
        )}
      </div>
    </aside>
  );
};

export default LaTeXPreview;

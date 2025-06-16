import React, { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { FiZoomIn, FiZoomOut, FiDownload } from "react-icons/fi";
import "react-pdf/dist/esm/Page/TextLayer.css";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";

// Setze den Worker
pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

const PDFViewer = ({ pdfUrl }) => {
  const [numPages, setNumPages] = useState(null);
  const [scale, setScale] = useState(1.0);

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
  };

  const zoomIn = () => setScale((prev) => prev + 0.2);
  const zoomOut = () => setScale((prev) => (prev > 0.4 ? prev - 0.2 : prev));
  const downloadPdf = () => {
    const link = document.createElement("a");
    link.href = pdfUrl;
    link.download = "document.pdf";
    link.click();
  };

  return (
    <div className="pdf-viewer-container">
      <div className="pdf-toolbar">
        <button className="toolbar-btn" onClick={zoomOut}>
          <FiZoomOut />
        </button>
        <button className="toolbar-btn" onClick={zoomIn}>
          <FiZoomIn />
        </button>
        <button className="toolbar-btn" onClick={downloadPdf}>
          <FiDownload />
        </button>
      </div>
      <div className="pdf-viewer">
        <Document file={pdfUrl} onLoadSuccess={onDocumentLoadSuccess}>
          {Array.from(new Array(numPages), (el, index) => (
            <Page
              key={`page_${index + 1}`}
              pageNumber={index + 1}
              scale={scale}
              renderAnnotationLayer={false}
              renderTextLayer={true}
            />
          ))}
        </Document>
      </div>
    </div>
  );
};

export default PDFViewer;

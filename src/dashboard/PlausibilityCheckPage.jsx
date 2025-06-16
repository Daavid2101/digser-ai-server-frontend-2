import React, { useState, useEffect, useRef } from "react";
import "./PlausibilityCheckPage.css";
import {
  FaFilePdf,
  FaChevronLeft,
  FaChevronRight,
  FaTrash,
  FaPlus,
} from "react-icons/fa";
import {
  createPlausibilityCheck,
  deletePlausibilityCheck,
  getPlausibilityChecks,
  getPlausibilityCheckById,
  startPlausibilityCheck,
} from "./plausibilityCheckService";
import ReactMarkdown from "react-markdown";

const ScoreCircle = ({ label, percentage }) => {
  return (
    <div className="score-circle">
      <svg viewBox="0 0 36 36" className="circular-chart">
        <g transform="rotate(-90, 18, 18)">
          <path
            className="circle-bg"
            d="M18 2.0845
               a 15.9155 15.9155 0 0 1 0 31.831
               a 15.9155 15.9155 0 0 1 0 -31.831"
          />
          <path
            className="circle"
            strokeDasharray={`${percentage}, 100`}
            d="M18 2.0845
               a 15.9155 15.9155 0 0 1 0 31.831
               a 15.9155 15.9155 0 0 1 0 -31.831"
          />
        </g>
      </svg>
      <div className="score-label">
        {label}
        <br />
        {percentage}/100
      </div>
    </div>
  );
};

const PlausibilityCheckPage = ({ onBack, apiURL }) => {
  const [checks, setChecks] = useState([]);
  const [newCheckActive, setNewCheckActive] = useState(false);
  const [selectedCheck, setSelectedCheck] = useState(null);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [resultText, setResultText] = useState("");
  const [showNameModal, setShowNameModal] = useState(false);
  const [newCheckName, setNewCheckName] = useState("");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const fileInputRef = useRef(null);

  const [isLoading, setIsLoading] = useState(false);

  // Beim Laden der Checks auch das Scoring parsen
  const fetchChecks = async () => {
    try {
      const loadedChecks = await getPlausibilityChecks(apiURL);
      const parsedChecks = loadedChecks.map((check) => ({
        ...check,
        scoring: check.scoring ? JSON.parse(check.scoring) : null,
      }));
      setChecks(parsedChecks);
    } catch (error) {
      console.error("Fehler beim Laden der Checks:", error);
    }
  };

  useEffect(() => {
    fetchChecks();
  }, [apiURL]);

  const handleSelectCheck = async (check_id) => {
    try {
      const details = await getPlausibilityCheckById(apiURL, check_id);
      // Stelle sicher, dass auch hier das Scoring geparsed wird:
      if (details.scoring && typeof details.scoring === "string") {
        details.scoring = JSON.parse(details.scoring);
      }
      setSelectedCheck(details);
      setNewCheckActive(false);
      setUploadedFile(null);
    } catch (error) {
      console.error("Fehler beim Laden der Check-Details:", error);
    }
  };

  // Nur das Modal öffnen – Hintergrund bleibt gleich
  const handleStartNewCheck = () => {
    setShowNameModal(true);
  };

  // Sobald der Nutzer im Modal einen Namen bestätigt, wird der Check erstellt.
  const handleConfirmModal = async () => {
    if (!newCheckName.trim()) {
      alert("Bitte einen Namen eingeben.");
      return;
    }
    try {
      // Erstelle den Check mit leerem Output und ohne Datei.
      const data = await createPlausibilityCheck(apiURL, newCheckName, "", "");
      const newCheck = {
        check_id: data.check_id,
        name: newCheckName,
        output: "",
        input_file: "",
        scoring: null,
      };
      setChecks((prev) => [newCheck, ...prev]);
      setSelectedCheck(newCheck);
      setNewCheckActive(true); // Wechsel in den neuen Check-Modus für den Upload.
      setShowNameModal(false);
      setNewCheckName("");
      setResultText("");
    } catch (error) {
      console.error("Fehler beim Erstellen des Checks:", error);
      alert("Fehler beim Erstellen des Plausibilitätschecks.");
    }
  };

  const handleUploadAndStart = async () => {
    if (!uploadedFile) {
      alert("Bitte wählen Sie eine Datei aus.");
      return;
    }
    setIsLoading(true);
    try {
      const uploadResult = await startPlausibilityCheck(
        apiURL,
        selectedCheck.check_id,
        uploadedFile
      );
      const updatedCheck = {
        ...selectedCheck,
        input_file: uploadResult.file_path,
        output: uploadResult.output,
        scoring: uploadResult.scoring ? JSON.parse(uploadResult.scoring) : null,
      };
      setSelectedCheck(updatedCheck);
      await fetchChecks();
      setTimeout(() => {
        handleSelectCheck(selectedCheck.check_id);
      }, 1000);
    } catch (error) {
      console.error("Fehler beim Hochladen des PDFs:", error);
      alert("Fehler beim Hochladen des PDFs.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCheck = async (check_id) => {
    try {
      await deletePlausibilityCheck(apiURL, check_id);
      setChecks((prev) => prev.filter((check) => check.check_id !== check_id));
      if (selectedCheck && selectedCheck.check_id === check_id) {
        setSelectedCheck(null);
      }
    } catch (error) {
      console.error("Fehler beim Löschen des Checks:", error);
      alert("Fehler beim Löschen des Plausibilitätschecks.");
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setUploadedFile(file);
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
  };

  const handleDrop = (event) => {
    event.preventDefault();
    if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      setUploadedFile(event.dataTransfer.files[0]);
      event.dataTransfer.clearData();
    }
  };

  const handleSelectClick = () => {
    fileInputRef.current.click();
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const extractFileName = (path) => {
    if (!path) return "";
    return path.split("/").pop();
  };

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  return (
    <div className="plausibility-container">
      {/* Header */}
      <header className="plausi-header">
        <div className="header-left">
          {isSidebarCollapsed && (
            <button className="header-expand-btn" onClick={toggleSidebar}>
              <FaChevronRight />
            </button>
          )}
        </div>
        <div className="header-right">
          <button className="back-to-dashboard-btn" onClick={onBack}>
            Zurück zum Dashboard
          </button>
        </div>
      </header>

      {/* Sidebar */}
      <div
        className="plausi-sidebar-container"
        style={{ width: isSidebarCollapsed ? "0px" : "250px" }}
      >
        {!isSidebarCollapsed && (
          <div className="plausi-sidebar">
            <div className="plausi-sidebar-header">
              <span>Gespeicherte Checks</span>
              <button
                className="plausi-sidebar-collapse-btn"
                onClick={toggleSidebar}
              >
                ×
              </button>
            </div>
            <ul className="plausi-sidebar-menu">
              {checks.map((check) => (
                <li
                  key={check.check_id}
                  onClick={() => handleSelectCheck(check.check_id)}
                  className={
                    selectedCheck && selectedCheck.check_id === check.check_id
                      ? "active"
                      : ""
                  }
                >
                  {check.name}
                  <button
                    className="delete-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteCheck(check.check_id);
                    }}
                  >
                    <FaTrash />
                  </button>
                </li>
              ))}
            </ul>
            <footer className="plausi-sidebar-footer">
              <button
                className="add-tasks-button"
                onClick={handleStartNewCheck}
              >
                <FaPlus /> Neuer Check
              </button>
            </footer>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div
        className="plausibility-main-content"
        style={{ marginLeft: isSidebarCollapsed ? "0px" : "250px" }}
      >
        {selectedCheck ? (
          <div className="existing-check">
            <h2>{selectedCheck.name}</h2>
            {/* Gemeinsamer Upload-/Vorschau-Bereich */}
            <div
              className="file-upload"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              {!selectedCheck.input_file ? (
                uploadedFile ? (
                  <div className="pdf-preview">
                    <div className="attachment-pdf-icon">
                      <FaFilePdf size={60} color="#d63333" />
                      <button
                        className="remove-file-btn"
                        onClick={handleRemoveFile}
                      >
                        ✖
                      </button>
                    </div>
                    <div className="pdf-filename">{uploadedFile.name}</div>
                  </div>
                ) : (
                  <p>
                    Ziehen Sie eine Datei hierher oder{" "}
                    <span className="select-file" onClick={handleSelectClick}>
                      Datei auswählen
                    </span>
                  </p>
                )
              ) : (
                <div className="pdf-preview">
                  <a
                    href={`${apiURL}/files/${selectedCheck.input_file}`}
                    target="_blank"
                    rel="noreferrer"
                    className="attachment-pdf-icon"
                  >
                    <FaFilePdf size={60} color="#d63333" />
                    <span className="download-icon">↓</span>
                  </a>
                  <div className="pdf-filename">
                    {extractFileName(selectedCheck.input_file)}
                  </div>
                </div>
              )}
              <input
                type="file"
                accept="application/pdf"
                ref={fileInputRef}
                onChange={handleFileSelect}
                style={{ display: "none" }}
              />
            </div>
            {!selectedCheck.input_file && (
              <button
                className="start-check-button"
                onClick={handleUploadAndStart}
              >
                {isLoading ? (
                  <div className="spinner" />
                ) : (
                  "Start Plausibilitätscheck"
                )}
              </button>
            )}
            {/* Scoring-Bereich */}
            {selectedCheck.scoring && (
              <div className="scoring-container">
                <ScoreCircle
                  label="Genauigkeit"
                  percentage={selectedCheck.scoring.accuracy || 0}
                />
                <ScoreCircle
                  label="Struktur"
                  percentage={selectedCheck.scoring.structure || 0}
                />
                <ScoreCircle
                  label="Sprache"
                  percentage={selectedCheck.scoring.language || 0}
                />
                <ScoreCircle
                  label="Vollständigkeit"
                  percentage={selectedCheck.scoring.completeness || 0}
                />
                <ScoreCircle
                  label="Präsentation"
                  percentage={selectedCheck.scoring.presentation || 0}
                />
              </div>
            )}
            <div className="output-area">
              <h3>Zusammenfassung:</h3>
              <pre>{selectedCheck.tldr}</pre>
              <br />
              <h3>KI Bewertung:</h3>
              <pre>{selectedCheck.output.replace(/\\n/g, "\n")}</pre>
            </div>
          </div>
        ) : newCheckActive ? (
          <div className="new-check">
            <h2>Neuer Plausibilitätscheck</h2>
            <div
              className="file-upload"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              {uploadedFile ? (
                <div className="pdf-preview">
                  <div className="attachment-pdf-icon">
                    <FaFilePdf size={60} color="#d63333" />
                    <button
                      className="remove-file-btn"
                      onClick={handleRemoveFile}
                    >
                      ✖
                    </button>
                  </div>
                  <div className="pdf-filename">{uploadedFile.name}</div>
                </div>
              ) : (
                <p>
                  Ziehen Sie eine Datei hierher oder{" "}
                  <span className="select-file" onClick={handleSelectClick}>
                    Datei auswählen
                  </span>
                </p>
              )}
              <input
                type="file"
                accept="application/pdf"
                ref={fileInputRef}
                onChange={handleFileSelect}
                style={{ display: "none" }}
              />
            </div>
            <button
              className="start-check-button"
              onClick={handleUploadAndStart}
            >
              Start Plausibilitätscheck
            </button>
          </div>
        ) : (
          <div className="placeholder">
            <h2>Willkommen zur Plausibilitätsprüfung</h2>
            <p>
              Klicken Sie auf "Neuer Check" in der Sidebar oder wählen Sie einen
              bestehenden Check aus.
            </p>
          </div>
        )}
      </div>

      {/* Modal zum Eingeben des Check-Namens */}
      {showNameModal && (
        <div className="plausi-modal-overlay">
          <div className="plausi-modal">
            <h3>Name des Checks eingeben</h3>
            <input
              type="text"
              value={newCheckName}
              onChange={(e) => setNewCheckName(e.target.value)}
              placeholder="Name des Checks"
            />
            <div className="plausi-modal-buttons">
              <button onClick={handleConfirmModal}>Speichern</button>
              <button
                onClick={() => {
                  setShowNameModal(false);
                  setNewCheckActive(false);
                }}
              >
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlausibilityCheckPage;

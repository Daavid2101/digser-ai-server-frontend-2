import React, { useState, useEffect, useCallback } from "react";
import {
  FiX,
  FiUpload,
  FiFile,
  FiTrash2,
  FiEye,
  FiFileText,
  FiEdit2,
} from "react-icons/fi";

const KnowledgeSettingsModal = ({
  isOpen,
  onClose,
  API_URL,
  projectId,
  knowledgeOptions,
  onSave,
}) => {
  const [selectedSetting, setSelectedSetting] = useState("Prompts");
  const [selectedOption, setSelectedOption] = useState(
    knowledgeOptions && knowledgeOptions.length > 0
      ? knowledgeOptions[0].id
      : ""
  );
  const [knowledgeText, setKnowledgeText] = useState("");
  const [promptText, setPromptText] = useState("");
  const [knowledgeFiles, setKnowledgeFiles] = useState([]);
  const [existingKnowledge, setExistingKnowledge] = useState([]);
  const [filesToDelete, setFilesToDelete] = useState([]);
  const [isGlobal, setIsGlobal] = useState(true);

  // States für Erweiterter Context
  const [contextAssistant, setContextAssistant] = useState("all");
  const [contextProject, setContextProject] = useState("current");
  const [contextFile, setContextFile] = useState(null);
  const [contextPreview, setContextPreview] = useState("");
  const [contextProcessing, setContextProcessing] = useState(false);
  const [existingContexts, setExistingContexts] = useState([]);
  const [pendingContextFiles, setPendingContextFiles] = useState([]);
  const [editingContext, setEditingContext] = useState(null);
  const [editAssistant, setEditAssistant] = useState("all");
  const [editProject, setEditProject] = useState("current");

  // Beim Öffnen des Modals oder Wechsel der Auswahl die Daten laden
  useEffect(() => {
    if (isOpen && selectedOption) {
      if (selectedSetting === "Knowledge") {
        fetchExistingKnowledge();
      } else if (selectedSetting === "Prompts") {
        fetchPrompt();
      } else if (selectedSetting === "Context") {
        fetchExistingContexts();
      }
    }
  }, [isOpen, selectedOption, selectedSetting]);

  const fetchExistingKnowledge = async () => {
    try {
      const res = await fetch(`${API_URL}/knowledge/get/${selectedOption}`);
      const data = await res.json();
      setExistingKnowledge(data);
      const textFile = data.find((k) => k.file_type === ".txt");
      if (textFile) {
        const textRes = await fetch(
          `${API_URL}/knowledge/preview/${textFile.file_name}`
        );
        const textContent = await textRes.text();
        setKnowledgeText(textContent);
      } else {
        setKnowledgeText("");
      }
    } catch (err) {
      console.error("Error fetching knowledge:", err);
    }
  };

  const fetchPrompt = async () => {
    try {
      const res = await fetch(`${API_URL}/prompts/get/${selectedOption}`);
      const data = await res.json();
      setPromptText(data.prompt || "");
    } catch (err) {
      console.error("Error fetching prompt:", err);
    }
  };

  const fetchExistingContexts = async () => {
    try {
      const params = new URLSearchParams({
        assistant: contextAssistant === "all" ? "" : contextAssistant,
        project_id: contextProject === "current" ? projectId : "",
      });
      const res = await fetch(`${API_URL}/context/get?${params}`);
      const data = await res.json();
      setExistingContexts(data || []);
    } catch (err) {
      console.error("Error fetching contexts:", err);
    }
  };

  const handleSavePrompt = async () => {
    try {
      const res = await fetch(`${API_URL}/prompts/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task_name: selectedOption,
          prompt: promptText,
        }),
      });
      if (res.ok) {
        alert("Prompt gespeichert");
      } else {
        alert("Fehler beim Speichern des Prompts");
      }
    } catch (err) {
      console.error("Error saving prompt:", err);
    }
  };

  const handleContextFileUpload = async () => {
    if (pendingContextFiles.length === 0) return;

    setContextProcessing(true);

    for (const file of pendingContextFiles) {
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("assistant", contextAssistant);
        formData.append(
          "project_id",
          contextProject === "current" ? projectId : ""
        );

        const res = await fetch(`${API_URL}/context/process`, {
          method: "POST",
          body: formData,
        });

        if (res.ok) {
          const data = await res.json();
          setContextPreview(data.preview || "");
          fetchExistingContexts();
        } else {
          alert(`Fehler beim Verarbeiten der Datei: ${file.name}`);
        }
      } catch (err) {
        console.error("Error processing context document:", err);
        alert(`Fehler beim Verarbeiten der Datei: ${file.name}`);
      }
    }

    setPendingContextFiles([]);
    setContextProcessing(false);
  };

  const handleDeleteContext = async (contextId) => {
    try {
      const res = await fetch(`${API_URL}/context/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context_id: contextId }),
      });

      if (res.ok) {
        fetchExistingContexts();
      } else {
        alert("Fehler beim Löschen des Kontexts");
      }
    } catch (err) {
      console.error("Error deleting context:", err);
    }
  };

  const handleViewSummary = async (contextId) => {
    try {
      const res = await fetch(`${API_URL}/context/summary/${contextId}`);
      if (res.ok) {
        const data = await res.json();
        setContextPreview(data.summary || "");
      } else {
        alert("Fehler beim Abrufen der Zusammenfassung");
      }
    } catch (err) {
      console.error("Error fetching summary:", err);
      alert("Fehler beim Abrufen der Zusammenfassung");
    }
  };

  const handleEditContext = (context) => {
    setEditingContext(context);
    setEditAssistant(context.assistant || "all");
    setEditProject(context.project_id ? "current" : "all");
  };

  const handleSaveEditContext = async () => {
    if (!editingContext) return;

    try {
      const res = await fetch(`${API_URL}/context/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          context_id: editingContext.context_id,
          assistant: editAssistant,
          project_id: editProject === "current" ? projectId : "all",
        }),
      });

      if (res.ok) {
        fetchExistingContexts();
        setEditingContext(null);
        setContextPreview("");
      } else {
        alert("Fehler beim Aktualisieren des Kontexts");
      }
    } catch (err) {
      console.error("Error updating context:", err);
      alert("Fehler beim Aktualisieren des Kontexts");
    }
  };

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (selectedSetting === "Context") {
        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
          setPendingContextFiles((prev) => [...prev, ...files]);
        }
      } else {
        const droppedFiles = Array.from(e.dataTransfer.files);
        setKnowledgeFiles((prev) => [...prev, ...droppedFiles]);
      }
    },
    [selectedSetting]
  );

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleFileChange = (e) => {
    if (selectedSetting === "Context") {
      const files = Array.from(e.target.files);
      if (files.length > 0) {
        setPendingContextFiles((prev) => [...prev, ...files]);
      }
    } else {
      setKnowledgeFiles((prev) => [...prev, ...Array.from(e.target.files)]);
    }
  };

  const removePendingFile = (index) => {
    setPendingContextFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const removeNewFile = (index) => {
    setKnowledgeFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const markFileForDeletion = (knowledgeId) => {
    setFilesToDelete((prev) => [...prev, knowledgeId]);
  };

  const convertFileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result.split(",")[1];
        resolve({ name: file.name, content: base64 });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleSave = async () => {
    let filePayload = [];
    try {
      filePayload = await Promise.all(knowledgeFiles.map(convertFileToBase64));
    } catch (error) {
      console.error("Fehler bei der Dateikonvertierung:", error);
    }

    const existingTxt = existingKnowledge.find((k) => k.file_type === ".txt");

    const payload = {
      task_name: selectedOption,
      project_id: projectId,
      text: knowledgeText,
      files: filePayload,
      is_global: isGlobal,
      update_existing_txt: existingTxt ? true : false,
      existing_txt_id: existingTxt ? existingTxt.knowledge_id : null,
    };

    try {
      const res = await fetch(`${API_URL}/knowledge/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        console.error("Fehler beim Speichern von Knowledge:", res.status);
      }
    } catch (err) {
      console.error("Error saving knowledge:", err);
    }

    for (const knowledgeId of filesToDelete) {
      try {
        await fetch(`${API_URL}/knowledge/delete`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ knowledge_id: knowledgeId }),
        });
      } catch (err) {
        console.error("Error deleting knowledge:", err);
      }
    }

    setKnowledgeText("");
    setKnowledgeFiles([]);
    setFilesToDelete([]);
    setIsGlobal(true);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{ backgroundColor: "rgba(0,0,0,0.3)" }}
    >
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          display: "flex",
          width: "85%",
          maxWidth: "1000px",
          height: "70%",
          maxHeight: "700px",
          backgroundColor: "#fff",
          borderRadius: "8px",
          padding: "20px",
          position: "relative",
        }}
      >
        {/* Linke Sidebar */}
        <div
          style={{
            flex: "1",
            borderRight: "1px solid #ccc",
            paddingRight: "10px",
          }}
        >
          <h3 style={{ marginTop: 0 }}>Settings</h3>
          <ul style={{ listStyle: "none", padding: 0 }}>
            <li
              style={{
                padding: "8px",
                cursor: "pointer",
                backgroundColor:
                  selectedSetting === "Prompts" ? "#007bff" : "transparent",
                color: selectedSetting === "Prompts" ? "#fff" : "#000",
                borderRadius: "4px",
              }}
              onClick={() => setSelectedSetting("Prompts")}
            >
              Prompts
            </li>
            <li
              style={{
                padding: "8px",
                cursor: "pointer",
                backgroundColor:
                  selectedSetting === "Context" ? "#007bff" : "transparent",
                color: selectedSetting === "Context" ? "#fff" : "#000",
                borderRadius: "4px",
              }}
              onClick={() => setSelectedSetting("Context")}
            >
              Erweiterter Context
            </li>
          </ul>
        </div>

        {/* Rechte Content-Area */}
        <div
          style={{
            flex: "2",
            paddingLeft: "20px",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {selectedSetting === "Prompts" && (
            <>
              <h3>Prompt bearbeiten</h3>
              <label style={{ display: "block", marginBottom: "10px" }}>
                Wähle einen Task/Assistenten:
                <select
                  value={selectedOption}
                  onChange={(e) => setSelectedOption(e.target.value)}
                  style={{ marginLeft: "8px" }}
                >
                  {knowledgeOptions &&
                    knowledgeOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.name}
                      </option>
                    ))}
                </select>
              </label>
              <textarea
                placeholder="Geben Sie hier Ihren Prompt ein..."
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                rows={6}
                style={{ width: "100%", marginBottom: "10px", padding: "8px" }}
              />
              <button
                onClick={handleSavePrompt}
                style={{
                  padding: "8px 12px",
                  backgroundColor: "#007bff",
                  color: "#fff",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                Speichern
              </button>
            </>
          )}

          {selectedSetting === "Context" && (
            <>
              <h3>Erweiterter Context</h3>

              {/* Assistant Auswahl */}
              <div style={{ marginBottom: "15px" }}>
                <label style={{ display: "block", marginBottom: "5px" }}>
                  Assistant:
                </label>
                <select
                  value={contextAssistant}
                  onChange={(e) => {
                    setContextAssistant(e.target.value);
                    setContextPreview("");
                    setContextFile(null);
                  }}
                  style={{
                    width: "100%",
                    padding: "8px",
                    borderRadius: "4px",
                    border: "1px solid #ccc",
                  }}
                  disabled={editingContext}
                >
                  <option value="all">Für alle Assistenten</option>
                  {knowledgeOptions &&
                    knowledgeOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.name}
                      </option>
                    ))}
                </select>
              </div>

              {/* Projekt Auswahl */}
              <div style={{ marginBottom: "15px" }}>
                <label style={{ display: "block", marginBottom: "5px" }}>
                  Projekt:
                </label>
                <select
                  value={contextProject}
                  onChange={(e) => {
                    setContextProject(e.target.value);
                    setContextPreview("");
                    setContextFile(null);
                  }}
                  style={{
                    width: "100%",
                    padding: "8px",
                    borderRadius: "4px",
                    border: "1px solid #ccc",
                  }}
                  disabled={editingContext}
                >
                  <option value="current">Aktuelles Projekt</option>
                  <option value="all">Für alle Projekte</option>
                </select>
              </div>

              {/* File Upload */}
              {!editingContext && (
                <>
                  <div
                    style={{
                      border: "2px dashed #ccc",
                      borderRadius: "8px",
                      padding: "20px",
                      textAlign: "center",
                      marginBottom: "15px",
                      backgroundColor: contextProcessing
                        ? "#f8f9fa"
                        : "#fafafa",
                      cursor: contextProcessing ? "not-allowed" : "pointer",
                    }}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onClick={() => {
                      if (!contextProcessing) {
                        document.getElementById("context-file-upload").click();
                      }
                    }}
                  >
                    <input
                      type="file"
                      id="context-file-upload"
                      style={{ display: "none" }}
                      onChange={(e) => handleFileChange(e)}
                      accept=".pdf,.doc,.docx,.txt"
                      disabled={contextProcessing}
                      multiple
                    />
                    {contextProcessing ? (
                      <div>
                        <div
                          className="spinner"
                          style={{ margin: "0 auto 10px" }}
                        />
                        <p>Dokument wird verarbeitet...</p>
                      </div>
                    ) : (
                      <div>
                        <FiUpload
                          size={32}
                          style={{ marginBottom: "10px", color: "#666" }}
                        />
                        <p>Dokument hier ablegen oder klicken zum Auswählen</p>
                        <small style={{ color: "#666" }}>
                          Unterstützte Formate: PDF, DOC, DOCX, TXT
                        </small>
                      </div>
                    )}
                  </div>

                  {/* Pending Files */}
                  {pendingContextFiles.length > 0 && (
                    <div style={{ marginBottom: "15px" }}>
                      <h4>Ausstehende Dateien:</h4>
                      <div style={{ maxHeight: "100px", overflowY: "auto" }}>
                        {pendingContextFiles.map((file, index) => (
                          <div
                            key={index}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              padding: "8px",
                              border: "1px solid #eee",
                              borderRadius: "4px",
                              marginBottom: "5px",
                              backgroundColor: "#f9f9f9",
                            }}
                          >
                            <FiFile
                              style={{ marginRight: "8px", color: "#666" }}
                            />
                            <div style={{ flex: 1, fontSize: "14px" }}>
                              {file.name}
                            </div>
                            <button
                              onClick={() => removePendingFile(index)}
                              style={{
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                color: "#dc3545",
                                padding: "4px",
                              }}
                              title="Datei entfernen"
                            >
                              <FiTrash2 size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={handleContextFileUpload}
                        style={{
                          padding: "8px 12px",
                          backgroundColor: "#007bff",
                          color: "#fff",
                          border: "none",
                          borderRadius: "4px",
                          cursor: "pointer",
                          marginTop: "10px",
                        }}
                        disabled={contextProcessing}
                      >
                        Dateien hochladen
                      </button>
                    </div>
                  )}
                </>
              )}

              {/* Edit Context Form */}
              {editingContext && (
                <div style={{ marginBottom: "15px" }}>
                  <h4>Kontext bearbeiten: {editingContext.file_name}</h4>
                  <div style={{ marginBottom: "15px" }}>
                    <label style={{ display: "block", marginBottom: "5px" }}>
                      Assistant:
                    </label>
                    <select
                      value={editAssistant}
                      onChange={(e) => setEditAssistant(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "8px",
                        borderRadius: "4px",
                        border: "1px solid #ccc",
                      }}
                    >
                      <option value="all">Für alle Assistenten</option>
                      {knowledgeOptions &&
                        knowledgeOptions.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.name}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div style={{ marginBottom: "15px" }}>
                    <label style={{ display: "block", marginBottom: "5px" }}>
                      Projekt:
                    </label>
                    <select
                      value={editProject}
                      onChange={(e) => setEditProject(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "8px",
                        borderRadius: "4px",
                        border: "1px solid #ccc",
                      }}
                    >
                      <option value="current">Aktuelles Projekt</option>
                      <option value="all">Für alle Projekte</option>
                    </select>
                  </div>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <button
                      onClick={handleSaveEditContext}
                      style={{
                        padding: "8px 12px",
                        backgroundColor: "#007bff",
                        color: "#fff",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                      }}
                    >
                      Änderungen speichern
                    </button>
                    <button
                      onClick={() => setEditingContext(null)}
                      style={{
                        padding: "8px 12px",
                        backgroundColor: "#6c757d",
                        color: "#fff",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                      }}
                    >
                      Abbrechen
                    </button>
                  </div>
                </div>
              )}

              {/* Context Preview */}
              {contextPreview && (
                <div style={{ marginBottom: "15px" }}>
                  <h4>Extrahierte Zusammenfassung:</h4>
                  <div
                    style={{
                      border: "1px solid #ccc",
                      borderRadius: "4px",
                      padding: "10px",
                      backgroundColor: "#f8f9fa",
                      maxHeight: "200px",
                      overflowY: "auto",
                      fontSize: "14px",
                      lineHeight: "1.4",
                    }}
                  >
                    {contextPreview}
                  </div>
                </div>
              )}

              {/* Existing Contexts */}
              {existingContexts.length > 0 && (
                <div>
                  <h4>Vorhandene Kontexte:</h4>
                  <div style={{ maxHeight: "200px", overflowY: "auto" }}>
                    {existingContexts.map((context, index) => (
                      <div
                        key={index}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          padding: "8px",
                          border: "1px solid #eee",
                          borderRadius: "4px",
                          marginBottom: "5px",
                          backgroundColor: "#f9f9f9",
                        }}
                      >
                        <FiFile style={{ marginRight: "8px", color: "#666" }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: "bold", fontSize: "14px" }}>
                            {context.file_name || "Unbekannte Datei"}
                          </div>
                          <div style={{ fontSize: "12px", color: "#666" }}>
                            {context.assistant === "all"
                              ? "Alle Assistenten"
                              : context.assistant}{" "}
                            •
                            {context.project_id === "all"
                              ? "Alle Projekte"
                              : "Aktuelles Projekt"}
                          </div>
                        </div>
                        <button
                          onClick={() => handleEditContext(context)}
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            color: "#ffc107",
                            padding: "4px",
                            marginRight: "8px",
                          }}
                          title="Kontext bearbeiten"
                        >
                          <FiEdit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleViewSummary(context.context_id)}
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            color: "#28a745",
                            padding: "4px",
                            marginRight: "8px",
                          }}
                          title="Zusammenfassung anzeigen"
                        >
                          <FiFileText size={16} />
                        </button>
                        <button
                          onClick={() =>
                            window.open(
                              `${API_URL}/context/file/${context.context_id}`,
                              "_blank"
                            )
                          }
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            color: "#007bff",
                            padding: "4px",
                            marginRight: "8px",
                          }}
                          title="Datei anzeigen"
                        >
                          <FiEye size={16} />
                        </button>
                        <button
                          onClick={() =>
                            handleDeleteContext(context.context_id)
                          }
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            color: "#dc3545",
                            padding: "4px",
                          }}
                          title="Kontext löschen"
                        >
                          <FiTrash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <button
          className="modal-close"
          onClick={onClose}
          style={{
            position: "absolute",
            top: "10px",
            right: "10px",
            background: "transparent",
            border: "none",
            cursor: "pointer",
          }}
        >
          <FiX size={24} />
        </button>
      </div>
    </div>
  );
};

export default KnowledgeSettingsModal;

import React, { useState, useRef, useEffect } from "react";
import { FaTimes } from "react-icons/fa";
import { BsMicFill } from "react-icons/bs";
import { FiPaperclip, FiDownload, FiSettings, FiGlobe } from "react-icons/fi";
import CarouselMessage from "./functions";
import KnowledgeSettingsModal from "./KnowledgeSettingsModal";
import "./Dashboard.css";

const formatTimestamp = (timestamp) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;
  const oneDay = 24 * 60 * 60 * 1000;
  const timeString = date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  if (diff > oneDay) {
    const dateString = date.toLocaleDateString([], {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
    });
    return `${dateString} ${timeString}`;
  }
  return timeString;
};

const ChatArea = ({
  username,
  userId,
  selectedProject,
  selectedTask,
  messages,
  API_URL,
  files,
  setFiles,
  inputMessage,
  setInputMessage,
  removeFile,
  setMessages,
  onReceived,
  pageEditorRef,
}) => {
  const inputRef = useRef(null);
  const [recording, setRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const [rows, setRows] = useState(1);
  const chatWindowRef = useRef(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [toolCalls, setToolCalls] = useState([]);
  const [toolInput, setToolInput] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isModalOpen_knowledge, setIsModalOpen_knowledge] = useState(false);
  const [modalImage, setModalImage] = useState(null);
  const [mode, setMode] = useState("schnell");
  const [showModeMenu, setShowModeMenu] = useState(false);
  const [webSearchEnabled, setWebSearchEnabled] = useState(false); // Neuer State für Web Search

  useEffect(() => {
    if (chatWindowRef.current) {
      chatWindowRef.current.scrollTo({
        top: chatWindowRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showModeMenu && !event.target.closest(".mode-selector")) {
        setShowModeMenu(false);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [showModeMenu]);

  const maxRows = 10;

  const handleInputChange = (e) => {
    const { value } = e.target;
    e.target.style.height = "auto";
    const explicitLines = value.split("\n").length;
    const extraRow = e.target.scrollHeight > e.target.clientHeight ? 1 : 0;
    const totalRows = Math.min(explicitLines + extraRow, maxRows);
    setRows(totalRows);
    setInputMessage(value);
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (inputMessage.trim() || files.length > 0) {
        onSend();
      }
    }
  };

  const formatMessage = (text) => {
    if (!text) return "";

    // Zuerst HTML-Zeichen escapen
    const escaped = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // Links verarbeiten (vor dem Escaping war <url_tag> noch intakt)
    const withLinks = text.replace(
      /<url_tag><text>(.*?)<\/text><url>(.*?)<\/url><\/url_tag>/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer" class="chat-link">$1</a>'
    );

    // Nach Link-Verarbeitung HTML escapen (außer bereits verarbeitete Links)
    const escapedWithLinks = withLinks
      .replace(/&(?!amp;|lt;|gt;|#)/g, "&amp;")
      .replace(/<(?!\/?(a|strong|em|u|br)\b[^>]*>)/g, "&lt;")
      .replace(/(?<!<[^>]*)>(?![^<]*<\/)/g, "&gt;");

    // Markdown-Formatierung anwenden
    return escapedWithLinks
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/__(.*?)__/g, "<u>$1</u>")
      .replace(/\n/g, "<br>");
  };

  const onSend = async () => {
    if (loading) return;
    setLoading(true);

    if (!inputMessage.trim() && files.length === 0) {
      setLoading(false);
      return;
    }

    if (pageEditorRef && pageEditorRef.current) {
      try {
        await pageEditorRef.current.save();
        console.log("PageEditor-Inhalt erfolgreich gespeichert.");
      } catch (error) {
        console.error("Fehler beim Speichern des PageEditor-Inhalts:", error);
      }
    }

    const userMsg = {
      sender: "user",
      message: inputMessage.trim(),
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputMessage("");

    const tempAssistantMsg = {
      sender: "assistant",
      message: "KI wird gestartet...",
      timestamp: new Date().toISOString(),
      isStreaming: true,
    };
    setMessages((prev) => [...prev, tempAssistantMsg]);

    const filePromises = files.map(
      (file) =>
        new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            resolve({
              name: file.name,
              content: reader.result.split(",")[1],
            });
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        })
    );

    try {
      const encodedFiles = await Promise.all(filePromises);
      // const userId = localStorage.getItem("user_id");

      const res = await fetch(`${API_URL}/chat/trigger_send_message`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-ID": userId,
        },
        body: JSON.stringify({
          input: userMsg.message,
          user_id: userId,
          project_id: selectedProject.project_id,
          task: selectedTask,
          files: encodedFiles,
          username: username,
          mode: mode,
          webSearchEnabled: webSearchEnabled,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const jobId = data.job_id;

        setIsStreaming(true);
        const eventSource = new EventSource(
          `${API_URL}/chat/send_message_update_stream/${jobId}`
        );
        eventSource.onmessage = (event) => {
          const parsedData = JSON.parse(event.data);

          if (parsedData.type === "done") {
            console.log("💥 SSE 'done'-Event empfangen:", parsedData);
            eventSource.close();
            setIsStreaming(false);
            setMessages((prev) =>
              prev.map((msg, i) =>
                i === prev.length - 1 ? { ...msg, isStreaming: false } : msg
              )
            );
            setToolInput("");
            setLoading(false);
            onReceived && onReceived(parsedData);
          } else if (parsedData.type === "text") {
            setMessages((prev) =>
              prev.map((msg, index) =>
                index === prev.length - 1
                  ? { ...msg, message: parsedData.content }
                  : msg
              )
            );
          } else if (parsedData.type === "tool_call") {
            const toolCall = JSON.parse(parsedData.content);
            setToolInput(JSON.stringify(toolCall.tool_input));
          } else if (parsedData.type === "final_message") {
            setMessages((prev) =>
              prev.map((msg, index) =>
                index === prev.length - 1
                  ? { ...msg, message: parsedData.content, isStreaming: false }
                  : msg
              )
            );
            setToolInput("");
            onReceived && onReceived(parsedData);
          } else if (parsedData.type === "error") {
            setMessages((prev) =>
              prev.map((msg, index) =>
                index === prev.length - 1
                  ? {
                      ...msg,
                      message: `Fehler: ${parsedData.content}`,
                      isStreaming: false,
                    }
                  : msg
              )
            );
            setLoading(false);
          }
        };
        eventSource.onerror = (err) => {
          console.error("EventSource-Fehler:", err);
          eventSource.close();
          setIsStreaming(false);
          setLoading(false);
        };
      } else {
        setLoading(false);
        alert("Fehler beim Senden der Nachricht");
      }
    } catch (err) {
      console.error("Fehler beim Senden der Nachricht:", err);
      setLoading(false);
    } finally {
      setFiles([]);
    }
  };

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    let mimeType = "";
    if (MediaRecorder.isTypeSupported("audio/mp4")) {
      mimeType = "audio/mp4";
    } else if (MediaRecorder.isTypeSupported("audio/webm")) {
      mimeType = "audio/webm";
    }
    mediaRecorderRef.current = new MediaRecorder(
      stream,
      mimeType ? { mimeType } : undefined
    );
    mediaRecorderRef.current.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunksRef.current.push(event.data);
      }
    };
    mediaRecorderRef.current.onstop = () => {
      const blob = new Blob(audioChunksRef.current, {
        type: mimeType || "audio/webm",
      });
      audioChunksRef.current = [];
      const fileExtension = mimeType === "audio/mp4" ? ".mp4" : ".webm";
      const audioFile = new File([blob], `recording${fileExtension}`, {
        type: blob.type,
      });
      setFiles((prev) => [...prev, audioFile]);
    };
    mediaRecorderRef.current.start();
    setRecording(true);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
  };

  const toggleRecording = () => {
    recording ? stopRecording() : startRecording();
  };

  return (
    <main className="chat-area">
      <section className="chat-window" ref={chatWindowRef}>
        <div className="chat-content">
          {messages.map((msg, idx) => {
            if (
              !msg.message &&
              (!msg.attachments || msg.attachments.length === 0)
            )
              return null;
            return (
              <div key={idx} className="message-container">
                <div
                  className={`message ${
                    msg.sender === "user" ? "sent" : "received"
                  } ${msg.isStreaming ? "streaming" : ""}`}
                  style={{ position: "relative", overflow: "visible" }}
                >
                  {msg.message && (
                    <div
                      dangerouslySetInnerHTML={{
                        __html: formatMessage(msg.message),
                      }}
                    />
                  )}
                  {msg.isStreaming && (
                    <span className="streaming-indicator">...</span>
                  )}
                  {idx === messages.length - 1 && isStreaming && toolInput && (
                    <div
                      className="tool-call-bubble"
                      style={{ textAlign: "right" }}
                    >
                      <span className="tool-call-icon">💭</span>
                      <span>{toolInput}</span>
                    </div>
                  )}
                  {msg.attachments && (
                    <div className="attachments">
                      {[
                        ...(msg.attachments.audios || []),
                        ...(msg.attachments.documents || []),
                        ...(msg.attachments.images || []),
                      ].map((attachment, i2) => {
                        const url = `${API_URL}/files/${attachment}`;
                        if (
                          typeof attachment === "string" &&
                          (attachment.toLowerCase().endsWith(".mp4") ||
                            attachment.toLowerCase().endsWith(".webm") ||
                            attachment.toLowerCase().endsWith(".mp3") ||
                            attachment.toLowerCase().endsWith(".wav"))
                        ) {
                          return (
                            <audio
                              key={i2}
                              controls
                              src={url}
                              className="file-audio"
                            />
                          );
                        } else if (
                          typeof attachment === "string" &&
                          attachment.toLowerCase().endsWith(".pdf")
                        ) {
                          return (
                            <a
                              key={i2}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              download
                              className="attachment-pdf-icon"
                              title="PDF herunterladen"
                            >
                              <span className="pdf-label">PDF</span>
                              <span className="download-icon">
                                <FiDownload />
                              </span>
                            </a>
                          );
                        } else if (
                          typeof attachment === "string" &&
                          attachment.toLowerCase().endsWith(".csv")
                        ) {
                          return (
                            <a
                              key={i2}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              download
                              className="attachment-csv-icon"
                              title="CSV herunterladen"
                            >
                              <span className="csv-label">CSV</span>
                              <span className="download-icon">
                                <FiDownload />
                              </span>
                            </a>
                          );
                        } else if (
                          typeof attachment === "string" &&
                          (attachment.toLowerCase().endsWith(".jpg") ||
                            attachment.toLowerCase().endsWith(".jpeg") ||
                            attachment.toLowerCase().endsWith(".png") ||
                            attachment.toLowerCase().endsWith(".gif"))
                        ) {
                          return (
                            <img
                              key={i2}
                              src={url}
                              alt={`Attachment ${i2 + 1}`}
                              className="attachment-image"
                              style={{ cursor: "pointer" }}
                              onClick={() => {
                                setModalImage(url);
                                setIsModalOpen(true);
                              }}
                            />
                          );
                        } else {
                          return (
                            <div key={i2} className="attachment-file">
                              <FiPaperclip className="file-icon" />
                              <span>Unsupported file: {attachment}</span>
                            </div>
                          );
                        }
                      })}
                    </div>
                  )}
                </div>
                <div
                  className={`timestamp ${
                    msg.sender === "user" ? "timestamp-right" : "timestamp-left"
                  }`}
                >
                  {formatTimestamp(msg.timestamp)}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="input-background"></div>

      {selectedProject && (
        <>
          <footer className="input-area">
            {files.length > 0 && (
              <div className="file-preview-container">
                {files.map((file, index) => (
                  <div key={index} className="file-preview-item">
                    {file.type.startsWith("audio/") ? (
                      <audio
                        controls
                        src={URL.createObjectURL(file)}
                        className="file-audio"
                      />
                    ) : file.type.startsWith("image/") ? (
                      <img
                        src={URL.createObjectURL(file)}
                        alt={file.name}
                        className="file-preview-image"
                      />
                    ) : (
                      <div className="file-preview-icon">
                        <FiPaperclip className="file-icon" />
                      </div>
                    )}
                    <span className="file-name">{file.name}</span>
                    <button
                      onClick={() => removeFile(index)}
                      className="remove-file-button"
                    >
                      <FaTimes />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="input-container">
              <textarea
                ref={inputRef}
                rows={rows}
                value={inputMessage}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                placeholder="Hier schreiben..."
                className="message-input"
              />
            </div>
            <div className="controls">
              <div className="left-controls">
                <label htmlFor="file-upload" className="file-upload-label">
                  <FiPaperclip />
                  <input
                    type="file"
                    id="file-upload"
                    className="file-input"
                    multiple
                    onChange={(e) => {
                      const uploadedFiles = Array.from(e.target.files);
                      setFiles((prev) => [...prev, ...uploadedFiles]);
                      e.target.value = "";
                    }}
                  />
                </label>
                <div className="mode-selector">
                  <button
                    className="mode-selector-button"
                    onClick={() => setShowModeMenu((v) => !v)}
                  >
                    {mode === "schnell" ? "⚡ Schnell" : "🤖 Intelligent"}
                    <span
                      className={`chevron ${showModeMenu ? "up" : "down"}`}
                    />
                  </button>
                  {showModeMenu && (
                    <div className="mode-selector-menu">
                      <div
                        className={`mode-selector-item${
                          mode === "schnell" ? " active" : ""
                        }`}
                        onClick={() => {
                          setMode("schnell");
                          setShowModeMenu(false);
                        }}
                      >
                        ⚡ Schnell (empfohlen)
                      </div>
                      <div
                        className={`mode-selector-item${
                          mode === "intelligent" ? " active" : ""
                        }`}
                        onClick={() => {
                          setMode("intelligent");
                          setShowModeMenu(false);
                        }}
                      >
                        🤖 Intelligent
                      </div>
                      <div className="mode-info-text">
                        Wähle "Schnell" für einfache Text-Gen & "Intelligent"
                        für gründliche Analysen.
                      </div>

                      {/* Web Search Switch hinzugefügt */}
                      <div className="web-search-toggle">
                        <label className="web-search-label">
                          🌐 Web Search
                          <input
                            type="checkbox"
                            checked={webSearchEnabled}
                            onChange={(e) =>
                              setWebSearchEnabled(e.target.checked)
                            }
                            className="web-search-checkbox"
                          />
                          <span className="web-search-slider"></span>
                        </label>
                      </div>
                      <div className="settings-info-text">
                        Aktiviere Web Search für aktuelle Informationen.
                      </div>

                      <div
                        className="mode-selector-item settings-item"
                        onClick={() => {
                          setIsModalOpen_knowledge(true);
                          setShowModeMenu(false);
                        }}
                      >
                        ⚙️ Einstellungen
                      </div>
                      <div className="settings-info-text">
                        Assistent-Konfiguration bearbeiten.
                      </div>
                    </div>
                  )}
                </div>
                {webSearchEnabled && (
                  <span
                    className="web-search-indicator"
                    title="Web Search Enabled"
                  >
                    <FiGlobe />
                  </span>
                )}
              </div>
              <div className="right-controls">
                <button
                  onClick={toggleRecording}
                  className={`mic-button ${recording ? "recording" : ""}`}
                >
                  <BsMicFill />
                </button>
                {recording && (
                  <span
                    className="recording-text"
                    style={{
                      marginLeft: "8px",
                      color: "#dc3545",
                      fontStyle: "italic",
                    }}
                  >
                    Recording...
                  </span>
                )}
                <button
                  onClick={onSend}
                  className="send-button"
                  disabled={loading}
                >
                  {loading ? (
                    <div className="spinner" />
                  ) : (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M3 12L12 3L21 12M12 3V21"
                        stroke="#007bff"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </footer>
          <div className="footer-text">
            Der Assistent hat momentan nur Zugriff auf den eigenen, markierten
            Bereich im Gutachten.
          </div>
        </>
      )}

      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <img
              src={modalImage}
              alt="Enlarged attachment"
              className="modal-image"
            />
            <button
              className="modal-close"
              onClick={() => setIsModalOpen(false)}
            >
              &times;
            </button>
          </div>
        </div>
      )}

      {isModalOpen_knowledge && (
        <KnowledgeSettingsModal
          isOpen={isModalOpen_knowledge}
          onClose={() => setIsModalOpen_knowledge(false)}
          API_URL={API_URL}
          userId={userId}
          projectId={selectedProject.project_id}
          knowledgeOptions={
            selectedProject && selectedProject.tasks
              ? selectedProject.tasks.map((task) => ({ id: task, name: task }))
              : []
          }
        />
      )}
    </main>
  );
};

export default ChatArea;

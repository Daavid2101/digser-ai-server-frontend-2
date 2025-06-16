import React, { useState, useEffect } from "react";
import "./InitializationForm.css";
import FileUploadField from "./FileUploadField";

const InitializationForm = ({
  API_URL,
  onInitialize,
  project_id,
  taskName, // Name des Tasks (z. B. "Immobilienmarkt")
  hideInitButton, // Falls true, wird der Initialisierungsbutton nicht angezeigt
  requestedData: initialRequestedData, // Optional: falls bereits vom Parent geladen
}) => {
  const [textData, setTextData] = useState({});
  const [mandatoryFiles, setMandatoryFiles] = useState({});
  const [optionalFiles, setOptionalFiles] = useState({});
  const [requestedData, setRequestedData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [streamOutput, setStreamOutput] = useState("");

  // Funktion, um die initialen States anhand der geladenen requested_data zu setzen
  const initializeStates = (data) => {
    let initMandatoryFiles = {};
    let initOptionalFiles = {};
    let initTextData = {};

    if (data.required && Array.isArray(data.required)) {
      data.required.forEach((item) => {
        const key = item.name.toLowerCase().replace(/\s/g, "_");
        if (item.type === "file") {
          initMandatoryFiles[key] = [];
        } else if (item.type === "text" || item.type === "dropdown") {
          initTextData[key] = "";
        }
      });
    }
    if (data.optional && Array.isArray(data.optional)) {
      data.optional.forEach((item) => {
        const key = item.name.toLowerCase().replace(/\s/g, "_");
        if (item.type === "file") {
          initOptionalFiles[key] = [];
        } else if (item.type === "text" || item.type === "dropdown") {
          initTextData[key] = "";
        }
      });
    }
    setMandatoryFiles(initMandatoryFiles);
    setOptionalFiles(initOptionalFiles);
    setTextData(initTextData);
  };

  // useEffect, der immer neu ausgeführt wird, wenn sich API_URL, project_id oder taskName ändern
  useEffect(() => {
    setRequestedData(null);
    setLoading(true);
    let url;
    if (taskName && taskName !== "Dokumente") {
      url = `${API_URL}/projects/requested_data/${project_id}/${encodeURIComponent(
        taskName
      )}`;
    } else {
      url = `${API_URL}/projects/requested_data/${project_id}`;
    }
    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        setRequestedData(data);
        initializeStates(data);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching requested_data:", error);
        setLoading(false);
      });
  }, [API_URL, project_id, taskName]);

  // Lade temporär hochgeladene Dateien (falls vorhanden)
  useEffect(() => {
    if (requestedData) {
      fetch(`${API_URL}/projects/temp_files/${project_id}`)
        .then((res) => res.json())
        .then((data) => {
          Object.keys(data).forEach((key) => {
            const isMandatory = requestedData.required?.some(
              (item) =>
                item.type === "file" &&
                item.name.toLowerCase().replace(/\s/g, "_") === key
            );
            const isOptional = requestedData.optional?.some(
              (item) =>
                item.type === "file" &&
                item.name.toLowerCase().replace(/\s/g, "_") === key
            );
            if (isMandatory) {
              setMandatoryFiles((prev) => ({ ...prev, [key]: data[key] }));
            } else if (isOptional) {
              setOptionalFiles((prev) => ({ ...prev, [key]: data[key] }));
            }
          });
        })
        .catch((error) => {
          console.error("Error loading temporary files:", error);
        });
    }
  }, [API_URL, project_id, requestedData]);

  // Lade temporäre Text- und Dropdown-Daten
  // Lade temporäre Text- und Dropdown-Daten erst, wenn requestedData verfügbar ist
  useEffect(() => {
    if (requestedData) {
      fetch(`${API_URL}/projects/temp_data/${project_id}?t=${Date.now()}`)
        .then((res) => res.json())
        .then((data) => {
          // Nur übernehmen, wenn data tatsächlich Schlüssel hat
          if (data && Object.keys(data).length > 0) {
            setTextData((prev) => ({ ...prev, ...data }));
          }
        })
        .catch((error) => {
          console.error("Error loading temp data:", error);
        });
    }
  }, [API_URL, project_id, taskName, requestedData]);

  const handleTextDataChange = (e) => {
    const { name, value } = e.target;
    setTextData((prev) => {
      const newState = { ...prev, [name]: value };
      fetch(`${API_URL}/projects/temp_data/${project_id}?t=${Date.now()}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newState),
      }).catch((err) => console.error("Error saving temp data:", err));
      return newState;
    });
  };

  // Beim Dateiupload: temporäre Upload-Route aufrufen
  const handleMandatoryFileChange = (name, newFiles) => {
    newFiles.forEach((file) => {
      const formData = new FormData();
      formData.append("file", file);
      fetch(`${API_URL}/projects/temp_upload/${project_id}/${name}`, {
        method: "POST",
        body: formData,
      })
        .then((res) => res.json())
        .then((data) => {
          setMandatoryFiles((prev) => {
            const updated = [...(prev[name] || []), data.file_info];
            return { ...prev, [name]: updated };
          });
        })
        .catch((error) => {
          console.error("Error uploading mandatory file:", error);
        });
    });
  };

  const handleOptionalFileChange = (name, newFiles) => {
    newFiles.forEach((file) => {
      const formData = new FormData();
      formData.append("file", file);
      fetch(`${API_URL}/projects/temp_upload/${project_id}/${name}`, {
        method: "POST",
        body: formData,
      })
        .then((res) => res.json())
        .then((data) => {
          setOptionalFiles((prev) => {
            const updated = [...(prev[name] || []), data.file_info];
            return { ...prev, [name]: updated };
          });
        })
        .catch((error) => {
          console.error("Error uploading optional file:", error);
        });
    });
  };

  const removeMandatoryFile = (name, index, fileInfo) => {
    fetch(
      `${API_URL}/projects/temp_file_delete/${project_id}/${name}/${fileInfo.id}`,
      {
        method: "DELETE",
      }
    )
      .then((res) => {
        if (res.ok) {
          setMandatoryFiles((prev) => {
            const newFiles = [...(prev[name] || [])];
            newFiles.splice(index, 1);
            return { ...prev, [name]: newFiles };
          });
        } else {
          alert("Fehler beim Löschen der Datei");
        }
      })
      .catch((error) => {
        console.error("Error deleting file:", error);
      });
  };

  const removeOptionalFile = (name, index, fileInfo) => {
    fetch(
      `${API_URL}/projects/temp_file_delete/${project_id}/${name}/${fileInfo.id}`,
      {
        method: "DELETE",
      }
    )
      .then((res) => {
        if (res.ok) {
          setOptionalFiles((prev) => {
            const newFiles = [...(prev[name] || [])];
            newFiles.splice(index, 1);
            return { ...prev, [name]: newFiles };
          });
        } else {
          alert("Fehler beim Löschen der Datei");
        }
      })
      .catch((error) => {
        console.error("Error deleting file:", error);
      });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStreamOutput("");
    let allRequiredFilled = true;
    if (requestedData && requestedData.required) {
      for (let item of requestedData.required) {
        const key = item.name.toLowerCase().replace(/\s/g, "_");
        if (item.type === "file") {
          if (!mandatoryFiles[key] || mandatoryFiles[key].length === 0) {
            allRequiredFilled = false;
            break;
          }
        } else if (item.type === "text" || item.type === "dropdown") {
          if (!textData[key] || textData[key].trim() === "") {
            allRequiredFilled = false;
            break;
          }
        }
      }
    }
    if (!allRequiredFilled) {
      const confirmProceed = window.confirm(
        "Nicht alle erforderlichen Felder sind ausgefüllt. Möchten Sie trotzdem fortfahren?"
      );
      if (!confirmProceed) return;
    }
    const formData = new FormData();
    if (taskName && taskName !== "Dokumente") {
      formData.append("task_name", taskName);
    }
    Object.entries(textData).forEach(([key, value]) => {
      formData.append(key, value);
    });
    setSubmitting(true);
    try {
      // Sende die POST-Anfrage, um den Initialisierungsprozess zu triggern
      const response = await fetch(
        `${API_URL}/projects/initialize_assistant/${project_id}`,
        {
          method: "POST",
          body: formData,
        }
      );
      if (response.ok) {
        const data = await response.json();
        const jobId = data.job_id;

        // Öffne die SSE-Verbindung zum Status-Stream
        const eventSource = new EventSource(
          `${API_URL}/projects/initialize_assistant_stream/${jobId}`
        );
        eventSource.onmessage = (event) => {
          // Falls die Nachricht "DONE" enthält, wird der Stream geschlossen
          if (event.data.includes("DONE")) {
            eventSource.close();
            setSubmitting(false);
            setStreamOutput("");
            onInitialize && onInitialize(); // z.B. Callback, um weitere Aktionen auszulösen
          } else {
            setStreamOutput((prev) => prev + event.data + "\n");
          }
        };
        eventSource.onerror = (err) => {
          console.error("EventSource error:", err);
          eventSource.close();
          setSubmitting(false);
        };
      } else {
        alert("Fehler bei der Initialisierung");
        setSubmitting(false);
      }
    } catch (error) {
      console.error("Error during initialization:", error);
      alert("Es ist ein Fehler aufgetreten.");
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div>Loading initial data...</div>;
  }
  if (submitting) {
    return (
      <div className="initialization-stream">
        <div className="loading-spinner">
          <h4>Initialisierung läuft, bitte warten...</h4>
        </div>
        <div className="stream-output">
          <h4>Status Updates:</h4>
          <pre>{streamOutput}</pre>
        </div>
      </div>
    );
  }

  const requiredTextFields = (requestedData?.required || []).filter(
    (item) => item.type === "text" || item.type === "dropdown"
  );
  const requiredFileFields = (requestedData?.required || []).filter(
    (item) => item.type === "file"
  );
  const optionalTextFields = (requestedData?.optional || []).filter(
    (item) => item.type === "text" || item.type === "dropdown"
  );
  const optionalFileFields = (requestedData?.optional || []).filter(
    (item) => item.type === "file"
  );

  if (
    !requestedData ||
    !requestedData.required ||
    requestedData.required.length === 0
  ) {
    return (
      <form className="initialization-form" onSubmit={handleSubmit} noValidate>
        <h3>Keine zusätzlichen Eingaben erforderlich.</h3>
        {!hideInitButton && (
          <button type="submit">Start Initialisierung</button>
        )}
      </form>
    );
  }

  return (
    <form className="initialization-form" onSubmit={handleSubmit} noValidate>
      <h3>Erforderliche Informationen</h3>
      {taskName && taskName !== "Dokumente" && (
        <input type="hidden" name="task_name" value={taskName} />
      )}
      <div className="form-section">
        {requiredTextFields.map((item) => {
          const key = item.name.toLowerCase().replace(/\s/g, "_");
          if (item.type === "dropdown") {
            return (
              <label className="field-label" key={item.name}>
                {item.name}{" "}
                <span style={{ fontWeight: "bold", color: "red" }}>*</span>:
                <select
                  name={key}
                  value={textData[key] || ""}
                  onChange={handleTextDataChange}
                >
                  <option value="">Bitte wählen</option>
                  {item.options &&
                    item.options.map((option, index) => (
                      <option key={index} value={option}>
                        {option}
                      </option>
                    ))}
                </select>
              </label>
            );
          } else if (item.type === "text") {
            return (
              <label className="field-label" key={item.name}>
                {item.name}{" "}
                <span style={{ fontWeight: "bold", color: "red" }}>*</span>:
                <input
                  type="text"
                  name={key}
                  value={textData[key] || ""}
                  onChange={handleTextDataChange}
                  placeholder={`Bitte geben Sie ${item.name} ein`}
                />
              </label>
            );
          } else {
            return null;
          }
        })}
        {requiredFileFields.map((item) => {
          const key = item.name.toLowerCase().replace(/\s/g, "_");
          return (
            <FileUploadField
              key={item.name}
              label={item.name}
              name={key}
              required={true}
              files={mandatoryFiles[key] || []}
              onFileChange={handleMandatoryFileChange}
              onRemove={removeMandatoryFile}
              description={`Bitte laden Sie ${item.name} hoch.`}
              API_URL={API_URL}
            />
          );
        })}
      </div>

      {(optionalTextFields.length > 0 || optionalFileFields.length > 0) && (
        <>
          <h3>Optionale Informationen</h3>
          <div className="form-section">
            {optionalTextFields.map((item) => {
              const key = item.name.toLowerCase().replace(/\s/g, "_");
              if (item.type === "dropdown") {
                return (
                  <label className="field-label" key={item.name}>
                    {item.name}:
                    <select
                      name={key}
                      value={textData[key] || ""}
                      onChange={handleTextDataChange}
                    >
                      <option value="">Bitte wählen</option>
                      {item.options &&
                        item.options.map((option, index) => (
                          <option key={index} value={option}>
                            {option}
                          </option>
                        ))}
                    </select>
                  </label>
                );
              } else if (item.type === "text") {
                return (
                  <label className="field-label" key={item.name}>
                    {item.name}:
                    <input
                      type="text"
                      name={key}
                      value={textData[key] || ""}
                      onChange={handleTextDataChange}
                      placeholder={`Optional: ${item.name}`}
                    />
                  </label>
                );
              } else {
                return null;
              }
            })}
            {optionalFileFields.map((item) => {
              const key = item.name.toLowerCase().replace(/\s/g, "_");
              return (
                <FileUploadField
                  key={item.name}
                  label={item.name}
                  name={key}
                  required={false}
                  files={optionalFiles[key] || []}
                  onFileChange={handleOptionalFileChange}
                  onRemove={removeOptionalFile}
                  description={`Optional: ${item.name} kann zur besseren Bewertung hochgeladen werden.`}
                  API_URL={API_URL}
                />
              );
            })}
          </div>
        </>
      )}

      {!hideInitButton && <button type="submit">Start Initialisierung</button>}
    </form>
  );
};

export default InitializationForm;

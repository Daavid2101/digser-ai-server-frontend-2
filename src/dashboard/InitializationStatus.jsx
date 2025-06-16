// InitializationStatus.jsx
import React, { useEffect, useState } from "react";

const InitializationStatus = ({ API_URL, projectId, taskName, onComplete }) => {
  const [status, setStatus] = useState("Warte auf Initialisierung...");

  useEffect(() => {
    // Baue den URL für den SSE-Stream – übergebe taskName als Query-Parameter
    const url = `${API_URL}/projects/initialize_assistant_stream/${projectId}?task_name=${encodeURIComponent(
      taskName || ""
    )}`;
    const eventSource = new EventSource(url);

    eventSource.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.status) {
          setStatus(data.status);
        }
        if (data.result === "success") {
          // Wenn die Initialisierung abgeschlossen ist, rufe den onComplete-Callback auf
          onComplete(data);
          eventSource.close();
        }
        if (data.error) {
          setStatus(`Fehler: ${data.error}`);
          eventSource.close();
        }
      } catch (err) {
        console.error("Fehler beim Parsen der SSE-Daten:", err);
      }
    };

    eventSource.onerror = (err) => {
      console.error("SSE-Fehler:", err);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [API_URL, projectId, taskName, onComplete]);

  return (
    <div
      style={{
        padding: "10px",
        backgroundColor: "#eef",
        borderRadius: "4px",
        marginTop: "10px",
      }}
    >
      <p>Status: {status}</p>
    </div>
  );
};

export default InitializationStatus;

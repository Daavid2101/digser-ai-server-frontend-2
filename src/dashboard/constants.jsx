const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const sendMessage = async (
  inputMessage,
  setMessages,
  setInputMessage,
  projectId,
  taskName,
  files,
  setFiles,
  username,
  onReturn, // optionaler Callback (z. B. zum Schließen eines Loaders)
  refreshStatus // optionaler Callback, um den Assistentenstatus zu aktualisieren
) => {
  if (!inputMessage.trim() && files.length === 0) {
    if (onReturn && typeof onReturn === "function") {
      onReturn();
    }
    return;
  }

  const message = inputMessage.trim();
  const filePreviews = files.map((file) => URL.createObjectURL(file));

  // Optimistisches Update: Füge die User-Nachricht sofort dem State hinzu
  setMessages((prev) => [
    ...prev,
    {
      sender: "user",
      message: message,
      attachments: filePreviews,
      timestamp: new Date().toISOString(),
    },
  ]);
  setInputMessage("");

  const userId = localStorage.getItem("user_id");

  const filePromises = files.map((file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve({
          name: file.name,
          content: reader.result.split(",")[1],
        });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  });

  try {
    const encodedFiles = await Promise.all(filePromises);

    const res = await fetch(`${API_URL}/chat/send_message`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-User-ID": userId,
      },
      body: JSON.stringify({
        input: message,
        user_id: userId,
        project_id: projectId,
        task: taskName,
        files: encodedFiles,
        username: username,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      const { type, content } = data;
      setMessages((prev) => [
        ...prev,
        {
          sender: "assistant",
          type,
          message: content,
          timestamp: new Date().toISOString(),
        },
      ]);
    }
  } catch (err) {
    console.error("Error sending message:", err);
  } finally {
    setFiles([]);
    // Nach dem Senden: Assistant Status neu fetchen
    try {
      const resStatus = await fetch(
        `${API_URL}/assistants/get_status?project_id=${projectId}`
      );
      if (resStatus.ok) {
        const statusData = await resStatus.json();
        // Falls refreshStatus als Callback übergeben wurde, diesen aufrufen
        if (refreshStatus && typeof refreshStatus === "function") {
          refreshStatus(statusData);
        }
      }
    } catch (err) {
      console.error("Error fetching assistant status:", err);
    }
    if (onReturn && typeof onReturn === "function") {
      onReturn();
    }
  }
};

const removeFile = (index, setFiles) => {
  setFiles((prev) => prev.filter((_, i) => i !== index));
};

// Hier wird createProject als asynchrone Funktion implementiert und erhält einen zusätzlichen onReturn-Callback.
const createProject = async (
  newProjectName,
  selectedTemplate,
  setProjects,
  setShowProjectModal,
  setNewProjectName,
  setSelectedProject,
  username,
  onReturn // Neuer optionaler Callback
) => {
  try {
    const res = await fetch(`${API_URL}/projects/create_project`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        project_name: newProjectName,
        user_name: username,
        template: selectedTemplate, // Template wird mitgegeben
      }),
    });
    const data = await res.json();
    // Aktualisiere den Projekte-State
    setProjects((prev) => [...prev, data]);
    setShowProjectModal(false);
    setNewProjectName("");
    setSelectedProject(data);
    // Nach erfolgreicher Erstellung wird der Callback aufgerufen,
    // um z. B. die zugehörigen Tasks/Projektdaten sofort neu zu fetchen.
    if (onReturn && typeof onReturn === "function") {
      onReturn();
    }
  } catch (err) {
    console.error("Fehler beim Erstellen des Projekts:", err);
  }
};

export { sendMessage, removeFile, createProject };

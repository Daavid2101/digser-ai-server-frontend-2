// dashboardService.js
const BASE_API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

/**
 * Liest eine Datei ein und gibt ein Objekt mit Name und Base64-kodiertem Inhalt zurück.
 * @param {File} file
 * @returns {Promise<Object>}
 */
export const encodeFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      // Entferne den Präfix (z. B. "data:image/png;base64,")
      const base64Content = reader.result.split(",")[1];
      resolve({ name: file.name, content: base64Content });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * Kodiert ein Array von Dateien.
 * @param {File[]} files
 * @returns {Promise<Object[]>}
 */
export const encodeFiles = (files) => Promise.all(files.map(encodeFile));

/**
 * Sendet eine Nachricht an den Server und gibt sowohl die vom Nutzer gesendete Nachricht
 * als auch die Antwort des Agents zurück.
 * @param {Object} params
 * @param {string} params.inputMessage
 * @param {string|number} params.projectId
 * @param {string} params.taskName
 * @param {File[]} params.files
 * @param {string} params.username
 * @returns {Promise<Object|null>}
 */
export const sendUserMessage = async ({
  inputMessage,
  projectId,
  taskName,
  files,
  username,
}) => {
  if (!inputMessage.trim() && files.length === 0) {
    return null; // Nichts zu senden
  }

  const message = inputMessage.trim();
  const filePreviews = files.map((file) => URL.createObjectURL(file));
  const userId = localStorage.getItem("user_id");

  // Dateien in Base64 kodieren
  const encodedFiles = await encodeFiles(files);

  const res = await fetch(`${BASE_API_URL}/chat/send_message`, {
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

  if (!res.ok) {
    throw new Error("Error sending message");
  }
  const data = await res.json();

  return {
    userMessage: {
      sender: "user",
      content: message,
      attachments: filePreviews,
    },
    agentResponse: { sender: "agent", type: data.type, content: data.content },
  };
};

/**
 * Entfernt eine Datei aus dem Array.
 * @param {number} index
 * @param {File[]} files
 * @returns {File[]}
 */
export const removeFile = (index, files) => {
  return files.filter((_, i) => i !== index);
};

/**
 * Erstellt ein neues Projekt.
 * @param {Object} params
 * @param {string} params.projectName
 * @param {string} params.template
 * @param {string} params.username
 * @returns {Promise<Object>}
 */
export const createNewProject = async ({ projectName, template, username }) => {
  const res = await fetch(`${BASE_API_URL}/projects/create_project`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      project_name: projectName,
      user_name: username,
      template: template,
    }),
  });
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error || "Projekt konnte nicht erstellt werden.");
  }
  const data = await res.json();
  return data;
};

export { BASE_API_URL };

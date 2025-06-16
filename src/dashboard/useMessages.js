// useMessages.js
import { useState, useEffect } from "react";

const useMessages = (API_URL, selectedProject, selectedTask) => {
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    if (!selectedProject) return;
    const { project_id } = selectedProject;
    fetch(
      `${API_URL}/chat/get_messages?project_id=${project_id}&task=${selectedTask}`
    )
      .then((res) => res.json())
      .then((data) => {
        setMessages(data);
      })
      .catch((err) =>
        console.error("Fehler beim Abrufen der Nachrichten:", err)
      );
  }, [API_URL, selectedProject, selectedTask]);

  return { messages, setMessages };
};

export default useMessages;

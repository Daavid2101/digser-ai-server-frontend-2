import { useState, useEffect, useRef } from "react";

const useMessages = (API_URL, selectedProject, selectedTask, userId) => {
  const [messages, setMessages] = useState([]);
  const retryAttempted = useRef(false);

  useEffect(() => {
    if (!selectedProject) return;

    let isActive = true;
    retryAttempted.current = false;

    const fetchMessages = () => {
      const { project_id } = selectedProject;

      fetch(
        `${API_URL}/chat/get_messages?project_id=${project_id}&task=${selectedTask}&user_id=${userId}`
      )
        .then((res) => res.json())
        .then((data) => {
          if (!isActive) return;
          const receivedMessages = Array.isArray(data) ? data : [];
          setMessages(receivedMessages);
          if (receivedMessages.length === 0 && !retryAttempted.current) {
            retryAttempted.current = true;
            setTimeout(() => {
              if (isActive) {
                fetchMessages();
              }
            }, 1000);
          }
        })
        .catch((err) => {
          if (!isActive) return;
          console.error("Fehler beim Abrufen der Nachrichten:", err);
        });
    };

    fetchMessages();

    return () => {
      isActive = false;
    };
  }, [API_URL, selectedProject, selectedTask, userId]);

  return { messages, setMessages };
};

export default useMessages;

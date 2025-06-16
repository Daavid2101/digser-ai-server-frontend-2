import { useState, useEffect } from "react";

const useAssistantStatus = (API_URL, projectId) => {
  const [status, setStatus] = useState({});

  useEffect(() => {
    if (!projectId) return;
    const fetchStatus = async () => {
      try {
        const res = await fetch(
          `${API_URL}/assistants/get_status?project_id=${projectId}`
        );
        const data = await res.json();
        setStatus(data);
      } catch (err) {
        console.error("Error fetching assistant status:", err);
      }
    };
    fetchStatus();
  }, [API_URL, projectId]);

  return status;
};

export default useAssistantStatus;

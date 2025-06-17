import { useState, useEffect } from "react";
import { useAuth } from "../AuthContext";

const useProjects = (API_URL, accessToken) => {
  const { userId } = useAuth();
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [projectTasks, setProjectTasks] = useState([]);
  const [pdfUrl, setPdfUrl] = useState("");

  const fetchProjects = async (projectNameToSelect = null) => {
    if (!userId) return;
    try {
      const res = await fetch(`${API_URL}/projects/get_projects`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        credentials: "include",
      });
      if (!res.ok) {
        console.error("Fehler beim Laden der Projekte:", res.statusText);
        return;
      }
      const data = await res.json();
      setProjects(data);
      if (projectNameToSelect) {
        const newProj = data.find(
          (proj) => proj.project_name === projectNameToSelect
        );
        if (newProj) setSelectedProject(newProj);
      } else if (data.length > 0 && !selectedProject) {
        setSelectedProject(data[0]);
      }
    } catch (err) {
      console.error("Fehler beim Laden der Projekte:", err);
    }
  };

  useEffect(() => {
    if (userId) fetchProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    if (selectedProject) {
      const tasks = selectedProject.tasks || [];
      setProjectTasks(tasks);
      setPdfUrl(
        `${API_URL}/files/get_pdf?user_id=${userId}&project_id=${
          selectedProject.project_id
        }&t=${Date.now()}`
      );
    } else {
      setProjectTasks([]);
      setPdfUrl("");
    }
  }, [selectedProject, API_URL, userId]);

  return {
    projects,
    selectedProject,
    setSelectedProject,
    projectTasks,
    setProjectTasks,
    pdfUrl,
    fetchProjects,
    setPdfUrl,
  };
};

export default useProjects;

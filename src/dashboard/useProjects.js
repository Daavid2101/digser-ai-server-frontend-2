import { useState, useEffect } from "react";

const useProjects = (API_URL) => {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [projectTasks, setProjectTasks] = useState([]);
  const [pdfUrl, setPdfUrl] = useState("");

  const fetchProjects = async (projectNameToSelect = null) => {
    try {
      const res = await fetch(`${API_URL}/projects/get_projects`);
      const data = await res.json();
      setProjects(data);
      if (projectNameToSelect) {
        const newProj = data.find(
          (proj) => proj.project_name === projectNameToSelect
        );
        if (newProj) setSelectedProject(newProj);
      } else if (data && data.length > 0 && !selectedProject) {
        setSelectedProject(data[0]);
      }
    } catch (err) {
      console.error("Fehler beim Laden der Projekte:", err);
    }
  };

  useEffect(() => {
    fetchProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedProject) {
      if (selectedProject.tasks && selectedProject.tasks.length > 0) {
        setProjectTasks(selectedProject.tasks);
      } else {
        setProjectTasks([]);
      }
      setPdfUrl(
        `${API_URL}/files/get_pdf?project_id=${
          selectedProject.project_id
        }&t=${Date.now()}`
      );
    }
  }, [selectedProject, API_URL]);

  return {
    projects,
    selectedProject,
    setSelectedProject,
    projectTasks,
    setProjectTasks, // <-- Hier zurückgeben
    pdfUrl,
    fetchProjects,
    setPdfUrl,
  };
};

export default useProjects;

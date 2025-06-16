import React, { useState, useEffect } from "react";
import TemplateDiagram from "./TemplateDiagram";

const AddTasksModal = ({
  show,
  onClose,
  projectTemplate,
  handleAddTasks,
  currentProjectTasks,
  loading,
}) => {
  const [childChecks, setChildChecks] = useState({});

  // Initialisiere childChecks anhand des Templates:
  // Nur Tasks als aktiv markieren, die im aktuellen Projekt vorhanden sind.
  useEffect(() => {
    if (projectTemplate && projectTemplate.tasks) {
      const initialChecks = {};
      projectTemplate.tasks.forEach((task) => {
        if (task.nummer !== "start") {
          const fullTaskName = `${task.nummer} ${task.title}`;
          initialChecks[task.nummer] =
            currentProjectTasks.includes(fullTaskName);
        }
      });
      setChildChecks(initialChecks);
    }
  }, [projectTemplate, currentProjectTasks]);

  if (!show) return null;

  return (
    <div className="modal">
      <div className="modal-content">
        <h3>Tasks aus Template hinzufügen</h3>
        <div>
          <strong>Template:</strong>{" "}
          {projectTemplate ? projectTemplate.template_name : "Kein Template"}
        </div>
        {projectTemplate && (
          <TemplateDiagram
            template={projectTemplate}
            initialChildChecks={childChecks}
            onChange={(settings) => setChildChecks(settings.childChecks)}
          />
        )}
        <div className="modal-actions">
          <button onClick={onClose}>Abbrechen</button>
          <button
            onClick={() => handleAddTasks(childChecks)}
            disabled={loading}
          >
            {loading ? <span className="spinner" /> : "Hinzufügen"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddTasksModal;

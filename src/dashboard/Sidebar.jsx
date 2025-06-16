import React, { useState, useEffect, useRef } from "react";
import { FaTrash, FaChevronDown, FaChevronUp, FaPlus } from "react-icons/fa";
import useAssistantStatus from "./assistantStatus";

const getColorForStatus = (status) => {
  if (status === "red") return "#dc3545";
  if (status === "yellow") return "#ffc107";
  if (status === "green") return "#28a745";
  return "#6c757d";
};

const Sidebar = ({
  projectTasks,
  selectedTask,
  setSelectedTask,
  projects,
  selectedProject,
  showProjects,
  setShowProjects,
  setSelectedProject,
  setShowProjectModal,
  setShowAddTasksModal,
  toggleSidebar,
  deleteProject,
  updateStatus,
  refreshStatus,
  assistantsStatus,
  API_URL,
}) => {
  const toggleRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        toggleRef.current &&
        !toggleRef.current.contains(event.target) &&
        listRef.current &&
        !listRef.current.contains(event.target)
      ) {
        setShowProjects(false);
      }
    };

    if (showProjects) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showProjects]);

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <span>Aktuelle Aufgaben</span>
        <button className="sidebar-collapse-btn" onClick={toggleSidebar}>
          ×
        </button>
      </div>
      <ul
        className="sidebar-menu"
        style={{ overflowY: "auto", maxHeight: "calc(100vh - 200px)" }}
      >
        {projectTasks.map((task) => (
          <li
            key={task}
            className={selectedTask === task ? "active" : ""}
            onClick={() => setSelectedTask(task)}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span>{task}</span>
            <span
              className="status-badge"
              onClick={async (e) => {
                e.stopPropagation();
                const currentStatus = assistantsStatus[task] || "yellow";
                let newStatus;
                if (currentStatus === "yellow") {
                  newStatus = "green";
                } else if (currentStatus === "green") {
                  newStatus = "yellow";
                }
                await updateStatus(task, newStatus);
                await refreshStatus();
              }}
              style={{
                backgroundColor: getColorForStatus(assistantsStatus[task]),
              }}
            />
          </li>
        ))}
      </ul>
      {selectedProject && projectTasks && projectTasks.length > 0 && (
        <div className="add-tasks-btn">
          <button
            className="add-tasks-button"
            onClick={() => setShowAddTasksModal(true)}
          >
            <FaPlus style={{ marginRight: "5px" }} />
            Tasks hinzufügen
          </button>
        </div>
      )}

      <footer className="sidebar-footer">
        <button
          className="projects-toggle"
          onClick={() => setShowProjects(!showProjects)}
          ref={toggleRef}
        >
          {showProjects ? (
            <FaChevronUp />
          ) : (
            <>
              {selectedProject
                ? selectedProject.project_name
                : "Projekt wählen"}
              <FaChevronDown />
            </>
          )}
        </button>
        {showProjects && (
          <ul className="project-list" ref={listRef}>
            {projects.map((proj) => (
              <li
                key={proj.project_id}
                className={
                  selectedProject?.project_id === proj.project_id
                    ? "active"
                    : ""
                }
                onClick={() => {
                  setSelectedProject(proj);
                  setShowProjects(false);
                }}
                style={{ cursor: "pointer" }}
              >
                <span>{proj.project_name}</span>
                <button
                  className="delete-project-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteProject(proj.project_id);
                  }}
                  title="Projekt löschen"
                >
                  <FaTrash />
                </button>
              </li>
            ))}
            <li
              className="create-project"
              onClick={() => {
                setShowProjectModal(true);
                setShowProjects(false);
              }}
              style={{ cursor: "pointer" }}
            >
              + Neues Projekt
            </li>
          </ul>
        )}
      </footer>
    </aside>
  );
};

export default Sidebar;

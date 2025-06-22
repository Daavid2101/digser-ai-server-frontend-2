import React, { useState, useEffect, useRef } from "react";
import { FaFilePdf, FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { useAuth } from "../AuthContext";
import "./Dashboard.css";
import * as dashboardService from "./dashboardService";
import Sidebar from "./Sidebar";
import ChatArea from "./ChatArea";
import PageEditor from "./PageEditor";
import ProjectModal from "./ProjectModal";
import useProjects from "./useProjects";
import useMessages from "./useMessages";
import usePasteFiles from "./usePasteFiles";
import * as constants from "./constants";
import InitializationForm from "./InitializationForm";
import AddTasksModal from "./AddTaskModal";
import PlausibilityCheckPage from "./PlausibilityCheckPage";
import CKEditorTest from "../CKEditor/CKEditor";
import CanvasComponent from "../Canvas/Canvas";

const MAX_FILES = 9;

const Dashboard = () => {
  const API_URL = dashboardService.BASE_API_URL;
  const { isLoggedIn, userId, username } = useAuth();
  useEffect(() => {
    console.log("User ID im Dashboard:", userId);
  }, [userId]);
  const [editorReloadTrigger, setEditorReloadTrigger] = useState(0);
  const pageEditorRef = useRef(null);
  const [isResizing, setIsResizing] = useState(false);
  const [showCanvas, setShowCanvas] = useState(false);

  const [selectedTask, setSelectedTask] = useState(null);

  const {
    projects,
    selectedProject,
    setSelectedProject,
    projectTasks,
    setProjectTasks,
    pdfUrl,
    fetchProjects,
    setPdfUrl,
  } = useProjects(API_URL);

  const { messages, setMessages } = useMessages(
    API_URL,
    selectedProject,
    selectedTask,
    userId
  );

  const [assistantsStatus, setAssistantsStatus] = useState({});
  const [inputMessage, setInputMessage] = useState("");
  const [files, setFiles] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [projectTemplate, setProjectTemplate] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [customTemplateSettings, setCustomTemplateSettings] = useState(null);
  const [modalStep, setModalStep] = useState(1);
  const [projectFormData, setProjectFormData] = useState({
    project_name: "",
    client: "",
    address: "",
    market: "",
    order_date: "",
  });
  const [loading, setLoading] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showProjects, setShowProjects] = useState(false);
  const [showAddTasksModal, setShowAddTasksModal] = useState(false);
  const [activePage, setActivePage] = useState("dashboard");

  const [sidebarWidth, setSidebarWidth] = useState(250);
  const [previewWidth, setPreviewWidth] = useState(300);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(
    window.innerWidth <= 768
  );
  const [isPreviewCollapsed, setIsPreviewCollapsed] = useState(
    window.innerWidth <= 768
  );
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  const [taskRequestedData, setTaskRequestedData] = useState(null);

  const handleAddTasks = async (childChecks) => {
    setLoading(true);
    if (!selectedProject) {
      alert("Kein Projekt ausgewählt");
      return;
    }
    if (!projectTemplate) {
      alert("Kein Template im Projekt hinterlegt");
      return;
    }
    const payload = {
      project_id: selectedProject.project_id,
      template: projectTemplate.template_name,
      child_checks: childChecks,
      user_id: userId,
    };

    try {
      const response = await fetch(`${API_URL}/projects/add_tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const error = await response.json();
        alert("Fehler: " + error.error);
      } else {
        const data = await response.json();
        console.log("Tasks hinzugefügt: ", data.added_tasks);
        fetchProjects(selectedProject.project_name);
      }
    } catch (error) {
      console.error("Fehler beim Hinzufügen der Tasks: ", error);
    } finally {
      setShowAddTasksModal(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedProject) {
      fetch(
        `${API_URL}/projects/get_template?project_id=${selectedProject.project_id}`
      )
        .then((res) => res.json())
        .then((data) => {
          setProjectTemplate(data.template);
          console.log("Geladenes Template:", data.template);
        })
        .catch((err) => console.error("Fehler beim Laden des Templates:", err));
    } else {
      setProjectTemplate(null);
    }
  }, [selectedProject, API_URL]);

  useEffect(() => {
    if (selectedTask && selectedTask !== "Dokumente" && selectedProject) {
      fetch(
        `${API_URL}/projects/requested_data/${
          selectedProject.project_id
        }/${encodeURIComponent(selectedTask)}`
      )
        .then((res) => res.json())
        .then((data) => {
          setTaskRequestedData(data);
          console.log("Fetched requested_data:", data);
        })
        .catch((err) => console.error("Error fetching requested_data:", err));
    } else {
      setTaskRequestedData(null);
    }
  }, [selectedTask, selectedProject, API_URL]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (selectedProject) {
      if (selectedProject.tasks && selectedProject.tasks.length > 0) {
        setProjectTasks(selectedProject.tasks);
        setSelectedTask((prevTask) =>
          prevTask && selectedProject.tasks.includes(prevTask)
            ? prevTask
            : selectedProject.tasks[0]
        );
      } else {
        setProjectTasks([]);
        setSelectedTask(null);
      }
      if (selectedProject.template) {
        setProjectTemplate(selectedProject.template);
      }
      setPdfUrl(
        `${API_URL}/files/get_pdf?project_id=${
          selectedProject.project_id
        }&t=${Date.now()}`
      );
      refreshStatus();
    }
  }, [selectedProject, API_URL, setPdfUrl]);

  useEffect(() => {
    if (showProjectModal) {
      fetch(`${API_URL}/files/get_templates`)
        .then((res) => res.json())
        .then((data) => {
          setTemplates(data.templates || []);
        })
        .catch((err) => console.error("Fehler beim Laden der Templates:", err));
    }
  }, [showProjectModal, API_URL]);

  const updateStatus = async (task, newStatus) => {
    const project_id = selectedProject.project_id;
    const res = await fetch(`${API_URL}/assistants/update_status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        project_id,
        task_name: task,
        new_status: newStatus,
      }),
    });
    if (res.ok) {
      setAssistantsStatus((prev) => ({ ...prev, [task]: newStatus }));
    }
  };

  const refreshStatus = async () => {
    if (!selectedProject) return;
    try {
      const res = await fetch(
        `${API_URL}/assistants/get_status?project_id=${selectedProject.project_id}`
      );
      if (res.ok) {
        const statusData = await res.json();
        setAssistantsStatus(statusData);
      } else {
        console.error("Fehler beim Laden des Status");
      }
    } catch (err) {
      console.error("Error fetching status:", err);
    }
  };

  usePasteFiles(setFiles, MAX_FILES);

  const handleSendMessage = async () => {
    if (!selectedProject) {
      alert("Bitte zuerst ein Projekt auswählen oder erstellen!");
      return;
    }
    try {
      if (pageEditorRef.current) {
        await pageEditorRef.current.save();
      } else {
        console.log(
          "CKEditor ist nicht gerendert, Speichern wird übersprungen."
        );
      }
      await new Promise((resolve, reject) => {
        constants.sendMessage(
          inputMessage,
          setMessages,
          setInputMessage,
          selectedProject.project_id,
          selectedTask,
          files,
          setFiles,
          username,
          () => {
            fetch(`${API_URL}/projects/get_projects`)
              .then((res) => res.json())
              .then((data) => {
                fetchProjects(selectedProject.project_name);
                resolve();
              })
              .catch((err) => {
                console.error("Fehler beim Laden der Projekte:", err);
                resolve();
              });
            fetchPdf();
          },
          refreshStatus
        );
      });
    } catch (err) {
      console.error("Fehler beim Senden der Nachricht:", err);
    }
  };

  const handleFinalCreateProject = async () => {
    setLoading(true);
    const currentDate = new Date().toISOString().split("T")[0];
    const projectData = {
      project_name: projectFormData.project_name,
      user_id: userId,
      user_name: username,
      template: selectedTemplate,
      stammdaten: {
        Auftraggeber: projectFormData.client,
        Adresse: projectFormData.address,
        Teilmarkt: projectFormData.market,
        Auftragsdatum: projectFormData.order_date || currentDate,
      },
      custom_template_settings: customTemplateSettings,
    };

    try {
      const res = await fetch(`${API_URL}/projects/create_project`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(projectData),
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedProject(data);
        setShowProjectModal(false);
        setModalStep(1);
        setProjectFormData({
          project_name: "",
          client: "",
          address: "",
          market: "",
          order_date: "",
        });
        setSelectedTemplate("");
        fetchProjects(data.project_name);
      } else {
        const errorData = await res.json();
        alert(
          `Fehler: ${
            errorData.error || "Projekt konnte nicht erstellt werden."
          }`
        );
      }
    } catch (err) {
      console.error("Fehler beim Erstellen des Projekts:", err);
      alert("Fehler beim Erstellen des Projekts.");
    } finally {
      setLoading(false);
    }
  };

  const removeFile = (index) => {
    setFiles((prevFiles) => dashboardService.removeFile(index, prevFiles));
  };

  const handleSidebarResizeMouseDown = (e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = sidebarWidth;
    const onMouseMove = (e) => {
      const newWidth = startWidth + (e.clientX - startX);
      setSidebarWidth(newWidth > 50 ? newWidth : 50);
    };
    const onMouseUp = () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  };

  const handlePreviewResizeMouseDown = (e) => {
    e.preventDefault();
    setIsResizing(true);
    const startX = e.clientX;
    const startWidth = previewWidth;
    const onMouseMove = (e) => {
      const newWidth = startWidth + (startX - e.clientX);
      setPreviewWidth(newWidth > 0 ? newWidth : 0);
    };
    const onMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  };

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };
  const togglePreview = () => {
    setIsPreviewCollapsed(!isPreviewCollapsed);
  };

  const fetchPdf = () => {
    if (selectedProject) {
      setPdfUrl(
        `${API_URL}/files/get_pdf?project_id=${
          selectedProject.project_id
        }&t=${Date.now()}`
      );
    }
  };

  const deleteProject = async (project_id) => {
    if (!window.confirm("Möchtest du dieses Projekt wirklich löschen?")) return;
    try {
      const res = await fetch(
        `${API_URL}/projects/delete_project?project_id=${project_id}`,
        {
          method: "DELETE",
        }
      );
      if (res.ok) {
        fetchProjects();
        if (selectedProject && selectedProject.project_id === project_id) {
          setSelectedProject(null);
        }
      } else {
        alert("Projekt konnte nicht gelöscht werden.");
      }
    } catch (err) {
      console.error("Fehler beim Löschen des Projekts:", err);
      alert("Fehler beim Löschen des Projekts.");
    }
  };

  const handleTaskSelect = (task) => {
    setSelectedTask(task);
    if (pageEditorRef.current) {
      pageEditorRef.current.scrollToSection(task);
    }
  };

  return activePage === "dashboard" ? (
    <div className="dashboard-container">
      <div
        className="sidebar-container"
        style={{ width: isSidebarCollapsed ? "0px" : `${sidebarWidth}px` }}
      >
        {!isSidebarCollapsed && (
          <div
            className="sidebar-content"
            style={{
              width: isMobile
                ? isSidebarCollapsed
                  ? "0px"
                  : "100%"
                : isSidebarCollapsed
                ? "0px"
                : `${sidebarWidth}px`,
            }}
          >
            <Sidebar
              projectTasks={projectTasks}
              selectedTask={selectedTask}
              setSelectedTask={handleTaskSelect}
              projects={projects}
              selectedProject={selectedProject}
              assistantsStatus={assistantsStatus}
              setAssistantsStatus={setAssistantsStatus}
              showProjects={showProjects}
              setShowProjects={setShowProjects}
              set
              Ascendants={setSelectedProject}
              setShowProjectModal={setShowProjectModal}
              setShowAddTasksModal={setShowAddTasksModal}
              toggleSidebar={toggleSidebar}
              deleteProject={deleteProject}
              updateStatus={updateStatus}
              refreshStatus={refreshStatus}
              API_URL={API_URL}
            />
            <AddTasksModal
              show={showAddTasksModal}
              onClose={() => setShowAddTasksModal(false)}
              projectTemplate={projectTemplate}
              handleAddTasks={handleAddTasks}
              currentProjectTasks={projectTasks}
              loading={loading}
            />
          </div>
        )}
      </div>

      <div
        className="main-content"
        style={{
          display:
            isMobile && (!isSidebarCollapsed || !isPreviewCollapsed)
              ? "none"
              : "flex",
        }}
      >
        <header className="dashboard-header">
          <div className="header-left">
            {isSidebarCollapsed && (
              <button className="header-expand-btn" onClick={toggleSidebar}>
                <FaChevronLeft />
              </button>
            )}
          </div>
        </header>

        <div className="chat-container">
          <ChatArea
            username={username}
            userId={userId}
            selectedProject={selectedProject}
            selectedTask={selectedTask}
            messages={messages}
            API_URL={API_URL}
            files={files}
            setFiles={setFiles}
            inputMessage={inputMessage}
            setInputMessage={setInputMessage}
            handleSendMessage={handleSendMessage}
            removeFile={removeFile}
            setMessages={setMessages}
            onReceived={(data) => {
              console.log("Initialisierung abgeschlossen", data);
              setEditorReloadTrigger((prev) => prev + 1);
              refreshStatus();
              fetchPdf();
              fetch(
                `${API_URL}/chat/get_messages?project_id=${selectedProject.project_id}&task=${selectedTask}&user_id=${userId}`
              )
                .then((res) => res.json())
                .then((data) => {
                  setMessages(data);
                  if (pageEditorRef.current) {
                    pageEditorRef.current.restore();
                  }
                })
                .catch((err) =>
                  console.error(
                    "Fehler beim Aktualisieren der Nachrichten:",
                    err
                  )
                );
            }}
            pageEditorRef={pageEditorRef}
          />
        </div>
      </div>

      <div className="preview-container" style={{ width: `${previewWidth}px` }}>
        <button
          className="toggle-button"
          onClick={() => setShowCanvas(!showCanvas)}
        >
          {showCanvas ? "Show Editor" : "Show Canvas"}
        </button>
        <div className="preview-content">
          {showCanvas ? (
            <CanvasComponent
              API_URL={API_URL}
              selectedProject={selectedProject}
            />
          ) : (
            <CKEditorTest
              ref={pageEditorRef}
              API_URL={API_URL}
              selectedProject={selectedProject}
            />
          )}
        </div>
        {isResizing && (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(245,245,245,0.8)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              pointerEvents: "none",
            }}
          >
            Resizing Editor…
          </div>
        )}
        <div
          className="preview-resizer"
          onMouseDown={handlePreviewResizeMouseDown}
        />
      </div>

      {showProjectModal && (
        <ProjectModal
          modalStep={modalStep}
          setModalStep={setModalStep}
          projectFormData={projectFormData}
          setProjectFormData={setProjectFormData}
          selectedTemplate={selectedTemplate}
          setSelectedTemplate={setSelectedTemplate}
          templates={templates}
          customTemplateSettings={customTemplateSettings}
          setCustomTemplateSettings={setCustomTemplateSettings}
          loading={loading}
          handleFinalCreateProject={handleFinalCreateProject}
          setShowProjectModal={setShowProjectModal}
        />
      )}
    </div>
  ) : (
    <PlausibilityCheckPage
      onBack={() => setActivePage("dashboard")}
      apiURL={API_URL}
    />
  );
};

export default Dashboard;

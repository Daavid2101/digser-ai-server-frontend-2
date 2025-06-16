import React from "react";
import TemplateDiagram from "./TemplateDiagram";

const ProjectModal = ({
  modalStep,
  setModalStep,
  projectFormData,
  setProjectFormData,
  selectedTemplate,
  setSelectedTemplate,
  templates,
  customTemplateSettings,
  setCustomTemplateSettings,
  loading,
  handleFinalCreateProject,
  setShowProjectModal,
}) => {
  return (
    <div className="modal">
      <div className="modal-content">
        {modalStep === 1 && (
          <div>
            <h3>Neues Projekt erstellen</h3>
            <input
              type="text"
              value={projectFormData.project_name}
              onChange={(e) =>
                setProjectFormData({
                  ...projectFormData,
                  project_name: e.target.value,
                })
              }
              placeholder="Projektname"
            />

            <input
              type="date"
              value={projectFormData.order_date}
              onChange={(e) =>
                setProjectFormData({
                  ...projectFormData,
                  order_date: e.target.value,
                })
              }
              placeholder="Auftragsdatum"
            />
            <div className="modal-actions">
              <button onClick={() => setShowProjectModal(false)}>
                Abbrechen
              </button>
              <button onClick={() => setModalStep(2)}>Weiter</button>
            </div>
          </div>
        )}
        {modalStep === 2 && (
          <div>
            <h3>Template auswählen</h3>
            <select
              id="template-select"
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value)}
            >
              <option value="">-- Kein Template --</option>
              {templates.map((tmpl, index) => (
                <option key={index} value={tmpl.template_name}>
                  {tmpl.template_name}
                </option>
              ))}
            </select>
            {/* TemplateDiagram wird nur angezeigt, wenn ein Template ausgewählt ist */}
            {selectedTemplate && (
              <TemplateDiagram
                template={templates.find(
                  (t) => t.template_name === selectedTemplate
                )}
                onChange={(settings) => {
                  setCustomTemplateSettings(settings);
                }}
              />
            )}
            <div className="modal-actions">
              <button onClick={() => setModalStep(1)}>Zurück</button>
              <button onClick={() => setModalStep(3)}>Weiter</button>
            </div>
          </div>
        )}
        {modalStep === 3 && (
          <div>
            <h3>Projekt Zusammenfassung</h3>
            <p>
              <strong>Projektname:</strong> {projectFormData.project_name}
            </p>
            <p>
              <strong>Auftragsdatum:</strong> {projectFormData.order_date}
            </p>
            <p>
              <strong>Template:</strong> {selectedTemplate || "Kein Template"}
            </p>
            <div className="modal-actions">
              <button onClick={() => setModalStep(2)}>Zurück</button>
              <button onClick={handleFinalCreateProject} disabled={loading}>
                {loading ? <span className="spinner" /> : "Projekt erstellen"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectModal;

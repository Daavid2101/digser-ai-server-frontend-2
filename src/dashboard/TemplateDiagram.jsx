import React, { useState, useEffect } from "react";

const TemplateDiagram = ({ template, onChange, initialChildChecks }) => {
  const [parentChecks, setParentChecks] = useState({});
  const [childChecks, setChildChecks] = useState({});

  useEffect(() => {
    if (template) {
      // Berechne die initialen Parent-Checks: Falls initialChildChecks übergeben wurden,
      // wird für jedes Kapitel geprüft, ob mindestens ein untergeordneter Task aktiviert ist.
      const newParentChecks = {};
      template.structure.forEach((chapter) => {
        const tasksInChapter = template.tasks.filter(
          (task) => task.parent === chapter
        );
        if (initialChildChecks) {
          newParentChecks[chapter] = tasksInChapter.some(
            (task) => initialChildChecks[task.nummer]
          );
        } else {
          newParentChecks[chapter] = true;
        }
      });
      setParentChecks(newParentChecks);

      // Setze die initialen Child-Checks:
      if (initialChildChecks) {
        setChildChecks(initialChildChecks);
      } else {
        const defaults = {};
        template.tasks.forEach((task) => {
          defaults[task.nummer] = true;
        });
        setChildChecks(defaults);
      }
    }
  }, [template, initialChildChecks]);

  // Handler für die Parent-Checkbox
  const handleParentChange = (chapter, checked) => {
    const newParentChecks = { ...parentChecks, [chapter]: checked };
    setParentChecks(newParentChecks);

    // Setze alle Child-Checkboxen dieses Kapitels auf den gleichen Wert
    const newChildChecks = { ...childChecks };
    template.tasks.forEach((task) => {
      if (task.parent === chapter) {
        newChildChecks[task.nummer] = checked;
      }
    });
    setChildChecks(newChildChecks);

    if (onChange) {
      onChange({ parentChecks: newParentChecks, childChecks: newChildChecks });
    }
  };

  // Handler für die Child-Checkbox
  const handleChildChange = (taskNummer, checked) => {
    const newChildChecks = { ...childChecks, [taskNummer]: checked };
    setChildChecks(newChildChecks);

    // Berechne für jeden Parent, ob mindestens ein untergeordneter Task aktiviert ist
    const newParentChecks = { ...parentChecks };
    template.structure.forEach((chapter) => {
      const tasksInChapter = template.tasks.filter(
        (task) => task.parent === chapter
      );
      newParentChecks[chapter] = tasksInChapter.some(
        (task) => newChildChecks[task.nummer]
      );
    });
    setParentChecks(newParentChecks);

    if (onChange) {
      onChange({ parentChecks: newParentChecks, childChecks: newChildChecks });
    }
  };

  return (
    <div className="template-diagram">
      {template.structure.map((chapter, index) => (
        <div key={index} className="template-chapter">
          <label>
            <input
              type="checkbox"
              checked={parentChecks[chapter] || false}
              onChange={(e) => handleParentChange(chapter, e.target.checked)}
            />
            <strong>{chapter}</strong>
          </label>
          {parentChecks[chapter] && (
            <div className="template-tasks" style={{ paddingLeft: "20px" }}>
              {template.tasks
                .filter((task) => task.parent === chapter)
                .map((task) => (
                  <div key={task.nummer} className="template-task">
                    <label>
                      <input
                        type="checkbox"
                        checked={childChecks[task.nummer] || false}
                        onChange={(e) =>
                          handleChildChange(task.nummer, e.target.checked)
                        }
                      />
                      {task.nummer} {task.title}
                    </label>
                  </div>
                ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default TemplateDiagram;

import React, { useState, useCallback, useMemo } from "react";
import {
  createEditor,
  Transforms,
  Editor,
  Element as SlateElement,
} from "slate";
import { Slate, Editable, withReact, useSlate } from "slate-react";
import { withHistory } from "slate-history";
import "./UnifiedEditorCE.css";

// Custom element types
const ElementTypes = {
  PAGE: "page",
  PARAGRAPH: "paragraph",
  HEADING_ONE: "heading-one",
};

// Platzhalter-Inhalt im Slate-Format
const placeholderValue = [
  {
    type: ElementTypes.PAGE,
    children: [
      { type: ElementTypes.HEADING_ONE, children: [{ text: "Thema 1" }] },
      { type: ElementTypes.PARAGRAPH, children: [{ text: "Test" }] },
    ],
  },
  {
    type: ElementTypes.PAGE,
    children: [
      { type: ElementTypes.HEADING_ONE, children: [{ text: "Thema 2" }] },
    ],
  },
  {
    type: ElementTypes.PAGE,
    children: [
      { type: ElementTypes.HEADING_ONE, children: [{ text: "Thema 3" }] },
    ],
  },
];

// Initial value with placeholder
const initialValue = placeholderValue;

// Format buttons for the toolbar
const FormatButton = ({ format, icon }) => {
  const editor = useSlate();

  const isBlockActive = (format) => {
    const [match] = Editor.nodes(editor, {
      match: (n) => SlateElement.isElement(n) && n.type === format,
    });
    return !!match;
  };

  const toggleBlock = (format) => {
    const isActive = isBlockActive(format);
    const newProperties = {
      type: isActive ? ElementTypes.PARAGRAPH : format,
    };

    Transforms.setNodes(editor, newProperties);
  };

  return (
    <button
      className={`format-button ${isBlockActive(format) ? "active" : ""}`}
      onClick={() => toggleBlock(format)}
    >
      {icon}
    </button>
  );
};

// Create a toolbar with formatting options
const Toolbar = () => {
  const editor = useSlate();

  return (
    <div className="format-buttons">
      <FormatButton format={ElementTypes.HEADING_ONE} icon="H1" />
      <FormatButton format={ElementTypes.PARAGRAPH} icon="¶" />
    </div>
  );
};

const UnifiedEditorCE = ({ selectedProject, API_URL }) => {
  const [value, setValue] = useState(initialValue);
  const [isLoading, setIsLoading] = useState(true);

  // Create a Slate editor object that won't change across renders
  const editor = useMemo(() => withHistory(withReact(createEditor())), []);

  // Define a rendering function for our custom elements
  const renderElement = useCallback((props) => {
    const { attributes, children, element } = props;

    switch (element.type) {
      case ElementTypes.PAGE:
        return (
          <section className="page" {...attributes}>
            {children}
          </section>
        );
      case ElementTypes.HEADING_ONE:
        return <h1 {...attributes}>{children}</h1>;
      case ElementTypes.PARAGRAPH:
      default:
        return <p {...attributes}>{children}</p>;
    }
  }, []);

  // Define handlers for key presses
  const handleKeyDown = (event) => {
    if (event.key === "Enter") {
      const { selection } = editor;
      if (selection) {
        const [node] = Editor.node(editor, selection);
        const path = Editor.path(editor, selection);

        if (
          SlateElement.isElement(node) &&
          node.type === ElementTypes.HEADING_ONE
        ) {
          event.preventDefault();
          Transforms.insertNodes(
            editor,
            { type: ElementTypes.PARAGRAPH, children: [{ text: "" }] },
            { at: [path[0], path[1] + 1] }
          );
          Transforms.select(editor, {
            path: [path[0], path[1] + 1, 0],
            offset: 0,
          });
        }
      }
    }
  };

  // Load the document content
  const loadContent = () => {
    if (!selectedProject) {
      setIsLoading(false);
      return;
    }

    fetch(
      `${API_URL}/assistants/retrieve_full_content?project_id=${selectedProject.project_id}`
    )
      .then((res) => res.json())
      .then(({ content }) => {
        if (!content) {
          console.log("No content received, using placeholder");
          setValue(placeholderValue);
          return;
        }

        const parser = new DOMParser();
        const doc = parser.parseFromString(content, "text/html");
        const pages = doc.querySelectorAll(".page");

        if (pages.length > 0) {
          const slatePages = Array.from(pages).map((page) => {
            const pageChildren = [];

            Array.from(page.childNodes).forEach((child) => {
              if (child.nodeName === "H1") {
                pageChildren.push({
                  type: ElementTypes.HEADING_ONE,
                  children: [{ text: child.textContent || "" }],
                });
              } else if (child.nodeName === "P") {
                pageChildren.push({
                  type: ElementTypes.PARAGRAPH,
                  children: [{ text: child.textContent || "" }],
                });
              }
            });

            if (pageChildren.length === 0) {
              pageChildren.push({
                type: ElementTypes.PARAGRAPH,
                children: [{ text: "" }],
              });
            }

            return {
              type: ElementTypes.PAGE,
              children: pageChildren,
            };
          });

          setValue(slatePages);
        } else {
          setValue(placeholderValue);
        }
      })
      .catch((error) => {
        console.error("Error fetching content:", error);
        setValue(placeholderValue);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  // Initial content load
  loadContent();

  // Save the document content
  const save = () => {
    const html = `<div class="full-document">${value
      .map((page) => {
        const pageContent = page.children
          .map((child) => {
            if (child.type === ElementTypes.HEADING_ONE) {
              return `<h1>${child.children.map((n) => n.text).join("")}</h1>`;
            } else {
              return `<p>${child.children.map((n) => n.text).join("")}</p>`;
            }
          })
          .join("");

        return `<section class="page">${pageContent}</section>`;
      })
      .join("")}</div>`;

    fetch(`${API_URL}/assistants/update_full_content`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        project_id: selectedProject.project_id,
        content: html,
      }),
    })
      .then((response) => {
        if (response.ok) {
          alert("Dokument gespeichert!");
        } else {
          alert("Fehler beim Speichern des Dokuments");
        }
      })
      .catch((error) => {
        console.error("Error saving content:", error);
        alert("Fehler beim Speichern: " + error.message);
      });
  };

  // Add a new page
  const addPage = () => {
    const newPage = {
      type: ElementTypes.PAGE,
      children: [
        {
          type: ElementTypes.HEADING_ONE,
          children: [{ text: "Neues Thema" }],
        },
        {
          type: ElementTypes.PARAGRAPH,
          children: [{ text: "" }],
        },
      ],
    };

    Transforms.insertNodes(editor, newPage, { at: [value.length] });

    setTimeout(() => {
      const pages = document.querySelectorAll(".page");
      if (pages.length > 0) {
        pages[pages.length - 1].scrollIntoView({ behavior: "smooth" });
      }
    }, 100);
  };

  if (isLoading) {
    return <div className="ce-editor-container">Lädt...</div>;
  }

  return (
    <div className="ce-editor-container">
      <div className="ce-toolbar">
        <button onClick={save} className="toolbar-button">
          Speichern
        </button>
        <button onClick={addPage} className="toolbar-button">
          Neue Seite
        </button>
      </div>

      <div className="ce-editor">
        <Slate editor={editor} value={value} onChange={setValue}>
          <Toolbar />
          <Editable
            renderElement={renderElement}
            onKeyDown={handleKeyDown}
            placeholder="Beginne zu schreiben..."
          />
        </Slate>
      </div>
    </div>
  );
};

export default UnifiedEditorCE;

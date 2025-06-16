import React, {
  useEffect,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";
import "./PageEditor.css";

const PageEditor = forwardRef(
  ({ selectedProject, API_URL, reloadTrigger }, ref) => {
    const editorRef = useRef(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [restoring, setRestoring] = useState(false);
    const [zoomLevel, setZoomLevel] = useState(1);
    const [isSaved, setIsSaved] = useState(true);
    const [keystrokeCount, setKeystrokeCount] = useState(0);
    const [toolbarMode, setToolbarMode] = useState("wrap");

    const zoomIn = () => setZoomLevel((z) => Math.min(z + 0.1, 2));
    const zoomOut = () => setZoomLevel((z) => Math.max(z - 0.1, 0.5));

    // Toolbar-Resize-Handler
    // Toolbar-Resize-Handler - Verbesserte Version
    // Toolbar-Resize-Handler - Korrekte Lösung für zweizeilige scrollbare Toolbar

    // Toolbar-Resize-Handler - Korrigierte Lösung ohne versteckte Zeilen
    // Einfachere Lösung - vermeidet das "versteckte Zeilen" Problem
    useEffect(() => {
      const checkToolbar = () => {
        const toolbar = document.querySelector(".toolbar");
        if (!toolbar) return;

        //fetch("http://localhost:8000/load_content")
        // .then((res) => res.json())
        //.then((data) => {
        // if (editorRef.current?.editor) {
        //  editorRef.current.editor.setData(data.content);
        // }
        //});

        // Test 1: Passt alles in eine Zeile?
        toolbar.style.flexWrap = "nowrap";
        toolbar.style.maxHeight = "calc(2.25rem + 1.5rem)";

        const oneLineFits = toolbar.scrollWidth <= toolbar.clientWidth;

        if (oneLineFits) {
          setToolbarMode("nowrap");
          return;
        }

        // Test 2: Wie viele Elemente passen in eine Zeile?
        const buttons = Array.from(toolbar.children);
        const toolbarWidth = toolbar.clientWidth;
        let currentWidth = 0;
        let itemsInFirstRow = 0;

        // Padding und Gaps berücksichtigen
        const style = getComputedStyle(toolbar);
        const paddingLeft = parseFloat(style.paddingLeft);
        const paddingRight = parseFloat(style.paddingRight);
        const gap = parseFloat(style.columnGap) || 8; // 0.5rem = 8px

        const availableWidth = toolbarWidth - paddingLeft - paddingRight;

        for (let i = 0; i < buttons.length; i++) {
          const buttonWidth = buttons[i].offsetWidth;
          const neededWidth = currentWidth + buttonWidth + (i > 0 ? gap : 0);

          if (neededWidth <= availableWidth) {
            currentWidth = neededWidth;
            itemsInFirstRow++;
          } else {
            break;
          }
        }

        // Wenn mindestens die Hälfte der Items in die erste Zeile passt, wrap verwenden
        // Ansonsten horizontal scrollen
        if (itemsInFirstRow >= Math.ceil(buttons.length / 2)) {
          toolbar.style.flexWrap = "wrap";
          toolbar.style.maxHeight = "calc(2 * 2.25rem + 0.5rem + 1.5rem)";
          setToolbarMode("wrap");
        } else {
          // Zu wenige Items passen in erste Zeile - horizontal scrollen
          toolbar.style.flexWrap = "nowrap";
          toolbar.style.maxHeight = "calc(2.25rem + 1.5rem)";
          setToolbarMode("nowrap");
        }
      };

      const intervalId = setInterval(checkToolbar, 200);
      setTimeout(checkToolbar, 100);

      return () => clearInterval(intervalId);
    }, [selectedProject]);
    // Event-Listener für Tabellenbearbeitung
    useEffect(() => {
      const editor = editorRef.current;
      if (!editor) return;

      const handleKeyDown = (event) => {
        const selection = window.getSelection();
        if (!selection.rangeCount) return;
        const range = selection.getRangeAt(0);
        const currentCell = range.startContainer.closest("td, th");

        if (currentCell) {
          const table = currentCell.closest("table");
          const row = currentCell.parentElement;
          const isLastCellInRow =
            row.cells[row.cells.length - 1] === currentCell;
          const isLastRow = table.rows[table.rows.length - 1] === row;

          // Prüfen, ob die Zeile leer ist
          const isRowEmpty = Array.from(row.cells).every(
            (cell) => cell.innerHTML.trim() === "" || cell.innerHTML === "<br>"
          );

          // Neue Zeile hinzufügen mit Enter
          if (event.key === "Enter" && isLastCellInRow) {
            event.preventDefault();
            const newRow = table.insertRow();
            for (let i = 0; i < row.cells.length; i++) {
              const newCell = newRow.insertCell();
              newCell.innerHTML = "<br>";
            }
            const firstCell = newRow.cells[0];
            selection.removeAllRanges();
            const newRange = document.createRange();
            newRange.selectNodeContents(firstCell);
            newRange.collapse(true);
            selection.addRange(newRange);
            firstCell.focus();
            setIsSaved(false);
            setKeystrokeCount((count) => count + 1);
          }
          // Tabelle verlassen mit ArrowDown
          else if (event.key === "ArrowDown" && isLastRow && isLastCellInRow) {
            event.preventDefault();
            const newParagraph = document.createElement("p");
            newParagraph.innerHTML = "<br>";
            const tableContainer = table.closest(".table-container");
            if (tableContainer && tableContainer.parentElement) {
              tableContainer.parentElement.insertBefore(
                newParagraph,
                tableContainer.nextSibling
              );
            } else {
              table.parentElement.insertBefore(newParagraph, table.nextSibling);
            }
            selection.removeAllRanges();
            const newRange = document.createRange();
            newRange.selectNodeContents(newParagraph);
            newRange.collapse(true);
            selection.addRange(newRange);
            newParagraph.focus();
            setIsSaved(false);
            setKeystrokeCount((count) => count + 1);
          }
          // Leere Zeile entfernen mit Backspace/Delete
          else if (
            (event.key === "Backspace" || event.key === "Delete") &&
            isRowEmpty
          ) {
            event.preventDefault();
            const tableBody = row.parentElement;
            const rowIndex = Array.from(tableBody.rows).indexOf(row);
            tableBody.deleteRow(rowIndex);

            // Fokus setzen: Zur vorherigen Zeile oder nach der Tabelle
            if (tableBody.rows.length > 0) {
              const prevRow = tableBody.rows[Math.max(0, rowIndex - 1)];
              const targetCell =
                prevRow.cells[
                  Math.min(currentCell.cellIndex, prevRow.cells.length - 1)
                ];
              selection.removeAllRanges();
              const newRange = document.createRange();
              newRange.selectNodeContents(targetCell);
              newRange.collapse(false); // Cursor ans Ende
              selection.addRange(newRange);
              targetCell.focus();
            } else {
              // Wenn Tabelle leer, entferne sie und füge einen Absatz hinzu
              const newParagraph = document.createElement("p");
              newParagraph.innerHTML = "<br>";
              const tableContainer = table.closest(".table-container");
              if (tableContainer && tableContainer.parentElement) {
                tableContainer.parentElement.replaceChild(
                  newParagraph,
                  tableContainer
                );
              } else {
                table.parentElement.replaceChild(newParagraph, table);
              }
              selection.removeAllRanges();
              const newRange = document.createRange();
              newRange.selectNodeContents(newParagraph);
              newRange.collapse(true);
              selection.addRange(newRange);
              newParagraph.focus();
            }
            setIsSaved(false);
            setKeystrokeCount((count) => count + 1);
          }
          // Ganze Zeile löschen mit Ctrl+Shift+Backspace oder Ctrl+Shift+Delete
          else if (
            (event.key === "Backspace" || event.key === "Delete") &&
            event.ctrlKey &&
            event.shiftKey
          ) {
            event.preventDefault();
            const tableBody = row.parentElement;
            const rowIndex = Array.from(tableBody.rows).indexOf(row);
            tableBody.deleteRow(rowIndex);

            // Fokus setzen: Zur vorherigen Zeile oder nach der Tabelle
            if (tableBody.rows.length > 0) {
              const prevRow = tableBody.rows[Math.max(0, rowIndex - 1)];
              const targetCell =
                prevRow.cells[
                  Math.min(currentCell.cellIndex, prevRow.cells.length - 1)
                ];
              selection.removeAllRanges();
              const newRange = document.createRange();
              newRange.selectNodeContents(targetCell);
              newRange.collapse(false);
              selection.addRange(newRange);
              targetCell.focus();
            } else {
              const newParagraph = document.createElement("p");
              newParagraph.innerHTML = "<br>";
              const tableContainer = table.closest(".table-container");
              if (tableContainer && tableContainer.parentElement) {
                tableContainer.parentElement.replaceChild(
                  newParagraph,
                  tableContainer
                );
              } else {
                table.parentElement.replaceChild(newParagraph, table);
              }
              selection.removeAllRanges();
              const newRange = document.createRange();
              newRange.selectNodeContents(newParagraph);
              newRange.collapse(true);
              selection.addRange(newRange);
              newParagraph.focus();
            }
            setIsSaved(false);
            setKeystrokeCount((count) => count + 1);
          }
        }
      };

      editor.addEventListener("keydown", handleKeyDown);
      return () => editor.removeEventListener("keydown", handleKeyDown);
    }, []);

    // Inhalt laden
    useEffect(() => {
      if (!selectedProject) return;
      setLoading(true);
      const prevScroll = editorRef.current.scrollTop;
      fetch(
        `${API_URL}/assistants/retrieve_full_content?project_id=${selectedProject.project_id}`
      )
        .then((res) => res.json())
        .then(({ content }) => {
          if (editorRef.current) {
            editorRef.current.innerHTML = content || "";
            requestAnimationFrame(() => {
              editorRef.current.scrollTop = prevScroll;
            });
            editorRef.current.focus();
            setIsSaved(true);
            setKeystrokeCount(0);
          }
        })
        .catch((error) =>
          console.error("Fehler beim Laden des Editors:", error)
        )
        .finally(() => setLoading(false));
    }, [selectedProject, API_URL, reloadTrigger]);

    // Funktion für das Speichern
    const saveContent = () => {
      if (!editorRef.current || !selectedProject) return Promise.resolve();
      setSaving(true);
      const updated = editorRef.current.innerHTML;
      return fetch(`${API_URL}/assistants/update_full_content`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: selectedProject.project_id,
          content: updated,
        }),
      })
        .then((res) => res.json())
        .then(() => {
          setIsSaved(true);
          setKeystrokeCount(0);
        })
        .catch((err) => {
          console.error("Fehler beim Speichern des Inhalts:", err);
        })
        .finally(() => setSaving(false));
    };

    // Undo / Restore Funktion
    const restoreContent = () => {
      if (!selectedProject || !editorRef.current) return;
      setRestoring(true);
      fetch(`${API_URL}/assistants/restore_full_content`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: selectedProject.project_id,
        }),
      })
        .then((res) => res.json())
        .then(({ response }) => {
          if (response && response.status === "success") {
            return fetch(
              `${API_URL}/assistants/retrieve_full_content?project_id=${selectedProject.project_id}`
            )
              .then((res) => res.json())
              .then(({ content }) => {
                if (editorRef.current) {
                  editorRef.current.innerHTML = content || "";
                  editorRef.current.focus();
                  setIsSaved(true);
                  setKeystrokeCount(0);
                }
              });
          } else {
            console.error(
              "Wiederherstellung fehlgeschlagen:",
              response.message || "Unbekannter Fehler"
            );
          }
        })
        .catch((err) => {
          console.error("Fehler beim Wiederherstellen des Inhalts:", err);
        })
        .finally(() => setRestoring(false));
    };

    // Handle-Tastenschläge und Autoload
    const handleInput = () => {
      setIsSaved(false);
      setKeystrokeCount((count) => {
        const newCount = count + 1;
        if (newCount >= 50) {
          saveContent();
        }
        return newCount;
      });
    };

    useImperativeHandle(ref, () => ({
      save: saveContent,
      scrollToSection: (sectionId) => {
        if (editorRef.current) {
          const section = editorRef.current.querySelector(
            `[data-section-id="${sectionId}"]`
          );
          if (section) {
            section.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }
      },
    }));

    // Handler für execCommand
    const execCommand = (command, value = null) => {
      if (!editorRef.current) return;
      editorRef.current.focus();
      document.execCommand(command, false, value);
      editorRef.current.focus();
    };

    const insertTable = () => {
      if (!editorRef.current) return;
      const MIN_ROWS = 1,
        MAX_ROWS = 20;
      const MIN_COLS = 1,
        MAX_COLS = 5;
      const rows = prompt(
        `Enter number of rows (${MIN_ROWS}-${MAX_ROWS}):`,
        `${MIN_ROWS}`
      );
      const cols = prompt(
        `Enter number of columns (${MIN_COLS}-${MAX_COLS}):`,
        `${MIN_COLS}`
      );
      const numRows = Math.min(
        Math.max(parseInt(rows, 10) || MIN_ROWS, MIN_ROWS),
        MAX_ROWS
      );
      const numCols = Math.min(
        Math.max(parseInt(cols, 10) || MIN_COLS, MIN_COLS),
        MAX_COLS
      );

      const wrapper = document.createElement("div");
      wrapper.className = "table-container";
      const table = document.createElement("table");
      table.className = "styled-table";
      const tbody = document.createElement("tbody");

      for (let i = 0; i < numRows; i++) {
        const tr = document.createElement("tr");
        for (let j = 0; j < numCols; j++) {
          const cell = document.createElement(j === 0 ? "th" : "td");
          cell.innerHTML = "<br>";
          tr.appendChild(cell);
        }
        tbody.appendChild(tr);
      }
      table.appendChild(tbody);
      wrapper.appendChild(table);
      execCommand("insertHTML", wrapper.outerHTML);
    };

    return (
      <div className="editor-container">
        <div className={`toolbar ${toolbarMode}`}>
          <button onClick={zoomOut} title="Zoom Out" className="toolbar-button">
            <i className="ri-zoom-out-line"></i>
          </button>
          <button onClick={zoomIn} title="Zoom In" className="toolbar-button">
            <i className="ri-zoom-in-line"></i>
          </button>
          <select
            onChange={(e) => execCommand("fontName", e.target.value)}
            defaultValue=""
            title="Font Family"
            className="toolbar-select"
          >
            <option value="" disabled>
              Font
            </option>
            <option value="Arial">Arial</option>
            <option value="Times New Roman">Times New Roman</option>
            <option value="Courier New">Courier New</option>
            <option value="Georgia">Georgia</option>
            <option value="Verdana">Verdana</option>
            <option value="sans-serif">sans-serif</option>
            <option value="serif">serif</option>
            <option value="monospace">monospace</option>
          </select>
          <select
            onChange={(e) => execCommand("fontSize", e.target.value)}
            defaultValue=""
            title="Font Size"
            className="toolbar-select"
          >
            <option value="" disabled>
              Size
            </option>
            <option value="1">8pt</option>
            <option value="2">10pt</option>
            <option value="3">12pt</option>
            <option value="4">14pt</option>
            <option value="5">18pt</option>
            <option value="6">24pt</option>
            <option value="7">36pt</option>
          </select>
          <button
            onClick={insertTable}
            title="Insert Table"
            className="toolbar-button"
          >
            <i className="ri-table-line"></i>
          </button>
          <button
            onClick={() => execCommand("bold")}
            title="Bold"
            className="toolbar-button"
          >
            <i className="ri-bold"></i>
          </button>
          <button
            onClick={() => execCommand("italic")}
            title="Italic"
            className="toolbar-button"
          >
            <i className="ri-italic"></i>
          </button>
          <button
            onClick={() => execCommand("underline")}
            title="Underline"
            className="toolbar-button"
          >
            <i className="ri-underline"></i>
          </button>
          <button
            onClick={() => execCommand("formatBlock", "<H1>")}
            title="Heading 1"
            className="toolbar-button"
          >
            <i className="ri-h-1"></i>
          </button>
          <button
            onClick={() => execCommand("formatBlock", "<H2>")}
            title="Heading 2"
            className="toolbar-button"
          >
            <i className="ri-h-2"></i>
          </button>
          <button
            onClick={() => execCommand("insertUnorderedList")}
            title="Bullet List"
            className="toolbar-button"
          >
            <i className="ri-list-unordered"></i>
          </button>
          <button
            onClick={() => execCommand("insertOrderedList")}
            title="Numbered List"
            className="toolbar-button"
          >
            <i className="ri-list-ordered"></i>
          </button>
          <button
            onClick={saveContent}
            disabled={saving || loading}
            title="Save"
            className="toolbar-button save-button"
          >
            {saving ? (
              <i className="ri-loader-4-line ri-spin"></i>
            ) : (
              <i className="ri-save-line"></i>
            )}
          </button>
          <button
            onClick={restoreContent}
            disabled={restoring || loading}
            title="Undo (Restore Backup)"
            className="toolbar-button undo-button"
          >
            {restoring ? (
              <i className="ri-loader-4-line ri-spin"></i>
            ) : (
              <i className="ri-arrow-go-back-line"></i>
            )}
          </button>
          <span
            className={`save-status ${isSaved ? "saved" : "unsaved"}`}
            style={{ marginLeft: "8px" }}
          >
            {isSaved ? "Status: Gespeichert" : "Status: Nicht gespeichert"}
          </span>
        </div>
        <div
          className="editor-content"
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          style={{ zoom: zoomLevel }}
        />
      </div>
    );
  }
);

export default PageEditor;

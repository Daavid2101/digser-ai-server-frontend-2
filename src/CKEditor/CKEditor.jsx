import {
  useState,
  useEffect,
  useRef,
  useMemo,
  forwardRef,
  useImperativeHandle,
} from "react";
import { CKEditor } from "@ckeditor/ckeditor5-react";
import {
  DecoupledEditor,
  Alignment,
  AutoLink,
  Autosave,
  BalloonToolbar,
  Bold,
  Code,
  Essentials,
  FontBackgroundColor,
  FontColor,
  FontFamily,
  FontSize,
  GeneralHtmlSupport,
  Heading,
  Highlight,
  HorizontalLine,
  ImageEditing,
  ImageUtils,
  Indent,
  IndentBlock,
  Italic,
  Link,
  List,
  ListProperties,
  PageBreak,
  Paragraph,
  RemoveFormat,
  Strikethrough,
  Subscript,
  Superscript,
  Table,
  TableCaption,
  TableCellProperties,
  TableColumnResize,
  TableProperties,
  TableToolbar,
  TodoList,
  Underline,
  ButtonView,
  MenuBarMenuListItemButtonView,
} from "ckeditor5";
import translations from "ckeditor5/translations/de.js";
import "ckeditor5/ckeditor5.css";
import "./CKEditor.css";

class SectionPlugin {
  static get pluginName() {
    return "SectionPlugin";
  }

  constructor(editor) {
    this.editor = editor;
  }

  init() {
    const editor = this.editor;
    const schema = editor.model.schema;

    schema.register("section", {
      allowIn: "$root",
      allowChildren: ["$block"],
      isBlock: true,
      isObject: true,
      allowAttributes: ["id"],
    });

    editor.conversion.for("upcast").elementToElement({
      view: { name: "section", attributes: ["id"] },
      model: (viewElement, { writer }) => {
        return writer.createElement("section", {
          id: viewElement.getAttribute("id"),
        });
      },
    });

    editor.conversion.for("downcast").elementToElement({
      model: "section",
      view: (modelElement, { writer }) => {
        return writer.createContainerElement("section", {
          id: modelElement.getAttribute("id"),
        });
      },
    });
  }
}

class MyExtrasMenuPlugin {
  static get pluginName() {
    return "MyExtrasMenuPlugin";
  }

  constructor(editor) {
    this.editor = editor;
  }

  init() {
    const { ui } = this.editor;
    // Helper: Configs immer aktuell abrufen
    const getCallbacks = () => this.editor.config.get("myExtras") || {};

    const items = [
      { key: "load", label: "Laden" },
      { key: "save", label: "Speichern" },
      { key: "zoomIn", label: "Zoom + (Strg/Cmd & +)" },
      { key: "zoomOut", label: "Zoom - (Strg/Cmd & -)" },
      { key: "zoomReset", label: "Zoom zurücksetzen (Strg/Cmd & 0)" },
      { key: "sourcecode", label: "Quellcode anzeigen" },
    ];

    items.forEach(({ key, label }) => {
      ui.componentFactory.add(`menuBar:${key}`, (locale) => {
        const view = new MenuBarMenuListItemButtonView(locale);
        view.set({ label, tooltip: true });
        view.on("execute", () => {
          const callbacks = getCallbacks();
          if (typeof callbacks[key] === "function") {
            // Markiere den Aufruf als vom Plugin kommend
            callbacks[key]();
          } else {
            console.warn(
              `aiEditorMenu: Callback '${key}' nicht gefunden.`,
              callbacks
            );
          }
        });
        return view;
      });
    });

    ui.extendMenuBar({
      menu: {
        menuId: "ai_editor",
        label: "KI Editor",
        groups: [
          {
            groupId: "aiEditorMenu",
            items: items.map((i) => `menuBar:${i.key}`),
          },
        ],
      },
      position: "before:edit",
    });
  }
}

const LICENSE_KEY = "GPL";

const CKEditorTest = forwardRef((props, ref) => {
  const zoomIn = () => setZoomLevel((prev) => Math.min(prev + 0.1, 3.0));
  const zoomOut = () => setZoomLevel((prev) => Math.max(prev - 0.1, 0.1));
  const zoomReset = () => {
    const fitZoom = calculateFitToWidthZoom();
    setZoomLevel(Math.min(Math.max(fitZoom, 0.1), 3.0));
  };
  const editorContainerRef = useRef(null);
  const editorMenuBarRef = useRef(null);
  const editorToolbarRef = useRef(null);
  const editorRef = useRef(null);
  const editorInstanceRef = useRef(null);
  const projectRef = useRef(null);
  const [editorInstance, setEditorInstance] = useState(null);
  const [isLayoutReady, setIsLayoutReady] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [sections, setSections] = useState([]);
  const [keystrokeCount, setKeystrokeCount] = useState(0);
  const [isSaved, setIsSaved] = useState(true);
  const [lastSaveTime, setLastSaveTime] = useState(null);
  const AUTO_SAVE_KEYSTROKES = 100; // Nach 100 Tastenschlägen speichern

  useEffect(() => {
    setIsLayoutReady(true);
    return () => setIsLayoutReady(false);
  }, []);

  useEffect(() => {
    if (editorInstance) {
      const content = editorInstance.getData();
      const parser = new DOMParser();
      const doc = parser.parseFromString(content, "text/html");
      const sectionElements = doc.querySelectorAll("section[id]");
      const sectionList = Array.from(sectionElements).map((el) => ({
        id: el.id,
        title: el.querySelector("h2")?.textContent || el.id,
      }));
      setSections(sectionList);
    }
  }, [editorInstance]);

  useEffect(() => {
    const loadContent = async () => {
      if (editorInstance && props.selectedProject) {
        await restoreContent();
      }
    };
    loadContent();
    projectRef.current = props.selectedProject;
  }, [editorInstance, props.selectedProject]);

  // Automatisches Zoom bei Container-Größenänderung
  useEffect(() => {
    // Nur setup wenn Editor-Container bereit ist
    if (!editorContainerRef.current) return;

    const handleResize = () => {
      if (editorContainerRef.current) {
        const newZoom = calculateFitToWidthZoom();
        setZoomLevel(newZoom);
      }
    };

    // Initial zoom setzen (nur wenn noch bei 1.0)
    if (zoomLevel === 1) {
      const initialZoom = calculateFitToWidthZoom();
      setZoomLevel(initialZoom);
    }

    // ResizeObserver für Container-Änderungen
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(editorContainerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [isLayoutReady]); // Abhängigkeit geändert von editorInstance zu isLayoutReady

  // Auto-Save bei Tastenschlägen
  useEffect(() => {
    if (!editorInstance) return;

    const handleChange = () => {
      setIsSaved(false);
      setKeystrokeCount((prev) => {
        const newCount = prev + 1;
        if (newCount >= AUTO_SAVE_KEYSTROKES) {
          // Auto-Save triggern
          setTimeout(() => {
            saveContent();
            setKeystrokeCount(0);
            setIsSaved(true);
            setLastSaveTime(new Date());
          }, 100); // Kurze Verzögerung für bessere Performance
        }
        return newCount;
      });
    };

    editorInstance.model.document.on("change:data", handleChange);

    return () => {
      editorInstance.model.document.off("change:data", handleChange);
    };
  }, [editorInstance]);

  useEffect(() => {
    if (!editorContainerRef.current) return;

    const handleWheel = (event) => {
      // Nur bei gedrückter Strg-Taste oder bei Touchpad-Zoom (ctrlKey)
      if (!event.ctrlKey) return;

      // Verhindere das Standard-Browser-Zoom
      event.preventDefault();
      event.stopPropagation();

      // Bestimme Zoom-Richtung basierend auf deltaY
      const zoomFactor = 0.1;
      const isZoomIn = event.deltaY < 0;

      setZoomLevel((prevZoom) => {
        if (isZoomIn) {
          // Zoom In - maximaler Zoom bei 3.0
          return Math.min(prevZoom + zoomFactor, 3.0);
        } else {
          // Zoom Out - minimaler Zoom bei 0.1
          return Math.max(prevZoom - zoomFactor, 0.1);
        }
      });
    };

    const editorContainer = editorContainerRef.current;

    // Event Listener nur auf dem Editor-Container
    editorContainer.addEventListener("wheel", handleWheel, { passive: false });

    // Cleanup
    return () => {
      editorContainer.removeEventListener("wheel", handleWheel);
    };
  }, [editorInstance]); // Abhängig von editorInstance, damit es nach dem Laden funktioniert

  // Zusätzlich: Keyboard Shortcuts für Zoom (optional)
  useEffect(() => {
    if (!editorContainerRef.current) return;

    const handleKeyDown = (event) => {
      // Nur wenn der Editor-Container den Fokus hat oder ein Kind-Element
      if (!editorContainerRef.current.contains(event.target)) return;

      // Strg/Cmd + Plus für Zoom In
      if (
        (event.ctrlKey || event.metaKey) &&
        (event.key === "+" || event.key === "=")
      ) {
        event.preventDefault();
        zoomIn();
      }

      // Strg/Cmd + Minus für Zoom Out
      if ((event.ctrlKey || event.metaKey) && event.key === "-") {
        event.preventDefault();
        zoomOut();
      }

      // Strg/Cmd + 0 für Zoom Reset
      if ((event.ctrlKey || event.metaKey) && event.key === "0") {
        event.preventDefault();
        zoomReset();
      }
    };

    // Event Listener auf das Document, aber mit Fokus-Check
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [editorInstance]);

  const scrollToSection = (sectionId) => {
    const editorContent =
      editorContainerRef.current.querySelector(".ck-content");
    const sectionElement = editorContent.querySelector(
      `section[id="${sectionId}"]`
    );
    if (sectionElement) {
      sectionElement.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      console.warn(`Section mit ID "${sectionId}" nicht gefunden.`);
    }
  };

  const saveContent = async (
    editorRefFromPlugin = false,
    projectRefFromPlugin = false
  ) => {
    let virtualEditorInstance, virtualProject;
    if (editorRefFromPlugin) {
      virtualEditorInstance = editorRefFromPlugin;
      virtualProject = projectRefFromPlugin;
    } else {
      virtualEditorInstance = editorInstance;
      virtualProject = props.selectedProject;
    }
    if (!virtualEditorInstance || !virtualProject) {
      console.warn("ExtrasMenu: Cannot save - no editor instance or project.", {
        virtualEditorInstance,
        selectedProject: virtualProject,
      });
      return;
    }
    console.log("project: ", virtualProject);
    try {
      const content = virtualEditorInstance.getData();
      console.log("Speicher-Inhalt (API-Aufruf wird gestartet)...", content);
      const response = await fetch(
        `${props.API_URL}/assistants/update_full_content`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            project_id: virtualProject.project_id,
            content,
          }),
        }
      );
      console.log(
        "Speichern erfolgreich:",
        response.status,
        response.statusText
      );

      setIsSaved(true);
      setKeystrokeCount(0);
      setLastSaveTime(new Date());
    } catch (error) {
      console.error("Fehler beim Speichern:", error);
      setIsSaved(false);
    }
  };

  const restoreContent = async (
    editorRefFromPlugin = false,
    projectRefFromPlugin = false
  ) => {
    let virtualEditorInstance, virtualProject;
    if (editorRefFromPlugin) {
      virtualEditorInstance = editorRefFromPlugin;
      virtualProject = projectRefFromPlugin;
    } else {
      virtualEditorInstance = editorInstance;
      virtualProject = props.selectedProject;
    }
    if (!virtualEditorInstance || !virtualProject) {
      console.warn("ExtrasMenu: Cannot load - no editor instance or project.", {
        editorInstance,
        selectedProject: virtualProject,
      });
      return;
    }
    console.log("project: ", virtualProject);
    try {
      console.log("Lade-Inhalt (API-Aufruf wird gestartet)...");
      const response = await fetch(
        `${props.API_URL}/assistants/retrieve_full_content?project_id=${virtualProject.project_id}`
      );
      const data = await response.json();
      if (data.content) {
        virtualEditorInstance.setData(data.content);
        console.log("Laden erfolgreich: Inhalt gesetzt.");
      } else {
        console.warn(
          "Laden abgeschlossen: Keine content-Eigenschaft erhalten.",
          data
        );
      }
    } catch (error) {
      console.error("Fehler beim Laden:", error);
    }
  };

  useImperativeHandle(ref, () => ({
    scrollToSection,
    save: saveContent,
    restore: restoreContent,
    zoomIn: zoomIn,
    zoomOut: zoomOut,
    zoomReset: zoomReset,
  }));

  const calculateFitToWidthZoom = () => {
    if (!editorContainerRef.current) return 1;

    const containerWidth = editorContainerRef.current.offsetWidth;
    const documentWidth = 794;
    const padding = 40;

    return Math.max(0.1, (containerWidth - padding) / documentWidth);
  };

  const { editorConfig } = useMemo(() => {
    if (!isLayoutReady) return {};

    return {
      editorConfig: {
        toolbar: {
          items: [
            "undo",
            "redo",
            "|",
            "heading",
            "|",
            "fontSize",
            "fontFamily",
            "fontColor",
            "fontBackgroundColor",
            "|",
            "bold",
            "italic",
            "underline",
            "|",
            "link",
            "insertTable",
            "highlight",
            "|",
            "alignment",
            "|",
            "bulletedList",
            "numberedList",
            "todoList",
            "outdent",
            "indent",
          ],
          shouldNotGroupWhenFull: false,
        },
        menuBar: {
          isVisible: true,
        },
        plugins: [
          Alignment,
          AutoLink,
          Autosave,
          BalloonToolbar,
          Bold,
          Code,
          Essentials,
          FontBackgroundColor,
          FontColor,
          FontFamily,
          FontSize,
          GeneralHtmlSupport,
          Heading,
          Highlight,
          HorizontalLine,
          ImageEditing,
          ImageUtils,
          Indent,
          IndentBlock,
          Italic,
          Link,
          List,
          ListProperties,
          PageBreak,
          Paragraph,
          RemoveFormat,
          Strikethrough,
          Subscript,
          Superscript,
          Table,
          TableCaption,
          TableCellProperties,
          TableColumnResize,
          TableProperties,
          TableToolbar,
          TodoList,
          Underline,
          SectionPlugin,
          MyExtrasMenuPlugin,
        ],
        balloonToolbar: [
          "bold",
          "italic",
          "|",
          "link",
          "|",
          "bulletedList",
          "numberedList",
        ],
        myExtras: {
          load: () =>
            restoreContent(editorInstanceRef.current, projectRef.current),
          save: () =>
            saveContent(editorInstanceRef.current, projectRef.current),
          zoomIn,
          zoomOut,
          zoomReset,
          sourcecode: () => {
            const sourceCodeUrl =
              "https://github.com/Daavid2101/digser-ai-server-frontend/";
            window.open(sourceCodeUrl, "_blank");
          },
        },
        fontFamily: {
          supportAllValues: true,
          options: [
            "default",
            "Arial, Helvetica, sans-serif",
            "Lato, sans-serif",
            "Georgia, serif",
            "Times New Roman, Times, serif",
            "Garamond, serif",
            "Courier New, Courier, monospace",
          ],
          default: "Times New Roman, Times, serif",
        },

        fontSize: {
          options: [10, 12, 14, "default", 18, 20, 22],
          supportAllValues: true,
        },
        heading: {
          options: [
            {
              model: "paragraph",
              title: "Paragraph",
              class: "ck-heading_paragraph",
            },
            {
              model: "heading1",
              view: "h1",
              title: "Heading 1",
              class: "ck-heading_heading1",
            },
            {
              model: "heading2",
              view: "h2",
              title: "Heading 2",
              class: "ck-heading_heading2",
            },
            {
              model: "heading3",
              view: "h3",
              title: "Heading 3",
              class: "ck-heading_heading3",
            },
            {
              model: "heading4",
              view: "h4",
              title: "Heading 4",
              class: "ck-heading_heading4",
            },
            {
              model: "heading5",
              view: "h5",
              title: "Heading 5",
              class: "ck-heading_heading5",
            },
            {
              model: "heading6",
              view: "h6",
              title: "Heading 6",
              class: "ck-heading_heading6",
            },
          ],
        },
        htmlSupport: {
          allow: [
            { name: "section", attributes: ["id"] },
            { name: "div", attributes: ["id"] },
          ],
        },
        initialData: "",
        language: "de",
        licenseKey: LICENSE_KEY,
        link: {
          addTargetToExternalLinks: true,
          defaultProtocol: "https://",
          decorators: {
            toggleDownloadable: {
              mode: "manual",
              label: "Downloadable",
              attributes: { download: "file" },
            },
          },
        },
        list: {
          properties: { styles: true, startIndex: true, reversed: true },
        },
        placeholder: "Type or paste your content here!",
        table: {
          contentToolbar: [
            "tableColumn",
            "tableRow",
            "mergeTableCells",
            "tableProperties",
            "tableCellProperties",
          ],
        },
        translations: [translations],
        pagination: {
          pageWidth: "21cm",
          pageHeight: "29.7cm",
          pageMargins: {
            top: "20mm",
            bottom: "20mm",
            left: "20mm",
            right: "20mm",
          },
        },
      },
    };
  }, [isLayoutReady]);

  return (
    <div className="main-container">
      <div
        className="editor-container editor-container_document-editor"
        ref={editorContainerRef}
      >
        <div
          className="editor-container__menu-bar"
          ref={editorMenuBarRef}
        ></div>
        <div className="editor-container__toolbar" ref={editorToolbarRef}></div>
        <div className="editor-container__editor-wrapper">
          <div className="editor-container__editor">
            <div
              className="editor-content"
              style={{
                transform: `scale(${zoomLevel})`,
                transformOrigin: "center top",
                width: "794px",
                margin: "0 auto",
              }}
            >
              <div ref={editorRef}>
                {editorConfig && (
                  <CKEditor
                    editor={DecoupledEditor}
                    config={editorConfig}
                    onReady={(editor) => {
                      setEditorInstance(editor);
                      editorInstanceRef.current = editor;
                      editorToolbarRef.current.appendChild(
                        editor.ui.view.toolbar.element
                      );
                      editorMenuBarRef.current.appendChild(
                        editor.ui.view.menuBarView.element
                      );
                    }}
                    onAfterDestroy={() => {
                      Array.from(editorToolbarRef.current.children).forEach(
                        (child) => child.remove()
                      );
                      Array.from(editorMenuBarRef.current.children).forEach(
                        (child) => child.remove()
                      );
                      setEditorInstance(null);
                      editorInstanceRef.current = null;
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="save-status">
          <div className={`save-indicator ${isSaved ? "saved" : "unsaved"}`}>
            {isSaved ? (
              <>
                <span className="save-icon">✓</span>
                <span>Gespeichert</span>
                {lastSaveTime && (
                  <span className="save-time">
                    {lastSaveTime.toLocaleTimeString("de-DE", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                )}
              </>
            ) : (
              <>
                <span className="save-icon">●</span>
                <span>Nicht gespeichert</span>
              </>
            )}

            <div className="save-tooltip">
              {isSaved ? (
                <>
                  <strong>Gespeichert</strong>
                  <br />
                  Speichern/Laden Sie manuell über:
                  <br />
                  KI Editor → Speichern/Laden
                </>
              ) : (
                <>
                  <strong>Änderungen nicht gespeichert</strong>
                  <br />
                  Auto-Speichern nach 100 Tastenschlägen oder KI Interaktion.
                  <br />
                  Manuell speichern über:
                  <br />
                  KI Editor → Speichern
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default CKEditorTest;

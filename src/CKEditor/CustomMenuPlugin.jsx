import { Plugin } from "ckeditor5";
import { ButtonView, MenuBarMenuView } from "ckeditor5";

export default class CustomMenuPlugin extends Plugin {
  static get requires() {
    return ["MenuBar"];
  }

  static get pluginName() {
    return "CustomMenuPlugin";
  }

  init() {
    const editor = this.editor;
    const t = editor.t;

    // Registrieren der Befehle
    this._registerCommands();

    // Hinzufügen des benutzerdefinierten Menüs zur Menüleiste
    editor.ui.componentFactory.add("customActionsMenu", (locale) => {
      const menuView = new MenuBarMenuView(locale);

      menuView.buttonView.set({
        label: t("Aktionen"),
        withText: true,
        tooltip: t("Benutzerdefinierte Aktionen"),
      });

      // Erstellen der Schaltflächen für das Dropdown-Menü
      const saveButton = this._createButton(t("Speichern"), () => {
        editor.execute("saveContent");
      });

      const loadButton = this._createButton(t("Laden"), () => {
        editor.execute("restoreContent");
      });

      const zoomInButton = this._createButton(t("Zoom-In"), () => {
        editor.execute("zoomIn");
      });

      const zoomOutButton = this._createButton(t("Zoom-Out"), () => {
        editor.execute("zoomOut");
      });

      // Hinzufügen der Schaltflächen zum Menüpanel
      menuView.panelView.children.add(saveButton);
      menuView.panelView.children.add(loadButton);
      menuView.panelView.children.add(zoomInButton);
      menuView.panelView.children.add(zoomOutButton);

      return menuView;
    });
  }

  _registerCommands() {
    const editor = this.editor;

    // Befehl für Speichern
    editor.commands.add("saveContent", {
      execute: () => {
        const component =
          editor.ui.view.element.closest(".main-container").__reactFiber$
            .memoizedProps.ref.current;
        if (component && typeof component.save === "function") {
          component.save(true);
        }
      },
    });

    // Befehl für Laden
    editor.commands.add("restoreContent", {
      execute: () => {
        const component =
          editor.ui.view.element.closest(".main-container").__reactFiber$
            .memoizedProps.ref.current;
        if (component && typeof component.restore === "function") {
          component.restore(true);
        }
      },
    });

    // Befehl für Zoom-In
    editor.commands.add("zoomIn", {
      execute: () => {
        const component =
          editor.ui.view.element.closest(".main-container").__reactFiber$
            .memoizedProps.ref.current;
        if (component && typeof component.zoomIn === "function") {
          component.zoomIn();
        }
      },
    });

    // Befehl für Zoom-Out
    editor.commands.add("zoomOut", {
      execute: () => {
        const component =
          editor.ui.view.element.closest(".main-container").__reactFiber$
            .memoizedProps.ref.current;
        if (component && typeof component.zoomOut === "function") {
          component.zoomOut();
        }
      },
    });
  }

  _createButton(label, callback) {
    const button = new ButtonView();

    button.set({
      label,
      withText: true,
    });

    button.on("execute", callback);

    return button;
  }
}

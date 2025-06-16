// MyButtonPlugin.js
import myIcon from "./myIcon.js";

export default class MyButtonPlugin extends Plugin {
  init() {
    const editor = this.editor;

    editor.ui.componentFactory.add("myButton", (locale) => {
      const view = new ButtonView(locale);

      view.set({
        label: "Mein Knopf",
        icon: myIcon,
        tooltip: true,
      });

      // Action beim Klick
      view.on("execute", () => {
        editor.model.change((writer) => {
          // Beispiel: Text einfügen
          const insertPosition =
            editor.model.document.selection.getFirstPosition();
          writer.insertText("👋 Hallo Welt!", insertPosition);
        });
      });

      return view;
    });
  }
}

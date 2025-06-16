// usePasteFiles.js
import { useEffect } from "react";

const usePasteFiles = (setFiles, maxFiles) => {
  useEffect(() => {
    const handlePaste = (event) => {
      const clipboardItems = event.clipboardData.items;
      setFiles((prevFiles) => {
        const currentFileCount = prevFiles.length;
        const remainingSlots = maxFiles - currentFileCount;

        if (remainingSlots <= 0) {
          alert(`Maximale Anzahl von ${maxFiles} Dateien erreicht!`);
          return prevFiles;
        }

        const newFiles = [];
        for (let i = 0; i < clipboardItems.length; i++) {
          if (clipboardItems[i].type.indexOf("image") !== -1) {
            const file = clipboardItems[i].getAsFile();
            if (file && newFiles.length < remainingSlots) {
              newFiles.push(file);
            }
          }
        }

        if (newFiles.length > remainingSlots) {
          alert(
            `Nur ${remainingSlots} von ${newFiles.length} Dateien wurden hinzugefügt. Maximale Anzahl: ${maxFiles}.`
          );
        }

        return [...prevFiles, ...newFiles.slice(0, remainingSlots)];
      });
    };

    document.addEventListener("paste", handlePaste);
    return () => {
      document.removeEventListener("paste", handlePaste);
    };
  }, [setFiles, maxFiles]);
};

export default usePasteFiles;

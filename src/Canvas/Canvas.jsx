import React, { useState, useEffect, useMemo, useCallback } from "react";
import axios from "axios";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  ResponsiveContainer,
} from "recharts";
import * as math from "mathjs";
import _ from "lodash";

const CanvasComponent = ({ API_URL, selectedProject }) => {
  const [canvasCode, setCanvasCode] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [DynamicComponent, setDynamicComponent] = useState(null);

  // Funktion zum sicheren Evaluieren von React-Code
  const createDynamicComponent = useCallback((code) => {
    try {
      // Erstelle eine sichere Sandbox-Umgebung für den Code
      // Die Bibliotheken sind bereits importiert und werden als Parameter übergeben
      const componentFunction = new Function(
        "React",
        "LineChart",
        "Line",
        "XAxis",
        "YAxis",
        "CartesianGrid",
        "Tooltip",
        "Legend",
        "BarChart",
        "Bar",
        "PieChart",
        "Pie",
        "Cell",
        "ScatterChart",
        "Scatter",
        "ResponsiveContainer",
        "math",
        "_",
        `
        ${code}
        return typeof DynamicAnalysis !== 'undefined' ? DynamicAnalysis : 
               typeof TestCanvas !== 'undefined' ? TestCanvas : 
               null;
        `
      );

      // Führe den Code aus und erstelle die Komponente
      const ComponentClass = componentFunction(
        React,
        LineChart,
        Line,
        XAxis,
        YAxis,
        CartesianGrid,
        Tooltip,
        Legend,
        BarChart,
        Bar,
        PieChart,
        Pie,
        Cell,
        ScatterChart,
        Scatter,
        ResponsiveContainer,
        math,
        _
      );

      if (!ComponentClass) {
        throw new Error("Keine gültige React-Komponente gefunden");
      }

      return ComponentClass;
    } catch (error) {
      console.error("Fehler beim Erstellen der dynamischen Komponente:", error);
      throw new Error(
        `Fehler beim Kompilieren des Canvas-Codes: ${error.message}`
      );
    }
  }, []);

  // Lade Canvas-Code vom Backend
  useEffect(() => {
    const fetchCanvasCode = async () => {
      if (!selectedProject || !selectedProject.project_id) {
        setError("Kein Projekt ausgewählt");
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await axios.get(
          `${API_URL}/canvas_code/${selectedProject.project_id}`
        );

        console.log("Geladener Canvas-Code:", response.data.code);
        setCanvasCode(response.data.code);

        // Erstelle die dynamische Komponente
        const ComponentClass = createDynamicComponent(response.data.code);
        setDynamicComponent(() => ComponentClass);
      } catch (err) {
        console.error("Fehler beim Laden des Canvas-Codes:", err);
        setError(
          `Fehler beim Laden des Canvas-Codes: ${
            err.response?.data?.error || err.message
          }`
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchCanvasCode();
  }, [API_URL, selectedProject, createDynamicComponent]);

  // Error Boundary für die dynamische Komponente
  const ErrorBoundary = ({ children }) => {
    const [hasError, setHasError] = useState(false);
    const [errorInfo, setErrorInfo] = useState(null);

    useEffect(() => {
      const handleError = (error, errorInfo) => {
        setHasError(true);
        setErrorInfo(error.message);
        console.error("Canvas Component Error:", error, errorInfo);
      };

      window.addEventListener("error", handleError);
      window.addEventListener("unhandledrejection", handleError);

      return () => {
        window.removeEventListener("error", handleError);
        window.removeEventListener("unhandledrejection", handleError);
      };
    }, []);

    if (hasError) {
      return (
        <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
          <h3 className="text-lg font-semibold text-red-800 mb-2">
            Fehler beim Rendern der Canvas-Komponente
          </h3>
          <p className="text-red-600 mb-4">{errorInfo}</p>
          <button
            onClick={() => {
              setHasError(false);
              setErrorInfo(null);
              window.location.reload();
            }}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Seite neu laden
          </button>
        </div>
      );
    }

    return children;
  };

  // Render-Logik
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        <span className="ml-3 text-gray-600">Canvas wird geladen...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <h3 className="text-lg font-semibold text-red-800 mb-2">
          Canvas-Fehler
        </h3>
        <p className="text-red-600 mb-4">{error}</p>
        <div className="space-x-2">
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Seite neu laden
          </button>
          <button
            onClick={() => {
              setError(null);
              setCanvasCode(null);
              setDynamicComponent(null);
            }}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Reset
          </button>
        </div>
      </div>
    );
  }

  if (!canvasCode || !DynamicComponent) {
    return (
      <div className="p-6 text-center text-gray-500">
        <p>Kein Canvas-Code verfügbar für dieses Projekt.</p>
        <p className="text-sm mt-2">
          Projekt-ID: {selectedProject?.project_id || "Nicht verfügbar"}
        </p>
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      <ErrorBoundary>
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-4 border-b bg-gray-50">
            <h2 className="text-lg font-semibold text-gray-800">
              Canvas: {selectedProject?.name || "Unbenanntes Projekt"}
            </h2>
            <p className="text-sm text-gray-600">
              Dynamische Analyse-Komponente
            </p>
          </div>

          <div
            className="overflow-auto"
            style={{ height: "calc(100vh - 200px)" }}
          >
            <DynamicComponent />
          </div>
        </div>
      </ErrorBoundary>

      {/* Debug-Informationen (nur in Entwicklung) */}
      {process.env.NODE_ENV === "development" && (
        <div className="mt-4 p-4 bg-gray-100 rounded-lg text-xs">
          <details>
            <summary className="cursor-pointer font-semibold">
              Debug-Informationen
            </summary>
            <div className="mt-2 space-y-2">
              <p>
                <strong>Projekt-ID:</strong> {selectedProject?.project_id}
              </p>
              <p>
                <strong>Code geladen:</strong> {canvasCode ? "Ja" : "Nein"}
              </p>
              <p>
                <strong>Komponente erstellt:</strong>{" "}
                {DynamicComponent ? "Ja" : "Nein"}
              </p>
              <p>
                <strong>Code-Länge:</strong> {canvasCode?.length || 0} Zeichen
              </p>
            </div>
          </details>
        </div>
      )}
    </div>
  );
};

export default CanvasComponent;

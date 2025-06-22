import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  createContext,
} from "react";
import { AlertCircle, RefreshCw, Code, Play, ChevronDown } from "lucide-react";

// Error Boundary Component
class CodeExecutionErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo,
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 m-4">
          <div className="flex items-center mb-4">
            <AlertCircle className="text-red-500 mr-2" size={20} />
            <h3 className="text-red-800 font-semibold">Code Execution Error</h3>
          </div>
          <div className="text-red-700 mb-4">
            <strong>Error:</strong>{" "}
            {this.state.error && this.state.error.toString()}
          </div>
          <button
            onClick={() =>
              this.setState({ hasError: false, error: null, errorInfo: null })
            }
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Export Context
const ExportContext = createContext({ setExportData: () => {} });

// Dynamic Component Wrapper
const DynamicComponentWrapper = ({ code, onError, onExport }) => {
  const [Component, setComponent] = useState(null);
  const [renderError, setRenderError] = useState(null);
  const { setExportData } = React.useContext(ExportContext);

  useEffect(() => {
    if (!code) return;

    try {
      const executionContext = {
        React,
        useState,
        useEffect,
        useRef,
        useCallback,
      };

      const componentFunction = new Function(
        "React",
        "useState",
        "useEffect",
        "useRef",
        "useCallback",
        `
        try {
          ${code}
          
          if (typeof module !== 'undefined' && module.exports) {
            return module.exports;
          }
          
          if (typeof defaultExport !== 'undefined') {
            return defaultExport;
          }
          
          const componentMatch = code.match(/const\\s+(\\w+)\\s*=\\s*\\([^)]*\\)\\s*=>|function\\s+(\\w+)\\s*\\([^)]*\\)/);
          if (componentMatch) {
            const componentName = componentMatch[1] || componentMatch[2];
            if (typeof eval(componentName) === 'function') {
              return eval(componentName);
            }
          }
          
          if (code.includes('<') && code.includes('>')) {
            return () => {
              try {
                return eval('(' + code + ')');
              } catch (e) {
                return React.createElement('div', { className: 'p-4 bg-yellow-50 border border-yellow-200 rounded' }, 
                  'JSX Code: ', code);
              }
            };
          }
          
          return () => React.createElement('div', { className: 'p-4 bg-blue-50 border border-blue-200 rounded' }, 
            'Executed Code Result');
            
        } catch (error) {
          throw new Error('Code execution failed: ' + error.message);
        }
        `
      );

      const ExecutableComponent = componentFunction(
        React,
        useState,
        useEffect,
        useRef,
        useCallback
      );

      setComponent(() => ExecutableComponent);
      setRenderError(null);
    } catch (error) {
      console.error("Code compilation error:", error);
      setRenderError(error.message);
      onError?.(error);
    }
  }, [code, onError]);

  if (renderError) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-center mb-2">
          <AlertCircle className="text-yellow-600 mr-2" size={16} />
          <span className="text-yellow-800 font-medium">Compilation Error</span>
        </div>
        <div className="text-yellow-700 text-sm font-mono bg-yellow-100 p-2 rounded">
          {renderError}
        </div>
      </div>
    );
  }

  if (!Component) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex items-center">
          <Code className="text-gray-500 mr-2" size={16} />
          <span className="text-gray-600">No executable component found</span>
        </div>
      </div>
    );
  }

  return React.createElement(Component, { setExportData, onExport });
};

// Canvas Dropdown Component
const CanvasDropdown = ({ canvases, selectedCanvasIndex, onCanvasSelect }) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!canvases || canvases.length <= 1) return null;

  const selectedCanvas = canvases[selectedCanvasIndex];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center bg-white border border-gray-300 rounded px-3 py-1 text-sm hover:bg-gray-50 transition-colors"
      >
        <span className="mr-2">
          {selectedCanvas?.name || `Canvas ${selectedCanvasIndex + 1}`}
        </span>
        <ChevronDown
          size={14}
          className={`transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded shadow-lg z-20 min-w-full">
            {canvases.map((canvas, index) => (
              <button
                key={index}
                onClick={() => {
                  onCanvasSelect(index);
                  setIsOpen(false);
                }}
                className={`block w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${
                  index === selectedCanvasIndex
                    ? "bg-blue-50 text-blue-700"
                    : ""
                }`}
              >
                {canvas.name || `Canvas ${index + 1}`}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

// Main Canvas Component
const CanvasComponent = ({ API_URL, selectedProject }) => {
  const [canvases, setCanvases] = useState([]);
  const [selectedCanvasIndex, setSelectedCanvasIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastFetch, setLastFetch] = useState(null);
  const [exportData, setExportData] = useState(null);
  const abortControllerRef = useRef(null);
  const exportDataRef = useRef(null);

  // Stabilize setExportData with useCallback
  const stableSetExportData = useCallback((data) => {
    setExportData(data);
  }, []);

  const handleExport = useCallback(async () => {
    if (!exportDataRef.current) {
      alert("No data available to export");
      return;
    }
    try {
      const response = await fetch(`${API_URL}/canvas/export_data`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(exportDataRef.current),
      });
      if (!response.ok) {
        throw new Error("Failed to export data");
      }
      alert("Data exported successfully");
    } catch (err) {
      console.error("Export failed:", err);
      alert("Failed to export data");
    }
  }, [API_URL]);

  const fetchCanvasCode = useCallback(async () => {
    if (!API_URL || !selectedProject?.project_id) {
      setError("Missing API_URL or selectedProject");
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${API_URL}/canvas/canvas_codes/${selectedProject.project_id}`,
        {
          signal: abortControllerRef.current.signal,
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // Handle the new response structure
      let canvasData = [];
      if (data.code && Array.isArray(data.code)) {
        // Find the project in the response
        const projectData = data.code.find(
          (project) => project.project_id === selectedProject.project_id
        );
        if (projectData && projectData.canvases) {
          canvasData = projectData.canvases;
        }
      } else if (data.canvases && Array.isArray(data.canvases)) {
        canvasData = data.canvases;
      }

      if (!Array.isArray(canvasData) || canvasData.length === 0) {
        throw new Error("No canvas data found");
      }

      setCanvases(canvasData);
      setSelectedCanvasIndex(0); // Reset to first canvas
      setLastFetch(new Date().toISOString());
    } catch (err) {
      if (err.name === "AbortError") {
        return;
      }

      console.error("Failed to fetch canvas code:", err);
      setError(err.message);
      setCanvases([]);
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  }, [API_URL, selectedProject?.project_id]);

  useEffect(() => {
    fetchCanvasCode();
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchCanvasCode]);

  const handleRetry = () => {
    fetchCanvasCode();
  };

  const handleCodeError = (codeError) => {
    console.error("Code execution error:", codeError);
  };

  const handleCanvasSelect = (index) => {
    setSelectedCanvasIndex(index);
  };

  // Get current canvas code
  const currentCanvas = canvases[selectedCanvasIndex];
  const currentCode = currentCanvas?.code || "";

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8 bg-gray-50 rounded-lg border border-gray-200">
        <RefreshCw className="animate-spin text-blue-500 mr-3" size={20} />
        <span className="text-gray-600">Loading canvas code...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center mb-4">
          <AlertCircle className="text-red-500 mr-2" size={20} />
          <h3 className="text-red-800 font-semibold">Failed to Load Canvas</h3>
        </div>
        <div className="text-red-700 mb-4">
          <strong>Error:</strong> {error}
        </div>
        <div className="text-red-600 text-sm mb-4">
          <strong>Project ID:</strong>{" "}
          {selectedProject?.project_id || "Not provided"}
          <br />
          <strong>API URL:</strong> {API_URL || "Not provided"}
        </div>
        <button
          onClick={handleRetry}
          className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors flex items-center"
        >
          <RefreshCw className="mr-2" size={16} />
          Retry
        </button>
      </div>
    );
  }

  if (!canvases.length) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <div className="flex items-center mb-4">
          <Code className="text-gray-500 mr-2" size={20} />
          <h3 className="text-gray-700 font-semibold">No Canvas Code</h3>
        </div>
        <p className="text-gray-600 mb-4">
          No executable code found for this project.
        </p>
        <button
          onClick={handleRetry}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors flex items-center"
        >
          <RefreshCw className="mr-2" size={16} />
          Refresh
        </button>
      </div>
    );
  }

  return (
    <ExportContext.Provider value={{ setExportData: stableSetExportData }}>
      <div className="canvas-container">
        <div className="bg-gray-100 border-b border-gray-200 px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <div className="flex items-center mb-2">
                <Play className="text-green-600 mr-2" size={16} />
                <span className="text-sm font-medium text-gray-700">
                  Canvas: {selectedProject?.name || selectedProject?.project_id}
                </span>
                {canvases.length > 1 && (
                  <span className="ml-2 text-xs text-gray-500">
                    ({canvases.length} verfügbar)
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2 mb-2">
                <button
                  onClick={handleRetry}
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                  title="Refresh canvas"
                >
                  <RefreshCw size={14} />
                </button>
                {lastFetch && (
                  <span className="text-xs text-gray-500">
                    Last updated: {new Date(lastFetch).toLocaleTimeString()}
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleExport}
                  className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 transition-colors"
                >
                  Daten an KI senden
                </button>
                <CanvasDropdown
                  canvases={canvases}
                  selectedCanvasIndex={selectedCanvasIndex}
                  onCanvasSelect={handleCanvasSelect}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="canvas-content">
          <CodeExecutionErrorBoundary>
            <DynamicComponentWrapper
              code={currentCode}
              onError={handleCodeError}
              onExport={(data) => (exportDataRef.current = data)}
            />
          </CodeExecutionErrorBoundary>
        </div>
      </div>
    </ExportContext.Provider>
  );
};

export default CanvasComponent;

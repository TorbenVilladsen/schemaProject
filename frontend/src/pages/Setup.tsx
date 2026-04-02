import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { exportSetup, importSetup } from "../api/client";
import type { SetupData } from "../types";

export default function Setup() {
  const queryClient = useQueryClient();
  const [jsonText, setJsonText] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const importMut = useMutation({
    mutationFn: (data: SetupData) => importSetup(data, true),
    onSuccess: (result) => {
      queryClient.invalidateQueries();
      setMessage(
        `Imported ${result.imported.classes} classes, ${result.imported.teachers} teachers, ${result.imported.subjects} subjects, ${result.imported.rooms} rooms, ${result.imported.timeslots} timeslots.`,
      );
      setError(null);
    },
    onError: (err: unknown) => {
      let msg = "Import failed.";
      if (axios.isAxiosError(err) && err.response?.data?.detail) {
        msg = err.response.data.detail;
      } else if (err instanceof Error) {
        msg = err.message;
      }
      setError(msg);
      setMessage(null);
    },
  });

  const handleExport = async () => {
    setError(null);
    setMessage(null);
    try {
      const data = await exportSetup();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "scheduler-setup.json";
      a.click();
      URL.revokeObjectURL(url);
      setMessage("Export complete.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Export failed.");
    }
  };

  const handleFile = (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setJsonText(typeof reader.result === "string" ? reader.result : "");
    };
    reader.readAsText(file);
  };

  const handleImport = () => {
    setMessage(null);
    setError(null);
    try {
      const parsed = JSON.parse(jsonText) as SetupData;
      importMut.mutate(parsed);
    } catch {
      setError("Invalid JSON.");
    }
  };

  return (
    <div>
      <h1>Setup Import/Export</h1>
      <p>
        Export your current classes, teachers, subjects, rooms, and timeslots as JSON, or import
        a JSON file to quickly set up a new environment.
      </p>
      <p style={{ color: "#b45309" }}>
        Import replaces existing setup data and clears existing schedules.
      </p>

      <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1rem" }}>
        <button onClick={handleExport} style={btnStyle}>Export Setup JSON</button>
        <label style={btnSecondaryStyle}>
          Choose JSON File
          <input
            type="file"
            accept="application/json"
            onChange={(e) => handleFile(e.target.files?.[0] || null)}
            style={{ display: "none" }}
          />
        </label>
      </div>

      <textarea
        value={jsonText}
        onChange={(e) => setJsonText(e.target.value)}
        placeholder="Paste setup JSON here..."
        rows={20}
        style={textAreaStyle}
      />

      <div style={{ marginTop: "0.75rem" }}>
        <button onClick={handleImport} disabled={importMut.isPending} style={btnStyle}>
          {importMut.isPending ? "Importing..." : "Import Setup"}
        </button>
      </div>

      {message && <p style={{ color: "#166534", marginTop: "0.75rem" }}>{message}</p>}
      {error && <p style={{ color: "#b91c1c", marginTop: "0.75rem" }}>{error}</p>}
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  padding: "0.45rem 1rem",
  background: "#2563eb",
  color: "#fff",
  border: "none",
  borderRadius: 4,
  cursor: "pointer",
};

const btnSecondaryStyle: React.CSSProperties = {
  padding: "0.45rem 1rem",
  background: "#4b5563",
  color: "#fff",
  border: "none",
  borderRadius: 4,
  cursor: "pointer",
  display: "inline-block",
};

const textAreaStyle: React.CSSProperties = {
  width: "100%",
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
  border: "1px solid #d1d5db",
  borderRadius: 6,
  padding: "0.75rem",
};

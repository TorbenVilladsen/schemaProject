import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { getSchedules, createSchedule, generateSchedule, deleteSchedule } from "../api/client";

export default function Schedules() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { data: schedules, isLoading } = useQuery({ queryKey: ["schedules"], queryFn: getSchedules });

  const [name, setName] = useState("");
  const [generating, setGenerating] = useState<string | null>(null);

  const createMut = useMutation({
    mutationFn: createSchedule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
      setName("");
    },
  });

  const deleteMut = useMutation({
    mutationFn: deleteSchedule,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["schedules"] }),
  });

  const handleGenerate = async (id: string) => {
    setGenerating(id);
    try {
      await generateSchedule(id);
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
      navigate(`/schedules/${id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Generation failed";
      alert(msg);
    } finally {
      setGenerating(null);
    }
  };

  if (isLoading) return <p>Loading...</p>;

  return (
    <div>
      <h1>Schedules</h1>

      <form
        onSubmit={(e) => { e.preventDefault(); createMut.mutate(name || undefined); }}
        style={{ marginBottom: "1.5rem", display: "flex", gap: "0.5rem" }}
      >
        <input placeholder="Schedule name (optional)" value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
        <button type="submit" style={btnStyle}>New Schedule</button>
      </form>

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={thStyle}>Name</th>
            <th style={thStyle}>Status</th>
            <th style={thStyle}>Solver</th>
            <th style={thStyle}>Created</th>
            <th style={thStyle}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {schedules?.map((s) => (
            <tr key={s.id}>
              <td style={tdStyle}>{s.name || "Untitled"}</td>
              <td style={tdStyle}>{s.status}</td>
              <td style={tdStyle}>{s.solver_status || "—"}</td>
              <td style={tdStyle}>{new Date(s.created_at).toLocaleDateString()}</td>
              <td style={tdStyle}>
                <button
                  onClick={() => handleGenerate(s.id)}
                  disabled={generating === s.id}
                  style={{ ...btnStyle, marginRight: "0.5rem" }}
                >
                  {generating === s.id ? "Generating..." : "Generate"}
                </button>
                <button
                  onClick={() => navigate(`/schedules/${s.id}`)}
                  style={{ ...btnStyle, background: "#6b7280", marginRight: "0.5rem" }}
                >
                  View
                </button>
                <button onClick={() => deleteMut.mutate(s.id)} style={{ ...btnStyle, background: "#ef4444" }}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const inputStyle: React.CSSProperties = { padding: "0.4rem 0.6rem", border: "1px solid #ccc", borderRadius: 4 };
const btnStyle: React.CSSProperties = { padding: "0.4rem 1rem", background: "#2563eb", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer" };
const thStyle: React.CSSProperties = { textAlign: "left", padding: "0.5rem", borderBottom: "2px solid #e0e0e0" };
const tdStyle: React.CSSProperties = { padding: "0.5rem", borderBottom: "1px solid #eee" };

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { getSchedules, createSchedule, generateSchedule, deleteSchedule } from "../api/client";

export default function Schedules() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { data: schedules, isLoading } = useQuery({ queryKey: ["schedules"], queryFn: getSchedules });

  const [name, setName] = useState("");
  const [generating, setGenerating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    setError(null);
    try {
      await generateSchedule(id);
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
      navigate(`/schedules/${id}`);
    } catch (err: unknown) {
      let msg = "Generation failed";
      if (axios.isAxiosError(err) && err.response?.data?.detail) {
        msg = err.response.data.detail;
      } else if (err instanceof Error) {
        msg = err.message;
      }
      setError(msg);
    } finally {
      setGenerating(null);
    }
  };

  const statusBadge = (status: string | null) => {
    if (!status) return <span className="badge badge-neutral">pending</span>;
    if (status === "optimal" || status === "feasible") return <span className="badge badge-success">{status}</span>;
    if (status === "infeasible") return <span className="badge badge-danger">{status}</span>;
    if (status === "running") return <span className="badge badge-warning">{status}</span>;
    return <span className="badge badge-neutral">{status}</span>;
  };

  if (isLoading) return <p className="loading-text">Loading schedules...</p>;

  return (
    <div>
      <div className="page-header">
        <h1>Schedules</h1>
        <p>Create and generate timetable schedules using the constraint solver.</p>
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); createMut.mutate(name || undefined); }}
        className="form-card"
      >
        <div className="field-row" style={{ alignItems: "flex-end" }}>
          <div className="field-group">
            <label className="form-label">Schedule name</label>
            <input className="form-input" placeholder="e.g. Spring 2026 Timetable" value={name} onChange={(e) => setName(e.target.value)} />
            <span className="form-hint">Optional name to identify this schedule</span>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary">New Schedule</button>
          </div>
        </div>
      </form>

      {error && (
        <div className="alert alert-error">
          <strong>Generation failed:</strong>&nbsp;{error}
          <button onClick={() => setError(null)} className="alert-dismiss">&times;</button>
        </div>
      )}

      {schedules && schedules.length > 0 ? (
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Status</th>
              <th>Solver</th>
              <th>Created</th>
              <th style={{ width: 260 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {schedules.map((s) => (
              <tr key={s.id}>
                <td>{s.name || "Untitled"}</td>
                <td><span className="badge badge-neutral">{s.status}</span></td>
                <td>{statusBadge(s.solver_status)}</td>
                <td>{new Date(s.created_at).toLocaleDateString()}</td>
                <td className="actions-cell">
                  <button
                    onClick={() => handleGenerate(s.id)}
                    disabled={generating === s.id}
                    className="btn btn-primary btn-sm"
                  >
                    {generating === s.id ? "Generating..." : "Generate"}
                  </button>
                  <button onClick={() => navigate(`/schedules/${s.id}`)} className="btn btn-secondary btn-sm">
                    View
                  </button>
                  <button onClick={() => deleteMut.mutate(s.id)} className="btn btn-danger btn-sm">
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="empty-state">
          <p><strong>No schedules yet</strong></p>
          <p>Create a schedule above to get started with timetable generation.</p>
        </div>
      )}
    </div>
  );
}

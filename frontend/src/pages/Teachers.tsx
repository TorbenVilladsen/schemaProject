import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getTeachers, createTeacher, deleteTeacher } from "../api/client";

export default function Teachers() {
  const queryClient = useQueryClient();
  const { data: teachers, isLoading } = useQuery({ queryKey: ["teachers"], queryFn: getTeachers });

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [qualSubject, setQualSubject] = useState("");
  const [qualMinGrade, setQualMinGrade] = useState(0);
  const [qualMaxGrade, setQualMaxGrade] = useState(9);

  const createMut = useMutation({
    mutationFn: createTeacher,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teachers"] });
      setName("");
      setEmail("");
    },
  });

  const deleteMut = useMutation({
    mutationFn: deleteTeacher,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["teachers"] }),
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const qualifications = qualSubject
      ? [{ subject_name: qualSubject, min_grade: qualMinGrade, max_grade: qualMaxGrade }]
      : [];
    createMut.mutate({ name, email: email || undefined, qualifications });
  };

  if (isLoading) return <p>Loading...</p>;

  return (
    <div>
      <h1>Teachers</h1>

      <form onSubmit={handleCreate} style={{ marginBottom: "1.5rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required style={inputStyle} />
        <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} />
        <input placeholder="Qualified subject" value={qualSubject} onChange={(e) => setQualSubject(e.target.value)} style={inputStyle} />
        <input type="number" placeholder="Min grade" value={qualMinGrade} onChange={(e) => setQualMinGrade(+e.target.value)} style={{ ...inputStyle, width: 80 }} />
        <input type="number" placeholder="Max grade" value={qualMaxGrade} onChange={(e) => setQualMaxGrade(+e.target.value)} style={{ ...inputStyle, width: 80 }} />
        <button type="submit" style={btnStyle}>Add Teacher</button>
      </form>

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={thStyle}>Name</th>
            <th style={thStyle}>Email</th>
            <th style={thStyle}>Max hrs/week</th>
            <th style={thStyle}>Qualifications</th>
            <th style={thStyle}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {teachers?.map((t) => (
            <tr key={t.id}>
              <td style={tdStyle}>{t.name}</td>
              <td style={tdStyle}>{t.email || "—"}</td>
              <td style={tdStyle}>{t.max_hours_week}</td>
              <td style={tdStyle}>
                {t.qualifications.map((q) => `${q.subject_name} (${q.min_grade}-${q.max_grade})`).join(", ") || "—"}
              </td>
              <td style={tdStyle}>
                <button onClick={() => deleteMut.mutate(t.id)} style={{ ...btnStyle, background: "#ef4444" }}>
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

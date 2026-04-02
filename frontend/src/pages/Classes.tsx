import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getClasses, createClass, deleteClass, getTeachers } from "../api/client";

export default function Classes() {
  const queryClient = useQueryClient();
  const { data: classes, isLoading } = useQuery({ queryKey: ["classes"], queryFn: getClasses });
  const { data: teachers } = useQuery({ queryKey: ["teachers"], queryFn: getTeachers });

  const [name, setName] = useState("");
  const [gradeLevel, setGradeLevel] = useState(0);
  const [contactTeacherId, setContactTeacherId] = useState("");

  const createMut = useMutation({
    mutationFn: createClass,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      setName("");
      setContactTeacherId("");
    },
  });

  const deleteMut = useMutation({
    mutationFn: deleteClass,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["classes"] }),
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMut.mutate({
      name,
      grade_level: gradeLevel,
      contact_teacher_id: contactTeacherId || undefined,
    });
  };

  const teacherName = (id: string | null) =>
    teachers?.find((t) => t.id === id)?.name ?? "-";

  if (isLoading) return <p>Loading...</p>;

  return (
    <div>
      <h1>Classes</h1>
      <form onSubmit={handleCreate} style={{ marginBottom: "1.5rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        <input placeholder="Name (e.g. 3A)" value={name} onChange={(e) => setName(e.target.value)} required style={inputStyle} />
        <input type="number" placeholder="Grade" value={gradeLevel} onChange={(e) => setGradeLevel(+e.target.value)} min={0} max={9} style={{ ...inputStyle, width: 80 }} />
        <select value={contactTeacherId} onChange={(e) => setContactTeacherId(e.target.value)} style={inputStyle}>
          <option value="">Contact teacher (optional)</option>
          {teachers?.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        <button type="submit" style={btnStyle}>Add Class</button>
      </form>

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={thStyle}>Name</th>
            <th style={thStyle}>Grade</th>
            <th style={thStyle}>Contact Teacher</th>
            <th style={thStyle}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {classes?.map((c) => (
            <tr key={c.id}>
              <td style={tdStyle}>{c.name}</td>
              <td style={tdStyle}>{c.grade_level}</td>
              <td style={tdStyle}>{teacherName(c.contact_teacher_id)}</td>
              <td style={tdStyle}>
                <button onClick={() => deleteMut.mutate(c.id)} style={{ ...btnStyle, background: "#ef4444" }}>Delete</button>
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

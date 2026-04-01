import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSubjects, createSubject, deleteSubject } from "../api/client";

export default function Subjects() {
  const queryClient = useQueryClient();
  const { data: subjects, isLoading } = useQuery({ queryKey: ["subjects"], queryFn: getSubjects });

  const [name, setName] = useState("");
  const [gradeLevel, setGradeLevel] = useState(1);
  const [hoursPerWeek, setHoursPerWeek] = useState(3);
  const [roomType, setRoomType] = useState("");

  const createMut = useMutation({
    mutationFn: createSubject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
      setName("");
    },
  });

  const deleteMut = useMutation({
    mutationFn: deleteSubject,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["subjects"] }),
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMut.mutate({
      name,
      grade_level: gradeLevel,
      hours_per_week: hoursPerWeek,
      requires_room_type: roomType || undefined,
    });
  };

  if (isLoading) return <p>Loading...</p>;

  return (
    <div>
      <h1>Subjects</h1>
      <form onSubmit={handleCreate} style={{ marginBottom: "1.5rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        <input placeholder="Name (e.g. Math)" value={name} onChange={(e) => setName(e.target.value)} required style={inputStyle} />
        <input type="number" placeholder="Grade" value={gradeLevel} onChange={(e) => setGradeLevel(+e.target.value)} style={{ ...inputStyle, width: 80 }} />
        <input type="number" placeholder="Hrs/week" value={hoursPerWeek} onChange={(e) => setHoursPerWeek(+e.target.value)} style={{ ...inputStyle, width: 80 }} />
        <input placeholder="Room type (optional)" value={roomType} onChange={(e) => setRoomType(e.target.value)} style={inputStyle} />
        <button type="submit" style={btnStyle}>Add Subject</button>
      </form>

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={thStyle}>Name</th>
            <th style={thStyle}>Grade</th>
            <th style={thStyle}>Hours/Week</th>
            <th style={thStyle}>Room Type</th>
            <th style={thStyle}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {subjects?.map((s) => (
            <tr key={s.id}>
              <td style={tdStyle}>{s.name}</td>
              <td style={tdStyle}>{s.grade_level}</td>
              <td style={tdStyle}>{s.hours_per_week}</td>
              <td style={tdStyle}>{s.requires_room_type || "Any"}</td>
              <td style={tdStyle}>
                <button onClick={() => deleteMut.mutate(s.id)} style={{ ...btnStyle, background: "#ef4444" }}>Delete</button>
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

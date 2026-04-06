import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSubjects, createSubject, updateSubject, deleteSubject, getClasses, getRooms } from "../api/client";

export default function Subjects() {
  const queryClient = useQueryClient();
  const { data: subjects, isLoading } = useQuery({ queryKey: ["subjects"], queryFn: getSubjects });
  const { data: classes } = useQuery({ queryKey: ["classes"], queryFn: getClasses });
  const { data: rooms } = useQuery({ queryKey: ["rooms"], queryFn: getRooms });

  const roomTypes = [...new Set(rooms?.map((r) => r.room_type) ?? [])];

  const [name, setName] = useState("");
  const [gradeLevel, setGradeLevel] = useState(1);
  const [hoursPerWeek, setHoursPerWeek] = useState(3);
  const [roomType, setRoomType] = useState("");
  const [classId, setClassId] = useState("");
  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editGradeLevel, setEditGradeLevel] = useState(1);
  const [editHoursPerWeek, setEditHoursPerWeek] = useState(3);
  const [editRoomType, setEditRoomType] = useState("");
  const [editClassId, setEditClassId] = useState("");

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

  const updateMut = useMutation({
    mutationFn: ({ id, data }: {
      id: string;
      data: {
        name?: string;
        grade_level?: number;
        hours_per_week?: number;
        requires_room_type?: string | null;
        class_id?: string | null;
      };
    }) => updateSubject(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
      setEditingSubjectId(null);
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMut.mutate({
      name,
      grade_level: gradeLevel,
      hours_per_week: hoursPerWeek,
      requires_room_type: roomType || undefined,
      class_id: classId || undefined,
    });
  };

  const startEdit = (subject: NonNullable<typeof subjects>[number]) => {
    setEditingSubjectId(subject.id);
    setEditName(subject.name);
    setEditGradeLevel(subject.grade_level);
    setEditHoursPerWeek(subject.hours_per_week);
    setEditRoomType(subject.requires_room_type ?? "");
    setEditClassId(subject.class_id ?? "");
  };

  const cancelEdit = () => setEditingSubjectId(null);

  const saveEdit = () => {
    if (!editingSubjectId || !editName.trim()) return;
    updateMut.mutate({
      id: editingSubjectId,
      data: {
        name: editName,
        grade_level: editGradeLevel,
        hours_per_week: editHoursPerWeek,
        requires_room_type: editRoomType || null,
        class_id: editClassId || null,
      },
    });
  };

  if (isLoading) return <p className="loading-text">Loading subjects...</p>;

  return (
    <div>
      <div className="page-header">
        <h1>Subjects</h1>
        <p>Define subjects taught at each grade level. Each subject specifies how many hours per week it needs in the schedule.</p>
      </div>

      <form onSubmit={handleCreate} className="form-card">
        <div className="field-row">
          <div className="field-group">
            <label className="form-label">Subject name <span className="required">*</span></label>
            <input className="form-input" placeholder="e.g. Dansk, Matematik" value={name} onChange={(e) => setName(e.target.value)} required />
            <span className="form-hint">The name as it appears in the schedule</span>
          </div>
          <div className="field-group" style={{ maxWidth: 120 }}>
            <label className="form-label">Grade level <span className="required">*</span></label>
            <input className="form-input" type="number" value={gradeLevel} onChange={(e) => setGradeLevel(+e.target.value)} min={0} max={9} />
            <span className="form-hint">Grade 0-9</span>
          </div>
          <div className="field-group" style={{ maxWidth: 120 }}>
            <label className="form-label">Hours/week <span className="required">*</span></label>
            <input className="form-input" type="number" value={hoursPerWeek} onChange={(e) => setHoursPerWeek(+e.target.value)} min={1} />
            <span className="form-hint">Lessons per week</span>
          </div>
        </div>

        <div className="field-row" style={{ alignItems: "flex-end" }}>
          <div className="field-group">
            <label className="form-label">Required room type</label>
            <select className="form-select" value={roomType} onChange={(e) => setRoomType(e.target.value)}>
              <option value="">Any room</option>
              {roomTypes.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
            <span className="form-hint">Leave as "Any room" unless a special room is needed</span>
          </div>
          <div className="field-group">
            <label className="form-label">Assigned class</label>
            <select className="form-select" value={classId} onChange={(e) => setClassId(e.target.value)}>
              <option value="">Not assigned</option>
              {classes?.map((c) => (
                <option key={c.id} value={c.id}>{c.name} (Grade {c.grade_level})</option>
              ))}
            </select>
            <span className="form-hint">Optionally tie to a specific class</span>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary">Add Subject</button>
          </div>
        </div>
      </form>

      {subjects && subjects.length > 0 ? (
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Grade</th>
              <th>Hrs/Week</th>
              <th>Room Type</th>
              <th>Class</th>
              <th style={{ width: 180 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {subjects.map((s) => (
              <tr key={s.id}>
                <td>
                  {editingSubjectId === s.id ? (
                    <input className="form-input" value={editName} onChange={(e) => setEditName(e.target.value)} />
                  ) : s.name}
                </td>
                <td>
                  {editingSubjectId === s.id ? (
                    <input className="form-input" type="number" value={editGradeLevel} onChange={(e) => setEditGradeLevel(+e.target.value)} min={0} max={9} style={{ maxWidth: 80 }} />
                  ) : s.grade_level}
                </td>
                <td>
                  {editingSubjectId === s.id ? (
                    <input className="form-input" type="number" value={editHoursPerWeek} onChange={(e) => setEditHoursPerWeek(+e.target.value)} min={1} style={{ maxWidth: 80 }} />
                  ) : s.hours_per_week}
                </td>
                <td>
                  {editingSubjectId === s.id ? (
                    <select className="form-select" value={editRoomType} onChange={(e) => setEditRoomType(e.target.value)}>
                      <option value="">Any room</option>
                      {roomTypes.map((type) => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  ) : (
                    s.requires_room_type ? <span className="badge badge-neutral">{s.requires_room_type}</span> : "\u2014"
                  )}
                </td>
                <td>
                  {editingSubjectId === s.id ? (
                    <select className="form-select" value={editClassId} onChange={(e) => setEditClassId(e.target.value)}>
                      <option value="">Not assigned</option>
                      {classes?.map((c) => (
                        <option key={c.id} value={c.id}>{c.name} (Grade {c.grade_level})</option>
                      ))}
                    </select>
                  ) : (
                    classes?.find((c) => c.id === s.class_id)?.name || "\u2014"
                  )}
                </td>
                <td className="actions-cell">
                  {editingSubjectId === s.id ? (
                    <>
                      <button onClick={saveEdit} className="btn btn-primary btn-sm">Save</button>
                      <button onClick={cancelEdit} className="btn btn-secondary btn-sm">Cancel</button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => startEdit(s)} className="btn btn-secondary btn-sm">Edit</button>
                      <button onClick={() => deleteMut.mutate(s.id)} className="btn btn-danger btn-sm">Delete</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="empty-state">
          <p><strong>No subjects yet</strong></p>
          <p>Add your first subject above to get started.</p>
        </div>
      )}
    </div>
  );
}

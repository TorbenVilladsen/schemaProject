import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getClasses, createClass, updateClass, deleteClass, getTeachers, getRooms } from "../api/client";

export default function Classes() {
  const queryClient = useQueryClient();
  const { data: classes, isLoading } = useQuery({ queryKey: ["classes"], queryFn: getClasses });
  const { data: teachers } = useQuery({ queryKey: ["teachers"], queryFn: getTeachers });
  const { data: rooms } = useQuery({ queryKey: ["rooms"], queryFn: getRooms });

  const [name, setName] = useState("");
  const [gradeLevel, setGradeLevel] = useState(0);
  const [contactTeacherId, setContactTeacherId] = useState("");
  const [primaryRoomId, setPrimaryRoomId] = useState("");
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editGradeLevel, setEditGradeLevel] = useState(0);
  const [editContactTeacherId, setEditContactTeacherId] = useState("");
  const [editPrimaryRoomId, setEditPrimaryRoomId] = useState("");

  const createMut = useMutation({
    mutationFn: createClass,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      setName("");
      setContactTeacherId("");
      setPrimaryRoomId("");
    },
  });

  const deleteMut = useMutation({
    mutationFn: deleteClass,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["classes"] }),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; grade_level?: number; contact_teacher_id?: string | null; primary_room_id?: string | null } }) =>
      updateClass(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      setEditingClassId(null);
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMut.mutate({
      name,
      grade_level: gradeLevel,
      contact_teacher_id: contactTeacherId || undefined,
      primary_room_id: primaryRoomId || undefined,
    });
  };

  const startEdit = (classItem: NonNullable<typeof classes>[number]) => {
    setEditingClassId(classItem.id);
    setEditName(classItem.name);
    setEditGradeLevel(classItem.grade_level);
    setEditContactTeacherId(classItem.contact_teacher_id ?? "");
    setEditPrimaryRoomId(classItem.primary_room_id ?? "");
  };

  const cancelEdit = () => setEditingClassId(null);

  const saveEdit = () => {
    if (!editingClassId || !editName.trim()) return;
    updateMut.mutate({
      id: editingClassId,
      data: {
        name: editName,
        grade_level: editGradeLevel,
        contact_teacher_id: editContactTeacherId || null,
        primary_room_id: editPrimaryRoomId || null,
      },
    });
  };

  const teacherName = (id: string | null) =>
    teachers?.find((t) => t.id === id)?.name ?? "\u2014";

  const roomName = (id: string | null) =>
    rooms?.find((r) => r.id === id)?.name ?? "\u2014";

  if (isLoading) return <p className="loading-text">Loading classes...</p>;

  return (
    <div>
      <div className="page-header">
        <h1>Classes</h1>
        <p>Register school classes (e.g. 3A, 5B). Each class belongs to a grade level and can have an assigned contact teacher.</p>
      </div>

      <form onSubmit={handleCreate} className="form-card">
        <div className="field-row" style={{ alignItems: "flex-end" }}>
          <div className="field-group">
            <label className="form-label">Class name <span className="required">*</span></label>
            <input className="form-input" placeholder="e.g. 3A, 5B" value={name} onChange={(e) => setName(e.target.value)} required />
            <span className="form-hint">Short identifier for this class</span>
          </div>
          <div className="field-group" style={{ maxWidth: 120 }}>
            <label className="form-label">Grade level <span className="required">*</span></label>
            <input className="form-input" type="number" value={gradeLevel} onChange={(e) => setGradeLevel(+e.target.value)} min={0} max={9} />
            <span className="form-hint">Grade 0-9</span>
          </div>
          <div className="field-group">
            <label className="form-label">Contact teacher</label>
            <select className="form-select" value={contactTeacherId} onChange={(e) => setContactTeacherId(e.target.value)}>
              <option value="">-- none --</option>
              {teachers?.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            <span className="form-hint">The primary teacher responsible for this class</span>
          </div>
          <div className="field-group">
            <label className="form-label">Primary classroom</label>
            <select className="form-select" value={primaryRoomId} onChange={(e) => setPrimaryRoomId(e.target.value)}>
              <option value="">-- none --</option>
              {rooms?.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
            <span className="form-hint">The default room for this class</span>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary">Add Class</button>
          </div>
        </div>
      </form>

      {classes && classes.length > 0 ? (
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Grade</th>
              <th>Contact Teacher</th>
              <th>Primary Room</th>
              <th style={{ width: 180 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {classes.map((c) => (
              <tr key={c.id}>
                <td>
                  {editingClassId === c.id ? (
                    <input className="form-input" value={editName} onChange={(e) => setEditName(e.target.value)} />
                  ) : c.name}
                </td>
                <td>
                  {editingClassId === c.id ? (
                    <input className="form-input" type="number" value={editGradeLevel} onChange={(e) => setEditGradeLevel(+e.target.value)} min={0} max={9} style={{ maxWidth: 80 }} />
                  ) : c.grade_level}
                </td>
                <td>
                  {editingClassId === c.id ? (
                    <select className="form-select" value={editContactTeacherId} onChange={(e) => setEditContactTeacherId(e.target.value)}>
                      <option value="">-- none --</option>
                      {teachers?.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  ) : teacherName(c.contact_teacher_id)}
                </td>
                <td>
                  {editingClassId === c.id ? (
                    <select className="form-select" value={editPrimaryRoomId} onChange={(e) => setEditPrimaryRoomId(e.target.value)}>
                      <option value="">-- none --</option>
                      {rooms?.map((r) => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                  ) : roomName(c.primary_room_id)}
                </td>
                <td className="actions-cell">
                  {editingClassId === c.id ? (
                    <>
                      <button onClick={saveEdit} className="btn btn-primary btn-sm">Save</button>
                      <button onClick={cancelEdit} className="btn btn-secondary btn-sm">Cancel</button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => startEdit(c)} className="btn btn-secondary btn-sm">Edit</button>
                      <button onClick={() => deleteMut.mutate(c.id)} className="btn btn-danger btn-sm">Delete</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="empty-state">
          <p><strong>No classes yet</strong></p>
          <p>Add your first class above to get started.</p>
        </div>
      )}
    </div>
  );
}

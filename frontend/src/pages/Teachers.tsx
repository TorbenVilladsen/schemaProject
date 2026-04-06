import { Fragment, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getTeachers, createTeacher, updateTeacher, deleteTeacher, getSubjects, getTimeslots } from "../api/client";
import type { TeacherAvailability } from "../types";
import { formatTime } from "../styles/shared";

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const GRID_ROWS = 7;

export default function Teachers() {
  const queryClient = useQueryClient();
  const { data: teachers, isLoading } = useQuery({ queryKey: ["teachers"], queryFn: getTeachers });
  const { data: subjects } = useQuery({ queryKey: ["subjects"], queryFn: getSubjects });
  const { data: timeslots } = useQuery({ queryKey: ["timeslots"], queryFn: getTimeslots });

  const subjectNames = [...new Set(subjects?.map((s) => s.name) ?? [])];

  const visibleTimeslots = useMemo(
    () =>
      [...(timeslots ?? [])]
        .sort((a, b) => a.slot_index - b.slot_index)
        .filter((ts) => !isLaesebaandSlot(ts.label, ts.period_type))
        .slice(0, GRID_ROWS),
    [timeslots],
  );

  const timeslotIdsByRow = useMemo(
    () => Array.from({ length: GRID_ROWS }, (_, row) => visibleTimeslots[row]?.id ?? null),
    [visibleTimeslots],
  );

  const rowLabels = useMemo(
    () =>
      Array.from({ length: GRID_ROWS }, (_, row) => {
        const ts = visibleTimeslots[row];
        if (!ts) return `Period ${row + 1}`;
        const baseLabel = ts.label || `Period ${ts.slot_index + 1}`;
        return `${baseLabel} (${formatTime(ts.start_time)}-${formatTime(ts.end_time)})`;
      }),
    [visibleTimeslots],
  );

  const disabledRows = useMemo(
    () => timeslotIdsByRow.map((id) => !id),
    [timeslotIdsByRow],
  );

  const [name, setName] = useState("");
  const [maxHoursWeek, setMaxHoursWeek] = useState(25);
  const [qualSubject, setQualSubject] = useState("");
  const [qualMinGrade, setQualMinGrade] = useState(0);
  const [qualMaxGrade, setQualMaxGrade] = useState(9);
  const [unavailableCells, setUnavailableCells] = useState<Set<string>>(new Set());

  const [editingTeacherId, setEditingTeacherId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editMaxHoursWeek, setEditMaxHoursWeek] = useState(25);
  const [editUnavailableCells, setEditUnavailableCells] = useState<Set<string>>(new Set());

  const createMut = useMutation({
    mutationFn: createTeacher,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teachers"] });
      setName("");
      setMaxHoursWeek(25);
      setUnavailableCells(new Set());
    },
  });

  const deleteMut = useMutation({
    mutationFn: deleteTeacher,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["teachers"] }),
  });

  const updateMut = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: {
        name?: string;
        max_hours_week?: number;
        availability?: { day_of_week: number; timeslot_id: string; is_available?: boolean; preference?: number }[];
      };
    }) => updateTeacher(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teachers"] });
      setEditingTeacherId(null);
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const qualifications = qualSubject
      ? [{ subject_name: qualSubject, min_grade: qualMinGrade, max_grade: qualMaxGrade }]
      : [];
    createMut.mutate({
      name,
      max_hours_week: maxHoursWeek,
      qualifications,
      availability: buildAvailabilityPayload(unavailableCells, timeslotIdsByRow),
    });
  };

  const startEdit = (teacher: NonNullable<typeof teachers>[number]) => {
    setEditingTeacherId(teacher.id);
    setEditName(teacher.name);
    setEditMaxHoursWeek(teacher.max_hours_week);
    setEditUnavailableCells(buildUnavailableCellSet(teacher.availability, timeslotIdsByRow));
  };

  const cancelEdit = () => setEditingTeacherId(null);

  const saveEdit = () => {
    if (!editingTeacherId || !editName.trim()) return;
    updateMut.mutate({
      id: editingTeacherId,
      data: {
        name: editName,
        max_hours_week: editMaxHoursWeek,
        availability: buildAvailabilityPayload(editUnavailableCells, timeslotIdsByRow),
      },
    });
  };

  const toggleCell = (setter: React.Dispatch<React.SetStateAction<Set<string>>>, day: number, row: number) => {
    if (!timeslotIdsByRow[row]) return;
    setter((prev) => {
      const next = new Set(prev);
      const key = cellKey(day, row);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const toggleRow = (setter: React.Dispatch<React.SetStateAction<Set<string>>>, row: number) => {
    if (!timeslotIdsByRow[row]) return;
    setter((prev) => toggleRowCells(prev, row));
  };

  const toggleColumn = (setter: React.Dispatch<React.SetStateAction<Set<string>>>, day: number) => {
    setter((prev) => toggleColumnCells(prev, day, disabledRows));
  };

  if (isLoading) return <p className="loading-text">Loading teachers...</p>;

  return (
    <div>
      <div className="page-header">
        <h1>Teachers</h1>
        <p>Add teachers and assign their subject qualifications. More qualifications can be added later.</p>
      </div>

      <form onSubmit={handleCreate} className="form-card">
        <div className="field-row">
          <div className="field-group">
            <label className="form-label">Full name <span className="required">*</span></label>
            <input className="form-input" placeholder="e.g. Anna Jensen" value={name} onChange={(e) => setName(e.target.value)} required />
            <span className="form-hint">The teacher's display name in schedules</span>
          </div>
          <div className="field-group" style={{ maxWidth: 150 }}>
            <label className="form-label">Hours per week <span className="required">*</span></label>
            <input className="form-input" type="number" value={maxHoursWeek} onChange={(e) => setMaxHoursWeek(+e.target.value)} min={1} required />
            <span className="form-hint">Maximum teaching hours</span>
          </div>
        </div>

        <div className="field-row" style={{ alignItems: "flex-end" }}>
          <div className="field-group">
            <label className="form-label">Qualified subject</label>
            <select className="form-select" value={qualSubject} onChange={(e) => setQualSubject(e.target.value)}>
              <option value="">-- none --</option>
              {subjectNames.map((subjectName) => (
                <option key={subjectName} value={subjectName}>{subjectName}</option>
              ))}
            </select>
            <span className="form-hint">Which subject this teacher can teach</span>
          </div>
          <div className="field-group" style={{ maxWidth: 100 }}>
            <label className="form-label">Min grade</label>
            <input className="form-input" type="number" value={qualMinGrade} onChange={(e) => setQualMinGrade(+e.target.value)} min={0} max={9} />
          </div>
          <div className="field-group" style={{ maxWidth: 100 }}>
            <label className="form-label">Max grade</label>
            <input className="form-input" type="number" value={qualMaxGrade} onChange={(e) => setQualMaxGrade(+e.target.value)} min={0} max={9} />
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary">Add Teacher</button>
          </div>
        </div>

        <div style={{ marginTop: "0.5rem" }}>
          <label className="form-label" style={{ marginBottom: "0.3rem", display: "block" }}>Unavailable periods</label>
          <AvailabilityGrid
            selectedCells={unavailableCells}
            onToggle={(d, r) => toggleCell(setUnavailableCells, d, r)}
            onToggleRow={(r) => toggleRow(setUnavailableCells, r)}
            onToggleColumn={(d) => toggleColumn(setUnavailableCells, d)}
            rowLabels={rowLabels}
            disabledRows={disabledRows}
          />
          <span className="form-hint">Click cells to mark unavailable periods (red). Click day/period headers to toggle entire rows or columns.</span>
          {visibleTimeslots.length < GRID_ROWS && (
            <span className="form-warn" style={{ display: "block", marginTop: "0.25rem" }}>
              Configure at least {GRID_ROWS} timeslots to unlock all rows. Currently mapped: {visibleTimeslots.length}/{GRID_ROWS}.
            </span>
          )}
        </div>
      </form>

      {teachers && teachers.length > 0 ? (
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Max hrs/week</th>
              <th>Days off</th>
              <th>Qualifications</th>
              <th style={{ width: 180 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {teachers.map((t) => (
              <Fragment key={t.id}>
                <tr>
                  <td>
                    {editingTeacherId === t.id ? (
                      <input className="form-input" value={editName} onChange={(e) => setEditName(e.target.value)} />
                    ) : t.name}
                  </td>
                  <td>
                    {editingTeacherId === t.id ? (
                      <input className="form-input" type="number" value={editMaxHoursWeek} onChange={(e) => setEditMaxHoursWeek(+e.target.value)} min={1} style={{ maxWidth: 80 }} />
                    ) : t.max_hours_week}
                  </td>
                  <td>
                    {editingTeacherId === t.id
                      ? editUnavailableCells.size
                      : countUnavailableCells(t.availability, timeslotIdsByRow)}
                  </td>
                  <td>
                    {t.qualifications.length > 0
                      ? t.qualifications.map((q) => `${q.subject_name} (${q.min_grade}-${q.max_grade})`).join(", ")
                      : "\u2014"}
                  </td>
                  <td className="actions-cell">
                    {editingTeacherId === t.id ? (
                      <>
                        <button type="button" onClick={saveEdit} className="btn btn-primary btn-sm">Save</button>
                        <button type="button" onClick={cancelEdit} className="btn btn-secondary btn-sm">Cancel</button>
                      </>
                    ) : (
                      <>
                        <button type="button" onClick={() => startEdit(t)} className="btn btn-secondary btn-sm">Edit</button>
                        <button type="button" onClick={() => deleteMut.mutate(t.id)} className="btn btn-danger btn-sm">Delete</button>
                      </>
                    )}
                  </td>
                </tr>
                {editingTeacherId === t.id && (
                  <tr className="expand-row">
                    <td colSpan={5}>
                      <label className="form-label" style={{ marginBottom: "0.3rem", display: "block" }}>Unavailable periods</label>
                      <AvailabilityGrid
                        selectedCells={editUnavailableCells}
                        onToggle={(d, r) => toggleCell(setEditUnavailableCells, d, r)}
                        onToggleRow={(r) => toggleRow(setEditUnavailableCells, r)}
                        onToggleColumn={(d) => toggleColumn(setEditUnavailableCells, d)}
                        rowLabels={rowLabels}
                        disabledRows={disabledRows}
                      />
                      <span className="form-hint">Edit unavailable slots, then press Save above.</span>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="empty-state">
          <p><strong>No teachers yet</strong></p>
          <p>Add your first teacher above to get started.</p>
        </div>
      )}
    </div>
  );
}

/* ── Availability Grid component ───────────────────────── */

interface AvailabilityGridProps {
  selectedCells: Set<string>;
  onToggle: (day: number, row: number) => void;
  onToggleRow: (row: number) => void;
  onToggleColumn: (day: number) => void;
  rowLabels: string[];
  disabledRows: boolean[];
}

function AvailabilityGrid({
  selectedCells,
  onToggle,
  onToggleRow,
  onToggleColumn,
  rowLabels,
  disabledRows,
}: AvailabilityGridProps) {
  return (
    <table className="avail-table">
      <thead>
        <tr>
          <th>Period</th>
          {DAY_NAMES.map((dayName, day) => (
            <th key={dayName}>
              <button type="button" onClick={() => onToggleColumn(day)} className="avail-axis-btn">
                {dayName}
              </button>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: GRID_ROWS }, (_, row) => (
          <tr key={row}>
            <td className="avail-label">
              <button
                type="button"
                onClick={() => onToggleRow(row)}
                disabled={disabledRows[row]}
                className="avail-axis-btn"
              >
                {rowLabels[row]}
              </button>
            </td>
            {DAY_NAMES.map((_, day) => {
              const isDisabled = disabledRows[row];
              const selected = selectedCells.has(cellKey(day, row));
              const className = `avail-cell${isDisabled ? "" : selected ? " unavailable" : " available"}`;
              return (
                <td key={day} style={{ textAlign: "center" }}>
                  <button
                    type="button"
                    aria-label={`Toggle ${rowLabels[row]} ${DAY_NAMES[day]} availability`}
                    onClick={() => onToggle(day, row)}
                    disabled={isDisabled}
                    className={className}
                  />
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/* ── Helpers ────────────────────────────────────────────── */

function cellKey(day: number, row: number): string {
  return `${day}-${row}`;
}

function isLaesebaandSlot(label: string | null, periodType: string | undefined): boolean {
  const rawLabel = (label ?? "").toLowerCase();
  const asciiLike = rawLabel.replace(/æ/g, "ae");
  return (
    (periodType ?? "").toLowerCase() === "reading"
    || rawLabel.includes("læseb")
    || asciiLike.includes("laeseb")
  );
}

function toggleRowCells(current: Set<string>, row: number): Set<string> {
  const next = new Set(current);
  const rowKeys = DAY_NAMES.map((_, day) => cellKey(day, row));
  const allSelected = rowKeys.every((key) => next.has(key));
  rowKeys.forEach((key) => (allSelected ? next.delete(key) : next.add(key)));
  return next;
}

function toggleColumnCells(current: Set<string>, day: number, disabledRows: boolean[]): Set<string> {
  const next = new Set(current);
  const colKeys = Array.from({ length: GRID_ROWS }, (_, row) => row)
    .filter((row) => !disabledRows[row])
    .map((row) => cellKey(day, row));
  const allSelected = colKeys.length > 0 && colKeys.every((key) => next.has(key));
  colKeys.forEach((key) => (allSelected ? next.delete(key) : next.add(key)));
  return next;
}

function buildAvailabilityPayload(unavailableCells: Set<string>, timeslotIdsByRow: Array<string | null>) {
  const payload: { day_of_week: number; timeslot_id: string; is_available: boolean; preference: number }[] = [];
  unavailableCells.forEach((key) => {
    const [dayStr, rowStr] = key.split("-");
    const day = Number(dayStr);
    const row = Number(rowStr);
    const timeslotId = timeslotIdsByRow[row];
    if (Number.isNaN(day) || Number.isNaN(row) || !timeslotId) return;
    payload.push({ day_of_week: day, timeslot_id: timeslotId, is_available: false, preference: 0 });
  });
  return payload;
}

function buildUnavailableCellSet(
  availability: TeacherAvailability[],
  timeslotIdsByRow: Array<string | null>,
): Set<string> {
  const timeslotToRow = new Map<string, number>();
  timeslotIdsByRow.forEach((timeslotId, row) => {
    if (timeslotId) timeslotToRow.set(timeslotId, row);
  });
  const cells = new Set<string>();
  availability.forEach((item) => {
    if (item.is_available) return;
    const row = timeslotToRow.get(item.timeslot_id);
    if (row === undefined || item.day_of_week < 0 || item.day_of_week > 4) return;
    cells.add(cellKey(item.day_of_week, row));
  });
  return cells;
}

function countUnavailableCells(availability: TeacherAvailability[], timeslotIdsByRow: Array<string | null>): number {
  return buildUnavailableCellSet(availability, timeslotIdsByRow).size;
}

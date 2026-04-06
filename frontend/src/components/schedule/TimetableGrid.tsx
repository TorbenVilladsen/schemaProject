import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import type { DragEvent } from "react";
import type { ScheduleEntry, Teacher, Subject, Room, Timeslot, SchoolClass } from "../../types";
import { formatTime } from "../../styles/shared";

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

const COLORS = [
  "#dbeafe", "#fce7f3", "#d1fae5", "#fef3c7", "#e0e7ff",
  "#fde68a", "#c7d2fe", "#bbf7d0", "#fbcfe8", "#bfdbfe",
];

interface RejectionInfo {
  cellKey: string;
  message: string;
}

interface Props {
  entries: ScheduleEntry[];
  teachers: Teacher[];
  subjects: Subject[];
  rooms: Room[];
  timeslots: Timeslot[];
  classes?: SchoolClass[];
  viewMode?: "teachers" | "classes";
  onEntryMove?: (entryId: string, day: number, timeslotId: string) => Promise<string | null>;
}

export default function TimetableGrid({ entries, teachers, subjects, rooms, timeslots, classes, viewMode = "teachers", onEntryMove }: Props) {
  const teacherMap = Object.fromEntries(teachers.map((t) => [t.id, t]));
  const subjectMap = Object.fromEntries(subjects.map((s) => [s.id, s]));
  const roomMap = Object.fromEntries(rooms.map((r) => [r.id, r]));
  const classMap = Object.fromEntries((classes ?? []).map((c) => [c.id, c]));
  const subjectColors = Object.fromEntries(subjects.map((s, i) => [s.id, COLORS[i % COLORS.length]]));

  const sortedSlots = [...timeslots].sort((a, b) => a.slot_index - b.slot_index);

  const [dragOverCell, setDragOverCell] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [rejection, setRejection] = useState<RejectionInfo | null>(null);
  const rejectionTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const entryMap = useMemo(() => {
    const map = new Map<string, ScheduleEntry[]>();
    for (const e of entries) {
      const key = `${e.day_of_week}-${e.timeslot_id}`;
      const list = map.get(key);
      if (list) list.push(e);
      else map.set(key, [e]);
    }
    return map;
  }, [entries]);

  const getEntry = (day: number, slotId: string) =>
    entryMap.get(`${day}-${slotId}`) ?? [];

  const handleDragStart = useCallback((e: DragEvent, entry: ScheduleEntry) => {
    e.dataTransfer.setData("text/plain", entry.id);
    e.dataTransfer.effectAllowed = "move";
    setDraggingId(entry.id);
    setRejection(null);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggingId(null);
    setDragOverCell(null);
  }, []);

  const handleDragOver = useCallback((e: DragEvent, cellKey: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverCell(cellKey);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverCell(null);
  }, []);

  const handleDrop = useCallback(async (e: DragEvent, day: number, timeslotId: string) => {
    e.preventDefault();
    setDragOverCell(null);
    const entryId = e.dataTransfer.getData("text/plain");
    setDraggingId(null);
    if (!entryId || !onEntryMove) return;

    const cellKey = `${day}-${timeslotId}`;
    const errorMessage = await onEntryMove(entryId, day, timeslotId);
    if (errorMessage) {
      setRejection({ cellKey, message: errorMessage });
      clearTimeout(rejectionTimer.current);
      rejectionTimer.current = setTimeout(() => setRejection(null), 2000);
    }
  }, [onEntryMove]);

  useEffect(() => {
    return () => clearTimeout(rejectionTimer.current);
  }, []);

  if (entries.length === 0) {
    return (
      <div className="empty-state">
        <p><strong>No entries in this schedule</strong></p>
        <p>Generate the schedule first to see timetable entries.</p>
      </div>
    );
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={{ ...headerStyle, width: 120 }}>Period</th>
            {DAY_NAMES.map((day) => (
              <th key={day} style={headerStyle}>{day}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedSlots.map((slot) => (
            <tr key={slot.id}>
              <td style={periodStyle}>
                <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>{slot.label || `Period ${slot.slot_index + 1}`}</div>
                <div style={{ color: "var(--color-text-muted)", fontSize: "0.75rem" }}>{formatTime(slot.start_time)} - {formatTime(slot.end_time)}</div>
              </td>
              {[0, 1, 2, 3, 4].map((day) => {
                const cellKey = `${day}-${slot.id}`;
                const cellEntries = getEntry(day, slot.id);
                const isOver = dragOverCell === cellKey;
                const isOccupied = isOver && cellEntries.length > 0 && !cellEntries.some((e) => e.id === draggingId);
                const isRejected = rejection?.cellKey === cellKey;
                return (
                  <td
                    key={day}
                    style={{
                      ...cellStyle,
                      ...(isOver && !isOccupied ? dropTargetStyle : {}),
                      ...(isOver && isOccupied ? dropBlockedStyle : {}),
                    }}
                    onDragOver={(e) => handleDragOver(e, cellKey)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, day, slot.id)}
                  >
                    {cellEntries.map((entry) => {
                      const subject = subjectMap[entry.subject_id];
                      const teacher = teacherMap[entry.teacher_id];
                      const room = entry.room_id ? roomMap[entry.room_id] : undefined;
                      const cls = entry.class_id
                        ? classMap[entry.class_id]
                        : (classes ?? []).find((c) => c.grade_level === subject?.grade_level);
                      const isDragging = draggingId === entry.id;
                      return (
                        <div
                          key={entry.id}
                          draggable={!!onEntryMove}
                          onDragStart={(e) => handleDragStart(e, entry)}
                          onDragEnd={handleDragEnd}
                          className={isRejected ? "dnd-wiggle" : undefined}
                          style={{
                            ...cardStyle,
                            backgroundColor: subjectColors[entry.subject_id] || "#f3f4f6",
                            ...(onEntryMove ? draggableStyle : {}),
                            ...(isDragging ? draggingStyle : {}),
                          }}
                        >
                          <div style={{ fontWeight: 600, fontSize: "0.8rem" }}>{subject?.name || "?"}</div>
                          {viewMode === "teachers" ? (
                            <div style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>{cls?.name || "?"}</div>
                          ) : (
                            <div style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>{teacher?.name || "?"}</div>
                          )}
                          <div style={{ fontSize: "0.7rem", color: "var(--color-text-muted)" }}>{room?.name || "?"}</div>
                        </div>
                      );
                    })}
                    {isRejected && (
                      <div className="dnd-rejection-toast">
                        {rejection.message}
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "separate",
  borderSpacing: 0,
  tableLayout: "fixed",
  background: "var(--color-surface)",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-lg)",
  overflow: "hidden",
  boxShadow: "var(--shadow-sm)",
};

const headerStyle: React.CSSProperties = {
  padding: "0.65rem 0.5rem",
  borderBottom: "1px solid var(--color-border)",
  textAlign: "center",
  background: "var(--color-bg)",
  fontSize: "0.8rem",
  fontWeight: 600,
  color: "var(--color-text-secondary)",
};

const periodStyle: React.CSSProperties = {
  padding: "0.5rem 0.65rem",
  borderBottom: "1px solid var(--color-border)",
  verticalAlign: "top",
};

const cellStyle: React.CSSProperties = {
  padding: "0.25rem",
  borderBottom: "1px solid var(--color-border)",
  borderLeft: "1px solid var(--color-border)",
  verticalAlign: "top",
  minHeight: 60,
  transition: "background 150ms ease",
  position: "relative",
};

const dropTargetStyle: React.CSSProperties = {
  background: "var(--color-primary-light)",
  outline: "2px dashed var(--color-primary)",
  outlineOffset: "-2px",
};

const dropBlockedStyle: React.CSSProperties = {
  background: "var(--color-danger-light)",
  outline: "2px dashed var(--color-danger)",
  outlineOffset: "-2px",
};

const cardStyle: React.CSSProperties = {
  padding: "0.35rem 0.5rem",
  borderRadius: "var(--radius-sm)",
  marginBottom: 2,
};

const draggableStyle: React.CSSProperties = {
  cursor: "grab",
  userSelect: "none",
};

const draggingStyle: React.CSSProperties = {
  opacity: 0.4,
};

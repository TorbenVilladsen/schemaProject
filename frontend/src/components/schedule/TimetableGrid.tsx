import type { ScheduleEntry, Teacher, Subject, Room, Timeslot } from "../../types";

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

// Color palette for subjects
const COLORS = [
  "#dbeafe", "#fce7f3", "#d1fae5", "#fef3c7", "#e0e7ff",
  "#fde68a", "#c7d2fe", "#bbf7d0", "#fbcfe8", "#bfdbfe",
];

interface Props {
  entries: ScheduleEntry[];
  teachers: Teacher[];
  subjects: Subject[];
  rooms: Room[];
  timeslots: Timeslot[];
  filterTeacherId?: string;
}

export default function TimetableGrid({ entries, teachers, subjects, rooms, timeslots, filterTeacherId }: Props) {
  const teacherMap = Object.fromEntries(teachers.map((t) => [t.id, t]));
  const subjectMap = Object.fromEntries(subjects.map((s) => [s.id, s]));
  const roomMap = Object.fromEntries(rooms.map((r) => [r.id, r]));
  const subjectColors = Object.fromEntries(subjects.map((s, i) => [s.id, COLORS[i % COLORS.length]]));

  const sortedSlots = [...timeslots].sort((a, b) => a.slot_index - b.slot_index);

  const filtered = filterTeacherId
    ? entries.filter((e) => e.teacher_id === filterTeacherId)
    : entries;

  const getEntry = (day: number, slotId: string) =>
    filtered.filter((e) => e.day_of_week === day && e.timeslot_id === slotId);

  return (
    <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
      <thead>
        <tr>
          <th style={{ ...headerStyle, width: 100 }}>Period</th>
          {DAY_NAMES.map((day) => (
            <th key={day} style={headerStyle}>{day}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {sortedSlots.map((slot) => (
          <tr key={slot.id}>
            <td style={periodStyle}>
              {slot.label || `Period ${slot.slot_index + 1}`}
              <br />
              <small style={{ color: "#888" }}>{slot.start_time} - {slot.end_time}</small>
            </td>
            {[0, 1, 2, 3, 4].map((day) => {
              const cellEntries = getEntry(day, slot.id);
              return (
                <td key={day} style={cellStyle}>
                  {cellEntries.map((entry) => {
                    const subject = subjectMap[entry.subject_id];
                    const teacher = teacherMap[entry.teacher_id];
                    const room = roomMap[entry.room_id];
                    return (
                      <div
                        key={entry.id}
                        style={{
                          ...cardStyle,
                          backgroundColor: subjectColors[entry.subject_id] || "#f3f4f6",
                        }}
                      >
                        <strong>{subject?.name || "?"} (G{subject?.grade_level})</strong>
                        <br />
                        <small>{teacher?.name || "?"}</small>
                        <br />
                        <small style={{ color: "#666" }}>{room?.name || "?"}</small>
                      </div>
                    );
                  })}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const headerStyle: React.CSSProperties = {
  padding: "0.5rem",
  borderBottom: "2px solid #e0e0e0",
  textAlign: "center",
  background: "#f9fafb",
};

const periodStyle: React.CSSProperties = {
  padding: "0.5rem",
  borderBottom: "1px solid #eee",
  fontWeight: 500,
  verticalAlign: "top",
};

const cellStyle: React.CSSProperties = {
  padding: "0.25rem",
  borderBottom: "1px solid #eee",
  borderLeft: "1px solid #eee",
  verticalAlign: "top",
  minHeight: 60,
};

const cardStyle: React.CSSProperties = {
  padding: "0.3rem 0.5rem",
  borderRadius: 4,
  marginBottom: 2,
  fontSize: "0.85rem",
};

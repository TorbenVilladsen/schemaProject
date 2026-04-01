import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getSchedule, getTeachers, getSubjects, getRooms, getTimeslots } from "../api/client";
import TimetableGrid from "../components/schedule/TimetableGrid";

export default function ScheduleView() {
  const { id } = useParams<{ id: string }>();
  const [filterTeacher, setFilterTeacher] = useState("");

  const { data: schedule, isLoading: loadingSched } = useQuery({
    queryKey: ["schedule", id],
    queryFn: () => getSchedule(id!),
    enabled: !!id,
  });
  const { data: teachers } = useQuery({ queryKey: ["teachers"], queryFn: getTeachers });
  const { data: subjects } = useQuery({ queryKey: ["subjects"], queryFn: getSubjects });
  const { data: rooms } = useQuery({ queryKey: ["rooms"], queryFn: getRooms });
  const { data: timeslots } = useQuery({ queryKey: ["timeslots"], queryFn: getTimeslots });

  if (loadingSched) return <p>Loading schedule...</p>;
  if (!schedule) return <p>Schedule not found.</p>;

  return (
    <div>
      <h1>{schedule.name || "Untitled Schedule"}</h1>
      <p>
        Status: <strong>{schedule.solver_status || schedule.status}</strong>
        {schedule.solver_stats && (
          <span> | {schedule.entries.length} entries | {(schedule.solver_stats.wall_time as number)?.toFixed(1)}s</span>
        )}
      </p>

      {teachers && teachers.length > 0 && (
        <div style={{ marginBottom: "1rem" }}>
          <label>Filter by teacher: </label>
          <select value={filterTeacher} onChange={(e) => setFilterTeacher(e.target.value)}>
            <option value="">All teachers</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
      )}

      {teachers && subjects && rooms && timeslots && (
        <TimetableGrid
          entries={schedule.entries}
          teachers={teachers}
          subjects={subjects}
          rooms={rooms}
          timeslots={timeslots}
          filterTeacherId={filterTeacher || undefined}
        />
      )}
    </div>
  );
}

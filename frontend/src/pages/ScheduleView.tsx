import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getSchedule, getTeachers, getSubjects, getRooms, getTimeslots, getClasses } from "../api/client";
import TimetableGrid from "../components/schedule/TimetableGrid";

export default function ScheduleView() {
  const { id } = useParams<{ id: string }>();
  const [filterTeacher, setFilterTeacher] = useState("");
  const [filterClass, setFilterClass] = useState("");

  const { data: schedule, isLoading: loadingSched } = useQuery({
    queryKey: ["schedule", id],
    queryFn: () => getSchedule(id!),
    enabled: !!id,
  });
  const { data: teachers } = useQuery({ queryKey: ["teachers"], queryFn: getTeachers });
  const { data: subjects } = useQuery({ queryKey: ["subjects"], queryFn: getSubjects });
  const { data: rooms } = useQuery({ queryKey: ["rooms"], queryFn: getRooms });
  const { data: timeslots } = useQuery({ queryKey: ["timeslots"], queryFn: getTimeslots });
  const { data: classes } = useQuery({ queryKey: ["classes"], queryFn: getClasses });
  const scheduleEntries = schedule?.entries ?? [];

  const subjectById = useMemo(
    () => Object.fromEntries((subjects ?? []).map((s) => [s.id, s])),
    [subjects],
  );
  const classById = useMemo(
    () => Object.fromEntries((classes ?? []).map((c) => [c.id, c])),
    [classes],
  );

  const teacherIdsInSchedule = useMemo(
    () => new Set(scheduleEntries.map((e) => e.teacher_id)),
    [scheduleEntries],
  );
  const availableTeachers = useMemo(
    () => (teachers ?? []).filter((t) => teacherIdsInSchedule.has(t.id)),
    [teachers, teacherIdsInSchedule],
  );

  const classIdsInSchedule = useMemo(
    () => new Set(scheduleEntries.map((e) => e.class_id).filter(Boolean) as string[]),
    [scheduleEntries],
  );
  const gradeLevelsInScheduleWithoutClass = useMemo(
    () =>
      new Set(
        scheduleEntries
          .filter((e) => !e.class_id)
          .map((e) => subjectById[e.subject_id]?.grade_level)
          .filter((g): g is number => typeof g === "number"),
      ),
    [scheduleEntries, subjectById],
  );
  const availableClasses = useMemo(
    () =>
      (classes ?? []).filter(
        (c) => classIdsInSchedule.has(c.id) || gradeLevelsInScheduleWithoutClass.has(c.grade_level),
      ),
    [classes, classIdsInSchedule, gradeLevelsInScheduleWithoutClass],
  );

  const classFilteredEntries = useMemo(() => {
    if (!filterClass) return scheduleEntries;
    const selectedClass = classById[filterClass];
    if (!selectedClass) return scheduleEntries;
    return scheduleEntries.filter((e) => {
      if (e.class_id === selectedClass.id) return true;
      if (e.class_id) return false;
      const subject = subjectById[e.subject_id];
      return subject?.grade_level === selectedClass.grade_level;
    });
  }, [scheduleEntries, filterClass, classById, subjectById]);

  const filteredEntries = useMemo(
    () =>
      filterTeacher
        ? classFilteredEntries.filter((e) => e.teacher_id === filterTeacher)
        : classFilteredEntries,
    [classFilteredEntries, filterTeacher],
  );

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

      <div style={{ marginBottom: "1rem", display: "flex", gap: "1rem" }}>
        {availableTeachers.length > 0 && (
          <div>
            <label>Filter by teacher: </label>
            <select value={filterTeacher} onChange={(e) => setFilterTeacher(e.target.value)}>
              <option value="">All teachers</option>
              {availableTeachers.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
        )}
        {availableClasses.length > 0 && (
          <div>
            <label>Filter by class: </label>
            <select value={filterClass} onChange={(e) => setFilterClass(e.target.value)}>
              <option value="">All classes</option>
              {availableClasses.map((c) => (
                <option key={c.id} value={c.id}>{c.name} (Grade {c.grade_level})</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {teachers && subjects && rooms && timeslots && (
        <TimetableGrid
          entries={filteredEntries}
          teachers={teachers}
          subjects={subjects}
          rooms={rooms}
          timeslots={timeslots}
        />
      )}
    </div>
  );
}

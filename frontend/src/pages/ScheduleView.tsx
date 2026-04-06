import { useMemo, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { getSchedule, getTeachers, getSubjects, getRooms, getTimeslots, getClasses, moveScheduleEntry } from "../api/client";
import TimetableGrid from "../components/schedule/TimetableGrid";
import type { ScheduleEntry, Teacher, SchoolClass } from "../types";

type ViewMode = "teachers" | "classes";

export default function ScheduleView() {
  const { id } = useParams<{ id: string }>();
  const [viewMode, setViewMode] = useState<ViewMode>("teachers");
  const [selectedTeacher, setSelectedTeacher] = useState("");
  const [selectedClass, setSelectedClass] = useState("");

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
  const queryClient = useQueryClient();
  const moveMutation = useMutation({
    mutationFn: (args: { entryId: string; day_of_week: number; timeslot_id: string }) =>
      moveScheduleEntry(id!, args.entryId, { day_of_week: args.day_of_week, timeslot_id: args.timeslot_id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedule", id] });
    },
  });

  const handleEntryMove = useCallback(
    async (entryId: string, day: number, timeslotId: string): Promise<string | null> => {
      try {
        await moveMutation.mutateAsync({ entryId, day_of_week: day, timeslot_id: timeslotId });
        return null;
      } catch (error: unknown) {
        if (axios.isAxiosError(error)) {
          const detail = error.response?.data?.detail;
          if (typeof detail === "string" && detail.trim()) {
            return detail;
          }
        }
        return "Move rejected by server constraints";
      }
    },
    [moveMutation],
  );

  const scheduleEntries = schedule?.entries ?? [];

  const subjectById = useMemo(
    () => Object.fromEntries((subjects ?? []).map((s) => [s.id, s])),
    [subjects],
  );
  const teacherIdsInSchedule = useMemo(
    () => [...new Set(scheduleEntries.map((e) => e.teacher_id))],
    [scheduleEntries],
  );
  const availableTeachers = useMemo(
    () => {
      const idSet = new Set(teacherIdsInSchedule);
      return (teachers ?? []).filter((t) => idSet.has(t.id));
    },
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

  // Group entries by teacher
  const entriesByTeacher = useMemo(() => {
    const map = new Map<string, ScheduleEntry[]>();
    for (const e of scheduleEntries) {
      const list = map.get(e.teacher_id);
      if (list) list.push(e);
      else map.set(e.teacher_id, [e]);
    }
    return map;
  }, [scheduleEntries]);

  // Group entries by class
  const entriesByClass = useMemo(() => {
    const map = new Map<string, ScheduleEntry[]>();
    for (const e of scheduleEntries) {
      // Determine class: either directly assigned or inferred from subject grade_level
      let classId = e.class_id;
      if (!classId) {
        const subject = subjectById[e.subject_id];
        if (subject) {
          const matchingClass = availableClasses.find((c) => c.grade_level === subject.grade_level);
          if (matchingClass) classId = matchingClass.id;
        }
      }
      if (classId) {
        const list = map.get(classId);
        if (list) list.push(e);
        else map.set(classId, [e]);
      }
    }
    return map;
  }, [scheduleEntries, subjectById, availableClasses]);

  // Determine which grids to show
  const teacherGrids: { teacher: Teacher; entries: ScheduleEntry[] }[] = useMemo(() => {
    if (selectedTeacher) {
      const t = availableTeachers.find((t) => t.id === selectedTeacher);
      if (!t) return [];
      return [{ teacher: t, entries: entriesByTeacher.get(t.id) ?? [] }];
    }
    return availableTeachers.map((t) => ({
      teacher: t,
      entries: entriesByTeacher.get(t.id) ?? [],
    }));
  }, [availableTeachers, entriesByTeacher, selectedTeacher]);

  const classGrids: { schoolClass: SchoolClass; entries: ScheduleEntry[] }[] = useMemo(() => {
    if (selectedClass) {
      const c = availableClasses.find((c) => c.id === selectedClass);
      if (!c) return [];
      return [{ schoolClass: c, entries: entriesByClass.get(c.id) ?? [] }];
    }
    return availableClasses.map((c) => ({
      schoolClass: c,
      entries: entriesByClass.get(c.id) ?? [],
    }));
  }, [availableClasses, entriesByClass, selectedClass]);

  if (loadingSched) return <p className="loading-text">Loading schedule...</p>;
  if (!schedule) return <p>Schedule not found.</p>;

  const statusLabel = schedule.solver_status || schedule.status;
  const statusClass =
    statusLabel === "optimal" || statusLabel === "feasible" ? "badge-success" :
    statusLabel === "infeasible" ? "badge-danger" : "badge-neutral";

  return (
    <div>
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <h1>{schedule.name || "Untitled Schedule"}</h1>
          <span className={`badge ${statusClass}`}>{statusLabel}</span>
        </div>
        <p>
          {schedule.entries.length} entries
          {schedule.solver_stats && <> &middot; solved in {(schedule.solver_stats.wall_time as number)?.toFixed(1)}s</>}
          &nbsp;&middot;&nbsp;<Link to="/schedules">&larr; All schedules</Link>
        </p>
      </div>

      {/* View mode tabs + filter */}
      <div className="filter-bar">
        <div className="view-tabs">
          <button
            className={`view-tab ${viewMode === "teachers" ? "view-tab-active" : ""}`}
            onClick={() => { setViewMode("teachers"); setSelectedClass(""); }}
          >
            By Teacher
          </button>
          <button
            className={`view-tab ${viewMode === "classes" ? "view-tab-active" : ""}`}
            onClick={() => { setViewMode("classes"); setSelectedTeacher(""); }}
          >
            By Class
          </button>
        </div>

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "0.4rem" }}>
          {viewMode === "teachers" && availableTeachers.length > 0 && (
            <>
              <label>Teacher:</label>
              <select
                className="form-select"
                value={selectedTeacher}
                onChange={(e) => setSelectedTeacher(e.target.value)}
                style={{ width: "auto" }}
              >
                <option value="">All teachers ({availableTeachers.length})</option>
                {availableTeachers.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </>
          )}
          {viewMode === "classes" && availableClasses.length > 0 && (
            <>
              <label>Class:</label>
              <select
                className="form-select"
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                style={{ width: "auto" }}
              >
                <option value="">All classes ({availableClasses.length})</option>
                {availableClasses.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} (Grade {c.grade_level})</option>
                ))}
              </select>
            </>
          )}
        </div>
      </div>

      {/* Timetable grids */}
      {teachers && subjects && rooms && timeslots && (
        <div>
          {viewMode === "teachers" && (
            scheduleEntries.length === 0 ? (
              <div className="empty-state">
                <p><strong>No entries in this schedule</strong></p>
                <p>Generate the schedule first to see timetable entries.</p>
              </div>
            ) : teacherGrids.length === 0 ? (
              <div className="empty-state">
                <p>No matching teachers found.</p>
              </div>
            ) : (
              teacherGrids.map(({ teacher, entries }) => (
                <div key={teacher.id} className="schedule-section">
                  <h2 className="schedule-section-title">{teacher.name}</h2>
                  <TimetableGrid
                    entries={entries}
                    teachers={teachers}
                    subjects={subjects}
                    rooms={rooms}
                    timeslots={timeslots}
                    classes={classes}
                    viewMode="teachers"
                    onEntryMove={handleEntryMove}
                  />
                </div>
              ))
            )
          )}

          {viewMode === "classes" && (
            scheduleEntries.length === 0 ? (
              <div className="empty-state">
                <p><strong>No entries in this schedule</strong></p>
                <p>Generate the schedule first to see timetable entries.</p>
              </div>
            ) : classGrids.length === 0 ? (
              <div className="empty-state">
                <p>No matching classes found.</p>
              </div>
            ) : (
              classGrids.map(({ schoolClass, entries }) => (
                <div key={schoolClass.id} className="schedule-section">
                  <h2 className="schedule-section-title">
                    {schoolClass.name}
                    <span className="schedule-section-subtitle">Grade {schoolClass.grade_level}</span>
                  </h2>
                  <TimetableGrid
                    entries={entries}
                    teachers={teachers}
                    subjects={subjects}
                    rooms={rooms}
                    timeslots={timeslots}
                    classes={classes}
                    viewMode="classes"
                    onEntryMove={handleEntryMove}
                  />
                </div>
              ))
            )
          )}
        </div>
      )}
    </div>
  );
}

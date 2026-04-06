import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getTeachers, getSubjects, getRooms, getTimeslots, getClasses, getSchedules } from "../api/client";

export default function Dashboard() {
  const { data: teachers } = useQuery({ queryKey: ["teachers"], queryFn: getTeachers });
  const { data: subjects } = useQuery({ queryKey: ["subjects"], queryFn: getSubjects });
  const { data: rooms } = useQuery({ queryKey: ["rooms"], queryFn: getRooms });
  const { data: timeslots } = useQuery({ queryKey: ["timeslots"], queryFn: getTimeslots });
  const { data: classes } = useQuery({ queryKey: ["classes"], queryFn: getClasses });
  const { data: schedules } = useQuery({ queryKey: ["schedules"], queryFn: getSchedules });

  const stats = [
    { label: "Classes", value: classes?.length ?? 0, to: "/classes" },
    { label: "Teachers", value: teachers?.length ?? 0, to: "/teachers" },
    { label: "Subjects", value: subjects?.length ?? 0, to: "/subjects" },
    { label: "Rooms", value: rooms?.length ?? 0, to: "/rooms" },
    { label: "Timeslots", value: timeslots?.length ?? 0, to: "/timeslots" },
    { label: "Schedules", value: schedules?.length ?? 0, to: "/schedules" },
  ];

  const totalHours = subjects?.reduce((sum, s) => sum + s.hours_per_week, 0) ?? 0;
  const hasData = (teachers?.length ?? 0) > 0 || (subjects?.length ?? 0) > 0;

  return (
    <div>
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Overview of your school scheduling data.</p>
      </div>

      <div className="stats-grid">
        {stats.map((s) => (
          <Link key={s.label} to={s.to} className="stat-card">
            <div className="stat-card-label">{s.label}</div>
            <div className="stat-card-value">{s.value}</div>
            <div className="stat-card-link">Manage &rarr;</div>
          </Link>
        ))}
      </div>

      {hasData && totalHours > 0 && (
        <div className="stat-card" style={{ maxWidth: 400 }}>
          <div className="stat-card-label">Total weekly teaching hours</div>
          <div className="stat-card-value">{totalHours}</div>
          <div style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", marginTop: "0.25rem" }}>
            Across {subjects?.length ?? 0} subjects
          </div>
        </div>
      )}

      {!hasData && (
        <div className="empty-state" style={{ marginTop: "1rem" }}>
          <div className="empty-state-icon">&#128218;</div>
          <p><strong>Get started</strong></p>
          <p>Begin by adding classes, teachers, and subjects, or <Link to="/setup">import a setup file</Link>.</p>
        </div>
      )}
    </div>
  );
}

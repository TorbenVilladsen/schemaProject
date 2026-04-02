import { NavLink } from "react-router-dom";

const links = [
  { to: "/", label: "Dashboard" },
  { to: "/classes", label: "Classes" },
  { to: "/teachers", label: "Teachers" },
  { to: "/subjects", label: "Subjects" },
  { to: "/rooms", label: "Rooms" },
  { to: "/timeslots", label: "Timeslots" },
  { to: "/schedules", label: "Schedules" },
  { to: "/setup", label: "Setup" },
];

export default function Sidebar() {
  return (
    <nav style={{ width: 220, borderRight: "1px solid #e0e0e0", padding: "1rem", height: "100vh" }}>
      <h2 style={{ fontSize: "1.2rem", marginBottom: "1.5rem" }}>Scheduler</h2>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {links.map((link) => (
          <li key={link.to} style={{ marginBottom: "0.5rem" }}>
            <NavLink
              to={link.to}
              style={({ isActive }) => ({
                textDecoration: "none",
                color: isActive ? "#2563eb" : "#333",
                fontWeight: isActive ? 600 : 400,
              })}
            >
              {link.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

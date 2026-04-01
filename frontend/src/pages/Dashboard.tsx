import { Link } from "react-router-dom";

export default function Dashboard() {
  return (
    <div>
      <h1>Dashboard</h1>
      <p>Welcome to the Teacher Scheduling System.</p>
      <div style={{ display: "flex", gap: "1rem", marginTop: "1.5rem" }}>
        <Link to="/teachers" style={cardStyle}>Manage Teachers</Link>
        <Link to="/subjects" style={cardStyle}>Manage Subjects</Link>
        <Link to="/rooms" style={cardStyle}>Manage Rooms</Link>
        <Link to="/schedules" style={cardStyle}>Generate Schedules</Link>
      </div>
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  padding: "1.5rem",
  border: "1px solid #e0e0e0",
  borderRadius: 8,
  textDecoration: "none",
  color: "#333",
  background: "#f9fafb",
  fontWeight: 500,
};

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getTimeslots, createTimeslot } from "../api/client";

export default function Timeslots() {
  const queryClient = useQueryClient();
  const { data: timeslots, isLoading } = useQuery({ queryKey: ["timeslots"], queryFn: getTimeslots });

  const [slotIndex, setSlotIndex] = useState(0);
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("08:45");
  const [label, setLabel] = useState("");
  const [periodType, setPeriodType] = useState("module");

  const createMut = useMutation({
    mutationFn: createTimeslot,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timeslots"] });
      setSlotIndex((prev) => prev + 1);
      setLabel("");
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMut.mutate({
      slot_index: slotIndex,
      start_time: startTime + ":00",
      end_time: endTime + ":00",
      label: label || undefined,
      period_type: periodType,
    });
  };

  if (isLoading) return <p>Loading...</p>;

  return (
    <div>
      <h1>Timeslots</h1>
      <p style={{ color: "#666", marginBottom: "1rem" }}>
        Define the periods in a school day. These are shared across all weekdays (Mon-Fri).
      </p>

      <form onSubmit={handleCreate} style={{ marginBottom: "1.5rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        <input type="number" placeholder="Period #" value={slotIndex} onChange={(e) => setSlotIndex(+e.target.value)} min={0} style={{ ...inputStyle, width: 80 }} />
        <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required style={inputStyle} />
        <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required style={inputStyle} />
        <input placeholder="Label (e.g. 1. modul)" value={label} onChange={(e) => setLabel(e.target.value)} style={inputStyle} />
        <select value={periodType} onChange={(e) => setPeriodType(e.target.value)} style={inputStyle}>
          <option value="module">Module</option>
          <option value="reading">Reading</option>
        </select>
        <button type="submit" style={btnStyle}>Add Timeslot</button>
      </form>

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={thStyle}>Period #</th>
            <th style={thStyle}>Start</th>
            <th style={thStyle}>End</th>
            <th style={thStyle}>Label</th>
            <th style={thStyle}>Type</th>
          </tr>
        </thead>
        <tbody>
          {timeslots?.map((ts) => (
            <tr key={ts.id}>
              <td style={tdStyle}>{ts.slot_index}</td>
              <td style={tdStyle}>{ts.start_time}</td>
              <td style={tdStyle}>{ts.end_time}</td>
              <td style={tdStyle}>{ts.label || "—"}</td>
              <td style={tdStyle}>{ts.period_type}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const inputStyle: React.CSSProperties = { padding: "0.4rem 0.6rem", border: "1px solid #ccc", borderRadius: 4 };
const btnStyle: React.CSSProperties = { padding: "0.4rem 1rem", background: "#2563eb", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer" };
const thStyle: React.CSSProperties = { textAlign: "left", padding: "0.5rem", borderBottom: "2px solid #e0e0e0" };
const tdStyle: React.CSSProperties = { padding: "0.5rem", borderBottom: "1px solid #eee" };

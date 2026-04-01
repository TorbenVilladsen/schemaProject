import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getRooms, createRoom, deleteRoom } from "../api/client";

export default function Rooms() {
  const queryClient = useQueryClient();
  const { data: rooms, isLoading } = useQuery({ queryKey: ["rooms"], queryFn: getRooms });

  const [name, setName] = useState("");
  const [capacity, setCapacity] = useState(30);
  const [roomType, setRoomType] = useState("classroom");

  const createMut = useMutation({
    mutationFn: createRoom,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      setName("");
    },
  });

  const deleteMut = useMutation({
    mutationFn: deleteRoom,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["rooms"] }),
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMut.mutate({ name, capacity, room_type: roomType });
  };

  if (isLoading) return <p>Loading...</p>;

  return (
    <div>
      <h1>Rooms</h1>
      <form onSubmit={handleCreate} style={{ marginBottom: "1.5rem", display: "flex", gap: "0.5rem" }}>
        <input placeholder="Room name" value={name} onChange={(e) => setName(e.target.value)} required style={inputStyle} />
        <input type="number" placeholder="Capacity" value={capacity} onChange={(e) => setCapacity(+e.target.value)} style={{ ...inputStyle, width: 80 }} />
        <select value={roomType} onChange={(e) => setRoomType(e.target.value)} style={inputStyle}>
          <option value="classroom">Classroom</option>
          <option value="gym">Gym</option>
          <option value="lab">Lab</option>
          <option value="music">Music</option>
        </select>
        <button type="submit" style={btnStyle}>Add Room</button>
      </form>

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={thStyle}>Name</th>
            <th style={thStyle}>Capacity</th>
            <th style={thStyle}>Type</th>
            <th style={thStyle}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rooms?.map((r) => (
            <tr key={r.id}>
              <td style={tdStyle}>{r.name}</td>
              <td style={tdStyle}>{r.capacity}</td>
              <td style={tdStyle}>{r.room_type}</td>
              <td style={tdStyle}>
                <button onClick={() => deleteMut.mutate(r.id)} style={{ ...btnStyle, background: "#ef4444" }}>Delete</button>
              </td>
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

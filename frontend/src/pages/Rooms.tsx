import { Fragment, useCallback, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getRooms, createRoom, updateRoom, deleteRoom, getTimeslots } from "../api/client";
import type { RoomAvailability } from "../types";
import { formatTime } from "../styles/shared";
import RoomLayoutGrid from "../components/rooms/RoomLayoutGrid";

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const GRID_ROWS = 7;

export default function Rooms() {
  const queryClient = useQueryClient();
  const { data: rooms, isLoading } = useQuery({ queryKey: ["rooms"], queryFn: getRooms });
  const { data: timeslots } = useQuery({ queryKey: ["timeslots"], queryFn: getTimeslots });

  const visibleTimeslots = useMemo(
    () =>
      [...(timeslots ?? [])]
        .sort((a, b) => a.slot_index - b.slot_index)
        .filter((ts) => !isLaesebaandSlot(ts.label, ts.period_type))
        .slice(0, GRID_ROWS),
    [timeslots],
  );

  const timeslotIdsByRow = useMemo(
    () => Array.from({ length: GRID_ROWS }, (_, row) => visibleTimeslots[row]?.id ?? null),
    [visibleTimeslots],
  );

  const rowLabels = useMemo(
    () =>
      Array.from({ length: GRID_ROWS }, (_, row) => {
        const ts = visibleTimeslots[row];
        if (!ts) return `Period ${row + 1}`;
        const baseLabel = ts.label || `Period ${ts.slot_index + 1}`;
        return `${baseLabel} (${formatTime(ts.start_time)}-${formatTime(ts.end_time)})`;
      }),
    [visibleTimeslots],
  );

  const disabledRows = useMemo(
    () => timeslotIdsByRow.map((id) => !id),
    [timeslotIdsByRow],
  );

  const [name, setName] = useState("");
  const [capacity, setCapacity] = useState(30);
  const [roomType, setRoomType] = useState("classroom");
  const [unavailableCells, setUnavailableCells] = useState<Set<string>>(new Set());

  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editCapacity, setEditCapacity] = useState(30);
  const [editRoomType, setEditRoomType] = useState("classroom");
  const [editUnavailableCells, setEditUnavailableCells] = useState<Set<string>>(new Set());

  const createMut = useMutation({
    mutationFn: createRoom,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      setName("");
      setCapacity(30);
      setRoomType("classroom");
      setUnavailableCells(new Set());
    },
  });

  const deleteMut = useMutation({
    mutationFn: deleteRoom,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["rooms"] }),
  });

  const updateMut = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: {
        name?: string;
        capacity?: number;
        room_type?: string;
        availability?: { day_of_week: number; timeslot_id: string; is_available?: boolean }[];
      };
    }) => updateRoom(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      setEditingRoomId(null);
    },
  });

  const moveRoomMut = useMutation({
    mutationFn: ({ id, grid_row, grid_col, grid_pane }: { id: string; grid_row: number | null; grid_col: number | null; grid_pane: string | null }) =>
      updateRoom(id, { grid_row, grid_col, grid_pane }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["rooms"] }),
  });

  const handleMoveRoom = useCallback(
    (roomId: string, row: number | null, col: number | null, pane: string | null) => {
      moveRoomMut.mutate({ id: roomId, grid_row: row, grid_col: col, grid_pane: pane });
    },
    [moveRoomMut],
  );

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMut.mutate({
      name,
      capacity,
      room_type: roomType,
      availability: buildAvailabilityPayload(unavailableCells, timeslotIdsByRow),
    });
  };

  const startEdit = (room: NonNullable<typeof rooms>[number]) => {
    setEditingRoomId(room.id);
    setEditName(room.name);
    setEditCapacity(room.capacity);
    setEditRoomType(room.room_type);
    setEditUnavailableCells(buildUnavailableCellSet(room.availability, timeslotIdsByRow));
  };

  const cancelEdit = () => setEditingRoomId(null);

  const saveEdit = () => {
    if (!editingRoomId || !editName.trim()) return;
    updateMut.mutate({
      id: editingRoomId,
      data: {
        name: editName,
        capacity: editCapacity,
        room_type: editRoomType,
        availability: buildAvailabilityPayload(editUnavailableCells, timeslotIdsByRow),
      },
    });
  };

  const toggleCell = (setter: React.Dispatch<React.SetStateAction<Set<string>>>, day: number, row: number) => {
    if (!timeslotIdsByRow[row]) return;
    setter((prev) => {
      const next = new Set(prev);
      const key = cellKey(day, row);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const toggleRow = (setter: React.Dispatch<React.SetStateAction<Set<string>>>, row: number) => {
    if (!timeslotIdsByRow[row]) return;
    setter((prev) => toggleRowCells(prev, row));
  };

  const toggleColumn = (setter: React.Dispatch<React.SetStateAction<Set<string>>>, day: number) => {
    setter((prev) => toggleColumnCells(prev, day, disabledRows));
  };

  if (isLoading) return <p className="loading-text">Loading rooms...</p>;

  return (
    <div>
      <div className="page-header">
        <h1>Rooms</h1>
        <p>Register the available rooms. Subjects that require a specific room type (e.g. gym, lab) will only be scheduled in matching rooms.</p>
      </div>

      <form onSubmit={handleCreate} className="form-card">
        <div className="field-row" style={{ alignItems: "flex-end" }}>
          <div className="field-group">
            <label className="form-label">Room name <span className="required">*</span></label>
            <input className="form-input" placeholder="e.g. Room 101, Gym Hall" value={name} onChange={(e) => setName(e.target.value)} required />
            <span className="form-hint">A unique name to identify this room</span>
          </div>
          <div className="field-group" style={{ maxWidth: 120 }}>
            <label className="form-label">Capacity</label>
            <input className="form-input" type="number" value={capacity} onChange={(e) => setCapacity(+e.target.value)} min={1} />
            <span className="form-hint">Max students</span>
          </div>
          <div className="field-group">
            <label className="form-label">Room type <span className="required">*</span></label>
            <select className="form-select" value={roomType} onChange={(e) => setRoomType(e.target.value)}>
              <option value="classroom">Classroom</option>
              <option value="gym">Gym</option>
              <option value="lab">Lab</option>
              <option value="music">Music</option>
            </select>
            <span className="form-hint">Determines which subjects can use this room</span>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary">Add Room</button>
          </div>
        </div>

        <div style={{ marginTop: "0.5rem" }}>
          <label className="form-label" style={{ marginBottom: "0.3rem", display: "block" }}>Unavailable periods</label>
          <AvailabilityGrid
            selectedCells={unavailableCells}
            onToggle={(d, r) => toggleCell(setUnavailableCells, d, r)}
            onToggleRow={(r) => toggleRow(setUnavailableCells, r)}
            onToggleColumn={(d) => toggleColumn(setUnavailableCells, d)}
            rowLabels={rowLabels}
            disabledRows={disabledRows}
          />
          <span className="form-hint">Click cells to mark unavailable periods (red). Click day/period headers to toggle entire rows or columns.</span>
        </div>
      </form>

      {rooms && rooms.length > 0 && (
        <div style={{ marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "0.5rem" }}>Room Layout</h2>
          <p style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)", margin: "0 0 0.75rem" }}>
            Drag rooms onto the grid to map their location in the school. Drag back to the pool to unplace.
          </p>
          <RoomLayoutGrid rooms={rooms} onMoveRoom={handleMoveRoom} />
        </div>
      )}

      {rooms && rooms.length > 0 ? (
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Capacity</th>
              <th>Type</th>
              <th>Blocked slots</th>
              <th style={{ width: 180 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rooms.map((r) => (
              <Fragment key={r.id}>
                <tr>
                  <td>
                    {editingRoomId === r.id ? (
                      <input className="form-input" value={editName} onChange={(e) => setEditName(e.target.value)} />
                    ) : r.name}
                  </td>
                  <td>
                    {editingRoomId === r.id ? (
                      <input className="form-input" type="number" value={editCapacity} onChange={(e) => setEditCapacity(+e.target.value)} min={1} style={{ maxWidth: 80 }} />
                    ) : r.capacity}
                  </td>
                  <td>
                    {editingRoomId === r.id ? (
                      <select className="form-select" value={editRoomType} onChange={(e) => setEditRoomType(e.target.value)} style={{ maxWidth: 140 }}>
                        <option value="classroom">Classroom</option>
                        <option value="gym">Gym</option>
                        <option value="lab">Lab</option>
                        <option value="music">Music</option>
                      </select>
                    ) : (
                      <span className="badge badge-neutral">{r.room_type}</span>
                    )}
                  </td>
                  <td>
                    {editingRoomId === r.id
                      ? editUnavailableCells.size
                      : countUnavailableCells(r.availability, timeslotIdsByRow)}
                  </td>
                  <td className="actions-cell">
                    {editingRoomId === r.id ? (
                      <>
                        <button type="button" onClick={saveEdit} className="btn btn-primary btn-sm">Save</button>
                        <button type="button" onClick={cancelEdit} className="btn btn-secondary btn-sm">Cancel</button>
                      </>
                    ) : (
                      <>
                        <button type="button" onClick={() => startEdit(r)} className="btn btn-secondary btn-sm">Edit</button>
                        <button type="button" onClick={() => deleteMut.mutate(r.id)} className="btn btn-danger btn-sm">Delete</button>
                      </>
                    )}
                  </td>
                </tr>
                {editingRoomId === r.id && (
                  <tr className="expand-row">
                    <td colSpan={5}>
                      <label className="form-label" style={{ marginBottom: "0.3rem", display: "block" }}>Unavailable periods</label>
                      <AvailabilityGrid
                        selectedCells={editUnavailableCells}
                        onToggle={(d, r) => toggleCell(setEditUnavailableCells, d, r)}
                        onToggleRow={(r) => toggleRow(setEditUnavailableCells, r)}
                        onToggleColumn={(d) => toggleColumn(setEditUnavailableCells, d)}
                        rowLabels={rowLabels}
                        disabledRows={disabledRows}
                      />
                      <span className="form-hint">Edit unavailable slots, then press Save above.</span>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="empty-state">
          <p><strong>No rooms yet</strong></p>
          <p>Add your first room above to get started.</p>
        </div>
      )}

    </div>
  );
}

/* ── Availability Grid component ───────────────────────── */

interface AvailabilityGridProps {
  selectedCells: Set<string>;
  onToggle: (day: number, row: number) => void;
  onToggleRow: (row: number) => void;
  onToggleColumn: (day: number) => void;
  rowLabels: string[];
  disabledRows: boolean[];
}

function AvailabilityGrid({
  selectedCells,
  onToggle,
  onToggleRow,
  onToggleColumn,
  rowLabels,
  disabledRows,
}: AvailabilityGridProps) {
  return (
    <table className="avail-table">
      <thead>
        <tr>
          <th>Period</th>
          {DAY_NAMES.map((dayName, day) => (
            <th key={dayName}>
              <button type="button" onClick={() => onToggleColumn(day)} className="avail-axis-btn">
                {dayName}
              </button>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: GRID_ROWS }, (_, row) => (
          <tr key={row}>
            <td className="avail-label">
              <button
                type="button"
                onClick={() => onToggleRow(row)}
                disabled={disabledRows[row]}
                className="avail-axis-btn"
              >
                {rowLabels[row]}
              </button>
            </td>
            {DAY_NAMES.map((_, day) => {
              const isDisabled = disabledRows[row];
              const selected = selectedCells.has(cellKey(day, row));
              const className = `avail-cell${isDisabled ? "" : selected ? " unavailable" : " available"}`;
              return (
                <td key={day} style={{ textAlign: "center" }}>
                  <button
                    type="button"
                    aria-label={`Toggle ${rowLabels[row]} ${DAY_NAMES[day]} availability`}
                    onClick={() => onToggle(day, row)}
                    disabled={isDisabled}
                    className={className}
                  />
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/* ── Helpers ────────────────────────────────────────────── */

function cellKey(day: number, row: number): string {
  return `${day}-${row}`;
}

function isLaesebaandSlot(label: string | null, periodType: string | undefined): boolean {
  const rawLabel = (label ?? "").toLowerCase();
  const asciiLike = rawLabel.replace(/æ/g, "ae");
  return (
    (periodType ?? "").toLowerCase() === "reading"
    || rawLabel.includes("læseb")
    || asciiLike.includes("laeseb")
  );
}

function toggleRowCells(current: Set<string>, row: number): Set<string> {
  const next = new Set(current);
  const rowKeys = DAY_NAMES.map((_, day) => cellKey(day, row));
  const allSelected = rowKeys.every((key) => next.has(key));
  rowKeys.forEach((key) => (allSelected ? next.delete(key) : next.add(key)));
  return next;
}

function toggleColumnCells(current: Set<string>, day: number, disabledRows: boolean[]): Set<string> {
  const next = new Set(current);
  const colKeys = Array.from({ length: GRID_ROWS }, (_, row) => row)
    .filter((row) => !disabledRows[row])
    .map((row) => cellKey(day, row));
  const allSelected = colKeys.length > 0 && colKeys.every((key) => next.has(key));
  colKeys.forEach((key) => (allSelected ? next.delete(key) : next.add(key)));
  return next;
}

function buildAvailabilityPayload(unavailableCells: Set<string>, timeslotIdsByRow: Array<string | null>) {
  const payload: { day_of_week: number; timeslot_id: string; is_available: boolean }[] = [];
  unavailableCells.forEach((key) => {
    const [dayStr, rowStr] = key.split("-");
    const day = Number(dayStr);
    const row = Number(rowStr);
    const timeslotId = timeslotIdsByRow[row];
    if (Number.isNaN(day) || Number.isNaN(row) || !timeslotId) return;
    payload.push({ day_of_week: day, timeslot_id: timeslotId, is_available: false });
  });
  return payload;
}

function buildUnavailableCellSet(
  availability: RoomAvailability[],
  timeslotIdsByRow: Array<string | null>,
): Set<string> {
  const timeslotToRow = new Map<string, number>();
  timeslotIdsByRow.forEach((timeslotId, row) => {
    if (timeslotId) timeslotToRow.set(timeslotId, row);
  });
  const cells = new Set<string>();
  availability.forEach((item) => {
    if (item.is_available) return;
    const row = timeslotToRow.get(item.timeslot_id);
    if (row === undefined || item.day_of_week < 0 || item.day_of_week > 4) return;
    cells.add(cellKey(item.day_of_week, row));
  });
  return cells;
}

function countUnavailableCells(availability: RoomAvailability[], timeslotIdsByRow: Array<string | null>): number {
  return buildUnavailableCellSet(availability, timeslotIdsByRow).size;
}

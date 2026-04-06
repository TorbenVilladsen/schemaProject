import { useState, useCallback, useMemo, useRef } from "react";
import type { DragEvent, PointerEvent as ReactPointerEvent } from "react";
import type { Room } from "../../types";

// Canvas dimensions and snap grid
const CANVAS_W = 960;
const CANVAS_H = 540;
const SNAP = 40; // pixels between grid points
const CARD_W = 120;
const CARD_H = 56;

const TYPE_COLORS: Record<string, string> = {
  classroom: "#dbeafe",
  gym: "#d1fae5",
  lab: "#fef3c7",
  music: "#fce7f3",
};

interface Props {
  rooms: Room[];
  onMoveRoom: (roomId: string, row: number | null, col: number | null, pane: string | null) => void;
}

export default function RoomLayoutGrid({ rooms, onMoveRoom }: Props) {
  // Pane management
  const existingPanes = useMemo(() => {
    const set = new Set<string>();
    for (const r of rooms) {
      if (r.grid_pane) set.add(r.grid_pane);
    }
    return [...set].sort();
  }, [rooms]);

  const allPanes = useMemo(() => {
    const defaults = existingPanes.length > 0 ? existingPanes : ["Ground Floor"];
    return defaults;
  }, [existingPanes]);

  const [activePane, setActivePane] = useState(() => allPanes[0] || "Ground Floor");
  const [addingPane, setAddingPane] = useState(false);
  const [newPaneName, setNewPaneName] = useState("");
  const [customPanes, setCustomPanes] = useState<string[]>([]);

  const panes = useMemo(() => {
    const merged = new Set([...allPanes, ...customPanes]);
    return [...merged].sort();
  }, [allPanes, customPanes]);

  const handleAddPane = () => {
    const trimmed = newPaneName.trim();
    if (trimmed && !panes.includes(trimmed)) {
      setCustomPanes((prev) => [...prev, trimmed]);
      setActivePane(trimmed);
    }
    setNewPaneName("");
    setAddingPane(false);
  };

  // Rooms for the active pane
  const paneRooms = useMemo(
    () => rooms.filter((r) => r.grid_pane === activePane && r.grid_row !== null && r.grid_col !== null),
    [rooms, activePane],
  );

  const unplacedRooms = useMemo(
    () => rooms.filter((r) => r.grid_row === null || r.grid_col === null || r.grid_pane === null),
    [rooms],
  );

  // Dragging state for canvas rooms (pointer events)
  const canvasRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<{
    roomId: string;
    startX: number;
    startY: number;
    offsetX: number;
    offsetY: number;
    currentX: number;
    currentY: number;
  } | null>(null);

  // Pool drag state (HTML5 DnD for pool→canvas)
  const [poolDragOver, setPoolDragOver] = useState(false);
  const [canvasDragOver, setCanvasDragOver] = useState(false);

  const snap = (v: number) => Math.round(v / SNAP) * SNAP;

  const handlePointerDown = useCallback((e: ReactPointerEvent, room: Room) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const cardX = (room.grid_col ?? 0) * SNAP;
    const cardY = (room.grid_row ?? 0) * SNAP;
    setDragging({
      roomId: room.id,
      startX: cardX,
      startY: cardY,
      offsetX: e.clientX - rect.left - cardX,
      offsetY: e.clientY - rect.top - cardY,
      currentX: cardX,
      currentY: cardY,
    });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e: ReactPointerEvent) => {
    if (!dragging) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const rawX = e.clientX - rect.left - dragging.offsetX;
    const rawY = e.clientY - rect.top - dragging.offsetY;
    setDragging((prev) => prev ? { ...prev, currentX: rawX, currentY: rawY } : null);
  }, [dragging]);

  const handlePointerUp = useCallback(() => {
    if (!dragging) return;
    const snappedX = snap(dragging.currentX);
    const snappedY = snap(dragging.currentY);
    // Clamp to canvas
    const col = Math.max(0, Math.min(Math.floor((CANVAS_W - CARD_W) / SNAP), Math.round(snappedX / SNAP)));
    const row = Math.max(0, Math.min(Math.floor((CANVAS_H - CARD_H) / SNAP), Math.round(snappedY / SNAP)));
    onMoveRoom(dragging.roomId, row, col, activePane);
    setDragging(null);
  }, [dragging, onMoveRoom, activePane]);

  // HTML5 DnD handlers for pool items → canvas
  const handlePoolDragStart = useCallback((e: DragEvent, room: Room) => {
    e.dataTransfer.setData("text/plain", room.id);
    e.dataTransfer.effectAllowed = "move";
  }, []);

  const handleCanvasDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setCanvasDragOver(true);
  }, []);

  const handleCanvasDragLeave = useCallback(() => {
    setCanvasDragOver(false);
  }, []);

  const handleCanvasDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    setCanvasDragOver(false);
    const roomId = e.dataTransfer.getData("text/plain");
    if (!roomId) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const rawX = e.clientX - rect.left - CARD_W / 2;
    const rawY = e.clientY - rect.top - CARD_H / 2;
    const col = Math.max(0, Math.min(Math.floor((CANVAS_W - CARD_W) / SNAP), Math.round(snap(rawX) / SNAP)));
    const row = Math.max(0, Math.min(Math.floor((CANVAS_H - CARD_H) / SNAP), Math.round(snap(rawY) / SNAP)));
    onMoveRoom(roomId, row, col, activePane);
  }, [onMoveRoom, activePane]);

  // Pool drop (to unplace)
  const handlePoolDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setPoolDragOver(true);
  }, []);

  const handlePoolDragLeave = useCallback(() => {
    setPoolDragOver(false);
  }, []);

  const handlePoolDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    setPoolDragOver(false);
    const roomId = e.dataTransfer.getData("text/plain");
    if (!roomId) return;
    onMoveRoom(roomId, null, null, null);
  }, [onMoveRoom]);

  // Allow dragging canvas cards to pool via HTML5 DnD fallback
  const handleCardDragStart = useCallback((e: DragEvent, room: Room) => {
    e.dataTransfer.setData("text/plain", room.id);
    e.dataTransfer.effectAllowed = "move";
  }, []);

  return (
    <div className="room-layout-v2">
      {/* Pane tabs */}
      <div className="room-layout-pane-bar">
        <div className="room-layout-pane-tabs">
          {panes.map((pane) => (
            <button
              key={pane}
              className={`room-layout-pane-tab${activePane === pane ? " room-layout-pane-tab-active" : ""}`}
              onClick={() => setActivePane(pane)}
            >
              {pane}
              <span className="room-layout-pane-count">
                {rooms.filter((r) => r.grid_pane === pane && r.grid_row !== null).length}
              </span>
            </button>
          ))}
          {addingPane ? (
            <div className="room-layout-pane-add-form">
              <input
                className="form-input"
                style={{ width: 140, fontSize: "0.8rem", padding: "0.25rem 0.5rem" }}
                placeholder="e.g. 1st Floor"
                value={newPaneName}
                onChange={(e) => setNewPaneName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleAddPane(); if (e.key === "Escape") setAddingPane(false); }}
                autoFocus
              />
              <button className="btn btn-primary btn-sm" onClick={handleAddPane} type="button">Add</button>
              <button className="btn btn-secondary btn-sm" onClick={() => setAddingPane(false)} type="button">Cancel</button>
            </div>
          ) : (
            <button className="room-layout-pane-tab room-layout-pane-add" onClick={() => setAddingPane(true)} type="button">
              + Add section
            </button>
          )}
        </div>
      </div>

      <div className="room-layout-body">
        {/* Canvas */}
        <div
          ref={canvasRef}
          className={`room-layout-canvas${canvasDragOver ? " room-layout-canvas-dragover" : ""}`}
          style={{ width: CANVAS_W, height: CANVAS_H }}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onDragOver={handleCanvasDragOver}
          onDragLeave={handleCanvasDragLeave}
          onDrop={handleCanvasDrop}
        >
          {/* Dot grid background rendered via CSS */}
          <svg className="room-layout-dots" width={CANVAS_W} height={CANVAS_H}>
            <defs>
              <pattern id="dot-grid" width={SNAP} height={SNAP} patternUnits="userSpaceOnUse">
                <circle cx={SNAP / 2} cy={SNAP / 2} r="1.2" fill="var(--color-border-strong)" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#dot-grid)" />
          </svg>

          {/* Placed room cards */}
          {paneRooms.map((room) => {
            const isDragging = dragging?.roomId === room.id;
            const x = isDragging ? dragging.currentX : (room.grid_col ?? 0) * SNAP;
            const y = isDragging ? dragging.currentY : (room.grid_row ?? 0) * SNAP;
            return (
              <div
                key={room.id}
                className="room-layout-card-v2"
                draggable
                onDragStart={(e) => handleCardDragStart(e, room)}
                onPointerDown={(e) => handlePointerDown(e, room)}
                style={{
                  left: x,
                  top: y,
                  width: CARD_W,
                  height: CARD_H,
                  backgroundColor: TYPE_COLORS[room.room_type] || "#f3f4f6",
                  opacity: isDragging ? 0.7 : 1,
                  zIndex: isDragging ? 10 : 1,
                }}
              >
                <div className="room-layout-card-name">{room.name}</div>
                <div className="room-layout-card-meta">{room.room_type} &middot; {room.capacity}</div>
              </div>
            );
          })}

          {paneRooms.length === 0 && !canvasDragOver && (
            <div className="room-layout-canvas-empty">
              Drag rooms from the panel to place them on this floor
            </div>
          )}
        </div>

        {/* Pool */}
        <div
          className={`room-layout-pool-v2${poolDragOver ? " room-layout-pool-v2-over" : ""}`}
          onDragOver={handlePoolDragOver}
          onDragLeave={handlePoolDragLeave}
          onDrop={handlePoolDrop}
        >
          <div className="room-layout-pool-label">Unplaced rooms</div>
          {unplacedRooms.length === 0 && (
            <div className="room-layout-pool-empty">All rooms placed</div>
          )}
          {unplacedRooms.map((room) => (
            <div
              key={room.id}
              className="room-layout-pool-card"
              draggable
              onDragStart={(e) => handlePoolDragStart(e, room)}
              style={{ backgroundColor: TYPE_COLORS[room.room_type] || "#f3f4f6" }}
            >
              <div className="room-layout-card-name">{room.name}</div>
              <div className="room-layout-card-meta">{room.room_type} &middot; {room.capacity}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

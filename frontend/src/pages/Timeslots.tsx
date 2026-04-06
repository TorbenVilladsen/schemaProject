import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getTimeslots, createTimeslot } from "../api/client";
import { formatTime } from "../styles/shared";

export default function Timeslots() {
  const queryClient = useQueryClient();
  const { data: timeslots, isLoading } = useQuery({ queryKey: ["timeslots"], queryFn: getTimeslots });

  const [slotIndex, setSlotIndex] = useState(0);
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("08:45");
  const [label, setLabel] = useState("");

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
      start_time: startTime,
      end_time: endTime,
      label: label || undefined,
    });
  };

  if (isLoading) return <p className="loading-text">Loading timeslots...</p>;

  return (
    <div>
      <div className="page-header">
        <h1>Timeslots</h1>
        <p>Define the periods in a school day. These are shared across all weekdays (Mon-Fri) and used by the scheduler.</p>
      </div>

      <form onSubmit={handleCreate} className="form-card">
        <div className="field-row">
          <div className="field-group" style={{ maxWidth: 100 }}>
            <label className="form-label">Period # <span className="required">*</span></label>
            <input className="form-input" type="number" value={slotIndex} onChange={(e) => setSlotIndex(+e.target.value)} min={0} />
            <span className="form-hint">Order (0 = first)</span>
          </div>
          <div className="field-group">
            <label className="form-label">Start time <span className="required">*</span></label>
            <input className="form-input" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
            <span className="form-hint">When this period begins</span>
          </div>
          <div className="field-group">
            <label className="form-label">End time <span className="required">*</span></label>
            <input className="form-input" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required />
            <span className="form-hint">When this period ends</span>
          </div>
        </div>

        <div className="field-row" style={{ alignItems: "flex-end" }}>
          <div className="field-group">
            <label className="form-label">Label</label>
            <input className="form-input" placeholder="e.g. 1. modul" value={label} onChange={(e) => setLabel(e.target.value)} />
            <span className="form-hint">Optional display name shown in the timetable</span>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary">Add Timeslot</button>
          </div>
        </div>
      </form>

      {timeslots && timeslots.length > 0 ? (
        <table className="data-table">
          <thead>
            <tr>
              <th>Period #</th>
              <th>Start</th>
              <th>End</th>
              <th>Label</th>
            </tr>
          </thead>
          <tbody>
            {timeslots.map((ts) => (
              <tr key={ts.id}>
                <td>{ts.slot_index}</td>
                <td>{formatTime(ts.start_time)}</td>
                <td>{formatTime(ts.end_time)}</td>
                <td>{ts.label || "\u2014"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="empty-state">
          <p><strong>No timeslots yet</strong></p>
          <p>Add your first timeslot above to define the school day periods.</p>
        </div>
      )}
    </div>
  );
}

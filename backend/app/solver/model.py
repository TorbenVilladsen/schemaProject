"""Builds the CP-SAT model for teacher schedule generation."""

from dataclasses import dataclass, field
import uuid

from ortools.sat.python import cp_model


@dataclass
class TeacherData:
    id: uuid.UUID
    name: str
    max_hours_week: int
    max_hours_day: int
    qualified_subjects: dict[uuid.UUID, tuple[int, int]] = field(default_factory=dict)
    # subject_id -> (min_grade, max_grade)
    availability: dict[tuple[int, int], bool] = field(default_factory=dict)
    # (day_of_week, period_idx) -> is_available; absent keys default to True


@dataclass
class SubjectData:
    id: uuid.UUID
    name: str
    grade_level: int
    hours_per_week: int
    requires_room_type: str | None
    class_id: uuid.UUID | None = None


@dataclass
class ClassData:
    id: uuid.UUID
    name: str
    grade_level: int
    contact_teacher_id: uuid.UUID | None = None


@dataclass
class RoomData:
    id: uuid.UUID
    name: str
    capacity: int
    room_type: str


@dataclass
class TimeslotData:
    id: uuid.UUID
    slot_index: int


@dataclass
class SolverInput:
    teachers: list[TeacherData]
    subjects: list[SubjectData]
    rooms: list[RoomData]
    timeslots: list[TimeslotData]
    classes: list[ClassData] = field(default_factory=list)
    days: list[int] = field(default_factory=lambda: [0, 1, 2, 3, 4])  # Mon-Fri


@dataclass
class SolverResult:
    status: str  # "optimal", "feasible", "infeasible"
    entries: list[dict]  # list of {teacher_id, subject_id, room_id, day, timeslot_id}
    stats: dict = field(default_factory=dict)


def build_model(data: SolverInput, time_limit_seconds: int = 30) -> SolverResult:
    """Build and solve the CP-SAT model for schedule generation."""
    model = cp_model.CpModel()
    total_required_hours = sum(subject.hours_per_week for subject in data.subjects)

    # Pre-compute which teachers can teach which subjects
    # A teacher can teach a subject if they have a qualification matching the subject's grade
    teacher_subject_pairs: list[tuple[int, int]] = []  # (teacher_idx, subject_idx)
    for t_idx, teacher in enumerate(data.teachers):
        for s_idx, subject in enumerate(data.subjects):
            if subject.id in teacher.qualified_subjects:
                min_g, max_g = teacher.qualified_subjects[subject.id]
                if min_g <= subject.grade_level <= max_g:
                    teacher_subject_pairs.append((t_idx, s_idx))

    # Pre-compute which rooms are compatible with which subjects
    subject_rooms: dict[int, list[int]] = {}  # subject_idx -> list of room_idx
    for s_idx, subject in enumerate(data.subjects):
        compatible = []
        for r_idx, room in enumerate(data.rooms):
            if subject.requires_room_type is None or room.room_type.lower() == subject.requires_room_type.lower():
                compatible.append(r_idx)
        subject_rooms[s_idx] = compatible

    # Decision variables: x[t, s, d, p] = 1 iff teacher t teaches subject s on day d, period p
    # Skip variables where teacher is unavailable (prune at creation time)
    x: dict[tuple[int, int, int, int], cp_model.IntVar] = {}
    for t_idx, s_idx in teacher_subject_pairs:
        teacher = data.teachers[t_idx]
        for d in data.days:
            for p_idx in range(len(data.timeslots)):
                if not teacher.availability.get((d, p_idx), True):
                    continue  # teacher unavailable — no variable
                var_name = f"x_t{t_idx}_s{s_idx}_d{d}_p{p_idx}"
                x[t_idx, s_idx, d, p_idx] = model.new_bool_var(var_name)

    # Room assignment: r[s, d, p, room] = 1 iff subject s uses room on day d, period p
    r: dict[tuple[int, int, int, int], cp_model.IntVar] = {}
    for s_idx in range(len(data.subjects)):
        for d in data.days:
            for p_idx in range(len(data.timeslots)):
                for r_idx in subject_rooms.get(s_idx, []):
                    var_name = f"r_s{s_idx}_d{d}_p{p_idx}_r{r_idx}"
                    r[s_idx, d, p_idx, r_idx] = model.new_bool_var(var_name)

    # --- HARD CONSTRAINTS ---

    # 1. Teacher teaches at most one subject per (day, period)
    for t_idx in range(len(data.teachers)):
        for d in data.days:
            for p_idx in range(len(data.timeslots)):
                vars_for_slot = [
                    x[t_idx, s_idx, d, p_idx]
                    for s_idx in range(len(data.subjects))
                    if (t_idx, s_idx, d, p_idx) in x
                ]
                if vars_for_slot:
                    model.add(sum(vars_for_slot) <= 1)

    # 2. Each subject gets exactly its required hours per week
    for s_idx, subject in enumerate(data.subjects):
        all_assignments = [
            x[t_idx, s_idx, d, p_idx]
            for t_idx in range(len(data.teachers))
            for d in data.days
            for p_idx in range(len(data.timeslots))
            if (t_idx, s_idx, d, p_idx) in x
        ]
        if all_assignments:
            model.add(sum(all_assignments) == subject.hours_per_week)
        elif subject.hours_per_week > 0:
            # No qualified teacher can teach this subject — infeasible
            model.add(0 == 1)  # Force infeasible

    # 3. Each subject is taught at most once per (day, period) — one teacher per class
    for s_idx in range(len(data.subjects)):
        for d in data.days:
            for p_idx in range(len(data.timeslots)):
                vars_for_slot = [
                    x[t_idx, s_idx, d, p_idx]
                    for t_idx in range(len(data.teachers))
                    if (t_idx, s_idx, d, p_idx) in x
                ]
                if vars_for_slot:
                    model.add(sum(vars_for_slot) <= 1)

    # 4. Room no-clash: at most one subject per room per (day, period)
    for r_idx in range(len(data.rooms)):
        for d in data.days:
            for p_idx in range(len(data.timeslots)):
                vars_for_room = [
                    r[s_idx, d, p_idx, r_idx]
                    for s_idx in range(len(data.subjects))
                    if (s_idx, d, p_idx, r_idx) in r
                ]
                if vars_for_room:
                    model.add(sum(vars_for_room) <= 1)

    # 5. Link teaching to room: if a subject is taught in a slot, it must have exactly one room
    for s_idx in range(len(data.subjects)):
        for d in data.days:
            for p_idx in range(len(data.timeslots)):
                teaching_vars = [
                    x[t_idx, s_idx, d, p_idx]
                    for t_idx in range(len(data.teachers))
                    if (t_idx, s_idx, d, p_idx) in x
                ]
                room_vars = [
                    r[s_idx, d, p_idx, r_idx]
                    for r_idx in subject_rooms.get(s_idx, [])
                    if (s_idx, d, p_idx, r_idx) in r
                ]
                if teaching_vars and room_vars:
                    # sum of rooms == sum of teachers (0 or 1)
                    model.add(sum(room_vars) == sum(teaching_vars))

    # 6. Teacher max hours per day
    for t_idx, teacher in enumerate(data.teachers):
        for d in data.days:
            day_vars = [
                x[t_idx, s_idx, d, p_idx]
                for s_idx in range(len(data.subjects))
                for p_idx in range(len(data.timeslots))
                if (t_idx, s_idx, d, p_idx) in x
            ]
            if day_vars:
                model.add(sum(day_vars) <= teacher.max_hours_day)

    # 7. Teacher max hours per week
    for t_idx, teacher in enumerate(data.teachers):
        week_vars = [
            x[t_idx, s_idx, d, p_idx]
            for s_idx in range(len(data.subjects))
            for d in data.days
            for p_idx in range(len(data.timeslots))
            if (t_idx, s_idx, d, p_idx) in x
        ]
        if week_vars:
            model.add(sum(week_vars) <= teacher.max_hours_week)

    # 8. Balance load across weekdays.
    # Without an objective, CP-SAT may cluster assignments on just a few days.
    day_load_vars: list[cp_model.IntVar] = []
    for d in data.days:
        day_vars = [
            x[t_idx, s_idx, d, p_idx]
            for t_idx in range(len(data.teachers))
            for s_idx in range(len(data.subjects))
            for p_idx in range(len(data.timeslots))
            if (t_idx, s_idx, d, p_idx) in x
        ]
        day_load = model.new_int_var(0, total_required_hours, f"day_load_d{d}")
        if day_vars:
            model.add(day_load == sum(day_vars))
        else:
            model.add(day_load == 0)
        day_load_vars.append(day_load)

    if day_load_vars:
        max_day_load = model.new_int_var(0, total_required_hours, "max_day_load")
        for day_load in day_load_vars:
            model.add(day_load <= max_day_load)
        model.minimize(max_day_load)

    # --- SOLVE ---
    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = time_limit_seconds

    status = solver.solve(model)

    if status in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        entries = []
        for (t_idx, s_idx, d, p_idx), var in x.items():
            if solver.value(var) == 1:
                # Find the assigned room
                room_id = None
                for r_idx in subject_rooms.get(s_idx, []):
                    if (s_idx, d, p_idx, r_idx) in r and solver.value(r[s_idx, d, p_idx, r_idx]) == 1:
                        room_id = data.rooms[r_idx].id
                        break

                entries.append({
                    "teacher_id": data.teachers[t_idx].id,
                    "subject_id": data.subjects[s_idx].id,
                    "room_id": room_id,
                    "day_of_week": d,
                    "timeslot_id": data.timeslots[p_idx].id,
                    "class_id": data.subjects[s_idx].class_id,
                })

        return SolverResult(
            status="optimal" if status == cp_model.OPTIMAL else "feasible",
            entries=entries,
            stats={
                "wall_time": solver.wall_time,
                "num_entries": len(entries),
                "objective_value": solver.objective_value,
            },
        )
    else:
        return SolverResult(
            status="infeasible",
            entries=[],
            stats={"wall_time": solver.wall_time},
        )

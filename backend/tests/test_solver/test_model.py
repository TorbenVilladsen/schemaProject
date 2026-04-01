"""Tests for the constraint solver with sample school data."""

import uuid

from app.solver.model import (
    SolverInput,
    TeacherData,
    SubjectData,
    RoomData,
    TimeslotData,
    build_model,
)


def _make_id():
    return uuid.uuid4()


def test_simple_schedule():
    """3 teachers, 4 subjects, 2 rooms, 4 periods — should find a valid schedule."""
    # Subjects
    math_3 = SubjectData(id=_make_id(), name="Math", grade_level=3, hours_per_week=3, requires_room_type=None)
    danish_3 = SubjectData(id=_make_id(), name="Danish", grade_level=3, hours_per_week=3, requires_room_type=None)
    math_5 = SubjectData(id=_make_id(), name="Math", grade_level=5, hours_per_week=2, requires_room_type=None)
    gym_3 = SubjectData(id=_make_id(), name="Gym", grade_level=3, hours_per_week=2, requires_room_type="gym")

    # Timeslots (4 periods per day)
    slots = [TimeslotData(id=_make_id(), slot_index=i) for i in range(4)]

    # Rooms
    classroom1 = RoomData(id=_make_id(), name="Room A", capacity=30, room_type="classroom")
    classroom2 = RoomData(id=_make_id(), name="Room B", capacity=30, room_type="classroom")
    gym_room = RoomData(id=_make_id(), name="Gym Hall", capacity=60, room_type="gym")

    # Teachers with qualifications
    teacher_a = TeacherData(
        id=_make_id(), name="Alice", max_hours_week=20, max_hours_day=6,
        qualified_subjects={
            math_3.id: (0, 9),
            math_5.id: (0, 9),
        },
    )
    teacher_b = TeacherData(
        id=_make_id(), name="Bob", max_hours_week=20, max_hours_day=6,
        qualified_subjects={
            danish_3.id: (0, 9),
        },
    )
    teacher_c = TeacherData(
        id=_make_id(), name="Carol", max_hours_week=20, max_hours_day=6,
        qualified_subjects={
            gym_3.id: (0, 9),
            danish_3.id: (0, 9),
        },
    )

    data = SolverInput(
        teachers=[teacher_a, teacher_b, teacher_c],
        subjects=[math_3, danish_3, math_5, gym_3],
        rooms=[classroom1, classroom2, gym_room],
        timeslots=slots,
        days=[0, 1, 2, 3, 4],
    )

    result = build_model(data, time_limit_seconds=10)

    assert result.status in ("optimal", "feasible"), f"Solver returned: {result.status}"

    # Total entries should equal sum of hours_per_week
    expected_entries = math_3.hours_per_week + danish_3.hours_per_week + math_5.hours_per_week + gym_3.hours_per_week
    assert len(result.entries) == expected_entries, f"Expected {expected_entries} entries, got {len(result.entries)}"

    # Verify no teacher teaches two things at the same time
    teacher_slots = set()
    for e in result.entries:
        key = (e["teacher_id"], e["day_of_week"], e["timeslot_id"])
        assert key not in teacher_slots, f"Teacher double-booked: {key}"
        teacher_slots.add(key)

    # Verify no room is double-booked
    room_slots = set()
    for e in result.entries:
        key = (e["room_id"], e["day_of_week"], e["timeslot_id"])
        assert key not in room_slots, f"Room double-booked: {key}"
        room_slots.add(key)

    # Verify gym subject got a gym room
    for e in result.entries:
        if e["subject_id"] == gym_3.id:
            assert e["room_id"] == gym_room.id, "Gym class should be in gym room"


def test_infeasible_no_qualified_teacher():
    """A subject with no qualified teacher should be infeasible."""
    subject = SubjectData(id=_make_id(), name="Physics", grade_level=8, hours_per_week=2, requires_room_type=None)
    teacher = TeacherData(
        id=_make_id(), name="Alice", max_hours_week=20, max_hours_day=6,
        qualified_subjects={},  # Not qualified for anything
    )
    slot = TimeslotData(id=_make_id(), slot_index=0)
    room = RoomData(id=_make_id(), name="Room A", capacity=30, room_type="classroom")

    data = SolverInput(
        teachers=[teacher],
        subjects=[subject],
        rooms=[room],
        timeslots=[slot],
    )

    result = build_model(data, time_limit_seconds=5)
    assert result.status == "infeasible"


def test_grade_restriction():
    """A teacher qualified for grades 0-3 should not teach a grade 5 subject."""
    subject_g5 = SubjectData(id=_make_id(), name="Math", grade_level=5, hours_per_week=1, requires_room_type=None)

    teacher = TeacherData(
        id=_make_id(), name="Alice", max_hours_week=20, max_hours_day=6,
        qualified_subjects={
            subject_g5.id: (0, 3),  # Only qualified up to grade 3
        },
    )
    slot = TimeslotData(id=_make_id(), slot_index=0)
    room = RoomData(id=_make_id(), name="Room A", capacity=30, room_type="classroom")

    data = SolverInput(
        teachers=[teacher],
        subjects=[subject_g5],
        rooms=[room],
        timeslots=[slot],
    )

    result = build_model(data, time_limit_seconds=5)
    # Teacher's grade range (0-3) doesn't cover grade 5, so should be infeasible
    assert result.status == "infeasible"

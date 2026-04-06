"""Basic API CRUD tests."""


def test_health(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


def test_create_and_list_teachers(client):
    resp = client.post("/api/v1/teachers", json={
        "name": "Alice",
        "qualifications": [
            {"subject_name": "Math", "min_grade": 0, "max_grade": 9}
        ],
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "Alice"
    assert len(data["qualifications"]) == 1

    resp = client.get("/api/v1/teachers")
    assert resp.status_code == 200
    assert len(resp.json()) == 1


def test_create_and_list_subjects(client):
    resp = client.post("/api/v1/subjects", json={
        "name": "Math",
        "grade_level": 3,
        "hours_per_week": 4,
    })
    assert resp.status_code == 201

    resp = client.get("/api/v1/subjects")
    assert resp.status_code == 200
    assert len(resp.json()) == 1


def test_create_and_list_rooms(client):
    resp = client.post("/api/v1/rooms", json={
        "name": "Room A",
        "capacity": 30,
    })
    assert resp.status_code == 201

    resp = client.get("/api/v1/rooms")
    assert resp.status_code == 200
    assert len(resp.json()) == 1


def test_create_and_list_timeslots(client):
    resp = client.post("/api/v1/timeslots", json={
        "slot_index": 0,
        "start_time": "08:00",
        "end_time": "08:45",
        "label": "1st period",
    })
    assert resp.status_code == 201
    created = resp.json()
    assert created["start_time"] == "08:00"
    assert created["end_time"] == "08:45"

    resp = client.get("/api/v1/timeslots")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["start_time"] == "08:00"
    assert data[0]["end_time"] == "08:45"


def test_create_and_list_classes(client):
    resp = client.post("/api/v1/classes", json={
        "name": "3A",
        "grade_level": 3,
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "3A"
    assert data["grade_level"] == 3
    assert data["contact_teacher_id"] is None

    resp = client.get("/api/v1/classes")
    assert resp.status_code == 200
    assert len(resp.json()) == 1


def test_create_subject_with_class(client):
    # Create a class first
    resp = client.post("/api/v1/classes", json={"name": "5B", "grade_level": 5})
    assert resp.status_code == 201
    class_id = resp.json()["id"]

    # Create subject linked to that class
    resp = client.post("/api/v1/subjects", json={
        "name": "Math",
        "grade_level": 5,
        "hours_per_week": 4,
        "class_id": class_id,
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["class_id"] == class_id


def test_setup_export_returns_all_setup_data(client):
    teacher = client.post("/api/v1/teachers", json={
        "name": "Alice",
        "qualifications": [{"subject_name": "Math", "min_grade": 0, "max_grade": 9}],
    })
    assert teacher.status_code == 201
    teacher_id = teacher.json()["id"]

    school_class = client.post("/api/v1/classes", json={
        "name": "3A",
        "grade_level": 3,
        "contact_teacher_id": teacher_id,
    })
    assert school_class.status_code == 201
    class_id = school_class.json()["id"]

    assert client.post("/api/v1/subjects", json={
        "name": "Math",
        "grade_level": 3,
        "hours_per_week": 4,
        "class_id": class_id,
    }).status_code == 201
    assert client.post("/api/v1/rooms", json={"name": "Room A", "capacity": 30}).status_code == 201
    assert client.post("/api/v1/timeslots", json={
        "slot_index": 0,
        "start_time": "08:00",
        "end_time": "08:45",
    }).status_code == 201

    exported = client.get("/api/v1/setup/export")
    assert exported.status_code == 200
    data = exported.json()
    assert data["version"] == 1
    assert len(data["classes"]) == 1
    assert len(data["teachers"]) == 1
    assert len(data["subjects"]) == 1
    assert len(data["rooms"]) == 1
    assert len(data["timeslots"]) == 1
    assert data["timeslots"][0]["start_time"] == "08:00"
    assert data["timeslots"][0]["end_time"] == "08:45"


def test_setup_import_replaces_existing_data(client):
    # Existing data that should be replaced
    assert client.post("/api/v1/teachers", json={"name": "Old Teacher"}).status_code == 201
    assert client.post("/api/v1/rooms", json={"name": "Old Room", "capacity": 20}).status_code == 201
    assert client.post("/api/v1/schedules", json={"name": "Old Schedule"}).status_code == 201

    payload = {
        "replace_existing": True,
        "data": {
            "version": 1,
            "classes": [{"name": "5B", "grade_level": 5, "contact_teacher_id": None}],
            "teachers": [{
                "name": "New Teacher",
                "max_hours_week": 25,
                "max_hours_day": 6,
                "qualifications": [{"subject_name": "Science", "min_grade": 4, "max_grade": 9}],
            }],
            "subjects": [{
                "name": "Science",
                "grade_level": 5,
                "hours_per_week": 3,
                "requires_room_type": None,
                "class_id": None,
            }],
            "rooms": [{"name": "Lab", "capacity": 28, "room_type": "science"}],
            "timeslots": [{
                "slot_index": 0,
                "start_time": "08:00",
                "end_time": "08:45",
                "label": "1st",
                "period_type": "module",
            }],
        },
    }
    imported = client.post("/api/v1/setup/import", json=payload)
    assert imported.status_code == 200
    assert imported.json()["imported"]["teachers"] == 1

    teachers = client.get("/api/v1/teachers").json()
    rooms = client.get("/api/v1/rooms").json()
    schedules = client.get("/api/v1/schedules").json()

    assert len(teachers) == 1
    assert teachers[0]["name"] == "New Teacher"
    assert len(rooms) == 1
    assert rooms[0]["name"] == "Lab"
    assert schedules == []


def test_teacher_unavailability_blocks_schedule_generation(client):
    slot_resp = client.post("/api/v1/timeslots", json={
        "slot_index": 0,
        "start_time": "08:00",
        "end_time": "08:45",
        "label": "1st",
    })
    assert slot_resp.status_code == 201
    slot_id = slot_resp.json()["id"]

    teacher_resp = client.post("/api/v1/teachers", json={
        "name": "Alice",
        "qualifications": [{"subject_name": "Math", "min_grade": 0, "max_grade": 9}],
        "availability": [{
            "day_of_week": 0,
            "timeslot_id": slot_id,
            "is_available": False,
            "preference": 0,
        }],
    })
    assert teacher_resp.status_code == 201

    subject_resp = client.post("/api/v1/subjects", json={
        "name": "Math",
        "grade_level": 3,
        "hours_per_week": 5,
    })
    assert subject_resp.status_code == 201

    room_resp = client.post("/api/v1/rooms", json={"name": "Room A", "capacity": 30})
    assert room_resp.status_code == 201

    schedule_resp = client.post("/api/v1/schedules", json={"name": "Availability check"})
    assert schedule_resp.status_code == 201
    schedule_id = schedule_resp.json()["id"]

    generate_resp = client.post(f"/api/v1/schedules/{schedule_id}/generate")
    assert generate_resp.status_code == 400
    assert "No feasible schedule found" in generate_resp.json()["detail"]


def test_update_teacher_availability_with_existing_slots_succeeds(client):
    slot_resp = client.post("/api/v1/timeslots", json={
        "slot_index": 0,
        "start_time": "08:00",
        "end_time": "08:45",
        "label": "1st",
    })
    assert slot_resp.status_code == 201
    slot_id = slot_resp.json()["id"]

    teacher_resp = client.post("/api/v1/teachers", json={
        "name": "Alice",
        "availability": [{
            "day_of_week": 0,
            "timeslot_id": slot_id,
            "is_available": False,
            "preference": 0,
        }],
    })
    assert teacher_resp.status_code == 201
    teacher_id = teacher_resp.json()["id"]

    update_payload = {
        "availability": [{
            "day_of_week": 0,
            "timeslot_id": slot_id,
            "is_available": False,
            "preference": 0,
        }]
    }

    first_update = client.put(f"/api/v1/teachers/{teacher_id}", json=update_payload)
    assert first_update.status_code == 200
    first_data = first_update.json()
    assert len(first_data["availability"]) == 1
    assert first_data["availability"][0]["day_of_week"] == 0
    assert first_data["availability"][0]["timeslot_id"] == slot_id
    assert first_data["availability"][0]["is_available"] is False

    second_update = client.put(f"/api/v1/teachers/{teacher_id}", json=update_payload)
    assert second_update.status_code == 200
    second_data = second_update.json()
    assert len(second_data["availability"]) == 1


def test_move_schedule_entry_uses_backend_slot_constraints(client):
    slot_module = client.post("/api/v1/timeslots", json={
        "slot_index": 0,
        "start_time": "08:00",
        "end_time": "08:45",
        "label": "1st",
        "period_type": "module",
    })
    assert slot_module.status_code == 201

    slot_unavailable = client.post("/api/v1/timeslots", json={
        "slot_index": 1,
        "start_time": "08:55",
        "end_time": "09:40",
        "label": "2nd",
        "period_type": "module",
    })
    assert slot_unavailable.status_code == 201
    unavailable_slot_id = slot_unavailable.json()["id"]

    slot_blocked = client.post("/api/v1/timeslots", json={
        "slot_index": 2,
        "start_time": "09:50",
        "end_time": "10:10",
        "label": "Læsebånd",
        "period_type": "reading",
    })
    assert slot_blocked.status_code == 201
    blocked_slot_id = slot_blocked.json()["id"]

    teacher_payload = {
        "name": "Alice",
        "qualifications": [{"subject_name": "Math", "min_grade": 0, "max_grade": 9}],
        "availability": [
            {
                "day_of_week": day,
                "timeslot_id": unavailable_slot_id,
                "is_available": False,
                "preference": 0,
            }
            for day in range(5)
        ],
    }
    teacher_resp = client.post("/api/v1/teachers", json=teacher_payload)
    assert teacher_resp.status_code == 201

    subject_resp = client.post("/api/v1/subjects", json={
        "name": "Math",
        "grade_level": 3,
        "hours_per_week": 1,
    })
    assert subject_resp.status_code == 201

    room_resp = client.post("/api/v1/rooms", json={"name": "Room A", "capacity": 30})
    assert room_resp.status_code == 201

    schedule_resp = client.post("/api/v1/schedules", json={"name": "Move checks"})
    assert schedule_resp.status_code == 201
    schedule_id = schedule_resp.json()["id"]

    generated = client.post(f"/api/v1/schedules/{schedule_id}/generate")
    assert generated.status_code == 200
    entries = generated.json()["entries"]
    assert len(entries) == 1
    entry_id = entries[0]["id"]

    blocked_move = client.patch(
        f"/api/v1/schedules/{schedule_id}/entries/{entry_id}",
        json={"day_of_week": 0, "timeslot_id": blocked_slot_id},
    )
    assert blocked_move.status_code == 409
    assert "blocked periods" in blocked_move.json()["detail"]

    unavailable_move = client.patch(
        f"/api/v1/schedules/{schedule_id}/entries/{entry_id}",
        json={"day_of_week": 0, "timeslot_id": unavailable_slot_id},
    )
    assert unavailable_move.status_code == 409
    assert unavailable_move.json()["detail"] == "Teacher unavailable in selected slot"


def test_move_schedule_entry_rejects_room_conflict(client):
    slot_resp = client.post("/api/v1/timeslots", json={
        "slot_index": 0,
        "start_time": "08:00",
        "end_time": "08:45",
        "label": "1st",
        "period_type": "module",
    })
    assert slot_resp.status_code == 201

    t1 = client.post("/api/v1/teachers", json={
        "name": "Alice",
        "qualifications": [{"subject_name": "Math", "min_grade": 0, "max_grade": 9}],
    })
    assert t1.status_code == 201

    t2 = client.post("/api/v1/teachers", json={
        "name": "Bob",
        "qualifications": [{"subject_name": "Science", "min_grade": 0, "max_grade": 9}],
    })
    assert t2.status_code == 201

    s1 = client.post("/api/v1/subjects", json={
        "name": "Math",
        "grade_level": 3,
        "hours_per_week": 1,
    })
    assert s1.status_code == 201

    s2 = client.post("/api/v1/subjects", json={
        "name": "Science",
        "grade_level": 3,
        "hours_per_week": 1,
    })
    assert s2.status_code == 201

    room_resp = client.post("/api/v1/rooms", json={"name": "Room A", "capacity": 30})
    assert room_resp.status_code == 201

    schedule_resp = client.post("/api/v1/schedules", json={"name": "Room conflict check"})
    assert schedule_resp.status_code == 201
    schedule_id = schedule_resp.json()["id"]

    generated = client.post(f"/api/v1/schedules/{schedule_id}/generate")
    assert generated.status_code == 200
    entries = generated.json()["entries"]
    assert len(entries) == 2

    source_entry = entries[0]
    target_entry = entries[1]
    move_resp = client.patch(
        f"/api/v1/schedules/{schedule_id}/entries/{source_entry['id']}",
        json={
            "day_of_week": target_entry["day_of_week"],
            "timeslot_id": target_entry["timeslot_id"],
        },
    )
    assert move_resp.status_code == 409
    assert "Room slot occupied" in move_resp.json()["detail"]


def test_move_schedule_entry_rejects_teacher_max_hours_day(client):
    slots = []
    for idx, (start_time, end_time, label) in enumerate(
        [("08:00", "08:45", "1st"), ("08:55", "09:40", "2nd"), ("09:50", "10:35", "3rd")]
    ):
        resp = client.post("/api/v1/timeslots", json={
            "slot_index": idx,
            "start_time": start_time,
            "end_time": end_time,
            "label": label,
            "period_type": "module",
        })
        assert resp.status_code == 201
        slots.append(resp.json())

    teacher_resp = client.post("/api/v1/teachers", json={
        "name": "Alice",
        "max_hours_day": 1,
        "qualifications": [
            {"subject_name": "Math", "min_grade": 0, "max_grade": 9},
            {"subject_name": "Science", "min_grade": 0, "max_grade": 9},
        ],
    })
    assert teacher_resp.status_code == 201
    teacher_id = teacher_resp.json()["id"]

    s1 = client.post("/api/v1/subjects", json={
        "name": "Math",
        "grade_level": 3,
        "hours_per_week": 1,
    })
    assert s1.status_code == 201

    s2 = client.post("/api/v1/subjects", json={
        "name": "Science",
        "grade_level": 3,
        "hours_per_week": 1,
    })
    assert s2.status_code == 201

    room_resp = client.post("/api/v1/rooms", json={"name": "Room A", "capacity": 30})
    assert room_resp.status_code == 201

    schedule_resp = client.post("/api/v1/schedules", json={"name": "Max day load check"})
    assert schedule_resp.status_code == 201
    schedule_id = schedule_resp.json()["id"]

    generated = client.post(f"/api/v1/schedules/{schedule_id}/generate")
    assert generated.status_code == 200
    entries = generated.json()["entries"]
    assert len(entries) == 2
    assert all(e["teacher_id"] == teacher_id for e in entries)

    target_day = entries[0]["day_of_week"]
    moving_entry = next(e for e in entries if e["day_of_week"] != target_day)

    occupied_slots_target_day = {
        e["timeslot_id"] for e in entries if e["day_of_week"] == target_day and e["teacher_id"] == teacher_id
    }
    target_slot_id = next(ts["id"] for ts in slots if ts["id"] not in occupied_slots_target_day)

    move_resp = client.patch(
        f"/api/v1/schedules/{schedule_id}/entries/{moving_entry['id']}",
        json={"day_of_week": target_day, "timeslot_id": target_slot_id},
    )
    assert move_resp.status_code == 409
    assert "exceeds max hours per day" in move_resp.json()["detail"]

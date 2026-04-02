"""Basic API CRUD tests."""


def test_health(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


def test_create_and_list_teachers(client):
    resp = client.post("/api/v1/teachers", json={
        "name": "Alice",
        "email": "alice@school.dk",
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
        "start_time": "08:00:00",
        "end_time": "08:45:00",
        "label": "1st period",
    })
    assert resp.status_code == 201

    resp = client.get("/api/v1/timeslots")
    assert resp.status_code == 200
    assert len(resp.json()) == 1


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


def test_timeslot_with_period_type(client):
    resp = client.post("/api/v1/timeslots", json={
        "slot_index": 0,
        "start_time": "08:00:00",
        "end_time": "08:20:00",
        "label": "Læsebånd",
        "period_type": "reading",
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["period_type"] == "reading"


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
        "start_time": "08:00:00",
        "end_time": "08:45:00",
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
                "email": None,
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
                "start_time": "08:00:00",
                "end_time": "08:45:00",
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

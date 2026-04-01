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

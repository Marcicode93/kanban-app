import pytest
from fastapi.testclient import TestClient


def test_login_with_valid_credentials(client: TestClient) -> None:
    response = client.post(
        "/api/login", json={"username": "user", "password": "password"}
    )
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

    me = client.get("/api/auth/me")
    assert me.json() == {"authenticated": True, "username": "user"}


def test_login_with_invalid_credentials(client: TestClient) -> None:
    response = client.post(
        "/api/login", json={"username": "user", "password": "wrong"}
    )
    assert response.status_code == 401

    me = client.get("/api/auth/me")
    assert me.json() == {"authenticated": False, "username": None}


def test_logout_clears_session(client: TestClient) -> None:
    client.post("/api/login", json={"username": "user", "password": "password"})
    assert client.get("/api/auth/me").json()["authenticated"] is True

    client.post("/api/logout")
    assert client.get("/api/auth/me").json() == {
        "authenticated": False,
        "username": None,
    }


def test_protected_endpoint_requires_session(client: TestClient) -> None:
    assert client.get("/api/auth/user").status_code == 401

    client.post("/api/login", json={"username": "user", "password": "password"})
    response = client.get("/api/auth/user")
    assert response.status_code == 200
    assert response.json() == {"username": "user"}

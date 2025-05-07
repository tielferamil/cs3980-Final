from fastapi.testclient import TestClient
from main import app

def test_user_signup_and_login():
    test_credentials = {
        "username": "testuser",
        "password": "testpass123"
    }

    with TestClient(app) as client:
        # Signup
        signup_response = client.post("/signup", json=test_credentials)
        assert signup_response.status_code in [200, 400]

        # Login
        login_response = client.post("/login", json=test_credentials)
        assert login_response.status_code == 200
        data = login_response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

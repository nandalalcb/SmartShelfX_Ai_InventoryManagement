import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


class TestHealthEndpoint:
    def test_health_check(self):
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "OK"
        assert data["service"] == "SmartShelfX AI Service"


class TestPredictEndpoint:
    def test_predict_with_sufficient_data(self):
        """Test prediction with enough historical data for regression."""
        response = client.post("/predict", json={
            "product_id": 1,
            "daily_sales": [10, 12, 8, 15, 11, 9, 13, 14, 10, 12, 11, 9, 15, 13, 10],
            "current_stock": 50,
            "reorder_level": 20,
        })
        assert response.status_code == 200
        data = response.json()
        assert "predicted_demand" in data
        assert "risk_level" in data
        assert "suggested_reorder" in data
        assert "weekly_forecast" in data
        assert len(data["weekly_forecast"]) == 7
        assert data["risk_level"] in ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
        assert data["confidence"] > 0
        assert data["method"] == "linear_regression"

    def test_predict_with_minimal_data(self):
        """Test prediction with minimal data (moving average)."""
        response = client.post("/predict", json={
            "product_id": 2,
            "daily_sales": [10, 12, 8, 15, 11],
            "current_stock": 5,
            "reorder_level": 20,
        })
        assert response.status_code == 200
        data = response.json()
        assert data["method"] == "moving_average"
        assert data["risk_level"] in ["MEDIUM", "HIGH", "CRITICAL"]

    def test_predict_with_no_data(self):
        """Test prediction with empty sales data."""
        response = client.post("/predict", json={
            "product_id": 3,
            "daily_sales": [],
            "current_stock": 0,
            "reorder_level": 10,
        })
        assert response.status_code == 200
        data = response.json()
        assert data["method"] == "no_data"
        assert data["predicted_demand"] == 0
        assert data["risk_level"] in ["MEDIUM", "CRITICAL"]

    def test_predict_low_stock_high_demand(self):
        """Low stock with high historical demand should return HIGH/CRITICAL risk."""
        response = client.post("/predict", json={
            "product_id": 4,
            "daily_sales": [50, 60, 45, 55, 70, 65, 50, 60, 55, 45, 65, 70, 50, 55],
            "current_stock": 10,
            "reorder_level": 30,
        })
        assert response.status_code == 200
        data = response.json()
        assert data["risk_level"] in ["HIGH", "CRITICAL"]
        assert data["suggested_reorder"] > 0

    def test_predict_high_stock_low_demand(self):
        """High stock with low demand should return LOW risk."""
        response = client.post("/predict", json={
            "product_id": 5,
            "daily_sales": [2, 1, 3, 2, 1, 2, 3, 1, 2, 1, 3, 2, 1, 2],
            "current_stock": 500,
            "reorder_level": 10,
        })
        assert response.status_code == 200
        data = response.json()
        assert data["risk_level"] == "LOW"
        assert data["suggested_reorder"] == 0

    def test_predict_zero_stock(self):
        """Zero stock should always be CRITICAL."""
        response = client.post("/predict", json={
            "product_id": 6,
            "daily_sales": [10, 12, 8],
            "current_stock": 0,
            "reorder_level": 10,
        })
        assert response.status_code == 200
        data = response.json()
        assert data["risk_level"] == "CRITICAL"

    def test_batch_predict(self):
        """Test batch prediction endpoint."""
        response = client.post("/predict/batch", json=[
            {"product_id": 1, "daily_sales": [10, 12, 8], "current_stock": 50, "reorder_level": 20},
            {"product_id": 2, "daily_sales": [5, 3, 7], "current_stock": 5, "reorder_level": 10},
        ])
        assert response.status_code == 200
        data = response.json()
        assert "predictions" in data
        assert len(data["predictions"]) == 2

    def test_predict_very_few_data_points(self):
        """Test with just 1-2 data points."""
        response = client.post("/predict", json={
            "product_id": 7,
            "daily_sales": [10],
            "current_stock": 20,
            "reorder_level": 5,
        })
        assert response.status_code == 200
        data = response.json()
        assert data["method"] == "simple_average"

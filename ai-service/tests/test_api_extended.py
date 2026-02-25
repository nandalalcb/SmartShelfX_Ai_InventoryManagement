"""
SmartShelfX – Extended API Tests for AI Service
Tests: concurrency, large payloads, validation, edge cases, response times
"""
import pytest
import time
import threading
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


class TestValidation:
    def test_missing_product_id(self):
        """Should return 422 for missing required field."""
        response = client.post("/predict", json={
            "daily_sales": [10, 12, 8],
            "current_stock": 50,
            "reorder_level": 20,
        })
        assert response.status_code == 422

    def test_negative_current_stock(self):
        """Negative stock should still work (edge case)."""
        response = client.post("/predict", json={
            "product_id": 1,
            "daily_sales": [10, 12, 8],
            "current_stock": -5,
            "reorder_level": 10,
        })
        assert response.status_code == 200
        assert response.json()["risk_level"] == "CRITICAL"

    def test_zero_reorder_level(self):
        response = client.post("/predict", json={
            "product_id": 1,
            "daily_sales": [1, 2, 3],
            "current_stock": 10,
            "reorder_level": 0,
        })
        assert response.status_code == 200

    def test_empty_batch_request(self):
        response = client.post("/predict/batch", json=[])
        assert response.status_code == 200
        assert response.json()["predictions"] == []


class TestLargePayloads:
    def test_10000_data_points(self):
        """Should handle very large arrays without crashing."""
        import numpy as np
        data = list(np.random.uniform(1, 50, 10000).tolist())
        response = client.post("/predict", json={
            "product_id": 1,
            "daily_sales": data,
            "current_stock": 100,
            "reorder_level": 20,
        })
        assert response.status_code == 200
        assert response.json()["method"] == "linear_regression"

    def test_large_batch(self):
        """Batch with 50 products."""
        requests = [
            {
                "product_id": i,
                "daily_sales": [10 + i, 12 + i, 8 + i],
                "current_stock": 50,
                "reorder_level": 20,
            }
            for i in range(50)
        ]
        response = client.post("/predict/batch", json=requests)
        assert response.status_code == 200
        assert len(response.json()["predictions"]) == 50


class TestConcurrency:
    def test_10_concurrent_requests(self):
        """Simulate 10 simultaneous prediction calls."""
        results = []
        errors = []

        def make_request(pid):
            try:
                resp = client.post("/predict", json={
                    "product_id": pid,
                    "daily_sales": [10, 12, 8, 15, 11, 9, 13, 14, 10, 12, 11, 9, 15, 13],
                    "current_stock": 50,
                    "reorder_level": 20,
                })
                results.append(resp.status_code)
            except Exception as e:
                errors.append(str(e))

        threads = [threading.Thread(target=make_request, args=(i,)) for i in range(10)]
        for t in threads:
            t.start()
        for t in threads:
            t.join(timeout=10)

        assert len(errors) == 0, f"Errors: {errors}"
        assert all(code == 200 for code in results)


class TestResponseTime:
    def test_single_prediction_under_500ms(self):
        """Single prediction should complete in under 500ms."""
        start = time.time()
        response = client.post("/predict", json={
            "product_id": 1,
            "daily_sales": [10, 12, 8, 15, 11, 9, 13, 14, 10, 12, 11, 9, 15, 13],
            "current_stock": 50,
            "reorder_level": 20,
        })
        elapsed = (time.time() - start) * 1000
        assert response.status_code == 200
        assert elapsed < 500, f"Response took {elapsed:.0f}ms (limit: 500ms)"

    def test_batch_50_under_5s(self):
        """Batch of 50 products should complete in under 5s."""
        requests = [
            {
                "product_id": i,
                "daily_sales": list(range(1, 31)),
                "current_stock": 50,
                "reorder_level": 20,
            }
            for i in range(50)
        ]
        start = time.time()
        response = client.post("/predict/batch", json=requests)
        elapsed = time.time() - start
        assert response.status_code == 200
        assert elapsed < 5, f"Batch took {elapsed:.1f}s (limit: 5s)"


class TestEdgeCasesAPI:
    def test_all_zeros(self):
        response = client.post("/predict", json={
            "product_id": 1,
            "daily_sales": [0, 0, 0, 0, 0],
            "current_stock": 100,
            "reorder_level": 10,
        })
        assert response.status_code == 200
        assert response.json()["predicted_demand"] == 0

    def test_very_high_values(self):
        response = client.post("/predict", json={
            "product_id": 1,
            "daily_sales": [1000000, 1000001, 999999],
            "current_stock": 10,
            "reorder_level": 5,
        })
        assert response.status_code == 200
        assert response.json()["predicted_demand"] > 0

    def test_no_sales_zero_stock(self):
        """Both no data and zero stock."""
        response = client.post("/predict", json={
            "product_id": 1,
            "daily_sales": [],
            "current_stock": 0,
            "reorder_level": 10,
        })
        assert response.status_code == 200
        assert response.json()["risk_level"] in ["MEDIUM", "CRITICAL"]

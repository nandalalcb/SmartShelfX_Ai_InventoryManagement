"""
SmartShelfX – AI Forecaster Unit Tests
Tests: accuracy metrics (MAE/RMSE), all 4 method tiers, edge cases, risk/reorder calculations
"""
import pytest
import numpy as np
from models.forecaster import DemandForecaster

forecaster = DemandForecaster()


# ─── METHOD TIER SELECTION ────────────────────────────
class TestMethodSelection:
    def test_no_data_uses_no_data_method(self):
        result = forecaster.predict([], 50, 10)
        assert result["method"] == "no_data"
        assert result["predicted_demand"] == 0.0
        assert len(result["weekly_forecast"]) == 7

    def test_empty_list_uses_no_data_method(self):
        result = forecaster.predict([], 0, 10)
        assert result["method"] == "no_data"

    def test_1_point_uses_simple_average(self):
        result = forecaster.predict([10.0], 20, 5)
        assert result["method"] == "simple_average"

    def test_2_points_uses_simple_average(self):
        result = forecaster.predict([10.0, 20.0], 50, 10)
        assert result["method"] == "simple_average"

    def test_3_to_13_points_uses_moving_average(self):
        result = forecaster.predict([10, 12, 8, 15, 11], 50, 20)
        assert result["method"] == "moving_average"

    def test_14_plus_points_uses_linear_regression(self):
        data = [10, 12, 8, 15, 11, 9, 13, 14, 10, 12, 11, 9, 15, 13]
        result = forecaster.predict(data, 50, 20)
        assert result["method"] == "linear_regression"


# ─── RISK LEVEL CALCULATION ───────────────────────────
class TestRiskLevel:
    def test_zero_stock_is_critical(self):
        result = forecaster.predict([10, 12, 8], 0, 10)
        assert result["risk_level"] == "CRITICAL"

    def test_stock_below_half_demand_is_high(self):
        # Very high demand, very low stock
        data = [50, 60, 45, 55, 70, 65, 50, 60, 55, 45, 65, 70, 50, 55]
        result = forecaster.predict(data, 10, 30)
        assert result["risk_level"] in ["HIGH", "CRITICAL"]

    def test_high_stock_low_demand_is_low(self):
        data = [2, 1, 3, 2, 1, 2, 3, 1, 2, 1, 3, 2, 1, 2]
        result = forecaster.predict(data, 500, 10)
        assert result["risk_level"] == "LOW"

    def test_stock_at_reorder_level_is_medium(self):
        data = [5, 4, 6, 5, 4]
        result = forecaster.predict(data, 10, 10)
        assert result["risk_level"] in ["MEDIUM", "HIGH"]

    def test_no_data_low_stock_is_medium(self):
        result = forecaster.predict([], 5, 10)
        assert result["risk_level"] == "MEDIUM"

    def test_no_data_high_stock_is_low(self):
        result = forecaster.predict([], 100, 10)
        assert result["risk_level"] == "LOW"


# ─── REORDER CALCULATION ─────────────────────────────
class TestReorderCalculation:
    def test_well_stocked_needs_no_reorder(self):
        data = [2, 1, 3, 2, 1, 2, 3, 1, 2, 1, 3, 2, 1, 2]
        result = forecaster.predict(data, 500, 10)
        assert result["suggested_reorder"] == 0

    def test_low_stock_needs_reorder(self):
        data = [10, 12, 8, 15, 11, 9, 13, 14, 10, 12, 11, 9, 15, 13]
        result = forecaster.predict(data, 5, 20)
        assert result["suggested_reorder"] > 0

    def test_no_data_low_stock_suggests_reorder(self):
        result = forecaster.predict([], 5, 10)
        assert result["suggested_reorder"] > 0

    def test_no_data_high_stock_no_reorder(self):
        result = forecaster.predict([], 100, 10)
        assert result["suggested_reorder"] == 0


# ─── EDGE CASES ──────────────────────────────────────
class TestEdgeCases:
    def test_sudden_demand_spike(self):
        """Simulate a 10x spike in the last few days."""
        data = [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 50, 50, 50, 50]
        result = forecaster.predict(data, 30, 20)
        assert result["predicted_demand"] > 0
        assert result["risk_level"] in ["HIGH", "CRITICAL", "MEDIUM"]

    def test_seasonal_sinusoidal_pattern(self):
        """Simulate seasonal variation with sine wave."""
        data = [10 + 5 * np.sin(i * np.pi / 7) for i in range(30)]
        result = forecaster.predict(data, 50, 20)
        assert result["predicted_demand"] > 0
        assert len(result["weekly_forecast"]) == 7

    def test_flat_constant_demand(self):
        """Perfectly constant demand."""
        data = [10.0] * 30
        result = forecaster.predict(data, 50, 20)
        # Predicted demand should be close to 70 (10 * 7 days)
        assert abs(result["predicted_demand"] - 70) < 15

    def test_decreasing_trend(self):
        """Demand decreasing over time."""
        data = [50 - i for i in range(30)]
        result = forecaster.predict(data, 100, 20)
        assert result["predicted_demand"] >= 0

    def test_all_zeros(self):
        """Zero sales every day."""
        data = [0.0] * 20
        result = forecaster.predict(data, 100, 10)
        assert result["predicted_demand"] == 0.0

    def test_large_dataset_1000_points(self):
        """Performance: 1000 data points."""
        data = list(np.random.uniform(5, 20, 1000))
        result = forecaster.predict(data, 100, 20)
        assert result["method"] == "linear_regression"
        assert result["predicted_demand"] > 0

    def test_negative_predictions_clamped_to_zero(self):
        """Rapidly decreasing data should clamp predictions at 0."""
        data = [100 - 5 * i for i in range(30)]  # goes negative
        result = forecaster.predict(data, 50, 10)
        assert all(v >= 0 for v in result["weekly_forecast"])

    def test_single_very_large_value(self):
        result = forecaster.predict([100000.0], 10, 5)
        assert result["predicted_demand"] > 0
        assert result["suggested_reorder"] > 0

    def test_float_precision(self):
        """Ensure no float precision issues."""
        data = [0.1, 0.2, 0.3, 0.1, 0.2]
        result = forecaster.predict(data, 100, 10)
        assert isinstance(result["predicted_demand"], float)
        assert isinstance(result["confidence"], float)


# ─── ACCURACY METRICS ────────────────────────────────
class TestAccuracyMetrics:
    def test_linear_trend_mae(self):
        """For a perfectly linear trend, MAE should be very small."""
        # Create linear data: y = 10 + 0.5*x
        data = [10 + 0.5 * i for i in range(30)]
        result = forecaster.predict(data, 50, 20)

        # Expected next 7 days
        expected = [10 + 0.5 * i for i in range(30, 37)]
        predicted = result["weekly_forecast"]

        mae = np.mean(np.abs(np.array(expected) - np.array(predicted)))
        assert mae < 2.0, f"MAE too high for linear data: {mae}"

    def test_constant_data_rmse(self):
        """For constant data, RMSE should be near zero."""
        data = [15.0] * 30
        result = forecaster.predict(data, 100, 10)
        predicted = result["weekly_forecast"]

        rmse = np.sqrt(np.mean((np.array([15.0] * 7) - np.array(predicted)) ** 2))
        assert rmse < 1.0, f"RMSE too high for constant data: {rmse}"

    def test_confidence_bounds(self):
        """Confidence should always be between 0 and 1."""
        test_cases = [
            [],
            [5],
            [5, 10],
            [5, 10, 15, 8, 12],
            list(range(1, 31)),
        ]
        for data in test_cases:
            result = forecaster.predict(data, 50, 10)
            assert 0.0 <= result["confidence"] <= 1.0, (
                f"Confidence out of bounds: {result['confidence']} for len={len(data)}"
            )

    def test_weekly_forecast_length(self):
        """Weekly forecast must always have exactly 7 entries."""
        test_cases = [[], [5], [5, 10], [5, 10, 15, 8, 12], list(range(30))]
        for data in test_cases:
            result = forecaster.predict(data, 50, 10)
            assert len(result["weekly_forecast"]) == 7


# ─── OUTPUT SCHEMA VALIDATION ────────────────────────
class TestOutputSchema:
    def test_all_required_fields_present(self):
        data = [10, 12, 8, 15, 11, 9, 13, 14, 10, 12, 11, 9, 15, 13]
        result = forecaster.predict(data, 50, 20)
        required_keys = [
            "predicted_demand",
            "risk_level",
            "suggested_reorder",
            "weekly_forecast",
            "confidence",
            "method",
        ]
        for key in required_keys:
            assert key in result, f"Missing key: {key}"

    def test_types_correct(self):
        result = forecaster.predict([10, 12, 8], 50, 10)
        assert isinstance(result["predicted_demand"], (int, float))
        assert isinstance(result["risk_level"], str)
        assert isinstance(result["suggested_reorder"], (int, np.integer))
        assert isinstance(result["weekly_forecast"], list)
        assert isinstance(result["confidence"], float)
        assert isinstance(result["method"], str)

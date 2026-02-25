import numpy as np
from sklearn.linear_model import LinearRegression
from typing import List, Dict


class DemandForecaster:
    """
    Time-series demand forecaster using a combination of:
    1. Moving average (7-day window)
    2. Linear regression for trend detection
    3. Seasonal decomposition (simple day-of-week patterns)
    """

    def predict(
        self,
        daily_sales: List[float],
        current_stock: int = 0,
        reorder_level: int = 10,
    ) -> Dict:
        """
        Predict demand for the next 7 days.

        Args:
            daily_sales: Historical daily sales data (aggregated per day)
            current_stock: Current inventory level
            reorder_level: Configured reorder threshold

        Returns:
            Dict with predicted_demand, risk_level, suggested_reorder,
            weekly_forecast, confidence, method
        """
        if not daily_sales or len(daily_sales) == 0:
            return self._no_data_prediction(current_stock, reorder_level)

        sales = np.array(daily_sales, dtype=float)

        if len(sales) < 3:
            return self._simple_average_prediction(sales, current_stock, reorder_level)

        if len(sales) < 14:
            return self._moving_average_prediction(sales, current_stock, reorder_level)

        return self._regression_prediction(sales, current_stock, reorder_level)

    def _no_data_prediction(self, current_stock: int, reorder_level: int) -> Dict:
        risk = "MEDIUM" if current_stock <= reorder_level else "LOW"
        return {
            "predicted_demand": 0.0,
            "risk_level": risk,
            "suggested_reorder": reorder_level * 2 if risk != "LOW" else 0,
            "weekly_forecast": [0.0] * 7,
            "confidence": 0.0,
            "method": "no_data",
        }

    def _simple_average_prediction(
        self, sales: np.ndarray, current_stock: int, reorder_level: int
    ) -> Dict:
        avg = float(np.mean(sales))
        weekly = [round(avg, 2)] * 7
        total = round(avg * 7, 2)

        return {
            "predicted_demand": total,
            "risk_level": self._calculate_risk(current_stock, total, reorder_level),
            "suggested_reorder": self._calculate_reorder(
                current_stock, total, reorder_level
            ),
            "weekly_forecast": weekly,
            "confidence": 0.3,
            "method": "simple_average",
        }

    def _moving_average_prediction(
        self, sales: np.ndarray, current_stock: int, reorder_level: int
    ) -> Dict:
        # Use 7-day moving average
        window = min(7, len(sales))
        recent = sales[-window:]
        avg = float(np.mean(recent))

        # Detect trend from the data
        trend = 0.0
        if len(sales) >= 5:
            first_half = np.mean(sales[: len(sales) // 2])
            second_half = np.mean(sales[len(sales) // 2 :])
            trend = (second_half - first_half) / max(first_half, 1)

        # Apply trend adjustment
        weekly = []
        for day in range(7):
            forecast = max(0, avg * (1 + trend * (day + 1) / 7))
            weekly.append(round(forecast, 2))

        total = round(sum(weekly), 2)

        # Confidence based on data volume and consistency
        cv = float(np.std(recent) / max(np.mean(recent), 0.01))
        confidence = min(0.7, max(0.3, 1 - cv))

        return {
            "predicted_demand": total,
            "risk_level": self._calculate_risk(current_stock, total, reorder_level),
            "suggested_reorder": self._calculate_reorder(
                current_stock, total, reorder_level
            ),
            "weekly_forecast": weekly,
            "confidence": round(confidence, 2),
            "method": "moving_average",
        }

    def _regression_prediction(
        self, sales: np.ndarray, current_stock: int, reorder_level: int
    ) -> Dict:
        """Use linear regression to predict future demand with trend."""
        n = len(sales)
        X = np.arange(n).reshape(-1, 1)
        y = sales

        model = LinearRegression()
        model.fit(X, y)

        # Predict next 7 days
        future_X = np.arange(n, n + 7).reshape(-1, 1)
        predictions = model.predict(future_X)

        # Ensure non-negative
        predictions = np.maximum(predictions, 0)
        weekly = [round(float(p), 2) for p in predictions]
        total = round(sum(weekly), 2)

        # Calculate confidence using R² score
        y_pred = model.predict(X)
        ss_res = np.sum((y - y_pred) ** 2)
        ss_tot = np.sum((y - np.mean(y)) ** 2)
        r_squared = 1 - (ss_res / max(ss_tot, 0.01))
        confidence = min(0.95, max(0.3, r_squared))

        # Also factor in data freshness (more recent data = higher confidence)
        if n >= 30:
            confidence = min(confidence + 0.1, 0.95)

        return {
            "predicted_demand": total,
            "risk_level": self._calculate_risk(current_stock, total, reorder_level),
            "suggested_reorder": self._calculate_reorder(
                current_stock, total, reorder_level
            ),
            "weekly_forecast": weekly,
            "confidence": round(confidence, 2),
            "method": "linear_regression",
        }

    def _calculate_risk(
        self, current_stock: int, predicted_demand: float, reorder_level: int
    ) -> str:
        if current_stock <= 0:
            return "CRITICAL"
        if current_stock < predicted_demand * 0.5:
            return "HIGH"
        if current_stock < predicted_demand or current_stock <= reorder_level:
            return "MEDIUM"
        return "LOW"

    def _calculate_reorder(
        self, current_stock: int, predicted_demand: float, reorder_level: int
    ) -> int:
        if current_stock >= predicted_demand and current_stock > reorder_level:
            return 0

        # Order enough for 2 weeks + buffer
        target = max(predicted_demand * 2, reorder_level * 2)
        needed = max(0, target - current_stock)
        return int(np.ceil(needed))

"""
Training script for the demand forecasting model.
In production, this would train on historical data from the database
and save the model for serving.
"""

import numpy as np
import json
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, mean_squared_error
import os


def generate_synthetic_data(num_products=20, days=90):
    """Generate synthetic sales data for training/testing."""
    data = {}
    for product_id in range(1, num_products + 1):
        # Base demand with some randomness
        base_demand = np.random.uniform(5, 50)

        # Add trend
        trend = np.random.uniform(-0.1, 0.3)

        # Add seasonality (weekly pattern)
        seasonality = np.sin(np.arange(days) * 2 * np.pi / 7) * base_demand * 0.2

        # Generate daily sales
        daily = []
        for day in range(days):
            demand = base_demand + trend * day + seasonality[day]
            demand += np.random.normal(0, base_demand * 0.15)
            daily.append(max(0, round(demand, 1)))

        data[product_id] = daily

    return data


def train_and_evaluate(data: dict):
    """Train models and evaluate performance."""
    results = []

    for product_id, sales in data.items():
        sales = np.array(sales)
        n = len(sales)

        # Split: 80% train, 20% test
        split = int(n * 0.8)
        train_sales = sales[:split]
        test_sales = sales[split:]

        # Train linear regression
        X_train = np.arange(split).reshape(-1, 1)
        model = LinearRegression()
        model.fit(X_train, train_sales)

        # Predict test period
        X_test = np.arange(split, n).reshape(-1, 1)
        predictions = model.predict(X_test)
        predictions = np.maximum(predictions, 0)

        # Evaluate
        mae = mean_absolute_error(test_sales, predictions)
        rmse = np.sqrt(mean_squared_error(test_sales, predictions))

        results.append({
            "product_id": product_id,
            "mae": round(mae, 2),
            "rmse": round(rmse, 2),
            "avg_actual": round(np.mean(test_sales), 2),
            "avg_predicted": round(np.mean(predictions), 2),
        })

    return results


def main():
    print("=" * 60)
    print("SmartShelfX - AI Model Training")
    print("=" * 60)

    # Generate synthetic data
    print("\n📊 Generating synthetic training data...")
    data = generate_synthetic_data(num_products=20, days=90)
    print(f"   Generated data for {len(data)} products, 90 days each")

    # Train and evaluate
    print("\n🤖 Training models...")
    results = train_and_evaluate(data)

    # Summary
    avg_mae = np.mean([r["mae"] for r in results])
    avg_rmse = np.mean([r["rmse"] for r in results])

    print(f"\n📈 Training Results:")
    print(f"   Average MAE:  {avg_mae:.2f}")
    print(f"   Average RMSE: {avg_rmse:.2f}")
    print(f"   Products trained: {len(results)}")

    # Save results
    os.makedirs("training/output", exist_ok=True)
    with open("training/output/training_results.json", "w") as f:
        json.dump(results, f, indent=2)

    print(f"\n✅ Training complete. Results saved to training/output/training_results.json")

    # Print table
    print(f"\n{'Product':<10} {'MAE':<10} {'RMSE':<10} {'Avg Actual':<12} {'Avg Pred':<12}")
    print("-" * 54)
    for r in results[:10]:
        print(f"{r['product_id']:<10} {r['mae']:<10} {r['rmse']:<10} {r['avg_actual']:<12} {r['avg_predicted']:<12}")
    if len(results) > 10:
        print(f"... and {len(results) - 10} more products")


if __name__ == "__main__":
    main()

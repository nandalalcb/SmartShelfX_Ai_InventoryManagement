from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional
from models.forecaster import DemandForecaster

router = APIRouter()
forecaster = DemandForecaster()


class PredictionRequest(BaseModel):
    product_id: int
    daily_sales: List[float] = Field(default_factory=list)
    current_stock: Optional[int] = 0
    reorder_level: Optional[int] = 10


class PredictionResponse(BaseModel):
    predicted_demand: float
    risk_level: str
    suggested_reorder: int
    weekly_forecast: List[float]
    confidence: float
    method: str


@router.post("/predict", response_model=PredictionResponse)
def predict_demand(request: PredictionRequest):
    """
    Predict demand for the next 7 days based on historical daily sales data.

    - **product_id**: Product identifier
    - **daily_sales**: Array of aggregated daily sales quantities (chronological)
    - **current_stock**: Current stock level
    - **reorder_level**: Configured reorder threshold
    """
    try:
        result = forecaster.predict(
            daily_sales=request.daily_sales,
            current_stock=request.current_stock,
            reorder_level=request.reorder_level,
        )
        return PredictionResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")


@router.post("/predict/batch")
def predict_batch(requests: List[PredictionRequest]):
    """Batch prediction for multiple products."""
    results = []
    for req in requests:
        try:
            result = forecaster.predict(
                daily_sales=req.daily_sales,
                current_stock=req.current_stock,
                reorder_level=req.reorder_level,
            )
            results.append({"product_id": req.product_id, **result})
        except Exception as e:
            results.append({"product_id": req.product_id, "error": str(e)})
    return {"predictions": results}

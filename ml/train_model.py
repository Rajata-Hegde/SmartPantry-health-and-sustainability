import pandas as pd
import joblib

from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, r2_score

# =========================
# LOAD DATA
# =========================
df = pd.read_csv("ml/training_data.csv")

X = df.drop(columns=["risk_score"])
y = df["risk_score"]

# =========================
# TRAIN-TEST SPLIT
# =========================
X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.2,
    random_state=42
)

# =========================
# MODEL
# =========================
model = RandomForestRegressor(
    n_estimators=200,
    max_depth=8,
    random_state=42,
    n_jobs=-1
)

# =========================
# TRAIN
# =========================
model.fit(X_train, y_train)

# =========================
# EVALUATION
# =========================
preds = model.predict(X_test)

mae = mean_absolute_error(y_test, preds)
r2 = r2_score(y_test, preds)

print("Model Evaluation Results")
print("-" * 30)
print("MAE :", round(mae, 3))
print("R²  :", round(r2, 3))

# =========================
# FEATURE IMPORTANCE
# =========================
feature_importance = pd.Series(
    model.feature_importances_,
    index=X.columns
).sort_values(ascending=False)

print("\nFeature Importance")
print("-" * 30)
print(feature_importance)

# =========================
# SAVE MODEL + FEATURE ORDER
# =========================
joblib.dump(
    {
        "model": model,
        "features": list(X.columns),
        "mae": mae,
        "r2": r2
    },
    "food_risk_model_v1.pkl"
)

print("\n✅ Model, metrics & feature schema saved successfully")

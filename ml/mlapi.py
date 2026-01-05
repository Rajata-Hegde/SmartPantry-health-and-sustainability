from flask import Flask, request, jsonify
import pandas as pd
import joblib
import os

app = Flask(__name__)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "food_risk_model.pkl")

bundle = joblib.load(MODEL_PATH)

# Support either a saved bundle dict ({"model": ..., "features": [...]})
# or a plain estimator object saved directly.
if isinstance(bundle, dict):
    model = bundle.get("model", bundle)
    FEATURE_COLUMNS = bundle.get("features", bundle.get("feature_names", None))
else:
    model = bundle
    FEATURE_COLUMNS = None

# If features aren't present in the bundle, try estimator metadata.
if FEATURE_COLUMNS is None:
    if hasattr(model, "feature_names_in_"):
        FEATURE_COLUMNS = list(model.feature_names_in_)
    else:
        raise RuntimeError(
            "Feature list not found in model bundle; save features with the model or use an estimator with `feature_names_in_`."
        )

@app.route("/predict", methods=["POST"])
def predict():
    try:
        data = request.json

        if isinstance(data, dict):
            data = [data]

        df = pd.DataFrame(data)

        df = df.reindex(columns=FEATURE_COLUMNS, fill_value=0)

        preds = model.predict(df)

        return jsonify({
            "predictions": [round(float(p), 2) for p in preds]
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(port=8000, debug=True)

import json
import pandas as pd

# Load the Wolfram JSON file
with open("FoodCarbonFootprint.json", "r", encoding="utf-8") as f:
    data = json.load(f)

rows = []

for item in data:
    food_name = item.get("Name")
    co2e_range = item.get("CO2e")

    # Validate range format [[min, max]]
    if co2e_range and len(co2e_range[0]) == 2:
        min_co2, max_co2 = co2e_range[0]

        rows.append({
            "food": food_name,
            "min_co2e_per_kg": round(min_co2, 3),
            "max_co2e_per_kg": round(max_co2, 3)
        })

# Create DataFrame
df = pd.DataFrame(rows)

# Save to CSV
df.to_csv("food_carbon_footprint_range.csv", index=False)

print("✅ CSV generated successfully with CO₂e ranges")

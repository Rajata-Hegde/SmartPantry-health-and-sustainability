import csv
import random

OUTPUT_FILE = "training_data.csv"

NUM_ROWS = 120  # you can increase later

header = [
    "age", "bmi",
    "diabetes", "hypertension", "cardiac", "kidney",
    "metformin", "insulin", "warfarin", "statins",
    "calories", "sugar_g", "fat_g", "sodium_mg",
    "fiber_g", "protein_g", "potassium_mg",
    "warnings_count",
    "risk_score"
]

def generate_row():
    age = random.randint(55, 80)
    bmi = round(random.uniform(21, 32), 1)

    # Conditions
    diabetes = random.choice([0, 1])
    hypertension = random.choice([0, 1])
    cardiac = random.choice([0, 1])
    kidney = random.choice([0, 1])

    # Medicines (depend on conditions)
    metformin = 1 if diabetes else random.choice([0, 1])
    insulin = 1 if diabetes and random.random() < 0.3 else 0
    warfarin = 1 if cardiac and random.random() < 0.4 else 0
    statins = 1 if cardiac else random.choice([0, 1])

    # Nutrition values
    calories = random.randint(140, 320)
    sugar_g = round(random.uniform(2, 28), 1)
    fat_g = round(random.uniform(1, 12), 1)
    sodium_mg = random.randint(60, 950)
    fiber_g = round(random.uniform(0.5, 6), 1)
    protein_g = round(random.uniform(4, 12), 1)
    potassium_mg = random.randint(120, 400)

    # Warning logic
    warnings = 0
    if metformin and sugar_g > 15:
        warnings += 1
    if warfarin and random.random() < 0.5:
        warnings += 1
    if hypertension and sodium_mg > 500:
        warnings += 1

    # Risk score calculation (rule + noise)
    risk = 0.1
    risk += diabetes * (sugar_g / 30)
    risk += hypertension * (sodium_mg / 1200)
    risk += cardiac * (fat_g / 15)
    risk += kidney * (protein_g / 15)
    risk += warnings * 0.15
    risk += random.uniform(-0.05, 0.05)

    risk_score = round(min(max(risk, 0), 1), 2)

    return [
        age, bmi,
        diabetes, hypertension, cardiac, kidney,
        metformin, insulin, warfarin, statins,
        calories, sugar_g, fat_g, sodium_mg,
        fiber_g, protein_g, potassium_mg,
        warnings,
        risk_score
    ]


with open(OUTPUT_FILE, "w", newline="") as f:
    writer = csv.writer(f)
    writer.writerow(header)

    for _ in range(NUM_ROWS):
        writer.writerow(generate_row())

print(f"✅ Generated {NUM_ROWS} rows → {OUTPUT_FILE}")

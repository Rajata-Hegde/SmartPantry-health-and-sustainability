# app.py
from flask import Flask, request, jsonify, render_template, session
import os, psycopg2, requests, json, tempfile, random
from dotenv import load_dotenv
from ocr import ReceiptScanner
from datetime import datetime, timedelta
from groq import Groq
import auth  # Import the auth module

load_dotenv()
app = Flask(__name__)
app.secret_key = os.getenv("SECRET_KEY", "dev-secret-key-123")  # ← ADD THIS LINE

# Secret key for sessions (REQUIRED - add to .env: SECRET_KEY=your-secret-key)

# Initialize AI client
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

def get_conn():
    return psycopg2.connect(
        host=os.getenv("PGHOST"),
        port=os.getenv("PGPORT"),
        dbname=os.getenv("PGDATABASE"),
        user=os.getenv("PGUSER"),
        password=os.getenv("PGPASSWORD")
    )

API_KEY = os.getenv("SPOONACULAR_KEY")

# ============================================================
#                   NUTRITION MODULE (PROTECTED)
# ============================================================

@app.route("/nutrition", methods=["POST"])
@auth.login_required
def add_nutrition():
    """Add a nutrition entry for the current user"""
    data = request.json
    item = data.get("item_name")
    qty = data.get("quantity")
    unit = data.get("unit")

    # Get ingredient ID
    search_url = f"https://api.spoonacular.com/food/ingredients/search?query={item}&apiKey={API_KEY}"
    res = requests.get(search_url).json()
    if not res.get("results"):
        return jsonify({"error": "Item not found"}), 404

    item_id = res["results"][0]["id"]

    # Get nutrition info
    info_url = f"https://api.spoonacular.com/food/ingredients/{item_id}/information?amount={qty}&unit={unit}&apiKey={API_KEY}"
    info = requests.get(info_url).json()
    nutrients = {n["name"]: n["amount"] for n in info["nutrition"]["nutrients"]}

    # Save nutrition to database WITH USER ID
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO nutrition_entries (user_id, item_name, quantity, unit, calories, protein, fat, carbs, fiber, sugar, spoonacular_id, source_json)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING id;
    """, (
        auth.get_user_id(),  # Add user_id from session
        info["name"], qty, unit,
        nutrients.get("Calories") or 0,
        nutrients.get("Protein") or 0,
        nutrients.get("Fat") or 0,
        nutrients.get("Carbohydrates") or 0,
        nutrients.get("Fiber") or 0,
        nutrients.get("Sugar") or 0,
        item_id, json.dumps(info)
    ))
    new_id = cur.fetchone()[0]
    conn.commit()
    cur.close()
    conn.close()

    return jsonify({
        "message": "Data saved successfully",
        "id": new_id,
        "item": info["name"],
        "nutrition": nutrients
    })


@app.route("/nutrition", methods=["GET"])
@auth.login_required
def get_nutrition_entries():
    """Get nutrition entries for the current user"""
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("""
        SELECT id, item_name, quantity, unit, calories, protein, fat, carbs, fiber, sugar, created_at
        FROM nutrition_entries
        WHERE user_id = %s
        ORDER BY created_at DESC;
    """, (auth.get_user_id(),))
    rows = cur.fetchall()
    conn.close()

    data = [
        {
            "id": r[0],
            "item_name": r[1],
            "quantity": r[2],
            "unit": r[3],
            "calories": r[4],
            "protein": r[5],
            "fat": r[6],
            "carbs": r[7],
            "fiber": r[8],
            "sugar": r[9],
            "created_at": r[10].strftime("%Y-%m-%d %H:%M:%S")
        }
        for r in rows
    ]
    return jsonify(data)


@app.route("/nutrition/<int:id>", methods=["DELETE"])
@auth.login_required
def delete_entry(id):
    """Delete a nutrition entry (only if belongs to current user)"""
    conn = get_conn()
    cur = conn.cursor()
    # First check if entry belongs to user
    cur.execute("SELECT user_id FROM nutrition_entries WHERE id = %s", (id,))
    entry = cur.fetchone()
    
    if not entry:
        cur.close()
        conn.close()
        return jsonify({"error": "Entry not found"}), 404
    
    if entry[0] != auth.get_user_id():
        cur.close()
        conn.close()
        return jsonify({"error": "Unauthorized"}), 403
    
    cur.execute("DELETE FROM nutrition_entries WHERE id = %s;", (id,))
    conn.commit()
    cur.close()
    conn.close()
    return jsonify({"message": f"Entry {id} deleted successfully"})


@app.route("/nutrition/<int:id>", methods=["PUT"])
@auth.login_required
def update_entry(id):
    """Update a nutrition entry (only if belongs to current user)"""
    data = request.json
    new_quantity = data.get("quantity")
    new_unit = data.get("unit")

    conn = get_conn()
    cur = conn.cursor()
    # Check ownership
    cur.execute("SELECT user_id FROM nutrition_entries WHERE id = %s", (id,))
    entry = cur.fetchone()
    
    if not entry:
        cur.close()
        conn.close()
        return jsonify({"error": "Entry not found"}), 404
    
    if entry[0] != auth.get_user_id():
        cur.close()
        conn.close()
        return jsonify({"error": "Unauthorized"}), 403
    
    cur.execute("""
        UPDATE nutrition_entries
        SET quantity = %s, unit = %s
        WHERE id = %s;
    """, (new_quantity, new_unit, id))
    conn.commit()
    cur.close()
    conn.close()

    return jsonify({"message": f"Entry {id} updated successfully"})


# ============================================================
#                   NUTRITION INSIGHTS MODULE (PROTECTED)
# ============================================================

@app.route("/nutrition/insights/daily/<date>")
@auth.login_required
def get_daily_insights(date):
    """Get macronutrient breakdown for a specific day for current user"""
    conn = get_conn()
    cur = conn.cursor()
    
    try:
        # Get all nutrition entries for the day FOR CURRENT USER
        cur.execute("""
            SELECT 
                COALESCE(SUM(calories), 0) as total_calories,
                COALESCE(SUM(protein), 0) as total_protein,
                COALESCE(SUM(fat), 0) as total_fat,
                COALESCE(SUM(carbs), 0) as total_carbs,
                COALESCE(SUM(fiber), 0) as total_fiber,
                COALESCE(SUM(sugar), 0) as total_sugar,
                COUNT(*) as entry_count
            FROM nutrition_entries 
            WHERE DATE(created_at) = %s AND user_id = %s
        """, (date, auth.get_user_id()))
        
        result = cur.fetchone()
        
        if not result or result[6] == 0:  # entry_count is 0
            return jsonify({
                "date": date,
                "message": "No nutrition data for this date",
                "has_data": False
            })
        
        total_calories, protein_g, fat_g, carbs_g, fiber_g, sugar_g, entry_count = result
        
        # Calculate calorie contributions
        protein_cal = protein_g * 4
        fat_cal = fat_g * 9
        carbs_cal = carbs_g * 4
        
        total_cal_check = protein_cal + fat_cal + carbs_cal
        
        # Avoid division by zero
        if total_cal_check == 0:
            return jsonify({
                "date": date,
                "message": "Incomplete nutrition data",
                "has_data": False
            })
        
        # Calculate percentages
        protein_pct = round((protein_cal / total_cal_check) * 100, 1)
        fat_pct = round((fat_cal / total_cal_check) * 100, 1)
        carbs_pct = round((carbs_cal / total_cal_check) * 100, 1)
        
        # Calculate health grade
        grade, grade_color = calculate_health_grade(protein_pct, fat_pct, carbs_pct)
        
        return jsonify({
            "date": date,
            "has_data": True,
            "totals": {
                "calories": total_calories,
                "protein_g": protein_g,
                "fat_g": fat_g,
                "carbs_g": carbs_g,
                "fiber_g": fiber_g,
                "sugar_g": sugar_g,
                "entries": entry_count
            },
            "macronutrient_breakdown": {
                "protein": protein_pct,
                "fat": fat_pct,
                "carbs": carbs_pct
            },
            "health_grade": grade,
            "grade_color": grade_color,
            "interpretation": get_grade_interpretation(grade),
            "recommendations": get_recommendations(protein_pct, fat_pct, carbs_pct)
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        conn.close()


@app.route("/nutrition/insights/today")
@auth.login_required
def get_today_insights():
    """Get today's insights for current user"""
    today = datetime.now().strftime("%Y-%m-%d")
    return get_daily_insights(today)


@app.route("/nutrition/insights/weekly")
@auth.login_required
def get_weekly_insights():
    """Get insights for the last 7 days for current user"""
    conn = get_conn()
    cur = conn.cursor()
    
    try:
        # Get last 7 days of data FOR CURRENT USER
        cur.execute("""
            SELECT 
                DATE(created_at) as day,
                COALESCE(SUM(calories), 0) as daily_calories,
                COALESCE(SUM(protein), 0) as daily_protein,
                COALESCE(SUM(fat), 0) as daily_fat,
                COALESCE(SUM(carbs), 0) as daily_carbs
            FROM nutrition_entries 
            WHERE created_at >= CURRENT_DATE - 7 AND user_id = %s
            GROUP BY DATE(created_at)
            ORDER BY day DESC
        """, (auth.get_user_id(),))
        
        days_data = cur.fetchall()
        
        # Calculate averages FOR CURRENT USER
        cur.execute("""
            SELECT 
                AVG(calories) as avg_calories,
                AVG(protein) as avg_protein,
                AVG(fat) as avg_fat,
                AVG(carbs) as avg_carbs
            FROM nutrition_entries 
            WHERE created_at >= CURRENT_DATE - 7 AND user_id = %s
        """, (auth.get_user_id(),))
        
        averages = cur.fetchone()
        
        return jsonify({
            "period": "last_7_days",
            "days": [
                {
                    "date": day[0].strftime("%Y-%m-%d"),
                    "calories": day[1],
                    "protein": day[2],
                    "fat": day[3],
                    "carbs": day[4]
                } for day in days_data
            ],
            "averages": {
                "calories": round(averages[0] or 0),
                "protein": round(averages[1] or 0, 1),
                "fat": round(averages[2] or 0, 1),
                "carbs": round(averages[3] or 0, 1)
            }
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        conn.close()


def calculate_health_grade(protein_pct, fat_pct, carbs_pct):
    """Calculate A-F grade based on nutrition balance"""
    score = 0
    
    # Protein check (ideal: 20-30%)
    if 20 <= protein_pct <= 30:
        score += 2
    elif 15 <= protein_pct < 20 or 30 < protein_pct <= 35:
        score += 1
    
    # Fat check (ideal: 25-35%)
    if 25 <= fat_pct <= 35:
        score += 2
    elif 20 <= fat_pct < 25 or 35 < fat_pct <= 40:
        score += 1
    
    # Carbs check (ideal: 40-50%)
    if 40 <= carbs_pct <= 50:
        score += 2
    elif 35 <= carbs_pct < 40 or 50 < carbs_pct <= 55:
        score += 1
    
    # Convert to grade
    if score >= 5:
        return "A", "#4CAF50"  # Green
    elif score >= 4:
        return "B", "#8BC34A"  # Light green
    elif score >= 3:
        return "C", "#FFC107"  # Yellow
    elif score >= 2:
        return "D", "#FF9800"  # Orange
    else:
        return "F", "#F44336"  # Red


def get_grade_interpretation(grade):
    interpretations = {
        "A": "Excellent balance! Your macronutrients are well distributed.",
        "B": "Good balance with minor adjustments needed.",
        "C": "Fair. Consider adjusting your protein/carb/fat ratios.",
        "D": "Needs improvement. Try to balance your meals better.",
        "F": "Poor balance. Focus on getting more protein and healthy fats."
    }
    return interpretations.get(grade, "No data available")


def get_recommendations(protein_pct, fat_pct, carbs_pct):
    """Generate specific recommendations based on macros"""
    recommendations = []
    
    if protein_pct < 20:
        recommendations.append("Increase protein intake with eggs, chicken, fish, or lentils")
    elif protein_pct > 35:
        recommendations.append("Slightly high protein. Good for muscle building!")
    
    if fat_pct < 20:
        recommendations.append("Add healthy fats like avocados, nuts, or olive oil")
    elif fat_pct > 40:
        recommendations.append("Consider reducing fried foods and processed fats")
    
    if carbs_pct < 40:
        recommendations.append("Include more whole grains, fruits, and vegetables")
    elif carbs_pct > 60:
        recommendations.append("Try swapping some carbs for protein-rich foods")
    
    if not recommendations:
        recommendations.append("Great balance! Maintain this macronutrient distribution")
    
    return recommendations


# ============================================================
#                   AI NUTRITION ADVISOR MODULE (PROTECTED)
# ============================================================

def get_date_range(period, custom_start=None, custom_end=None):
    """Calculate date range based on selected period"""
    now = datetime.now()
    
    if period == "today":
        start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
        end_date = now
    
    elif period == "1":  # Last 1 day (yesterday)
        start_date = (now - timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
        end_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
    
    elif period == "3":  # Last 3 days
        start_date = now - timedelta(days=3)
        end_date = now
    
    elif period == "7":  # Last 7 days
        start_date = now - timedelta(days=7)
        end_date = now
    
    elif period == "30":  # Last 30 days
        start_date = now - timedelta(days=30)
        end_date = now
    
    elif period == "custom" and custom_start and custom_end:
        try:
            start_date = datetime.strptime(custom_start, "%Y-%m-%d")
            end_date = datetime.strptime(custom_end, "%Y-%m-%d")
            end_date = end_date.replace(hour=23, minute=59, second=59)
        except:
            # Default to today if parsing fails
            start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
            end_date = now
    
    else:
        # Default to today
        start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
        end_date = now
    
    return start_date, end_date

@app.route("/get-ai-analysis", methods=["POST"])
@auth.login_required
def get_ai_analysis():
    """Get full AI nutrition analysis for current user"""
    try:
        data = request.json
        period = data.get('period', 'today')
        custom_start = data.get('custom_start')
        custom_end = data.get('custom_end')
        
        # Get date range
        start_date, end_date = get_date_range(period, custom_start, custom_end)
        
        # Query database for nutrition data in this date range FOR CURRENT USER
        conn = get_conn()
        cur = conn.cursor()
        
        cur.execute("""
            SELECT 
                item_name,
                quantity,
                unit,
                calories,
                protein,
                fat,
                carbs,
                fiber,
                sugar,
                created_at
            FROM nutrition_entries 
            WHERE created_at BETWEEN %s AND %s AND user_id = %s
            ORDER BY created_at DESC
        """, (start_date, end_date, auth.get_user_id()))
        
        rows = cur.fetchall()
        conn.close()
        
        if not rows:
            return jsonify({
                "success": False,
                "error": "No nutrition data found for the selected period",
                "message": "Add some food entries first!",
                "date_range": f"{start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}"
            })
        
        # Calculate totals
        total_calories = sum(row[3] for row in rows)
        total_protein = sum(row[4] for row in rows)
        total_fat = sum(row[5] for row in rows)
        total_carbs = sum(row[6] for row in rows)
        total_fiber = sum(row[7] for row in rows)
        total_sugar = sum(row[8] for row in rows)
        
        # Prepare prompt for AI
        foods_list = "\n".join([f"- {row[0]} ({row[1]} {row[2]}): {row[3]} cal, P:{row[4]}g, F:{row[5]}g, C:{row[6]}g" for row in rows[:10]])
        if len(rows) > 10:
            foods_list += f"\n... and {len(rows)-10} more items"
        
        prompt = f"""
        Analyze this nutrition data from {start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}:
        
        PERIOD: {period}
        TOTAL ENTRIES: {len(rows)}
        
        TOTALS:
        - Calories: {total_calories:.0f}
        - Protein: {total_protein:.1f}g
        - Fat: {total_fat:.1f}g
        - Carbohydrates: {total_carbs:.1f}g
        - Fiber: {total_fiber:.1f}g
        - Sugar: {total_sugar:.1g}
        
        FOOD ITEMS:
        {foods_list}
        
        Please provide:
        1. Overall nutrition score (0-100)
        2. 2-3 key observations about eating patterns
        3. Strengths of this diet
        4. Areas for improvement
        5. 3 specific, actionable recommendations
        6. Sample meal plan for tomorrow
        
        Keep response practical, evidence-based, and encouraging.
        """
        
        # Call AI API
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": "You are an expert nutrition coach with 10+ years experience. Provide detailed, actionable advice."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=800
        )
        
        analysis = response.choices[0].message.content
        
        return jsonify({
            "success": True,
            "analysis": analysis,
            "period": period,
            "date_range": f"{start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}",
            "stats": {
                "total_entries": len(rows),
                "total_calories": total_calories,
                "avg_calories_per_day": total_calories / max(1, (end_date - start_date).days + 1),
                "protein": total_protein,
                "fat": total_fat,
                "carbs": total_carbs
            }
        })
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e),
            "message": "Please make sure you have set up your AI API key in the .env file"
        })

@app.route("/get-quick-tip", methods=["POST"])
@auth.login_required
def get_quick_tip():
    """Get quick nutrition tip for current user"""
    try:
        data = request.json
        period = data.get('period', 'today')
        
        # Get data for the period to make tip relevant
        start_date, end_date = get_date_range(period)
        
        conn = get_conn()
        cur = conn.cursor()
        cur.execute("""
            SELECT item_name, calories, protein, sugar
            FROM nutrition_entries 
            WHERE created_at BETWEEN %s AND %s AND user_id = %s
            ORDER BY created_at DESC
            LIMIT 5
        """, (start_date, end_date, auth.get_user_id()))
        
        recent_foods = cur.fetchall()
        conn.close()
        
        if recent_foods:
            foods_text = ", ".join([f"{row[0]}" for row in recent_foods])
            prompt = f"Based on eating {foods_text} recently, give me one specific, actionable nutrition tip."
        else:
            prompt = "Give me one practical, general nutrition tip for someone starting to track their diet."
        
        # Call AI for a quick tip
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": "You are a nutrition coach. Give one concise, practical tip."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=100
        )
        
        tip = response.choices[0].message.content.strip()
        
        return jsonify({
            "success": True,
            "tip": tip,
            "period": period,
            "has_recent_data": bool(recent_foods)
        })
        
    except Exception as e:
        # Fallback to local tips if AI fails
        local_tips = [
            "Drink a glass of water before each meal to aid digestion and prevent overeating.",
            "Include a protein source in every meal to help you stay full longer and maintain muscle.",
            "Aim for 5 different colored fruits/vegetables daily for a variety of nutrients.",
            "Try to finish eating 2-3 hours before bedtime for better sleep and digestion.",
            "Chew your food thoroughly - aim for 20-30 chews per bite to improve digestion."
        ]
        return jsonify({
            "success": True,
            "tip": random.choice(local_tips),
            "source": "local_fallback",
            "error": str(e)[:100] if str(e) else None
        })

# ============================================================
#                   OCR & RECEIPT MODULE (PROTECTED)
# ============================================================

@app.route("/run_ocr", methods=["POST"])
@auth.login_required
def run_ocr():
    """Process receipt image and extract data using OCR"""
    if "image" not in request.files:
        return jsonify({"error": "No image uploaded"}), 400

    img = request.files["image"]

    with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as tmp:
        img.save(tmp.name)
        scanner = ReceiptScanner(tmp.name)
        scanner.scan()

        return jsonify({
            "store_name": scanner.store_name,
            "bill_number": scanner.bill_number,
            "date": scanner.date,
            "total_amount": scanner.total_amount,
            "items": scanner.items
        })


# ============================================================
#            RECEIPT OCR STORAGE MODULE (PROTECTED)
# ============================================================

def save_receipt_to_db(store_name, bill_number, receipt_date, total_amount, items):
    conn = get_conn()
    cur = conn.cursor()

    # Insert main receipt WITH USER ID
    cur.execute("""
        INSERT INTO receipts (user_id, store_name, bill_number, receipt_date, total_amount)
        VALUES (%s, %s, %s, %s, %s)
        RETURNING id;
    """, (auth.get_user_id(), store_name, bill_number, receipt_date, total_amount))

    receipt_id = cur.fetchone()[0]

    # Insert item lines
    for item in items:
        cur.execute("""
            INSERT INTO receipt_items (receipt_id, item_name, quantity, unit_price, total_price)
            VALUES (%s, %s, %s, %s, %s)
        """, (
            receipt_id,
            item["item"],
            item["quantity"],
            item["unit_price"],
            item["total"]
        ))

    conn.commit()
    cur.close()
    conn.close()

    return receipt_id


@app.route("/receipt", methods=["POST"])
@auth.login_required
def add_receipt():
    data = request.json

    receipt_id = save_receipt_to_db(
        data.get("store_name"),
        data.get("bill_number"),
        data.get("date"),
        data.get("total_amount"),
        data.get("items")
    )

    return jsonify({"message": "Receipt stored", "receipt_id": receipt_id})


@app.route("/receipt", methods=["GET"])
@auth.login_required
def get_receipts():
    conn = get_conn()
    cur = conn.cursor()

    cur.execute("""
        SELECT id, store_name, bill_number, receipt_date, total_amount, created_at
        FROM receipts 
        WHERE user_id = %s
        ORDER BY created_at DESC;
    """, (auth.get_user_id(),))

    rows = cur.fetchall()
    cur.close()
    conn.close()

    receipts = [
        {
            "id": r[0],
            "store_name": r[1],
            "bill_number": r[2],
            "receipt_date": r[3].strftime("%Y-%m-%d") if r[3] else None,
            "total_amount": float(r[4]),
            "created_at": r[5].strftime("%Y-%m-d %H:%M:%S")
        }
        for r in rows
    ]

    return jsonify(receipts)


@app.route("/receipt/<int:receipt_id>/items", methods=["GET"])
@auth.login_required
def get_receipt_items(receipt_id):
    conn = get_conn()
    cur = conn.cursor()

    # First check if receipt belongs to user
    cur.execute("SELECT user_id FROM receipts WHERE id = %s", (receipt_id,))
    receipt = cur.fetchone()
    
    if not receipt:
        cur.close()
        conn.close()
        return jsonify({"error": "Receipt not found"}), 404
    
    if receipt[0] != auth.get_user_id():
        cur.close()
        conn.close()
        return jsonify({"error": "Unauthorized"}), 403

    cur.execute("""
        SELECT item_name, quantity, unit_price, total_price
        FROM receipt_items WHERE receipt_id = %s
    """, (receipt_id,))

    rows = cur.fetchall()
    cur.close()
    conn.close()

    items = [
        {
            "item_name": r[0],
            "quantity": float(r[1]),
            "unit_price": float(r[2]),
            "total_price": float(r[3])
        }
        for r in rows
    ]

    return jsonify(items)


# ============================================================
#                     HOME ROUTES
# ============================================================

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/login_page")
def login_page():
    return render_template("login.html")

@app.route("/nutrition_page")
def nutrition_page():
    return render_template("nutrition.html")

@app.route("/receipt_page")
def receipt_page():
    return render_template("scan_receipt.html")

@app.route('/forgot-password-page')
def forgot_password_page():
    return render_template('forgot_password.html')

@app.route('/reset-password-page')
def reset_password_page():
    token = request.args.get('token', '')
    return render_template('reset_password.html', token=token)


if __name__ == "__main__":
    # Initialize authentication routes
    auth.init_auth_routes(app)
    
    app.run(debug=True, port=5000)
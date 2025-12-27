# auth.py
import os
import bcrypt
import secrets
from flask import session, jsonify, request
from functools import wraps
from datetime import datetime, timedelta

def login_required(f):
    """Decorator to protect routes"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({"error": "Authentication required"}), 401
        return f(*args, **kwargs)
    return decorated_function

def get_user_id():
    """Helper to get current user ID from session"""
    return session.get('user_id')

def get_current_user():
    """Get current user info"""
    if 'user_id' in session:
        return {
            'id': session.get('user_id'),
            'name': session.get('user_name'),
            'email': session.get('user_email')
        }
    return None

def init_auth_routes(app):
    """Initialize authentication routes on the Flask app"""
    
    @app.route('/register', methods=['POST'])
    def register():
        """Register a new user"""
        try:
            data = request.json
            name = data.get('name')
            email = data.get('email')
            password = data.get('password')
            
            # Validate input
            if not all([name, email, password]):
                return jsonify({"error": "Missing required fields"}), 400
            
            if len(password) < 6:
                return jsonify({"error": "Password must be at least 6 characters"}), 400
            
            from app import get_conn
            conn = get_conn()
            cur = conn.cursor()
            
            # Check if user already exists
            cur.execute("SELECT user_id FROM \"User\" WHERE email = %s", (email,))
            if cur.fetchone():
                cur.close()
                conn.close()
                return jsonify({"error": "Email already registered"}), 409
            
            # Hash password
            password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            
            # Insert new user
            cur.execute("""
                INSERT INTO "User" (name, email, password_hash, created_at)
                VALUES (%s, %s, %s, NOW()) RETURNING user_id
            """, (name, email, password_hash))
            
            user_id = cur.fetchone()[0]
            conn.commit()
            cur.close()
            conn.close()
            
            return jsonify({
                "success": True,
                "message": "User registered successfully",
                "user_id": user_id
            }), 201
            
        except Exception as e:
            return jsonify({"success": False, "error": str(e)}), 500

    @app.route('/login', methods=['POST'])
    def login():
        """Authenticate user and create session"""
        try:
            data = request.json
            email = data.get('email')
            password = data.get('password')
            
            if not all([email, password]):
                return jsonify({"error": "Missing email or password"}), 400
            
            from app import get_conn
            conn = get_conn()
            cur = conn.cursor()
            
            # Get user by email
            cur.execute("""
                SELECT user_id, name, email, password_hash 
                FROM "User" WHERE email = %s
            """, (email,))
            
            user = cur.fetchone()
            
            if not user:
                cur.close()
                conn.close()
                return jsonify({"error": "Invalid email or password"}), 401
            
            user_id, name, email, stored_hash = user
            
            # Verify password
            if bcrypt.checkpw(password.encode('utf-8'), stored_hash.encode('utf-8')):
                # Create session
                session['user_id'] = user_id
                session['user_name'] = name
                session['user_email'] = email
                
                # Update last login
                cur.execute("UPDATE \"User\" SET last_login = NOW() WHERE user_id = %s", (user_id,))
                conn.commit()
                cur.close()
                conn.close()
                
                return jsonify({
                    "success": True,
                    "message": "Login successful",
                    "user": {"id": user_id, "name": name, "email": email}
                })
            else:
                cur.close()
                conn.close()
                return jsonify({"success": False, "error": "Invalid email or password"}), 401
                
        except Exception as e:
            return jsonify({"success": False, "error": str(e)}), 500

    @app.route('/logout', methods=['POST'])
    def logout():
        """Clear user session"""
        session.clear()
        return jsonify({"success": True, "message": "Logged out successfully"})

    @app.route('/check-auth')
    def check_auth():
        """Check if user is authenticated"""
        if 'user_id' in session:
            return jsonify({
                "authenticated": True,
                "user": {
                    "id": session['user_id'],
                    "name": session['user_name'],
                    "email": session['user_email']
                }
            })
        return jsonify({"authenticated": False}), 401

    @app.route('/api/current-user')
    def get_current_user_route():
        """Get current user info"""
        user = get_current_user()
        if user:
            return jsonify(user)
        return jsonify({"error": "Not authenticated"}), 401

    # ============================================================
    #                   PASSWORD RESET FUNCTIONALITY
    # ============================================================

    @app.route('/forgot-password', methods=['POST'])
    def forgot_password():
        """Send password reset email"""
        try:
            data = request.json
            email = data.get('email')
            
            if not email:
                return jsonify({"error": "Email is required"}), 400
            
            from app import get_conn
            conn = get_conn()
            cur = conn.cursor()
            
            # Check if user exists
            cur.execute('SELECT user_id, name FROM "User" WHERE email = %s', (email,))
            user = cur.fetchone()
            
            if not user:
                cur.close()
                conn.close()
                # Don't reveal if user exists (security)
                return jsonify({
                    "success": True, 
                    "message": "If an account exists with this email, you'll receive a reset link"
                })
            
            user_id, name = user
            
            # Generate secure token (valid for 1 hour)
            reset_token = secrets.token_urlsafe(32)
            expiry_time = datetime.now() + timedelta(hours=1)
            
            # Save token to database
            cur.execute('''
                UPDATE "User" 
                SET reset_token = %s, reset_token_expiry = %s
                WHERE user_id = %s
            ''', (reset_token, expiry_time, user_id))
            
            conn.commit()
            cur.close()
            conn.close()
            
            # For development: print token to console
            print("\n" + "="*60)
            print("🔐 PASSWORD RESET TOKEN (Development Mode)")
            print("="*60)
            print(f"User: {name} ({email})")
            print(f"Token: {reset_token}")
            print(f"Expires: {expiry_time}")
            print("="*60 + "\n")
            
            return jsonify({
                "success": True,
                "message": "Password reset link sent to your email",
                "demo_token": reset_token  # For development only
            })
                
        except Exception as e:
            return jsonify({"success": False, "error": str(e)}), 500

    @app.route('/reset-password', methods=['POST'])
    def reset_password():
        """Reset password using token"""
        try:
            data = request.json
            token = data.get('token')
            new_password = data.get('new_password')
            
            if not all([token, new_password]):
                return jsonify({"error": "Token and new password are required"}), 400
            
            if len(new_password) < 6:
                return jsonify({"error": "Password must be at least 6 characters"}), 400
            
            from app import get_conn
            conn = get_conn()
            cur = conn.cursor()
            
            # Find user with valid token
            cur.execute('''
                SELECT user_id FROM "User" 
                WHERE reset_token = %s 
                AND reset_token_expiry > NOW()
            ''', (token,))
            
            user = cur.fetchone()
            
            if not user:
                cur.close()
                conn.close()
                return jsonify({"error": "Invalid or expired reset token"}), 400
            
            user_id = user[0]
            
            # Hash new password
            new_password_hash = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            
            # Update password and clear reset token
            cur.execute('''
                UPDATE "User" 
                SET password_hash = %s, 
                    reset_token = NULL,
                    reset_token_expiry = NULL
                WHERE user_id = %s
            ''', (new_password_hash, user_id))
            
            conn.commit()
            cur.close()
            conn.close()
            
            return jsonify({
                "success": True,
                "message": "Password reset successful. Please login with your new password."
            })
            
        except Exception as e:
            return jsonify({"success": False, "error": str(e)}), 500

    @app.route('/change-password', methods=['POST'])
    @login_required
    def change_password():
        """Change password for logged-in user"""
        try:
            data = request.json
            current_password = data.get('current_password')
            new_password = data.get('new_password')
            
            if not all([current_password, new_password]):
                return jsonify({"error": "Current and new password are required"}), 400
            
            if len(new_password) < 6:
                return jsonify({"error": "New password must be at least 6 characters"}), 400
            
            from app import get_conn
            conn = get_conn()
            cur = conn.cursor()
            
            # Get current user's password hash
            cur.execute('SELECT password_hash FROM "User" WHERE user_id = %s', (session['user_id'],))
            result = cur.fetchone()
            
            if not result:
                cur.close()
                conn.close()
                return jsonify({"error": "User not found"}), 404
            
            stored_hash = result[0]
            
            # Verify current password
            if not bcrypt.checkpw(current_password.encode('utf-8'), stored_hash.encode('utf-8')):
                cur.close()
                conn.close()
                return jsonify({"error": "Current password is incorrect"}), 401
            
            # Hash new password
            new_password_hash = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            
            # Update password
            cur.execute('UPDATE "User" SET password_hash = %s WHERE user_id = %s', 
                       (new_password_hash, session['user_id']))
            
            conn.commit()
            cur.close()
            conn.close()
            
            return jsonify({
                "success": True,
                "message": "Password changed successfully"
            })
            
        except Exception as e:
            return jsonify({"success": False, "error": str(e)}), 500
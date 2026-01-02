import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { logout, getUser } from '../auth'

export default function NavBar() {
  const navigate = useNavigate()
  const user = getUser()

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="navbar">
      <div className="nav-inner container">

        {/* BRAND */}
        <div className="brand-row">
          <div className="brand-small">
            SmartPantry<span className="accent">AI</span>
          </div>
        </div>

        {/* NAV LINKS */}
        <nav className="nav-links">
          <NavLink to="/" className="nav-link">
            Dashboard
          </NavLink>
          <NavLink to="/pantry" className="nav-link">
            Pantry
          </NavLink>
          <NavLink to="/nutrition" className="nav-link">
            Nutrition
          </NavLink>
          <NavLink to="/profiles" className="nav-link">
            Profiles
          </NavLink>
          <NavLink to="/scanner" className="nav-link">
            Scanner
          </NavLink>
        </nav>

        {/* USER ACTIONS */}
        <div className="nav-actions">
          <div className="user-chip">
            👋 {user?.name || 'User'}
          </div>
          <button className="btn outline" onClick={handleLogout}>
            Logout
          </button>
        </div>

      </div>
    </header>
  )
}

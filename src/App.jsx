import React from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'

import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'

import Profiles from './pages/Profiles'
import ReceiptScanner from './pages/ReceiptScanner'
import Pantry from './pages/Pantry'
import Dashboard from './pages/Dashboard'
import NutritionTracker from './pages/NutritionTracker'
import RecipeDetails from './pages/RecipeDetails'

import { isAuthenticated } from './auth'

// 🔐 Auth guard
function Protected({ children }) {
  const location = useLocation()
  if (!isAuthenticated()) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }
  return children
}

export default function App() {
  return (
    <Routes>

      {/* ========= PUBLIC ROUTES ========= */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* ========= PROTECTED ROUTES ========= */}
      <Route
        path="/"
        element={
          <Protected>
            <Dashboard />
          </Protected>
        }
      />

      <Route
        path="/profiles"
        element={
          <Protected>
            <Profiles />
          </Protected>
        }
      />

      <Route
        path="/scanner"
        element={
          <Protected>
            <ReceiptScanner />
          </Protected>
        }
      />

      <Route
        path="/nutrition"
        element={
          <Protected>
            <NutritionTracker />
          </Protected>
        }
      />

      <Route
        path="/pantry"
        element={
          <Protected>
            <Pantry />
          </Protected>
        }
      />

      <Route
        path="/recipes/:id"
        element={
          <Protected>
            <RecipeDetails />
          </Protected>
        }
      />

      {/* ========= FALLBACK ========= */}
      <Route path="*" element={<Navigate to="/login" replace />} />

    </Routes>
  )
}

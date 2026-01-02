import React from 'react'
import { useNavigate } from 'react-router-dom'
import NavBar from '../components/NavBar'
import { getUser } from '../auth'

import {
  UserIcon,
  NutritionIcon,
  ReceiptIcon,
  PantryIcon
} from '../components/Icons'

const features = [
  {
    key: 'pantry',
    title: 'Smart Pantry',
    desc: 'Manage groceries, track inventory, and generate recipes using available items.',
    icon: <PantryIcon />,
    path: '/pantry'
  },
  {
    key: 'nutrition',
    title: 'Nutrition Tracker',
    desc: 'Monitor calories, nutrients, and diet suitability for health conditions.',
    icon: <NutritionIcon />,
    path: '/nutrition'
  },
  {
    key: 'profiles',
    title: 'Elderly Profiles',
    desc: 'Manage elderly health profiles, conditions, and dietary preferences.',
    icon: <UserIcon />,
    path: '/profiles'
  },
  {
    key: 'scanner',
    title: 'Receipt Scanner',
    desc: 'Scan grocery receipts to auto-add items into the pantry.',
    icon: <ReceiptIcon />,
    path: '/scanner'
  }
]

export default function Dashboard() {
  const navigate = useNavigate()
  const user = getUser()

  return (
    <div>
      <NavBar />

      <main className="container">
        <div className="stack">

          {/* HERO / WELCOME */}
          <div className="card wide hero">
            <h2>
              Welcome back{user?.name ? `, ${user.name}` : ''} 👋
            </h2>
            <p className="muted">
              Your AI-powered pantry, nutrition & elderly health management system
            </p>
          </div>

          {/* FEATURE GRID */}
          <section className="feature-grid">
            {features.map((f) => (
              <article
                key={f.key}
                className="card feature-card"
                onClick={() => navigate(f.path)}
                style={{ cursor: 'pointer' }}
              >
                <div className="feature-top">
                  <div className="icon-wrap">{f.icon}</div>
                  <div>
                    <h3 style={{ margin: '0 0 6px 0' }}>{f.title}</h3>
                    <p className="muted" style={{ margin: 0, fontSize: 14 }}>
                      {f.desc}
                    </p>
                  </div>
                </div>

                <div className="card-actions">
                  <button className="btn primary">
                    Open
                  </button>
                </div>
              </article>
            ))}
          </section>

        </div>
      </main>
    </div>
  )
}

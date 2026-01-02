import React from 'react'

export function UserIcon({ className = '' }) {
  return (
    <svg className={className} width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path d="M12 12c2.761 0 5-2.239 5-5s-2.239-5-5-5-5 2.239-5 5 2.239 5 5 5z" fill="#3b4850" opacity="0.95" />
      <path d="M4 20c0-3.314 2.686-6 6-6h4c3.314 0 6 2.686 6 6v1H4v-1z" fill="#556270" opacity="0.85" />
    </svg>
  )
}

export function NutritionIcon({ className = '' }) {
  return (
    <svg className={className} width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path d="M3 3h18v2H3z" fill="#6b7780" opacity="0.9" />
      <path d="M7 7h10v10a5 5 0 01-10 0V7z" fill="#3b4850" opacity="0.95" />
      <circle cx="12" cy="11" r="2" fill="#fff" opacity="0.08" />
    </svg>
  )
}

export function ReceiptIcon({ className = '' }) {
  return (
    <svg className={className} width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path d="M6 2h12v20l-3-2-3 2-3-2-3 2V2z" fill="#556270" opacity="0.95" />
      <rect x="8" y="6" width="8" height="2" rx="1" fill="#fff" opacity="0.06" />
      <rect x="8" y="10" width="6" height="2" rx="1" fill="#fff" opacity="0.04" />
    </svg>
  )
}

export function PantryIcon({ className = '' }) {
  return (
    <svg className={className} width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <rect x="3" y="6" width="18" height="12" rx="2" fill="#556270" opacity="0.95" />
      <rect x="6" y="9" width="5" height="6" rx="1" fill="#fff" opacity="0.06" />
      <rect x="13" y="9" width="5" height="6" rx="1" fill="#fff" opacity="0.06" />
    </svg>
  )
}

export default null

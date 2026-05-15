import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { TelegramAuth } from './pages/auth/TelegramAuth'
import { Dashboard } from './pages/dashboard/Dashboard'
import { FlowBuilder } from './pages/builder/FlowBuilder'
import { useAuthStore } from './stores/authStore'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  return isAuthenticated ? <>{children}</> : <Navigate to="/auth" replace />
}

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/auth" element={<TelegramAuth />} />
        <Route path="/dashboard" element={
          <RequireAuth><Dashboard /></RequireAuth>
        } />
        <Route path="/bots/:botId/flows/:flowId" element={
          <RequireAuth><FlowBuilder /></RequireAuth>
        } />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

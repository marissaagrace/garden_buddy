import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '@/providers/AuthProvider'
import { ProtectedLayout } from '@/routes/ProtectedLayout'
import { Dashboard } from '@/pages/Dashboard'
import { Login } from '@/pages/Login'
import { PlantDetail } from '@/pages/PlantDetail'
import { PlantForm } from '@/pages/PlantForm'
import { PlantsList } from '@/pages/PlantsList'
import { PublicShell } from '@/pages/PublicShell'
import { SignUp } from '@/pages/SignUp'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<PublicShell />}>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<SignUp />} />
          </Route>
          <Route element={<ProtectedLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/plants" element={<PlantsList />} />
            <Route path="/plants/new" element={<PlantForm />} />
            <Route path="/plants/:id" element={<PlantDetail />} />
            <Route path="/plants/:id/edit" element={<PlantForm />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

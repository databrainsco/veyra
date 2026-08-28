import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { HomePage } from '../pages/Home/HomePage'
import { OnboardingPage } from '../pages/Onboarding/OnboardingPage'
import { ChatPage } from '../pages/Chat/ChatPage'
import { MemoryPage } from '../pages/Memory/MemoryPage'
import { LibraryPage } from '../pages/Library/LibraryPage'
import { ModelsPage } from '../pages/Models/ModelsPage'
import { SettingsPage } from '../pages/Settings/SettingsPage'

const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || undefined

export function App() {
  return (
    <BrowserRouter basename={basename}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/app" element={<AppLayout />}>
          <Route index element={<Navigate to="chat" replace />} />
          <Route path="chat" element={<ChatPage />} />
          <Route path="memory" element={<MemoryPage />} />
          <Route path="library" element={<LibraryPage />} />
          <Route path="models" element={<ModelsPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

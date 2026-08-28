import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar, MobileNav } from './Sidebar'
import { AppTopBar } from './AppTopBar'
import { applyDeviceOptimizedSettings } from '../../utils/deviceSettings'

export function AppLayout() {
  useEffect(() => {
    void applyDeviceOptimizedSettings()
  }, [])

  return (
    <div className="layout">
      <AppTopBar />
      <div className="layout-body">
        <Sidebar />
        <main className="main-content">
          <Outlet />
        </main>
      </div>
      <MobileNav />
    </div>
  )
}

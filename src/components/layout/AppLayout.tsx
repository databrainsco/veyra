import { Outlet } from 'react-router-dom'
import { Sidebar, MobileNav } from './Sidebar'
import { AppTopBar } from './AppTopBar'

export function AppLayout() {
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

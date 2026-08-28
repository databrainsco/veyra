import { Outlet } from 'react-router-dom'
import { Sidebar, MobileNav } from './Sidebar'

export function AppLayout() {
  return (
    <div className="layout">
      <Sidebar />
      <main className="main-content">
        <Outlet />
      </main>
      <MobileNav />
    </div>
  )
}

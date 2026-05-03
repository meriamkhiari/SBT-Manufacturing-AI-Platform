import { useAuth } from '../lib/AuthContext'
import AdminHome    from './AdminHome'
import EmployeeHome from './EmployeeHome'

/**
 * Role-aware home page router.
 *  - admin    → AdminHome (mission control: users, system, quick actions)
 *  - employee → EmployeeHome (welcome + 2 tasks they can access)
 */
export default function Home() {
  const { user } = useAuth()
  return user?.role === 'admin' ? <AdminHome /> : <EmployeeHome />
}

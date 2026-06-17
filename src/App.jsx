import { useState, useEffect, createContext, useContext } from 'react'
import { supabase } from './api/supabase'
import Login from './pages/Login'
import StudentView from './pages/StudentView'
import TeacherView from './pages/TeacherView'
import AdminView from './pages/AdminView'
import NavBar from './components/NavBar'

const AuthContext = createContext(null)
export const useAuth = () => useContext(AuthContext)

function App() {
  const [session, setSession] = useState(undefined)
  const [profile, setProfile] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      if (data.session) loadProfile(data.session.user.id)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (!session) setProfile(null)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function loadProfile(userId) {
    const { data: emp } = await supabase
      .from('employees')
      .select('*')
      .eq('auth_user_id', userId)
      .single()
    if (emp) {
      const r = emp.role
      emp._reservationRole =
        (r === 'super_admin' || r === 'admin' || r === 'academic') ? 'admin' : 'teacher'
      setProfile(emp)
      return
    }

    const { data: stu } = await supabase
      .from('student_profiles')
      .select('*')
      .eq('id', userId)
      .single()
    if (stu) {
      stu._reservationRole = 'student'
      setProfile(stu)
      return
    }

    setProfile(null)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    setSession(null)
    setProfile(null)
  }

  if (session === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-zinc-400 text-sm">読み込み中...</div>
      </div>
    )
  }

  if (!session || !profile) {
    return (
      <AuthContext.Provider value={{ session, profile }}>
        <Login onLogin={(s, p) => { setSession(s); setProfile(p) }} />
      </AuthContext.Provider>
    )
  }

  const role = profile._reservationRole

  return (
    <AuthContext.Provider value={{ session, profile }}>
      <div className="max-w-[680px] mx-auto px-4 py-2 min-h-screen">
        <NavBar role={role} name={profile.name} onLogout={handleLogout} />
        {role === 'student' && <StudentView />}
        {role === 'teacher' && <TeacherView />}
        {role === 'admin' && <AdminView />}
      </div>
    </AuthContext.Provider>
  )
}

export default App

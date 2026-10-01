import { useState } from 'react'
import { LogIn, Eye, EyeOff, ArrowLeft, UserPlus, KeyRound } from 'lucide-react'
import { supabase } from '../api/supabase'

const ADMIN_ROLES = ['super_admin', 'admin', 'academic']

function mapRole(r) {
  return ADMIN_ROLES.includes(r) ? 'admin' : 'teacher'
}

export default function Login({ onLogin }) {
  const [mode, setMode] = useState('login') // login | register | forgot | reset
  const [loginId, setLoginId] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // register fields
  const [regName, setRegName] = useState('')
  const [regPhone, setRegPhone] = useState('')
  const [regHomeroom, setRegHomeroom] = useState('')

  // forgot fields
  const [forgotName, setForgotName] = useState('')
  const [forgotPhone, setForgotPhone] = useState('')
  const [foundLoginId, setFoundLoginId] = useState('')

  // reset fields
  const [resetLoginId, setResetLoginId] = useState('')
  const [resetName, setResetName] = useState('')
  const [resetPhone, setResetPhone] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [resetDone, setResetDone] = useState(false)

  function switchMode(m) {
    setMode(m)
    setError('')
    setFoundLoginId('')
    setResetDone(false)
  }

  async function handleLogin(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const email = `${loginId}@juku.local`
      const { data, error: authErr } = await supabase.auth.signInWithPassword({ email, password })
      if (authErr) throw authErr

      const { data: emp } = await supabase
        .from('employees')
        .select('*')
        .eq('auth_user_id', data.user.id)
        .single()

      if (emp) {
        emp._reservationRole = mapRole(emp.role)
        onLogin(data.session, emp)
        return
      }

      const { data: stu } = await supabase
        .from('student_profiles')
        .select('*')
        .eq('id', data.user.id)
        .single()

      if (stu) {
        stu._reservationRole = 'student'
        onLogin(data.session, stu)
        return
      }

      throw new Error('no profile')
    } catch {
      setError('登录ID或密码不正确')
    } finally {
      setLoading(false)
    }
  }

  async function handleRegister(e) {
    e.preventDefault()
    setError('')
    if (!loginId || !password || !regName || !regPhone || !regHomeroom) {
      setError('请把所有项目填写完整')
      return
    }
    setLoading(true)
    try {
      const email = `${loginId}@juku.local`
      const { data, error: authErr } = await supabase.auth.signUp({
        email, password,
        options: { data: { role: 'student' } },
      })
      if (authErr) throw authErr

      const { error: profErr } = await supabase.from('student_profiles').insert({
        id: data.user.id,
        login_id: loginId,
        name: regName,
        phone: regPhone,
        homeroom_teacher: regHomeroom,
      })
      if (profErr) throw profErr

      const { data: stu } = await supabase
        .from('student_profiles')
        .select('*')
        .eq('id', data.user.id)
        .single()

      stu._reservationRole = 'student'
      onLogin(data.session, stu)
    } catch (err) {
      if (err.message?.includes('already registered')) {
        setError('这个登录ID已经被使用了')
      } else {
        setError(err.message || '注册失败')
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleForgot(e) {
    e.preventDefault()
    setError('')
    setFoundLoginId('')
    if (!forgotName || !forgotPhone) {
      setError('请填写姓名和电话号码')
      return
    }
    setLoading(true)
    try {
      const { data, error: err } = await supabase.rpc('student_lookup_login_id', {
        p_name: forgotName, p_phone: forgotPhone,
      })
      if (err) throw err
      if (!data || data.length === 0) {
        setError('没有找到匹配的信息')
      } else {
        setFoundLoginId(data[0].login_id)
      }
    } catch {
      setError('查询失败')
    } finally {
      setLoading(false)
    }
  }

  async function handleReset(e) {
    e.preventDefault()
    setError('')
    if (!resetLoginId || !resetName || !resetPhone || !newPassword) {
      setError('请把所有项目填写完整')
      return
    }
    if (newPassword.length < 6) {
      setError('密码至少要 6 位')
      return
    }
    setLoading(true)
    try {
      const { data, error: err } = await supabase.rpc('student_reset_password', {
        p_login_id: resetLoginId, p_name: resetName, p_phone: resetPhone, p_new_password: newPassword,
      })
      if (err) throw err
      if (data === 'ok') {
        setResetDone(true)
      } else {
        setError('填写的信息不匹配')
      }
    } catch {
      setError('重置密码失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="text-center mb-8">
        <div className="text-[22px] font-bold mb-1">早稲田理工塾</div>
        <div className="text-[13px] text-zinc-500">面试练习预约系统</div>
      </div>

      <div className="w-full max-w-[360px] p-7 rounded-2xl border border-zinc-200 bg-white">

        {mode !== 'login' && (
          <button onClick={() => switchMode('login')} className="flex items-center gap-1 text-xs text-zinc-400 mb-4 hover:text-zinc-600">
            <ArrowLeft size={14} /> 返回登录
          </button>
        )}

        {/* ── Login ── */}
        {mode === 'login' && (
          <form onSubmit={handleLogin}>
            <div className="mb-4">
              <label className="block text-[13px] font-medium text-zinc-700 mb-1.5">登录ID</label>
              <input type="text" placeholder="your_id" value={loginId} onChange={e => setLoginId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-[10px] border border-zinc-300 text-sm outline-none focus:border-teal-400" />
            </div>
            <div className="mb-5">
              <label className="block text-[13px] font-medium text-zinc-700 mb-1.5">密码</label>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)}
                  className="w-full px-3 py-2.5 pr-10 rounded-[10px] border border-zinc-300 text-sm outline-none focus:border-teal-400" />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 p-1">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            {error && <div className="mb-4 text-[13px] text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</div>}
            <button type="submit" disabled={loading}
              className="w-full py-2.5 rounded-[10px] bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50">
              <LogIn size={15} /> {loading ? '处理中...' : '登录'}
            </button>
            <div className="flex justify-between mt-5 text-xs text-zinc-400">
              <button type="button" onClick={() => switchMode('register')} className="text-teal-600 font-medium flex items-center gap-1">
                <UserPlus size={12} /> 学生注册
              </button>
              <button type="button" onClick={() => switchMode('forgot')} className="hover:text-zinc-600">
                忘记登录ID / 密码
              </button>
            </div>
          </form>
        )}

        {/* ── Register ── */}
        {mode === 'register' && (
          <form onSubmit={handleRegister}>
            <div className="text-sm font-semibold mb-4">学生注册</div>
            <div className="flex flex-col gap-3 mb-5">
              <div>
                <label className="block text-[13px] font-medium text-zinc-700 mb-1">姓名</label>
                <input type="text" placeholder="王小明" value={regName} onChange={e => setRegName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-[10px] border border-zinc-300 text-sm outline-none focus:border-teal-400" />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-zinc-700 mb-1">电话号码</label>
                <input type="tel" placeholder="090-1234-5678" value={regPhone} onChange={e => setRegPhone(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-[10px] border border-zinc-300 text-sm outline-none focus:border-teal-400" />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-zinc-700 mb-1">班主任</label>
                <input type="text" placeholder="陈老师" value={regHomeroom} onChange={e => setRegHomeroom(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-[10px] border border-zinc-300 text-sm outline-none focus:border-teal-400" />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-zinc-700 mb-1">登录ID</label>
                <input type="text" placeholder="自己设定一个" value={loginId} onChange={e => setLoginId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-[10px] border border-zinc-300 text-sm outline-none focus:border-teal-400" />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-zinc-700 mb-1">密码</label>
                <input type={showPw ? 'text' : 'password'} placeholder="至少 6 位" value={password} onChange={e => setPassword(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-[10px] border border-zinc-300 text-sm outline-none focus:border-teal-400" />
              </div>
            </div>
            {error && <div className="mb-4 text-[13px] text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</div>}
            <button type="submit" disabled={loading}
              className="w-full py-2.5 rounded-[10px] bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50">
              <UserPlus size={15} /> {loading ? '处理中...' : '注册'}
            </button>
          </form>
        )}

        {/* ── Forgot Login ID ── */}
        {mode === 'forgot' && (
          <form onSubmit={handleForgot}>
            <div className="text-sm font-semibold mb-4">找回登录ID</div>
            <div className="flex flex-col gap-3 mb-5">
              <div>
                <label className="block text-[13px] font-medium text-zinc-700 mb-1">姓名</label>
                <input type="text" placeholder="注册时填写的姓名" value={forgotName} onChange={e => setForgotName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-[10px] border border-zinc-300 text-sm outline-none focus:border-teal-400" />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-zinc-700 mb-1">电话号码</label>
                <input type="tel" placeholder="注册时填写的电话号码" value={forgotPhone} onChange={e => setForgotPhone(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-[10px] border border-zinc-300 text-sm outline-none focus:border-teal-400" />
              </div>
            </div>
            {error && <div className="mb-4 text-[13px] text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</div>}
            {foundLoginId && (
              <div className="mb-4 text-[13px] text-teal-700 bg-teal-50 px-3 py-2 rounded-lg">
                你的登录ID：<span className="font-bold text-base">{foundLoginId}</span>
              </div>
            )}
            <button type="submit" disabled={loading}
              className="w-full py-2.5 rounded-[10px] bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50">
              {loading ? '查询中...' : '查询登录ID'}
            </button>
            <button type="button" onClick={() => switchMode('reset')} className="w-full mt-3 text-xs text-zinc-400 hover:text-zinc-600 flex items-center justify-center gap-1">
              <KeyRound size={12} /> 我要重置密码
            </button>
          </form>
        )}

        {/* ── Reset Password ── */}
        {mode === 'reset' && (
          <form onSubmit={handleReset}>
            <div className="text-sm font-semibold mb-4">重置密码</div>
            {resetDone ? (
              <div className="text-center py-4">
                <div className="text-teal-600 font-semibold mb-3">密码已重置，请用新密码登录</div>
                <button type="button" onClick={() => switchMode('login')}
                  className="px-6 py-2 rounded-[10px] bg-teal-600 text-white text-sm font-semibold">
                  返回登录
                </button>
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-3 mb-5">
                  <div>
                    <label className="block text-[13px] font-medium text-zinc-700 mb-1">登录ID</label>
                    <input type="text" value={resetLoginId} onChange={e => setResetLoginId(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-[10px] border border-zinc-300 text-sm outline-none focus:border-teal-400" />
                  </div>
                  <div>
                    <label className="block text-[13px] font-medium text-zinc-700 mb-1">姓名</label>
                    <input type="text" value={resetName} onChange={e => setResetName(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-[10px] border border-zinc-300 text-sm outline-none focus:border-teal-400" />
                  </div>
                  <div>
                    <label className="block text-[13px] font-medium text-zinc-700 mb-1">电话号码</label>
                    <input type="tel" value={resetPhone} onChange={e => setResetPhone(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-[10px] border border-zinc-300 text-sm outline-none focus:border-teal-400" />
                  </div>
                  <div>
                    <label className="block text-[13px] font-medium text-zinc-700 mb-1">新密码</label>
                    <input type={showPw ? 'text' : 'password'} placeholder="至少 6 位" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-[10px] border border-zinc-300 text-sm outline-none focus:border-teal-400" />
                  </div>
                </div>
                {error && <div className="mb-4 text-[13px] text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</div>}
                <button type="submit" disabled={loading}
                  className="w-full py-2.5 rounded-[10px] bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50">
                  <KeyRound size={15} /> {loading ? '处理中...' : '重置密码'}
                </button>
              </>
            )}
          </form>
        )}
      </div>
    </div>
  )
}

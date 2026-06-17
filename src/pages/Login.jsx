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
      setError('ログインIDまたはパスワードが正しくありません')
    } finally {
      setLoading(false)
    }
  }

  async function handleRegister(e) {
    e.preventDefault()
    setError('')
    if (!loginId || !password || !regName || !regPhone || !regHomeroom) {
      setError('全ての項目を入力してください')
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
        setError('このIDは既に使用されています')
      } else {
        setError(err.message || '登録に失敗しました')
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
      setError('氏名と電話番号を入力してください')
      return
    }
    setLoading(true)
    try {
      const { data, error: err } = await supabase.rpc('student_lookup_login_id', {
        p_name: forgotName, p_phone: forgotPhone,
      })
      if (err) throw err
      if (!data || data.length === 0) {
        setError('一致する情報が見つかりませんでした')
      } else {
        setFoundLoginId(data[0].login_id)
      }
    } catch {
      setError('検索に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  async function handleReset(e) {
    e.preventDefault()
    setError('')
    if (!resetLoginId || !resetName || !resetPhone || !newPassword) {
      setError('全ての項目を入力してください')
      return
    }
    if (newPassword.length < 6) {
      setError('パスワードは6文字以上にしてください')
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
        setError('入力情報が一致しません')
      }
    } catch {
      setError('パスワードリセットに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="text-center mb-8">
        <div className="text-[22px] font-bold mb-1">早稲田理工塾</div>
        <div className="text-[13px] text-zinc-500">面試練習予約システム</div>
      </div>

      <div className="w-full max-w-[360px] p-7 rounded-2xl border border-zinc-200 bg-white">

        {mode !== 'login' && (
          <button onClick={() => switchMode('login')} className="flex items-center gap-1 text-xs text-zinc-400 mb-4 hover:text-zinc-600">
            <ArrowLeft size={14} /> ログインに戻る
          </button>
        )}

        {/* ── Login ── */}
        {mode === 'login' && (
          <form onSubmit={handleLogin}>
            <div className="mb-4">
              <label className="block text-[13px] font-medium text-zinc-700 mb-1.5">ログインID</label>
              <input type="text" placeholder="your_id" value={loginId} onChange={e => setLoginId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-[10px] border border-zinc-300 text-sm outline-none focus:border-teal-400" />
            </div>
            <div className="mb-5">
              <label className="block text-[13px] font-medium text-zinc-700 mb-1.5">パスワード</label>
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
              <LogIn size={15} /> {loading ? '処理中...' : 'ログイン'}
            </button>
            <div className="flex justify-between mt-5 text-xs text-zinc-400">
              <button type="button" onClick={() => switchMode('register')} className="text-teal-600 font-medium flex items-center gap-1">
                <UserPlus size={12} /> 新規登録（学生）
              </button>
              <button type="button" onClick={() => switchMode('forgot')} className="hover:text-zinc-600">
                ID・パスワードを忘れた
              </button>
            </div>
          </form>
        )}

        {/* ── Register ── */}
        {mode === 'register' && (
          <form onSubmit={handleRegister}>
            <div className="text-sm font-semibold mb-4">学生新規登録</div>
            <div className="flex flex-col gap-3 mb-5">
              <div>
                <label className="block text-[13px] font-medium text-zinc-700 mb-1">氏名</label>
                <input type="text" placeholder="山田太郎" value={regName} onChange={e => setRegName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-[10px] border border-zinc-300 text-sm outline-none focus:border-teal-400" />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-zinc-700 mb-1">電話番号</label>
                <input type="tel" placeholder="090-1234-5678" value={regPhone} onChange={e => setRegPhone(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-[10px] border border-zinc-300 text-sm outline-none focus:border-teal-400" />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-zinc-700 mb-1">担任の先生</label>
                <input type="text" placeholder="陈老师" value={regHomeroom} onChange={e => setRegHomeroom(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-[10px] border border-zinc-300 text-sm outline-none focus:border-teal-400" />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-zinc-700 mb-1">ログインID</label>
                <input type="text" placeholder="自分で決めてください" value={loginId} onChange={e => setLoginId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-[10px] border border-zinc-300 text-sm outline-none focus:border-teal-400" />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-zinc-700 mb-1">パスワード</label>
                <input type={showPw ? 'text' : 'password'} placeholder="6文字以上" value={password} onChange={e => setPassword(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-[10px] border border-zinc-300 text-sm outline-none focus:border-teal-400" />
              </div>
            </div>
            {error && <div className="mb-4 text-[13px] text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</div>}
            <button type="submit" disabled={loading}
              className="w-full py-2.5 rounded-[10px] bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50">
              <UserPlus size={15} /> {loading ? '処理中...' : '登録する'}
            </button>
          </form>
        )}

        {/* ── Forgot Login ID ── */}
        {mode === 'forgot' && (
          <form onSubmit={handleForgot}>
            <div className="text-sm font-semibold mb-4">ログインID検索</div>
            <div className="flex flex-col gap-3 mb-5">
              <div>
                <label className="block text-[13px] font-medium text-zinc-700 mb-1">氏名</label>
                <input type="text" placeholder="登録時の氏名" value={forgotName} onChange={e => setForgotName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-[10px] border border-zinc-300 text-sm outline-none focus:border-teal-400" />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-zinc-700 mb-1">電話番号</label>
                <input type="tel" placeholder="登録時の電話番号" value={forgotPhone} onChange={e => setForgotPhone(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-[10px] border border-zinc-300 text-sm outline-none focus:border-teal-400" />
              </div>
            </div>
            {error && <div className="mb-4 text-[13px] text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</div>}
            {foundLoginId && (
              <div className="mb-4 text-[13px] text-teal-700 bg-teal-50 px-3 py-2 rounded-lg">
                あなたのログインID：<span className="font-bold text-base">{foundLoginId}</span>
              </div>
            )}
            <button type="submit" disabled={loading}
              className="w-full py-2.5 rounded-[10px] bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50">
              {loading ? '検索中...' : 'IDを検索'}
            </button>
            <button type="button" onClick={() => switchMode('reset')} className="w-full mt-3 text-xs text-zinc-400 hover:text-zinc-600 flex items-center justify-center gap-1">
              <KeyRound size={12} /> パスワードをリセットしたい
            </button>
          </form>
        )}

        {/* ── Reset Password ── */}
        {mode === 'reset' && (
          <form onSubmit={handleReset}>
            <div className="text-sm font-semibold mb-4">パスワードリセット</div>
            {resetDone ? (
              <div className="text-center py-4">
                <div className="text-teal-600 font-semibold mb-3">パスワードをリセットしました</div>
                <button type="button" onClick={() => switchMode('login')}
                  className="px-6 py-2 rounded-[10px] bg-teal-600 text-white text-sm font-semibold">
                  ログインに戻る
                </button>
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-3 mb-5">
                  <div>
                    <label className="block text-[13px] font-medium text-zinc-700 mb-1">ログインID</label>
                    <input type="text" value={resetLoginId} onChange={e => setResetLoginId(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-[10px] border border-zinc-300 text-sm outline-none focus:border-teal-400" />
                  </div>
                  <div>
                    <label className="block text-[13px] font-medium text-zinc-700 mb-1">氏名</label>
                    <input type="text" value={resetName} onChange={e => setResetName(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-[10px] border border-zinc-300 text-sm outline-none focus:border-teal-400" />
                  </div>
                  <div>
                    <label className="block text-[13px] font-medium text-zinc-700 mb-1">電話番号</label>
                    <input type="tel" value={resetPhone} onChange={e => setResetPhone(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-[10px] border border-zinc-300 text-sm outline-none focus:border-teal-400" />
                  </div>
                  <div>
                    <label className="block text-[13px] font-medium text-zinc-700 mb-1">新しいパスワード</label>
                    <input type={showPw ? 'text' : 'password'} placeholder="6文字以上" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-[10px] border border-zinc-300 text-sm outline-none focus:border-teal-400" />
                  </div>
                </div>
                {error && <div className="mb-4 text-[13px] text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</div>}
                <button type="submit" disabled={loading}
                  className="w-full py-2.5 rounded-[10px] bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50">
                  <KeyRound size={15} /> {loading ? '処理中...' : 'パスワードをリセット'}
                </button>
              </>
            )}
          </form>
        )}
      </div>
    </div>
  )
}

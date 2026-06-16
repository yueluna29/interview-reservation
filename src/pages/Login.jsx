import { useState } from 'react'
import { LogIn, Eye, EyeOff } from 'lucide-react'
import { supabase } from '../api/supabase'

export default function Login({ onLogin }) {
  const [loginId, setLoginId] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [regName, setRegName] = useState('')
  const [regPhone, setRegPhone] = useState('')

  async function handleLogin(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const email = `${loginId}@juku.local`
      const { data, error: authErr } = await supabase.auth.signInWithPassword({ email, password })
      if (authErr) throw authErr
      const { data: profile, error: profErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single()
      if (profErr) throw profErr
      onLogin(data.session, profile)
    } catch (err) {
      setError('ログインIDまたはパスワードが正しくありません')
    } finally {
      setLoading(false)
    }
  }

  async function handleRegister(e) {
    e.preventDefault()
    setError('')
    if (!loginId || !password || !regName) {
      setError('全ての項目を入力してください')
      return
    }
    setLoading(true)
    try {
      const email = `${loginId}@juku.local`
      const { data, error: authErr } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name: regName, phone: regPhone, role: 'student' } }
      })
      if (authErr) throw authErr
      const { data: profile, error: profErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single()
      if (profErr) throw profErr
      onLogin(data.session, profile)
    } catch (err) {
      setError(err.message || '登録に失敗しました')
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
        {mode === 'register' && (
          <>
            <div className="mb-4">
              <label className="block text-[13px] font-medium text-zinc-700 mb-1.5">氏名</label>
              <input
                type="text"
                placeholder="山田太郎"
                value={regName}
                onChange={e => setRegName(e.target.value)}
                className="w-full px-3 py-2.5 rounded-[10px] border border-zinc-300 text-sm outline-none focus:border-teal-400 transition-colors"
              />
            </div>
            <div className="mb-4">
              <label className="block text-[13px] font-medium text-zinc-700 mb-1.5">電話番号（任意）</label>
              <input
                type="tel"
                placeholder="090-1234-5678"
                value={regPhone}
                onChange={e => setRegPhone(e.target.value)}
                className="w-full px-3 py-2.5 rounded-[10px] border border-zinc-300 text-sm outline-none focus:border-teal-400 transition-colors"
              />
            </div>
          </>
        )}

        <div className="mb-4">
          <label className="block text-[13px] font-medium text-zinc-700 mb-1.5">ログインID</label>
          <input
            type="text"
            placeholder="your_id"
            value={loginId}
            onChange={e => setLoginId(e.target.value)}
            className="w-full px-3 py-2.5 rounded-[10px] border border-zinc-300 text-sm outline-none focus:border-teal-400 transition-colors"
          />
        </div>

        <div className="mb-6">
          <label className="block text-[13px] font-medium text-zinc-700 mb-1.5">パスワード</label>
          <div className="relative">
            <input
              type={showPw ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-3 py-2.5 pr-10 rounded-[10px] border border-zinc-300 text-sm outline-none focus:border-teal-400 transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPw(!showPw)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 p-1"
            >
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 text-[13px] text-red-600 bg-red-50 px-3 py-2 rounded-lg">
            {error}
          </div>
        )}

        <button
          onClick={mode === 'login' ? handleLogin : handleRegister}
          disabled={loading}
          className="w-full py-2.5 rounded-[10px] bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
        >
          <LogIn size={15} />
          {loading ? '処理中...' : mode === 'login' ? 'ログイン' : '新規登録'}
        </button>

        <div className="text-center mt-5 text-xs text-zinc-400">
          {mode === 'login' ? (
            <>
              初めての方は
              <button
                onClick={() => { setMode('register'); setError('') }}
                className="text-teal-600 font-medium ml-1"
              >
                新規登録（学生）
              </button>
            </>
          ) : (
            <>
              アカウントをお持ちの方は
              <button
                onClick={() => { setMode('login'); setError('') }}
                className="text-teal-600 font-medium ml-1"
              >
                ログイン
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

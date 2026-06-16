import { User, GraduationCap, Shield, LogOut } from 'lucide-react'

const ROLE_MAP = {
  student: { label: '学生', Icon: User },
  teacher: { label: '坐班老师', Icon: GraduationCap },
  admin: { label: '教務管理', Icon: Shield },
}

export default function NavBar({ role, name, onLogout }) {
  const { label, Icon } = ROLE_MAP[role] || ROLE_MAP.student

  return (
    <div className="flex items-center justify-between py-3 mb-4 border-b border-zinc-200">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold">早稲田理工塾</span>
        <span className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-500">
          予約システム
        </span>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-[13px] text-zinc-500">
          <Icon size={14} />
          <span>{name || label}</span>
        </div>
        <button
          onClick={onLogout}
          className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
        >
          <LogOut size={13} /> ログアウト
        </button>
      </div>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { LayoutDashboard, ChevronLeft, ChevronRight } from 'lucide-react'
import { supabase } from '../api/supabase'

const STATUS_BADGE = {
  open: { bg: 'bg-emerald-50', text: 'text-emerald-700', label: '空闲' },
  booked: { bg: 'bg-teal-100', text: 'text-teal-700', label: '已预约' },
  cancelled: { bg: 'bg-red-50', text: 'text-red-700', label: '已取消' },
}

const TEACHER_AVATARS = [
  { bg: 'bg-emerald-100', text: 'text-emerald-800' },
  { bg: 'bg-violet-100', text: 'text-violet-800' },
  { bg: 'bg-amber-100', text: 'text-amber-800' },
  { bg: 'bg-rose-100', text: 'text-rose-800' },
  { bg: 'bg-sky-100', text: 'text-sky-800' },
]

function fmtDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function AdminView() {
  const [dayOffset, setDayOffset] = useState(0)
  const [slots, setSlots] = useState([])
  const [loading, setLoading] = useState(true)

  const currentDate = new Date()
  currentDate.setDate(currentDate.getDate() + dayOffset)
  const dateStr = fmtDate(currentDate)
  const dayLabel = ['日', '月', '火', '水', '木', '金', '土'][currentDate.getDay()]

  useEffect(() => { loadSlots() }, [dayOffset])

  async function loadSlots() {
    setLoading(true)
    const { data } = await supabase
      .from('reservation_slots')
      .select(`
        *,
        teacher:employees!reservation_slots_teacher_id_fkey(id, name),
        student:employees!reservation_slots_student_id_fkey(id, name)
      `)
      .eq('date', dateStr)
      .order('start_time')
    setSlots(data || [])
    setLoading(false)
  }

  const total = slots.length
  const booked = slots.filter(s => s.status === 'booked').length
  const rate = total > 0 ? Math.round((booked / total) * 100) : 0

  const teacherColorMap = new Map()
  function getAvatarColor(teacherId) {
    if (!teacherColorMap.has(teacherId)) {
      teacherColorMap.set(teacherId, TEACHER_AVATARS[teacherColorMap.size % TEACHER_AVATARS.length])
    }
    return teacherColorMap.get(teacherId)
  }

  let lastTime = ''

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div className="text-[17px] font-semibold flex items-center gap-2">
          <LayoutDashboard size={18} className="text-zinc-600" /> 预约总览
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setDayOffset(o => o - 1)} className="w-[30px] h-[30px] rounded-lg border border-zinc-200 bg-white flex items-center justify-center text-zinc-400 hover:text-zinc-600">
            <ChevronLeft size={15} />
          </button>
          <span className="text-[13px] font-medium">
            {currentDate.getMonth() + 1}月{currentDate.getDate()}日（{dayLabel}）
          </span>
          <button onClick={() => setDayOffset(o => o + 1)} className="w-[30px] h-[30px] rounded-lg border border-zinc-200 bg-white flex items-center justify-center text-zinc-400 hover:text-zinc-600">
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2.5 mb-6">
        {[
          { label: '今日总时段', value: total },
          { label: '已预约', value: booked, color: 'text-teal-600' },
          { label: '预约率', value: `${rate}%` },
        ].map(s => (
          <div key={s.label} className="bg-zinc-50 rounded-[10px] p-3.5">
            <div className="text-xs text-zinc-400">{s.label}</div>
            <div className={`text-[22px] font-semibold mt-1 ${s.color || ''}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="text-sm text-zinc-400 py-8 text-center">読み込み中...</div>
      ) : slots.length === 0 ? (
        <div className="text-sm text-zinc-400 py-8 text-center">この日の時段はありません</div>
      ) : (
        <table className="w-full text-[13px]" style={{ borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: '16%' }} />
            <col style={{ width: '30%' }} />
            <col style={{ width: '30%' }} />
            <col style={{ width: '24%' }} />
          </colgroup>
          <thead>
            <tr>
              {['时间', '老师', '学生', '状态'].map(h => (
                <th key={h} className="text-left px-2 py-2 text-xs font-medium text-zinc-400 border-b border-zinc-200">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slots.map(row => {
              const badge = STATUS_BADGE[row.status] || STATUS_BADGE.open
              const ac = getAvatarColor(row.teacher_id)
              const showTime = row.start_time !== lastTime
              lastTime = row.start_time
              return (
                <tr key={row.id}>
                  <td className={`px-2 py-2 border-b border-zinc-50 ${showTime ? 'font-medium' : ''}`}>
                    {showTime ? row.start_time?.slice(0, 5) : ''}
                  </td>
                  <td className="px-2 py-2 border-b border-zinc-50">
                    <span className={`inline-flex items-center justify-center w-[22px] h-[22px] rounded-full text-[11px] font-semibold mr-1.5 align-middle ${ac.bg} ${ac.text}`}>
                      {row.teacher?.name?.[0]}
                    </span>
                    {row.teacher?.name}
                  </td>
                  <td className={`px-2 py-2 border-b border-zinc-50 ${
                    !row.student ? 'text-zinc-300 italic' :
                    row.status === 'cancelled' ? 'text-red-500 line-through' : ''
                  }`}>
                    {row.student?.name || '—'}
                  </td>
                  <td className="px-2 py-2 border-b border-zinc-50">
                    <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-medium ${badge.bg} ${badge.text}`}>
                      {badge.label}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}

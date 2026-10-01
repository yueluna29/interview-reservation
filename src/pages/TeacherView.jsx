import { useState, useEffect } from 'react'
import { GraduationCap, CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { supabase } from '../api/supabase'
import { useAuth } from '../App'
import { isPast, weekPosition } from '../utils/time'
import AvailabilityForm from '../components/AvailabilityForm'
import ScheduleBoard from '../components/ScheduleBoard'
import TeacherSlotModal from '../components/TeacherSlotModal'
import StudentHistorySearch from '../components/StudentHistorySearch'

function getWeekDates(offset = 0) {
  const now = new Date()
  const day = now.getDay()
  const monday = new Date(now)
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1) + offset * 7)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

function fmtDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function TeacherView() {
  const { profile } = useAuth()
  const [weekOffset, setWeekOffset] = useState(0)
  const [dayIdx, setDayIdx] = useState(() => (new Date().getDay() + 6) % 7)
  const [slots, setSlots] = useState([])
  const [editing, setEditing] = useState(null)

  const weekDates = getWeekDates(weekOffset)
  const weekStart = weekDates[0]
  const weekEnd = weekDates[6]

  useEffect(() => { loadSlots() }, [weekOffset])

  // 所有老师的排班和预约学生都要看到（视图对员工返回学生姓名）
  async function loadSlots() {
    const { data } = await supabase
      .from('reservation_slots_visible')
      .select('*')
      .gte('date', fmtDate(weekStart))
      .lte('date', fmtDate(weekEnd))
      .order('date')
      .order('start_time')
    setSlots(data || [])
  }

  // 换了周的话 useEffect 会重新加载，同一周就直接刷新
  function showDate(date) {
    const { offset, dayIdx } = weekPosition(date)
    setDayIdx(dayIdx)
    if (offset === weekOffset) loadSlots()
    else setWeekOffset(offset)
  }

  function slotView(slot) {
    const mine = slot.teacher_id === profile.auth_user_id
    const past = isPast(slot)
    const onClick = mine && !past ? () => setEditing(slot) : undefined
    if (slot.status === 'booked') {
      return { tone: 'booked', title: slot.student_name || '已预约', sub: '已预约', dim: past, onClick }
    }
    if (slot.status === 'cancelled') return { tone: 'cancelled', title: '已取消' }
    if (slot.status === 'blocked') return { tone: 'blocked', title: slot.note || '不可约', sub: '不可约', dim: past, onClick }
    if (past) return { tone: 'past', title: '空闲' }
    return { tone: 'open', title: '空闲', onClick }
  }

  return (
    <div>
      {editing && (
        <TeacherSlotModal
          slot={editing}
          ownDaySlots={slots.filter(s => s.teacher_id === profile.auth_user_id && s.date === editing.date)}
          onClose={() => setEditing(null)}
          onSaved={date => { setEditing(null); if (date) showDate(date); else loadSlots() }}
        />
      )}

      <div className="text-[17px] font-semibold flex items-center gap-2 mb-5">
        <GraduationCap size={18} className="text-violet-600" /> 我的坐班管理
      </div>

      <AvailabilityForm teacherId={profile.auth_user_id} showDate={showDate} />

      <StudentHistorySearch />

      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <CalendarDays size={15} className="text-zinc-500" />
          排班表
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setWeekOffset(o => o - 1)} className="w-[30px] h-[30px] rounded-lg border border-zinc-200 bg-white flex items-center justify-center text-zinc-400 hover:text-zinc-600">
            <ChevronLeft size={15} />
          </button>
          <span className="text-[13px] font-medium min-w-[120px] text-center">
            {weekStart.getMonth() + 1}月{weekStart.getDate()}日 — {weekEnd.getMonth() !== weekStart.getMonth() && `${weekEnd.getMonth() + 1}月`}{weekEnd.getDate()}日
          </span>
          <button onClick={() => setWeekOffset(o => o + 1)} className="w-[30px] h-[30px] rounded-lg border border-zinc-200 bg-white flex items-center justify-center text-zinc-400 hover:text-zinc-600">
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

      <div className="flex gap-4 mb-3 flex-wrap items-center">
        {[
          { cls: 'bg-emerald-50 border-emerald-300', label: '空闲' },
          { cls: 'bg-teal-100 border-teal-300', label: '已预约' },
          { cls: 'bg-amber-50 border-amber-300', label: '不可约' },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-1.5 text-xs text-zinc-500">
            <div className={`w-3 h-3 rounded-sm border ${l.cls}`} />
            {l.label}
          </div>
        ))}
        <span className="text-xs text-zinc-400">点自己的时段可改教室、删除，或设为不可约并写明要做什么</span>
      </div>

      <ScheduleBoard
        days={weekDates}
        selected={dayIdx}
        onSelect={setDayIdx}
        slots={slots}
        slotView={slotView}
        dayNote={ds => `${new Set(ds.map(s => s.teacher_id)).size}人`}
        columnNote={cs => `已约 ${cs.filter(s => s.status === 'booked').length}/${cs.filter(s => s.status !== 'blocked').length}`}
        pinTeacherId={profile.auth_user_id}
        accent="violet"
      />
    </div>
  )
}

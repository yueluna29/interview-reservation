import { useState, useEffect } from 'react'
import { LayoutDashboard, CalendarDays, ChevronLeft, ChevronRight, ListChecks, Search, Plus, ChevronUp } from 'lucide-react'
import { supabase } from '../api/supabase'
import { useAuth } from '../App'
import AdminSlotModal from '../components/AdminSlotModal'
import AvailabilityForm from '../components/AvailabilityForm'
import ScheduleBoard from '../components/ScheduleBoard'
import { isPast, dateLabel } from '../utils/time'
import { TEACHER_COLORS } from '../utils/teacherColors'

const STATUS_BADGE = {
  open: { bg: 'bg-emerald-50', text: 'text-emerald-700', label: '空闲' },
  booked: { bg: 'bg-teal-100', text: 'text-teal-700', label: '已预约' },
  cancelled: { bg: 'bg-red-50', text: 'text-red-700', label: '已取消' },
}

function fmtDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

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

export default function AdminView() {
  const { profile } = useAuth()
  const [tab, setTab] = useState('calendar')
  const [showForm, setShowForm] = useState(false)
  const [dayOffset, setDayOffset] = useState(0)
  const [weekOffset, setWeekOffset] = useState(0)
  const [weekDayIdx, setWeekDayIdx] = useState(() => (new Date().getDay() + 6) % 7)
  const [slots, setSlots] = useState([])
  const [weekSlots, setWeekSlots] = useState([])
  const [bookings, setBookings] = useState([])
  const [showPast, setShowPast] = useState(false)
  const [search, setSearch] = useState('')
  const [students, setStudents] = useState([])
  const [editing, setEditing] = useState(null)
  const [loading, setLoading] = useState(true)

  const currentDate = new Date()
  currentDate.setDate(currentDate.getDate() + dayOffset)
  const dateStr = fmtDate(currentDate)
  const dayLabel = ['日', '月', '火', '水', '木', '金', '土'][currentDate.getDay()]

  const weekDates = getWeekDates(weekOffset)

  useEffect(() => {
    if (tab === 'table') loadSlots()
  }, [dayOffset, tab])

  useEffect(() => {
    if (tab === 'calendar') loadWeekSlots()
  }, [weekOffset, tab])

  useEffect(() => {
    if (tab === 'list') loadBookings()
  }, [showPast, tab])

  useEffect(() => { loadStudents() }, [])

  async function loadStudents() {
    const { data } = await supabase
      .from('student_profiles')
      .select('id, name, login_id')
      .order('name')
    setStudents(data || [])
  }

  // 所有预约：默认只看今天及以后，勾选后包含过去的记录（按时间倒序）
  async function loadBookings() {
    setLoading(true)
    let q = supabase
      .from('reservation_slots_visible')
      .select('*')
      .eq('status', 'booked')
    if (!showPast) q = q.gte('date', fmtDate(new Date()))
    const { data } = await q
      .order('date', { ascending: !showPast })
      .order('start_time', { ascending: !showPast })
    setBookings(data || [])
    setLoading(false)
  }

  function reload() {
    if (tab === 'table') loadSlots()
    else if (tab === 'calendar') loadWeekSlots()
    else loadBookings()
  }

  async function loadSlots() {
    setLoading(true)
    const { data } = await supabase
      .from('reservation_slots_visible')
      .select('*')
      .eq('date', dateStr)
      .order('start_time')
    setSlots(data || [])
    setLoading(false)
  }

  async function loadWeekSlots() {
    setLoading(true)
    const { data } = await supabase
      .from('reservation_slots_visible')
      .select('*')
      .gte('date', fmtDate(weekDates[0]))
      .lte('date', fmtDate(weekDates[6]))
      .order('date')
      .order('start_time')
    setWeekSlots(data || [])
    setLoading(false)
  }

  const colorMap = new Map()
  function getColor(teacherId) {
    if (!colorMap.has(teacherId)) {
      colorMap.set(teacherId, TEACHER_COLORS[colorMap.size % TEACHER_COLORS.length])
    }
    return colorMap.get(teacherId)
  }

  const total = tab === 'table' ? slots.length : weekSlots.length
  const booked = (tab === 'table' ? slots : weekSlots).filter(s => s.status === 'booked').length
  const rate = total > 0 ? Math.round((booked / total) * 100) : 0

  function slotView(slot) {
    const base = { onClick: () => setEditing(slot), dim: isPast(slot) }
    if (slot.status === 'booked') return { ...base, tone: 'booked', title: slot.student_name || '已预约', sub: '已预约' }
    if (slot.status === 'cancelled') return { ...base, tone: 'cancelled', title: '已取消' }
    return { ...base, tone: 'open', title: '空闲' }
  }

  const keyword = search.trim()
  const filteredBookings = keyword
    ? bookings.filter(b => b.student_name?.includes(keyword) || b.teacher_name?.includes(keyword))
    : bookings
  const bookingsByDate = []
  for (const b of filteredBookings) {
    const last = bookingsByDate[bookingsByDate.length - 1]
    if (last && last.date === b.date) last.items.push(b)
    else bookingsByDate.push({ date: b.date, items: [b] })
  }

  return (
    <div>
      {editing && (
        <AdminSlotModal
          slot={editing}
          students={students}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); reload() }}
        />
      )}

      <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
        <div className="text-[17px] font-semibold flex items-center gap-2">
          <LayoutDashboard size={18} className="text-zinc-600" /> 预约总览
        </div>
        <div className="flex gap-1 bg-zinc-100 rounded-lg p-0.5">
          <button
            onClick={() => setTab('calendar')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${tab === 'calendar' ? 'bg-white text-zinc-800 shadow-sm' : 'text-zinc-500'}`}
          >
            <CalendarDays size={13} className="inline mr-1" />日历
          </button>
          <button
            onClick={() => setTab('table')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${tab === 'table' ? 'bg-white text-zinc-800 shadow-sm' : 'text-zinc-500'}`}
          >
            <LayoutDashboard size={13} className="inline mr-1" />明细
          </button>
          <button
            onClick={() => setTab('list')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${tab === 'list' ? 'bg-white text-zinc-800 shadow-sm' : 'text-zinc-500'}`}
          >
            <ListChecks size={13} className="inline mr-1" />全部预约
          </button>
        </div>
      </div>

      {/* 教务也可以像老师一样登记自己的坐班时间 */}
      {showForm ? (
        <div className="relative">
          <button
            onClick={() => setShowForm(false)}
            className="absolute right-4 top-4 text-xs text-zinc-400 hover:text-zinc-600 flex items-center gap-0.5"
          >
            <ChevronUp size={13} /> 收起
          </button>
          <AvailabilityForm teacherId={profile.auth_user_id} onAdded={reload} />
        </div>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="w-full mb-4 py-2 rounded-xl border border-dashed border-zinc-300 text-[13px] text-zinc-500 hover:text-violet-600 hover:border-violet-300 flex items-center justify-center gap-1 transition-colors"
        >
          <Plus size={14} /> 登记我的坐班时间
        </button>
      )}

      {tab !== 'list' && <div className="grid grid-cols-3 gap-2.5 mb-5">
        {[
          { label: '总时段', value: total },
          { label: '已预约', value: booked, color: 'text-teal-600' },
          { label: '预约率', value: `${rate}%` },
        ].map(s => (
          <div key={s.label} className="bg-zinc-50 rounded-[10px] p-3.5">
            <div className="text-xs text-zinc-400">{s.label}</div>
            <div className={`text-[22px] font-semibold mt-1 ${s.color || ''}`}>{s.value}</div>
          </div>
        ))}
      </div>}

      {tab === 'list' ? (
        <>
          <div className="flex items-center gap-3 mb-3">
            <div className="flex-1 relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="搜索学生或老师"
                className="w-full pl-8 pr-2.5 py-1.5 rounded-lg border border-zinc-300 text-[13px]"
              />
            </div>
            <label className="flex items-center gap-1.5 text-xs text-zinc-500 shrink-0">
              <input type="checkbox" checked={showPast} onChange={e => setShowPast(e.target.checked)} />
              包含过去
            </label>
          </div>
          <div className="text-xs text-zinc-400 mb-2">共 {filteredBookings.length} 条预约，点击可编辑</div>

          {loading ? (
            <div className="text-sm text-zinc-400 py-8 text-center">読み込み中...</div>
          ) : filteredBookings.length === 0 ? (
            <div className="text-sm text-zinc-400 py-8 text-center">没有预约</div>
          ) : bookingsByDate.map(group => (
            <div key={group.date} className="mb-4">
              <div className="text-[13px] font-semibold text-zinc-700 mb-1.5">{dateLabel(group.date)}</div>
              {group.items.map(b => {
                const past = isPast(b)
                const ac = getColor(b.teacher_id)
                return (
                  <button
                    key={b.id}
                    onClick={() => setEditing(b)}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-[10px] border border-zinc-100 mb-1.5 bg-white text-left text-[13px] hover:border-teal-300 transition-colors ${past ? 'opacity-50' : ''}`}
                  >
                    <span className="font-medium w-[88px] shrink-0">{b.start_time?.slice(0, 5)}-{b.end_time?.slice(0, 5)}</span>
                    <span className="flex-1 min-w-0 truncate">
                      <span className={`inline-flex items-center justify-center w-[20px] h-[20px] rounded-full text-[10px] font-semibold mr-1.5 align-middle ${ac.bg} ${ac.text}`}>
                        {b.teacher_name?.[0]}
                      </span>
                      {b.teacher_name}
                    </span>
                    <span className="flex-1 min-w-0 truncate font-medium text-teal-700">{b.student_name}</span>
                  </button>
                )
              })}
            </div>
          ))}
        </>
      ) : tab === 'calendar' ? (
        <>
          <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
            <div className="flex gap-4 flex-wrap items-center">
              {[
                { cls: 'bg-emerald-50 border-emerald-300', label: '空闲' },
                { cls: 'bg-teal-100 border-teal-300', label: '已预约' },
              ].map(l => (
                <div key={l.label} className="flex items-center gap-1.5 text-xs text-zinc-500">
                  <div className={`w-3 h-3 rounded-sm border ${l.cls}`} />
                  {l.label}
                </div>
              ))}
              <span className="text-xs text-zinc-400">点击时段可编辑</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setWeekOffset(o => o - 1)} className="w-[30px] h-[30px] rounded-lg border border-zinc-200 bg-white flex items-center justify-center text-zinc-400 hover:text-zinc-600">
                <ChevronLeft size={15} />
              </button>
              <span className="text-[13px] font-medium min-w-[120px] text-center">
                {weekDates[0].getMonth() + 1}月{weekDates[0].getDate()}日 — {weekDates[6].getMonth() !== weekDates[0].getMonth() && `${weekDates[6].getMonth() + 1}月`}{weekDates[6].getDate()}日
              </span>
              <button onClick={() => setWeekOffset(o => o + 1)} className="w-[30px] h-[30px] rounded-lg border border-zinc-200 bg-white flex items-center justify-center text-zinc-400 hover:text-zinc-600">
                <ChevronRight size={15} />
              </button>
            </div>
          </div>

          <ScheduleBoard
            days={weekDates}
            selected={weekDayIdx}
            onSelect={setWeekDayIdx}
            slots={weekSlots}
            slotView={slotView}
            dayNote={ds => `${new Set(ds.map(s => s.teacher_id)).size}人`}
            columnNote={cs => `已约 ${cs.filter(s => s.status === 'booked').length}/${cs.length}`}
          />
        </>
      ) : (
        <>
          <div className="flex items-center justify-end gap-2 mb-4">
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
                    <th key={h} className="text-left px-2 py-2 text-xs font-medium text-zinc-400 border-b border-zinc-200">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(() => {
                  let lastTime = ''
                  return slots.map(row => {
                    const badge = STATUS_BADGE[row.status] || STATUS_BADGE.open
                    const ac = getColor(row.teacher_id)
                    const showTime = row.start_time !== lastTime
                    lastTime = row.start_time
                    return (
                      <tr key={row.id} onClick={() => setEditing(row)} className="cursor-pointer hover:bg-zinc-50">
                        <td className={`px-2 py-2 border-b border-zinc-50 ${showTime ? 'font-medium' : ''}`}>
                          {showTime ? row.start_time?.slice(0, 5) : ''}
                        </td>
                        <td className="px-2 py-2 border-b border-zinc-50">
                          <span className={`inline-flex items-center justify-center w-[22px] h-[22px] rounded-full text-[11px] font-semibold mr-1.5 align-middle ${ac.bg} ${ac.text}`}>
                            {row.teacher_name?.[0]}
                          </span>
                          {row.teacher_name}
                        </td>
                        <td className={`px-2 py-2 border-b border-zinc-50 ${!row.student_name ? 'text-zinc-300 italic' : row.status === 'cancelled' ? 'text-red-500 line-through' : ''}`}>
                          {row.student_name || '—'}
                        </td>
                        <td className="px-2 py-2 border-b border-zinc-50">
                          <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-medium ${badge.bg} ${badge.text}`}>{badge.label}</span>
                        </td>
                      </tr>
                    )
                  })
                })()}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  )
}

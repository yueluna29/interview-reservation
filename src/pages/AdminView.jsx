import { useState, useEffect, Fragment } from 'react'
import { LayoutDashboard, CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { supabase } from '../api/supabase'

const STATUS_BADGE = {
  open: { bg: 'bg-emerald-50', text: 'text-emerald-700', label: '空闲' },
  booked: { bg: 'bg-teal-100', text: 'text-teal-700', label: '已预约' },
  cancelled: { bg: 'bg-red-50', text: 'text-red-700', label: '已取消' },
}

const TEACHER_COLORS = [
  { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-300' },
  { bg: 'bg-violet-100', text: 'text-violet-800', border: 'border-violet-300' },
  { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-300' },
  { bg: 'bg-rose-100', text: 'text-rose-800', border: 'border-rose-300' },
  { bg: 'bg-sky-100', text: 'text-sky-800', border: 'border-sky-300' },
]

const WEEKDAYS = ['月', '火', '水', '木', '金', '土', '日']

const TIMES = []
for (let h = 9; h < 21; h++) {
  TIMES.push(`${String(h).padStart(2, '0')}:00`)
  TIMES.push(`${String(h).padStart(2, '0')}:30`)
}

function fmtDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function isToday(d) {
  const t = new Date()
  return d.getDate() === t.getDate() && d.getMonth() === t.getMonth() && d.getFullYear() === t.getFullYear()
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
  const [tab, setTab] = useState('calendar')
  const [dayOffset, setDayOffset] = useState(0)
  const [weekOffset, setWeekOffset] = useState(0)
  const [slots, setSlots] = useState([])
  const [weekSlots, setWeekSlots] = useState([])
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

  async function loadSlots() {
    setLoading(true)
    const { data } = await supabase
      .from('reservation_slots')
      .select('*')
      .eq('date', dateStr)
      .order('start_time')
    setSlots(data || [])
    setLoading(false)
  }

  async function loadWeekSlots() {
    setLoading(true)
    const { data } = await supabase
      .from('reservation_slots')
      .select('*')
      .gte('date', fmtDate(weekDates[0]))
      .lte('date', fmtDate(weekDates[5]))
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

  const weekSlotMap = {}
  for (const s of weekSlots) {
    const key = `${s.date}_${s.start_time}`
    if (!weekSlotMap[key]) weekSlotMap[key] = []
    weekSlotMap[key].push(s)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
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
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2.5 mb-5">
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
      </div>

      {tab === 'calendar' ? (
        <>
          <div className="flex items-center justify-end gap-2 mb-3">
            <button onClick={() => setWeekOffset(o => o - 1)} className="w-[30px] h-[30px] rounded-lg border border-zinc-200 bg-white flex items-center justify-center text-zinc-400 hover:text-zinc-600">
              <ChevronLeft size={15} />
            </button>
            <span className="text-[13px] font-medium min-w-[120px] text-center">
              {weekDates[0].getMonth() + 1}月{weekDates[0].getDate()}日 — {weekDates[6].getDate()}日
            </span>
            <button onClick={() => setWeekOffset(o => o + 1)} className="w-[30px] h-[30px] rounded-lg border border-zinc-200 bg-white flex items-center justify-center text-zinc-400 hover:text-zinc-600">
              <ChevronRight size={15} />
            </button>
          </div>

          <div className="grid grid-cols-[48px_repeat(7,1fr)] mb-1">
            <div />
            {weekDates.map((d, i) => (
              <div key={i} className="text-center py-1.5">
                <div className="text-[11px] text-zinc-400">{WEEKDAYS[i]}</div>
                <div className={`text-sm font-semibold mt-0.5 ${isToday(d)
                  ? 'bg-teal-600 text-white w-[26px] h-[26px] rounded-full inline-flex items-center justify-center'
                  : 'text-zinc-800'}`}>
                  {d.getDate()}
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-[48px_repeat(7,1fr)] gap-px bg-zinc-200 rounded-xl overflow-hidden border border-zinc-200">
            {TIMES.map((time, ti) => (
              <Fragment key={ti}>
                <div className="bg-white px-1 py-1.5 text-[11px] text-zinc-400 text-right min-h-[48px] flex items-start justify-end">
                  {time}
                </div>
                {weekDates.map((date, di) => {
                  const key = `${fmtDate(date)}_${time}:00`
                  const cellSlots = weekSlotMap[key] || []
                  return (
                    <div key={`${ti}-${di}`} className="bg-white p-0.5 min-h-[48px] flex flex-col gap-0.5">
                      {cellSlots.map(slot => {
                        const tc = getColor(slot.teacher_id)
                        if (slot.status === 'booked') {
                          return (
                            <div key={slot.id} className="px-1.5 py-1 rounded-md bg-teal-50 border border-teal-200 text-[10px] leading-tight">
                              <div className="font-semibold text-teal-800">{slot.teacher_name}</div>
                              <div className="text-teal-500">{slot.student_name}</div>
                            </div>
                          )
                        }
                        if (slot.status === 'cancelled') {
                          return (
                            <div key={slot.id} className="px-1.5 py-1 rounded-md bg-zinc-50 text-zinc-400 text-[10px] line-through">
                              {slot.teacher_name}
                            </div>
                          )
                        }
                        return (
                          <div key={slot.id} className={`px-1.5 py-1 rounded-md ${tc.bg} ${tc.text} border ${tc.border} text-[11px] font-semibold leading-tight`}>
                            {slot.teacher_name}
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </Fragment>
            ))}
          </div>
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
                      <tr key={row.id}>
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

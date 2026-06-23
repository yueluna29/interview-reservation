import { useState, useEffect, Fragment } from 'react'
import { GraduationCap, Plus, CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { supabase } from '../api/supabase'
import { useAuth } from '../App'

const WEEKDAYS = ['月', '火', '水', '木', '金', '土', '日']

const STATUS_BADGE = {
  open: { bg: 'bg-emerald-50', text: 'text-emerald-700', label: '空闲' },
  booked: { bg: 'bg-teal-100', text: 'text-teal-700', label: '已预约' },
  cancelled: { bg: 'bg-red-50', text: 'text-red-700', label: '已取消' },
}

const TIMES = []
for (let h = 9; h < 21; h++) {
  TIMES.push(`${String(h).padStart(2, '0')}:00`)
  TIMES.push(`${String(h).padStart(2, '0')}:30`)
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

function fmtDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function isToday(d) {
  const t = new Date()
  return d.getDate() === t.getDate() && d.getMonth() === t.getMonth() && d.getFullYear() === t.getFullYear()
}

export default function TeacherView() {
  const { profile } = useAuth()
  const [weekOffset, setWeekOffset] = useState(0)
  const [slots, setSlots] = useState([])
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('13:00')
  const [endTime, setEndTime] = useState('18:00')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const weekDates = getWeekDates(weekOffset)
  const weekStart = weekDates[0]
  const weekEnd = weekDates[6]

  useEffect(() => {
    const today = new Date()
    const next = new Date(today)
    next.setDate(today.getDate() + 2)
    setDate(fmtDate(next))
  }, [])

  useEffect(() => { loadSlots() }, [weekOffset])

  async function loadSlots() {
    const { data } = await supabase
      .from('reservation_slots')
      .select('*')
      .eq('teacher_id', profile.auth_user_id)
      .gte('date', fmtDate(weekStart))
      .lte('date', fmtDate(weekEnd))
      .order('date')
      .order('start_time')
    setSlots(data || [])
  }

  async function handleSubmit() {
    if (!date || !startTime || !endTime) return
    setSubmitError('')
    setSubmitting(true)

    const { data: overlap } = await supabase
      .from('reservation_availability')
      .select('id')
      .eq('teacher_id', profile.auth_user_id)
      .eq('date', date)
      .lt('start_time', endTime)
      .gt('end_time', startTime)
      .limit(1)
    if (overlap && overlap.length > 0) {
      setSubmitError('该时间段与已有排班重叠，请选择其他时间')
      setSubmitting(false)
      return
    }

    const { error } = await supabase.from('reservation_availability').insert({
      teacher_id: profile.auth_user_id,
      date,
      start_time: startTime,
      end_time: endTime,
    })
    setSubmitting(false)
    if (error) {
      setSubmitError('提交失败：' + error.message)
      return
    }
    loadSlots()
  }

  async function handleCancelSlot(slot) {
    if (!confirm(`确定取消 ${slot.start_time?.slice(0, 5)}-${slot.end_time?.slice(0, 5)} 的时段吗？`)) return
    await supabase
      .from('reservation_slots')
      .update({ status: 'cancelled' })
      .eq('id', slot.id)
      .eq('status', 'open')
    loadSlots()
  }

  const slotsByDateAndTime = {}
  for (const s of slots) {
    const key = `${s.date}_${s.start_time}`
    if (!slotsByDateAndTime[key]) slotsByDateAndTime[key] = []
    slotsByDateAndTime[key].push(s)
  }

  return (
    <div>
      <div className="text-[17px] font-semibold flex items-center gap-2 mb-5">
        <GraduationCap size={18} className="text-violet-600" /> 我的坐班管理
      </div>

      <div className="bg-zinc-50 rounded-xl p-5 mb-6">
        <div className="text-sm font-semibold flex items-center gap-1.5 mb-3.5">
          <Plus size={14} /> 登记坐班时间
        </div>
        <div className="flex gap-2.5 flex-wrap items-end">
          <div>
            <label className="block text-[11px] text-zinc-500 mb-1">日期</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-zinc-300 text-[13px]"
            />
          </div>
          <div>
            <label className="block text-[11px] text-zinc-500 mb-1">开始</label>
            <input
              type="time"
              value={startTime}
              onChange={e => setStartTime(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-zinc-300 text-[13px]"
            />
          </div>
          <div>
            <label className="block text-[11px] text-zinc-500 mb-1">结束</label>
            <input
              type="time"
              value={endTime}
              onChange={e => setEndTime(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-zinc-300 text-[13px]"
            />
          </div>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-5 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-[13px] font-semibold transition-colors disabled:opacity-50"
          >
            {submitting ? '...' : '提交排班'}
          </button>
        </div>
        {submitError && <div className="mt-3 text-[13px] text-red-600 bg-red-50 px-3 py-2 rounded-lg">{submitError}</div>}
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <CalendarDays size={15} className="text-zinc-500" />
          排班预览
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setWeekOffset(o => o - 1)} className="w-[30px] h-[30px] rounded-lg border border-zinc-200 bg-white flex items-center justify-center text-zinc-400 hover:text-zinc-600">
            <ChevronLeft size={15} />
          </button>
          <span className="text-[13px] font-medium min-w-[120px] text-center">
            {weekStart.getMonth() + 1}月{weekStart.getDate()}日 — {weekEnd.getDate()}日
          </span>
          <button onClick={() => setWeekOffset(o => o + 1)} className="w-[30px] h-[30px] rounded-lg border border-zinc-200 bg-white flex items-center justify-center text-zinc-400 hover:text-zinc-600">
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

      <div className="flex gap-4 mb-3 flex-wrap">
        {[
          { cls: 'bg-emerald-50 border-emerald-300', label: '空闲' },
          { cls: 'bg-teal-100 border-teal-300', label: '已预约' },
          { cls: 'bg-red-50 border-red-300', label: '已取消' },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-1.5 text-xs text-zinc-500">
            <div className={`w-3 h-3 rounded-sm border ${l.cls}`} />
            {l.label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-[48px_repeat(7,1fr)] mb-1">
        <div />
        {weekDates.map((d, i) => (
          <div key={i} className="text-center py-1.5">
            <div className="text-[11px] text-zinc-400">{WEEKDAYS[i]}</div>
            <div className={`text-sm font-semibold mt-0.5 ${isToday(d)
              ? 'bg-violet-600 text-white w-[26px] h-[26px] rounded-full inline-flex items-center justify-center'
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
            {weekDates.map((d, di) => {
              const dateStr = fmtDate(d)
              const key = `${dateStr}_${time}:00`
              const cellSlots = slotsByDateAndTime[key] || []
              return (
                <div key={`${ti}-${di}`} className="bg-white p-0.5 min-h-[48px] flex flex-col gap-0.5">
                  {cellSlots.map(slot => {
                    const badge = STATUS_BADGE[slot.status] || STATUS_BADGE.open
                    return (
                      <div
                        key={slot.id}
                        className={`w-full px-1.5 py-1 rounded-md text-[11px] leading-tight border ${badge.bg} ${badge.text} ${
                          slot.status === 'booked' ? 'border-teal-300' :
                          slot.status === 'cancelled' ? 'border-red-300' : 'border-emerald-300'
                        } ${slot.status === 'open' ? 'cursor-pointer hover:opacity-70' : ''}`}
                        onClick={() => slot.status === 'open' && handleCancelSlot(slot)}
                      >
                        <div className="font-semibold truncate">
                          {slot.status === 'open' ? '空闲 ✕' : slot.student_name || '空闲'}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </Fragment>
        ))}
      </div>
    </div>
  )
}

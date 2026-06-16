import { useState, useEffect, Fragment } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, Clock, User, X, Check, ListChecks } from 'lucide-react'
import { supabase } from '../api/supabase'
import { useAuth } from '../App'

const WEEKDAYS = ['月', '火', '水', '木', '金']

function getWeekDates(offset = 0) {
  const now = new Date()
  const day = now.getDay()
  const monday = new Date(now)
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1) + offset * 7)
  return Array.from({ length: 5 }, (_, i) => {
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

const TIMES = []
for (let h = 9; h < 21; h++) {
  TIMES.push(`${String(h).padStart(2, '0')}:00`)
  TIMES.push(`${String(h).padStart(2, '0')}:30`)
}

const STATUS_BADGE = {
  upcoming: { bg: 'bg-teal-100', text: 'text-teal-700', label: '即将开始' },
  booked: { bg: 'bg-teal-100', text: 'text-teal-700', label: '已预约' },
  done: { bg: 'bg-zinc-100', text: 'text-zinc-500', label: '已完成' },
  cancelled: { bg: 'bg-red-50', text: 'text-red-700', label: '已取消' },
}

const TEACHER_COLORS = [
  { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-300' },
  { bg: 'bg-violet-100', text: 'text-violet-800', border: 'border-violet-300' },
  { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-300' },
  { bg: 'bg-rose-100', text: 'text-rose-800', border: 'border-rose-300' },
  { bg: 'bg-sky-100', text: 'text-sky-800', border: 'border-sky-300' },
]

function getTeacherColor(teacherId, colorMap) {
  if (!colorMap.has(teacherId)) {
    colorMap.set(teacherId, TEACHER_COLORS[colorMap.size % TEACHER_COLORS.length])
  }
  return colorMap.get(teacherId)
}

export default function StudentView() {
  const { profile } = useAuth()
  const [weekOffset, setWeekOffset] = useState(0)
  const [slots, setSlots] = useState([])
  const [myBookings, setMyBookings] = useState([])
  const [modal, setModal] = useState(null)
  const [loading, setLoading] = useState(true)
  const [booking, setBooking] = useState(false)

  const weekDates = getWeekDates(weekOffset)
  const weekStart = weekDates[0]
  const weekEnd = weekDates[4]

  useEffect(() => { loadSlots() }, [weekOffset])
  useEffect(() => { loadMyBookings() }, [])

  async function loadSlots() {
    setLoading(true)
    const { data } = await supabase
      .from('reservation_slots')
      .select('*, teacher:profiles!reservation_slots_teacher_id_fkey(id, name)')
      .gte('date', fmtDate(weekStart))
      .lte('date', fmtDate(weekEnd))
      .order('date')
      .order('start_time')
    setSlots(data || [])
    setLoading(false)
  }

  async function loadMyBookings() {
    const { data } = await supabase
      .from('reservation_slots')
      .select('*, teacher:profiles!reservation_slots_teacher_id_fkey(id, name)')
      .eq('student_id', profile.id)
      .order('date', { ascending: false })
      .limit(20)
    setMyBookings(data || [])
  }

  async function handleBook(slot) {
    setBooking(true)
    const { error } = await supabase
      .from('reservation_slots')
      .update({ student_id: profile.id, status: 'booked', booked_at: new Date().toISOString() })
      .eq('id', slot.id)
      .eq('status', 'open')
    if (!error) {
      await supabase.from('reservation_booking_log').insert({
        slot_id: slot.id, student_id: profile.id, action: 'book'
      })
    }
    setModal(null)
    setBooking(false)
    loadSlots()
    loadMyBookings()
  }

  async function handleCancel(slot) {
    await supabase
      .from('reservation_slots')
      .update({ student_id: null, status: 'open', cancelled_at: new Date().toISOString() })
      .eq('id', slot.id)
    await supabase.from('reservation_booking_log').insert({
      slot_id: slot.id, student_id: profile.id, action: 'cancel'
    })
    loadSlots()
    loadMyBookings()
  }

  const colorMap = new Map()
  const slotsByDateAndTime = {}
  for (const s of slots) {
    const key = `${s.date}_${s.start_time}`
    if (!slotsByDateAndTime[key]) slotsByDateAndTime[key] = []
    slotsByDateAndTime[key].push(s)
  }

  return (
    <div>
      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/25"
          onClick={() => setModal(null)}
        >
          <div onClick={e => e.stopPropagation()} className="bg-white rounded-2xl p-6 w-[300px] shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <span className="text-base font-semibold">确认预约</span>
              <button onClick={() => setModal(null)} className="text-zinc-400"><X size={18} /></button>
            </div>
            <div className="flex flex-col gap-2.5 mb-6 text-sm text-zinc-600">
              <div className="flex items-center gap-2.5">
                <CalendarDays size={15} className="text-zinc-400" />
                <span>{new Date(modal.date).toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' })}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Clock size={15} className="text-zinc-400" />
                <span>{modal.start_time?.slice(0, 5)} - {modal.end_time?.slice(0, 5)}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <User size={15} className="text-zinc-400" />
                <span>{modal.teacher?.name}</span>
              </div>
            </div>
            <div className="flex gap-2.5">
              <button
                onClick={() => setModal(null)}
                className="flex-1 py-2.5 rounded-[10px] border border-zinc-200 bg-zinc-100 text-[13px] font-medium text-zinc-600"
              >
                取消
              </button>
              <button
                onClick={() => handleBook(modal)}
                disabled={booking}
                className="flex-1 py-2.5 rounded-[10px] bg-teal-600 text-white text-[13px] font-semibold flex items-center justify-center gap-1 disabled:opacity-50"
              >
                <Check size={14} /> {booking ? '...' : '确认'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-[17px] font-semibold">
          <CalendarDays size={18} className="text-teal-600" />
          面试练习预约
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
          { cls: 'bg-emerald-100 border-emerald-300', label: '可预约' },
          { cls: 'bg-blue-100 border-blue-300', label: '我的预约' },
          { cls: 'bg-zinc-100 border-zinc-100', label: '已约满' },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-1.5 text-xs text-zinc-500">
            <div className={`w-3 h-3 rounded-sm border ${l.cls}`} />
            {l.label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-[48px_repeat(5,1fr)] mb-1">
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

      <div className="grid grid-cols-[48px_repeat(5,1fr)] gap-px bg-zinc-200 rounded-xl overflow-hidden border border-zinc-200">
        {TIMES.map((time, ti) => (
          <Fragment key={ti}>
            <div className="bg-white px-1 py-1.5 text-[11px] text-zinc-400 text-right min-h-[48px] flex items-start justify-end">
              {time}
            </div>
            {weekDates.map((date, di) => {
              const dateStr = fmtDate(date)
              const key = `${dateStr}_${time}:00`
              const cellSlots = slotsByDateAndTime[key] || []
              return (
                <div key={`${ti}-${di}`} className="bg-white p-0.5 min-h-[48px] flex flex-col gap-0.5">
                  {cellSlots.map(slot => {
                    const isMine = slot.student_id === profile.id
                    if (isMine) {
                      return (
                        <button key={slot.id} className="w-full text-left px-1.5 py-1 rounded-md bg-blue-100 text-blue-800 border border-blue-300 text-[11px] leading-tight">
                          <div className="font-semibold">{slot.teacher?.name}</div>
                          <div className="text-[10px] text-blue-400">我的预约</div>
                        </button>
                      )
                    }
                    if (slot.status === 'booked') {
                      return (
                        <div key={slot.id} className="px-1.5 py-1 rounded-md bg-zinc-100 text-zinc-400 text-[11px] line-through">
                          {slot.teacher?.name}
                        </div>
                      )
                    }
                    const tc = getTeacherColor(slot.teacher_id, colorMap)
                    return (
                      <button
                        key={slot.id}
                        onClick={() => setModal(slot)}
                        className={`w-full text-left px-1.5 py-1 rounded-md ${tc.bg} ${tc.text} border ${tc.border} text-[11px] font-semibold leading-tight cursor-pointer hover:opacity-80`}
                      >
                        {slot.teacher?.name}
                      </button>
                    )
                  })}
                </div>
              )
            })}
          </Fragment>
        ))}
      </div>

      <div className="mt-7">
        <div className="text-sm font-semibold flex items-center gap-1.5 mb-3">
          <ListChecks size={15} className="text-zinc-500" /> 我的预约记录
        </div>
        {myBookings.length === 0 && (
          <div className="text-sm text-zinc-400 py-4 text-center">暂无预约记录</div>
        )}
        {myBookings.map(b => {
          const d = new Date(b.date)
          const dayLabel = ['日', '月', '火', '水', '木', '金', '土'][d.getDay()]
          const st = b.status === 'cancelled' ? 'cancelled'
            : new Date(`${b.date}T${b.start_time}`) > new Date() ? 'upcoming' : 'done'
          const badge = STATUS_BADGE[st]
          const canCancel = st === 'upcoming' &&
            (new Date(`${b.date}T${b.start_time}`) - new Date()) > 24 * 60 * 60 * 1000
          return (
            <div key={b.id} className="flex items-center justify-between px-3.5 py-2.5 rounded-[10px] border border-zinc-100 mb-1.5 bg-white">
              <div>
                <div className={`text-[13px] font-medium ${st === 'cancelled' ? 'line-through text-zinc-400' : ''}`}>
                  {d.getMonth() + 1}/{d.getDate()}（{dayLabel}）{b.start_time?.slice(0, 5)}-{b.end_time?.slice(0, 5)}
                </div>
                <div className="text-xs text-zinc-400 mt-0.5">{b.teacher?.name}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-medium ${badge.bg} ${badge.text}`}>
                  {badge.label}
                </span>
                {canCancel && (
                  <button
                    onClick={() => handleCancel(b)}
                    className="text-[11px] text-red-600 bg-red-50 border border-red-300 rounded-md px-2.5 py-1 hover:bg-red-100"
                  >
                    取消
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

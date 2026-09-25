import { useState, useEffect } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, Clock, User, X, Check, ListChecks } from 'lucide-react'
import { supabase } from '../api/supabase'
import { useAuth } from '../App'
import { fmtDate, isPast, dateLabel } from '../utils/time'
import ScheduleBoard from '../components/ScheduleBoard'

// 从今天开始的连续 7 天，page=1 是第 8~14 天，以此类推
function getDaysFrom(page = 0) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() + page * 7 + i)
    return d
  })
}

function daysFromToday(dateStr) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((new Date(`${dateStr}T00:00:00`) - today) / 86400000)
}

const STATUS_BADGE = {
  upcoming: { bg: 'bg-teal-100', text: 'text-teal-700', label: '即将开始' },
  booked: { bg: 'bg-teal-100', text: 'text-teal-700', label: '已预约' },
  done: { bg: 'bg-zinc-100', text: 'text-zinc-500', label: '已完成' },
  cancelled: { bg: 'bg-red-50', text: 'text-red-700', label: '已取消' },
}

export default function StudentView() {
  const { profile } = useAuth()
  const [page, setPage] = useState(0)
  const [dayIdx, setDayIdx] = useState(0)
  const [slots, setSlots] = useState([])
  const [openDates, setOpenDates] = useState([])
  const [myBookings, setMyBookings] = useState([])
  const [modal, setModal] = useState(null)
  const [loading, setLoading] = useState(true)
  const [booking, setBooking] = useState(false)

  const weekDates = getDaysFrom(page)
  const weekStart = weekDates[0]
  const weekEnd = weekDates[6]

  useEffect(() => { loadSlots() }, [page])
  useEffect(() => { loadMyBookings(); loadOpenDates() }, [])

  async function loadSlots() {
    setLoading(true)
    const { data } = await supabase
      .from('reservation_slots_visible')
      .select('*')
      .neq('status', 'cancelled')
      .gte('date', fmtDate(weekStart))
      .lte('date', fmtDate(weekEnd))
      .order('date')
      .order('start_time')
    setSlots(data || [])
    setLoading(false)
  }

  // 今天起所有还有空位的日期，方便直接跳过去，不用一周一周翻
  async function loadOpenDates() {
    const { data } = await supabase
      .from('reservation_slots_visible')
      .select('date, start_time')
      .eq('status', 'open')
      .gte('date', fmtDate(new Date()))
      .order('date')
    const counts = new Map()
    for (const s of data || []) {
      if (isPast(s)) continue
      counts.set(s.date, (counts.get(s.date) || 0) + 1)
    }
    setOpenDates([...counts].map(([date, count]) => ({ date, count })))
  }

  async function loadMyBookings() {
    const { data } = await supabase
      .from('reservation_slots_visible')
      .select('*')
      .eq('student_id', profile.id)
      .order('date', { ascending: false })
      .limit(20)
    setMyBookings(data || [])
  }

  async function handleBook(slot) {
    if (isPast(slot)) {
      alert('该时段已开始，不能预约')
      setModal(null)
      return
    }
    setBooking(true)

    const { data: conflict } = await supabase
      .from('reservation_slots_visible')
      .select('id')
      .eq('student_id', profile.id)
      .eq('status', 'booked')
      .eq('date', slot.date)
      .lt('start_time', slot.end_time)
      .gt('end_time', slot.start_time)
      .limit(1)
    if (conflict && conflict.length > 0) {
      alert('你在该时间段已有预约，请选择其他时间')
      setBooking(false)
      setModal(null)
      return
    }

    const { data: recentCancel } = await supabase
      .from('reservation_booking_log')
      .select('created_at')
      .eq('student_id', profile.id)
      .eq('action', 'cancel')
      .order('created_at', { ascending: false })
      .limit(1)
    if (recentCancel && recentCancel.length > 0) {
      const diffMin = (Date.now() - new Date(recentCancel[0].created_at).getTime()) / 60000
      if (diffMin < 10) {
        alert(`取消预约后需等待10分钟才能再次预约，请${Math.ceil(10 - diffMin)}分钟后再试`)
        setBooking(false)
        setModal(null)
        return
      }
    }

    const { data: updated, error } = await supabase
      .from('reservation_slots')
      .update({ student_id: profile.id, student_name: profile.name, status: 'booked', booked_at: new Date().toISOString() })
      .eq('id', slot.id)
      .eq('status', 'open')
      .select('id')
    if (error || !updated?.length) {
      alert(error ? '预约失败：' + error.message : '该时段已被预约，请选择其他时间')
      setBooking(false)
      setModal(null)
      loadSlots()
      return
    }
    await supabase.from('reservation_booking_log').insert({
      slot_id: slot.id, student_id: profile.id, action: 'book'
    })
    setModal(null)
    setBooking(false)
    loadSlots()
    loadMyBookings()
    loadOpenDates()
  }

  async function handleCancel(slot) {
    const { error } = await supabase
      .from('reservation_slots')
      .update({ student_id: null, student_name: null, status: 'open', cancelled_at: new Date().toISOString() })
      .eq('id', slot.id)
    if (error) {
      alert('取消失败：' + error.message)
      return
    }
    await supabase.from('reservation_booking_log').insert({
      slot_id: slot.id, student_id: profile.id, action: 'cancel'
    })
    loadSlots()
    loadMyBookings()
    loadOpenDates()
  }

  function slotView(slot) {
    if (slot.student_id === profile.id) return { tone: 'mine', title: '我的预约' }
    if (slot.status === 'booked') return { tone: 'full', title: '已约满' }
    if (isPast(slot)) return { tone: 'past', title: '已过' }
    return { tone: 'open', title: '可预约', onClick: () => setModal(slot) }
  }

  const bookable = s => s.status === 'open' && !isPast(s)

  function jumpTo(date) {
    const n = daysFromToday(date)
    setPage(Math.floor(n / 7))
    setDayIdx(n % 7)
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
                <span>{modal.teacher_name}</span>
              </div>
            </div>
            <div className="text-[12px] text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
              确认预约后如需取消，需等待10分钟后才能再次预约，请确认时间无误。
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
                <Check size={14} /> {booking ? '...' : '确认预约'}
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
          <button
            onClick={() => setPage(p => p - 1)}
            disabled={page === 0}
            className="w-[30px] h-[30px] rounded-lg border border-zinc-200 bg-white flex items-center justify-center text-zinc-400 hover:text-zinc-600 disabled:opacity-30 disabled:hover:text-zinc-400"
          >
            <ChevronLeft size={15} />
          </button>
          <span className="text-[13px] font-medium min-w-[120px] text-center">
            {weekStart.getMonth() + 1}月{weekStart.getDate()}日 — {weekEnd.getMonth() !== weekStart.getMonth() && `${weekEnd.getMonth() + 1}月`}{weekEnd.getDate()}日
          </span>
          <button onClick={() => setPage(p => p + 1)} className="w-[30px] h-[30px] rounded-lg border border-zinc-200 bg-white flex items-center justify-center text-zinc-400 hover:text-zinc-600">
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

      {myBookings.length > 0 && (
        <div className="mb-5">
          <div className="text-sm font-semibold flex items-center gap-1.5 mb-3">
            <ListChecks size={15} className="text-zinc-500" /> 我的预约记录
          </div>
          {myBookings.map(b => {
            const d = new Date(b.date)
            const dayLabel = ['日', '月', '火', '水', '木', '金', '土'][d.getDay()]
            const st = b.status === 'cancelled' ? 'cancelled'
              : new Date(`${b.date}T${b.start_time}`) > new Date() ? 'upcoming' : 'done'
            const badge = STATUS_BADGE[st]
            const canCancel = st === 'upcoming'
            return (
              <div key={b.id} className="flex items-center justify-between px-3.5 py-2.5 rounded-[10px] border border-zinc-100 mb-1.5 bg-white">
                <div>
                  <div className={`text-[13px] font-medium ${st === 'cancelled' ? 'line-through text-zinc-400' : ''}`}>
                    {d.getMonth() + 1}/{d.getDate()}（{dayLabel}）{b.start_time?.slice(0, 5)}-{b.end_time?.slice(0, 5)}
                  </div>
                  <div className="text-xs text-zinc-400 mt-0.5">{b.teacher_name}</div>
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
      )}

      <div className="mb-4">
        <div className="text-xs text-zinc-500 mb-2">可预约日期（点击跳转）</div>
        {openDates.length === 0 ? (
          <div className="text-xs text-zinc-400">暂无可预约的时段，等老师登记后就会出现在这里</div>
        ) : (
          <div className="flex gap-1.5 flex-wrap">
            {openDates.map(({ date, count }) => {
              const selected = date === fmtDate(weekDates[dayIdx])
              const inView = date >= fmtDate(weekStart) && date <= fmtDate(weekEnd)
              return (
                <button
                  key={date}
                  onClick={() => jumpTo(date)}
                  className={`text-[11px] px-2 py-1 rounded-md border transition-colors ${selected
                    ? 'bg-teal-600 border-teal-600 text-white'
                    : inView
                      ? 'bg-teal-50 border-teal-300 text-teal-700'
                      : 'bg-white border-zinc-200 text-zinc-600 hover:border-teal-300'}`}
                >
                  {dateLabel(date)} <span className={selected ? 'text-teal-100' : 'text-zinc-400'}>· {count}</span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      <div className="flex gap-4 mb-3 flex-wrap">
        {[
          { cls: 'bg-emerald-50 border-emerald-300', label: '可预约' },
          { cls: 'bg-blue-100 border-blue-300', label: '我的预约' },
          { cls: 'bg-zinc-100 border-zinc-100', label: '已约满' },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-1.5 text-xs text-zinc-500">
            <div className={`w-3 h-3 rounded-sm border ${l.cls}`} />
            {l.label}
          </div>
        ))}
      </div>

      <ScheduleBoard
        days={weekDates}
        selected={dayIdx}
        onSelect={setDayIdx}
        slots={slots}
        slotView={slotView}
        dayNote={ds => {
          const n = ds.filter(bookable).length
          return n > 0 ? `可约${n}` : ds.every(isPast) ? '已过' : '已满'
        }}
        columnNote={cs => `可约 ${cs.filter(bookable).length}`}
      />
    </div>
  )
}

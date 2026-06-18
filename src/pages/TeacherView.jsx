import { useState, useEffect } from 'react'
import { GraduationCap, Plus, CalendarDays, CalendarPlus } from 'lucide-react'
import { supabase } from '../api/supabase'
import { useAuth } from '../App'

const STATUS_BADGE = {
  open: { bg: 'bg-emerald-50', text: 'text-emerald-700', label: '空闲' },
  booked: { bg: 'bg-teal-100', text: 'text-teal-700', label: '已预约' },
  cancelled: { bg: 'bg-red-50', text: 'text-red-700', label: '已取消' },
}

export default function TeacherView() {
  const { profile } = useAuth()
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('13:00')
  const [endTime, setEndTime] = useState('18:00')
  const [submitting, setSubmitting] = useState(false)
  const [availabilities, setAvailabilities] = useState([])
  const [selectedDate, setSelectedDate] = useState(null)
  const [daySlots, setDaySlots] = useState([])
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    const today = new Date()
    const next = new Date(today)
    next.setDate(today.getDate() + 2)
    setDate(fmtDate(next))
    loadAvailabilities()
  }, [])

  function fmtDate(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  async function loadAvailabilities() {
    const { data } = await supabase
      .from('reservation_availability')
      .select('*')
      .eq('teacher_id', profile.auth_user_id)
      .order('date', { ascending: false })
      .limit(20)
    setAvailabilities(data || [])
    if (data?.length > 0) loadDaySlots(data[0].date)
  }

  async function loadDaySlots(dateStr) {
    setSelectedDate(dateStr)
    const { data } = await supabase
      .from('reservation_slots')
      .select('*')
      .eq('teacher_id', profile.auth_user_id)
      .eq('date', dateStr)
      .order('start_time')
    setDaySlots(data || [])
  }

  async function handleSubmit() {
    if (!date || !startTime || !endTime) return
    setSubmitError('')
    setSubmitting(true)
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
    loadAvailabilities()
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

      {selectedDate && (
        <>
          <div className="mb-1.5 text-sm font-semibold flex items-center gap-1.5">
            <CalendarDays size={15} className="text-zinc-500" />
            {(() => {
              const d = new Date(selectedDate + 'T00:00:00')
              const dayLabel = ['日', '月', '火', '水', '木', '金', '土'][d.getDay()]
              return `${d.getMonth() + 1}月${d.getDate()}日（${dayLabel}）`
            })()}
          </div>
          <div className="text-xs text-zinc-400 mb-3.5 pl-[22px]">
            {(() => {
              const av = availabilities.find(a => a.date === selectedDate)
              return av ? `坐班 ${av.start_time?.slice(0, 5)} - ${av.end_time?.slice(0, 5)}` : ''
            })()}
          </div>

          {daySlots.length === 0 ? (
            <div className="text-sm text-zinc-400 py-4 text-center">暂无时段</div>
          ) : (
            <div>
              {daySlots.map(s => {
                const badge = STATUS_BADGE[s.status] || STATUS_BADGE.open
                return (
                  <div key={s.id} className="flex items-center py-2.5 gap-3 border-b border-zinc-100">
                    <span className="text-[13px] font-medium w-[100px] shrink-0">
                      {s.start_time?.slice(0, 5)} - {s.end_time?.slice(0, 5)}
                    </span>
                    <span className={`flex-1 text-[13px] ${
                      !s.student_name ? 'text-zinc-400 italic' :
                      s.status === 'cancelled' ? 'text-red-500 line-through' : ''
                    }`}>
                      {s.student_name || '暂无预约'}
                    </span>
                    <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-medium ${badge.bg} ${badge.text}`}>
                      {badge.label}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      <div className="mt-7 text-sm font-semibold flex items-center gap-1.5 mb-3">
        <CalendarPlus size={15} className="text-zinc-500" /> 已登记排班
      </div>
      {availabilities.length === 0 && (
        <div className="text-sm text-zinc-400 py-4 text-center">暂无排班记录</div>
      )}
      {availabilities.map(a => {
        const d = new Date(a.date + 'T00:00:00')
        const dayLabel = ['日', '月', '火', '水', '木', '金', '土'][d.getDay()]
        const isPast = new Date(a.date) < new Date(new Date().toDateString())
        return (
          <button
            key={a.id}
            onClick={() => loadDaySlots(a.date)}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-[10px] border mb-1.5 text-left transition-colors ${
              selectedDate === a.date ? 'border-violet-300 bg-violet-50' : 'border-zinc-100 bg-white hover:bg-zinc-50'
            }`}
          >
            <div>
              <div className="text-[13px] font-medium">
                {d.getMonth() + 1}/{d.getDate()}（{dayLabel}）{a.start_time?.slice(0, 5)}-{a.end_time?.slice(0, 5)}
              </div>
            </div>
            <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-medium ${
              isPast ? 'bg-zinc-100 text-zinc-500' : 'bg-teal-100 text-teal-700'
            }`}>
              {isPast ? '已结束' : '待开放'}
            </span>
          </button>
        )
      })}
    </div>
  )
}

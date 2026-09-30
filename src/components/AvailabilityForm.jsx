import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { supabase } from '../api/supabase'
import { fmtDate } from '../utils/time'
import RoomInput from './RoomInput'

function defaultDate() {
  const d = new Date()
  d.setDate(d.getDate() + 2)
  return fmtDate(d)
}

// 登记坐班时间：老师端和教务端共用，提交后由数据库触发器切成 30 分钟的时段
export default function AvailabilityForm({ teacherId, onAdded }) {
  const [date, setDate] = useState(defaultDate)
  const [startTime, setStartTime] = useState('13:00')
  const [endTime, setEndTime] = useState('18:00')
  const [room, setRoom] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  // 默认填上这位老师上次登记的教室
  useEffect(() => {
    supabase
      .from('reservation_slots_visible')
      .select('room')
      .eq('teacher_id', teacherId)
      .not('room', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .then(({ data }) => { if (data?.[0]) setRoom(r => r || data[0].room) })
  }, [teacherId])

  async function handleSubmit() {
    if (!date || !startTime || !endTime) return
    if (date < fmtDate(new Date())) {
      setSubmitError('不能登记过去的日期')
      return
    }
    if (endTime <= startTime) {
      setSubmitError('结束时间要晚于开始时间')
      return
    }
    setSubmitError('')
    setSubmitting(true)

    // 按实际存在的时段判断重叠，老师取消（删除）过的时段可以重新登记
    const { data: overlap } = await supabase
      .from('reservation_slots_visible')
      .select('id')
      .eq('teacher_id', teacherId)
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
      teacher_id: teacherId,
      date,
      start_time: startTime,
      end_time: endTime,
      room: room.trim() || null,
    })
    setSubmitting(false)
    if (error) {
      setSubmitError('提交失败：' + error.message)
      return
    }
    onAdded()
  }

  return (
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
            min={fmtDate(new Date())}
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
        <div>
          <label className="block text-[11px] text-zinc-500 mb-1">教室</label>
          <RoomInput value={room} onChange={setRoom} className="w-[130px]" />
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
  )
}

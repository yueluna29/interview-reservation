import { useState } from 'react'
import { supabase } from '../api/supabase'
import { fmtDate, toMinutes, followingRun } from '../utils/time'

function fromMinutes(m) {
  const c = Math.min(m, 23 * 60 + 59)
  return `${String(Math.floor(c / 60)).padStart(2, '0')}:${String(c % 60).padStart(2, '0')}`
}

// 改空闲时段的日期和时间：老师端和教务端共用
// 从点的时段往后连着的空闲时段里选一段，改到新的日期和时间
// 数据库里会删掉旧时段、按新时间重新切成 30 分钟的时段，教室沿用；成功后 onDone(新日期)
export default function RescheduleForm({ slot, teacherDaySlots, onDone, className = '' }) {
  const chain = []
  for (const s of followingRun(slot, teacherDaySlots)) {
    if (s.status !== 'open') break
    chain.push(s)
  }
  // endIdx / newEnd 为 null 时跟着默认值走：范围默认是整段连着的空闲时段，新结束时间默认保持原来的时长
  const [endIdx, setEndIdx] = useState(null)
  const [newDate, setNewDate] = useState(slot.date)
  const [newStart, setNewStart] = useState(slot.start_time.slice(0, 5))
  const [newEnd, setNewEnd] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const idx = Math.min(endIdx ?? chain.length - 1, chain.length - 1)
  const targets = chain.slice(0, idx + 1)
  const oldStart = slot.start_time.slice(0, 5)
  const oldEnd = targets[targets.length - 1].end_time.slice(0, 5)
  const end = newEnd ?? fromMinutes(toMinutes(newStart) + toMinutes(oldEnd) - toMinutes(oldStart))
  const unchanged = newDate === slot.date && newStart === oldStart && end === oldEnd

  // 改开始时间时，结束时间跟着平移，时长不变
  function changeStart(v) {
    if (!v) return
    if (newEnd !== null) setNewEnd(fromMinutes(toMinutes(v) + toMinutes(newEnd) - toMinutes(newStart)))
    setNewStart(v)
  }

  async function handleSubmit() {
    if (!newDate || !newStart || !end) return
    setBusy(true)
    setError('')
    const { error } = await supabase.rpc('reschedule_open_slots', {
      slot_ids: targets.map(s => s.id),
      new_date: newDate,
      new_start: newStart,
      new_end: end,
    })
    setBusy(false)
    if (error) {
      setError(error.message)
      return
    }
    onDone(newDate)
  }

  return (
    <div className={`rounded-lg bg-zinc-50 p-3 ${className}`}>
      <div className="flex items-center gap-1.5 text-[12px] text-zinc-500 mb-2.5">
        <span className="w-8 shrink-0">原来</span>
        <span>{oldStart} –</span>
        {chain.length > 1 ? (
          <select
            value={idx}
            onChange={e => { setEndIdx(Number(e.target.value)); setNewEnd(null) }}
            className="px-1.5 py-0.5 rounded-md border border-zinc-300 text-[12px] bg-white"
          >
            {chain.map((s, i) => <option key={s.id} value={i}>{s.end_time.slice(0, 5)}</option>)}
          </select>
        ) : (
          <span>{oldEnd}</span>
        )}
        <span className="text-zinc-400">共 {targets.length} 个空闲时段</span>
      </div>
      <div className="flex items-start gap-1.5 text-[12px] text-zinc-500">
        <span className="w-8 shrink-0 pt-1.5">改成</span>
        <div className="flex-1 min-w-0 flex flex-col gap-1.5">
          <input
            type="date"
            value={newDate}
            min={fmtDate(new Date())}
            onChange={e => setNewDate(e.target.value)}
            className="w-full px-2 py-1 rounded-lg border border-zinc-300 text-[13px] text-zinc-800 bg-white"
          />
          <div className="flex items-center gap-1.5">
            <input
              type="time"
              value={newStart}
              onChange={e => changeStart(e.target.value)}
              className="flex-1 min-w-0 px-2 py-1 rounded-lg border border-zinc-300 text-[13px] text-zinc-800 bg-white"
            />
            <span>–</span>
            <input
              type="time"
              value={end}
              onChange={e => setNewEnd(e.target.value)}
              className="flex-1 min-w-0 px-2 py-1 rounded-lg border border-zinc-300 text-[13px] text-zinc-800 bg-white"
            />
          </div>
        </div>
      </div>
      <button
        onClick={handleSubmit}
        disabled={busy || unchanged}
        className="w-full mt-2.5 py-1.5 rounded-lg bg-zinc-800 text-white text-[13px] font-medium disabled:opacity-30"
      >
        {busy ? '...' : '确认修改'}
      </button>
      <div className="text-[11px] text-zinc-400 mt-1.5">只能改没被预约的空闲时段，教室沿用原来的</div>
      {error && <div className="mt-2 text-[12px] text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</div>}
    </div>
  )
}

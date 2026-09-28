import { useState } from 'react'
import { CalendarDays, Clock, X, Trash2, Ban, RotateCcw } from 'lucide-react'
import { supabase } from '../api/supabase'
import { dateLabel } from '../utils/time'
import BlockNoteInput from './BlockNoteInput'

const EDITABLE = ['open', 'blocked']

// 从点的这个时段往后，时间连着、还没被预约的自己的时段，可以一起处理
function followingRun(slot, ownDaySlots) {
  const sorted = [...ownDaySlots].sort((a, b) => a.start_time.localeCompare(b.start_time))
  const chain = [slot]
  for (let i = sorted.findIndex(s => s.id === slot.id) + 1; i < sorted.length; i++) {
    const s = sorted[i]
    if (s.start_time !== chain[chain.length - 1].end_time || !EDITABLE.includes(s.status)) break
    chain.push(s)
  }
  return chain
}

// 老师管理自己的时段：设为不可约（写明要做什么）、恢复可预约、删除
export default function TeacherSlotModal({ slot, ownDaySlots, onClose, onSaved }) {
  const chain = followingRun(slot, ownDaySlots)
  const [endIdx, setEndIdx] = useState(0)
  const [note, setNote] = useState(slot.note || '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const blocked = slot.status === 'blocked'
  const targets = chain.slice(0, endIdx + 1)
  const ids = targets.map(s => s.id)
  const range = `${slot.start_time.slice(0, 5)}-${targets[targets.length - 1].end_time.slice(0, 5)}`

  async function apply(fn) {
    setBusy(true)
    setError('')
    const { data, error } = await fn()
    setBusy(false)
    if (error) {
      setError('操作失败：' + error.message)
      return
    }
    const skipped = ids.length - (data?.length ?? 0)
    if (skipped > 0) alert(`有 ${skipped} 个时段刚被学生预约了，没有改动`)
    onSaved()
  }

  function handleBlock() {
    apply(() => supabase
      .from('reservation_slots')
      .update({ status: 'blocked', note: note.trim() || null })
      .in('id', ids)
      .in('status', EDITABLE)
      .select('id'))
  }

  function handleRestore() {
    apply(() => supabase
      .from('reservation_slots')
      .update({ status: 'open', note: null })
      .in('id', ids)
      .in('status', EDITABLE)
      .select('id'))
  }

  function handleDelete() {
    if (!confirm(`确定删除 ${dateLabel(slot.date)} ${range} 的时段吗？删除后学生将看不到这段时间。`)) return
    apply(() => supabase
      .from('reservation_slots')
      .delete()
      .in('id', ids)
      .in('status', EDITABLE)
      .select('id'))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/25" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="bg-white rounded-2xl p-6 w-[340px] max-w-[calc(100vw-32px)] shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <span className="text-base font-semibold">管理时段</span>
          <button onClick={onClose} className="text-zinc-400"><X size={18} /></button>
        </div>

        <div className="flex flex-col gap-2 mb-5 text-sm text-zinc-600">
          <div className="flex items-center gap-2.5">
            <CalendarDays size={15} className="text-zinc-400" />
            <span>{dateLabel(slot.date)}</span>
          </div>
          <div className="flex items-center gap-2.5">
            <Clock size={15} className="text-zinc-400" />
            <span>{slot.start_time.slice(0, 5)} -</span>
            {chain.length > 1 ? (
              <select
                value={endIdx}
                onChange={e => setEndIdx(Number(e.target.value))}
                className="px-2 py-1 rounded-lg border border-zinc-300 text-[13px] bg-white"
              >
                {chain.map((s, i) => <option key={s.id} value={i}>{s.end_time.slice(0, 5)}</option>)}
              </select>
            ) : (
              <span>{slot.end_time.slice(0, 5)}</span>
            )}
            <span className={`text-[11px] px-2 py-0.5 rounded-full ${blocked ? 'bg-amber-100 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
              {blocked ? '不可约' : '空闲'}
            </span>
          </div>
          {chain.length > 1 && (
            <div className="text-[11px] text-zinc-400 pl-[25px]">可以改结束时间，把后面连着的时段一起处理</div>
          )}
        </div>

        <div className="mb-4">
          <label className="block text-[11px] text-zinc-500 mb-1">不可约的原因（学生只会看到「不可约」）</label>
          <BlockNoteInput value={note} onChange={setNote} />
        </div>

        <div className="flex gap-2">
          {blocked && (
            <button
              onClick={handleRestore}
              disabled={busy}
              className="flex-1 py-2 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-700 text-[13px] font-medium flex items-center justify-center gap-1 disabled:opacity-40"
            >
              <RotateCcw size={13} /> 恢复可预约
            </button>
          )}
          <button
            onClick={handleBlock}
            disabled={busy}
            className="flex-1 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-[13px] font-semibold flex items-center justify-center gap-1 transition-colors disabled:opacity-40"
          >
            <Ban size={13} /> {blocked ? '保存' : '设为不可约'}
          </button>
        </div>

        {error && <div className="mt-3 text-[12px] text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</div>}

        <div className="mt-4 pt-3 border-t border-zinc-100">
          <button
            onClick={handleDelete}
            disabled={busy}
            className="text-[12px] text-red-600 flex items-center gap-1 hover:text-red-700 disabled:opacity-40"
          >
            <Trash2 size={13} /> 删除{targets.length > 1 ? `这 ${targets.length} 个` : '该'}时段
          </button>
        </div>
      </div>
    </div>
  )
}

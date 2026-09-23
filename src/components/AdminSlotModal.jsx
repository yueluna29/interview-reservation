import { useState, useEffect } from 'react'
import { CalendarDays, Clock, GraduationCap, X, Trash2, ArrowRightLeft } from 'lucide-react'
import { supabase } from '../api/supabase'
import { fmtDate, isPast, dateLabel } from '../utils/time'

const STATUS_LABEL = { open: '空闲', booked: '已预约', cancelled: '已取消' }

// 教务编辑单个时段：指定/更换/取消学生、改约到其他空闲时段、删除时段
export default function AdminSlotModal({ slot, students, onClose, onSaved }) {
  const [studentId, setStudentId] = useState(slot.student_id || '')
  const [moveDate, setMoveDate] = useState(slot.date)
  const [moveOptions, setMoveOptions] = useState([])
  const [moveTarget, setMoveTarget] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const isBooked = slot.status === 'booked'

  useEffect(() => {
    if (!isBooked || !moveDate) return
    supabase
      .from('reservation_slots_visible')
      .select('*')
      .eq('status', 'open')
      .eq('date', moveDate)
      .order('start_time')
      .then(({ data }) => setMoveOptions((data || []).filter(s => s.id !== slot.id && !isPast(s))))
  }, [moveDate, isBooked, slot.id])

  async function run(fn) {
    setBusy(true)
    setError('')
    const msg = await fn()
    setBusy(false)
    if (msg) {
      setError(msg)
      return
    }
    onSaved()
  }

  // 该学生同一时间是否已有别的预约
  async function hasConflict(student, target) {
    const { data } = await supabase
      .from('reservation_slots_visible')
      .select('id')
      .eq('student_id', student)
      .eq('status', 'booked')
      .eq('date', target.date)
      .lt('start_time', target.end_time)
      .gt('end_time', target.start_time)
      .neq('id', slot.id)
      .limit(1)
    return data && data.length > 0
  }

  async function handleSaveStudent() {
    const student = students.find(s => s.id === studentId)
    if (student && await hasConflict(studentId, slot)
      && !confirm(`${student.name} 在该时间段已有其他预约，仍要继续吗？`)) return
    run(async () => {
      if (!student) {
        const { error } = await supabase
          .from('reservation_slots')
          .update({ student_id: null, student_name: null, status: 'open', cancelled_at: new Date().toISOString() })
          .eq('id', slot.id)
        return error && '取消失败：' + error.message
      }
      const { error } = await supabase
        .from('reservation_slots')
        .update({ student_id: studentId, student_name: student.name, status: 'booked', booked_at: new Date().toISOString() })
        .eq('id', slot.id)
      return error && '保存失败：' + error.message
    })
  }

  async function handleMove() {
    const target = moveOptions.find(s => s.id === moveTarget)
    if (!target) return
    if (await hasConflict(slot.student_id, target)
      && !confirm(`${slot.student_name} 在目标时间段已有其他预约，仍要继续吗？`)) return
    run(async () => {
      // 先占目标时段，成功后再释放原时段，避免学生两头落空
      const { data: taken, error } = await supabase
        .from('reservation_slots')
        .update({ student_id: slot.student_id, student_name: slot.student_name, status: 'booked', booked_at: new Date().toISOString() })
        .eq('id', target.id)
        .eq('status', 'open')
        .select('id')
      if (error) return '改约失败：' + error.message
      if (!taken?.length) return '目标时段刚被别人预约了，请重新选择'
      const { error: releaseError } = await supabase
        .from('reservation_slots')
        .update({ student_id: null, student_name: null, status: 'open', booked_at: null })
        .eq('id', slot.id)
      return releaseError && '新时段已预约，但原时段释放失败：' + releaseError.message
    })
  }

  function handleDelete() {
    const warn = isBooked ? `该时段已被 ${slot.student_name} 预约，删除后预约也会一起消失。` : ''
    if (!confirm(`确定删除 ${dateLabel(slot.date)} ${slot.start_time?.slice(0, 5)} 的时段吗？${warn}`)) return
    run(async () => {
      const { error } = await supabase.from('reservation_slots').delete().eq('id', slot.id)
      return error && '删除失败：' + error.message
    })
  }

  const studentChanged = studentId !== (slot.student_id || '')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/25" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="bg-white rounded-2xl p-6 w-[340px] max-w-[calc(100vw-32px)] shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <span className="text-base font-semibold">编辑时段</span>
          <button onClick={onClose} className="text-zinc-400"><X size={18} /></button>
        </div>

        <div className="flex flex-col gap-2 mb-5 text-sm text-zinc-600">
          <div className="flex items-center gap-2.5">
            <CalendarDays size={15} className="text-zinc-400" />
            <span>{dateLabel(slot.date)}</span>
          </div>
          <div className="flex items-center gap-2.5">
            <Clock size={15} className="text-zinc-400" />
            <span>{slot.start_time?.slice(0, 5)} - {slot.end_time?.slice(0, 5)}</span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-500">{STATUS_LABEL[slot.status]}</span>
          </div>
          <div className="flex items-center gap-2.5">
            <GraduationCap size={15} className="text-zinc-400" />
            <span>{slot.teacher_name}</span>
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-[11px] text-zinc-500 mb-1">学生</label>
          <div className="flex gap-2">
            <select
              value={studentId}
              onChange={e => setStudentId(e.target.value)}
              className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg border border-zinc-300 text-[13px] bg-white"
            >
              <option value="">— 无（空闲）—</option>
              {students.map(s => (
                <option key={s.id} value={s.id}>{s.name}{s.login_id ? `（${s.login_id}）` : ''}</option>
              ))}
            </select>
            <button
              onClick={handleSaveStudent}
              disabled={busy || !studentChanged}
              className="px-3.5 py-1.5 rounded-lg bg-zinc-800 text-white text-[13px] font-medium disabled:opacity-30"
            >
              保存
            </button>
          </div>
          {isBooked && studentId === '' && studentChanged && (
            <div className="text-[11px] text-amber-600 mt-1">保存后将取消该学生的预约，时段恢复为空闲</div>
          )}
        </div>

        {isBooked && (
          <div className="mb-4">
            <label className="block text-[11px] text-zinc-500 mb-1">改约到其他空闲时段</label>
            <div className="flex gap-2 mb-2">
              <input
                type="date"
                value={moveDate}
                min={fmtDate(new Date())}
                onChange={e => { setMoveDate(e.target.value); setMoveTarget('') }}
                className="px-2.5 py-1.5 rounded-lg border border-zinc-300 text-[13px]"
              />
              <select
                value={moveTarget}
                onChange={e => setMoveTarget(e.target.value)}
                className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg border border-zinc-300 text-[13px] bg-white"
              >
                <option value="">{moveOptions.length ? '选择时段' : '该日无空闲时段'}</option>
                {moveOptions.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.start_time?.slice(0, 5)}-{s.end_time?.slice(0, 5)} {s.teacher_name}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={handleMove}
              disabled={busy || !moveTarget}
              className="w-full py-1.5 rounded-lg border border-teal-300 bg-teal-50 text-teal-700 text-[13px] font-medium flex items-center justify-center gap-1 disabled:opacity-40"
            >
              <ArrowRightLeft size={13} /> 改约
            </button>
          </div>
        )}

        {error && <div className="mb-3 text-[12px] text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</div>}

        <div className="pt-3 border-t border-zinc-100">
          <button
            onClick={handleDelete}
            disabled={busy}
            className="text-[12px] text-red-600 flex items-center gap-1 hover:text-red-700 disabled:opacity-40"
          >
            <Trash2 size={13} /> 删除该时段
          </button>
        </div>
      </div>
    </div>
  )
}

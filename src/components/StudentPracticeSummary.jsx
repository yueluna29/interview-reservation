import { isPast, dateLabel } from '../utils/time'

// 教务搜学生时的汇总：每位对得上的同学练习过几次、还约了几次、最近一次是什么时候
// bookings 是搜索结果（已预约的时段，最近的在前）
export default function StudentPracticeSummary({ students, bookings }) {
  if (students.length === 0) return null
  return (
    <div className="flex flex-col gap-1.5 mb-3">
      {students.slice(0, 5).map(st => {
        const mine = bookings.filter(b => b.student_id === st.id)
        const done = mine.filter(b => isPast(b))
        const last = done[0]
        return (
          <div key={st.id} className="px-3.5 py-2.5 rounded-[10px] bg-teal-50/60 border border-teal-100 text-[13px]">
            <span className="font-semibold text-teal-800">{st.name}</span>
            {st.login_id && <span className="text-xs text-zinc-400 ml-1">（{st.login_id}）</span>}
            <span className="text-zinc-600 ml-2">
              {mine.length === 0 ? '还没有预约过' : `已练习 ${done.length} 次 · 待练习 ${mine.length - done.length} 次`}
            </span>
            {last && (
              <div className="text-xs text-zinc-500 mt-0.5">
                最近一次：{dateLabel(last.date)} {last.start_time.slice(0, 5)} · {last.teacher_name}
              </div>
            )}
          </div>
        )
      })}
      {students.length > 5 && (
        <div className="text-xs text-zinc-400">还有 {students.length - 5} 位同学也对得上，输入完整姓名或登录ID 可以缩小范围</div>
      )}
    </div>
  )
}

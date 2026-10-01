import { isPast, dateLabel } from '../utils/time'
import { TEACHER_COLORS } from '../utils/teacherColors'

// 按日期分组的预约列表：教务的「全部预约」和老师的学生记录搜索共用
// showStatus 时每条标「已练习 / 待练习」，否则过去的变淡；onSelect 不传就只能看不能点
export default function BookingList({ bookings, showStatus, onSelect }) {
  const colorOf = new Map()
  for (const b of bookings) {
    if (!colorOf.has(b.teacher_id)) colorOf.set(b.teacher_id, TEACHER_COLORS[colorOf.size % TEACHER_COLORS.length])
  }

  const groups = []
  for (const b of bookings) {
    const last = groups[groups.length - 1]
    if (last && last.date === b.date) last.items.push(b)
    else groups.push({ date: b.date, items: [b] })
  }

  return groups.map(group => (
    <div key={group.date} className="mb-4">
      <div className="text-[13px] font-semibold text-zinc-700 mb-1.5">{dateLabel(group.date)}</div>
      {group.items.map(b => {
        const past = isPast(b)
        const ac = colorOf.get(b.teacher_id)
        const Tag = onSelect ? 'button' : 'div'
        return (
          <Tag
            key={b.id}
            onClick={onSelect && (() => onSelect(b))}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-[10px] border border-zinc-100 mb-1.5 bg-white text-left text-[13px] ${onSelect ? 'hover:border-teal-300 transition-colors' : ''} ${past && !showStatus ? 'opacity-50' : ''}`}
          >
            <span className="font-medium w-[88px] shrink-0">{b.start_time?.slice(0, 5)}-{b.end_time?.slice(0, 5)}</span>
            <span className="flex-1 min-w-0 truncate">
              <span className={`inline-flex items-center justify-center w-[20px] h-[20px] rounded-full text-[10px] font-semibold mr-1.5 align-middle ${ac.bg} ${ac.text}`}>
                {b.teacher_name?.[0]}
              </span>
              {b.teacher_name}
              {b.room && <span className="text-zinc-400 ml-1.5">{b.room}</span>}
            </span>
            <span className="flex-1 min-w-0 truncate font-medium text-teal-700">{b.student_name}</span>
            {showStatus && (
              <span className={`text-[11px] px-2 py-0.5 rounded-full shrink-0 ${past ? 'bg-zinc-100 text-zinc-500' : 'bg-teal-50 text-teal-700'}`}>
                {past ? '已练习' : '待练习'}
              </span>
            )}
          </Tag>
        )
      })}
    </div>
  ))
}

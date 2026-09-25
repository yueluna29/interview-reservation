import { Fragment } from 'react'
import { fmtDate, buildTimeRows, dateLabel } from '../utils/time'
import { TEACHER_COLORS } from '../utils/teacherColors'

const WEEKDAY = '日月火水木金土'

const TONES = {
  open: 'bg-emerald-50 border-emerald-300 text-emerald-700',
  booked: 'bg-teal-100 border-teal-300 text-teal-800',
  mine: 'bg-blue-100 border-blue-300 text-blue-800',
  full: 'bg-zinc-100 border-zinc-100 text-zinc-400',
  past: 'bg-zinc-50 border-zinc-100 text-zinc-300',
  cancelled: 'bg-zinc-50 border-zinc-200 text-zinc-400 line-through',
}

const ACCENT_TEXT = { teal: 'text-teal-600', violet: 'text-violet-600' }

function isToday(d) {
  const t = new Date()
  return d.getDate() === t.getDate() && d.getMonth() === t.getMonth() && d.getFullYear() === t.getFullYear()
}

// 三端共用的日历：上面一排选日期，下面把当天按老师分列，同一时间有几位老师就有几列
// slotView(slot) → { tone, title, sub, onClick, dim }，每个时段怎么显示由各页面决定
export default function ScheduleBoard({
  days, selected, onSelect, slots, slotView, dayNote, columnNote, pinTeacherId, accent = 'teal',
}) {
  const accentText = ACCENT_TEXT[accent]

  const byDate = {}
  for (const s of slots) (byDate[s.date] ||= []).push(s)

  // 按名字给这一段日期里的老师分配颜色，切换日期时同一位老师颜色不变
  const colorOf = new Map(
    [...new Map(slots.map(s => [s.teacher_id, s.teacher_name || ''])).entries()]
      .sort((a, b) => a[1].localeCompare(b[1], 'zh'))
      .map(([id], i) => [id, TEACHER_COLORS[i % TEACHER_COLORS.length]])
  )

  const dayStr = fmtDate(days[selected])
  const daySlots = byDate[dayStr] || []

  const columnMap = new Map()
  const cells = {}
  for (const s of daySlots) {
    const time = s.start_time.slice(0, 5)
    const col = columnMap.get(s.teacher_id)
    if (!col) columnMap.set(s.teacher_id, { id: s.teacher_id, name: s.teacher_name || '老师', first: time, slots: [s] })
    else {
      col.slots.push(s)
      if (time < col.first) col.first = time
    }
    ;(cells[`${s.teacher_id}_${time}`] ||= []).push(s)
  }
  // 自己排最前，其余按当天开始时间、再按名字
  const columns = [...columnMap.values()].sort((a, b) =>
    (b.id === pinTeacherId) - (a.id === pinTeacherId)
    || a.first.localeCompare(b.first)
    || a.name.localeCompare(b.name, 'zh'))
  // 连续一小时以上谁都没排班的空档折叠成一行，免得上下两段隔得太远
  const times = buildTimeRows(daySlots)
  const rows = []
  for (let i = 0; i < times.length;) {
    let j = i
    while (j < times.length && !columns.some(col => cells[`${col.id}_${times[j]}`])) j++
    if (j - i >= 2) {
      rows.push({ gap: true, from: times[i], to: times[j] })
      i = j
    } else {
      rows.push({ time: times[i] })
      i++
    }
  }

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 mb-4">
        {days.map((d, i) => {
          const ds = byDate[fmtDate(d)] || []
          const note = ds.length > 0 ? dayNote?.(ds) : ''
          const active = i === selected
          return (
            <button
              key={i}
              onClick={() => onSelect(i)}
              className={`rounded-lg border py-1.5 flex flex-col items-center ${active
                ? 'bg-zinc-800 border-zinc-800 text-white'
                : 'bg-white border-zinc-200 hover:border-zinc-400'}`}
            >
              <span className={`text-[10px] ${active ? 'text-zinc-300' : 'text-zinc-400'}`}>{WEEKDAY[d.getDay()]}</span>
              <span className={`text-sm font-semibold ${!active && isToday(d) ? accentText : ''}`}>{d.getDate()}</span>
              <span className={`text-[10px] leading-[14px] h-[14px] whitespace-nowrap ${active ? 'text-zinc-300' : note ? accentText : 'text-zinc-300'}`}>
                {note || '—'}
              </span>
            </button>
          )
        })}
      </div>

      <div className="flex items-baseline gap-2 mb-2">
        <span className="text-[13px] font-semibold">{dateLabel(dayStr)}</span>
        {columns.length > 0 && <span className="text-xs text-zinc-400">{columns.length} 位老师坐班</span>}
      </div>

      {columns.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-200 bg-white py-10 text-center text-[13px] text-zinc-400">
          这天还没有老师登记坐班
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
          <div className="grid" style={{ gridTemplateColumns: `44px repeat(${columns.length}, minmax(88px, 1fr))` }}>
            <div className="sticky left-0 z-10 bg-white border-b border-zinc-200" />
            {columns.map(col => {
              const c = colorOf.get(col.id)
              const note = columnNote?.(col.slots)
              return (
                <div key={col.id} className="relative border-b border-l border-zinc-200 px-2 pt-2.5 pb-2 min-w-0">
                  <div className={`absolute inset-x-0 top-0 h-[3px] ${c.bar}`} />
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className={`w-5 h-5 shrink-0 rounded-full text-[10px] font-semibold flex items-center justify-center ${c.bg} ${c.text}`}>
                      {col.name[0]}
                    </span>
                    <span className="text-[12px] font-semibold truncate">
                      {col.name}
                      {col.id === pinTeacherId && <span className={`font-normal ${accentText}`}>（我）</span>}
                    </span>
                  </div>
                  {note && <div className="text-[10px] text-zinc-400 mt-0.5 pl-[26px] truncate">{note}</div>}
                </div>
              )
            })}

            {rows.map(({ gap, from, to, time }) => gap ? (
              <Fragment key={from}>
                <div className="sticky left-0 z-10 bg-zinc-50 border-t border-zinc-100" />
                <div
                  style={{ gridColumn: '2 / -1' }}
                  className="border-t border-l border-zinc-100 bg-zinc-50 py-1.5 text-center text-[11px] text-zinc-400"
                >
                  {from} – {to} 无人坐班
                </div>
              </Fragment>
            ) : (
              <Fragment key={time}>
                <div className="sticky left-0 z-10 bg-white border-t border-zinc-100 pr-1.5 pt-1 text-right text-[11px] text-zinc-400">
                  {time}
                </div>
                {columns.map(col => (
                  <div key={col.id} className="border-t border-l border-zinc-100 p-0.5 min-h-[44px] flex flex-col gap-0.5">
                    {(cells[`${col.id}_${time}`] || []).map(slot => {
                      const v = slotView(slot)
                      const Tag = v.onClick ? 'button' : 'div'
                      return (
                        <Tag
                          key={slot.id}
                          onClick={v.onClick}
                          className={`flex-1 w-full flex flex-col justify-center rounded-md border px-1.5 py-1 text-left leading-tight ${TONES[v.tone]} ${v.dim ? 'opacity-50' : ''} ${v.onClick ? 'cursor-pointer hover:brightness-95' : ''}`}
                        >
                          <div className="text-[11px] font-semibold truncate">{v.title}</div>
                          {v.sub && <div className="text-[10px] opacity-70 truncate">{v.sub}</div>}
                        </Tag>
                      )
                    })}
                  </div>
                ))}
              </Fragment>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

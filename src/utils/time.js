export function fmtDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function toMinutes(t) {
  return Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5))
}

// 某一天的时间行：从最早到最晚的时段每 30 分钟一行（中间空档也保留），非整点/半点的时段单独占一行
export function buildTimeRows(slots) {
  const starts = slots.filter(s => s.start_time).map(s => s.start_time.slice(0, 5))
  if (starts.length === 0) return []
  const set = new Set(starts)
  const first = Math.min(...starts.map(toMinutes))
  const last = Math.max(...starts.map(toMinutes))
  for (let m = Math.ceil(first / 30) * 30; m <= last; m += 30) {
    set.add(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`)
  }
  return [...set].sort()
}

// 时段是否已经开始（开始后不能再预约）
export function isPast(slot) {
  return new Date(`${slot.date}T${slot.start_time}`) <= new Date()
}

// '2026-09-24' → '9/24（木）'
export function dateLabel(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`)
  return `${d.getMonth() + 1}/${d.getDate()}（${'日月火水木金土'[d.getDay()]}）`
}

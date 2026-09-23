export function fmtDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// 日历默认显示 9:00–20:30，老师登记了范围外或非整点/半点的时段也要能显示出来
const BASE_TIMES = []
for (let h = 9; h < 21; h++) {
  BASE_TIMES.push(`${String(h).padStart(2, '0')}:00`)
  BASE_TIMES.push(`${String(h).padStart(2, '0')}:30`)
}

export function buildTimeRows(slots) {
  const set = new Set(BASE_TIMES)
  for (const s of slots) {
    if (s.start_time) set.add(s.start_time.slice(0, 5))
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

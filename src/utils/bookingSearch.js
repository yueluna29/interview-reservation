import { supabase } from '../api/supabase'

// 学生名单里姓名或登录ID 对得上的（注册时用拼音名的也能用登录ID 找到）；只有教务能读学生名单
export function matchStudents(students, keyword) {
  const kw = keyword.toLowerCase()
  return students
    .filter(st => st.name?.toLowerCase().includes(kw) || st.login_id?.toLowerCase().includes(kw))
    .slice(0, 50)
}

// 搜索结果里姓名对得上的学生，按最近一次预约排；老师没有学生名单，从预约记录里取
export function studentsInBookings(bookings, keyword) {
  const kw = keyword.toLowerCase()
  const seen = new Map()
  for (const b of bookings) {
    if (b.student_id && !seen.has(b.student_id) && b.student_name?.toLowerCase().includes(kw)) {
      seen.set(b.student_id, { id: b.student_id, name: b.student_name })
    }
  }
  return [...seen.values()]
}

// 按学生姓名 / 老师名字（和可选的学生 id）查已预约的时段，不分过去将来，最近的在前
// 在数据库里查，记录多了也不会被 1000 条的上限截掉
export function searchBookings(keyword, studentIds = []) {
  const kw = keyword.replace(/[,()"\\]/g, '')
  const conds = [`student_name.ilike.*${kw}*`, `teacher_name.ilike.*${kw}*`]
  if (studentIds.length) conds.push(`student_id.in.(${studentIds.join(',')})`)
  return supabase
    .from('reservation_slots_visible')
    .select('*')
    .eq('status', 'booked')
    .or(conds.join(','))
    .order('date', { ascending: false })
    .order('start_time', { ascending: false })
}

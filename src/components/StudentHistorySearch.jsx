import { useState, useEffect } from 'react'
import { Search } from 'lucide-react'
import { searchBookings, studentsInBookings } from '../utils/bookingSearch'
import StudentPracticeSummary from './StudentPracticeSummary'
import BookingList from './BookingList'

// 老师端查学生练习记录：按学生姓名或老师名字搜，不分过去将来
export default function StudentHistorySearch() {
  const [search, setSearch] = useState('')
  const [results, setResults] = useState([])
  const [resultsFor, setResultsFor] = useState('')
  const keyword = search.trim()

  // 等打完字再查；结果和当前搜索词对不上时先显示加载中
  useEffect(() => {
    if (!keyword) return
    let cancelled = false
    const t = setTimeout(async () => {
      const { data } = await searchBookings(keyword)
      if (cancelled) return
      setResults(data || [])
      setResultsFor(keyword)
    }, 300)
    return () => { cancelled = true; clearTimeout(t) }
  }, [keyword])

  const loading = resultsFor !== keyword

  return (
    <div className="mb-6">
      <div className="relative">
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="查学生练习记录：输入学生姓名或老师名字"
          className="w-full pl-8 pr-2.5 py-1.5 rounded-lg border border-zinc-300 text-[13px] bg-white"
        />
      </div>
      {keyword && (
        <div className="mt-3">
          {loading ? (
            <div className="text-sm text-zinc-400 py-6 text-center">加载中...</div>
          ) : results.length === 0 ? (
            <div className="text-sm text-zinc-400 py-6 text-center">没有找到相关的预约</div>
          ) : (
            <>
              <StudentPracticeSummary students={studentsInBookings(results, keyword)} bookings={results} />
              <div className="text-xs text-zinc-400 mb-2">找到 {results.length} 条预约记录，最近的在前</div>
              <BookingList bookings={results} showStatus />
            </>
          )}
        </div>
      )}
    </div>
  )
}

import { useState, useEffect, useId } from 'react'
import { supabase } from '../api/supabase'

// 填写教室名称：老师端和教务端共用，下拉提示大家用过的教室，免得同一间教室写法不一样
export default function RoomInput({ value, onChange, className = '' }) {
  const listId = useId()
  const [rooms, setRooms] = useState([])

  useEffect(() => {
    supabase
      .from('reservation_slots_visible')
      .select('room')
      .not('room', 'is', null)
      .order('created_at', { ascending: false })
      .limit(500)
      .then(({ data }) => setRooms([...new Set((data || []).map(r => r.room))]))
  }, [])

  return (
    <>
      <input
        list={listId}
        value={value}
        onChange={e => onChange(e.target.value)}
        maxLength={20}
        placeholder="例：3号教室"
        className={`px-2.5 py-1.5 rounded-lg border border-zinc-300 text-[13px] ${className}`}
      />
      <datalist id={listId}>
        {rooms.map(r => <option key={r} value={r} />)}
      </datalist>
    </>
  )
}

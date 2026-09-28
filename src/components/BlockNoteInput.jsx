const PRESETS = ['开会', '上课', '午休', '外出']

// 「不可约」时填写要做什么：老师端和教务端共用
export default function BlockNoteInput({ value, onChange }) {
  return (
    <div>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        maxLength={20}
        placeholder="要做什么，比如：开会、上课"
        className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-300 text-[13px]"
      />
      <div className="flex gap-1.5 mt-1.5 flex-wrap">
        {PRESETS.map(p => (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors ${value === p
              ? 'bg-amber-100 border-amber-300 text-amber-800'
              : 'bg-white border-zinc-200 text-zinc-500 hover:border-amber-300'}`}
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  )
}

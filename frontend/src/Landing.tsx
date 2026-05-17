interface Props {
  onEnter: () => void;
}

export default function Landing({ onEnter }: Props) {
  return (
    <div className="min-h-screen bg-[#F0EBE1] flex flex-col font-sans">
      {/* Navbar */}
      <nav className="flex items-center justify-between px-8 py-4 border-b border-black/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#C8603A] flex items-center justify-center text-white text-lg">
            🛍️
          </div>
          <span className="font-bold text-[#1c1c1c] tracking-wide">ElectroAgent</span>
          <span className="text-black/30 text-sm ml-2">|</span>
          <span className="text-xs uppercase tracking-widest text-black/40 ml-2">Internal · Demo</span>
        </div>
        <div className="flex items-center gap-6">
          <span className="text-xs uppercase tracking-widest text-black/40 cursor-pointer hover:text-black/70 transition">
            Docs
          </span>
          <button
            onClick={onEnter}
            className="flex items-center gap-2 bg-[#1c1c1c] text-white text-sm px-5 py-2.5 rounded-full hover:bg-[#333] transition font-medium"
          >
            Open chat <span>→</span>
          </button>
        </div>
      </nav>

      {/* Hero */}
      <main className="flex flex-1 items-center px-16 gap-12 max-w-7xl mx-auto w-full py-16">
        {/* Left */}
        <div className="flex-1 max-w-xl">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-8 h-px bg-[#C8603A]" />
            <span className="text-xs uppercase tracking-widest text-black/50">
              ElectroAgent · Internal AI Agent
            </span>
          </div>

          <h1 className="font-serif text-6xl leading-tight text-[#1c1c1c] mb-6">
            Answers across<br />
            <span className="text-[#C8603A] italic">the electronics store,</span><br />
            in plain English.
          </h1>

          <p className="text-[#1c1c1c]/60 text-lg leading-relaxed mb-10 max-w-md">
            ElectroAgent ties together your product database, customer reviews,
            support tickets, and policy handbook. Ask one question — get a
            grounded answer with the receipts to back it up.
          </p>

          <div className="flex items-center gap-6">
            <button
              onClick={onEnter}
              className="flex items-center gap-2 bg-[#1c1c1c] text-white text-base px-8 py-4 rounded-full hover:bg-[#333] transition font-medium"
            >
              Begin a conversation <span>→</span>
            </button>
            <button
              onClick={onEnter}
              className="text-[#1c1c1c]/50 hover:text-[#1c1c1c] transition text-base underline underline-offset-4"
            >
              What can it do?
            </button>
          </div>
        </div>

        {/* Right — Decorative card */}
        <div className="flex-1 flex justify-center items-center">
          <div className="relative w-[420px]">
            {/* Card */}
            <div className="bg-white rounded-3xl shadow-xl p-8 border border-black/5 rotate-1">
              {/* Card header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#C8603A] flex items-center justify-center text-white text-xs">
                    🛍️
                  </div>
                  <span className="font-bold text-sm text-[#1c1c1c]">ElectroAgent</span>
                </div>
                <span className="text-[10px] uppercase tracking-widest text-black/30">
                  Receipt · 2026
                </span>
              </div>

              <div className="border-t border-dashed border-black/10 my-4" />

              {/* Product info */}
              <div className="grid grid-cols-2 gap-x-8 gap-y-5 text-sm">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-black/30 mb-1">Product</p>
                  <p className="font-bold text-2xl text-[#1c1c1c]">MacBook</p>
                  <p className="text-black/40 text-xs">Pro 14 · Apple</p>
                </div>
                <div className="text-right relative">
                  {/* Stamp */}
                  <div className="absolute -top-2 right-0 border-2 border-[#C8603A] text-[#C8603A] text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded rotate-[-8deg] opacity-80">
                    Now Operational
                  </div>
                  <p className="font-bold text-2xl text-[#1c1c1c] mt-6">$1,999</p>
                  <p className="text-black/40 text-xs">Laptop · In stock: 15</p>
                </div>
              </div>

              <div className="border-t border-dashed border-black/10 my-4" />

              {/* Meta row */}
              <div className="grid grid-cols-3 gap-4 text-xs">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-black/30 mb-1">Customer</p>
                  <p className="font-medium text-[#1c1c1c]">Alice J.</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-black/30 mb-1">Latency</p>
                  <p className="font-medium text-[#1c1c1c]">~3 seconds</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-black/30 mb-1">Today</p>
                  <p className="font-medium text-[#1c1c1c]">2026-05-17</p>
                </div>
              </div>

              <div className="border-t border-dashed border-black/10 my-4" />

              <div>
                <p className="text-[10px] uppercase tracking-widest text-black/30 mb-1">Source</p>
                <p className="font-medium text-[#1c1c1c] text-xs">Postgres · Mongo · RAG</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Bottom bar */}
      <footer className="border-t border-black/10 px-16 py-4 flex items-center gap-8 text-xs">
        <span className="uppercase tracking-widest text-black/30">Connected to</span>
        {["Supabase Postgres", "MongoDB Atlas", "pgvector RAG"].map((s) => (
          <span key={s} className="font-medium text-[#1c1c1c]/60">
            {s}
          </span>
        ))}
      </footer>
    </div>
  );
}

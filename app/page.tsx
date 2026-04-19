"use client";   // ← Add this line at the top


import Link from 'next/link';

const questions = [
  {
    id: 1,
    chapter: "Polity",
    question: "Discuss the significance of the 73rd and 74th Constitutional Amendments in strengthening grassroots democracy in India.",
    difficulty: "Medium",
    timeLimit: "10 min"
  },
  {
    id: 2,
    chapter: "Economy",
    question: "Analyze the impact of Digital Public Infrastructure on financial inclusion in India.",
    difficulty: "Hard",
    timeLimit: "15 min"
  },
  {
    id: 3,
    chapter: "Geography",
    question: "Examine the role of Western Disturbances in India's winter rainfall pattern.",
    difficulty: "Easy",
    timeLimit: "10 min"
  },
  {
    id: 4,
    chapter: "History",
    question: "Critically evaluate the impact of the Permanent Settlement of 1793 on agrarian relations in Bengal.",
    difficulty: "Medium",
    timeLimit: "12 min"
  },
  {
    id: 5,
    chapter: "Ethics",
    question: "How can emotional intelligence help civil servants in dealing with pressure situations? Discuss with examples.",
    difficulty: "Medium",
    timeLimit: "10 min"
  },
  {
    id: 6,
    chapter: "Environment",
    question: "Discuss the importance of biodiversity hotspots and India's initiatives for their conservation.",
    difficulty: "Easy",
    timeLimit: "10 min"
  }
];

const difficultyColors = {
  Easy: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  Medium: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  Hard: "bg-red-500/10 text-red-400 border-red-500/20"
};

export default function Home() {
  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-zinc-800/50 bg-black/80 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/20">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">UPSChub</h1>
                <p className="text-xs text-zinc-500">Answer Writing Practice</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-2 rounded-full bg-zinc-900 px-4 py-2 text-sm">
                <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-500"></div>
                <span className="text-zinc-400">Ready to practice</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-zinc-800/50 bg-gradient-to-b from-zinc-900/50 to-black">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(16,185,129,0.1),transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_60%,rgba(16,185,129,0.05),transparent_50%)]"></div>

        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
          <div className="text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-400">
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Premium Practice Platform
            </div>

            <h2 className="mb-6 text-4xl font-bold tracking-tight text-white sm:text-6xl">
              Master Your
              <span className="bg-gradient-to-r from-emerald-400 to-emerald-600 bg-clip-text text-transparent"> Answer Writing</span>
            </h2>

            <p className="mx-auto mb-12 max-w-2xl text-lg text-zinc-400 sm:text-xl">
              Practice makes perfect. Build speed, clarity, and confidence with timed answer writing sessions designed for UPSC success.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-zinc-500">
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Timed Practice</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>Auto Capture</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                <span>PDF Export</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Questions Section */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-12">
          <h3 className="mb-2 text-3xl font-bold text-white">Practice Questions</h3>
          <p className="text-zinc-400">Choose a question and start your timed practice session</p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {questions.map((q, index) => (
            <Link
              key={q.id}
              href={`/write/${q.id}`}
              className="group relative overflow-hidden rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-900 to-zinc-900/50 p-6 transition-all duration-300 hover:border-emerald-500/50 hover:shadow-xl hover:shadow-emerald-500/10"
              style={{
                animationDelay: `${index * 100}ms`,
                animation: 'fadeInUp 0.6s ease-out forwards',
                opacity: 0
              }}
            >
              {/* Gradient overlay on hover */}
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/0 to-emerald-500/0 transition-all duration-300 group-hover:from-emerald-500/5 group-hover:to-transparent"></div>

              <div className="relative">
                {/* Header */}
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center rounded-lg bg-zinc-800 px-3 py-1 text-xs font-medium text-emerald-400">
                      {q.chapter}
                    </span>
                  </div>
                  <div className={`rounded-lg border px-2.5 py-1 text-xs font-medium ${difficultyColors[q.difficulty as keyof typeof difficultyColors]}`}>
                    {q.difficulty}
                  </div>
                </div>

                {/* Question */}
                <p className="mb-6 line-clamp-3 text-sm leading-relaxed text-zinc-300">
                  {q.question}
                </p>

                {/* Footer */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{q.timeLimit}</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm font-medium text-emerald-400 transition-transform group-hover:translate-x-1">
                    Start Practice
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800/50 bg-zinc-950 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600">
                <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <span className="font-semibold text-white">UPSChub</span>
            </div>

            <p className="text-sm text-zinc-500">
              © 2024 UPSChub. Empowering UPSC aspirants.
            </p>
          </div>
        </div>
      </footer>

      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
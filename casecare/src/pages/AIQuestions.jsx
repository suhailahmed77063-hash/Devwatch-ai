import { useState } from 'react'
import { Sparkles, MessageSquareText, Volume2, Check, Languages, Mic, Info, ChevronLeft, ChevronRight, Lightbulb } from 'lucide-react'
import Breadcrumbs from '../components/Breadcrumbs'
import PageHeader from '../components/PageHeader'
import Button from '../components/Button'
import Card from '../components/Card'
import Badge from '../components/Badge'
import ProgressSteps from '../components/ProgressSteps'
import RingProgress from '../components/RingProgress'
import PatientSummary from '../components/PatientSummary'
import { FULL_STEPS, adaptiveQuestion as q, previousResponses, aiInsights, caseSummary } from '../data/caseData'

export default function AIQuestions() {
  const [selected, setSelected] = useState(q.selected)
  const [showWhy, setShowWhy] = useState(true)
  const pct = Math.round((q.index / q.total) * 100)

  return (
    <div className="space-y-5">
      <Breadcrumbs items={[{ label: 'Cases', to: '/cases' }, { label: 'New Case', to: '/cases/new' }, { label: 'AI Questions' }]} />
      <PageHeader
        title="AI Adaptive Questions"
        icon={Sparkles}
        subtitle="AI asks smart, personalized follow-up questions based on the conversation."
        actions={<Button variant="secondary" icon={MessageSquareText}>View Conversation</Button>}
      />

      <Card><ProgressSteps steps={FULL_STEPS} current={2} /></Card>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <Badge tone="purple" size="xs"><Sparkles size={11} className="mr-0.5" /> AI Generated</Badge>
              <button onClick={() => setShowWhy((s) => !s)} className="flex items-center gap-1.5 text-xs font-medium text-primary-600 hover:text-primary-700">
                <Info size={13} /> Why this question?
              </button>
            </div>

            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold leading-snug text-navy-900">{q.hindi}</h2>
                <p className="mt-1.5 text-sm text-slate-500">{q.english}</p>
              </div>
              <button className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary-600 hover:bg-primary-100">
                <Volume2 size={18} />
              </button>
            </div>

            {showWhy && (
              <div className="mt-4 flex gap-2.5 rounded-xl border border-ai-500/20 bg-ai-500/5 p-3.5">
                <Lightbulb size={16} className="mt-0.5 shrink-0 text-ai-600" />
                <div>
                  <p className="text-xs font-semibold text-ai-700">AI Reasoning</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-600">{q.reasoning}</p>
                </div>
              </div>
            )}

            {/* Answer options */}
            <div className="mt-5 space-y-2.5">
              {q.options.map((opt) => {
                const active = selected === opt
                return (
                  <button
                    key={opt}
                    onClick={() => setSelected(opt)}
                    className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm font-medium transition-colors ${
                      active ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-slate-200 text-navy-700 hover:border-primary-300 hover:bg-slate-50'
                    }`}
                  >
                    {opt}
                    <span className={`flex h-5 w-5 items-center justify-center rounded-full border ${active ? 'border-primary-600 bg-primary-600 text-white' : 'border-slate-300'}`}>
                      {active && <Check size={13} strokeWidth={3} />}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Ask-in controls */}
            <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
              <span className="text-xs font-medium text-slate-400">Ask in:</span>
              <Button variant="secondary" size="xs" icon={Languages}>English</Button>
              <Button variant="secondary" size="xs">हिंदी</Button>
              <Button variant="secondary" size="xs" icon={Mic}>Voice Repeat</Button>
            </div>
          </Card>

          <Card title="Previous Responses">
            <div className="space-y-3">
              {previousResponses.map((r, i) => (
                <div key={i} className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-500">{i + 1}</span>
                  <div>
                    <p className="text-sm font-medium text-navy-800">{r.q}</p>
                    <p className="mt-0.5 text-sm text-primary-600">{r.a}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right rail */}
        <div className="space-y-5">
          <PatientSummary>
            <div className="mt-4 border-t border-slate-100 pt-3">
              <p className="text-2xs uppercase tracking-wide text-slate-400">Associated Symptoms</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {caseSummary.associatedSymptoms.map((s) => (
                  <span key={s} className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600">{s}</span>
                ))}
              </div>
            </div>
            <div className="mt-3 border-t border-slate-100 pt-3">
              <p className="text-2xs uppercase tracking-wide text-slate-400">Language</p>
              <p className="mt-0.5 text-sm font-medium text-navy-800">Hindi (Auto-translated)</p>
            </div>
          </PatientSummary>

          <Card title="AI Insights">
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ai-500/10 text-ai-600"><Sparkles size={16} /></span>
              <p className="text-sm font-semibold text-ai-700">High Confidence</p>
            </div>
            <p className="mb-2 text-xs text-slate-400">Possible conditions being considered:</p>
            <ul className="space-y-2">
              {aiInsights.map((ins) => (
                <li key={ins} className="flex items-center gap-2 text-sm text-navy-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-ai-500" /> {ins}
                </li>
              ))}
            </ul>
          </Card>

          <Card title="Question Progress">
            <div className="flex items-center gap-4">
              <RingProgress value={pct} color="#0d9488" size={72}>
                <span className="text-sm font-bold text-navy-900">{q.index}/{q.total}</span>
              </RingProgress>
              <div className="flex-1">
                <p className="text-sm font-medium text-navy-800">Question {q.index} of {q.total}</p>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-primary-500" style={{ width: `${pct}%` }} />
                </div>
                <p className="mt-1.5 text-xs text-slate-400">{q.total - q.index} questions remaining</p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-slate-200 pt-4">
        <Button to="/cases/smart-taking" variant="secondary" icon={ChevronLeft}>Previous</Button>
        <Button to="/cases/history-vitals" iconRight={ChevronRight}>Next</Button>
      </div>
    </div>
  )
}

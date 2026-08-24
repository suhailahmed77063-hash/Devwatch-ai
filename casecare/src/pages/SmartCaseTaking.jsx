import { useState, useEffect } from 'react'
import { Radio, PenSquare, Square, Mic, Pause, RotateCcw, ChevronLeft, ChevronRight, Pencil, Sparkles } from 'lucide-react'
import Breadcrumbs from '../components/Breadcrumbs'
import PageHeader from '../components/PageHeader'
import Button from '../components/Button'
import Card from '../components/Card'
import Select from '../components/Select'
import Tabs from '../components/Tabs'
import Badge from '../components/Badge'
import ProgressSteps from '../components/ProgressSteps'
import AIConfidence from '../components/AIConfidence'
import PatientAvatar from '../components/PatientAvatar'
import { Ico } from '../utils/icons'
import { SMART_STEPS, conversation, extractedInfo } from '../data/caseData'

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? 'bg-primary-600' : 'bg-slate-300'}`}
    >
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? 'left-[22px]' : 'left-0.5'}`} />
    </button>
  )
}

function fmt(s) {
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

export default function SmartCaseTaking() {
  const [tab, setTab] = useState('Voice')
  const [recording, setRecording] = useState(true)
  const [seconds, setSeconds] = useState(28)
  const [autoExtract, setAutoExtract] = useState(true)
  const [adaptive, setAdaptive] = useState(true)

  useEffect(() => {
    if (!recording) return
    const id = setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => clearInterval(id)
  }, [recording])

  return (
    <div className="space-y-5">
      <Breadcrumbs items={[{ label: 'Cases', to: '/cases' }, { label: 'New Case', to: '/cases/new' }, { label: 'Smart Case Taking' }]} />
      <PageHeader
        title="Smart Case Taking"
        icon={Sparkles}
        subtitle="AI-powered conversation to capture patient complaints naturally."
        actions={
          <>
            <Button variant="secondary" icon={PenSquare}>Switch to Manual</Button>
            <Button variant="danger" icon={Square}>End Session</Button>
          </>
        }
      />

      <Card><ProgressSteps steps={SMART_STEPS} current={1} /></Card>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card padding={false}>
            <div className="flex items-center justify-between px-5 pt-4">
              <Tabs
                tabs={[{ label: 'Voice', icon: Mic }, { label: 'Chat Conversation', icon: Radio }]}
                active={tab}
                onChange={setTab}
                className="border-0"
              />
              <Select options={['English', 'हिंदी', 'Auto Detect']} selectClassName="w-32 py-1.5" />
            </div>

            {/* Recorder */}
            <div className="flex flex-col items-center border-b border-slate-100 px-5 py-8">
              <button
                onClick={() => setRecording((r) => !r)}
                className={`relative flex h-24 w-24 items-center justify-center rounded-full text-white shadow-pop transition-transform hover:scale-105 ${recording ? 'bg-primary-600' : 'bg-slate-400'}`}
              >
                {recording && <span className="absolute inset-0 animate-ping rounded-full bg-primary-400/40" />}
                <Mic size={34} />
              </button>

              {/* Waveform */}
              <div className="mt-6 flex h-10 items-center gap-1">
                {Array.from({ length: 32 }).map((_, i) => (
                  <span
                    key={i}
                    className={`w-1 rounded-full ${recording ? 'bg-primary-500' : 'bg-slate-200'}`}
                    style={{
                      height: recording ? `${20 + Math.abs(Math.sin(i * 1.7)) * 60}%` : '18%',
                      animation: recording ? `pulseBar 1s ease-in-out ${i * 0.05}s infinite alternate` : 'none',
                    }}
                  />
                ))}
              </div>

              <p className="mt-4 text-3xl font-bold tabular-nums text-navy-900">{fmt(seconds)}</p>
              <p className="mt-1 text-sm text-slate-500">{recording ? 'Listening... Tap to pause' : 'Paused'}</p>

              <div className="mt-5 flex items-center gap-2.5">
                <Button variant="secondary" size="sm" icon={Pause} onClick={() => setRecording(false)}>Pause</Button>
                <Button variant="danger" size="sm" icon={Square} onClick={() => { setRecording(false); setSeconds(0) }}>Stop</Button>
                <Button variant="ghost" size="sm" icon={RotateCcw} onClick={() => setSeconds(0)}>Restart</Button>
              </div>
            </div>

            {/* Transcript */}
            <div className="px-5 py-4">
              <p className="mb-3 text-sm font-semibold text-navy-800">Recent Conversation</p>
              <div className="space-y-4">
                {conversation.map((m, i) => (
                  <div key={i} className={`flex gap-3 ${m.role === 'ai' ? 'flex-row-reverse' : ''}`}>
                    {m.role === 'ai' ? (
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ai-500 text-white">
                        <Sparkles size={16} />
                      </span>
                    ) : (
                      <PatientAvatar name="Rahul Kumar" initials="RK" size="sm" />
                    )}
                    <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${m.role === 'ai' ? 'rounded-tr-sm bg-ai-500/10 text-navy-800' : 'rounded-tl-sm bg-slate-100 text-navy-800'}`}>
                      <div className="mb-0.5 flex items-center gap-2">
                        <span className="text-xs font-semibold text-navy-700">{m.name}</span>
                        <span className="text-2xs text-slate-400">{m.time}</span>
                      </div>
                      <p className="text-sm leading-relaxed">{m.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>

        {/* Right rail */}
        <div className="space-y-5">
          <Card
            title={
              <div className="flex items-center gap-2">
                <h3 className="text-[15px] font-semibold text-navy-900">Extracted Information</h3>
                <Badge tone="green" size="xs" dot>Live</Badge>
              </div>
            }
          >
            <div className="space-y-3">
              {extractedInfo.map((row) => (
                <div key={row.label} className="group flex items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
                    <Ico name={row.icon} size={15} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-slate-400">{row.label}</p>
                    <p className="truncate text-sm font-medium text-navy-800">{row.value}</p>
                  </div>
                  <button className="text-slate-300 opacity-0 transition-opacity hover:text-primary-600 group-hover:opacity-100">
                    <Pencil size={14} />
                  </button>
                </div>
              ))}
            </div>
          </Card>

          <Card title="AI Confidence Score">
            <AIConfidence value={85} />
          </Card>

          <Card title="Session Controls">
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-navy-800">Auto Extract</p>
                  <p className="text-xs text-slate-400">Automatically extract clinical info</p>
                </div>
                <Toggle checked={autoExtract} onChange={setAutoExtract} />
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
                <div>
                  <p className="text-sm font-medium text-navy-800">Adaptive Questions</p>
                  <p className="text-xs text-slate-400">Let AI ask smart follow-ups</p>
                </div>
                <Toggle checked={adaptive} onChange={setAdaptive} />
              </div>
            </div>
          </Card>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-slate-200 pt-4">
        <Button to="/cases/new" variant="secondary" icon={ChevronLeft}>Previous</Button>
        <Button to="/cases/ai-questions" iconRight={ChevronRight}>Next</Button>
      </div>
    </div>
  )
}

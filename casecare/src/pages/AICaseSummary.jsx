import { FileText, Sparkles, ScrollText, ArrowRight, ChevronLeft, Stethoscope, Activity, CalendarClock, ClipboardList, ListChecks } from 'lucide-react'
import Breadcrumbs from '../components/Breadcrumbs'
import PageHeader from '../components/PageHeader'
import Button from '../components/Button'
import Card from '../components/Card'
import Badge from '../components/Badge'
import ProgressSteps from '../components/ProgressSteps'
import PatientSummary from '../components/PatientSummary'
import { DonutChart } from '../components/Charts'
import { Ico } from '../utils/icons'
import { SUMMARY_STEPS, caseSummary as s, keyClinicalIndicators, sourceOfInformation } from '../data/caseData'

const indicatorTone = { neutral: 'text-navy-800', muted: 'text-slate-400', warn: 'text-amber-600' }

function Block({ icon: Icon, title, children }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-2 text-primary-600">
        <Icon size={15} />
        <h4 className="text-sm font-semibold text-navy-800">{title}</h4>
      </div>
      <div className="pl-[22px] text-sm leading-relaxed text-slate-600">{children}</div>
    </div>
  )
}

export default function AICaseSummary() {
  return (
    <div className="space-y-5">
      <Breadcrumbs items={[{ label: 'Cases', to: '/cases' }, { label: 'New Case', to: '/cases/new' }, { label: 'AI Case Summary' }]} />
      <PageHeader
        title="AI Case Summary"
        icon={Sparkles}
        subtitle="AI-generated clinical summary based on the complete case-taking session."
        actions={
          <>
            <Button variant="secondary" icon={ScrollText}>View Full Transcript</Button>
            <Button to="/cases/review" iconRight={ArrowRight}>Proceed to Review</Button>
          </>
        }
      />

      <Card><ProgressSteps steps={SUMMARY_STEPS} current={4} /></Card>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card padding={false}>
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-ai-500/10 text-ai-600"><Sparkles size={18} /></span>
                <h3 className="text-[15px] font-semibold text-navy-900">AI Generated Case Summary</h3>
              </div>
              <Badge tone="green" size="xs" dot>High Confidence</Badge>
            </div>

            <div className="flex items-start gap-2.5 bg-ai-500/5 px-5 py-3 text-xs leading-relaxed text-slate-600">
              <Sparkles size={14} className="mt-0.5 shrink-0 text-ai-600" />
              This summary was auto-generated from the AI conversation, adaptive questions and recorded vitals. Please review before finalizing.
            </div>

            <div className="grid gap-6 p-5 md:grid-cols-2">
              <div className="space-y-5">
                <Block icon={Stethoscope} title="Chief Complaint">{s.chiefComplaint}</Block>
                <Block icon={ClipboardList} title="History of Present Illness">
                  <ul className="list-disc space-y-1 pl-4">
                    {s.hpi.map((h, i) => <li key={i}>{h}</li>)}
                  </ul>
                </Block>
                <Block icon={Activity} title="Associated Symptoms">
                  <div className="flex flex-wrap gap-1.5">
                    {s.associatedSymptoms.map((a) => (
                      <span key={a} className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600">{a}</span>
                    ))}
                  </div>
                </Block>
                <Block icon={CalendarClock} title="Onset & Duration">{s.onset} onset · {s.durationDetail}</Block>
              </div>

              <div className="space-y-5">
                <div>
                  <div className="mb-1.5 flex items-center gap-2 text-primary-600">
                    <Stethoscope size={15} />
                    <h4 className="text-sm font-semibold text-navy-800">Probable Diagnosis</h4>
                  </div>
                  <div className="rounded-xl border border-primary-100 bg-primary-50/50 p-3.5">
                    <p className="text-sm font-semibold text-navy-900">{s.probableDiagnosis}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-2xs text-slate-500">Confidence</span>
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white">
                        <div className="h-full rounded-full bg-primary-500" style={{ width: '85%' }} />
                      </div>
                      <span className="text-2xs font-semibold text-primary-700">85%</span>
                    </div>
                  </div>
                </div>
                <Block icon={ListChecks} title="Differential Considerations">
                  <ul className="space-y-1">
                    {s.differentials.map((d) => (
                      <li key={d} className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-slate-300" />{d}</li>
                    ))}
                  </ul>
                </Block>
                <div>
                  <div className="mb-1.5 flex items-center gap-2 text-primary-600">
                    <Activity size={15} />
                    <h4 className="text-sm font-semibold text-navy-800">Severity Assessment</h4>
                  </div>
                  <div className="pl-[22px]">
                    <Badge tone="amber" dot>Moderate</Badge>
                    <p className="mt-1.5 text-sm text-slate-600">{s.severityNote}</p>
                  </div>
                </div>
                <Block icon={ListChecks} title="Recommended Next Steps">
                  <ul className="list-disc space-y-1 pl-4">
                    {s.nextSteps.map((n, i) => <li key={i}>{n}</li>)}
                  </ul>
                </Block>
              </div>
            </div>

            <div className="border-t border-slate-100 px-5 py-3 text-2xs leading-relaxed text-slate-400">
              ⚠️ This is an AI-generated summary and does not replace professional medical judgment. Please verify all information before making clinical decisions.
            </div>
          </Card>
        </div>

        {/* Right rail */}
        <div className="space-y-5">
          <PatientSummary showEdit={false} />

          <Card title="Key Clinical Indicators">
            <div className="space-y-3">
              {keyClinicalIndicators.map((k) => (
                <div key={k.label} className="flex items-center justify-between">
                  <span className="flex items-center gap-2.5 text-sm text-slate-600">
                    <Ico name={k.icon} size={16} className="text-slate-400" /> {k.label}
                  </span>
                  <span className={`text-sm font-medium ${indicatorTone[k.tone] || 'text-navy-800'}`}>{k.value}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Source of Information">
            <div className="flex items-center gap-5">
              <DonutChart segments={sourceOfInformation} size={128} thickness={18} />
              <div className="flex-1 space-y-2">
                {sourceOfInformation.map((seg) => (
                  <div key={seg.label} className="flex items-center gap-2 text-sm">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: seg.color }} />
                    <span className="flex-1 text-slate-600">{seg.label}</span>
                    <span className="font-semibold text-navy-800">{seg.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <p className="text-center text-xs text-slate-400">Generated on {s.generatedOn}</p>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-slate-200 pt-4">
        <Button to="/cases/history-vitals" variant="secondary" icon={ChevronLeft}>Previous</Button>
        <Button to="/cases/review" iconRight={ArrowRight}>Proceed to Review</Button>
      </div>
    </div>
  )
}

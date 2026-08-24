import RingProgress from './RingProgress'

// AI Confidence Score block: ring + "High Confidence" label + description.
export default function AIConfidence({
  value = 85,
  label = 'High Confidence',
  description = 'AI is confident about the extracted information. Please review and edit if needed.',
  color = '#3b82f6',
  size = 72,
  className = '',
}) {
  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <RingProgress value={value} color={color} size={size} />
      <div>
        <p className="text-sm font-semibold text-blue-600">{label}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{description}</p>
      </div>
    </div>
  )
}

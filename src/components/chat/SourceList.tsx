import type { SourceReference } from '../../types'

interface SourceListProps {
  sources: SourceReference[]
  onSourceClick?: (source: SourceReference) => void
}

export function SourceList({ sources, onSourceClick }: SourceListProps) {
  if (sources.length === 0) return null

  return (
    <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 8 }}>
        Fuentes
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {sources.map((source, i) => (
          <button
            key={`${source.id}-${i}`}
            className="btn-ghost"
            style={{
              justifyContent: 'flex-start',
              fontSize: '0.8125rem',
              padding: '6px 10px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-tertiary)',
            }}
            onClick={() => onSourceClick?.(source)}
          >
            {source.type === 'document' ? '📄' : '💬'} {source.name}
            {source.page ? ` · página ${source.page}` : ''}
          </button>
        ))}
      </div>
    </div>
  )
}

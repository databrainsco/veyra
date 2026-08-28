import type { Conversation } from '../../types'
import { groupByDate } from '../../utils/helpers'

interface ConversationDrawerProps {
  open: boolean
  onClose: () => void
  conversations: Conversation[]
  activeId: string | null
  onSelect: (conv: Conversation) => void
  onCreate: () => void
}

export function ConversationDrawer({
  open,
  onClose,
  conversations,
  activeId,
  onSelect,
  onCreate,
}: ConversationDrawerProps) {
  const grouped = groupByDate(conversations)

  function handleSelect(conv: Conversation) {
    onSelect(conv)
    onClose()
  }

  return (
    <>
      <div
        className={`drawer-overlay ${open ? 'open' : ''}`}
        onClick={onClose}
        aria-hidden={!open}
      />
      <aside className={`drawer conversation-drawer ${open ? 'open' : ''}`} aria-label="Conversaciones">
        <div className="conversation-drawer-header">
          <h2>Conversaciones</h2>
          <button className="btn-ghost" onClick={onClose} aria-label="Cerrar">
            Cerrar
          </button>
        </div>
        <div className="conversation-drawer-actions">
          <button className="btn btn-secondary" style={{ width: '100%' }} onClick={onCreate}>
            + Nueva conversación
          </button>
        </div>
        <div className="conversation-drawer-list">
          {conversations.length === 0 ? (
            <p className="conversation-drawer-empty">No hay conversaciones todavía</p>
          ) : (
            Object.entries(grouped).map(([label, convs]) =>
              convs.length > 0 ? (
                <div key={label}>
                  <div className="conversation-group-label">{label}</div>
                  {convs.map((conv) => (
                    <button
                      key={conv.id}
                      className={`conversation-item ${activeId === conv.id ? 'active' : ''}`}
                      onClick={() => handleSelect(conv)}
                    >
                      {conv.title}
                    </button>
                  ))}
                </div>
              ) : null,
            )
          )}
        </div>
      </aside>
    </>
  )
}

import type { Conversation } from '../../types'
import { ConversationList } from './ConversationList'
import { CloseIcon } from './ChatIcons'

interface ConversationDrawerProps {
  open: boolean
  onClose: () => void
  conversations: Conversation[]
  activeId: string | null
  onSelect: (conv: Conversation) => void
  onCreate: () => void
  onRename: (conv: Conversation, title: string) => void
  onDelete: (conv: Conversation) => void
}

export function ConversationDrawer({
  open,
  onClose,
  conversations,
  activeId,
  onSelect,
  onCreate,
  onRename,
  onDelete,
}: ConversationDrawerProps) {
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
          <button className="icon-btn" onClick={onClose} aria-label="Cerrar">
            <CloseIcon />
          </button>
        </div>
        <div className="conversation-drawer-actions">
          <button className="btn btn-secondary" style={{ width: '100%' }} onClick={onCreate}>
            + Nueva conversación
          </button>
        </div>
        <div className="conversation-drawer-list">
          <ConversationList
            conversations={conversations}
            activeId={activeId}
            onSelect={handleSelect}
            onRename={onRename}
            onDelete={onDelete}
          />
        </div>
      </aside>
    </>
  )
}

import { useState } from 'react'
import type { Conversation } from '../../types'
import { groupByDate } from '../../utils/helpers'
import { EditIcon, TrashIcon } from './ChatIcons'

interface ConversationListProps {
  conversations: Conversation[]
  activeId: string | null
  onSelect: (conv: Conversation) => void
  onRename: (conv: Conversation, title: string) => void
  onDelete: (conv: Conversation) => void
  emptyMessage?: string
}

export function ConversationList({
  conversations,
  activeId,
  onSelect,
  onRename,
  onDelete,
  emptyMessage = 'No hay conversaciones todavía',
}: ConversationListProps) {
  const grouped = groupByDate(conversations)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')

  function startEdit(conv: Conversation, e: React.MouseEvent) {
    e.stopPropagation()
    setEditingId(conv.id)
    setEditTitle(conv.title)
  }

  function commitEdit(conv: Conversation) {
    const trimmed = editTitle.trim()
    if (trimmed && trimmed !== conv.title) {
      onRename(conv, trimmed)
    }
    setEditingId(null)
  }

  function handleDelete(conv: Conversation, e: React.MouseEvent) {
    e.stopPropagation()
    if (confirm(`¿Eliminar "${conv.title}"?`)) {
      onDelete(conv)
    }
  }

  if (conversations.length === 0) {
    return <p className="conversation-drawer-empty">{emptyMessage}</p>
  }

  return (
    <>
      {Object.entries(grouped).map(([label, convs]) =>
        convs.length > 0 ? (
          <div key={label}>
            <div className="conversation-group-label">{label}</div>
            {convs.map((conv) => (
              <div
                key={conv.id}
                className={`conversation-row ${activeId === conv.id ? 'active' : ''}`}
              >
                {editingId === conv.id ? (
                  <input
                    className="conversation-edit-input"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onBlur={() => commitEdit(conv)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitEdit(conv)
                      if (e.key === 'Escape') setEditingId(null)
                    }}
                    autoFocus
                  />
                ) : (
                  <button
                    className="conversation-item"
                    onClick={() => onSelect(conv)}
                  >
                    {conv.title}
                  </button>
                )}
                <div className="conversation-row-actions">
                  <button
                    className="conversation-action-btn"
                    onClick={(e) => startEdit(conv, e)}
                    aria-label="Renombrar"
                    title="Renombrar"
                  >
                    <EditIcon />
                  </button>
                  <button
                    className="conversation-action-btn conversation-action-btn-danger"
                    onClick={(e) => handleDelete(conv, e)}
                    aria-label="Eliminar"
                    title="Eliminar"
                  >
                    <TrashIcon />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : null,
      )}
    </>
  )
}

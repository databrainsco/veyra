import { useState, useEffect, useRef, useCallback } from 'react'
import { conversationRepo } from '../../db/repositories/conversationRepository'
import { messageRepo } from '../../db/repositories/messageRepository'
import { settingsRepo } from '../../db/repositories/settingsRepository'
import { getLLMService } from '../../services/llm/LocalLLMService'
import { ragService } from '../../services/rag/ragService'
import { MarkdownRenderer } from '../../components/chat/MarkdownRenderer'
import { SourceList } from '../../components/chat/SourceList'
import { ConversationDrawer } from '../../components/chat/ConversationDrawer'
import { generateId, groupByDate } from '../../utils/helpers'
import { formatUserError } from '../../utils/errors'
import type { Conversation, ChatMessage } from '../../types'
import './Chat.css'

export function ChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [modelLoaded, setModelLoaded] = useState(false)
  const [modelLoading, setModelLoading] = useState(false)
  const [modelLoadProgress, setModelLoadProgress] = useState(0)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const initDone = useRef(false)

  const loadConversations = useCallback(async () => {
    const convs = await conversationRepo.getAll()
    setConversations(convs)
    return convs
  }, [])

  const loadModelIfNeeded = useCallback(async () => {
    const llm = getLLMService()
    if (llm.isLoaded()) {
      setModelLoaded(true)
      return true
    }

    const settings = await settingsRepo.get()
    if (!settings.activeModelId) {
      setModelLoaded(false)
      return false
    }

    setModelLoading(true)
    setModelLoadProgress(0)
    try {
      await llm.ensureModelLoaded(settings.activeModelId, (p) => setModelLoadProgress(p))
      setModelLoaded(true)
      return true
    } catch {
      setModelLoaded(false)
      return false
    } finally {
      setModelLoading(false)
    }
  }, [])

  useEffect(() => {
    if (initDone.current) return
    initDone.current = true

    async function init() {
      const convs = await loadConversations()
      if (convs.length > 0) {
        const first = convs[0]!
        setActiveConversation(first)
        const msgs = await messageRepo.getByConversation(first.id)
        setMessages(msgs)
      }
      await loadModelIfNeeded()
    }

    void init()
  }, [loadConversations, loadModelIfNeeded])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent])

  async function createConversation() {
    const conv: Conversation = {
      id: generateId(),
      title: 'Nueva conversación',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    await conversationRepo.create(conv)

    const welcomeMsg: ChatMessage = {
      id: generateId(),
      conversationId: conv.id,
      role: 'assistant',
      content: `Hola, soy Veyra.

Puedes preguntarme cualquier cosa.

También puedes darme documentos o permitirme utilizar tus conversaciones anteriores como memoria.

Todo lo que pueda procesarse localmente permanece en este dispositivo.`,
      createdAt: Date.now(),
    }
    await messageRepo.create(welcomeMsg)

    setConversations((prev) => [conv, ...prev])
    setActiveConversation(conv)
    setMessages([welcomeMsg])
    setDrawerOpen(false)
  }

  async function selectConversation(conv: Conversation) {
    setActiveConversation(conv)
    const msgs = await messageRepo.getByConversation(conv.id)
    setMessages(msgs)
  }

  async function sendMessage() {
    if (!input.trim() || isGenerating) return

    let conv = activeConversation
    if (!conv) {
      await createConversation()
      conv = (await conversationRepo.getAll())[0]!
      if (!conv) return
    }

    const userMsg: ChatMessage = {
      id: generateId(),
      conversationId: conv.id,
      role: 'user',
      content: input.trim(),
      createdAt: Date.now(),
    }

    await messageRepo.create(userMsg)
    const updatedMessages = [...messages, userMsg]
    setMessages(updatedMessages)
    setInput('')
    setIsGenerating(true)
    setStreamingContent('')

    const llm = getLLMService()
    const modelReady = llm.isLoaded() || (await loadModelIfNeeded())

    if (!modelReady) {
      const settings = await settingsRepo.get()
      const errorMsg: ChatMessage = {
        id: generateId(),
        conversationId: conv.id,
        role: 'assistant',
        content: settings.activeModelId
          ? 'No se pudo cargar el modelo. Ve a Modelos e intenta activarlo de nuevo.'
          : 'No hay modelo instalado. Ve a Modelos para descargar uno antes de chatear.',
        createdAt: Date.now(),
      }
      await messageRepo.create(errorMsg)
      setMessages((prev) => [...prev, errorMsg])
      setIsGenerating(false)
      return
    }

    try {
      const settings = await settingsRepo.get()
      const { messages: contextMessages, sources } = await ragService.buildContext(
        conv.id,
        userMsg.content,
        updatedMessages,
      )

      const chatMessages: ChatMessage[] = contextMessages.map((m, i) => ({
        id: `ctx-${i}`,
        conversationId: conv!.id,
        role: m.role,
        content: m.content,
        createdAt: Date.now(),
      }))

      let fullResponse = ''
      for await (const chunk of llm.generate(chatMessages, {
        temperature: settings.temperature,
        maxTokens: settings.maxTokens,
      })) {
        fullResponse += chunk
        setStreamingContent(fullResponse)
      }

      const assistantMsg: ChatMessage = {
        id: generateId(),
        conversationId: conv.id,
        role: 'assistant',
        content: fullResponse,
        createdAt: Date.now(),
        metadata: { sources, ragUsed: sources.length > 0 },
      }

      await messageRepo.create(assistantMsg)
      setMessages((prev) => [...prev, assistantMsg])
      setStreamingContent('')

      if (conv.title === 'Nueva conversación') {
        const title = userMsg.content.slice(0, 50) + (userMsg.content.length > 50 ? '...' : '')
        const updated = { ...conv, title, updatedAt: Date.now() }
        await conversationRepo.update(updated)
        setActiveConversation(updated)
        setConversations((prev) => prev.map((c) => (c.id === conv!.id ? updated : c)))
      } else {
        await conversationRepo.update({ ...conv, updatedAt: Date.now() })
      }

      ragService
        .indexConversation(conv.id, conv.title, [...updatedMessages, assistantMsg])
        .catch(() => {})
    } catch (error) {
      const errorMsg: ChatMessage = {
        id: generateId(),
        conversationId: conv.id,
        role: 'assistant',
        content: formatUserError(error),
        createdAt: Date.now(),
      }
      await messageRepo.create(errorMsg)
      setMessages((prev) => [...prev, errorMsg])
      setStreamingContent('')
    } finally {
      setIsGenerating(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  function stopGeneration() {
    getLLMService().abort()
    setIsGenerating(false)
    if (streamingContent) {
      const conv = activeConversation
      if (conv) {
        const msg: ChatMessage = {
          id: generateId(),
          conversationId: conv.id,
          role: 'assistant',
          content: streamingContent,
          createdAt: Date.now(),
        }
        void messageRepo.create(msg)
        setMessages((prev) => [...prev, msg])
        setStreamingContent('')
      }
    }
  }

  async function copyMessage(content: string) {
    await navigator.clipboard.writeText(content)
  }

  const grouped = groupByDate(conversations)

  return (
    <div className="chat-page">
      <aside className="chat-sidebar">
        <div className="chat-sidebar-header">
          <button className="btn btn-secondary" style={{ width: '100%' }} onClick={createConversation}>
            + Nueva conversación
          </button>
        </div>
        <div className="chat-conversation-list">
          {Object.entries(grouped).map(([label, convs]) =>
            convs.length > 0 ? (
              <div key={label}>
                <div className="conversation-group-label">{label}</div>
                {convs.map((conv) => (
                  <button
                    key={conv.id}
                    className={`conversation-item ${activeConversation?.id === conv.id ? 'active' : ''}`}
                    onClick={() => selectConversation(conv)}
                  >
                    {conv.title}
                  </button>
                ))}
              </div>
            ) : null,
          )}
        </div>
      </aside>

      <ConversationDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        conversations={conversations}
        activeId={activeConversation?.id ?? null}
        onSelect={selectConversation}
        onCreate={createConversation}
      />

      <div className="chat-main">
        <div className="chat-header">
          <button
            className="btn-ghost chat-menu-btn"
            onClick={() => setDrawerOpen(true)}
            aria-label="Ver conversaciones"
          >
            ☰
          </button>
          <h2 style={{ fontSize: '1rem', fontWeight: 500, flex: 1, minWidth: 0 }} className="chat-title">
            {activeConversation?.title ?? 'Chat'}
          </h2>
          {modelLoading && (
            <span className="badge badge-warning">
              Cargando {Math.round(modelLoadProgress * 100)}%
            </span>
          )}
          {!modelLoading && !modelLoaded && (
            <span className="badge badge-warning">Modelo no cargado</span>
          )}
        </div>

        {modelLoading && (
          <div className="model-loading-banner">
            <div className="progress-bar">
              <div
                className="progress-bar-fill"
                style={{ width: `${modelLoadProgress * 100}%` }}
              />
            </div>
            <span>Cargando modelo de IA...</span>
          </div>
        )}

        {!activeConversation ? (
          <div className="chat-empty">
            <p style={{ fontSize: '1.125rem', marginBottom: 8 }}>Inicia una conversación</p>
            <p style={{ fontSize: '0.875rem', marginBottom: 24 }}>
              Tu IA personal está lista para ayudarte.
            </p>
            <button className="btn btn-primary" onClick={createConversation}>
              Nueva conversación
            </button>
          </div>
        ) : (
          <>
            <div className="chat-messages">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`message ${msg.role === 'user' ? 'message-user' : 'message-assistant'}`}
                >
                  <div>
                    <div className="message-bubble">
                      {msg.role === 'assistant' ? (
                        <MarkdownRenderer content={msg.content} />
                      ) : (
                        msg.content
                      )}
                      {msg.metadata?.sources && (
                        <SourceList sources={msg.metadata.sources} />
                      )}
                    </div>
                    {msg.role === 'assistant' && (
                      <div className="message-actions">
                        <button className="btn-ghost" onClick={() => copyMessage(msg.content)}>
                          Copiar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {streamingContent && (
                <div className="message message-assistant">
                  <div className="message-bubble">
                    <MarkdownRenderer content={streamingContent} />
                  </div>
                </div>
              )}
              {isGenerating && !streamingContent && (
                <div className="typing-indicator">
                  <div className="typing-dot" />
                  <div className="typing-dot" />
                  <div className="typing-dot" />
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="chat-input-area">
              <div className="chat-input-wrapper">
                <textarea
                  className="chat-input"
                  placeholder={modelLoading ? 'Cargando modelo...' : 'Escribe algo...'}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={1}
                  disabled={isGenerating || modelLoading}
                />
                {isGenerating ? (
                  <button className="chat-send-btn" onClick={stopGeneration} title="Detener">
                    ■
                  </button>
                ) : (
                  <button
                    className="chat-send-btn"
                    onClick={sendMessage}
                    disabled={!input.trim() || modelLoading}
                    title="Enviar"
                  >
                    ➤
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

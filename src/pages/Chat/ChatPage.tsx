import { useState, useEffect, useRef, useCallback } from 'react'
import { conversationRepo } from '../../db/repositories/conversationRepository'
import { messageRepo } from '../../db/repositories/messageRepository'
import { modelRepo, settingsRepo } from '../../db/repositories/settingsRepository'
import { getLLMService } from '../../services/llm/LocalLLMService'
import { modelSupportsImages } from '../../services/llm/models'
import { ragService } from '../../services/rag/ragService'
import { MarkdownRenderer } from '../../components/chat/MarkdownRenderer'
import { SourceList } from '../../components/chat/SourceList'
import { ConversationDrawer } from '../../components/chat/ConversationDrawer'
import { ConversationList } from '../../components/chat/ConversationList'
import {
  CopyIcon,
  RetryIcon,
  PlusIcon,
  SendIcon,
  StopIcon,
  MenuIcon,
  ImageIcon,
  CloseIcon,
} from '../../components/chat/ChatIcons'
import { generateId } from '../../utils/helpers'
import { formatUserError, isGpuError } from '../../utils/errors'
import { detectDeviceCapabilities, isModelCompatible, getRecommendedModelId } from '../../utils/device'
import { applyDeviceOptimizedSettings } from '../../utils/deviceSettings'
import { getModelInfo } from '../../services/llm/models'
import { fileToDataUrl, validateImageFile } from '../../utils/files'
import type { Conversation, ChatMessage, MessageAttachment } from '../../types'
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
  const [modelLoadingMessage, setModelLoadingMessage] = useState('Cargando modelo...')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [activeModelId, setActiveModelId] = useState<string | null>(null)
  const [pendingImage, setPendingImage] = useState<{ name: string; dataUrl: string } | null>(null)
  const [attachmentError, setAttachmentError] = useState<string | null>(null)
  const [attachMenuOpen, setAttachMenuOpen] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
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

    await applyDeviceOptimizedSettings()

    let settings = await settingsRepo.get()
    const capabilities = await detectDeviceCapabilities()

    if (!settings.activeModelId) {
      const recommendedId = getRecommendedModelId(capabilities)
      if (isModelCompatible(recommendedId, capabilities).compatible) {
        await settingsRepo.update({ activeModelId: recommendedId })
        settings = await settingsRepo.get()
      }
    }

    setActiveModelId(settings.activeModelId)
    if (!settings.activeModelId) {
      setModelLoaded(false)
      return false
    }

    const compatibility = isModelCompatible(settings.activeModelId, capabilities)
    if (!compatibility.compatible) {
      await settingsRepo.update({ activeModelId: null })
      setActiveModelId(null)
      setModelLoaded(false)
      return false
    }

    const record = await modelRepo.get(settings.activeModelId)
    const wasInstalled = Boolean(
      record?.installedAt || record?.status === 'installed' || record?.status === 'active',
    )

    setModelLoading(true)
    setModelLoadProgress(0)
    setModelLoadingMessage(
      wasInstalled ? 'Activando modelo desde caché...' : 'Descargando modelo por primera vez...',
    )
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
      await applyDeviceOptimizedSettings()
      const convs = await loadConversations()
      if (convs.length > 0) {
        const first = convs[0]!
        setActiveConversation(first)
        const msgs = await messageRepo.getByConversation(first.id)
        setMessages(msgs)
      }

      const settings = await settingsRepo.get()
      setActiveModelId(settings.activeModelId)
      if (settings.activeModelId && getLLMService().isLoaded()) {
        setModelLoaded(true)
      }
    }

    void init()
  }, [loadConversations])

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

    setConversations((prev) => [conv, ...prev])
    setActiveConversation(conv)
    setMessages([])
    setDrawerOpen(false)
  }

  async function selectConversation(conv: Conversation) {
    setActiveConversation(conv)
    const msgs = await messageRepo.getByConversation(conv.id)
    setMessages(msgs)
    if (msgs.length >= 2) {
      void ragService.ensureConversationIndexed(conv.id, conv.title, msgs)
    }
  }

  async function renameConversation(conv: Conversation, title: string) {
    const updated = { ...conv, title, updatedAt: Date.now() }
    await conversationRepo.update(updated)
    setConversations((prev) => prev.map((c) => (c.id === conv.id ? updated : c)))
    if (activeConversation?.id === conv.id) {
      setActiveConversation(updated)
    }
  }

  async function deleteConversation(conv: Conversation) {
    await conversationRepo.delete(conv.id)
    const remaining = conversations.filter((c) => c.id !== conv.id)
    setConversations(remaining)

    if (activeConversation?.id === conv.id) {
      const next = remaining[0] ?? null
      setActiveConversation(next)
      if (next) {
        const msgs = await messageRepo.getByConversation(next.id)
        setMessages(msgs)
      } else {
        setMessages([])
      }
    }
  }

  async function runGeneration(
    conv: Conversation,
    historyBeforeUser: ChatMessage[],
    userMsg: ChatMessage,
  ) {
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

    const updatedMessages = [...historyBeforeUser, userMsg]

    try {
      const settings = await settingsRepo.get()
      const { messages: contextMessages, sources } = await ragService.buildContext(
        conv.id,
        userMsg.content,
        updatedMessages,
        conv.title,
      )

      const chatMessages: ChatMessage[] = contextMessages.map((m, i) => ({
        id: `ctx-${i}`,
        conversationId: conv.id,
        role: m.role,
        content: m.content,
        createdAt: Date.now(),
      }))

      const minimalMessages: ChatMessage[] = [
        {
          id: 'minimal-user',
          conversationId: conv.id,
          role: 'user',
          content: userMsg.content,
          createdAt: Date.now(),
        },
      ]

      let fullResponse = ''
      try {
        for await (const chunk of llm.generate(chatMessages, {
          temperature: settings.temperature,
          maxTokens: settings.maxTokens,
        })) {
          fullResponse += chunk
          setStreamingContent(fullResponse)
        }
      } catch (generationError) {
        if (!isGpuError(generationError)) {
          throw generationError
        }

        setStreamingContent('')
        fullResponse = ''
        for await (const chunk of llm.generate(minimalMessages, {
          temperature: settings.temperature,
          maxTokens: 128,
        })) {
          fullResponse += chunk
          setStreamingContent(fullResponse)
        }
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
        setConversations((prev) => prev.map((c) => (c.id === conv.id ? updated : c)))
      } else {
        await conversationRepo.update({ ...conv, updatedAt: Date.now() })
      }

      window.setTimeout(() => {
        ragService
          .indexConversation(conv.id, conv.title, [...updatedMessages, assistantMsg])
          .catch(() => {})
      }, 2000)
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

  async function retryMessage(assistantMsg: ChatMessage) {
    if (isGenerating || !activeConversation) return

    const idx = messages.findIndex((m) => m.id === assistantMsg.id)
    if (idx <= 0) return

    let userMsg: ChatMessage | null = null
    for (let i = idx - 1; i >= 0; i--) {
      if (messages[i]!.role === 'user') {
        userMsg = messages[i]!
        break
      }
    }
    if (!userMsg) return

    const conv = activeConversation
    await messageRepo.deleteFrom(conv.id, assistantMsg.createdAt)
    const historyBeforeUser = messages.filter((m) => m.createdAt < userMsg!.createdAt)
    setMessages([...historyBeforeUser, userMsg])
    await runGeneration(conv, historyBeforeUser, userMsg)
  }

  async function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const error = validateImageFile(file)
    if (error) {
      setAttachmentError(error)
      return
    }

    if (!modelSupportsImages(activeModelId)) {
      setAttachmentError('Para enviar imágenes activa Phi 3.5 Vision en Modelos.')
      return
    }

    const dataUrl = await fileToDataUrl(file)
    setPendingImage({ name: file.name, dataUrl })
    setAttachmentError(null)
    if (imageInputRef.current) imageInputRef.current.value = ''
  }

  async function sendMessage() {
    const hasContent = input.trim() || pendingImage
    if (!hasContent || isGenerating) return

    let conv = activeConversation
    if (!conv) {
      await createConversation()
      conv = (await conversationRepo.getAll())[0]!
      if (!conv) return
    }

    let messageContent = input.trim()
    const attachments: MessageAttachment[] = []

    if (pendingImage) {
      attachments.push({
        type: 'image',
        name: pendingImage.name,
        dataUrl: pendingImage.dataUrl,
      })
      if (!messageContent) {
        messageContent = '¿Qué ves en esta imagen?'
      }
    }

    const userMsg: ChatMessage = {
      id: generateId(),
      conversationId: conv.id,
      role: 'user',
      content: messageContent,
      createdAt: Date.now(),
      metadata: attachments.length > 0 ? { attachments } : undefined,
    }

    await messageRepo.create(userMsg)
    const historyBeforeUser = messages
    const updatedMessages = [...historyBeforeUser, userMsg]
    setMessages(updatedMessages)
    setInput('')
    setPendingImage(null)
    setAttachmentError(null)
    setAttachMenuOpen(false)

    await runGeneration(conv, historyBeforeUser, userMsg)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  async function stopGeneration() {
    const llm = getLLMService()
    await llm.abort()
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

  async function copyMessage(id: string, content: string) {
    await navigator.clipboard.writeText(content)
    setCopiedId(id)
    window.setTimeout(() => setCopiedId(null), 1500)
  }

  const activeModelName = activeModelId ? getModelInfo(activeModelId)?.name : null
  const canSend = (input.trim() || pendingImage) && !modelLoading

  return (
    <div className="chat-page">
      <aside className="chat-sidebar">
        <div className="chat-sidebar-header">
          <button className="btn btn-secondary" style={{ width: '100%' }} onClick={createConversation}>
            + Nueva conversación
          </button>
        </div>
        <div className="chat-conversation-list">
          <ConversationList
            conversations={conversations}
            activeId={activeConversation?.id ?? null}
            onSelect={selectConversation}
            onRename={renameConversation}
            onDelete={deleteConversation}
          />
        </div>
      </aside>

      <ConversationDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        conversations={conversations}
        activeId={activeConversation?.id ?? null}
        onSelect={selectConversation}
        onCreate={createConversation}
        onRename={renameConversation}
        onDelete={deleteConversation}
      />

      <div className="chat-main">
        <div className="chat-header">
          <button
            className="icon-btn chat-menu-btn"
            onClick={() => setDrawerOpen(true)}
            aria-label="Ver conversaciones"
          >
            <MenuIcon />
          </button>
          <h2 style={{ fontSize: '1rem', fontWeight: 500, flex: 1, minWidth: 0 }} className="chat-title">
            {activeConversation?.title ?? 'Chat'}
          </h2>
          {modelLoading && (
            <span className="badge badge-warning">
              Cargando {Math.round(modelLoadProgress * 100)}%
            </span>
          )}
          {!modelLoading && modelLoaded && activeModelName && (
            <span className="badge badge-muted chat-model-badge">{activeModelName}</span>
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
            <span>{modelLoadingMessage}</span>
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
                        <>
                          {msg.metadata?.attachments?.map((att, i) =>
                            att.type === 'image' && att.dataUrl ? (
                              <img
                                key={`${msg.id}-img-${i}`}
                                src={att.dataUrl}
                                alt={att.name}
                                className="message-image"
                              />
                            ) : att.type === 'audio' ? (
                              <div key={`${msg.id}-audio-${i}`} className="message-audio-tag">
                                Audio: {att.name}
                                {att.transcription && (
                                  <span className="message-audio-transcription">
                                    Transcripción: {att.transcription}
                                  </span>
                                )}
                              </div>
                            ) : null,
                          )}
                          {msg.content}
                        </>
                      )}
                      {msg.metadata?.sources && (
                        <SourceList sources={msg.metadata.sources} />
                      )}
                    </div>
                    {msg.role === 'assistant' && (
                      <div className="message-actions">
                        <button
                          className="message-icon-btn"
                          onClick={() => copyMessage(msg.id, msg.content)}
                          aria-label="Copiar"
                          title="Copiar"
                        >
                          <CopyIcon />
                        </button>
                        <button
                          className="message-icon-btn"
                          onClick={() => retryMessage(msg)}
                          disabled={isGenerating}
                          aria-label="Reintentar"
                          title="Reintentar"
                        >
                          <RetryIcon />
                        </button>
                        {copiedId === msg.id && (
                          <span className="message-copied-hint">Copiado</span>
                        )}
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
              {pendingImage && (
                <div className="chat-attachment-preview">
                  <div className="attachment-chip">
                    <img src={pendingImage.dataUrl} alt="" className="attachment-thumb" />
                    <span>{pendingImage.name}</span>
                    <button className="icon-btn attachment-remove" onClick={() => setPendingImage(null)} aria-label="Quitar imagen">
                      <CloseIcon size={14} />
                    </button>
                  </div>
                </div>
              )}
              {attachmentError && (
                <p className="chat-attachment-error">{attachmentError}</p>
              )}
              <div className="chat-input-bar">
                <div className="chat-input-attach">
                  <button
                    type="button"
                    className="icon-btn chat-attach-toggle"
                    onClick={() => setAttachMenuOpen((open) => !open)}
                    disabled={isGenerating || modelLoading}
                    aria-label="Adjuntar"
                    aria-expanded={attachMenuOpen}
                  >
                    <PlusIcon />
                  </button>
                  {attachMenuOpen && (
                    <div className="chat-attach-menu">
                      <button
                        type="button"
                        className="chat-attach-option"
                        onClick={() => {
                          imageInputRef.current?.click()
                          setAttachMenuOpen(false)
                        }}
                        disabled={isGenerating || modelLoading}
                      >
                        <ImageIcon />
                        <span>Imagen</span>
                      </button>
                    </div>
                  )}
                </div>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  hidden
                  onChange={handleImageSelect}
                />
                <textarea
                  className="chat-input"
                  placeholder={
                    modelLoading
                      ? 'Cargando modelo...'
                      : 'Escribe un mensaje...'
                  }
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={1}
                  disabled={isGenerating || modelLoading}
                />
                {isGenerating ? (
                  <button
                    className="chat-send-btn chat-stop-btn"
                    onClick={stopGeneration}
                    aria-label="Detener"
                  >
                    <StopIcon />
                  </button>
                ) : (
                  <button
                    className={`chat-send-btn ${canSend ? 'active' : ''}`}
                    onClick={sendMessage}
                    disabled={!canSend}
                    aria-label="Enviar"
                  >
                    <SendIcon />
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

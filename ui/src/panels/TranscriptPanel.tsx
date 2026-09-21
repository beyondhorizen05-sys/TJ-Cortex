import { useEffect, useMemo, useRef, useState } from 'react';
import { Send, ChevronDown, ChevronRight, Brain, Package } from 'lucide-react';
import { useAgents } from '../store/agents';
import { useConversations } from '../store/conversations';
import { EmptyState } from '../components/EmptyState';
import { cn, fmtUSD } from '../lib/format';

/**
 * Transcript. This is where DeepSeek R1's `reasoning_content` shows up in the
 * collapsible **Thinking** panel — a first-class part of the UI, not an
 * afterthought.
 */
export function TranscriptPanel() {
  const agentId = useAgents((s) => s.selectedId);
  const agent = useAgents((s) => s.agents.find((a) => a.id === agentId));
  const conversations = useConversations();
  const [input, setInput] = useState('');
  const [thinkingOpen, setThinkingOpen] = useState<Record<string, boolean>>({});
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (agentId) conversations.load().catch(console.error);
  }, [agentId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [conversations.messages.length, conversations.streaming.text, conversations.streaming.reasoning]);

  const lastForAgent = useMemo(() => {
    if (!agentId) return null;
    return conversations.list.find((c) => c.agentIds.includes(agentId)) ?? null;
  }, [conversations.list, agentId]);

  if (!agentId || !agent) {
    return (
      <EmptyState
        title="Select an agent"
        body="Choose an agent from the Agents panel to start a conversation."
      />
    );
  }

  async function send() {
    if (!input.trim() || !agentId) return;
    const text = input;
    setInput('');
    try {
      await conversations.send(agentId, text, lastForAgent?.id);
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <div className="h-full grid grid-rows-[auto,1fr,auto]">
      <div className="flex items-center justify-between p-4 border-b border-glia-gray/15">
        <div>
          <div className="text-h1 font-semibold">{agent.name}</div>
          <div className="text-body-s text-glia-gray">
            {agent.providerId} · {agent.modelId}
          </div>
        </div>
      </div>

      <div ref={scrollRef} className="overflow-y-auto p-4 space-y-4">
        {conversations.messages.length === 0 && !conversations.streaming.active && (
          <div className="text-body-m text-glia-gray">Say hello to wake the village.</div>
        )}

        {conversations.messages.map((m) => (
          <MessageBubble
            key={m.id}
            m={m}
            thinkingOpen={thinkingOpen[m.id] ?? false}
            onToggle={() => setThinkingOpen((s) => ({ ...s, [m.id]: !(s[m.id] ?? false) }))}
          />
        ))}

        {conversations.streaming.active && (
          <>
            {conversations.streaming.reasoning && (
              <div className="rounded-lg border border-cortex-violet/40 bg-cortex-violet/5 p-3">
                <button
                  className="flex items-center gap-2 text-body-s text-cortex-cyan"
                  onClick={() => setThinkingOpen((s) => ({ ...s, __live: !(s.__live ?? true) }))}
                >
                  {thinkingOpen.__live ?? true ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  <Brain size={14} />
                  Thinking
                </button>
                {(thinkingOpen.__live ?? true) && (
                  <pre className="mt-2 whitespace-pre-wrap font-mono text-mono text-cortex-white/80">
                    {conversations.streaming.reasoning}
                  </pre>
                )}
              </div>
            )}
            {conversations.streaming.text && (
              <div className="rounded-lg border border-glia-gray/20 bg-black/30 p-3">
                <div className="whitespace-pre-wrap text-body-l">{conversations.streaming.text}</div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="border-t border-glia-gray/15 p-4 flex items-end gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          rows={2}
          placeholder={`Message ${agent.name}…`}
          className="flex-1 resize-none bg-black/30 border border-glia-gray/25 rounded-md px-3 py-2 text-body-m outline-none focus:border-cortex-violet/60"
        />
        <button className="btn-primary flex items-center gap-2" onClick={send}>
          <Send size={16} /> Send
        </button>
      </div>
    </div>
  );
}

function MessageBubble({
  m, thinkingOpen, onToggle,
}: { m: any; thinkingOpen: boolean; onToggle: () => void }) {
  const isUser = m.role === 'user';
  const isTool = m.role === 'tool';

  if (isTool) {
    return (
      <details className="rounded-lg border border-trade-teal/30 bg-trade-teal/5 p-3">
        <summary className="cursor-pointer text-body-s text-trade-teal flex items-center gap-2">
          <Package size={14} /> Tool result{m.toolName ? ` · ${m.toolName}` : ''}
        </summary>
        <pre className="mt-2 whitespace-pre-wrap font-mono text-mono text-cortex-white/80">
          {m.content}
        </pre>
      </details>
    );
  }

  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div className={cn('max-w-[80%] space-y-2')}>
        {m.reasoning && (
          <div className="rounded-lg border border-cortex-violet/40 bg-cortex-violet/5 p-3">
            <button
              className="flex items-center gap-2 text-body-s text-cortex-cyan"
              onClick={onToggle}
            >
              {thinkingOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              <Brain size={14} /> Thinking
            </button>
            {thinkingOpen && (
              <pre className="mt-2 whitespace-pre-wrap font-mono text-mono text-cortex-white/80">
                {m.reasoning}
              </pre>
            )}
          </div>
        )}
        <div
          className={cn(
            'rounded-lg p-3 whitespace-pre-wrap text-body-l border',
            isUser
              ? 'border-cortex-violet/40 bg-cortex-violet/10'
              : 'border-glia-gray/20 bg-black/30',
          )}
        >
          {m.content}
        </div>
        {(m.providerId || m.costUsd) && (
          <div className="text-body-s text-glia-gray px-1">
            {m.providerId && <span className="mr-2">{m.providerId} · {m.model}</span>}
            {typeof m.costUsd === 'number' && m.costUsd > 0 && <span>{fmtUSD(m.costUsd)}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
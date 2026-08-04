import { useEffect, useRef, useState } from "react";
import { Sparkles, X, Send, UserPlus, Loader2 } from "lucide-react";
import { aiAssistantApi, type AiAssistantHistoryTurn } from "../../api/aiAssistant";
import { getSessionId, getHistory, saveHistory } from "./aiChatSession";
import { VehicleChip } from "./VehicleChip";
import { AiLeadCaptureCard } from "./AiLeadCaptureCard";

const WA_NUMBER = "573147372030";
const VEHICLE_TAG_RE = /\[VEHICLE:(\d+)\]/g;
const LEAD_TAG_RE = /\[LEAD_CAPTURE\]/g;

const GREETING: AiAssistantHistoryTurn = {
  role: "assistant",
  content:
    "¡Hola! 💍 Soy el asistente virtual de Camino a mi Boda. Cuéntame, ¿ya tienes fecha para tu boda, o quieres ver qué estilos de carro tenemos?",
};

function parseAssistantMessage(content: string): { text: string; vehicleIds: number[]; leadCapture: boolean } {
  const vehicleIds = Array.from(content.matchAll(VEHICLE_TAG_RE)).map(m => Number(m[1]));
  const leadCapture = LEAD_TAG_RE.test(content);
  const text = content.replace(VEHICLE_TAG_RE, "").replace(LEAD_TAG_RE, "").trim();
  return { text, vehicleIds, leadCapture };
}

export function AiChatWidget() {
  const [open, setOpen] = useState(false);
  const [probed, setProbed] = useState(false);
  const [probing, setProbing] = useState(false);
  const [disabledReason, setDisabledReason] = useState<string | null>(null);
  const [messages, setMessages] = useState<AiAssistantHistoryTurn[]>(() => getHistory());
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [turnsRemaining, setTurnsRemaining] = useState<number | null>(null);
  const [showLeadCapture, setShowLeadCapture] = useState(false);
  const [leadSaved, setLeadSaved] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, showLeadCapture]);

  useEffect(() => {
    saveHistory(messages);
  }, [messages]);

  const handleOpen = async () => {
    setOpen(true);
    if (probed) return;
    setProbing(true);
    try {
      const res = await aiAssistantApi.sendMessage({
        session_id: getSessionId(),
        history: [],
        message: "",
        probe: true,
      });
      setDisabledReason(res.data.disabled ? res.data.disabled_reason : null);
      setTurnsRemaining(res.data.turns_remaining);
      if (!res.data.disabled && messages.length === 0) {
        setMessages([GREETING]);
      }
    } catch {
      setDisabledReason("repeated_errors");
    } finally {
      setProbing(false);
      setProbed(true);
    }
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    const nextHistory = [...messages, { role: "user" as const, content: text }];
    setMessages(nextHistory);
    setSending(true);
    try {
      const res = await aiAssistantApi.sendMessage({
        session_id: getSessionId(),
        history: nextHistory,
        message: text,
        probe: false,
      });
      setTurnsRemaining(res.data.turns_remaining);
      if (res.data.disabled) setDisabledReason(res.data.disabled_reason);
      setMessages([...nextHistory, { role: "assistant", content: res.data.reply }]);
    } catch {
      setMessages([
        ...nextHistory,
        {
          role: "assistant",
          content:
            `Tuvimos un problema para responder. Escríbenos por WhatsApp: https://wa.me/${WA_NUMBER}`,
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  const capped = turnsRemaining === 0 && !disabledReason;

  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-3">
      {open && (
        <div className="w-[22rem] max-w-[calc(100vw-2.5rem)] h-[30rem] max-h-[calc(100vh-8rem)] bg-white rounded-2xl shadow-2xl border border-blush-200 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between bg-brand-600 text-white px-4 py-3 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center shrink-0">
                <Sparkles size={16} className="text-gold-300" />
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-brand text-xl leading-none truncate">Asistente de bodas</span>
                  <span className="shrink-0 bg-gold-400 text-brand-900 text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full">
                    IA
                  </span>
                </div>
                <p className="text-[11px] text-white/70 leading-tight mt-0.5">Camino a mi Boda</p>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {!disabledReason && (
                <button
                  onClick={() => setShowLeadCapture(true)}
                  title="Dejar mis datos"
                  className="p-1.5 hover:bg-white/20 rounded-lg cursor-pointer"
                >
                  <UserPlus size={16} />
                </button>
              )}
              <button onClick={() => setOpen(false)} className="p-1.5 hover:bg-white/20 rounded-lg cursor-pointer">
                <X size={16} />
              </button>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-3 bg-blush-50/40">
            {probing && (
              <div className="flex items-center justify-center h-full text-gray-400 text-sm gap-2">
                <Loader2 size={16} className="animate-spin" /> Cargando...
              </div>
            )}

            {!probing && disabledReason && (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-xl px-3 py-3">
                Estamos actualizando el asistente, vuelve pronto. Mientras tanto, escríbenos por WhatsApp y te ayudamos enseguida.
                <a
                  href={`https://wa.me/${WA_NUMBER}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block mt-2 font-medium text-green-700 hover:underline"
                >
                  Escríbenos por WhatsApp →
                </a>
              </div>
            )}

            {!probing &&
              messages.map((m, i) => {
                if (m.role === "user") {
                  return (
                    <div key={i} className="flex justify-end">
                      <div className="bg-brand-500 text-white text-sm rounded-2xl rounded-br-sm px-3 py-2 max-w-[85%]">
                        {m.content}
                      </div>
                    </div>
                  );
                }
                const { text, vehicleIds } = parseAssistantMessage(m.content);
                return (
                  <div key={i} className="flex items-start gap-1.5 justify-start">
                    <span className="w-6 h-6 rounded-full bg-brand-500 flex items-center justify-center shrink-0 mt-0.5">
                      <Sparkles size={11} className="text-white" />
                    </span>
                    <div className="max-w-[78%]">
                      <div className="bg-blush-50 border border-blush-100 text-gray-800 text-sm rounded-2xl rounded-tl-sm px-3 py-2">
                        {text}
                      </div>
                      {vehicleIds.map(id => (
                        <VehicleChip key={id} id={id} />
                      ))}
                    </div>
                  </div>
                );
              })}

            {showLeadCapture && !disabledReason && (
              <AiLeadCaptureCard
                onClose={() => setShowLeadCapture(false)}
                onSaved={() => {
                  setShowLeadCapture(false);
                  setLeadSaved(true);
                }}
              />
            )}
            {leadSaved && (
              <div className="bg-green-50 border border-green-200 text-green-800 text-sm rounded-xl px-3 py-2">
                ¡Gracias! Un asesor te escribirá pronto por WhatsApp.
              </div>
            )}

            {!probing && !disabledReason && capped && (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-xl px-3 py-3">
                Has llegado al límite de mensajes de este chat. Continúa por WhatsApp.
                <a
                  href={`https://wa.me/${WA_NUMBER}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block mt-2 font-medium text-green-700 hover:underline"
                >
                  Escríbenos por WhatsApp →
                </a>
              </div>
            )}
          </div>

          {!probing && !disabledReason && !capped && (
            <div className="border-t border-gray-100 p-2.5 flex items-center gap-2 shrink-0">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleSend())}
                placeholder="Escribe tu mensaje..."
                disabled={sending}
                className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 disabled:bg-gray-50"
              />
              <button
                onClick={handleSend}
                disabled={sending || !input.trim()}
                className="bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white p-2 rounded-lg cursor-pointer shrink-0"
              >
                {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
            </div>
          )}
        </div>
      )}

      <button
        onClick={() => (open ? setOpen(false) : handleOpen())}
        className="relative w-14 h-14 rounded-full bg-brand-500 hover:bg-brand-600 text-white shadow-lg flex items-center justify-center cursor-pointer transition-colors"
        aria-label={open ? "Cerrar asistente virtual" : "Abrir asistente virtual con inteligencia artificial"}
      >
        {!open && !probed && (
          <span className="absolute inset-0 rounded-full bg-blush-300/70 animate-ping motion-reduce:hidden" aria-hidden="true" />
        )}
        {!open && (
          <span
            className="absolute -top-1 -right-1 bg-gold-400 text-brand-900 text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-sm"
            aria-hidden="true"
          >
            IA
          </span>
        )}
        {open ? <X size={22} /> : <Sparkles size={22} />}
      </button>
    </div>
  );
}

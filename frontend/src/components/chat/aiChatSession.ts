import type { AiAssistantHistoryTurn } from "../../api/aiAssistant";

const SESSION_KEY = "camino_ai_chat_session";
const HISTORY_KEY = "camino_ai_chat_history";

// sessionStorage (not localStorage): survives a refresh within the tab,
// clears on tab close (nothing about the conversation is kept longer than
// the visit), and gives each tab its own session id — so the per-session
// turn cap can't be dodged by opening multiple tabs against one counter.
export function getSessionId(): string {
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export function getHistory(): AiAssistantHistoryTurn[] {
  try {
    const raw = sessionStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveHistory(history: AiAssistantHistoryTurn[]): void {
  sessionStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

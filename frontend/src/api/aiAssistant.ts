import { api } from "./index";

export interface AiAssistantHistoryTurn {
  role: "user" | "assistant";
  content: string;
}

export interface AiAssistantMessageRequest {
  session_id: string;
  history: AiAssistantHistoryTurn[];
  message: string;
  probe: boolean;
}

export interface AiAssistantMessageResponse {
  reply: string;
  disabled: boolean;
  disabled_reason: string | null;
  turns_remaining: number | null;
}

export interface AiAssistantStatusResponse {
  configured: boolean;
  enabled: boolean;
  disabled_reason: string | null;
  disabled_at: string | null;
  disabled_detail: string | null;
  consecutive_error_count: number;
  daily_message_count: number;
  daily_message_budget: number;
}

export interface AiAssistantReenableResponse {
  success: boolean;
  reason: string | null;
  detail: string | null;
}

export const aiAssistantApi = {
  sendMessage: (data: AiAssistantMessageRequest) =>
    api.post<AiAssistantMessageResponse>("/public/ai-assistant/message", data),
  status: () => api.get<AiAssistantStatusResponse>("/integrations/ai-assistant/status"),
  reenable: () => api.post<AiAssistantReenableResponse>("/integrations/ai-assistant/reenable"),
};

from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, Field


class AiAssistantHistoryTurn(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(..., max_length=4000)


class AiAssistantMessageRequest(BaseModel):
    session_id: str = Field(..., min_length=8, max_length=100)
    history: List[AiAssistantHistoryTurn] = Field(default_factory=list, max_length=40)
    message: str = Field(default="", max_length=2000)
    probe: bool = False


class AiAssistantMessageResponse(BaseModel):
    reply: str
    disabled: bool
    disabled_reason: Optional[str] = None
    turns_remaining: Optional[int] = None


class AiAssistantStatusResponse(BaseModel):
    configured: bool
    enabled: bool
    disabled_reason: Optional[str] = None
    disabled_at: Optional[datetime] = None
    disabled_detail: Optional[str] = None
    consecutive_error_count: int
    daily_message_count: int
    daily_message_budget: int


class AiAssistantReenableResponse(BaseModel):
    success: bool
    reason: Optional[str] = None
    detail: Optional[str] = None

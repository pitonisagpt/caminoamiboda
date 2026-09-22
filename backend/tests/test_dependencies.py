from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app.core.dependencies import get_current_user, require_admin
from app.models.user import UserRole


class FakeRequest:
    def __init__(self, cookies: dict):
        self.cookies = cookies


class TestGetCurrentUserWithoutDb:
    """These two branches raise before ever touching the DB session, so a
    real db fixture isn't needed — only admins should ever see owner
    payouts/financial config (CLAUDE.md), and this is the gate for that."""

    def test_missing_cookie_raises_401(self):
        request = FakeRequest(cookies={})
        with pytest.raises(HTTPException) as exc_info:
            get_current_user(request, db=None)
        assert exc_info.value.status_code == 401

    def test_invalid_token_raises_401(self):
        request = FakeRequest(cookies={"access_token": "not-a-real-jwt"})
        with pytest.raises(HTTPException) as exc_info:
            get_current_user(request, db=None)
        assert exc_info.value.status_code == 401


class TestRequireAdmin:
    def test_admin_role_passes_through(self):
        admin_user = SimpleNamespace(role=UserRole.admin)
        assert require_admin(admin_user) is admin_user

    def test_operations_role_raises_403(self):
        ops_user = SimpleNamespace(role=UserRole.operations)
        with pytest.raises(HTTPException) as exc_info:
            require_admin(ops_user)
        assert exc_info.value.status_code == 403

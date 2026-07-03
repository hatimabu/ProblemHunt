"""
Handler shape tests — verify response structure for key endpoints.
Patches supabase_client._client with targeted MockSupabase doubles.
"""

import json
import uuid
from datetime import datetime
from unittest.mock import MagicMock, patch

import supabase_client as _sc
from test_all import MockSupabase, MockHttpRequest

from handlers import create_proposal, remove_upvote, upvote_problem


def response_json(response):
    return json.loads(response.get_body())


def _fresh_mock():
    """Return a fresh MockSupabase and install it as the singleton."""
    mock = MockSupabase()
    _sc._client = mock  # type: ignore[assignment]
    return mock


# ─── create_proposal ──────────────────────────────────────────────────────────

def test_create_proposal_returns_normalized_shape():
    mock = _fresh_mock()

    # Pre-seed a problem so get_problem finds it
    problem_id = str(uuid.uuid4())
    mock._db['problems'][problem_id] = {
        'id': problem_id,
        'type': 'problem',
        'title': 'Problem',
        'author_id': 'owner-1',
        'upvotes': 0,
        'proposals': 0,
        'created_at': datetime.utcnow().isoformat() + 'Z',
        'updated_at': datetime.utcnow().isoformat() + 'Z',
    }

    req = MockHttpRequest(
        route_params={"id": problem_id},
        body={
            "title": "I can build this",
            "description": "I will ship a working prototype.",
            "expertise": "React, Azure",
        },
    )

    with patch.object(create_proposal, "get_authenticated_user_id", return_value="builder-1"), \
         patch.object(create_proposal, "get_display_name", return_value="Builder One"):
        response = create_proposal.handle(req)

    body = response_json(response)
    assert response.status_code == 201, body
    assert {
        "id",
        "problemId",
        "title",
        "description",
        "builderId",
        "builderName",
        "briefSolution",
        "expertise",
        "status",
        "createdAt",
        "updatedAt",
    }.issubset(body.keys()), f"Missing keys. Got: {list(body.keys())}"
    assert body["problemId"] == problem_id
    assert body["builderId"] == "builder-1"
    assert body["expertise"] == ["React", "Azure"]
    # proposal was inserted into the mock DB
    assert len(mock._db['proposals']) == 1
    # proposal counter was incremented on the problem
    assert mock._db['problems'][problem_id]['proposals'] == 1


# ─── upvote_problem ───────────────────────────────────────────────────────────

def test_upvote_problem_returns_problem_message_shape():
    mock = _fresh_mock()

    problem_id = str(uuid.uuid4())
    mock._db['problems'][problem_id] = {
        'id': problem_id,
        'title': 'Problem',
        'upvotes': 0,
        'proposals': 0,
        'created_at': datetime.utcnow().isoformat() + 'Z',
        'updated_at': datetime.utcnow().isoformat() + 'Z',
    }

    req = MockHttpRequest(route_params={"id": problem_id})

    with patch.object(upvote_problem, "get_authenticated_user_id", return_value="user-1"):
        response = upvote_problem.handle(req)

    body = response_json(response)
    assert response.status_code == 200, body
    assert "problem" in body
    assert "message" in body
    assert body["message"] == "Upvote successful"
    assert body["problem"]["upvotes"] == 1
    # upvote record was created
    assert len(mock._db['upvotes']) == 1


# ─── remove_upvote ────────────────────────────────────────────────────────────

def test_remove_upvote_returns_problem_message_shape():
    mock = _fresh_mock()

    problem_id = str(uuid.uuid4())
    upvote_id = f"{problem_id}-user-1"

    mock._db['problems'][problem_id] = {
        'id': problem_id,
        'title': 'Problem',
        'upvotes': 3,
        'proposals': 0,
        'created_at': datetime.utcnow().isoformat() + 'Z',
        'updated_at': datetime.utcnow().isoformat() + 'Z',
    }
    mock._db['upvotes'][upvote_id] = {
        'id': upvote_id,
        'problem_id': problem_id,
        'user_id': 'user-1',
    }

    req = MockHttpRequest(route_params={"id": problem_id})

    with patch.object(remove_upvote, "get_authenticated_user_id", return_value="user-1"):
        response = remove_upvote.handle(req)

    body = response_json(response)
    assert response.status_code == 200, body
    assert body["message"] == "Upvote removed successfully"
    assert body["problem"]["id"] == problem_id
    assert body["problem"]["upvotes"] == 2
    # upvote record was removed
    assert len(mock._db['upvotes']) == 0

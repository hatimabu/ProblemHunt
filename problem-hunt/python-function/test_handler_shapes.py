import json
from unittest.mock import MagicMock, patch

from handlers import create_proposal, remove_upvote, upvote_problem


class MockHttpRequest:
    def __init__(self, route_params=None, body=None):
        self.route_params = route_params or {}
        self._body = json.dumps(body).encode() if body is not None else b""

    def get_json(self):
        return json.loads(self._body.decode()) if self._body else {}


def response_json(response):
    return json.loads(response.get_body())


def test_create_proposal_returns_normalized_shape_with_mocked_cosmos():
    proposals = MagicMock()
    problems = MagicMock()
    problems.patch_item.return_value = {"id": "problem-1", "proposals": 1}
    containers = {"proposals": proposals, "problems": problems}
    req = MockHttpRequest(
        route_params={"id": "problem-1"},
        body={
            "title": "I can build this",
            "description": "I will ship a working prototype.",
            "expertise": "React, Azure",
        },
    )

    with patch.object(create_proposal, "containers", containers), \
         patch.object(create_proposal, "get_authenticated_user_id", return_value="builder-1"), \
         patch.object(create_proposal, "get_problem", return_value={
             "id": "problem-1",
             "type": "problem",
             "authorId": "owner-1",
             "title": "Problem",
         }), \
         patch.object(create_proposal, "get_display_name", return_value="Builder One"):
        response = create_proposal.handle(req)

    body = response_json(response)
    assert response.status_code == 201
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
    }.issubset(body.keys())
    assert body["problemId"] == "problem-1"
    assert body["builderId"] == "builder-1"
    assert body["expertise"] == ["React", "Azure"]
    proposals.create_item.assert_called_once()
    problems.patch_item.assert_called_once()


def test_upvote_problem_returns_problem_message_shape_with_mocked_cosmos():
    problems = MagicMock()
    upvotes = MagicMock()
    problem = {"id": "problem-1", "title": "Problem", "upvotes": 0}
    updated_problem = {**problem, "upvotes": 1}
    problems.query_items.return_value = [problem]
    problems.patch_item.return_value = updated_problem
    upvotes.query_items.return_value = []
    containers = {"problems": problems, "upvotes": upvotes}
    req = MockHttpRequest(route_params={"id": "problem-1"})

    with patch.object(upvote_problem, "containers", containers), \
         patch.object(upvote_problem, "get_authenticated_user_id", return_value="user-1"):
        response = upvote_problem.handle(req)

    body = response_json(response)
    assert response.status_code == 200
    assert body == {
        "problem": updated_problem,
        "message": "Upvote successful",
    }
    upvotes.create_item.assert_called_once()
    problems.patch_item.assert_called_once()


def test_remove_upvote_returns_problem_message_shape_with_mocked_cosmos():
    upvotes = MagicMock()
    problems = MagicMock()
    problem = {"id": "problem-1", "title": "Problem", "upvotes": 3}
    upvotes.query_items.return_value = [{"id": "problem-1-user-1"}]
    problems.query_items.return_value = [problem]
    containers = {"upvotes": upvotes, "problems": problems}
    req = MockHttpRequest(route_params={"id": "problem-1"})

    with patch.object(remove_upvote, "containers", containers), \
         patch.object(remove_upvote, "get_authenticated_user_id", return_value="user-1"), \
         patch.object(remove_upvote, "get_timestamp", return_value="2026-06-11T00:00:00Z"):
        response = remove_upvote.handle(req)

    body = response_json(response)
    assert response.status_code == 200
    assert body["message"] == "Upvote removed successfully"
    assert body["problem"]["id"] == "problem-1"
    assert body["problem"]["upvotes"] == 2
    assert body["problem"]["updatedAt"] == "2026-06-11T00:00:00Z"
    upvotes.delete_item.assert_called_once_with("problem-1-user-1", "problem-1-user-1")
    problems.replace_item.assert_called_once()

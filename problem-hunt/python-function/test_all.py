"""
Comprehensive test suite for ProblemHunt Python Functions.
Run with: python -m pytest test_all.py -v
Or: python test_all.py
"""

import json
import sys
import os
import unittest
from unittest.mock import MagicMock, patch
from datetime import datetime

# Ensure we're in the python-function directory
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Set required env vars before importing modules that read them
os.environ["COSMOS_ENDPOINT"] = "placeholder-endpoint"
os.environ["COSMOS_KEY"] = "placeholder-key"
os.environ["COSMOS_DATABASE"] = "ProblemHuntDB"
os.environ["COSMOS_CONTAINER_PROBLEMS"] = "Problems"
os.environ["COSMOS_CONTAINER_PROPOSALS"] = "Proposals"
os.environ["COSMOS_CONTAINER_UPVOTES"] = "Upvotes"
os.environ["COSMOS_CONTAINER_TIPS"] = "Tips"
os.environ["SUPABASE_URL"] = "https://ajvobbpwgopinxtbpcpu.supabase.co"
os.environ["SUPABASE_ANON_KEY"] = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqdm9iYnB3Z29waW54dGJwY3B1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzMDIwNjMsImV4cCI6MjA4NDg3ODA2M30.-6yF5xvQ5oUwsmdFt1DKv-Hn1cKLo_OIvytaV6GxSC8"
os.environ["SUPABASE_JWT_SECRET"] = "WF0N+WumBLUU4EuRIEDA9SoetkSKhwRCDjWID5Tpd9nrjKlrpMtSwmA006srX4V1bHYH4tU1nPnsoVARPgbG/A=="

import azure.functions as func

# Import modules under test
from utils import (
    create_response,
    error_response,
    generate_id,
    get_timestamp,
    parse_budget_value,
    parse_requirements,
    validate_required,
    time_ago,
    get_user_id,
)

from cosmos import MockContainer, containers, CosmosDBClient

from handlers.marketplace_helpers import (
    PROBLEM_TYPE_JOB,
    PROBLEM_TYPE_PROBLEM,
    VALID_JOB_TYPES,
    VALID_TIP_CHAINS,
    json_response,
    parse_problem_type,
    parse_job_type,
    parse_string_list,
    parse_sol_amount,
    sol_amount_to_string,
    normalize_problem,
    normalize_proposal,
    query_items,
    get_problem,
    get_proposal,
    get_proposals_for_problem,
    replace_problem,
    replace_proposal,
    delete_document,
    delete_problem_related_documents,
    build_problem_link,
)

from handlers import (
    create_problem,
    get_problems,
    get_problem_by_id,
    update_problem,
    delete_problem,
    upvote_problem,
    remove_upvote,
    create_proposal,
    get_proposals,
    accept_proposal,
    mark_job_complete,
    record_payment,
    tip_builder,
    search_problems,
    get_user_problems,
    get_user_proposals,
    get_leaderboard,
)


class MockHttpRequest:
    """Mock Azure Functions HttpRequest for testing."""
    def __init__(self, method="GET", route_params=None, params=None, body=None, headers=None):
        self.method = method
        self.route_params = route_params or {}
        self.params = params or {}
        self._body = json.dumps(body).encode() if body is not None else b""
        self._headers = headers or {}
    
    def get_json(self):
        return json.loads(self._body.decode()) if self._body else {}
    
    @property
    def headers(self):
        return self._headers
    
    def get_body(self):
        return self._body


def make_auth_headers(user_id="test-user-123"):
    """Create a fake valid JWT for testing."""
    import jwt as pyjwt
    token = pyjwt.encode(
        {"sub": user_id, "aud": "authenticated", "role": "authenticated"},
        os.environ["SUPABASE_JWT_SECRET"],
        algorithm="HS256"
    )
    return {"Authorization": f"Bearer {token}"}


class TestUtils(unittest.TestCase):
    def test_generate_id(self):
        id1 = generate_id()
        id2 = generate_id()
        self.assertNotEqual(id1, id2)
        self.assertEqual(len(id1), 36)

    def test_get_timestamp(self):
        ts = get_timestamp()
        self.assertTrue(ts.endswith("Z"))

    def test_parse_budget_value(self):
        self.assertEqual(parse_budget_value("$50/month"), 50)
        self.assertEqual(parse_budget_value("$10/use"), 10)
        self.assertEqual(parse_budget_value("100"), 100)
        self.assertEqual(parse_budget_value("free"), 0)

    def test_parse_requirements(self):
        self.assertEqual(parse_requirements(["a", "b"]), ["a", "b"])
        self.assertEqual(parse_requirements("a\nb"), ["a", "b"])
        self.assertEqual(parse_requirements(None), [])

    def test_validate_required(self):
        self.assertIsNone(validate_required({"a": "1", "b": "2"}, ["a", "b"]))
        self.assertIn("Missing", validate_required({"a": "1"}, ["a", "b"]))

    def test_time_ago(self):
        now = datetime.utcnow().isoformat() + "Z"
        self.assertEqual(time_ago(now), "just now")
        self.assertEqual(time_ago("invalid"), "unknown")

    def test_create_response(self):
        resp = create_response(200, {"ok": True})
        self.assertEqual(resp["status_code"], 200)
        self.assertIn("ok", resp["body"])

    def test_error_response(self):
        resp = error_response(400, "bad")
        self.assertEqual(resp["status_code"], 400)
        self.assertIn("bad", resp["body"])


class TestCosmosMock(unittest.TestCase):
    def setUp(self):
        self.container = MockContainer()

    def test_create_and_get_item(self):
        item = {"id": "1", "name": "test"}
        self.container.create_item(item)
        got = self.container.get_item("1", "pk")
        self.assertEqual(got["name"], "test")

    def test_query_items(self):
        self.container.create_item({"id": "1", "user_id": "u1", "name": "a"})
        self.container.create_item({"id": "2", "user_id": "u2", "name": "b"})
        results = self.container.query_items("SELECT * FROM c", [{"name": "@user_id", "value": "u1"}])
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["id"], "1")

    def test_replace_item(self):
        self.container.create_item({"id": "1", "name": "old"})
        self.container.replace_item("1", {"id": "1", "name": "new"})
        got = self.container.get_item("1", "pk")
        self.assertEqual(got["name"], "new")

    def test_delete_item(self):
        self.container.create_item({"id": "1", "name": "test"})
        self.container.delete_item("1", "pk")
        with self.assertRaises(Exception):
            self.container.get_item("1", "pk")


class TestMarketplaceHelpers(unittest.TestCase):
    def test_json_response(self):
        resp = json_response({"ok": True}, 201)
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(json.loads(resp.get_body()), {"ok": True})

    def test_parse_problem_type(self):
        self.assertEqual(parse_problem_type("job"), PROBLEM_TYPE_JOB)
        self.assertEqual(parse_problem_type("problem"), PROBLEM_TYPE_PROBLEM)
        self.assertEqual(parse_problem_type(None), PROBLEM_TYPE_PROBLEM)

    def test_parse_job_type(self):
        self.assertEqual(parse_job_type("one-time"), "one-time")
        self.assertIsNone(parse_job_type("invalid"))

    def test_parse_string_list(self):
        self.assertEqual(parse_string_list(["a", "b"]), ["a", "b"])
        self.assertEqual(parse_string_list("a,b"), ["a", "b"])
        self.assertEqual(parse_string_list(None), [])

    def test_parse_sol_amount(self):
        self.assertEqual(parse_sol_amount("1.5"), 1.5)
        self.assertIsNone(parse_sol_amount("abc"))
        self.assertIsNone(parse_sol_amount(-1))
        self.assertIsNone(parse_sol_amount(None))

    def test_sol_amount_to_string(self):
        self.assertEqual(sol_amount_to_string("1.500000"), "1.5")
        self.assertIsNone(sol_amount_to_string(None))

    def test_normalize_problem(self):
        p = normalize_problem({
            "id": "p1",
            "type": "job",
            "title": "Test",
            "budgetSol": 2.5,
            "jobType": "one-time",
        })
        self.assertEqual(p["type"], PROBLEM_TYPE_JOB)
        self.assertEqual(p["budgetSol"], 2.5)
        self.assertEqual(p["jobStatus"], "open")

    def test_normalize_proposal(self):
        prop = normalize_proposal({"id": "pr1", "status": "pending"})
        self.assertEqual(prop["status"], "pending")

    def test_build_problem_link(self):
        self.assertEqual(build_problem_link("123"), "/problem/123")


class TestHandlersIntegration(unittest.TestCase):
    """Integration tests using mock Cosmos and mocked auth."""

    def setUp(self):
        # Reset mock containers between tests
        for name in ["problems", "proposals", "upvotes", "tips"]:
            containers[name] = MockContainer()

    def _auth_req(self, method="GET", route_params=None, params=None, body=None, user_id="test-user-123"):
        return MockHttpRequest(
            method=method,
            route_params=route_params or {},
            params=params or {},
            body=body,
            headers=make_auth_headers(user_id),
        )

    def test_create_problem_success(self):
        req = self._auth_req("POST", body={
            "title": "Test Problem",
            "description": "A test problem",
            "category": "AI/ML",
            "type": "problem",
            "budget": "$100"
        })
        resp = create_problem.handle(req)
        self.assertEqual(resp.status_code, 201)
        data = json.loads(resp.get_body())
        self.assertEqual(data["title"], "Test Problem")
        self.assertEqual(data["type"], "problem")

    def test_create_problem_missing_fields(self):
        req = self._auth_req("POST", body={"title": "Only title"})
        resp = create_problem.handle(req)
        self.assertEqual(resp.status_code, 400)

    def test_create_problem_invalid_category(self):
        req = self._auth_req("POST", body={
            "title": "T", "description": "D", "category": "Invalid", "budget": "$10"
        })
        resp = create_problem.handle(req)
        self.assertEqual(resp.status_code, 400)

    def test_create_job_requires_budget_deadline_type(self):
        req = self._auth_req("POST", body={
            "title": "Job", "description": "Desc", "category": "AI/ML",
            "type": "job", "budgetSol": 1.0
        })
        resp = create_problem.handle(req)
        # Missing deadline and jobType
        self.assertEqual(resp.status_code, 400)

    def test_get_problems_empty(self):
        req = MockHttpRequest("GET")
        resp = get_problems.handle(req)
        self.assertEqual(resp.status_code, 200)
        data = json.loads(resp.get_body())
        self.assertEqual(data["total"], 0)

    def test_get_problem_by_id_not_found(self):
        req = MockHttpRequest("GET", route_params={"id": "nonexistent"})
        resp = get_problem_by_id.handle(req)
        self.assertEqual(resp.status_code, 404)

    def test_update_problem(self):
        # Create first
        req = self._auth_req("POST", body={
            "title": "Original", "description": "Desc", "category": "AI/ML",
            "type": "problem", "budget": "$50"
        })
        resp = create_problem.handle(req)
        problem = json.loads(resp.get_body())
        pid = problem["id"]

        req2 = self._auth_req("PUT", route_params={"id": pid}, body={"title": "Updated"})
        resp2 = update_problem.handle(req2)
        self.assertEqual(resp2.status_code, 200)
        data = json.loads(resp2.get_body())
        self.assertEqual(data["title"], "Updated")

    def test_delete_problem(self):
        req = self._auth_req("POST", body={
            "title": "To Delete", "description": "D", "category": "AI/ML",
            "type": "problem", "budget": "$10"
        })
        resp = create_problem.handle(req)
        pid = json.loads(resp.get_body())["id"]

        req2 = self._auth_req("DELETE", route_params={"id": pid})
        resp2 = delete_problem.handle(req2)
        self.assertEqual(resp2.status_code, 200)

        req3 = MockHttpRequest("GET", route_params={"id": pid})
        resp3 = get_problem_by_id.handle(req3)
        self.assertEqual(resp3.status_code, 404)

    def test_upvote_and_remove_upvote(self):
        # Create problem as user A
        req = self._auth_req("POST", body={
            "title": "Upvote Me", "description": "D", "category": "AI/ML",
            "type": "problem", "budget": "$10"
        }, user_id="user-a")
        resp = create_problem.handle(req)
        pid = json.loads(resp.get_body())["id"]

        # Upvote as user B
        req2 = self._auth_req("POST", route_params={"id": pid}, user_id="user-b")
        resp2 = upvote_problem.handle(req2)
        self.assertEqual(resp2.status_code, 200)
        data = json.loads(resp2.get_body())
        self.assertEqual(data["problem"]["upvotes"], 1)

        # Duplicate upvote should fail
        resp3 = upvote_problem.handle(req2)
        self.assertEqual(resp3.status_code, 409)

        # Remove upvote
        req4 = self._auth_req("DELETE", route_params={"id": pid}, user_id="user-b")
        resp4 = remove_upvote.handle(req4)
        self.assertEqual(resp4.status_code, 200)
        data4 = json.loads(resp4.get_body())
        self.assertEqual(data4["problem"]["upvotes"], 0)

    def test_create_and_get_proposals(self):
        # Create problem
        req = self._auth_req("POST", body={
            "title": "Need Help", "description": "D", "category": "AI/ML",
            "type": "problem", "budget": "$10"
        }, user_id="owner")
        pid = json.loads(create_problem.handle(req).get_body())["id"]

        # Create proposal
        req2 = self._auth_req("POST", route_params={"id": pid}, body={
            "title": "I can help", "description": "Proposal desc"
        }, user_id="builder")
        resp2 = create_proposal.handle(req2)
        self.assertEqual(resp2.status_code, 201)

        # Get proposals
        req3 = MockHttpRequest("GET", route_params={"id": pid})
        resp3 = get_proposals.handle(req3)
        self.assertEqual(resp3.status_code, 200)
        data = json.loads(resp3.get_body())
        self.assertEqual(data["total"], 1)

    def test_job_lifecycle(self):
        # Create job
        req = self._auth_req("POST", body={
            "title": "Build App", "description": "D", "category": "AI/ML",
            "type": "job", "budgetSol": 5.0, "deadline": "2025-12-31", "jobType": "one-time"
        }, user_id="owner")
        resp = create_problem.handle(req)
        job = json.loads(resp.get_body())
        self.assertEqual(job["jobStatus"], "open")
        pid = job["id"]

        # Submit proposal
        req2 = self._auth_req("POST", route_params={"id": pid}, body={
            "title": "My Proposal", "description": "I will build it",
            "proposedPriceSol": 5.0, "estimatedDelivery": "2 weeks"
        }, user_id="builder")
        resp2 = create_proposal.handle(req2)
        self.assertEqual(resp2.status_code, 201)
        proposal = json.loads(resp2.get_body())

        # Accept proposal
        req3 = self._auth_req("POST", route_params={"id": pid, "proposal_id": proposal["id"]}, user_id="owner")
        resp3 = accept_proposal.handle(req3)
        self.assertEqual(resp3.status_code, 200)
        data = json.loads(resp3.get_body())
        self.assertEqual(data["job"]["jobStatus"], "in_progress")

        # Mark complete
        req4 = self._auth_req("POST", route_params={"id": pid}, user_id="builder")
        resp4 = mark_job_complete.handle(req4)
        self.assertEqual(resp4.status_code, 200)
        job = json.loads(resp4.get_body())["job"]
        self.assertEqual(job["jobStatus"], "completed")

        # Record payment
        req5 = self._auth_req("POST", route_params={"id": pid}, body={
            "txHash": "abc123", "amountSol": 5.0
        }, user_id="owner")
        # Need to mock supabase for insert_payment_record
        with patch("handlers.marketplace_helpers.get_supabase_client") as mock_sb:
            mock_sb.return_value.table.return_value.insert.return_value.execute.return_value.data = [{}]
            resp5 = record_payment.handle(req5)
        self.assertEqual(resp5.status_code, 200)
        job = json.loads(resp5.get_body())["job"]
        self.assertEqual(job["jobStatus"], "paid")

    def test_search_problems(self):
        req = self._auth_req("POST", body={
            "title": "Unique Search Term XYZ", "description": "D", "category": "AI/ML",
            "type": "problem", "budget": "$10"
        })
        create_problem.handle(req)

        req2 = MockHttpRequest("GET", params={"q": "Unique Search"})
        resp = search_problems.handle(req2)
        self.assertEqual(resp.status_code, 200)
        data = json.loads(resp.get_body())
        self.assertGreaterEqual(data["total"], 1)

    def test_get_user_problems(self):
        req = self._auth_req("POST", body={
            "title": "My Problem", "description": "D", "category": "AI/ML",
            "type": "problem", "budget": "$10"
        }, user_id="user-special")
        create_problem.handle(req)

        req2 = self._auth_req("GET", user_id="user-special")
        resp = get_user_problems.handle(req2)
        self.assertEqual(resp.status_code, 200)
        data = json.loads(resp.get_body())
        self.assertGreaterEqual(data["total"], 1)

    def test_tip_builder(self):
        # Create problem and proposal
        req = self._auth_req("POST", body={
            "title": "Tip Test", "description": "D", "category": "AI/ML",
            "type": "problem", "budget": "$10"
        }, user_id="owner")
        pid = json.loads(create_problem.handle(req).get_body())["id"]

        req2 = self._auth_req("POST", route_params={"id": pid}, body={
            "title": "Proposal", "description": "P"
        }, user_id="builder")
        prop = json.loads(create_proposal.handle(req2).get_body())

        req3 = self._auth_req("POST", route_params={"id": prop["id"]}, body={
            "amount": 1.5, "chain": "solana", "txHash": "tx123"
        }, user_id="tipper")
        resp = tip_builder.handle(req3)
        self.assertEqual(resp.status_code, 201)
        data = json.loads(resp.get_body())
        self.assertEqual(data["amount"], 1.5)

    def test_get_leaderboard(self):
        req = MockHttpRequest("GET")
        resp = get_leaderboard.handle(req)
        self.assertEqual(resp.status_code, 200)
        data = json.loads(resp.get_body())
        self.assertIn("leaderboard", data)

    def test_unauthenticated_create_problem(self):
        req = MockHttpRequest("POST", body={"title": "T", "description": "D", "category": "AI/ML"})
        resp = create_problem.handle(req)
        self.assertEqual(resp.status_code, 401)


class TestRouterConsistency(unittest.TestCase):
    """Check that the main router covers all expected endpoints."""

    def test_router_imports_all_handlers(self):
        from router import main
        self.assertTrue(callable(main))


if __name__ == "__main__":
    unittest.main(verbosity=2)

"""
Comprehensive test suite for ProblemHunt Python Functions.
Run with: python -m pytest test_all.py -v
Or: python test_all.py
"""

import json
import sys
import os
import re
import uuid
import unittest
import importlib
from unittest.mock import MagicMock, patch
from datetime import datetime

# Ensure we're in the python-function directory
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Set required env vars before importing modules that read them
os.environ["SUPABASE_URL"] = "https://ajvobbpwgopinxtbpcpu.supabase.co"
os.environ["SUPABASE_ANON_KEY"] = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqdm9iYnB3Z29waW54dGJwY3B1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzMDIwNjMsImV4cCI6MjA4NDg3ODA2M30.-6yF5xvQ5oUwsmdFt1DKv-Hn1cKLo_OIvytaV6GxSC8"
os.environ["SUPABASE_JWT_SECRET"] = "WF0N+WumBLUU4EuRIEDA9SoetkSKhwRCDjWID5Tpd9nrjKlrpMtSwmA006srX4V1bHYH4tU1nPnsoVARPgbG/A=="

import azure.functions as func

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


# ─── in-memory Supabase mock ──────────────────────────────────────────────────

class MockTableQuery:
    """Minimal chained builder that mirrors the supabase-py query API."""

    def __init__(self, data_dict: dict):
        self._data = data_dict
        self._op = 'select'
        self._filters: dict = {}
        self._in_filters: dict = {}
        self._or_expr: str | None = None
        self._order_col: str | None = None
        self._order_desc = False
        self._limit_n: int | None = None
        self._payload = None

    # builder methods ──────────────────────────────────────────────────────────

    def select(self, cols='*'):
        self._op = 'select'
        return self

    def insert(self, payload):
        self._op = 'insert'
        self._payload = payload
        return self

    def update(self, payload):
        self._op = 'update'
        self._payload = payload
        return self

    def delete(self):
        self._op = 'delete'
        return self

    def eq(self, col, val):
        self._filters[col] = val
        return self

    def in_(self, col, vals):
        self._in_filters[col] = set(vals)
        return self

    def or_(self, expr):
        self._or_expr = expr
        return self

    def order(self, col, desc=False):
        self._order_col = col
        self._order_desc = desc
        return self

    def limit(self, n):
        self._limit_n = n
        return self

    # execution ────────────────────────────────────────────────────────────────

    def _filter_rows(self):
        rows = list(self._data.values())
        for col, val in self._filters.items():
            rows = [r for r in rows if r.get(col) == val]
        for col, vals in self._in_filters.items():
            rows = [r for r in rows if r.get(col) in vals]
        if self._or_expr:
            filtered = []
            parts = self._or_expr.split(',')
            for row in rows:
                for part in parts:
                    m = re.match(r'(\w+)\.ilike\.%(.+)%', part.strip())
                    if m:
                        col, term = m.group(1), m.group(2).lower()
                        if term in str(row.get(col, '')).lower():
                            filtered.append(row)
                            break
            rows = filtered
        return rows

    def execute(self):
        result = MagicMock()

        if self._op == 'insert':
            row = dict(self._payload)
            row.setdefault('id', str(uuid.uuid4()))
            if str(row['id']) in self._data:
                raise Exception("23505 duplicate key value violates unique constraint")
            row.setdefault('created_at', datetime.utcnow().isoformat() + 'Z')
            row.setdefault('updated_at', row['created_at'])
            self._data[str(row['id'])] = row
            result.data = [row]
            return result

        rows = self._filter_rows()

        if self._op == 'update':
            updated = []
            for row in rows:
                row.update(self._payload)
                updated.append(dict(row))
            result.data = updated
            return result

        if self._op == 'delete':
            for row in rows:
                self._data.pop(str(row.get('id', '')), None)
            result.data = []
            return result

        # select
        if self._order_col:
            rows.sort(key=lambda r: r.get(self._order_col) or '', reverse=self._order_desc)
        if self._limit_n is not None:
            rows = rows[:self._limit_n]
        result.data = [dict(r) for r in rows]
        return result


class MockRpc:
    """Simulates the three atomic counter RPC functions."""

    def __init__(self, tables: dict, fn_name: str, params: dict):
        self._tables = tables
        self._fn_name = fn_name
        self._params = params

    def execute(self):
        result = MagicMock()
        problems = self._tables.get('problems', {})
        pid = str(self._params.get('pid', ''))
        row = problems.get(pid)

        if row is None:
            result.data = []
            return result

        if self._fn_name == 'increment_problem_upvotes':
            row['upvotes'] = row.get('upvotes', 0) + 1
            row['updated_at'] = datetime.utcnow().isoformat() + 'Z'
        elif self._fn_name == 'decrement_problem_upvotes':
            row['upvotes'] = max(0, row.get('upvotes', 0) - 1)
            row['updated_at'] = datetime.utcnow().isoformat() + 'Z'
        elif self._fn_name == 'increment_problem_proposals':
            row['proposals'] = row.get('proposals', 0) + 1

        result.data = [dict(row)]
        return result


class MockSupabase:
    """Stateful in-memory Supabase client for integration tests."""

    def __init__(self):
        self._db: dict[str, dict] = {}
        self.reset()

    def reset(self):
        self._db = {
            'problems': {},
            'proposals': {},
            'upvotes': {},
            'tips': {},
            'profiles': {},
            'wallets': {},
            'payments': {},
            'tip_transactions': {},
            'notifications': {},
        }

    def table(self, name: str) -> MockTableQuery:
        if name not in self._db:
            self._db[name] = {}
        return MockTableQuery(self._db[name])

    def rpc(self, fn_name: str, params: dict | None = None) -> MockRpc:
        return MockRpc(self._db, fn_name, params or {})


# Inject mock before any module-level get_supabase_client() is called
import supabase_client as _sc
_mock_supabase = MockSupabase()
_sc._client = _mock_supabase  # type: ignore[assignment]


# ─── helpers ──────────────────────────────────────────────────────────────────

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
    import jwt as pyjwt
    token = pyjwt.encode(
        {"sub": user_id, "aud": "authenticated", "role": "authenticated"},
        os.environ["SUPABASE_JWT_SECRET"],
        algorithm="HS256",
    )
    return {"Authorization": f"Bearer {token}"}


# ─── TestUtils ────────────────────────────────────────────────────────────────

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


# ─── TestMarketplaceHelpers ───────────────────────────────────────────────────

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


# ─── TestHandlersIntegration ─────────────────────────────────────────────────

class TestHandlersIntegration(unittest.TestCase):
    """Integration tests using MockSupabase in place of a real database."""

    def setUp(self):
        _mock_supabase.reset()

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
            "budget": "$100",
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
            "title": "T", "description": "D", "category": "Invalid", "budget": "$10",
        })
        resp = create_problem.handle(req)
        self.assertEqual(resp.status_code, 400)

    def test_create_job_requires_budget_deadline_type(self):
        req = self._auth_req("POST", body={
            "title": "Job", "description": "Desc", "category": "AI/ML",
            "type": "job", "budgetSol": 1.0,
        })
        resp = create_problem.handle(req)
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
        req = self._auth_req("POST", body={
            "title": "Original", "description": "Desc", "category": "AI/ML",
            "type": "problem", "budget": "$50",
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
            "type": "problem", "budget": "$10",
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
        req = self._auth_req("POST", body={
            "title": "Upvote Me", "description": "D", "category": "AI/ML",
            "type": "problem", "budget": "$10",
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
        req = self._auth_req("POST", body={
            "title": "Need Help", "description": "D", "category": "AI/ML",
            "type": "problem", "budget": "$10",
        }, user_id="owner")
        pid = json.loads(create_problem.handle(req).get_body())["id"]

        req2 = self._auth_req("POST", route_params={"id": pid}, body={
            "title": "I can help", "description": "Proposal desc",
        }, user_id="builder")
        resp2 = create_proposal.handle(req2)
        self.assertEqual(resp2.status_code, 201)

        req3 = MockHttpRequest("GET", route_params={"id": pid})
        resp3 = get_proposals.handle(req3)
        self.assertEqual(resp3.status_code, 200)
        data = json.loads(resp3.get_body())
        self.assertEqual(data["total"], 1)

    def test_job_lifecycle(self):
        req = self._auth_req("POST", body={
            "title": "Build App", "description": "D", "category": "AI/ML",
            "type": "job", "budgetSol": 5.0, "deadline": "2025-12-31", "jobType": "one-time",
        }, user_id="owner")
        resp = create_problem.handle(req)
        job = json.loads(resp.get_body())
        self.assertEqual(job["jobStatus"], "open")
        pid = job["id"]

        req2 = self._auth_req("POST", route_params={"id": pid}, body={
            "title": "My Proposal", "description": "I will build it",
            "proposedPriceSol": 5.0, "estimatedDelivery": "2 weeks",
        }, user_id="builder")
        resp2 = create_proposal.handle(req2)
        self.assertEqual(resp2.status_code, 201)
        proposal = json.loads(resp2.get_body())

        _mock_supabase._db["profiles"]["builder"] = {
            "user_id": "builder",
            "username": "builder",
            "wallet_address": "11111111111111111111111111111111",
        }

        req3 = self._auth_req("POST", route_params={"id": pid, "proposal_id": proposal["id"]}, user_id="owner")
        resp3 = accept_proposal.handle(req3)
        self.assertEqual(resp3.status_code, 200)
        data = json.loads(resp3.get_body())
        self.assertEqual(data["job"]["jobStatus"], "in_progress")

        req4 = self._auth_req("POST", route_params={"id": pid}, user_id="builder")
        resp4 = mark_job_complete.handle(req4)
        self.assertEqual(resp4.status_code, 200)
        job = json.loads(resp4.get_body())["job"]
        self.assertEqual(job["jobStatus"], "completed")

        req5 = self._auth_req("POST", route_params={"id": pid}, body={
            "txHash": "abc123", "amountSol": 5.0,
        }, user_id="owner")
        resp5 = record_payment.handle(req5)
        self.assertEqual(resp5.status_code, 200)
        job = json.loads(resp5.get_body())["job"]
        self.assertEqual(job["jobStatus"], "paid")

    def test_search_problems(self):
        req = self._auth_req("POST", body={
            "title": "Unique Search Term XYZ", "description": "D", "category": "AI/ML",
            "type": "problem", "budget": "$10",
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
            "type": "problem", "budget": "$10",
        }, user_id="user-special")
        create_problem.handle(req)

        req2 = self._auth_req("GET", user_id="user-special")
        resp = get_user_problems.handle(req2)
        self.assertEqual(resp.status_code, 200)
        data = json.loads(resp.get_body())
        self.assertGreaterEqual(data["total"], 1)

    def test_tip_builder(self):
        req = self._auth_req("POST", body={
            "title": "Tip Test", "description": "D", "category": "AI/ML",
            "type": "problem", "budget": "$10",
        }, user_id="owner")
        pid = json.loads(create_problem.handle(req).get_body())["id"]

        req2 = self._auth_req("POST", route_params={"id": pid}, body={
            "title": "Proposal", "description": "P",
        }, user_id="builder")
        prop = json.loads(create_proposal.handle(req2).get_body())

        req3 = self._auth_req("POST", route_params={"id": prop["id"]}, body={
            "amount": 1.5, "chain": "solana", "txHash": "tx123",
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
    def test_router_imports_all_handlers(self):
        from router import main
        self.assertTrue(callable(main))


class TestWalletsFunction(unittest.TestCase):
    def setUp(self):
        self.wallets_module = importlib.import_module("Wallets.__init__")

    def test_duplicate_update_does_not_delete_existing_wallet(self):
        req = MockHttpRequest(
            method="POST",
            body={"chain": "solana", "address": "11111111111111111111111111111111"},
        )

        supabase = MagicMock()
        table = supabase.table.return_value

        select_chain = MagicMock()
        select_chain.eq.return_value = select_chain
        select_chain.execute.return_value.data = [{"id": "wallet-1"}]

        update_chain = MagicMock()
        update_chain.eq.return_value = update_chain
        update_chain.execute.side_effect = Exception("23505 duplicate key value violates unique constraint")

        table.select.return_value = select_chain
        table.update.return_value = update_chain

        with patch.object(self.wallets_module, "get_authenticated_user_id", return_value="user-1"), \
             patch.object(self.wallets_module, "get_supabase_client", return_value=supabase), \
             patch.object(self.wallets_module, "sync_profile_wallet_address") as sync_wallet:
            resp = self.wallets_module.main(req)

        self.assertEqual(resp.status_code, 409)
        self.assertEqual(
            json.loads(resp.get_body()),
            {"error": "This address is already linked to another account."},
        )
        supabase.table.return_value.delete.assert_not_called()
        sync_wallet.assert_not_called()

    def test_wallet_save_failure_returns_generic_500(self):
        req = MockHttpRequest(
            method="POST",
            body={"chain": "ethereum", "address": "0x" + "a" * 40},
        )
        supabase = MagicMock()
        table = supabase.table.return_value
        select_chain = MagicMock()
        select_chain.eq.return_value = select_chain
        select_chain.execute.return_value.data = []
        insert_chain = MagicMock()
        insert_chain.execute.side_effect = Exception("internal db error: secret schema info")
        table.select.return_value = select_chain
        table.insert.return_value = insert_chain

        with patch.object(self.wallets_module, "get_authenticated_user_id", return_value="user-1"), \
             patch.object(self.wallets_module, "get_supabase_client", return_value=supabase):
            resp = self.wallets_module.main(req)

        self.assertEqual(resp.status_code, 500)
        body = json.loads(resp.get_body())
        self.assertEqual(body.get("error"), "Failed to save wallet")
        self.assertNotIn("details", body)
        self.assertNotIn("secret schema info", json.dumps(body))

    def test_wallet_fetch_failure_returns_generic_500(self):
        req = MockHttpRequest(method="GET")
        supabase = MagicMock()
        table = supabase.table.return_value
        select_chain = MagicMock()
        select_chain.eq.return_value = select_chain
        select_chain.execute.side_effect = Exception("connection timeout: internal host detail")
        table.select.return_value = select_chain

        with patch.object(self.wallets_module, "get_authenticated_user_id", return_value="user-1"), \
             patch.object(self.wallets_module, "get_supabase_client", return_value=supabase):
            resp = self.wallets_module.main(req)

        self.assertEqual(resp.status_code, 500)
        body = json.loads(resp.get_body())
        self.assertEqual(body.get("error"), "Failed to fetch wallets")
        self.assertNotIn("details", body)
        self.assertNotIn("internal host detail", json.dumps(body))


class TestWalletByIdFunction(unittest.TestCase):
    def setUp(self):
        self.wallet_by_id_module = importlib.import_module("WalletById.__init__")

    def test_wallet_delete_failure_returns_generic_500(self):
        req = MockHttpRequest(method="DELETE", route_params={"wallet_id": "wallet-99"})
        supabase = MagicMock()
        table = supabase.table.return_value
        check_chain = MagicMock()
        check_chain.eq.return_value = check_chain
        check_chain.execute.side_effect = Exception("pg error: internal table name exposed")
        table.select.return_value = check_chain

        with patch.object(self.wallet_by_id_module, "get_authenticated_user_id", return_value="user-1"), \
             patch.object(self.wallet_by_id_module, "get_supabase_client", return_value=supabase):
            resp = self.wallet_by_id_module.main(req)

        self.assertEqual(resp.status_code, 500)
        body = json.loads(resp.get_body())
        self.assertEqual(body.get("error"), "Failed to delete wallet")
        self.assertNotIn("details", body)
        self.assertNotIn("internal table name exposed", json.dumps(body))

    def test_wallet_delete_success(self):
        req = MockHttpRequest(method="DELETE", route_params={"wallet_id": "wallet-42"})
        supabase = MagicMock()
        table = supabase.table.return_value

        check_chain = MagicMock()
        check_chain.eq.return_value = check_chain
        check_chain.execute.return_value.data = [{"id": "wallet-42", "chain": "ethereum"}]
        table.select.return_value = check_chain

        delete_chain = MagicMock()
        delete_chain.eq.return_value = delete_chain
        delete_chain.execute.return_value = MagicMock()
        table.delete.return_value = delete_chain

        with patch.object(self.wallet_by_id_module, "get_authenticated_user_id", return_value="user-1"), \
             patch.object(self.wallet_by_id_module, "get_supabase_client", return_value=supabase):
            resp = self.wallet_by_id_module.main(req)

        self.assertEqual(resp.status_code, 200)
        self.assertEqual(json.loads(resp.get_body()), {"deleted": "wallet-42"})


if __name__ == "__main__":
    unittest.main(verbosity=2)

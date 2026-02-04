import json
import os
import uuid
import datetime
import azure.functions as func
import jwt
from azure.cosmos import CosmosClient, PartitionKey, exceptions


def _get_env(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise ValueError(f"Missing required env var: {name}")
    return value


def _get_supabase_user_id(req: func.HttpRequest) -> str:
    auth = req.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise PermissionError("Missing Bearer token")

    token = auth.replace("Bearer ", "").strip()
    secret = _get_env("SUPABASE_JWT_SECRET")

    try:
        payload = jwt.decode(token, secret, algorithms=["HS256"])
        return payload.get("sub")
    except jwt.PyJWTError:
        raise PermissionError("Invalid token")


def _get_cosmos_container():
    endpoint = _get_env("COSMOS_ENDPOINT")
    key = _get_env("COSMOS_KEY")
    db_name = _get_env("COSMOS_DATABASE")
    container_name = _get_env("COSMOS_CONTAINER")

    client = CosmosClient(endpoint, credential=key)
    database = client.create_database_if_not_exists(id=db_name)
    container = database.create_container_if_not_exists(
        id=container_name,
        partition_key=PartitionKey(path="/problemId"),
        offer_throughput=400
    )
    return container


def _json_response(body, status_code=200):
    return func.HttpResponse(
        json.dumps(body),
        status_code=status_code,
        mimetype="application/json"
    )


def main(req: func.HttpRequest) -> func.HttpResponse:
    try:
        user_id = _get_supabase_user_id(req)
    except PermissionError as e:
        return _json_response({"error": str(e)}, 401)
    except Exception as e:
        return _json_response({"error": "Auth error", "details": str(e)}, 401)

    container = _get_cosmos_container()

    if req.method == "GET":
        problem_id = req.params.get("problemId")
        if not problem_id:
            return _json_response({"error": "Missing problemId"}, 400)

        query = "SELECT * FROM c WHERE c.problemId = @pid ORDER BY c.createdAt DESC"
        items = list(container.query_items(
            query=query,
            parameters=[{"name": "@pid", "value": problem_id}],
            enable_cross_partition_query=True
        ))

        return _json_response({"comments": items}, 200)

    if req.method == "POST":
        try:
            data = req.get_json()
        except ValueError:
            return _json_response({"error": "Invalid JSON"}, 400)

        problem_id = data.get("problemId")
        text = data.get("text")

        if not problem_id or not text:
            return _json_response({"error": "problemId and text are required"}, 400)

        word_count = len(text.split())

        comment = {
            "id": str(uuid.uuid4()),
            "problemId": problem_id,
            "userId": user_id,
            "text": text,
            "wordCount": word_count,
            "createdAt": datetime.datetime.utcnow().isoformat() + "Z"
        }

        try:
            container.create_item(body=comment)
        except exceptions.CosmosHttpResponseError as e:
            return _json_response({"error": "Cosmos write failed", "details": str(e)}, 500)

        return _json_response({"comment": comment}, 201)

    return _json_response({"error": "Method not allowed"}, 405)

"""GetProblems Azure Function – GET /api/problems"""

import azure.functions as func
from handlers.get_problems import handle


def main(req: func.HttpRequest) -> func.HttpResponse:
    return handle(req)

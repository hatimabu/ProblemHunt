"""CreateProblem Azure Function"""

import azure.functions as func
from handlers.create_problem import handle


def main(req: func.HttpRequest) -> func.HttpResponse:
    return handle(req)

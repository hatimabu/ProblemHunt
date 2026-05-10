"""GetProblemById Azure Function"""

import azure.functions as func
from handlers.get_problem_by_id import handle


def main(req: func.HttpRequest) -> func.HttpResponse:
    return handle(req)

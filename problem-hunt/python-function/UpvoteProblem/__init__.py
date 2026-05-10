"""UpvoteProblem Azure Function"""

import azure.functions as func
from handlers.upvote_problem import handle


def main(req: func.HttpRequest) -> func.HttpResponse:
    return handle(req)

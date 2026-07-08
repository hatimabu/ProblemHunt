"""RemoveUpvote Azure Function"""

import azure.functions as func
from handlers.remove_upvote import handle


def main(req: func.HttpRequest) -> func.HttpResponse:
    return handle(req)

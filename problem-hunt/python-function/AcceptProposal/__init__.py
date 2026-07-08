"""AcceptProposal Azure Function."""

import azure.functions as func
from handlers.accept_proposal import handle


def main(req: func.HttpRequest) -> func.HttpResponse:
    return handle(req)

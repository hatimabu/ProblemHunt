"""GetProposals Azure Function"""

import azure.functions as func
from handlers.get_proposals import handle


def main(req: func.HttpRequest) -> func.HttpResponse:
    return handle(req)

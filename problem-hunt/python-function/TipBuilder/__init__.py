"""TipBuilder Azure Function"""

import azure.functions as func
from handlers.tip_builder import handle


def main(req: func.HttpRequest) -> func.HttpResponse:
    return handle(req)

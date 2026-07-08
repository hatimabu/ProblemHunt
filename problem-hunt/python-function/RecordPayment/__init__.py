"""RecordPayment Azure Function."""
import azure.functions as func
from handlers.record_payment import handle


def main(req: func.HttpRequest) -> func.HttpResponse:
    return handle(req)

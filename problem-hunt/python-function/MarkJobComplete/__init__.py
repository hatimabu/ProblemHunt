"""MarkJobComplete Azure Function."""
import azure.functions as func
from handlers.mark_job_complete import handle


def main(req: func.HttpRequest) -> func.HttpResponse:
    return handle(req)

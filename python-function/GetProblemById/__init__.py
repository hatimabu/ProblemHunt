"""GetProblemById Azure Function"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import azure.functions as func
from handlers.get_problem_by_id import handle


def main(req: func.HttpRequest) -> func.HttpResponse:
    return handle(req)

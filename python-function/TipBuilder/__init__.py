"""TipBuilder Azure Function"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import azure.functions as func
from handlers.tip_builder import handle


def main(req: func.HttpRequest) -> func.HttpResponse:
    return handle(req)

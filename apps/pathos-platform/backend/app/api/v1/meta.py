from fastapi import APIRouter, Request

router = APIRouter()


@router.get("/meta/openapi")
def get_openapi_spec(request: Request) -> dict:
    return request.app.openapi()

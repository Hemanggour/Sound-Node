# utils/response_wrapper.py

from rest_framework import status
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response


def formatted_response(data=None, message=None, status=200):
    response_data = {
        "data": data if data is not None else [],
        "message": message,
        "status": status,
        # "size": (
        #     len(data)
        #     if isinstance(data, (list, tuple, dict, set))
        #     else (1 if data else 0)
        # ),
    }

    return Response(response_data, status=status)


class StandardPagination(PageNumberPagination):
    page_size_query_param = "page_size"
    max_page_size = 100


def paginated_response(
    queryset,
    request,
    serializer_class,
    *,
    context=None,
    page_size=10,
    status_code=status.HTTP_200_OK
):
    """
    Returns a paginated response using the given serializer.
    """
    paginator = StandardPagination()
    paginator.page_size = page_size
    page = paginator.paginate_queryset(queryset, request)

    if page is not None:
        serializer = serializer_class(page, many=True, context=context or {})
        return paginator.get_paginated_response(serializer.data)

    # Fallback if pagination not applicable
    serializer = serializer_class(queryset, many=True, context=context or {})
    return formatted_response(data=serializer.data, status=status_code)

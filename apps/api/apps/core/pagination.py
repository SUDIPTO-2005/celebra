"""
Core app – shared pagination classes.
"""

from rest_framework.pagination import PageNumberPagination


class StandardPagination(PageNumberPagination):
    """Default pagination used across the Celebra API."""

    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100

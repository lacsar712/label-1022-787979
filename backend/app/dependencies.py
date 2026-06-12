"""
Common Dependencies - Reusable dependencies for all routers

Contains:
- Pagination parameter parsing (PaginationParams)
- Current user injection (get_current_user, get_admin_user, get_operator_or_admin)
- Role-based access control decorator (require_roles)
- Database session (get_db)

Usage:
    from ..dependencies import (
        PaginationParams,
        get_db,
        get_current_user,
        get_admin_user,
        get_operator_or_admin,
        require_roles,
    )
    from fastapi import Depends
"""
from fastapi import Query
from .database import get_db
from .utils.security import (
    get_current_user,
    get_admin_user,
    get_operator_or_admin,
    require_roles,
)


class PaginationParams:
    """Pagination parameters dependency.

    Parses page and page_size query parameters and computes offset/limit.

    Usage:
        from fastapi import Depends
        from ..dependencies import PaginationParams

        @router.get("")
        async def get_items(pagination: PaginationParams = Depends()):
            query = db.query(Item)
            total = query.count()
            items = pagination.apply(query).all()
            return {"items": items, "total": total}
    """

    def __init__(
        self,
        page: int = Query(1, ge=1, description="Page number, starting from 1"),
        page_size: int = Query(10, ge=1, le=100, description="Items per page, max 100"),
    ):
        self.page = page
        self.page_size = page_size
        self.offset = (page - 1) * page_size
        self.limit = page_size

    def apply(self, query):
        """Apply pagination offset and limit to a SQLAlchemy query.

        Args:
            query: SQLAlchemy query object

        Returns:
            Query with offset and limit applied
        """
        return query.offset(self.offset).limit(self.limit)


__all__ = [
    "PaginationParams",
    "get_db",
    "get_current_user",
    "get_admin_user",
    "get_operator_or_admin",
    "require_roles",
]

# backend/app/repos/utils.py
from bson import ObjectId

def to_obj_id(id_or_str: str | ObjectId | None) -> ObjectId | None:
    if id_or_str is None:
        return None
    return id_or_str if isinstance(id_or_str, ObjectId) else ObjectId(id_or_str)

def from_obj_id(oid: ObjectId | None) -> str | None:
    return str(oid) if oid else None

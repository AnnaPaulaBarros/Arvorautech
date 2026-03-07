from fastapi import FastAPI, APIRouter, HTTPException, Depends, File, UploadFile, Header, Request
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from supabase import create_client, Client
from jose import jwt, JWTError
import os
import logging
from pathlib import Path
from pydantic import BaseModel, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Supabase configuration
SUPABASE_URL = os.environ['SUPABASE_URL']
SUPABASE_SERVICE_KEY = os.environ['SUPABASE_SERVICE_KEY']
SUPABASE_JWT_SECRET = os.environ['SUPABASE_JWT_SECRET']
STORAGE_BUCKET = "tree-photos"

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

# Create the main app
app = FastAPI(title="ArvouraTech API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# ==================== PYDANTIC MODELS ====================

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    role: str = "client"
    created_at: str

class UserUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None

class TreeCreate(BaseModel):
    name: str
    species: str
    height: Optional[float] = None
    diameter: Optional[float] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    planting_date: Optional[str] = None
    notes: Optional[str] = None

class Tree(BaseModel):
    model_config = ConfigDict(extra="ignore")
    tree_id: str
    user_id: str
    name: str
    species: str
    height: Optional[float] = None
    diameter: Optional[float] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    planting_date: Optional[str] = None
    notes: Optional[str] = None
    photo_url: Optional[str] = None
    created_at: str
    updated_at: str

class TreeUpdate(BaseModel):
    name: Optional[str] = None
    species: Optional[str] = None
    height: Optional[float] = None
    diameter: Optional[float] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    planting_date: Optional[str] = None
    notes: Optional[str] = None

class MaintenanceCreate(BaseModel):
    tree_id: str
    maintenance_type: str
    date: str
    notes: Optional[str] = None

class Maintenance(BaseModel):
    model_config = ConfigDict(extra="ignore")
    maintenance_id: str
    tree_id: str
    user_id: str
    maintenance_type: str
    date: str
    notes: Optional[str] = None
    created_at: str

class TreePhoto(BaseModel):
    model_config = ConfigDict(extra="ignore")
    photo_id: str
    tree_id: str
    user_id: str
    storage_path: str
    original_filename: str
    content_type: str
    size: int
    is_primary: bool = False
    created_at: str


# ==================== AUTH HELPERS ====================

async def get_current_user(authorization: str = Header(None)) -> User:
    """Verify Supabase JWT and return user profile"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")

    token = authorization[7:]

    try:
        payload = jwt.decode(
            token,
            SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            options={"verify_aud": False},
        )
    except JWTError:
        # Fallback: try fetching JWKS for ES256 tokens
        try:
            import httpx
            jwks_url = f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json"
            jwks = httpx.get(jwks_url).json()
            for key_data in jwks.get("keys", []):
                try:
                    payload = jwt.decode(
                        token,
                        key_data,
                        algorithms=["ES256"],
                        options={"verify_aud": False},
                    )
                    break
                except JWTError:
                    continue
            else:
                raise HTTPException(status_code=401, detail="Invalid token")
        except HTTPException:
            raise
        except Exception:
            raise HTTPException(status_code=401, detail="Invalid token")

    supabase_user_id = payload.get("sub")
    if not supabase_user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    # Look up user profile
    result = supabase.table("users").select("*").eq("user_id", supabase_user_id).execute()

    if result.data:
        return User(**result.data[0])

    # First login - create profile from JWT metadata
    email = payload.get("email", "")
    user_meta = payload.get("user_metadata", {})
    name = user_meta.get("full_name") or user_meta.get("name") or email.split("@")[0]
    picture = user_meta.get("avatar_url") or user_meta.get("picture")
    now = datetime.now(timezone.utc).isoformat()

    new_user = {
        "user_id": supabase_user_id,
        "email": email,
        "name": name,
        "picture": picture,
        "role": "client",
        "created_at": now,
    }
    supabase.table("users").insert(new_user).execute()
    return User(**new_user)


# ==================== AUTH ENDPOINTS ====================

@api_router.get("/auth/me")
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@api_router.put("/auth/role")
async def update_role(update: UserUpdate, current_user: User = Depends(get_current_user)):
    if update.role and update.role in ["agronomist", "client"]:
        supabase.table("users").update({"role": update.role}).eq("user_id", current_user.user_id).execute()
    result = supabase.table("users").select("*").eq("user_id", current_user.user_id).execute()
    return result.data[0]


# ==================== TREE ENDPOINTS ====================

@api_router.post("/trees", response_model=Tree)
async def create_tree(tree_data: TreeCreate, current_user: User = Depends(get_current_user)):
    now = datetime.now(timezone.utc).isoformat()
    tree_id = f"tree_{uuid.uuid4().hex[:12]}"
    tree_doc = {
        "tree_id": tree_id,
        "user_id": current_user.user_id,
        **tree_data.model_dump(),
        "photo_url": None,
        "created_at": now,
        "updated_at": now,
    }
    supabase.table("trees").insert(tree_doc).execute()
    return Tree(**tree_doc)

@api_router.get("/trees", response_model=List[Tree])
async def get_trees(current_user: User = Depends(get_current_user)):
    result = supabase.table("trees").select("*").eq("user_id", current_user.user_id).execute()
    return [Tree(**t) for t in result.data]

@api_router.get("/trees/all", response_model=List[Tree])
async def get_all_trees(current_user: User = Depends(get_current_user)):
    if current_user.role != "agronomist":
        raise HTTPException(status_code=403, detail="Agronomist access required")
    result = supabase.table("trees").select("*").execute()
    return [Tree(**t) for t in result.data]

@api_router.get("/trees/{tree_id}", response_model=Tree)
async def get_tree(tree_id: str, current_user: User = Depends(get_current_user)):
    result = supabase.table("trees").select("*").eq("tree_id", tree_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Tree not found")
    tree = result.data[0]
    if tree["user_id"] != current_user.user_id and current_user.role != "agronomist":
        raise HTTPException(status_code=403, detail="Access denied")
    return Tree(**tree)

@api_router.put("/trees/{tree_id}", response_model=Tree)
async def update_tree(tree_id: str, tree_update: TreeUpdate, current_user: User = Depends(get_current_user)):
    result = supabase.table("trees").select("*").eq("tree_id", tree_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Tree not found")
    tree = result.data[0]
    if tree["user_id"] != current_user.user_id and current_user.role != "agronomist":
        raise HTTPException(status_code=403, detail="Access denied")
    update_data = {k: v for k, v in tree_update.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    supabase.table("trees").update(update_data).eq("tree_id", tree_id).execute()
    updated = supabase.table("trees").select("*").eq("tree_id", tree_id).execute()
    return Tree(**updated.data[0])

@api_router.delete("/trees/{tree_id}")
async def delete_tree(tree_id: str, current_user: User = Depends(get_current_user)):
    result = supabase.table("trees").select("*").eq("tree_id", tree_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Tree not found")
    tree = result.data[0]
    if tree["user_id"] != current_user.user_id and current_user.role != "agronomist":
        raise HTTPException(status_code=403, detail="Access denied")
    supabase.table("maintenance_records").delete().eq("tree_id", tree_id).execute()
    supabase.table("tree_photos").update({"is_deleted": True}).eq("tree_id", tree_id).execute()
    supabase.table("trees").delete().eq("tree_id", tree_id).execute()
    return {"message": "Tree deleted"}


# ==================== PHOTO ENDPOINTS ====================

@api_router.post("/trees/{tree_id}/photo")
async def upload_tree_photo(
    tree_id: str,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    result = supabase.table("trees").select("*").eq("tree_id", tree_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Tree not found")
    tree = result.data[0]
    if tree["user_id"] != current_user.user_id and current_user.role != "agronomist":
        raise HTTPException(status_code=403, detail="Access denied")

    ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    path = f"trees/{current_user.user_id}/{tree_id}/{uuid.uuid4()}.{ext}"
    data = await file.read()

    supabase.storage.from_(STORAGE_BUCKET).upload(
        path, data, {"content-type": file.content_type or "image/jpeg"}
    )
    public_url = supabase.storage.from_(STORAGE_BUCKET).get_public_url(path)

    photo_id = f"photo_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc).isoformat()
    photo_doc = {
        "photo_id": photo_id,
        "tree_id": tree_id,
        "user_id": current_user.user_id,
        "storage_path": path,
        "original_filename": file.filename,
        "content_type": file.content_type or "image/jpeg",
        "size": len(data),
        "is_primary": True,
        "is_deleted": False,
        "created_at": now,
    }

    supabase.table("tree_photos").update({"is_primary": False}).eq("tree_id", tree_id).eq("is_deleted", False).execute()
    supabase.table("tree_photos").insert(photo_doc).execute()
    supabase.table("trees").update({"photo_url": public_url, "updated_at": now}).eq("tree_id", tree_id).execute()
    return photo_doc

@api_router.get("/trees/{tree_id}/photos", response_model=List[TreePhoto])
async def get_tree_photos(tree_id: str, current_user: User = Depends(get_current_user)):
    result = supabase.table("tree_photos").select("*").eq("tree_id", tree_id).eq("is_deleted", False).execute()
    return [TreePhoto(**p) for p in result.data]


# ==================== MAINTENANCE ENDPOINTS ====================

@api_router.post("/maintenance", response_model=Maintenance)
async def create_maintenance(maintenance_data: MaintenanceCreate, current_user: User = Depends(get_current_user)):
    tree_result = supabase.table("trees").select("*").eq("tree_id", maintenance_data.tree_id).execute()
    if not tree_result.data:
        raise HTTPException(status_code=404, detail="Tree not found")
    tree = tree_result.data[0]
    if tree["user_id"] != current_user.user_id and current_user.role != "agronomist":
        raise HTTPException(status_code=403, detail="Access denied")

    maintenance_id = f"maint_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc).isoformat()
    maintenance_doc = {
        "maintenance_id": maintenance_id,
        "user_id": current_user.user_id,
        **maintenance_data.model_dump(),
        "created_at": now,
    }
    supabase.table("maintenance_records").insert(maintenance_doc).execute()
    return Maintenance(**maintenance_doc)

@api_router.get("/maintenance/tree/{tree_id}", response_model=List[Maintenance])
async def get_tree_maintenance(tree_id: str, current_user: User = Depends(get_current_user)):
    tree_result = supabase.table("trees").select("*").eq("tree_id", tree_id).execute()
    if not tree_result.data:
        raise HTTPException(status_code=404, detail="Tree not found")
    tree = tree_result.data[0]
    if tree["user_id"] != current_user.user_id and current_user.role != "agronomist":
        raise HTTPException(status_code=403, detail="Access denied")
    result = supabase.table("maintenance_records").select("*").eq("tree_id", tree_id).order("date", desc=True).execute()
    return [Maintenance(**r) for r in result.data]

@api_router.get("/maintenance", response_model=List[Maintenance])
async def get_user_maintenance(current_user: User = Depends(get_current_user)):
    result = supabase.table("maintenance_records").select("*").eq("user_id", current_user.user_id).order("date", desc=True).execute()
    return [Maintenance(**r) for r in result.data]

@api_router.delete("/maintenance/{maintenance_id}")
async def delete_maintenance(maintenance_id: str, current_user: User = Depends(get_current_user)):
    result = supabase.table("maintenance_records").select("*").eq("maintenance_id", maintenance_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Maintenance record not found")
    record = result.data[0]
    if record["user_id"] != current_user.user_id and current_user.role != "agronomist":
        raise HTTPException(status_code=403, detail="Access denied")
    supabase.table("maintenance_records").delete().eq("maintenance_id", maintenance_id).execute()
    return {"message": "Maintenance record deleted"}


# ==================== DASHBOARD ENDPOINTS ====================

@api_router.get("/dashboard/stats")
async def get_dashboard_stats(current_user: User = Depends(get_current_user)):
    if current_user.role == "agronomist":
        trees_res = supabase.table("trees").select("*", count="exact").execute()
        users_res = supabase.table("users").select("*", count="exact").execute()
        maint_res = supabase.table("maintenance_records").select("*", count="exact").execute()
        recent_trees = supabase.table("trees").select("*").order("created_at", desc=True).limit(5).execute().data
        recent_maintenance = supabase.table("maintenance_records").select("*").order("created_at", desc=True).limit(5).execute().data
        maintenance_by_type = {}
        for m in maint_res.data:
            t = m.get("maintenance_type", "other")
            maintenance_by_type[t] = maintenance_by_type.get(t, 0) + 1
        return {
            "total_trees": trees_res.count,
            "total_users": users_res.count,
            "total_maintenance": maint_res.count,
            "recent_trees": recent_trees,
            "recent_maintenance": recent_maintenance,
            "maintenance_by_type": maintenance_by_type,
        }
    else:
        trees_res = supabase.table("trees").select("*", count="exact").eq("user_id", current_user.user_id).execute()
        maint_res = supabase.table("maintenance_records").select("*", count="exact").eq("user_id", current_user.user_id).execute()
        recent_trees = supabase.table("trees").select("*").eq("user_id", current_user.user_id).order("created_at", desc=True).limit(5).execute().data
        recent_maintenance = supabase.table("maintenance_records").select("*").eq("user_id", current_user.user_id).order("created_at", desc=True).limit(5).execute().data
        maintenance_by_type = {}
        for m in maint_res.data:
            t = m.get("maintenance_type", "other")
            maintenance_by_type[t] = maintenance_by_type.get(t, 0) + 1
        return {
            "total_trees": trees_res.count,
            "total_users": 0,
            "total_maintenance": maint_res.count,
            "recent_trees": recent_trees,
            "recent_maintenance": recent_maintenance,
            "maintenance_by_type": maintenance_by_type,
        }

@api_router.get("/users/all")
async def get_all_users(current_user: User = Depends(get_current_user)):
    if current_user.role != "agronomist":
        raise HTTPException(status_code=403, detail="Agronomist access required")
    result = supabase.table("users").select("*").execute()
    return result.data


# ==================== ROOT ENDPOINT ====================

@api_router.get("/")
async def root():
    return {"message": "ArvouraTech API", "version": "1.0.0"}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "http://localhost:3000").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    logger.info("ArvouraTech API started (Supabase)")
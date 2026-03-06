from fastapi import FastAPI, APIRouter, HTTPException, Depends, File, UploadFile, Header, Query, Response, Request
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import requests

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Storage configuration
STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")
APP_NAME = "arvouratech"
storage_key = None

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

# ==================== STORAGE FUNCTIONS ====================
def init_storage():
    """Initialize storage - call once at startup"""
    global storage_key
    if storage_key:
        return storage_key
    try:
        resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_KEY}, timeout=30)
        resp.raise_for_status()
        storage_key = resp.json()["storage_key"]
        logger.info("Storage initialized successfully")
        return storage_key
    except Exception as e:
        logger.error(f"Storage init failed: {e}")
        return None

def put_object(path: str, data: bytes, content_type: str) -> dict:
    """Upload file to storage"""
    key = init_storage()
    if not key:
        raise HTTPException(status_code=500, detail="Storage not initialized")
    resp = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data, timeout=120
    )
    resp.raise_for_status()
    return resp.json()

def get_object(path: str) -> tuple:
    """Download file from storage"""
    key = init_storage()
    if not key:
        raise HTTPException(status_code=500, detail="Storage not initialized")
    resp = requests.get(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key}, timeout=60
    )
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")

# ==================== PYDANTIC MODELS ====================

# User Models
class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    role: str = "client"  # "agronomist" or "client"
    created_at: str

class UserUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None

# Session Models
class Session(BaseModel):
    session_token: str
    user_id: str
    expires_at: str
    created_at: str

# Tree Models
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

# Maintenance Models
class MaintenanceCreate(BaseModel):
    tree_id: str
    maintenance_type: str  # poda, irrigacao, adubacao, controle_biologico
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

# Photo Models
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

async def get_current_user(
    authorization: str = Header(None),
    request: Request = None
) -> User:
    """Get current user from session token (cookie or header)"""
    session_token = None
    
    # Try cookie first
    if request and request.cookies.get("session_token"):
        session_token = request.cookies.get("session_token")
    # Then try Authorization header
    elif authorization:
        if authorization.startswith("Bearer "):
            session_token = authorization[7:]
        else:
            session_token = authorization
    
    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Find session
    session_doc = await db.user_sessions.find_one(
        {"session_token": session_token},
        {"_id": 0}
    )
    
    if not session_doc:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    # Check expiry
    expires_at = session_doc["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")
    
    # Get user
    user_doc = await db.users.find_one(
        {"user_id": session_doc["user_id"]},
        {"_id": 0}
    )
    
    if not user_doc:
        raise HTTPException(status_code=401, detail="User not found")
    
    return User(**user_doc)

# ==================== AUTH ENDPOINTS ====================

@api_router.post("/auth/session")
async def exchange_session(request: Request):
    """Exchange session_id for session data and set cookie"""
    body = await request.json()
    session_id = body.get("session_id")
    
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")
    
    # Call Emergent Auth to get session data
    try:
        resp = requests.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id},
            timeout=30
        )
        resp.raise_for_status()
        auth_data = resp.json()
    except Exception as e:
        logger.error(f"Auth error: {e}")
        raise HTTPException(status_code=401, detail="Authentication failed")
    
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    email = auth_data.get("email")
    name = auth_data.get("name")
    picture = auth_data.get("picture")
    session_token = auth_data.get("session_token")
    
    # Check if user exists
    existing_user = await db.users.find_one({"email": email}, {"_id": 0})
    
    if existing_user:
        user_id = existing_user["user_id"]
        # Update user info
        await db.users.update_one(
            {"email": email},
            {"$set": {"name": name, "picture": picture}}
        )
    else:
        # Create new user
        now = datetime.now(timezone.utc).isoformat()
        await db.users.insert_one({
            "user_id": user_id,
            "email": email,
            "name": name,
            "picture": picture,
            "role": "client",
            "created_at": now
        })
    
    # Store session
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    await db.user_sessions.insert_one({
        "session_token": session_token,
        "user_id": user_id,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Get updated user
    user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    
    response = JSONResponse(content=user_doc)
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7 * 24 * 60 * 60
    )
    
    return response

@api_router.get("/auth/me")
async def get_me(current_user: User = Depends(get_current_user)):
    """Get current authenticated user"""
    return current_user

@api_router.post("/auth/logout")
async def logout(request: Request):
    """Logout user and clear session"""
    session_token = request.cookies.get("session_token")
    
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    
    response = JSONResponse(content={"message": "Logged out"})
    response.delete_cookie(key="session_token", path="/")
    
    return response

@api_router.put("/auth/role")
async def update_role(
    update: UserUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update user role"""
    if update.role and update.role in ["agronomist", "client"]:
        await db.users.update_one(
            {"user_id": current_user.user_id},
            {"$set": {"role": update.role}}
        )
    
    user_doc = await db.users.find_one({"user_id": current_user.user_id}, {"_id": 0})
    return user_doc

# ==================== TREE ENDPOINTS ====================

@api_router.post("/trees", response_model=Tree)
async def create_tree(
    tree_data: TreeCreate,
    current_user: User = Depends(get_current_user)
):
    """Create a new tree"""
    now = datetime.now(timezone.utc).isoformat()
    tree_id = f"tree_{uuid.uuid4().hex[:12]}"
    
    tree_doc = {
        "tree_id": tree_id,
        "user_id": current_user.user_id,
        **tree_data.model_dump(),
        "photo_url": None,
        "created_at": now,
        "updated_at": now
    }
    
    await db.trees.insert_one(tree_doc)
    
    # Remove _id before returning
    tree_doc.pop("_id", None)
    return Tree(**tree_doc)

@api_router.get("/trees", response_model=List[Tree])
async def get_trees(
    current_user: User = Depends(get_current_user)
):
    """Get all trees for current user"""
    trees = await db.trees.find(
        {"user_id": current_user.user_id},
        {"_id": 0}
    ).to_list(1000)
    
    return [Tree(**t) for t in trees]

@api_router.get("/trees/all", response_model=List[Tree])
async def get_all_trees(
    current_user: User = Depends(get_current_user)
):
    """Get all trees (for agronomists)"""
    if current_user.role != "agronomist":
        raise HTTPException(status_code=403, detail="Agronomist access required")
    
    trees = await db.trees.find({}, {"_id": 0}).to_list(1000)
    return [Tree(**t) for t in trees]

@api_router.get("/trees/{tree_id}", response_model=Tree)
async def get_tree(
    tree_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get a specific tree"""
    tree = await db.trees.find_one(
        {"tree_id": tree_id},
        {"_id": 0}
    )
    
    if not tree:
        raise HTTPException(status_code=404, detail="Tree not found")
    
    # Check access (owner or agronomist)
    if tree["user_id"] != current_user.user_id and current_user.role != "agronomist":
        raise HTTPException(status_code=403, detail="Access denied")
    
    return Tree(**tree)

@api_router.put("/trees/{tree_id}", response_model=Tree)
async def update_tree(
    tree_id: str,
    tree_update: TreeUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update a tree"""
    tree = await db.trees.find_one({"tree_id": tree_id}, {"_id": 0})
    
    if not tree:
        raise HTTPException(status_code=404, detail="Tree not found")
    
    if tree["user_id"] != current_user.user_id and current_user.role != "agronomist":
        raise HTTPException(status_code=403, detail="Access denied")
    
    update_data = {k: v for k, v in tree_update.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.trees.update_one(
        {"tree_id": tree_id},
        {"$set": update_data}
    )
    
    updated_tree = await db.trees.find_one({"tree_id": tree_id}, {"_id": 0})
    return Tree(**updated_tree)

@api_router.delete("/trees/{tree_id}")
async def delete_tree(
    tree_id: str,
    current_user: User = Depends(get_current_user)
):
    """Delete a tree"""
    tree = await db.trees.find_one({"tree_id": tree_id}, {"_id": 0})
    
    if not tree:
        raise HTTPException(status_code=404, detail="Tree not found")
    
    if tree["user_id"] != current_user.user_id and current_user.role != "agronomist":
        raise HTTPException(status_code=403, detail="Access denied")
    
    await db.trees.delete_one({"tree_id": tree_id})
    await db.tree_photos.update_many({"tree_id": tree_id}, {"$set": {"is_deleted": True}})
    await db.maintenance_records.delete_many({"tree_id": tree_id})
    
    return {"message": "Tree deleted"}

# ==================== PHOTO ENDPOINTS ====================

@api_router.post("/trees/{tree_id}/photo")
async def upload_tree_photo(
    tree_id: str,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """Upload a photo for a tree"""
    tree = await db.trees.find_one({"tree_id": tree_id}, {"_id": 0})
    
    if not tree:
        raise HTTPException(status_code=404, detail="Tree not found")
    
    if tree["user_id"] != current_user.user_id and current_user.role != "agronomist":
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Upload to storage
    ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    path = f"{APP_NAME}/trees/{current_user.user_id}/{tree_id}/{uuid.uuid4()}.{ext}"
    data = await file.read()
    
    result = put_object(path, data, file.content_type or "image/jpeg")
    
    # Store photo reference
    photo_id = f"photo_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc).isoformat()
    
    photo_doc = {
        "photo_id": photo_id,
        "tree_id": tree_id,
        "user_id": current_user.user_id,
        "storage_path": result["path"],
        "original_filename": file.filename,
        "content_type": file.content_type or "image/jpeg",
        "size": result.get("size", len(data)),
        "is_primary": True,
        "is_deleted": False,
        "created_at": now
    }
    
    # Set other photos as non-primary
    await db.tree_photos.update_many(
        {"tree_id": tree_id, "is_deleted": False},
        {"$set": {"is_primary": False}}
    )
    
    await db.tree_photos.insert_one(photo_doc)
    
    # Update tree with photo reference
    await db.trees.update_one(
        {"tree_id": tree_id},
        {"$set": {"photo_url": f"/api/photos/{photo_id}", "updated_at": now}}
    )
    
    photo_doc.pop("_id", None)
    return photo_doc

@api_router.get("/photos/{photo_id}")
async def get_photo(
    photo_id: str,
    authorization: str = Header(None),
    auth: str = Query(None)
):
    """Get a photo by ID"""
    # Auth check is optional for photos - they can be public
    # Support both header and query param for authenticated access
    _ = authorization or (f"Bearer {auth}" if auth else None)
    
    photo = await db.tree_photos.find_one(
        {"photo_id": photo_id, "is_deleted": False},
        {"_id": 0}
    )
    
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")
    
    data, content_type = get_object(photo["storage_path"])
    return Response(content=data, media_type=photo.get("content_type", content_type))

@api_router.get("/trees/{tree_id}/photos", response_model=List[TreePhoto])
async def get_tree_photos(
    tree_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get all photos for a tree"""
    photos = await db.tree_photos.find(
        {"tree_id": tree_id, "is_deleted": False},
        {"_id": 0}
    ).to_list(100)
    
    return [TreePhoto(**p) for p in photos]

# ==================== MAINTENANCE ENDPOINTS ====================

@api_router.post("/maintenance", response_model=Maintenance)
async def create_maintenance(
    maintenance_data: MaintenanceCreate,
    current_user: User = Depends(get_current_user)
):
    """Create a maintenance record"""
    # Verify tree exists and user has access
    tree = await db.trees.find_one({"tree_id": maintenance_data.tree_id}, {"_id": 0})
    
    if not tree:
        raise HTTPException(status_code=404, detail="Tree not found")
    
    if tree["user_id"] != current_user.user_id and current_user.role != "agronomist":
        raise HTTPException(status_code=403, detail="Access denied")
    
    maintenance_id = f"maint_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc).isoformat()
    
    maintenance_doc = {
        "maintenance_id": maintenance_id,
        "user_id": current_user.user_id,
        **maintenance_data.model_dump(),
        "created_at": now
    }
    
    await db.maintenance_records.insert_one(maintenance_doc)
    
    maintenance_doc.pop("_id", None)
    return Maintenance(**maintenance_doc)

@api_router.get("/maintenance/tree/{tree_id}", response_model=List[Maintenance])
async def get_tree_maintenance(
    tree_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get all maintenance records for a tree"""
    tree = await db.trees.find_one({"tree_id": tree_id}, {"_id": 0})
    
    if not tree:
        raise HTTPException(status_code=404, detail="Tree not found")
    
    if tree["user_id"] != current_user.user_id and current_user.role != "agronomist":
        raise HTTPException(status_code=403, detail="Access denied")
    
    records = await db.maintenance_records.find(
        {"tree_id": tree_id},
        {"_id": 0}
    ).sort("date", -1).to_list(1000)
    
    return [Maintenance(**r) for r in records]

@api_router.get("/maintenance", response_model=List[Maintenance])
async def get_user_maintenance(
    current_user: User = Depends(get_current_user)
):
    """Get all maintenance records for current user"""
    records = await db.maintenance_records.find(
        {"user_id": current_user.user_id},
        {"_id": 0}
    ).sort("date", -1).to_list(1000)
    
    return [Maintenance(**r) for r in records]

@api_router.delete("/maintenance/{maintenance_id}")
async def delete_maintenance(
    maintenance_id: str,
    current_user: User = Depends(get_current_user)
):
    """Delete a maintenance record"""
    record = await db.maintenance_records.find_one(
        {"maintenance_id": maintenance_id},
        {"_id": 0}
    )
    
    if not record:
        raise HTTPException(status_code=404, detail="Maintenance record not found")
    
    if record["user_id"] != current_user.user_id and current_user.role != "agronomist":
        raise HTTPException(status_code=403, detail="Access denied")
    
    await db.maintenance_records.delete_one({"maintenance_id": maintenance_id})
    
    return {"message": "Maintenance record deleted"}

# ==================== DASHBOARD ENDPOINTS ====================

@api_router.get("/dashboard/stats")
async def get_dashboard_stats(
    current_user: User = Depends(get_current_user)
):
    """Get dashboard statistics"""
    if current_user.role == "agronomist":
        # Agronomist sees all data
        total_trees = await db.trees.count_documents({})
        total_users = await db.users.count_documents({})
        total_maintenance = await db.maintenance_records.count_documents({})
        
        # Recent activity
        recent_trees = await db.trees.find(
            {},
            {"_id": 0}
        ).sort("created_at", -1).limit(5).to_list(5)
        
        recent_maintenance = await db.maintenance_records.find(
            {},
            {"_id": 0}
        ).sort("created_at", -1).limit(5).to_list(5)
        
        # Maintenance by type
        maintenance_by_type = {}
        all_maintenance = await db.maintenance_records.find({}, {"_id": 0, "maintenance_type": 1}).to_list(10000)
        for m in all_maintenance:
            t = m.get("maintenance_type", "other")
            maintenance_by_type[t] = maintenance_by_type.get(t, 0) + 1
        
        return {
            "total_trees": total_trees,
            "total_users": total_users,
            "total_maintenance": total_maintenance,
            "recent_trees": recent_trees,
            "recent_maintenance": recent_maintenance,
            "maintenance_by_type": maintenance_by_type
        }
    else:
        # Client sees only their data
        total_trees = await db.trees.count_documents({"user_id": current_user.user_id})
        total_maintenance = await db.maintenance_records.count_documents({"user_id": current_user.user_id})
        
        recent_trees = await db.trees.find(
            {"user_id": current_user.user_id},
            {"_id": 0}
        ).sort("created_at", -1).limit(5).to_list(5)
        
        recent_maintenance = await db.maintenance_records.find(
            {"user_id": current_user.user_id},
            {"_id": 0}
        ).sort("created_at", -1).limit(5).to_list(5)
        
        # Maintenance by type
        maintenance_by_type = {}
        all_maintenance = await db.maintenance_records.find(
            {"user_id": current_user.user_id},
            {"_id": 0, "maintenance_type": 1}
        ).to_list(10000)
        for m in all_maintenance:
            t = m.get("maintenance_type", "other")
            maintenance_by_type[t] = maintenance_by_type.get(t, 0) + 1
        
        return {
            "total_trees": total_trees,
            "total_users": 0,
            "total_maintenance": total_maintenance,
            "recent_trees": recent_trees,
            "recent_maintenance": recent_maintenance,
            "maintenance_by_type": maintenance_by_type
        }

@api_router.get("/users/all")
async def get_all_users(
    current_user: User = Depends(get_current_user)
):
    """Get all users (agronomist only)"""
    if current_user.role != "agronomist":
        raise HTTPException(status_code=403, detail="Agronomist access required")
    
    users = await db.users.find({}, {"_id": 0}).to_list(1000)
    return users

# ==================== ROOT ENDPOINT ====================

@api_router.get("/")
async def root():
    return {"message": "ArvouraTech API", "version": "1.0.0"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    try:
        init_storage()
        logger.info("ArvouraTech API started")
    except Exception as e:
        logger.error(f"Startup error: {e}")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

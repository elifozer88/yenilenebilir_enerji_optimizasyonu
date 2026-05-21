"""
backend/routers/auth.py
JWT tabanlı kimlik doğrulama + rol bazlı erişim kontrolü
"""
import bcrypt
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from jose import jwt, JWTError
from datetime import datetime, timedelta
from database import get_pool

router = APIRouter()

SECRET_KEY = "yeAtlas_izmir_2026_gizli_anahtar_degistir"
ALGORITHM = "HS256"
TOKEN_SURE_SAAT = 8

bearer_scheme = HTTPBearer(auto_error=False)

# -------------------------------------------------------------------
# Şifre yardımcıları
# -------------------------------------------------------------------

def sifre_hash(sifre: str) -> str:
    return bcrypt.hashpw(sifre.encode(), bcrypt.gensalt()).decode()


def sifre_dogrula(sifre: str, hash_: str) -> bool:
    return bcrypt.checkpw(sifre.encode(), hash_.encode())


# -------------------------------------------------------------------
# Token yardımcıları
# -------------------------------------------------------------------

def token_olustur(data: dict) -> str:
    payload = data.copy()
    payload["exp"] = datetime.utcnow() + timedelta(hours=TOKEN_SURE_SAAT)
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def token_dogrula(token: str) -> dict:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=401, detail="Geçersiz veya süresi dolmuş token")


# -------------------------------------------------------------------
# Dependency: Mevcut kullanıcıyı al
# -------------------------------------------------------------------

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)
) -> dict:
    if not credentials:
        raise HTTPException(status_code=401, detail="Giriş yapmanız gerekiyor")
    return token_dogrula(credentials.credentials)


# -------------------------------------------------------------------
# Rol bazlı dependency'ler
# Kullanım: @router.get("/...") async def f(user=Depends(require_analist))
# -------------------------------------------------------------------

def _rol_kontrol(izin_verilen_roller: list[str]):
    async def _inner(user: dict = Depends(get_current_user)) -> dict:
        if user.get("rol") not in izin_verilen_roller:
            raise HTTPException(
                status_code=403,
                detail=f"Bu işlem için yetkiniz yok. Gerekli rol: {izin_verilen_roller}"
            )
        return user
    return _inner

# Tüm giriş yapmış kullanıcılar (analist, mudur, admin)
require_giris    = get_current_user

# Analist veya üstü (analist, mudur, admin)
require_analist  = _rol_kontrol(["analist", "mudur", "admin"])

# Müdür veya üstü (mudur, admin)  — kullanıcı yönetimi
require_mudur    = _rol_kontrol(["mudur", "admin"])

# Sadece admin — teknik işlemler
require_admin    = _rol_kontrol(["admin"])


# -------------------------------------------------------------------
# Sayfa / İzin Yardımcıları
# -------------------------------------------------------------------

async def get_role_permissions(role: str) -> dict:
    if role == "admin":
        return {"atlas": True, "raporlar": True, "santraller": True}
    
    async with get_pool().acquire() as conn:
        rows = await conn.fetch("""
            SELECT page, is_allowed 
            FROM enerji.role_permissions 
            WHERE role = $1
        """, role)
    
    perms = {"atlas": True, "raporlar": True, "santraller": True}
    for r in rows:
        perms[r["page"]] = r["is_allowed"]
    return perms


async def check_permission(user: dict, page: str) -> bool:
    if user.get("rol") == "admin":
        return True
    
    async with get_pool().acquire() as conn:
        row = await conn.fetchrow("""
            SELECT is_allowed 
            FROM enerji.role_permissions 
            WHERE role = $1 AND page = $2
        """, user.get("rol"), page)
    
    if row is None:
        return True
    return row["is_allowed"]


def require_permission(page: str):
    async def dependency(user: dict = Depends(get_current_user)) -> dict:
        allowed = await check_permission(user, page)
        if not allowed:
            raise HTTPException(
                status_code=403,
                detail=f"Bu sayfa veya özelliğe erişim izniniz bulunmamaktadır."
            )
        return user
    return dependency


# -------------------------------------------------------------------
# Modeller
# -------------------------------------------------------------------

class GirisIstegi(BaseModel):
    kullanici_adi: str
    sifre: str


class PermissionUpdate(BaseModel):
    role: str
    permissions: dict


# -------------------------------------------------------------------
# Endpoints
# -------------------------------------------------------------------

@router.post("/auth/giris")
async def giris(istek: GirisIstegi):
    async with get_pool().acquire() as conn:
        kullanici = await conn.fetchrow("""
            SELECT id, kullanici_adi, sifre_hash, ad_soyad, rol, birim, aktif
            FROM enerji.kullanicilar
            WHERE kullanici_adi = $1
        """, istek.kullanici_adi)

    if not kullanici:
        raise HTTPException(status_code=401, detail="Kullanıcı adı veya şifre hatalı")

    if not kullanici["aktif"]:
        raise HTTPException(status_code=403, detail="Hesabınız devre dışı")

    if not sifre_dogrula(istek.sifre, kullanici["sifre_hash"]):
        raise HTTPException(status_code=401, detail="Kullanıcı adı veya şifre hatalı")

    async with get_pool().acquire() as conn:
        await conn.execute("""
            UPDATE enerji.kullanicilar SET son_giris = NOW() WHERE id = $1
        """, kullanici["id"])

    token = token_olustur({
        "sub":   kullanici["kullanici_adi"],
        "ad":    kullanici["ad_soyad"],
        "rol":   kullanici["rol"],
        "birim": kullanici["birim"],
        "id":    kullanici["id"],
    })

    perms = await get_role_permissions(kullanici["rol"])

    return {
        "token": token,
        "kullanici": {
            "id":            kullanici["id"],
            "kullanici_adi": kullanici["kullanici_adi"],
            "ad_soyad":      kullanici["ad_soyad"],
            "rol":           kullanici["rol"],
            "birim":         kullanici["birim"],
        },
        "permissions": perms
    }


@router.get("/auth/ben")
async def ben(user: dict = Depends(get_current_user)):
    perms = await get_role_permissions(user.get("rol"))
    return {
        "kullanici": {
            "id":            user.get("id"),
            "kullanici_adi": user.get("sub"),
            "ad_soyad":      user.get("ad"),
            "rol":           user.get("rol"),
            "birim":         user.get("birim"),
        },
        "permissions": perms
    }


@router.get("/auth/permissions")
async def list_permissions(user: dict = Depends(require_admin)):
    """List all role permissions (for admin use)"""
    async with get_pool().acquire() as conn:
        rows = await conn.fetch("""
            SELECT role, page, is_allowed 
            FROM enerji.role_permissions
            ORDER BY role, page
        """)
        
    res = {}
    for r in rows:
        role = r["role"]
        page = r["page"]
        val = r["is_allowed"]
        if role not in res:
            res[role] = {}
        res[role][page] = val
        
    # ensure mudur and analist exist in the response
    for r_name in ["mudur", "analist"]:
        if r_name not in res:
            res[r_name] = {"atlas": True, "raporlar": True, "santraller": True}
            
    return [{"role": k, "permissions": v} for k, v in res.items()]


@router.post("/auth/permissions")
async def update_permissions(istek: PermissionUpdate, user: dict = Depends(require_admin)):
    """Update permissions for a specific role (for admin use)"""
    if istek.role == "admin":
        raise HTTPException(status_code=400, detail="Admin yetkileri değiştirilemez")
        
    async with get_pool().acquire() as conn:
        for page, is_allowed in istek.permissions.items():
            await conn.execute("""
                INSERT INTO enerji.role_permissions (role, page, is_allowed)
                VALUES ($1, $2, $3)
                ON CONFLICT (role, page) 
                DO UPDATE SET is_allowed = EXCLUDED.is_allowed
            """, istek.role, page, is_allowed)
            
    return {"mesaj": f"{istek.role} rolü yetkileri güncellendi"}


@router.post("/auth/cikis")
async def cikis():
    # JWT stateless — token silme client tarafında yapılır
    return {"mesaj": "Çıkış yapıldı"}   
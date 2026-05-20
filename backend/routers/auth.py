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
# Modeller
# -------------------------------------------------------------------

class GirisIstegi(BaseModel):
    kullanici_adi: str
    sifre: str


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

    return {
        "token": token,
        "kullanici": {
            "id":            kullanici["id"],
            "kullanici_adi": kullanici["kullanici_adi"],
            "ad_soyad":      kullanici["ad_soyad"],
            "rol":           kullanici["rol"],
            "birim":         kullanici["birim"],
        }
    }


@router.get("/auth/ben")
async def ben(user: dict = Depends(get_current_user)):
    return user


@router.post("/auth/cikis")
async def cikis():
    # JWT stateless — token silme client tarafında yapılır
    return {"mesaj": "Çıkış yapıldı"}   
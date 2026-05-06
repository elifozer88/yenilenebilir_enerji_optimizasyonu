"""
backend/routers/auth.py
JWT tabanlı kimlik doğrulama
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


def sifre_hash(sifre: str) -> str:
    return bcrypt.hashpw(sifre.encode(), bcrypt.gensalt()).decode()


def sifre_dogrula(sifre: str, hash_: str) -> bool:
    return bcrypt.checkpw(sifre.encode(), hash_.encode())


def token_olustur(data: dict) -> str:
    payload = data.copy()
    payload["exp"] = datetime.utcnow() + timedelta(hours=TOKEN_SURE_SAAT)
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def token_dogrula(token: str) -> dict:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=401, detail="Geçersiz veya süresi dolmuş token")


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)
):
    if not credentials:
        raise HTTPException(status_code=401, detail="Giriş yapmanız gerekiyor")
    return token_dogrula(credentials.credentials)


class GirisIstegi(BaseModel):
    kullanici_adi: str
    sifre: str


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
async def ben(user=Depends(get_current_user)):
    return user


@router.post("/auth/cikis")
async def cikis():
    return {"mesaj": "Çıkış yapıldı"}



class GirisIstegi(BaseModel):
    kullanici_adi: str
    sifre: str


def token_olustur(data: dict) -> str:
    payload = data.copy()
    payload["exp"] = datetime.utcnow() + timedelta(hours=TOKEN_SURE_SAAT)
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def token_dogrula(token: str) -> dict:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=401, detail="Geçersiz veya süresi dolmuş token")


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)
):
    if not credentials:
        raise HTTPException(status_code=401, detail="Giriş yapmanız gerekiyor")
    return token_dogrula(credentials.credentials)


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

    if not pwd_context.verify(istek.sifre, kullanici["sifre_hash"]):
        raise HTTPException(status_code=401, detail="Kullanıcı adı veya şifre hatalı")

    # Son giriş güncelle
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
            "id":             kullanici["id"],
            "kullanici_adi":  kullanici["kullanici_adi"],
            "ad_soyad":       kullanici["ad_soyad"],
            "rol":            kullanici["rol"],
            "birim":          kullanici["birim"],
        }
    }


@router.get("/auth/ben")
async def ben(user=Depends(get_current_user)):
    return user


@router.post("/auth/cikis")
async def cikis():
    # JWT stateless olduğu için client tarafında token silinir
    return {"mesaj": "Çıkış yapıldı"}
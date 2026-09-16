"""
Automater Backend - Firebase Admin & Firestore SDK Configuration
Secure initialization supporting service accounts, environment variables, and fallback offline mode.
"""

import os
import logging
from typing import Optional
from pathlib import Path
from dotenv import load_dotenv
import firebase_admin
from firebase_admin import credentials, firestore

# Load environment variables
env_path = Path(__file__).resolve().parent.parent / '.env'
if env_path.exists():
    load_dotenv(dotenv_path=env_path)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("automater.backend")

PROJECT_ID = os.getenv("FIREBASE_PROJECT_ID") or os.getenv("VITE_FIREBASE_PROJECT_ID") or "automater-f03a9"
SERVICE_ACCOUNT_KEY_PATH = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")


class FirebaseManager:
    _app: Optional[firebase_admin.App] = None
    _db: Optional[firestore.firestore.Client] = None

    @classmethod
    def get_app(cls) -> firebase_admin.App:
        if cls._app is None:
            if not firebase_admin._apps:
                if SERVICE_ACCOUNT_KEY_PATH and os.path.exists(SERVICE_ACCOUNT_KEY_PATH):
                    logger.info(f"Initializing Firebase Admin with Service Account: {SERVICE_ACCOUNT_KEY_PATH}")
                    cred = credentials.Certificate(SERVICE_ACCOUNT_KEY_PATH)
                    cls._app = firebase_admin.initialize_app(cred, {"projectId": PROJECT_ID})
                else:
                    logger.info(f"Initializing Firebase Admin with Application Default Credentials / Project: {PROJECT_ID}")
                    try:
                        cred = credentials.ApplicationDefault()
                        cls._app = firebase_admin.initialize_app(cred, {"projectId": PROJECT_ID})
                    except Exception as err:
                        logger.warning(f"Could not load Application Default Credentials: {err}. Initializing with Project ID.")
                        cls._app = firebase_admin.initialize_app(options={"projectId": PROJECT_ID})
            else:
                cls._app = firebase_admin.get_app()
        return cls._app

    @classmethod
    def get_firestore(cls) -> firestore.firestore.Client:
        if cls._db is None:
            cls.get_app()
            cls._db = firestore.client()
        return cls._db


def get_db() -> firestore.firestore.Client:
    """Helper to retrieve singleton Firestore client instance."""
    return FirebaseManager.get_firestore()

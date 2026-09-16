"""
Automater Backend - Catalog Ingestion Pipeline
High-throughput batch ingestion of product catalogs into Firestore with GTIN validation.
"""

import json
import logging
from typing import List, Dict, Any, Optional
from pathlib import Path

from backend.config import get_db
from backend.models import ProductItem, ProductCategory

logger = logging.getLogger("automater.ingestion")

DEFAULT_CATALOG: List[Dict[str, Any]] = [
    {
        "barcode": "6001234567890",
        "name": "Farmhouse White Bread",
        "weight": "700 g",
        "category": ProductCategory.SNACKS_DRINKS.value,
        "basePrice": 22.99,
        "price": 18.99,
        "emoji": "🍞",
        "stockQuantity": 150
    },
    {
        "barcode": "6001007320995",
        "name": "Clover Full Cream Milk",
        "weight": "2 L",
        "category": ProductCategory.SNACKS_DRINKS.value,
        "basePrice": 40.99,
        "price": 34.99,
        "emoji": "🥛",
        "stockQuantity": 200
    },
    {
        "barcode": "6001068594502",
        "name": "Simba Fruit Chutney Chips",
        "weight": "120 g",
        "category": ProductCategory.SNACKS_DRINKS.value,
        "basePrice": 22.49,
        "price": 19.99,
        "emoji": "🥔",
        "stockQuantity": 300
    },
    {
        "barcode": "6009510805536",
        "name": "Crisp Red Apples",
        "weight": "1.5 kg",
        "category": ProductCategory.VEG_FRUIT.value,
        "basePrice": 33.50,
        "price": 28.50,
        "emoji": "🍎",
        "stockQuantity": 80
    },
    {
        "barcode": "0394844000012",
        "name": "Rhodes Baked Beans",
        "weight": "410 g",
        "category": ProductCategory.SNACKS_DRINKS.value,
        "basePrice": 17.49,
        "price": 15.99,
        "emoji": "🥫",
        "stockQuantity": 250
    },
    {
        "barcode": "6001571002020",
        "name": "Creamy Avocados",
        "weight": "4 pack",
        "category": ProductCategory.VEG_FRUIT.value,
        "basePrice": 52.99,
        "price": 45.00,
        "emoji": "🥑",
        "stockQuantity": 60
    },
    {
        "barcode": "6001298040148",
        "name": "Body Wash Aloe Fresh",
        "weight": "500 ml",
        "category": ProductCategory.BATH_BODY.value,
        "basePrice": 49.99,
        "price": 39.99,
        "emoji": "🧼",
        "stockQuantity": 120
    },
    {
        "barcode": "6001087379920",
        "name": "Sparkling Lemon Water",
        "weight": "6 x 500 ml",
        "category": ProductCategory.SNACKS_DRINKS.value,
        "basePrice": 58.99,
        "price": 49.99,
        "emoji": "🍋",
        "stockQuantity": 180
    },
    {
        "barcode": "6009188001278",
        "name": "Sweet Potatoes",
        "weight": "2 kg",
        "category": ProductCategory.VEG_FRUIT.value,
        "basePrice": 42.99,
        "price": 36.99,
        "emoji": "🍠",
        "stockQuantity": 90
    }
]


class CatalogIngester:
    """Handles automated batch validation and ingestion of product catalog data into Firestore."""

    def __init__(self, collection_name: str = "products"):
        self.collection_name = collection_name
        self.db = get_db()

    def ingest_items(self, items_data: List[Dict[str, Any]], retailer_id: Optional[str] = None) -> Dict[str, Any]:
        """Validates items against schema and writes them in a single batch to Firestore."""
        validated_items: List[ProductItem] = []
        errors: List[str] = []

        for index, item_raw in enumerate(items_data):
            try:
                if retailer_id and "retailerId" not in item_raw:
                    item_raw["retailerId"] = retailer_id
                item = ProductItem(**item_raw)
                validated_items.append(item)
            except Exception as e:
                err_msg = f"Item at index {index} failed validation: {e}"
                logger.error(err_msg)
                errors.append(err_msg)

        if not validated_items:
            logger.warning("No valid items to commit.")
            return {"success": False, "ingested_count": 0, "errors": errors}

        # Firestore Batch write (up to 500 operations per batch)
        batch = self.db.batch()
        count = 0
        batch_limit = 500

        for item in validated_items:
            doc_ref = self.db.collection(self.collection_name).document(item.barcode)
            batch.set(doc_ref, item.model_dump(mode="json"), merge=True)
            count += 1
            if count % batch_limit == 0:
                batch.commit()
                batch = self.db.batch()

        batch.commit()
        logger.info(f"Successfully ingested {count} items into collection '{self.collection_name}'.")

        return {
            "success": True,
            "ingested_count": count,
            "error_count": len(errors),
            "errors": errors
        }

    def seed_default_catalog(self) -> Dict[str, Any]:
        """Seeds the standard South African supermarket product catalog."""
        logger.info("Starting default catalog seeding...")
        return self.ingest_items(DEFAULT_CATALOG)

    def ingest_from_json_file(self, filepath: str, retailer_id: Optional[str] = None) -> Dict[str, Any]:
        """Ingests product definitions from a JSON file."""
        path = Path(filepath)
        if not path.exists():
            raise FileNotFoundError(f"Catalog file not found: {filepath}")

        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)

        if isinstance(data, dict) and "products" in data:
            data = data["products"]

        if not isinstance(data, list):
            raise ValueError("Expected JSON file to contain a list of product objects.")

        return self.ingest_items(data, retailer_id=retailer_id)

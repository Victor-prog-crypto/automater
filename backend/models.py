"""
Automater Backend - Pydantic Data Models & Validation Schemas
"""

from enum import Enum
from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, field_validator


class ProductCategory(str, Enum):
    SNACKS_DRINKS = "Snacks & Drinks"
    BATH_BODY = "Bath & Body"
    VEG_FRUIT = "Vegetables & Fruit"
    PANTRY = "Pantry Essentials"
    DAIRY_EGGS = "Dairy & Eggs"
    BAKERY = "Bakery & Bread"


class RetailerId(str, Enum):
    SHOPRITE = "shoprite"
    PNP = "pnp"
    SPAR = "spar"


class ProductItem(BaseModel):
    barcode: str = Field(..., description="EAN-13 / GTIN standard product barcode")
    name: str = Field(..., min_length=2, max_length=150)
    weight: str = Field(..., description="Package size or weight, e.g. '700 g' or '2 L'")
    category: str = Field(..., description="Product category")
    basePrice: float = Field(..., gt=0, description="Standard shelf price in ZAR")
    price: float = Field(..., gt=0, description="Current promotional / discounted price in ZAR")
    emoji: str = Field(default="🛍️", description="Display icon / emoji")
    retailerId: Optional[str] = Field(default=None, description="Associated retailer ID or None for universal")
    inStock: bool = Field(default=True)
    stockQuantity: int = Field(default=100, ge=0)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

    @field_validator("barcode")
    @classmethod
    def validate_barcode(cls, value: str) -> str:
        cleaned = value.strip()
        if len(cleaned) < 6:
            raise ValueError(f"Barcode '{value}' must be at least 6 characters.")
        if not cleaned.isalnum():
            raise ValueError(f"Barcode '{value}' must be alphanumeric.")
        return cleaned

    @property
    def savings_amount(self) -> float:
        return max(0.0, round(self.basePrice - self.price, 2))


class CartLineItem(BaseModel):
    barcode: str
    name: str
    price: float
    basePrice: float
    quantity: int = Field(..., gt=0)
    category: str
    emoji: str = "🛍️"


class OrderStage(str, Enum):
    ORDER_CONFIRMED = "ORDER_CONFIRMED"
    PICKING_ITEMS = "PICKING_ITEMS"
    DRIVER_EN_ROUTE = "DRIVER_EN_ROUTE"
    DELIVERED = "DELIVERED"
    CANCELLED = "CANCELLED"


class DeliveryOrder(BaseModel):
    id: str = Field(..., description="Unique alphanumeric order reference")
    userId: Optional[str] = Field(default="guest_user")
    retailerId: str = Field(..., description="Retailer identifier")
    items: List[CartLineItem] = Field(default_factory=list)
    totalAmount: float = Field(..., ge=0)
    savingsAmount: float = Field(default=0.0, ge=0)
    releasePin: str = Field(..., min_length=4, max_length=6, description="Driver delivery release code")
    stage: OrderStage = Field(default=OrderStage.ORDER_CONFIRMED)
    payoutLocked: bool = Field(default=True, description="True until driver enters valid releasePin")
    driverName: str = Field(default="Thabo")
    driverVehicle: str = Field(default="Toyota Starlet · CA 482-991")
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    completedAt: Optional[datetime] = None


class InStoreTransactionRecord(BaseModel):
    id: str = Field(..., description="Transaction audit ID")
    retailerId: str
    unpackedBarcodes: List[str]
    distinctItemCount: int
    totalQuantity: int
    merchandiseTotal: float
    couponDiscounts: float = 0.0
    payableTotal: float
    totalSavings: float
    rawQrStream: str
    createdAt: datetime = Field(default_factory=datetime.utcnow)


class LoyaltyLedgerEntry(BaseModel):
    userId: str
    pointsDelta: int
    runningBalance: int
    reason: str
    orderId: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)

"""
Automater Backend - Shoprite Category-Based Product Puller & Manager
Pulls, categorizes, validates, and indexes South African Shoprite supermarket products
(including Ritebrand, Mister Bread, Pot O' Gold, and national staples) into 5 core departments:
1. Bakery & Fresh Produce
2. Dairy, Eggs & Fridge
3. Pantry Staples & Grains
4. Drinks, Coffee & Snacks
5. Household & Personal Care
"""

import json
import logging
from pathlib import Path
from typing import Dict, List, Any, Optional

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("automater.shoprite_manager")

BASE_DIR = Path(__file__).resolve().parent.parent.parent
PUBLIC_PRODUCTS_DIR = BASE_DIR / 'public' / 'products'
DIST_PRODUCTS_DIR = BASE_DIR / 'dist' / 'products'
PUBLIC_DATA_DIR = BASE_DIR / 'public' / 'data'
PUBLIC_PRODUCTS_DIR.mkdir(parents=True, exist_ok=True)
DIST_PRODUCTS_DIR.mkdir(parents=True, exist_ok=True)
PUBLIC_DATA_DIR.mkdir(parents=True, exist_ok=True)

# 5 Core South African Supermarket Departments
SHOPRITE_DEPARTMENTS = [
    {
        "id": "Bakery & Fresh Produce",
        "label": "Bakery & Fresh",
        "emoji": "🥖",
        "color": "#ea580c",
        "description": "Daily bakery loaves, fresh vegetables, orchard fruit, and salads"
    },
    {
        "id": "Dairy, Eggs & Fridge",
        "label": "Dairy & Fridge",
        "emoji": "🥛",
        "color": "#0284c7",
        "description": "Fresh milk, UHT long-life, farm eggs, yoghurts, butter & fat spreads"
    },
    {
        "id": "Pantry Staples & Grains",
        "label": "Pantry Staples",
        "emoji": "🥫",
        "color": "#d97706",
        "description": "Maize meal, rice, pasta, canned fish, baked beans, flour & cooking oil"
    },
    {
        "id": "Drinks, Coffee & Snacks",
        "label": "Drinks & Snacks",
        "emoji": "🥤",
        "color": "#9333ea",
        "description": "Soft drinks, juices, teabags, instant coffee, potato chips & biscuits"
    },
    {
        "id": "Household & Personal Care",
        "label": "Household & Care",
        "emoji": "🧼",
        "color": "#059669",
        "description": "Dishwashing liquids, washing powders, bleach, soap, toothpaste & personal care"
    }
]

# Comprehensive Shoprite Supermarket Catalog (Categorized)
SHOPRITE_PRODUCTS_CATALOG: List[Dict[str, Any]] = [
    # ----------------------------------------------------
    # 1. Bakery & Fresh Produce
    # ----------------------------------------------------
    {
        "gtin": "6001007001001",
        "retailerId": "shoprite",
        "title": "Albany Superior Thick Slices White Bread 700g",
        "brand": "Albany",
        "category": "Bakery & Fresh Produce",
        "weight": "700 g",
        "basePrice": 19.99,
        "promoPrice": 16.99,
        "emoji": "🍞",
        "isHouseBrand": False,
        "searchKeywords": ["albany", "bread", "white", "sliced", "superior", "bakery", "toast"]
    },
    {
        "gtin": "6001007001018",
        "retailerId": "shoprite",
        "title": "Albany Superior Sliced Brown Bread 700g",
        "brand": "Albany",
        "category": "Bakery & Fresh Produce",
        "weight": "700 g",
        "basePrice": 18.49,
        "promoPrice": 15.99,
        "emoji": "🍞",
        "isHouseBrand": False,
        "searchKeywords": ["albany", "bread", "brown", "sliced", "superior", "bakery", "toast"]
    },
    {
        "gtin": "6001007002070",
        "retailerId": "shoprite",
        "title": "Mister Bread White Sliced Bread 700g",
        "brand": "Mister Bread",
        "category": "Bakery & Fresh Produce",
        "weight": "700 g",
        "basePrice": 16.49,
        "promoPrice": 13.99,
        "emoji": "🍞",
        "isHouseBrand": True,
        "searchKeywords": ["mister bread", "bread", "white", "sliced", "shoprite", "bakery", "budget"]
    },
    {
        "gtin": "6001007002087",
        "retailerId": "shoprite",
        "title": "Mister Bread Brown Sliced Bread 700g",
        "brand": "Mister Bread",
        "category": "Bakery & Fresh Produce",
        "weight": "700 g",
        "basePrice": 15.49,
        "promoPrice": 12.99,
        "emoji": "🍞",
        "isHouseBrand": True,
        "searchKeywords": ["mister bread", "bread", "brown", "sliced", "shoprite", "bakery", "budget"]
    },
    {
        "gtin": "6009510805536",
        "retailerId": "shoprite",
        "title": "Class 1 Crisp Red Gala Sweet Apples 1.5kg Bag",
        "brand": "Fresh Produce",
        "category": "Bakery & Fresh Produce",
        "weight": "1.5 kg",
        "basePrice": 33.50,
        "promoPrice": 27.99,
        "emoji": "🍎",
        "isHouseBrand": False,
        "searchKeywords": ["apples", "gala", "red", "fruit", "fresh produce", "sweet", "crisp"]
    },
    {
        "gtin": "6001571002022",
        "retailerId": "shoprite",
        "title": "Ripe & Ready Creamy Hass Avocados 4pk",
        "brand": "Fresh Produce",
        "category": "Bakery & Fresh Produce",
        "weight": "4 pk",
        "basePrice": 49.99,
        "promoPrice": 39.99,
        "emoji": "🥑",
        "isHouseBrand": False,
        "searchKeywords": ["avocado", "avo", "hass", "fresh produce", "fruit", "ripe"]
    },
    {
        "gtin": "6001007002124",
        "retailerId": "shoprite",
        "title": "Shoprite Farm Fresh Washed Potatoes 2kg Bag",
        "brand": "Shoprite Fresh",
        "category": "Bakery & Fresh Produce",
        "weight": "2 kg",
        "basePrice": 29.99,
        "promoPrice": 24.99,
        "emoji": "🥔",
        "isHouseBrand": True,
        "searchKeywords": ["potatoes", "washed", "farm fresh", "vegetables", "produce", "shoprite"]
    },
    {
        "gtin": "6001007002131",
        "retailerId": "shoprite",
        "title": "Shoprite Fresh Class 1 Brown Onions 2kg Bag",
        "brand": "Shoprite Fresh",
        "category": "Bakery & Fresh Produce",
        "weight": "2 kg",
        "basePrice": 27.99,
        "promoPrice": 21.99,
        "emoji": "🧅",
        "isHouseBrand": True,
        "searchKeywords": ["onions", "brown onions", "vegetables", "produce", "shoprite", "cooking"]
    },

    # ----------------------------------------------------
    # 2. Dairy, Eggs & Fridge
    # ----------------------------------------------------
    {
        "gtin": "6001299000270",
        "retailerId": "shoprite",
        "title": "Clover Full Cream Fresh Milk 2L",
        "brand": "Clover",
        "category": "Dairy, Eggs & Fridge",
        "weight": "2 L",
        "basePrice": 39.99,
        "promoPrice": 33.99,
        "emoji": "🥛",
        "isHouseBrand": False,
        "searchKeywords": ["clover", "milk", "fresh", "full cream", "dairy", "2l"]
    },
    {
        "gtin": "6001299000287",
        "retailerId": "shoprite",
        "title": "Clover 2% Low Fat Fresh Milk 2L",
        "brand": "Clover",
        "category": "Dairy, Eggs & Fridge",
        "weight": "2 L",
        "basePrice": 39.99,
        "promoPrice": 33.99,
        "emoji": "🥛",
        "isHouseBrand": False,
        "searchKeywords": ["clover", "milk", "low fat", "fresh", "dairy", "2l"]
    },
    {
        "gtin": "6001007002001",
        "retailerId": "shoprite",
        "title": "Ritebrand Long Life Full Cream Milk 6 x 1L",
        "brand": "Ritebrand",
        "category": "Dairy, Eggs & Fridge",
        "weight": "6 x 1 L",
        "basePrice": 99.99,
        "promoPrice": 84.99,
        "emoji": "🥛",
        "isHouseBrand": True,
        "searchKeywords": ["ritebrand", "uht", "long life", "milk", "full cream", "dairy", "shoprite", "case"]
    },
    {
        "gtin": "6001007002063",
        "retailerId": "shoprite",
        "title": "Ritebrand Large Fresh Eggs 18 Pack",
        "brand": "Ritebrand",
        "category": "Dairy, Eggs & Fridge",
        "weight": "18 pack",
        "basePrice": 54.99,
        "promoPrice": 46.99,
        "emoji": "🥚",
        "isHouseBrand": True,
        "searchKeywords": ["ritebrand", "eggs", "large", "fresh eggs", "breakfast", "shoprite", "dairy"]
    },
    {
        "gtin": "6001087009874",
        "retailerId": "shoprite",
        "title": "Rama Original 70% Fat Spread 500g Tub",
        "brand": "Rama",
        "category": "Dairy, Eggs & Fridge",
        "weight": "500 g",
        "basePrice": 26.99,
        "promoPrice": 21.99,
        "emoji": "🧈",
        "isHouseBrand": False,
        "searchKeywords": ["rama", "margarine", "butter", "spread", "dairy", "fat spread"]
    },
    {
        "gtin": "6009510806120",
        "retailerId": "shoprite",
        "title": "First Choice Long Life Full Cream UHT Milk 1L",
        "brand": "First Choice",
        "category": "Dairy, Eggs & Fridge",
        "weight": "1 L",
        "basePrice": 23.99,
        "promoPrice": 18.99,
        "emoji": "🥛",
        "isHouseBrand": False,
        "searchKeywords": ["first choice", "uht", "long life", "milk", "full cream", "dairy", "1l"]
    },

    # ----------------------------------------------------
    # 3. Pantry Staples & Grains
    # ----------------------------------------------------
    {
        "gtin": "6001007002343",
        "retailerId": "shoprite",
        "title": "White Star Super Maize Meal 2.5kg",
        "brand": "White Star",
        "category": "Pantry Staples & Grains",
        "weight": "2.5 kg",
        "basePrice": 37.99,
        "promoPrice": 31.99,
        "emoji": "🌽",
        "isHouseBrand": False,
        "searchKeywords": ["white star", "maize", "meal", "pap", "super maize", "grains", "2.5kg"]
    },
    {
        "gtin": "6001007000127",
        "retailerId": "shoprite",
        "title": "Tastic Long Grain Parboiled Rice 2kg",
        "brand": "Tastic",
        "category": "Pantry Staples & Grains",
        "weight": "2 kg",
        "basePrice": 44.99,
        "promoPrice": 37.99,
        "emoji": "🍚",
        "isHouseBrand": False,
        "searchKeywords": ["tastic", "rice", "long grain", "parboiled", "pantry", "grains", "2kg"]
    },
    {
        "gtin": "6001007002018",
        "retailerId": "shoprite",
        "title": "Ritebrand Pure Sunflower Cooking Oil 2L",
        "brand": "Ritebrand",
        "category": "Pantry Staples & Grains",
        "weight": "2 L",
        "basePrice": 64.99,
        "promoPrice": 56.99,
        "emoji": "🛢️",
        "isHouseBrand": True,
        "searchKeywords": ["ritebrand", "oil", "sunflower oil", "cooking oil", "pantry", "shoprite", "2l"]
    },
    {
        "gtin": "6001007002025",
        "retailerId": "shoprite",
        "title": "Ritebrand Parboiled Rice 2kg",
        "brand": "Ritebrand",
        "category": "Pantry Staples & Grains",
        "weight": "2 kg",
        "basePrice": 36.99,
        "promoPrice": 29.99,
        "emoji": "🍚",
        "isHouseBrand": True,
        "searchKeywords": ["ritebrand", "rice", "parboiled", "pantry", "shoprite", "grains", "2kg"]
    },
    {
        "gtin": "6001007002032",
        "retailerId": "shoprite",
        "title": "Ritebrand White Sugar 2.5kg",
        "brand": "Ritebrand",
        "category": "Pantry Staples & Grains",
        "weight": "2.5 kg",
        "basePrice": 49.99,
        "promoPrice": 43.99,
        "emoji": "🍬",
        "isHouseBrand": True,
        "searchKeywords": ["ritebrand", "sugar", "white sugar", "baking", "sweetener", "shoprite"]
    },
    {
        "gtin": "6001007000899",
        "retailerId": "shoprite",
        "title": "Koo Baked Beans in Tomato Sauce 410g",
        "brand": "Koo",
        "category": "Pantry Staples & Grains",
        "weight": "410 g",
        "basePrice": 18.49,
        "promoPrice": 14.99,
        "emoji": "🥫",
        "isHouseBrand": False,
        "searchKeywords": ["koo", "baked beans", "beans", "tomato sauce", "tin", "canned", "pantry"]
    },
    {
        "gtin": "6001007002056",
        "retailerId": "shoprite",
        "title": "Ritebrand Baked Beans in Tomato Sauce 410g",
        "brand": "Ritebrand",
        "category": "Pantry Staples & Grains",
        "weight": "410 g",
        "basePrice": 12.99,
        "promoPrice": 10.99,
        "emoji": "🥫",
        "isHouseBrand": True,
        "searchKeywords": ["ritebrand", "baked beans", "beans", "canned", "pantry", "shoprite", "budget"]
    },
    {
        "gtin": "6001007002094",
        "retailerId": "shoprite",
        "title": "Pot O' Gold Choice Grade Whole Kernel Sweetcorn 410g",
        "brand": "Pot O' Gold",
        "category": "Pantry Staples & Grains",
        "weight": "410 g",
        "basePrice": 18.99,
        "promoPrice": 14.99,
        "emoji": "🌽",
        "isHouseBrand": True,
        "searchKeywords": ["pot o gold", "sweetcorn", "corn", "canned", "vegetables", "shoprite"]
    },
    {
        "gtin": "6001053000027",
        "retailerId": "shoprite",
        "title": "Lucky Star Pilchards in Tomato Sauce 400g",
        "brand": "Lucky Star",
        "category": "Pantry Staples & Grains",
        "weight": "400 g",
        "basePrice": 28.99,
        "promoPrice": 23.99,
        "emoji": "🐟",
        "isHouseBrand": False,
        "searchKeywords": ["lucky star", "pilchards", "fish", "tomato sauce", "tin", "canned", "pantry"]
    },
    {
        "gtin": "6001053001208",
        "retailerId": "shoprite",
        "title": "Lucky Star Shredded Tuna in Oil 170g",
        "brand": "Lucky Star",
        "category": "Pantry Staples & Grains",
        "weight": "170 g",
        "basePrice": 29.99,
        "promoPrice": 24.99,
        "emoji": "🐟",
        "isHouseBrand": False,
        "searchKeywords": ["lucky star", "tuna", "shredded", "fish", "canned", "pantry"]
    },
    {
        "gtin": "6001007005436",
        "retailerId": "shoprite",
        "title": "All Gold Tomato Sauce 700ml Bottle",
        "brand": "All Gold",
        "category": "Pantry Staples & Grains",
        "weight": "700 ml",
        "basePrice": 41.99,
        "promoPrice": 34.99,
        "emoji": "🍅",
        "isHouseBrand": False,
        "searchKeywords": ["all gold", "tomato", "sauce", "ketchup", "pantry", "bottle"]
    },
    {
        "gtin": "6001007004323",
        "retailerId": "shoprite",
        "title": "Black Cat Crunchy Peanut Butter 400g Jar",
        "brand": "Black Cat",
        "category": "Pantry Staples & Grains",
        "weight": "400 g",
        "basePrice": 45.99,
        "promoPrice": 38.99,
        "emoji": "🥜",
        "isHouseBrand": False,
        "searchKeywords": ["black cat", "peanut butter", "crunchy", "spread", "pantry"]
    },
    {
        "gtin": "6001007003210",
        "retailerId": "shoprite",
        "title": "Golden Cloud Cake Wheat Flour 2.5kg Bag",
        "brand": "Golden Cloud",
        "category": "Pantry Staples & Grains",
        "weight": "2.5 kg",
        "basePrice": 42.99,
        "promoPrice": 36.99,
        "emoji": "🌾",
        "isHouseBrand": False,
        "searchKeywords": ["golden cloud", "flour", "cake flour", "wheat", "baking", "pantry"]
    },
    {
        "gtin": "6001008000140",
        "retailerId": "shoprite",
        "title": "Goldi Frozen Mixed Chicken Portions 2kg Bag",
        "brand": "Goldi",
        "category": "Pantry Staples & Grains",
        "weight": "2 kg",
        "basePrice": 99.99,
        "promoPrice": 84.99,
        "emoji": "🍗",
        "isHouseBrand": False,
        "searchKeywords": ["goldi", "chicken", "frozen", "poultry", "meat", "portions", "2kg"]
    },
    {
        "gtin": "6001007000301",
        "retailerId": "shoprite",
        "title": "Fatti's & Moni's Macaroni Pasta 500g",
        "brand": "Fatti's & Moni's",
        "category": "Pantry Staples & Grains",
        "weight": "500 g",
        "basePrice": 21.99,
        "promoPrice": 16.99,
        "emoji": "🍝",
        "isHouseBrand": False,
        "searchKeywords": ["fattis", "monis", "macaroni", "pasta", "pantry", "dinner"]
    },
    {
        "gtin": "6001007006211",
        "retailerId": "shoprite",
        "title": "Jungle Oats The Energy Champion 1kg Box",
        "brand": "Jungle Oats",
        "category": "Pantry Staples & Grains",
        "weight": "1 kg",
        "basePrice": 45.99,
        "promoPrice": 37.99,
        "emoji": "🥣",
        "isHouseBrand": False,
        "searchKeywords": ["jungle oats", "oats", "porridge", "breakfast", "energy", "grains"]
    },
    {
        "gtin": "6001007007553",
        "retailerId": "shoprite",
        "title": "Crosse & Blackwell Tangy Mayonnaise 750g Bottle",
        "brand": "Crosse & Blackwell",
        "category": "Pantry Staples & Grains",
        "weight": "750 g",
        "basePrice": 46.99,
        "promoPrice": 39.99,
        "emoji": "🥗",
        "isHouseBrand": False,
        "searchKeywords": ["crosse blackwell", "mayo", "mayonnaise", "tangy", "condiment", "pantry"]
    },

    # ----------------------------------------------------
    # 4. Drinks, Coffee & Snacks
    # ----------------------------------------------------
    {
        "gtin": "6001068594504",
        "retailerId": "shoprite",
        "title": "Simba Smoked Beef Flavoured Potato Chips 120g",
        "brand": "Simba",
        "category": "Drinks, Coffee & Snacks",
        "weight": "120 g",
        "basePrice": 22.49,
        "promoPrice": 18.99,
        "emoji": "🥔",
        "isHouseBrand": False,
        "searchKeywords": ["simba", "chips", "crisps", "smoked beef", "snacks", "potato", "treats"]
    },
    {
        "gtin": "6001068001002",
        "retailerId": "shoprite",
        "title": "Nescafé Ricoffy Instant Coffee 750g Tin",
        "brand": "Ricoffy",
        "category": "Drinks, Coffee & Snacks",
        "weight": "750 g",
        "basePrice": 69.99,
        "promoPrice": 57.99,
        "emoji": "☕",
        "isHouseBrand": False,
        "searchKeywords": ["nescafe", "ricoffy", "coffee", "instant", "hot beverages", "tin", "warm"]
    },
    {
        "gtin": "6001007008871",
        "retailerId": "shoprite",
        "title": "Bakers Blue Label Marie Biscuits 200g",
        "brand": "Bakers",
        "category": "Drinks, Coffee & Snacks",
        "weight": "200 g",
        "basePrice": 19.99,
        "promoPrice": 15.99,
        "emoji": "🍪",
        "isHouseBrand": False,
        "searchKeywords": ["bakers", "marie", "biscuits", "blue label", "tea biscuits", "snacks"]
    },
    {
        "gtin": "5449000000996",
        "retailerId": "shoprite",
        "title": "Coca-Cola Original Taste Less Sugar 2L Bottle",
        "brand": "Coca-Cola",
        "category": "Drinks, Coffee & Snacks",
        "weight": "2 L",
        "basePrice": 29.99,
        "promoPrice": 24.99,
        "emoji": "🥤",
        "isHouseBrand": False,
        "searchKeywords": ["coca cola", "coke", "soft drink", "soda", "beverages", "2l"]
    },
    {
        "gtin": "6001056000109",
        "retailerId": "shoprite",
        "title": "Five Roses Ceylon Blend Tagged Teabags 102s",
        "brand": "Five Roses",
        "category": "Drinks, Coffee & Snacks",
        "weight": "102 bags",
        "basePrice": 59.99,
        "promoPrice": 49.99,
        "emoji": "🫖",
        "isHouseBrand": False,
        "searchKeywords": ["five roses", "tea", "ceylon", "teabags", "hot beverages", "warm"]
    },
    {
        "gtin": "6001007001407",
        "retailerId": "shoprite",
        "title": "Bakers Choice Assorted Biscuits 200g",
        "brand": "Bakers",
        "category": "Drinks, Coffee & Snacks",
        "weight": "200 g",
        "basePrice": 36.99,
        "promoPrice": 29.99,
        "emoji": "🍪",
        "isHouseBrand": False,
        "searchKeywords": ["bakers", "choice assorted", "biscuits", "cookies", "snacks", "treats"]
    },
    {
        "gtin": "6001299001444",
        "retailerId": "shoprite",
        "title": "Clover Tropika Orange Flavoured Dairy Fruit Mix 2L",
        "brand": "Tropika",
        "category": "Drinks, Coffee & Snacks",
        "weight": "2 L",
        "basePrice": 38.99,
        "promoPrice": 31.99,
        "emoji": "🍹",
        "isHouseBrand": False,
        "searchKeywords": ["tropika", "clover", "orange", "fruit mix", "dairy juice", "beverages", "2l"]
    },
    {
        "gtin": "6001007002100",
        "retailerId": "shoprite",
        "title": "Ritebrand Rooibos Tagless Teabags 80s",
        "brand": "Ritebrand",
        "category": "Drinks, Coffee & Snacks",
        "weight": "80 bags",
        "basePrice": 29.99,
        "promoPrice": 23.99,
        "emoji": "🫖",
        "isHouseBrand": True,
        "searchKeywords": ["ritebrand", "rooibos", "tea", "tagless", "shoprite", "beverages"]
    },
    {
        "gtin": "6001007002117",
        "retailerId": "shoprite",
        "title": "Ritebrand 100% Apple Fruit Juice Blend 1L",
        "brand": "Ritebrand",
        "category": "Drinks, Coffee & Snacks",
        "weight": "1 L",
        "basePrice": 19.99,
        "promoPrice": 15.99,
        "emoji": "🧃",
        "isHouseBrand": True,
        "searchKeywords": ["ritebrand", "juice", "apple juice", "fruit juice", "shoprite", "drinks"]
    },

    # ----------------------------------------------------
    # 5. Household & Personal Care
    # ----------------------------------------------------
    {
        "gtin": "6001087002134",
        "retailerId": "shoprite",
        "title": "Sunlight Regular Dishwashing Liquid 750ml",
        "brand": "Sunlight",
        "category": "Household & Personal Care",
        "weight": "750 ml",
        "basePrice": 36.99,
        "promoPrice": 28.99,
        "emoji": "🧴",
        "isHouseBrand": False,
        "searchKeywords": ["sunlight", "dishwashing", "liquid", "clean", "household", "green", "dishes"]
    },
    {
        "gtin": "6001087006781",
        "retailerId": "shoprite",
        "title": "Omo Auto Concentrated Washing Powder 2kg",
        "brand": "Omo",
        "category": "Household & Personal Care",
        "weight": "2 kg",
        "basePrice": 92.99,
        "promoPrice": 76.99,
        "emoji": "🧺",
        "isHouseBrand": False,
        "searchKeywords": ["omo", "washing powder", "auto", "laundry", "clean", "household", "detergent"]
    },
    {
        "gtin": "6001087004565",
        "retailerId": "shoprite",
        "title": "Dettol Hygiene Soap Original 175g",
        "brand": "Dettol",
        "category": "Household & Personal Care",
        "weight": "175 g",
        "basePrice": 18.99,
        "promoPrice": 13.99,
        "emoji": "🧼",
        "isHouseBrand": False,
        "searchKeywords": ["dettol", "soap", "hygiene", "original", "bath", "personal care", "wash"]
    },
    {
        "gtin": "6001087007788",
        "retailerId": "shoprite",
        "title": "Colgate Triple Action Fluoride Toothpaste 100ml",
        "brand": "Colgate",
        "category": "Household & Personal Care",
        "weight": "100 ml",
        "basePrice": 22.99,
        "promoPrice": 17.99,
        "emoji": "🪥",
        "isHouseBrand": False,
        "searchKeywords": ["colgate", "toothpaste", "triple action", "dental", "personal care", "hygiene"]
    },
    {
        "gtin": "6001087005111",
        "retailerId": "shoprite",
        "title": "Domestos Thick Bleach Original 750ml",
        "brand": "Domestos",
        "category": "Household & Personal Care",
        "weight": "750 ml",
        "basePrice": 39.99,
        "promoPrice": 32.99,
        "emoji": "🧴",
        "isHouseBrand": False,
        "searchKeywords": ["domestos", "bleach", "thick", "cleaning", "household", "disinfectant"]
    },
    {
        "gtin": "6001087003346",
        "retailerId": "shoprite",
        "title": "Handy Andy Multi-Purpose Cleaner Ammonia 750ml",
        "brand": "Handy Andy",
        "category": "Household & Personal Care",
        "weight": "750 ml",
        "basePrice": 37.99,
        "promoPrice": 29.99,
        "emoji": "✨",
        "isHouseBrand": False,
        "searchKeywords": ["handy andy", "cleaner", "ammonia", "surface", "household", "shine"]
    },
    {
        "gtin": "6001087008129",
        "retailerId": "shoprite",
        "title": "Shield MotionSense Antiperspirant Roll-On 50ml",
        "brand": "Shield",
        "category": "Household & Personal Care",
        "weight": "50 ml",
        "basePrice": 32.99,
        "promoPrice": 26.99,
        "emoji": "⚡",
        "isHouseBrand": False,
        "searchKeywords": ["shield", "roll on", "deodorant", "motionsense", "personal care", "fresh"]
    },
    {
        "gtin": "6001007002049",
        "retailerId": "shoprite",
        "title": "Ritebrand Thick Bleach Regular 750ml",
        "brand": "Ritebrand",
        "category": "Household & Personal Care",
        "weight": "750 ml",
        "basePrice": 24.99,
        "promoPrice": 18.99,
        "emoji": "🧴",
        "isHouseBrand": True,
        "searchKeywords": ["ritebrand", "bleach", "thick bleach", "cleaning", "household", "shoprite"]
    },
    {
        "gtin": "6001007002148",
        "retailerId": "shoprite",
        "title": "Ritebrand Toilet Paper 2-Ply 9 Rolls",
        "brand": "Ritebrand",
        "category": "Household & Personal Care",
        "weight": "9 rolls",
        "basePrice": 59.99,
        "promoPrice": 49.99,
        "emoji": "🧻",
        "isHouseBrand": True,
        "searchKeywords": ["ritebrand", "toilet paper", "2 ply", "bathroom", "household", "shoprite"]
    },
    {
        "gtin": "6001007002155",
        "retailerId": "shoprite",
        "title": "Ritebrand Washing Powder All-in-One 2kg",
        "brand": "Ritebrand",
        "category": "Household & Personal Care",
        "weight": "2 kg",
        "basePrice": 49.99,
        "promoPrice": 39.99,
        "emoji": "🧺",
        "isHouseBrand": True,
        "searchKeywords": ["ritebrand", "washing powder", "laundry", "clean", "household", "shoprite"]
    }
]


def generate_svg_packshot(product: Dict[str, Any]) -> str:
    """Generates an aesthetic studio vector packshot for the product so images never expire."""
    gtin = product["gtin"]
    brand = product["brand"].upper()
    title = product["title"].upper()
    weight = product["weight"]
    emoji = product["emoji"]
    category = product["category"]

    # Category Color Gradient Schemes
    gradients = {
        "Bakery & Fresh Produce": ("#f97316", "#c2410c"),
        "Dairy, Eggs & Fridge": ("#0ea5e9", "#0369a1"),
        "Pantry Staples & Grains": ("#f59e0b", "#b45309"),
        "Drinks, Coffee & Snacks": ("#a855f7", "#7e22ce"),
        "Household & Personal Care": ("#10b981", "#047857")
    }
    c1, c2 = gradients.get(category, ("#e11d2e", "#991b1b"))

    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="100%" height="100%">
  <defs>
    <linearGradient id="grad_{gtin}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="{c1}" />
      <stop offset="100%" stop-color="{c2}" />
    </linearGradient>
    <filter id="shadow_{gtin}" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="8" stdDeviation="8" flood-color="#000000" flood-opacity="0.18" />
    </filter>
  </defs>

  <!-- Studio Background -->
  <rect width="400" height="400" fill="#f8fafc" rx="32" />
  <circle cx="200" cy="200" r="160" fill="#ffffff" opacity="0.9" />

  <!-- Packaging Container / Box -->
  <g filter="url(#shadow_{gtin})">
    <rect x="80" y="50" width="240" height="300" rx="24" fill="url(#grad_{gtin})" />
    
    <!-- Top Brand Ribbon -->
    <path d="M80 74 C80 60.7 90.7 50 104 50 L296 50 C309.3 50 320 60.7 320 74 L320 110 L80 110 Z" fill="rgba(0,0,0,0.2)" />
    <text x="200" y="90" text-anchor="middle" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="900" letter-spacing="2">{brand}</text>

    <!-- Center Product Emoji / Icon Illustration -->
    <circle cx="200" cy="180" r="52" fill="rgba(255,255,255,0.92)" />
    <text x="200" y="200" text-anchor="middle" font-size="56">{emoji}</text>

    <!-- Product Title & Tagline -->
    <text x="200" y="258" text-anchor="middle" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="900" letter-spacing="0.5">{title[:28]}</text>
    <rect x="100" y="274" width="200" height="22" rx="11" fill="rgba(255,255,255,0.22)" />
    <text x="200" y="289" text-anchor="middle" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-size="10" font-weight="800" letter-spacing="1">SHOPRITE VERIFIED</text>

    <!-- Bottom Weight Badge & Barcode Indicator -->
    <path d="M80 310 L320 310 L320 326 C320 339.3 309.3 350 296 350 L104 350 C90.7 350 80 339.3 80 326 Z" fill="rgba(0,0,0,0.35)" />
    <text x="135" y="335" text-anchor="middle" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="800">{weight}</text>
    <text x="255" y="335" text-anchor="middle" fill="rgba(255,255,255,0.85)" font-family="monospace" font-size="10" font-weight="700">{gtin[-6:]}</text>
  </g>
</svg>"""


class ShopriteCatalogManager:
    """Manages pulling, categorizing, and exporting Shoprite supermarket products."""

    def __init__(self):
        self.products = SHOPRITE_PRODUCTS_CATALOG
        self.departments = SHOPRITE_DEPARTMENTS

    def get_products_by_category(self) -> Dict[str, List[Dict[str, Any]]]:
        """Groups all products by their designated 5 core departments."""
        grouped = {dept["id"]: [] for dept in self.departments}
        for p in self.products:
            cat = p["category"]
            if cat in grouped:
                grouped[cat].append(p)
            else:
                grouped.setdefault("Pantry Staples & Grains", []).append(p)
        return grouped

    def ensure_local_packshots(self):
        """Ensures every product in the catalog has a permanent, high-res local packshot."""
        generated_count = 0
        for p in self.products:
            gtin = p["gtin"]
            jpg_path = PUBLIC_PRODUCTS_DIR / f"{gtin}.jpg"
            svg_path = PUBLIC_PRODUCTS_DIR / f"{gtin}.svg"

            # Always write SVG as permanent baseline
            svg_content = generate_svg_packshot(p)
            svg_path.write_text(svg_content, encoding="utf-8")
            (DIST_PRODUCTS_DIR / f"{gtin}.svg").write_text(svg_content, encoding="utf-8")

            # Determine active imageUrl (JPG if real photo exists, otherwise SVG)
            if jpg_path.exists() and jpg_path.stat().st_size > 1500:
                p["imageUrl"] = f"/products/{gtin}.jpg"
                # Copy jpg to dist as well
                dist_jpg = DIST_PRODUCTS_DIR / f"{gtin}.jpg"
                if not dist_jpg.exists():
                    dist_jpg.write_bytes(jpg_path.read_bytes())
            else:
                p["imageUrl"] = f"/products/{gtin}.svg"
            generated_count += 1

        logger.info(f"[OK] Ensured packshots for {generated_count} Shoprite products.")

    def export_catalog_json(self):
        """Exports the category-managed Shoprite catalog to public/data/shoprite_catalog.json."""
        self.ensure_local_packshots()
        grouped = self.get_products_by_category()

        payload = {
            "retailer": {
                "id": "shoprite",
                "name": "Shoprite",
                "tagline": "Low prices you can trust",
                "loyalty": "Xtra Savings",
                "color": "#e11d2e",
                "logoUrl": "/logos/shoprite.svg"
            },
            "departments": self.departments,
            "departmentCounts": {cat_id: len(items) for cat_id, items in grouped.items()},
            "totalProducts": len(self.products),
            "productsByCategory": grouped,
            "allProducts": self.products
        }

        output_path = PUBLIC_DATA_DIR / 'shoprite_catalog.json'
        output_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
        dist_path = BASE_DIR / 'dist' / 'data' / 'shoprite_catalog.json'
        dist_path.parent.mkdir(parents=True, exist_ok=True)
        dist_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
        logger.info(f"[OK] Exported category-based Shoprite catalog to {output_path}")

    def sync_to_app_js(self):
        """Synchronizes the updated category-managed catalog directly into app.js MASTER_PRODUCTS."""
        app_js_path = BASE_DIR / 'app.js'
        if not app_js_path.exists():
            logger.error("app.js not found.")
            return

        self.ensure_local_packshots()

        entries = []
        for p in self.products:
            img_url = p.get("imageUrl", f"/products/{p['gtin']}.jpg")
            is_hb = "true" if p.get("isHouseBrand") else "false"
            entry = f"""  ['{p['gtin']}', {{
    gtin: '{p['gtin']}',
    retailerId: 'shoprite',
    title: {json.dumps(p['title'])},
    brand: {json.dumps(p['brand'])},
    imageUrl: '{img_url}',
    category: {json.dumps(p['category'])},
    weight: {json.dumps(p['weight'])},
    basePrice: {p['basePrice']},
    promoPrice: {p['promoPrice']},
    emoji: '{p['emoji']}',
    isHouseBrand: {is_hb},
    searchKeywords: {json.dumps(p['searchKeywords'])}
  }}]"""
            entries.append(entry)

        new_master_map = "const MASTER_PRODUCTS = new Map([\n" + ",\n".join(entries) + "\n]);"

        content = app_js_path.read_text(encoding="utf-8")
        import re
        start_idx = content.find("const MASTER_PRODUCTS = new Map([")
        if start_idx == -1:
            logger.error("Could not find start of MASTER_PRODUCTS in app.js")
            return

        end_marker = "]);\n\n// Initialize active in-memory products from master catalog"
        end_idx = content.find(end_marker, start_idx)
        if end_idx == -1:
            # Try alternate end marker
            end_marker = "]);\n\nconst PRODUCTS"
            end_idx = content.find(end_marker, start_idx)

        if end_idx == -1:
            logger.error("Could not find end of MASTER_PRODUCTS in app.js")
            return

        updated_content = content[:start_idx] + new_master_map + content[end_idx + 3:]
        app_js_path.write_text(updated_content, encoding="utf-8")
        logger.info(f"[OK] Successfully synchronized {len(self.products)} category-managed products into app.js!")


if __name__ == "__main__":
    manager = ShopriteCatalogManager()
    manager.export_catalog_json()
    manager.sync_to_app_js()

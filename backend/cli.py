"""
Automater Backend - Unified Command-Line Interface
"""

import sys
import secrets
import argparse
from rich.console import Console
from rich.table import Table
from rich.panel import Panel

from backend.ingestion.catalog_ingester import CatalogIngester, DEFAULT_CATALOG
from backend.router.transaction_router import TransactionRouter
from backend.models import OrderStage
from backend.ingestion.sync_catalog_images import sync_images, sync_vertex_packshots
from backend.ingestion.regional_sales_agent import RegionalSalesScraperAgent

console = Console()


def seed_catalog():
    console.print(Panel.fit("[bold green]Automater Catalog Ingestion[/bold green]\nSeeding standard product catalogue into Firestore...", border_style="green"))
    ingester = CatalogIngester()
    result = ingester.seed_default_catalog()

    if result.get("success"):
        console.print(f"[bold green]✓ Successfully ingested {result['ingested_count']} products into Firestore![/bold green]")
        table = Table(title="Ingested Products (Firestore)")
        table.add_column("Barcode", style="cyan")
        table.add_column("Product Name", style="white")
        table.add_column("Category", style="yellow")
        table.add_column("Promo Price (ZAR)", style="green")
        table.add_column("Base Price (ZAR)", style="magenta")

        for item in DEFAULT_CATALOG:
            table.add_row(item["barcode"], item["name"], item["category"], f"R {item['price']:.2f}", f"R {item['basePrice']:.2f}")
        console.print(table)
    else:
        console.print(f"[bold red]✗ Ingestion failed: {result.get('errors')}[/bold red]")


def simulate_qr():
    console.print(Panel.fit("[bold cyan]Automater Zero-Integration QR Stream Simulator[/bold cyan]\nSimulating retail presentation laser scan with ASCII 13 (\\r) stream...", border_style="cyan"))

    # Simulated raw stream from 2D QR presentation laser
    sample_stream = "6001234567890\r6001234567890\r6001007320995\r6001571002020\r6001087379920\r"

    router = TransactionRouter()
    record = router.process_qr_stream(
        raw_stream=sample_stream,
        retailer_id="shoprite",
        user_id="user_101",
        active_coupons=["basket10", "fresh5"]
    )

    console.print(f"[bold green]✓ Transaction Recorded: {record.id}[/bold green]")
    console.print(f"• Total Items Scanned: [bold]{record.totalQuantity}[/bold]")
    console.print(f"• Merchandise Total: [bold]R {record.merchandiseTotal:.2f}[/bold]")
    console.print(f"• Coupon Savings Applied: [bold green]R {record.couponDiscounts:.2f}[/bold green]")
    console.print(f"• Payable Total: [bold yellow]R {record.payableTotal:.2f}[/bold yellow]")
    console.print(f"• Total Value Preserved: [bold green]R {record.totalSavings:.2f}[/bold green]")


def simulate_delivery():
    console.print(Panel.fit("[bold magenta]Automater Delivery Lifecycle & Escrow Simulator[/bold magenta]", border_style="magenta"))
    router = TransactionRouter()

    sample_cart = [
        {"barcode": "6001234567890", "name": "Farmhouse White Bread", "price": 18.99, "basePrice": 22.99, "quantity": 2, "category": "Snacks & Drinks", "emoji": "🍞"},
        {"barcode": "6001007320995", "name": "Clover Full Cream Milk", "price": 34.99, "basePrice": 40.99, "quantity": 1, "category": "Snacks & Drinks", "emoji": "🥛"}
    ]

    order = router.create_delivery_order(retailer_id="shoprite", cart_items=sample_cart, user_id="user_101")
    console.print(f"[bold green]Step 1: Order Created #{order.id}[/bold green]")
    console.print(f"• Driver PIN: [bold yellow]{order.releasePin}[/bold yellow]")
    console.print(f"• Driver Payout Status: [bold red]{'LOCKED' if order.payoutLocked else 'UNLOCKED'}[/bold red]")

    # Advance stage
    router.advance_order_stage(order.id, OrderStage.DRIVER_EN_ROUTE)
    console.print(f"[bold blue]Step 2: Order advanced to DRIVER_EN_ROUTE[/bold blue]")

    # Driver verifies PIN
    console.print(f"[bold cyan]Step 3: Driver enters PIN '{order.releasePin}' upon physical delivery...[/bold cyan]")
    verification = router.verify_driver_release_pin(order.id, order.releasePin)

    if verification.get("success"):
        console.print(f"[bold green]✓ {verification['message']}[/bold green]")
        console.print(f"• Final Payout Locked: [bold green]{verification['payoutLocked']}[/bold green]")
        console.print(f"• Final Stage: [bold green]{verification['stage']}[/bold green]")
    else:
        console.print(f"[bold red]✗ PIN Verification Failed: {verification['message']}[/bold red]")


def simulate_nedbank():
    console.print(Panel.fit("[bold green]Automater Nedbank Open Banking Instant EFT Simulator[/bold green]\nSimulating direct Account-to-Account settlement with flat R0.50 fee...", border_style="green"))
    router = TransactionRouter()

    sample_cart = [
        {"barcode": "6001234567890", "name": "Farmhouse White Bread", "price": 18.99, "basePrice": 22.99, "quantity": 2, "category": "Snacks & Drinks", "emoji": "🍞"},
        {"barcode": "6001087379920", "name": "Sparkling Lemon Water", "price": 49.99, "basePrice": 58.99, "quantity": 1, "category": "Snacks & Drinks", "emoji": "🍋"}
    ]
    gross_amount = (18.99 * 2) + 49.99
    reference = f"NED-TX-{secrets.token_hex(3).upper()}"

    res = router.process_nedbank_open_banking_settlement(
        reference=reference,
        amount=gross_amount,
        retailer_id="shoprite",
        user_id="user_101",
        cart_items=sample_cart
    )

    settlement = res["settlement"]
    console.print(f"[bold green]✓ Settlement Status: {settlement['status']}[/bold green]")
    console.print(f"• Settlement ID: [bold]{settlement['id']}[/bold]")
    console.print(f"• Gross Amount: [bold]R {settlement['grossAmount']:.2f}[/bold]")
    console.print(f"• Flat Processing Fee: [bold green]R {settlement['flatProcessingFee']:.2f}[/bold green] (vs 3% Card Fee R {settlement['cardFeeEquivalent']:.2f})")
    console.print(f"• Merchant Net Credit: [bold yellow]R {settlement['netMerchantCredit']:.2f}[/bold yellow]")
    console.print(f"• Merchant Value Preserved: [bold green]R {settlement['merchantSavings']:.2f}[/bold green]")
    if res.get("order"):
        console.print(f"• Escrow Delivery Order Created: [bold cyan]#{res['order']['id']}[/bold cyan] | Release PIN: [bold yellow]{res['order']['releasePin']}[/bold yellow]")


def main():
    parser = argparse.ArgumentParser(description="Automater Backend Pipeline & Router CLI")
    parser.add_argument("command", choices=["seed", "simulate-qr", "simulate-delivery", "simulate-nedbank", "pull-cse-images", "vertex-packshots", "regional-sales"], help="Command to execute")
    parser.add_argument("--gtin", type=str, default=None, help="Target specific product GTIN barcode")
    parser.add_argument("--limit", type=int, default=None, help="Limit number of items to process")
    parser.add_argument("--overwrite", action="store_true", help="Force regenerate existing images")

    if len(sys.argv) == 1:
        parser.print_help()
        sys.exit(1)

    args = parser.parse_args()

    if args.command == "seed":
        seed_catalog()
    elif args.command == "simulate-qr":
        simulate_qr()
    elif args.command == "simulate-delivery":
        simulate_delivery()
    elif args.command == "simulate-nedbank":
        simulate_nedbank()
    elif args.command == "pull-cse-images":
        sync_images(overwrite=args.overwrite)
    elif args.command == "vertex-packshots":
        sync_vertex_packshots(overwrite=args.overwrite, limit=args.limit, gtin_filter=args.gtin)
    elif args.command == "regional-sales":
        agent = RegionalSalesScraperAgent()
        agent.run()


if __name__ == "__main__":
    main()

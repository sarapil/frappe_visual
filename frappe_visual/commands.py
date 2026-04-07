# Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
# Developer Website: https://arkan.it.com
# License: GPL-3.0
# For license information, please see license.txt

"""
Frappe Visual — CLI Commands
Custom bench commands for scaffolding, exporting, and managing visual components.
Usage: bench --site <site> frappe-visual <command>
"""

import click
import frappe


@click.group("frappe-visual")
def frappe_visual_group():
    """Frappe Visual management commands."""
    pass


@frappe_visual_group.command("info")
@click.pass_context
def info(ctx):
    """Show Frappe Visual installation status."""
    site = ctx.obj.get("sites", [None])[0] if ctx.obj else None
    frappe.init(site=site)
    frappe.connect()

    try:
        from frappe_visual.caps import FV_CAPABILITIES, FV_ROLE_BUNDLES

        settings_dt = None
        for dt in ["FV Settings", "Frappe Visual Settings"]:
            if frappe.db.exists("DocType", dt):
                settings_dt = dt
                break

        click.echo("═══ Frappe Visual — Status ═══")
        click.echo(f"  Version:     v0.1.0")
        click.echo(f"  Components:  307+")
        click.echo(f"  CAPS:        {len(FV_CAPABILITIES)} capabilities, {len(FV_ROLE_BUNDLES)} bundles")
        click.echo(f"  Settings:    {settings_dt or 'Not found'}")
        click.echo(f"  Pages:       13")
        click.echo(f"  DocTypes:    5")

        if frappe.db.exists("DocType", "CAPS Capability"):
            seeded = frappe.db.count("CAPS Capability", {"app": "frappe_visual"})
            click.echo(f"  CAPS seeded: {seeded}/{len(FV_CAPABILITIES)}")
        else:
            click.echo("  CAPS:        Not installed")
    finally:
        frappe.destroy()


@frappe_visual_group.command("seed")
@click.pass_context
def seed(ctx):
    """Run seed_data() to create reference data."""
    site = ctx.obj.get("sites", [None])[0] if ctx.obj else None
    frappe.init(site=site)
    frappe.connect()

    try:
        from frappe_visual.seed import seed_data
        seed_data()
        frappe.db.commit()
        click.echo("✅ Seed data created successfully")
    finally:
        frappe.destroy()


@frappe_visual_group.command("export-icons")
@click.option("--format", "fmt", default="json", type=click.Choice(["json", "csv"]),
              help="Output format")
@click.pass_context
def export_icons(ctx, fmt):
    """Export list of all installed icons."""
    site = ctx.obj.get("sites", [None])[0] if ctx.obj else None
    frappe.init(site=site)
    frappe.connect()

    try:
        from frappe_visual.services.icon_service import IconService
        icons = IconService.list_installed_icons()

        if fmt == "json":
            import json
            click.echo(json.dumps(icons, indent=2))
        else:
            click.echo("icon_name")
            for icon in icons:
                name = icon.get("name", icon) if isinstance(icon, dict) else icon
                click.echo(name)

        click.echo(f"\n# Total: {len(icons)} icons", err=True)
    finally:
        frappe.destroy()


@frappe_visual_group.command("check-caps")
@click.pass_context
def check_caps(ctx):
    """Verify CAPS capabilities are properly seeded."""
    site = ctx.obj.get("sites", [None])[0] if ctx.obj else None
    frappe.init(site=site)
    frappe.connect()

    try:
        from frappe_visual.caps import FV_CAPABILITIES

        if not frappe.db.exists("DocType", "CAPS Capability"):
            click.echo("⚠️  CAPS app not installed — capabilities not enforced")
            return

        missing = []
        for cap in FV_CAPABILITIES:
            if not frappe.db.exists("CAPS Capability", cap["name"]):
                missing.append(cap["name"])

        if missing:
            click.echo(f"❌ Missing {len(missing)} capabilities:")
            for m in missing:
                click.echo(f"   - {m}")
            click.echo("\nRun: bench --site <site> frappe-visual seed")
        else:
            click.echo(f"✅ All {len(FV_CAPABILITIES)} CAPS capabilities present")
    finally:
        frappe.destroy()


@frappe_visual_group.command("demo")
@click.option("--clear", is_flag=True, help="Clear demo data instead of loading")
@click.pass_context
def demo(ctx, clear):
    """Load or clear demo data."""
    site = ctx.obj.get("sites", [None])[0] if ctx.obj else None
    frappe.init(site=site)
    frappe.connect()

    try:
        from frappe_visual.demo import load_demo_data, clear_demo_data
        if clear:
            clear_demo_data()
            click.echo("✅ Demo data cleared")
        else:
            load_demo_data()
            click.echo("✅ Demo data loaded")
        frappe.db.commit()
    finally:
        frappe.destroy()


commands = [frappe_visual_group]

# Copyright (c) 2026, Moataz M Hassan (Arkan Lab)
# License: GPL-3.0

"""
Frappe Visual — ERP Dashboard API
====================================
Server-side aggregation endpoints for the 16 ERP module dashboards.
Each endpoint returns KPIs, recent documents, and chart data in a
single call — reducing round-trips from the browser.

All queries use parameterized SQL. Permission checks are enforced.
"""

import frappe
from frappe import _
from frappe.utils import (
    add_days,
    flt,
    get_first_day,
    get_last_day,
    getdate,
    nowdate,
)


# ─── Generic Helpers ──────────────────────────────────────────────

def _date_range(period: str = "month") -> tuple[str, str]:
    """Return (from_date, to_date) for the given period."""
    today = getdate(nowdate())
    if period == "quarter":
        qm = (today.month - 1) // 3 * 3 + 1
        from_date = today.replace(month=qm, day=1)
    elif period == "year":
        from_date = today.replace(month=1, day=1)
    elif period == "week":
        from_date = add_days(today, -today.weekday())
    else:
        from_date = get_first_day(today)
    return str(from_date), str(today)


def _safe_aggregate(doctype: str, field: str, filters: dict | None = None) -> float:
    """Sum a field on a DocType with permission check."""
    if not frappe.has_permission(doctype, "read"):
        return 0.0
    try:
        result = frappe.get_all(
            doctype,
            filters=filters or {},
            fields=[f"sum(`{field}`) as total"],
            limit_page_length=0,
        )
        return flt(result[0].total) if result else 0.0
    except Exception:
        return 0.0


def _safe_count(doctype: str, filters: dict | None = None) -> int:
    """Count documents with permission check."""
    if not frappe.has_permission(doctype, "read"):
        return 0
    try:
        return frappe.db.count(doctype, filters or {})
    except Exception:
        return 0


def _safe_list(doctype: str, fields: list, filters: dict | None = None, limit: int = 5, order_by: str = "creation desc") -> list:
    """Get recent documents with permission check."""
    if not frappe.has_permission(doctype, "read"):
        return []
    try:
        return frappe.get_all(
            doctype,
            filters=filters or {},
            fields=fields,
            order_by=order_by,
            limit_page_length=limit,
        )
    except Exception:
        return []


# ─── Finance Dashboard ────────────────────────────────────────────

@frappe.whitelist()
def get_finance_data(period: str = "month", company: str | None = None):
    """Aggregated finance dashboard data."""
    frappe.has_permission("Sales Invoice", "read", throw=True)

    from_date, to_date = _date_range(period)
    company = company or frappe.defaults.get_user_default("company")
    date_filter = {"docstatus": 1, "posting_date": ["between", [from_date, to_date]]}
    if company:
        date_filter["company"] = company

    revenue = _safe_aggregate("Sales Invoice", "grand_total", date_filter)
    expenses = _safe_aggregate("Purchase Invoice", "grand_total", date_filter)
    receivable = _safe_aggregate("Sales Invoice", "outstanding_amount", {"docstatus": 1, "outstanding_amount": [">", 0]})
    payable = _safe_aggregate("Purchase Invoice", "outstanding_amount", {"docstatus": 1, "outstanding_amount": [">", 0]})

    return {
        "kpis": {
            "revenue": revenue,
            "expenses": expenses,
            "net_profit": revenue - expenses,
            "receivable": receivable,
            "payable": payable,
        },
        "recent_invoices": _safe_list("Sales Invoice",
            ["name", "customer_name", "grand_total", "status", "posting_date"],
            {"docstatus": 1}, limit=5),
        "recent_payments": _safe_list("Payment Entry",
            ["name", "party_name", "paid_amount", "payment_type", "posting_date"],
            {"docstatus": 1}, limit=5),
        "period": {"from_date": from_date, "to_date": to_date},
    }


# ─── Stock / Inventory Dashboard ──────────────────────────────────

@frappe.whitelist()
def get_stock_data(period: str = "month", company: str | None = None):
    """Aggregated inventory dashboard data."""
    frappe.has_permission("Stock Entry", "read", throw=True)

    from_date, to_date = _date_range(period)
    company = company or frappe.defaults.get_user_default("company")

    total_items = _safe_count("Item", {"disabled": 0})
    total_warehouses = _safe_count("Warehouse", {"disabled": 0, "is_group": 0})
    pending_mr = _safe_count("Material Request", {"docstatus": 1, "status": ["not in", ["Stopped", "Cancelled", "Transferred"]]})

    date_filter = {"docstatus": 1, "posting_date": ["between", [from_date, to_date]]}
    if company:
        date_filter["company"] = company
    stock_entries = _safe_count("Stock Entry", date_filter)

    return {
        "kpis": {
            "total_items": total_items,
            "total_warehouses": total_warehouses,
            "pending_material_requests": pending_mr,
            "stock_entries": stock_entries,
        },
        "recent_entries": _safe_list("Stock Entry",
            ["name", "stock_entry_type", "posting_date", "total_amount"],
            {"docstatus": 1}, limit=5),
        "recent_requests": _safe_list("Material Request",
            ["name", "material_request_type", "transaction_date", "status"],
            {"docstatus": ["<", 2]}, limit=5),
        "period": {"from_date": from_date, "to_date": to_date},
    }


# ─── HR Dashboard ─────────────────────────────────────────────────

@frappe.whitelist()
def get_hr_data(period: str = "month", company: str | None = None):
    """Aggregated HR dashboard data."""
    frappe.has_permission("Employee", "read", throw=True)

    company = company or frappe.defaults.get_user_default("company")
    emp_filters = {"status": "Active"}
    if company:
        emp_filters["company"] = company

    active_employees = _safe_count("Employee", emp_filters)
    new_hires = _safe_count("Employee", {**emp_filters, "date_of_joining": [">=", add_days(nowdate(), -30)]})

    pending_leaves = _safe_count("Leave Application", {"status": "Open"})
    open_job_openings = _safe_count("Job Opening", {"status": "Open"})

    return {
        "kpis": {
            "active_employees": active_employees,
            "new_hires_30d": new_hires,
            "pending_leaves": pending_leaves,
            "open_positions": open_job_openings,
        },
        "recent_leaves": _safe_list("Leave Application",
            ["name", "employee_name", "leave_type", "from_date", "to_date", "status"],
            {"status": "Open"}, limit=5),
        "recent_applicants": _safe_list("Job Applicant",
            ["name", "applicant_name", "job_title", "status"],
            limit=5),
    }


# ─── Selling Dashboard ────────────────────────────────────────────

@frappe.whitelist()
def get_selling_data(period: str = "month", company: str | None = None):
    """Aggregated sales dashboard data."""
    frappe.has_permission("Sales Order", "read", throw=True)

    from_date, to_date = _date_range(period)
    company = company or frappe.defaults.get_user_default("company")
    date_filter = {"docstatus": 1, "transaction_date": ["between", [from_date, to_date]]}
    if company:
        date_filter["company"] = company

    sales_total = _safe_aggregate("Sales Order", "grand_total", date_filter)
    sales_count = _safe_count("Sales Order", date_filter)
    quotation_total = _safe_aggregate("Quotation", "grand_total", {**date_filter, "status": ["!=", "Lost"]})
    open_orders = _safe_count("Sales Order", {"docstatus": 1, "status": ["not in", ["Completed", "Cancelled", "Closed"]]})

    return {
        "kpis": {
            "sales_total": sales_total,
            "sales_count": sales_count,
            "quotation_total": quotation_total,
            "open_orders": open_orders,
        },
        "recent_orders": _safe_list("Sales Order",
            ["name", "customer_name", "grand_total", "status", "transaction_date"],
            {"docstatus": 1}, limit=5),
        "recent_quotations": _safe_list("Quotation",
            ["name", "party_name", "grand_total", "status", "transaction_date"],
            {"docstatus": 1}, limit=5),
        "period": {"from_date": from_date, "to_date": to_date},
    }


# ─── Buying Dashboard ─────────────────────────────────────────────

@frappe.whitelist()
def get_buying_data(period: str = "month", company: str | None = None):
    """Aggregated purchasing dashboard data."""
    frappe.has_permission("Purchase Order", "read", throw=True)

    from_date, to_date = _date_range(period)
    company = company or frappe.defaults.get_user_default("company")
    date_filter = {"docstatus": 1, "transaction_date": ["between", [from_date, to_date]]}
    if company:
        date_filter["company"] = company

    purchase_total = _safe_aggregate("Purchase Order", "grand_total", date_filter)
    purchase_count = _safe_count("Purchase Order", date_filter)
    pending_receipt = _safe_count("Purchase Order", {"docstatus": 1, "status": ["in", ["To Receive", "To Receive and Bill"]]})
    pending_rfq = _safe_count("Request for Quotation", {"docstatus": 1, "status": "Submitted"})

    return {
        "kpis": {
            "purchase_total": purchase_total,
            "purchase_count": purchase_count,
            "pending_receipt": pending_receipt,
            "pending_rfq": pending_rfq,
        },
        "recent_orders": _safe_list("Purchase Order",
            ["name", "supplier_name", "grand_total", "status", "transaction_date"],
            {"docstatus": 1}, limit=5),
        "recent_receipts": _safe_list("Purchase Receipt",
            ["name", "supplier_name", "grand_total", "posting_date"],
            {"docstatus": 1}, limit=5),
        "period": {"from_date": from_date, "to_date": to_date},
    }


# ─── Manufacturing Dashboard ──────────────────────────────────────

@frappe.whitelist()
def get_manufacturing_data(period: str = "month", company: str | None = None):
    """Aggregated manufacturing dashboard data."""
    frappe.has_permission("Work Order", "read", throw=True)

    from_date, to_date = _date_range(period)
    company = company or frappe.defaults.get_user_default("company")

    active_wo = _safe_count("Work Order", {"docstatus": 1, "status": ["in", ["Not Started", "In Process"]]})
    completed_wo = _safe_count("Work Order", {"docstatus": 1, "status": "Completed",
                                              "actual_end_date": ["between", [from_date, to_date]]})
    total_bom = _safe_count("BOM", {"is_active": 1, "docstatus": 1})
    overdue_wo = _safe_count("Work Order", {"docstatus": 1, "status": ["in", ["Not Started", "In Process"]],
                                            "expected_delivery_date": ["<", nowdate()]})

    return {
        "kpis": {
            "active_work_orders": active_wo,
            "completed_period": completed_wo,
            "active_boms": total_bom,
            "overdue_work_orders": overdue_wo,
        },
        "recent_work_orders": _safe_list("Work Order",
            ["name", "production_item", "qty", "status", "expected_delivery_date"],
            {"docstatus": 1, "status": ["!=", "Cancelled"]}, limit=5),
        "period": {"from_date": from_date, "to_date": to_date},
    }


# ─── Projects Dashboard ───────────────────────────────────────────

@frappe.whitelist()
def get_projects_data(period: str = "month", company: str | None = None):
    """Aggregated projects dashboard data."""
    frappe.has_permission("Project", "read", throw=True)

    company = company or frappe.defaults.get_user_default("company")
    active_filter = {"status": "Open"}
    if company:
        active_filter["company"] = company

    active_projects = _safe_count("Project", active_filter)
    overdue = _safe_count("Project", {**active_filter, "expected_end_date": ["<", nowdate()]})
    open_tasks = _safe_count("Task", {"status": ["not in", ["Completed", "Cancelled"]]})
    completed_m = _safe_count("Project", {"status": "Completed",
                                          "actual_end_date": [">=", add_days(nowdate(), -30)]})

    return {
        "kpis": {
            "active_projects": active_projects,
            "overdue_projects": overdue,
            "open_tasks": open_tasks,
            "completed_last_30d": completed_m,
        },
        "recent_projects": _safe_list("Project",
            ["name", "project_name", "status", "percent_complete", "expected_end_date"],
            {"status": ["!=", "Cancelled"]}, limit=5),
        "recent_tasks": _safe_list("Task",
            ["name", "subject", "project", "status", "priority"],
            {"status": ["not in", ["Completed", "Cancelled"]]}, limit=5),
    }


# ─── CRM Dashboard ────────────────────────────────────────────────

@frappe.whitelist()
def get_crm_data(period: str = "month"):
    """Aggregated CRM dashboard data."""
    frappe.has_permission("Lead", "read", throw=True)

    from_date, to_date = _date_range(period)

    open_leads = _safe_count("Lead", {"status": ["not in", ["Converted", "Do Not Contact"]]})
    new_leads = _safe_count("Lead", {"creation": ["between", [from_date, to_date]]})
    open_opps = _safe_count("Opportunity", {"status": "Open"})
    opp_value = _safe_aggregate("Opportunity", "opportunity_amount", {"status": "Open"})

    return {
        "kpis": {
            "open_leads": open_leads,
            "new_leads_period": new_leads,
            "open_opportunities": open_opps,
            "pipeline_value": opp_value,
        },
        "recent_leads": _safe_list("Lead",
            ["name", "lead_name", "source", "status", "creation"],
            limit=5),
        "recent_opportunities": _safe_list("Opportunity",
            ["name", "party_name", "opportunity_amount", "status", "expected_closing"],
            {"status": "Open"}, limit=5),
        "period": {"from_date": from_date, "to_date": to_date},
    }


# ─── Assets Dashboard ─────────────────────────────────────────────

@frappe.whitelist()
def get_assets_data(company: str | None = None):
    """Aggregated asset management data."""
    frappe.has_permission("Asset", "read", throw=True)

    company = company or frappe.defaults.get_user_default("company")
    f = {"docstatus": 1}
    if company:
        f["company"] = company

    total_assets = _safe_count("Asset", f)
    total_value = _safe_aggregate("Asset", "gross_purchase_amount", f)
    in_maintenance = _safe_count("Asset", {**f, "status": "Out of Order"})
    depreciation = _safe_aggregate("Asset", "opening_accumulated_depreciation", f)

    return {
        "kpis": {
            "total_assets": total_assets,
            "total_value": total_value,
            "in_maintenance": in_maintenance,
            "total_depreciation": depreciation,
        },
        "recent_assets": _safe_list("Asset",
            ["name", "asset_name", "asset_category", "status", "gross_purchase_amount"],
            {"docstatus": 1}, limit=5),
    }


# ─── Quality Dashboard ────────────────────────────────────────────

@frappe.whitelist()
def get_quality_data(period: str = "month"):
    """Aggregated quality management data."""
    frappe.has_permission("Quality Inspection", "read", throw=True)

    from_date, to_date = _date_range(period)

    total_inspections = _safe_count("Quality Inspection", {"docstatus": 1,
                                    "report_date": ["between", [from_date, to_date]]})
    accepted = _safe_count("Quality Inspection", {"docstatus": 1, "status": "Accepted",
                           "report_date": ["between", [from_date, to_date]]})
    rejected = _safe_count("Quality Inspection", {"docstatus": 1, "status": "Rejected",
                           "report_date": ["between", [from_date, to_date]]})

    return {
        "kpis": {
            "total_inspections": total_inspections,
            "accepted": accepted,
            "rejected": rejected,
            "acceptance_rate": round(accepted / total_inspections * 100, 1) if total_inspections else 0,
        },
        "recent_inspections": _safe_list("Quality Inspection",
            ["name", "item_code", "status", "report_date"],
            {"docstatus": 1}, limit=5),
        "period": {"from_date": from_date, "to_date": to_date},
    }


# ─── Support Dashboard ────────────────────────────────────────────

@frappe.whitelist()
def get_support_data(period: str = "month"):
    """Aggregated support desk data."""
    frappe.has_permission("Issue", "read", throw=True)

    from_date, to_date = _date_range(period)

    open_issues = _safe_count("Issue", {"status": "Open"})
    new_issues = _safe_count("Issue", {"creation": ["between", [from_date, to_date]]})
    resolved = _safe_count("Issue", {"status": "Resolved",
                           "resolution_date": ["between", [from_date, to_date]]})
    closed = _safe_count("Issue", {"status": "Closed",
                         "resolution_date": ["between", [from_date, to_date]]})

    return {
        "kpis": {
            "open_issues": open_issues,
            "new_issues_period": new_issues,
            "resolved_period": resolved,
            "closed_period": closed,
        },
        "recent_issues": _safe_list("Issue",
            ["name", "subject", "priority", "status", "creation"],
            {"status": ["!=", "Cancelled"]}, limit=5),
        "period": {"from_date": from_date, "to_date": to_date},
    }


# ─── Payroll Dashboard ────────────────────────────────────────────

@frappe.whitelist()
def get_payroll_data(period: str = "month", company: str | None = None):
    """Aggregated payroll data."""
    frappe.has_permission("Salary Slip", "read", throw=True)

    from_date, to_date = _date_range(period)
    company = company or frappe.defaults.get_user_default("company")
    f = {"docstatus": 1, "posting_date": ["between", [from_date, to_date]]}
    if company:
        f["company"] = company

    total_payout = _safe_aggregate("Salary Slip", "net_pay", f)
    slip_count = _safe_count("Salary Slip", f)
    draft_slips = _safe_count("Salary Slip", {"docstatus": 0})

    return {
        "kpis": {
            "total_payout": total_payout,
            "slips_processed": slip_count,
            "draft_slips": draft_slips,
        },
        "recent_slips": _safe_list("Salary Slip",
            ["name", "employee_name", "net_pay", "posting_date", "status"],
            {"docstatus": 1}, limit=5),
        "period": {"from_date": from_date, "to_date": to_date},
    }


# ─── POS Dashboard ────────────────────────────────────────────────

@frappe.whitelist()
def get_pos_data(period: str = "month"):
    """Aggregated POS data."""
    frappe.has_permission("POS Invoice", "read", throw=True)

    from_date, to_date = _date_range(period)
    f = {"docstatus": 1, "posting_date": ["between", [from_date, to_date]]}

    total_sales = _safe_aggregate("POS Invoice", "grand_total", f)
    transaction_count = _safe_count("POS Invoice", f)
    avg_ticket = round(total_sales / transaction_count, 2) if transaction_count else 0

    return {
        "kpis": {
            "total_sales": total_sales,
            "transaction_count": transaction_count,
            "avg_ticket": avg_ticket,
        },
        "recent_invoices": _safe_list("POS Invoice",
            ["name", "customer_name", "grand_total", "posting_date"],
            {"docstatus": 1}, limit=5),
        "period": {"from_date": from_date, "to_date": to_date},
    }


# ─── Loan Dashboard ───────────────────────────────────────────────

@frappe.whitelist()
def get_loan_data(company: str | None = None):
    """Aggregated loan management data."""
    frappe.has_permission("Loan", "read", throw=True)

    company = company or frappe.defaults.get_user_default("company")
    f = {"docstatus": 1}
    if company:
        f["company"] = company

    active_loans = _safe_count("Loan", {**f, "status": ["in", ["Disbursed", "Partially Disbursed"]]})
    total_disbursed = _safe_aggregate("Loan", "disbursed_amount", f)
    total_outstanding = _safe_aggregate("Loan", "total_amount_paid", f)

    return {
        "kpis": {
            "active_loans": active_loans,
            "total_disbursed": total_disbursed,
            "total_repaid": total_outstanding,
        },
        "recent_loans": _safe_list("Loan",
            ["name", "applicant_name", "loan_amount", "status", "disbursement_date"],
            {"docstatus": 1}, limit=5),
    }


# ─── Website Dashboard ────────────────────────────────────────────

@frappe.whitelist()
def get_website_data():
    """Aggregated website data."""
    frappe.has_permission("Web Page", "read", throw=True)

    published_pages = _safe_count("Web Page", {"published": 1})
    total_blogs = _safe_count("Blog Post", {"published": 1})
    total_forms = _safe_count("Web Form", {"published": 1})

    return {
        "kpis": {
            "published_pages": published_pages,
            "published_blogs": total_blogs,
            "published_forms": total_forms,
        },
        "recent_pages": _safe_list("Web Page",
            ["name", "title", "route", "published", "modified"],
            {"published": 1}, limit=5),
        "recent_blogs": _safe_list("Blog Post",
            ["name", "title", "blogger", "published_on"],
            {"published": 1}, limit=5),
    }


# ─── Role Hub — Unified User Dashboard ────────────────────────────

@frappe.whitelist()
def get_role_hub_data():
    frappe.only_for(["System Manager", "Website Manager"])
    """Get available ERP modules based on current user's roles."""
    user_roles = frappe.get_roles(frappe.session.user)

    module_map = [
        {"key": "finance", "title": _("Finance"), "icon": "ti ti-coin", "color": "#10b981",
         "roles": ["Accounts Manager", "Accounts User"], "route": "/app/fv-finance"},
        {"key": "stock", "title": _("Inventory"), "icon": "ti ti-package", "color": "#f59e0b",
         "roles": ["Stock Manager", "Stock User"], "route": "/app/fv-stock"},
        {"key": "hr", "title": _("HR"), "icon": "ti ti-users", "color": "#6366f1",
         "roles": ["HR Manager", "HR User"], "route": "/app/fv-hr"},
        {"key": "selling", "title": _("Sales"), "icon": "ti ti-chart-line", "color": "#3b82f6",
         "roles": ["Sales Manager", "Sales User"], "route": "/app/fv-selling"},
        {"key": "buying", "title": _("Purchasing"), "icon": "ti ti-shopping-cart", "color": "#8b5cf6",
         "roles": ["Purchase Manager", "Purchase User"], "route": "/app/fv-buying"},
        {"key": "manufacturing", "title": _("Manufacturing"), "icon": "ti ti-building-factory", "color": "#ec4899",
         "roles": ["Manufacturing Manager", "Manufacturing User"], "route": "/app/fv-manufacturing"},
        {"key": "projects", "title": _("Projects"), "icon": "ti ti-folders", "color": "#14b8a6",
         "roles": ["Projects Manager", "Projects User"], "route": "/app/fv-projects"},
        {"key": "crm", "title": _("CRM"), "icon": "ti ti-address-book", "color": "#f97316",
         "roles": ["Sales Manager", "Sales User"], "route": "/app/fv-crm"},
        {"key": "assets", "title": _("Assets"), "icon": "ti ti-building-warehouse", "color": "#64748b",
         "roles": ["Accounts Manager"], "route": "/app/fv-assets"},
        {"key": "quality", "title": _("Quality"), "icon": "ti ti-microscope", "color": "#06b6d4",
         "roles": ["Quality Manager"], "route": "/app/fv-quality"},
        {"key": "support", "title": _("Support"), "icon": "ti ti-ticket", "color": "#ef4444",
         "roles": ["Support Team"], "route": "/app/fv-support"},
        {"key": "payroll", "title": _("Payroll"), "icon": "ti ti-cash", "color": "#22c55e",
         "roles": ["HR Manager", "HR User"], "route": "/app/fv-payroll"},
        {"key": "pos", "title": _("POS"), "icon": "ti ti-shopping-bag", "color": "#eab308",
         "roles": ["Accounts Manager", "Sales User"], "route": "/app/fv-pos"},
        {"key": "loans", "title": _("Loans"), "icon": "ti ti-building-bank", "color": "#0ea5e9",
         "roles": ["Accounts Manager"], "route": "/app/fv-loans"},
        {"key": "website", "title": _("Website"), "icon": "ti ti-world", "color": "#84cc16",
         "roles": ["Website Manager"], "route": "/app/fv-website"},
    ]

    is_admin = "System Manager" in user_roles or "Administrator" in user_roles
    available = []
    for m in module_map:
        if is_admin or any(r in user_roles for r in m["roles"]):
            available.append(m)

    return {
        "user": frappe.session.user,
        "user_fullname": frappe.utils.get_fullname(frappe.session.user),
        "modules": available,
        "is_admin": is_admin,
        "total_available": len(available),
    }

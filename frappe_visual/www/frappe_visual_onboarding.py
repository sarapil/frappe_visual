# Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
# Developer Website: https://arkan.it.com
# License: GPL-3.0
# For license information, please see license.txt

import frappe


def get_context(context):
    context.no_cache = 1
    context.title = frappe._("Frappe Visual Onboarding")
    context.parents = [{"name": frappe._("Home"), "route": "/"}]

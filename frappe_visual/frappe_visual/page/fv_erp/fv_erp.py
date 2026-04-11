# Copyright (c) 2026, Moataz M Hassan (Arkan Lab)
# License: GPL-3.0

"""Frappe Visual — ERP Modules Page"""

import frappe
from frappe import _


def get_context(context):
    context.no_cache = 1

"""
Frappe Visual — Visual Hub Page
=================================
A Frappe page that serves as the main entry point for exploring
any installed Frappe application's structure visually.
"""

import frappe
from frappe import _


def get_context(context):
	context.no_cache = 1

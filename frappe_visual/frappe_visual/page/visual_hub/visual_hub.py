# Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
# Developer Website: https://arkan.it.com
# License: GPL-3.0
# For license information, please see license.txt

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

# Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
# Developer Website: https://arkan.it.com
# License: GPL-3.0
# For license information, please see license.txt

"""
Frappe Visual — CAPS Gate (DEPRECATED)
This module re-exports from the canonical location: caps_integration.gate
All new code should import from frappe_visual.caps_integration.gate directly.
"""

# Re-export for backwards compatibility
from frappe_visual.caps_integration.gate import (  # noqa: F401
    CapabilityDenied,
    check_capability,
    require_capability,
)

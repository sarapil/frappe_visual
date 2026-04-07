# Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
# Developer Website: https://arkan.it.com
# License: GPL-3.0
# For license information, please see license.txt

"""
Frappe Visual — Custom Exception Hierarchy
Visual Graph & UI Component Library
"""

import frappe


class FrappeVisualError(Exception):
    """Frappe Visual base exception — all app-specific errors inherit from this."""

    http_status_code = 500
    error_code = "FV_UNKNOWN_ERROR"

    def __init__(self, message=None, title=None):
        self.message = message or frappe._("An error occurred in Frappe Visual")
        self.title = title or frappe._("Frappe Visual Error")
        super().__init__(self.message)


class ValidationError(FrappeVisualError):
    """Raised when input validation fails."""

    http_status_code = 400
    error_code = "FV_VALIDATION_ERROR"

    def __init__(self, message=None, field=None):
        self.field = field
        super().__init__(
            message or frappe._("Validation failed"),
            title=frappe._("Validation Error"),
        )


class NotFoundError(FrappeVisualError):
    """Raised when a requested resource is not found."""

    http_status_code = 404
    error_code = "FV_NOT_FOUND"

    def __init__(self, doctype=None, name=None):
        msg = frappe._("{0} {1} not found").format(doctype or "Record", name or "")
        super().__init__(msg, title=frappe._("Not Found"))


class PermissionError(FrappeVisualError):
    """Raised when user lacks required permissions or CAPS capabilities."""

    http_status_code = 403
    error_code = "FV_PERMISSION_DENIED"

    def __init__(self, action=None, doctype=None):
        msg = frappe._("You do not have permission to {0} {1}").format(
            action or "access", doctype or "this resource"
        )
        super().__init__(msg, title=frappe._("Permission Denied"))


class ConfigurationError(FrappeVisualError):
    """Raised when app configuration is incomplete or invalid."""

    http_status_code = 500
    error_code = "FV_CONFIGURATION_ERROR"

    def __init__(self, setting=None):
        self.setting_name = setting
        msg = frappe._("{0} is not configured properly. Please check Settings.").format(
            setting or "Frappe Visual"
        )
        super().__init__(msg, title=frappe._("Configuration Error"))


class IntegrationError(FrappeVisualError):
    """Raised when an external integration fails (API call, webhook, etc.)."""

    http_status_code = 502
    error_code = "FV_INTEGRATION_ERROR"

    def __init__(self, service=None, message=None):
        msg = frappe._("Integration error with {0}: {1}").format(
            service or "external service", message or "unknown error"
        )
        super().__init__(msg, title=frappe._("Integration Error"))


class RateLimitError(FrappeVisualError):
    """Raised when rate limit is exceeded."""

    http_status_code = 429
    error_code = "FV_RATE_LIMIT"

    def __init__(self):
        super().__init__(
            frappe._("Too many requests. Please try again later."),
            title=frappe._("Rate Limit Exceeded"),
        )


class LicenseError(FrappeVisualError):
    """Raised when license validation fails."""

    http_status_code = 403
    error_code = "FV_LICENSE_ERROR"

    def __init__(self, message=None):
        super().__init__(
            message or frappe._("License validation failed"),
            title=frappe._("License Error"),
        )


class ThemeError(FrappeVisualError):
    """Raised when theme configuration or rendering fails."""

    http_status_code = 500
    error_code = "FV_THEME_ERROR"

    def __init__(self, theme_name=None, message=None):
        self.theme_name = theme_name
        msg = frappe._("Theme error{0}: {1}").format(
            f" ({theme_name})" if theme_name else "",
            message or "unknown error",
        )
        super().__init__(msg, title=frappe._("Theme Error"))


class ComponentNotFoundError(FrappeVisualError):
    """Raised when a requested visual component is not found."""

    http_status_code = 404
    error_code = "FV_COMPONENT_NOT_FOUND"

    def __init__(self, component_name=None):
        msg = frappe._("Visual component '{0}' not found").format(
            component_name or "unknown"
        )
        super().__init__(msg, title=frappe._("Component Not Found"))


class LayoutError(FrappeVisualError):
    """Raised when graph layout computation fails."""

    http_status_code = 500
    error_code = "FV_LAYOUT_ERROR"

    def __init__(self, layout_engine=None, message=None):
        self.layout_engine = layout_engine
        msg = frappe._("Layout error{0}: {1}").format(
            f" ({layout_engine})" if layout_engine else "",
            message or "computation failed",
        )
        super().__init__(msg, title=frappe._("Layout Error"))


class RenderError(FrappeVisualError):
    """Raised when visual rendering (SVG/PNG export) fails."""

    http_status_code = 500
    error_code = "FV_RENDER_ERROR"

    def __init__(self, format_type=None, message=None):
        self.format_type = format_type
        msg = frappe._("Render error{0}: {1}").format(
            f" ({format_type})" if format_type else "",
            message or "export failed",
        )
        super().__init__(msg, title=frappe._("Render Error"))

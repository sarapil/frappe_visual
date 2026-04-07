# Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
# License: GPL-3.0

"""
Render Service — Server-side render job orchestration
======================================================
Processes FV Render Job documents via background queue.
Client-side rendering is handled in the browser by client_renderer.js;
this service handles job lifecycle, file storage, and notifications.
"""

import time

import frappe


def process_render_job(job_name: str):
	"""Background task: process a render job."""
	job = frappe.get_doc("FV Render Job", job_name)

	if job.status == "Cancelled":
		return

	job.mark_rendering()

	start_time = time.time()

	try:
		if job.render_type == "Screenshot":
			result = _process_screenshot(job)
		elif job.render_type == "Animation":
			result = _process_animation(job)
		elif job.render_type in ("Panorama", "360 View"):
			result = _process_panorama(job)
		else:
			frappe.throw(f"Unknown render type: {job.render_type}")

		render_time = round(time.time() - start_time, 2)

		job.mark_completed(
			output_file=result.get("file_url", ""),
			render_time=render_time,
			file_size=result.get("file_size", 0),
			thumbnail=result.get("thumbnail_url"),
		)

	except Exception as e:
		job.mark_failed(str(e))
		frappe.log_error(
			title=f"Render Job Failed: {job_name}",
			message=frappe.get_traceback(),
		)


def _process_screenshot(job) -> dict:
	"""
	Screenshot rendering.
	For server-side: requires a headless browser or external render API.
	For now, store the scene data and let the client handle actual rendering.
	"""
	# If the job has a pre-rendered output (uploaded from client), just track it
	if job.output_file:
		file_doc = frappe.get_doc("File", {"file_url": job.output_file})
		return {
			"file_url": job.output_file,
			"file_size": file_doc.file_size if file_doc else 0,
		}

	# Otherwise, mark as a client-side render request
	# The client will poll for status and upload the result
	return {
		"file_url": "",
		"file_size": 0,
	}


def _process_animation(job) -> dict:
	"""Animation frame sequence — coordinated by client renderer."""
	return {"file_url": "", "file_size": 0}


def _process_panorama(job) -> dict:
	"""360/Panorama render — coordinated by client renderer."""
	return {"file_url": "", "file_size": 0}


@frappe.whitelist()
def upload_render_result(job_name: str, file_url: str, render_time: float = 0, file_size: int = 0):
	"""Called by client after browser-side rendering completes."""
	frappe.has_permission("FV Render Job", "write", throw=True)

	job = frappe.get_doc("FV Render Job", job_name)
	if job.status not in ("Queued", "Rendering"):
		frappe.throw(f"Job {job_name} is not in a renderable state (status: {job.status})")

	job.mark_completed(
		output_file=file_url,
		render_time=float(render_time),
		file_size=int(file_size),
	)

	return {"status": "success", "job": job_name}


@frappe.whitelist()
def get_render_status(job_name: str) -> dict:
	"""Poll render job status."""
	frappe.has_permission("FV Render Job", "read", throw=True)

	job = frappe.get_cached_doc("FV Render Job", job_name)
	return {
		"status": job.status,
		"output_file": job.output_file,
		"render_time": job.render_time,
		"error_message": job.error_message,
	}

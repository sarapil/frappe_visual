# Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
# License: GPL-3.0

import time

import frappe
from frappe.model.document import Document


class FVRenderJob(Document):
	def validate(self):
		if not self.scene_data and not self.model_file:
			frappe.throw("Either Scene Data or Model File is required.")

	def on_submit(self):
		self.db_set("status", "Queued")
		frappe.enqueue(
			"frappe_visual.services.render_service.process_render_job",
			queue="long",
			timeout=600,
			job_name=self.name,
		)

	def on_cancel(self):
		if self.status in ("Queued", "Rendering"):
			self.db_set("status", "Cancelled")

	def mark_rendering(self):
		self.db_set("status", "Rendering")

	def mark_completed(self, output_file: str, render_time: float, file_size: int, thumbnail: str | None = None):
		self.db_set({
			"status": "Completed",
			"output_file": output_file,
			"render_time": render_time,
			"file_size": file_size,
			"thumbnail": thumbnail or "",
		})
		frappe.publish_realtime(
			event="fv_render_complete",
			message={"job": self.name, "output_file": output_file},
			user=self.owner,
		)

	def mark_failed(self, error_message: str):
		self.db_set({
			"status": "Failed",
			"error_message": error_message,
		})
		frappe.publish_realtime(
			event="fv_render_failed",
			message={"job": self.name, "error": error_message},
			user=self.owner,
		)

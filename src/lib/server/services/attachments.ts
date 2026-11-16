import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { basename, extname, join, resolve, sep } from 'node:path';
import type Database from 'better-sqlite3';
import { fileTypeFromBuffer } from 'file-type';
import type { AttachmentItem, PublicUser } from '#lib/types.ts';
import { logActivity } from './activity.ts';

export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

export class AttachmentError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'AttachmentError';
	}
}

interface AllowedType {
	mimeTypes: string[];
	canonicalMime: string;
}

const ALLOWED_TYPES: Record<string, AllowedType> = {
	pdf: { mimeTypes: ['application/pdf'], canonicalMime: 'application/pdf' },
	doc: {
		mimeTypes: ['application/msword', 'application/x-cfb'],
		canonicalMime: 'application/msword'
	},
	docx: {
		mimeTypes: [
			'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
			'application/zip'
		],
		canonicalMime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
	},
	xls: {
		mimeTypes: ['application/vnd.ms-excel', 'application/x-cfb'],
		canonicalMime: 'application/vnd.ms-excel'
	},
	xlsx: {
		mimeTypes: [
			'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			'application/zip'
		],
		canonicalMime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
	},
	ppt: {
		mimeTypes: ['application/vnd.ms-powerpoint', 'application/x-cfb'],
		canonicalMime: 'application/vnd.ms-powerpoint'
	},
	pptx: {
		mimeTypes: [
			'application/vnd.openxmlformats-officedocument.presentationml.presentation',
			'application/zip'
		],
		canonicalMime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
	},
	txt: {
		mimeTypes: ['text/plain'],
		canonicalMime: 'text/plain'
	},
	csv: {
		mimeTypes: ['text/csv', 'text/plain', 'application/csv'],
		canonicalMime: 'text/csv'
	},
	png: { mimeTypes: ['image/png'], canonicalMime: 'image/png' },
	jpg: { mimeTypes: ['image/jpeg'], canonicalMime: 'image/jpeg' },
	jpeg: { mimeTypes: ['image/jpeg'], canonicalMime: 'image/jpeg' },
	webp: { mimeTypes: ['image/webp'], canonicalMime: 'image/webp' },
	gif: { mimeTypes: ['image/gif'], canonicalMime: 'image/gif' },
	zip: {
		mimeTypes: ['application/zip', 'application/x-zip-compressed'],
		canonicalMime: 'application/zip'
	}
};

export interface UploadFile {
	buffer: Buffer;
	originalName: string;
	mimeType: string;
	size: number;
}

export interface ValidatedAttachment {
	originalName: string;
	extension: string;
	mimeType: string;
}

export interface AttachmentRecord {
	id: string;
	taskId: string;
	projectId: string;
	uploadedById: string;
	originalName: string;
	storedName: string;
	mimeType: string;
	sizeBytes: number;
}

export function sanitizeFileName(name: string): string {
	const cleaned = basename(name)
		// eslint-disable-next-line no-control-regex -- strip control characters from user filenames
		.replace(/[\u0000-\u001f\u007f]/g, '')
		.replace(/[\\/]/g, '_')
		.trim()
		.slice(0, 255);

	return cleaned || 'attachment';
}

export async function validateAttachment(file: UploadFile): Promise<ValidatedAttachment> {
	const originalName = sanitizeFileName(file.originalName);
	const extension = extname(originalName).slice(1).toLowerCase();
	const allowed = ALLOWED_TYPES[extension];

	if (!allowed) {
		throw new AttachmentError(
			'Unsupported file type. Allowed: PDF, Office documents, text, CSV, images, and ZIP.'
		);
	}

	if (file.size <= 0) {
		throw new AttachmentError('The uploaded file is empty.');
	}

	if (file.size > MAX_ATTACHMENT_BYTES) {
		throw new AttachmentError('Files must be 10 MB or smaller.');
	}

	const detected = await fileTypeFromBuffer(file.buffer);
	const detectedMime = detected?.mime ?? null;

	if (extension === 'txt' || extension === 'csv') {
		if (detectedMime && !allowed.mimeTypes.includes(detectedMime)) {
			throw new AttachmentError('The file contents do not match its extension.');
		}

		return {
			originalName,
			extension,
			mimeType:
				file.mimeType && allowed.mimeTypes.includes(file.mimeType)
					? file.mimeType
					: allowed.canonicalMime
		};
	}

	if (!detectedMime || !allowed.mimeTypes.includes(detectedMime)) {
		throw new AttachmentError('The file contents do not match its extension.');
	}

	return {
		originalName,
		extension,
		mimeType: allowed.canonicalMime
	};
}

export async function storeAttachment(
	db: Database.Database,
	uploadDir: string,
	taskId: string,
	file: UploadFile,
	uploader: PublicUser
): Promise<string> {
	const validated = await validateAttachment(file);
	const directory = join(uploadDir, taskId);
	const storedName = `${randomUUID()}.${validated.extension}`;

	await mkdir(directory, { recursive: true });
	await writeFile(join(directory, storedName), file.buffer);

	const id = randomUUID();
	const now = new Date().toISOString();

	db.transaction(() => {
		db.prepare(
			`INSERT INTO task_attachments
			 (id, task_id, uploaded_by, original_name, stored_name, mime_type, size_bytes, created_at)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
		).run(
			id,
			taskId,
			uploader.id,
			validated.originalName,
			storedName,
			validated.mimeType,
			file.size,
			now
		);

		logActivity(db, {
			entityType: 'task',
			entityId: taskId,
			actorId: uploader.id,
			action: 'task.attachment_added',
			newValue: validated.originalName,
			metadata: { attachmentId: id }
		});
	})();

	return id;
}

export function listTaskAttachments(db: Database.Database, taskId: string): AttachmentItem[] {
	const rows = db
		.prepare(
			`SELECT a.id, a.task_id, a.uploaded_by, u.name AS uploaded_by_name,
			        a.original_name, a.mime_type, a.size_bytes, a.created_at
			 FROM task_attachments a
			 JOIN users u ON u.id = a.uploaded_by
			 WHERE a.task_id = ? AND a.deleted_at IS NULL
			 ORDER BY a.created_at ASC`
		)
		.all(taskId) as Array<{
		id: string;
		task_id: string;
		uploaded_by: string;
		uploaded_by_name: string;
		original_name: string;
		mime_type: string;
		size_bytes: number;
		created_at: string;
	}>;

	return rows.map((row) => ({
		id: row.id,
		taskId: row.task_id,
		fileName: row.original_name,
		mimeType: row.mime_type,
		sizeBytes: row.size_bytes,
		uploadedById: row.uploaded_by,
		uploadedByName: row.uploaded_by_name,
		createdAt: row.created_at
	}));
}

export function getAttachmentRecord(
	db: Database.Database,
	attachmentId: string
): AttachmentRecord | null {
	const row = db
		.prepare(
			`SELECT a.id, a.task_id, t.project_id, a.uploaded_by, a.original_name,
			        a.stored_name, a.mime_type, a.size_bytes
			 FROM task_attachments a
			 JOIN tasks t ON t.id = a.task_id
			 WHERE a.id = ? AND a.deleted_at IS NULL AND t.deleted_at IS NULL`
		)
		.get(attachmentId) as
		| {
				id: string;
				task_id: string;
				project_id: string;
				uploaded_by: string;
				original_name: string;
				stored_name: string;
				mime_type: string;
				size_bytes: number;
		  }
		| undefined;

	if (!row) return null;

	return {
		id: row.id,
		taskId: row.task_id,
		projectId: row.project_id,
		uploadedById: row.uploaded_by,
		originalName: row.original_name,
		storedName: row.stored_name,
		mimeType: row.mime_type,
		sizeBytes: row.size_bytes
	};
}

export function deleteAttachment(
	db: Database.Database,
	attachment: AttachmentRecord,
	actor: PublicUser
): void {
	const now = new Date().toISOString();

	db.transaction(() => {
		db.prepare('UPDATE task_attachments SET deleted_at = ? WHERE id = ?').run(now, attachment.id);

		logActivity(db, {
			entityType: 'task',
			entityId: attachment.taskId,
			actorId: actor.id,
			action: 'task.attachment_removed',
			oldValue: attachment.originalName,
			metadata: { attachmentId: attachment.id }
		});
	})();
}

export function resolveAttachmentPath(
	uploadDir: string,
	taskId: string,
	storedName: string
): string {
	const root = resolve(uploadDir);
	const taskDir = resolve(root, taskId);
	const filePath = resolve(taskDir, storedName);

	if (!filePath.startsWith(`${taskDir}${sep}`)) {
		throw new AttachmentError('Invalid attachment path.');
	}

	return filePath;
}

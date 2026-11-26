import { error } from '@sveltejs/kit';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Readable } from 'node:stream';
import { UPLOAD_DIR } from '$app/env/private';
import { translate } from '#lib/i18n/index.ts';
import { requireUser } from '#lib/server/auth/guards.ts';
import { getDb } from '#lib/server/db/index.ts';
import { requireProjectAccess } from '#lib/server/permissions.ts';
import { getAttachmentRecord, resolveAttachmentPath } from '#lib/server/services/attachments.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async (event) => {
	const user = requireUser(event);
	const db = getDb();
	const attachment = getAttachmentRecord(db, event.params.id);

	if (!attachment) {
		error(404, translate(event.locals.locale, 'errors.attachmentNotFound'));
	}

	requireProjectAccess(db, attachment.projectId, user);

	let filePath: string;

	try {
		filePath = resolveAttachmentPath(
			resolve(process.cwd(), UPLOAD_DIR),
			attachment.taskId,
			attachment.storedName
		);
	} catch {
		error(404, translate(event.locals.locale, 'errors.attachmentMissing'));
	}

	let fileStat;

	try {
		fileStat = await stat(filePath);
	} catch {
		error(404, translate(event.locals.locale, 'errors.attachmentMissing'));
	}

	if (!fileStat.isFile()) {
		error(404, translate(event.locals.locale, 'errors.attachmentMissing'));
	}

	const asciiName = attachment.originalName.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_');
	const encodedName = encodeURIComponent(attachment.originalName);
	const stream = Readable.toWeb(createReadStream(filePath)) as ReadableStream;

	return new Response(stream, {
		headers: {
			'Content-Type': attachment.mimeType,
			'Content-Length': String(fileStat.size),
			'Content-Disposition': `attachment; filename="${asciiName}"; filename*=UTF-8''${encodedName}`,
			'Cache-Control': 'private, no-store',
			'X-Content-Type-Options': 'nosniff'
		}
	});
};

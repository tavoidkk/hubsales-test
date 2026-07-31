const { getStore } = require('@netlify/blobs');

const DEFAULT_ADMIN_KEY = 'Athena2026*';

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

function isAdmin(req) {
  const configured = process.env.ADMIN_KEY || DEFAULT_ADMIN_KEY;
  return req.headers.get('x-admin-key') === configured;
}

function sanitizeCedula(cedula) {
  return String(cedula || '').trim().replace(/[^a-zA-Z0-9]/g, '');
}

function parseBody(req) {
  return req.json().catch(function () { return null; });
}

export default async function handler(req, context) {
  const store = getStore('attempts', { context });
  const url = new URL(req.url);
  const method = req.method;

  /* ---------- POST /api/attempts : save result ---------- */
  if (method === 'POST') {
    const body = await parseBody(req);
    if (!body || !body.cedula) {
      return json({ error: 'Datos invalidos' }, 400);
    }

    const key = 'attempt:' + Date.now() + ':' + sanitizeCedula(body.cedula);
    const record = {
      id: key,
      cedula: String(body.cedula || '').trim(),
      nombre: String(body.nombre || '').trim(),
      apellido: String(body.apellido || '').trim(),
      telefono: String(body.telefono || '').trim(),
      wpm: Number(body.wpm) || 0,
      precision: Number(body.precision) || 0,
      errores: Number(body.errores) || 0,
      fecha: body.fecha || new Date().toISOString(),
      alertaAntiIA: String(body.estado_anti_ia || body.alertaAntiIA || 'Pasa'),
    };

    await store.set(key, JSON.stringify(record));
    return json({ ok: true, id: key });
  }

  /* ---------- GET /api/attempts?cedula=X : check existence ---------- */
  if (method === 'GET' && url.searchParams.has('cedula')) {
    const cedula = sanitizeCedula(url.searchParams.get('cedula'));
    const { blobs } = await store.list();
    let exists = false;
    for (const blob of blobs) {
      const raw = await store.get(blob.key, { type: 'text' });
      try {
        const record = JSON.parse(raw);
        if (sanitizeCedula(record.cedula) === cedula) {
          exists = true;
          break;
        }
      } catch (_) { /* ignore corrupted blob */ }
    }
    return json({ exists });
  }

  /* ---------- Admin: GET list / DELETE ---------- */
  if (!isAdmin(req)) {
    return json({ error: 'No autorizado' }, 401);
  }

  if (method === 'GET') {
    const { blobs } = await store.list();
    const records = [];
    for (const blob of blobs) {
      const raw = await store.get(blob.key, { type: 'text' });
      try {
        records.push(JSON.parse(raw));
      } catch (_) { /* skip corrupted */ }
    }
    records.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    return json({ data: records });
  }

  if (method === 'DELETE') {
    const cedula = url.searchParams.has('cedula')
      ? sanitizeCedula(url.searchParams.get('cedula'))
      : null;

    const { blobs } = await store.list();
    let deleted = 0;

    for (const blob of blobs) {
      let shouldDelete = false;
      if (cedula) {
        const raw = await store.get(blob.key, { type: 'text' });
        try {
          shouldDelete = sanitizeCedula(JSON.parse(raw).cedula) === cedula;
        } catch (_) { /* skip */ }
      } else {
        shouldDelete = true;
      }

      if (shouldDelete) {
        await store.delete(blob.key);
        deleted++;
      }
    }

    return json({ ok: true, deleted });
  }

  return json({ error: 'Metodo no permitido' }, 405);
}

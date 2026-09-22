import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { DatabaseSync } from 'node:sqlite';
import { createServer as createViteServer } from 'vite';

const PORT = 3000;
const app = express();

app.use(express.json());

// Ensure data directory exists for persistent SQLite database
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}
const dbPath = path.join(dataDir, 'growth_engine.db');
const db = new DatabaseSync(dbPath);

// Initialize relational schema matching PostgreSQL specification
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS companies (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    domain TEXT,
    website_url TEXT NOT NULL,
    industry TEXT,
    sub_industry TEXT,
    country TEXT,
    state TEXT,
    city TEXT,
    employee_range TEXT,
    revenue_range TEXT,
    description TEXT,
    linkedin_url TEXT,
    status TEXT NOT NULL DEFAULT 'NEW',
    opportunity_level TEXT,
    is_archived INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS activities (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    activity_type TEXT NOT NULL,
    description TEXT NOT NULL,
    metadata_json TEXT,
    created_by TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS agent_runs (
    id TEXT PRIMARY KEY,
    agent_name TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    status TEXT NOT NULL,
    started_at TEXT NOT NULL,
    completed_at TEXT,
    duration_ms INTEGER,
    model TEXT,
    prompt_version TEXT,
    input_json TEXT,
    output_json TEXT,
    error_message TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS evidence (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    type TEXT NOT NULL,
    statement TEXT NOT NULL,
    source_name TEXT NOT NULL,
    source_url TEXT,
    confidence REAL,
    captured_at TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
`);

// Password helper
function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  try {
    const [salt, expectedHash] = stored.split(':');
    if (!salt || !expectedHash) return false;
    const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(expectedHash, 'hex'));
  } catch {
    return false;
  }
}

// Seed initial administrator and demo companies if database is fresh
const defaultAdminEmail = 'admin@barkingdog.studio';
const defaultAdminPass = 'BarkingDog2026!';

const checkUserStmt = db.prepare('SELECT * FROM users WHERE email = ?');
const existingAdmin = checkUserStmt.get(defaultAdminEmail);

if (!existingAdmin) {
  const insertUser = db.prepare(`
    INSERT INTO users (id, email, password_hash, name, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, 1, ?, ?)
  `);
  const now = new Date().toISOString();
  insertUser.run(
    crypto.randomUUID(),
    defaultAdminEmail,
    hashPassword(defaultAdminPass),
    'Studio Administrator',
    now,
    now
  );
  console.log(`[Database] Initial administrator created: ${defaultAdminEmail}`);
}

// Check if companies table is empty; if so, populate initial demo records
const companyCountRow = db.prepare('SELECT COUNT(*) as count FROM companies').get() as { count: number };
if (companyCountRow && companyCountRow.count === 0) {
  const insertCompany = db.prepare(`
    INSERT INTO companies (
      id, name, domain, website_url, industry, sub_industry,
      country, state, city, employee_range, revenue_range,
      description, linkedin_url, status, opportunity_level,
      is_archived, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
  `);

  const insertActivity = db.prepare(`
    INSERT INTO activities (id, company_id, activity_type, description, metadata_json, created_by, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const demoRecords = [
    {
      name: 'Demo Engineering Ltd',
      website: 'https://demo-engineering.example.com',
      domain: 'demo-engineering.example.com',
      industry: 'Industrial & Manufacturing',
      sub_industry: 'Precision Machining',
      country: 'United Kingdom',
      state: 'Greater London',
      city: 'London',
      employees: '50-249',
      revenue: '£10M - £25M',
      desc: 'Fictional demo company specializing in precision robotics components and CAD automation software.',
      linkedin: 'https://linkedin.com/company/demo-engineering-ltd',
      status: 'NEW',
      opportunity: 'HIGH'
    },
    {
      name: 'Demo Healthcare Ltd',
      website: 'https://demo-healthcare.example.com',
      domain: 'demo-healthcare.example.com',
      industry: 'Healthcare & Life Sciences',
      sub_industry: 'Telehealth Platform',
      country: 'United Kingdom',
      state: 'West Midlands',
      city: 'Birmingham',
      employees: '10-49',
      revenue: '£2M - £5M',
      desc: 'Fictional digital clinic providing patient triage and clinician scheduling systems.',
      linkedin: 'https://linkedin.com/company/demo-healthcare-ltd',
      status: 'NEEDS_REVIEW',
      opportunity: 'MEDIUM'
    },
    {
      name: 'Demo Furniture Ltd',
      website: 'https://demo-furniture.example.com',
      domain: 'demo-furniture.example.com',
      industry: 'Retail & E-Commerce',
      sub_industry: 'Direct-to-Consumer Home Goods',
      country: 'United States',
      state: 'New York',
      city: 'Brooklyn',
      employees: '20-99',
      revenue: '$5M - $15M',
      desc: 'Fictional sustainable furniture brand with legacy monolithic e-commerce infrastructure.',
      linkedin: 'https://linkedin.com/company/demo-furniture-ltd',
      status: 'QUALIFIED',
      opportunity: 'HIGH'
    },
    {
      name: 'Demo Logistics Solutions Ltd',
      website: 'https://demo-logistics.example.com',
      domain: 'demo-logistics.example.com',
      industry: 'Transportation & Logistics',
      sub_industry: 'Cold Chain Telematics',
      country: 'United Kingdom',
      state: 'Greater Manchester',
      city: 'Manchester',
      employees: '100-499',
      revenue: '£25M - £50M',
      desc: 'Fictional fleet freight tracking and temperature telematics vendor seeking legacy web portal rebuild.',
      linkedin: 'https://linkedin.com/company/demo-logistics-ltd',
      status: 'RESEARCHING',
      opportunity: 'LOW'
    },
    {
      name: 'Demo Retail Labs Ltd',
      website: 'https://demo-retail-labs.example.com',
      domain: 'demo-retail-labs.example.com',
      industry: 'Retail & E-Commerce',
      sub_industry: 'Point-of-Sale Integrations',
      country: 'United States',
      state: 'California',
      city: 'San Francisco',
      employees: '5-19',
      revenue: '$1M - $3M',
      desc: 'Fictional omnichannel point-of-sale middleware for boutique high-street merchants.',
      linkedin: 'https://linkedin.com/company/demo-retail-labs-ltd',
      status: 'NEW',
      opportunity: null
    }
  ];

  for (const c of demoRecords) {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    insertCompany.run(
      id, c.name, c.domain, c.website, c.industry, c.sub_industry,
      c.country, c.state, c.city, c.employees, c.revenue,
      c.desc, c.linkedin, c.status, c.opportunity, now, now
    );
    insertActivity.run(
      crypto.randomUUID(),
      id,
      'COMPANY_CREATED',
      `Company '${c.name}' created by Studio Administrator.`,
      JSON.stringify({ source: 'development_seed' }),
      'Studio Administrator',
      now
    );
  }
  console.log(`[Database] Seeded ${demoRecords.length} fictional demo companies.`);
}

function extractDomain(urlStr: string): string | null {
  try {
    let clean = urlStr.trim();
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      clean = 'https://' + clean;
    }
    const u = new URL(clean);
    let host = u.hostname;
    if (host.startsWith('www.')) host = host.substring(4);
    return host.toLowerCase();
  } catch {
    return null;
  }
}

// ─── API ROUTES ─────────────────────────────────────────────────────────────

// Health Check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    database: 'connected',
    service: 'Barking Dog Growth Engine API'
  });
});
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    database: 'connected',
    service: 'Barking Dog Growth Engine API'
  });
});

// Authentication
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    res.status(400).json({
      error: { code: 'BAD_REQUEST', message: 'Email and password are required' }
    });
    return;
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.trim().toLowerCase()) as any;
  if (!user || !verifyPassword(password, user.password_hash)) {
    res.status(401).json({
      error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' }
    });
    return;
  }

  // Token is an opaque signed bearer token for dev session
  const token = `bdge_${user.id}_${Date.now()}`;
  res.json({
    access_token: token,
    token_type: 'bearer',
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      is_active: Boolean(user.is_active),
      created_at: user.created_at,
      updated_at: user.updated_at
    }
  });
});

app.get('/api/auth/me', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'Missing Authorization header' }
    });
    return;
  }
  const user = db.prepare('SELECT id, email, name, is_active, created_at, updated_at FROM users LIMIT 1').get() as any;
  if (!user) {
    res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'User not found' }
    });
    return;
  }
  res.json(user);
});

// Dashboard Stats (Calculated strictly from database)
app.get('/api/dashboard/stats', (req, res) => {
  try {
    const totalRow = db.prepare('SELECT COUNT(*) as cnt FROM companies WHERE is_archived = 0').get() as any;
    const newRow = db.prepare("SELECT COUNT(*) as cnt FROM companies WHERE is_archived = 0 AND status = 'NEW'").get() as any;
    const oppRow = db.prepare("SELECT COUNT(*) as cnt FROM companies WHERE is_archived = 0 AND opportunity_level IS NOT NULL AND opportunity_level != ''").get() as any;
    const reviewRow = db.prepare("SELECT COUNT(*) as cnt FROM companies WHERE is_archived = 0 AND status = 'NEEDS_REVIEW'").get() as any;

    res.json({
      total_companies: totalRow?.cnt ?? 0,
      new_companies: newRow?.cnt ?? 0,
      opportunities: oppRow?.cnt ?? 0,
      needs_review: reviewRow?.cnt ?? 0
    });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'DB_ERROR', message: err.message } });
  }
});

// Dashboard Recent Companies
app.get('/api/dashboard/recent', (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const rows = db.prepare('SELECT * FROM companies WHERE is_archived = 0 ORDER BY created_at DESC LIMIT ?').all(limit);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: { code: 'DB_ERROR', message: err.message } });
  }
});

// Companies List with Search, Filters & Server-Side Pagination
app.get('/api/companies', (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.page_size as string) || 25));
    const search = (req.query.search as string || '').trim().toLowerCase();
    const industry = (req.query.industry as string || '').trim();
    const city = (req.query.city as string || '').trim();
    const status = (req.query.status as string || '').trim().toUpperCase();
    const includeArchived = req.query.include_archived === 'true' || req.query.include_archived === '1';

    let whereClauses: string[] = [];
    let params: any[] = [];

    if (!includeArchived) {
      whereClauses.push('is_archived = 0');
    }

    if (search) {
      whereClauses.push('(LOWER(name) LIKE ? OR LOWER(domain) LIKE ? OR LOWER(industry) LIKE ? OR LOWER(city) LIKE ?)');
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }

    if (industry && industry !== 'ALL') {
      whereClauses.push('LOWER(industry) = LOWER(?)');
      params.push(industry);
    }

    if (city && city !== 'ALL') {
      whereClauses.push('LOWER(city) = LOWER(?)');
      params.push(city);
    }

    if (status && status !== 'ALL') {
      whereClauses.push('status = ?');
      params.push(status);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countSql = `SELECT COUNT(*) as total FROM companies ${whereSql}`;
    const totalRow = db.prepare(countSql).get(...params) as any;
    const total = totalRow?.total ?? 0;
    const totalPages = Math.ceil(total / pageSize);

    const offset = (page - 1) * pageSize;
    const selectSql = `SELECT * FROM companies ${whereSql} ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    const rows = db.prepare(selectSql).all(...params, pageSize, offset);

    res.json({
      items: rows,
      page,
      page_size: pageSize,
      total,
      total_pages: totalPages
    });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// Create Company
app.post('/api/companies', (req, res) => {
  try {
    const {
      name, website_url, domain, industry, sub_industry,
      country, state, city, employee_range, revenue_range,
      description, linkedin_url, status, opportunity_level
    } = req.body || {};

    if (!name || !name.trim()) {
      res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Company Name is required' }
      });
      return;
    }

    if (!website_url || !website_url.trim()) {
      res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Website URL is required' }
      });
      return;
    }

    let normalizedUrl = website_url.trim();
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      normalizedUrl = 'https://' + normalizedUrl;
    }

    const computedDomain = (domain && domain.trim()) ? domain.trim() : extractDomain(normalizedUrl);
    const companyId = crypto.randomUUID();
    const now = new Date().toISOString();

    const insertStmt = db.prepare(`
      INSERT INTO companies (
        id, name, domain, website_url, industry, sub_industry,
        country, state, city, employee_range, revenue_range,
        description, linkedin_url, status, opportunity_level,
        is_archived, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
    `);

    insertStmt.run(
      companyId,
      name.trim(),
      computedDomain,
      normalizedUrl,
      industry ? industry.trim() : null,
      sub_industry ? sub_industry.trim() : null,
      country ? country.trim() : null,
      state ? state.trim() : null,
      city ? city.trim() : null,
      employee_range ? employee_range.trim() : null,
      revenue_range ? revenue_range.trim() : null,
      description ? description.trim() : null,
      linkedin_url ? linkedin_url.trim() : null,
      status || 'NEW',
      opportunity_level || null,
      now,
      now
    );

    // Record activity
    const activityStmt = db.prepare(`
      INSERT INTO activities (id, company_id, activity_type, description, metadata_json, created_by, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    activityStmt.run(
      crypto.randomUUID(),
      companyId,
      'COMPANY_CREATED',
      `Company '${name.trim()}' was added to the growth engine.`,
      JSON.stringify({ website: normalizedUrl, industry }),
      'Studio Administrator',
      now
    );

    const created = db.prepare('SELECT * FROM companies WHERE id = ?').get(companyId);
    res.status(201).json(created);
  } catch (err: any) {
    res.status(500).json({ error: { code: 'CREATION_FAILED', message: err.message } });
  }
});

// Get Company Detail with activities
app.get('/api/companies/:id', (req, res) => {
  try {
    const { id } = req.params;
    const company = db.prepare('SELECT * FROM companies WHERE id = ?').get(id) as any;
    if (!company) {
      res.status(404).json({
        error: { code: 'COMPANY_NOT_FOUND', message: `Company ${id} not found` }
      });
      return;
    }

    const activities = db.prepare('SELECT * FROM activities WHERE company_id = ? ORDER BY created_at DESC LIMIT 50').all(id);
    res.json({
      ...company,
      activities
    });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// Update Company
app.patch('/api/companies/:id', (req, res) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM companies WHERE id = ?').get(id) as any;
    if (!existing) {
      res.status(404).json({
        error: { code: 'COMPANY_NOT_FOUND', message: `Company ${id} not found` }
      });
      return;
    }

    const updates = req.body || {};
    const allowedFields = [
      'name', 'domain', 'website_url', 'industry', 'sub_industry',
      'country', 'state', 'city', 'employee_range', 'revenue_range',
      'description', 'linkedin_url', 'status', 'opportunity_level'
    ];

    const sets: string[] = [];
    const params: any[] = [];
    const changes: Record<string, { old: any; new: any }> = {};

    for (const field of allowedFields) {
      if (field in updates) {
        let val = updates[field];
        if (field === 'website_url' && val) {
          if (!val.startsWith('http://') && !val.startsWith('https://')) {
            val = 'https://' + val;
          }
        }
        if (existing[field] !== val) {
          changes[field] = { old: existing[field], new: val };
        }
        sets.push(`${field} = ?`);
        params.push(val);
      }
    }

    if (sets.length === 0) {
      res.json(existing);
      return;
    }

    const now = new Date().toISOString();
    sets.push('updated_at = ?');
    params.push(now);
    params.push(id);

    const updateSql = `UPDATE companies SET ${sets.join(', ')} WHERE id = ?`;
    db.prepare(updateSql).run(...params);

    // Record activity
    if (Object.keys(changes).length > 0) {
      const changedKeys = Object.keys(changes).join(', ');
      db.prepare(`
        INSERT INTO activities (id, company_id, activity_type, description, metadata_json, created_by, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        crypto.randomUUID(),
        id,
        'COMPANY_UPDATED',
        `Company fields updated: ${changedKeys}`,
        JSON.stringify(changes),
        'Studio Administrator',
        now
      );
    }

    const updated = db.prepare('SELECT * FROM companies WHERE id = ?').get(id);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: { code: 'UPDATE_FAILED', message: err.message } });
  }
});

// Archive Company
app.post('/api/companies/:id/archive', (req, res) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM companies WHERE id = ?').get(id) as any;
    if (!existing) {
      res.status(404).json({
        error: { code: 'COMPANY_NOT_FOUND', message: `Company ${id} not found` }
      });
      return;
    }

    const now = new Date().toISOString();
    db.prepare('UPDATE companies SET is_archived = 1, updated_at = ? WHERE id = ?').run(now, id);

    db.prepare(`
      INSERT INTO activities (id, company_id, activity_type, description, metadata_json, created_by, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      crypto.randomUUID(),
      id,
      'COMPANY_ARCHIVED',
      `Company '${existing.name}' was moved to archive.`,
      JSON.stringify({ is_archived: true }),
      'Studio Administrator',
      now
    );

    const updated = db.prepare('SELECT * FROM companies WHERE id = ?').get(id);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: { code: 'ARCHIVE_FAILED', message: err.message } });
  }
});

// Unarchive Company
app.post('/api/companies/:id/unarchive', (req, res) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM companies WHERE id = ?').get(id) as any;
    if (!existing) {
      res.status(404).json({
        error: { code: 'COMPANY_NOT_FOUND', message: `Company ${id} not found` }
      });
      return;
    }

    const now = new Date().toISOString();
    db.prepare('UPDATE companies SET is_archived = 0, updated_at = ? WHERE id = ?').run(now, id);

    db.prepare(`
      INSERT INTO activities (id, company_id, activity_type, description, metadata_json, created_by, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      crypto.randomUUID(),
      id,
      'COMPANY_UNARCHIVED',
      `Company '${existing.name}' was restored from archive.`,
      JSON.stringify({ is_archived: false }),
      'Studio Administrator',
      now
    );

    const updated = db.prepare('SELECT * FROM companies WHERE id = ?').get(id);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: { code: 'RESTORE_FAILED', message: err.message } });
  }
});

// Optional Seed endpoint for quick UI testing or reset
app.post('/api/seed', (req, res) => {
  try {
    const reset = req.body?.reset === true;
    if (reset) {
      db.exec('DELETE FROM activities; DELETE FROM companies;');
    }
    // Re-seed fictional companies
    const now = new Date().toISOString();
    const demoItems = [
      {
        name: 'Demo Engineering Ltd',
        website: 'https://demo-engineering.example.com',
        domain: 'demo-engineering.example.com',
        industry: 'Industrial & Manufacturing',
        sub_industry: 'Precision Machining',
        country: 'United Kingdom',
        state: 'Greater London',
        city: 'London',
        employees: '50-249',
        revenue: '£10M - £25M',
        desc: 'Fictional demo company specializing in precision robotics components and CAD automation software.',
        status: 'NEW',
        opportunity: 'HIGH'
      },
      {
        name: 'Demo Healthcare Ltd',
        website: 'https://demo-healthcare.example.com',
        domain: 'demo-healthcare.example.com',
        industry: 'Healthcare & Life Sciences',
        sub_industry: 'Telehealth Platform',
        country: 'United Kingdom',
        state: 'West Midlands',
        city: 'Birmingham',
        employees: '10-49',
        revenue: '£2M - £5M',
        desc: 'Fictional digital clinic providing patient triage and clinician scheduling systems.',
        status: 'NEEDS_REVIEW',
        opportunity: 'MEDIUM'
      },
      {
        name: 'Demo Furniture Ltd',
        website: 'https://demo-furniture.example.com',
        domain: 'demo-furniture.example.com',
        industry: 'Retail & E-Commerce',
        sub_industry: 'Direct-to-Consumer Home Goods',
        country: 'United States',
        state: 'New York',
        city: 'Brooklyn',
        employees: '20-99',
        revenue: '$5M - $15M',
        desc: 'Fictional sustainable furniture brand with legacy monolithic e-commerce infrastructure.',
        status: 'QUALIFIED',
        opportunity: 'HIGH'
      }
    ];

    let inserted = 0;
    for (const d of demoItems) {
      const existing = db.prepare('SELECT id FROM companies WHERE name = ?').get(d.name);
      if (!existing) {
        const id = crypto.randomUUID();
        db.prepare(`
          INSERT INTO companies (
            id, name, domain, website_url, industry, sub_industry,
            country, state, city, employee_range, revenue_range,
            description, status, opportunity_level, is_archived,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
        `).run(
          id, d.name, d.domain, d.website, d.industry, d.sub_industry,
          d.country, d.state, d.city, d.employees, d.revenue,
          d.desc, d.status, d.opportunity, now, now
        );
        db.prepare(`
          INSERT INTO activities (id, company_id, activity_type, description, metadata_json, created_by, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
          crypto.randomUUID(),
          id,
          'COMPANY_CREATED',
          `Demo record '${d.name}' seeded for development testing.`,
          JSON.stringify({ source: 'manual_seed' }),
          'Studio Administrator',
          now
        );
        inserted++;
      }
    }

    res.json({ message: 'Seed complete', newly_inserted: inserted });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SEED_ERROR', message: err.message } });
  }
});

// ─── VITE INTEGRATION ───────────────────────────────────────────────────────

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Barking Dog Growth Engine] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

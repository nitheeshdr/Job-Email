import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

let cachedRows: any[] | null = null;
let cachedHeaders: string[] = [];

// Dynamic filter choices
let uniqueRoles: string[] = [];
let uniqueSectors: string[] = [];
let uniqueRegions: string[] = [];
let uniqueDistricts: string[] = [];
let uniqueDpiit: string[] = [];

function normalizeDistrict(val: string): string {
  const cleaned = val.trim();
  if (!cleaned || cleaned.toLowerCase() === 'null' || cleaned.toLowerCase() === 'false') return '';

  const lower = cleaned.toLowerCase();
  
  // Combine all Chennai variations
  if (
    lower === 'chennai' ||
    lower === 'chennaii' ||
    lower === 'chennai.' ||
    lower === 'chennai. ' ||
    lower === 'chennai.s' ||
    lower === 'chennai (madras)' ||
    lower.startsWith('chennai')
  ) {
    return 'Chennai';
  }

  // Combine Kanchipuram variations
  if (
    lower === 'kanchipuram' ||
    lower === 'kancheepuram' ||
    lower === 'kancheppuram' ||
    lower === 'kanjipuram' ||
    lower.startsWith('kanchipuram') ||
    lower.startsWith('kanchee')
  ) {
    return 'Kanchipuram';
  }

  // Combine Coimbatore variations
  if (
    lower === 'coimbatore' ||
    lower === 'coimbatore south' ||
    lower.startsWith('coimbatore')
  ) {
    return 'Coimbatore';
  }

  // Combine Tiruppur variations
  if (
    lower === 'tiruppur' ||
    lower === 'tirupur' ||
    lower.startsWith('tirupur')
  ) {
    return 'Tiruppur';
  }

  // Combine Madurai variations
  if (
    lower === 'madurai' ||
    lower === 'madurai north' ||
    lower.startsWith('madurai')
  ) {
    return 'Madurai';
  }

  // Combine Thoothukudi variations
  if (
    lower === 'thoothukudi' ||
    lower === 'thoothukkudi' ||
    lower === 'thoothukudi (tuticorin)' ||
    lower === 'tuticorin' ||
    lower.startsWith('thoothukudi') ||
    lower.startsWith('tuticorin')
  ) {
    return 'Thoothukudi';
  }

  // Combine Tiruchirappalli variations
  if (
    lower === 'trichy' ||
    lower === 'tiruchirappalli' ||
    lower === 'tiruchurapalli' ||
    lower === 'tiruchirapalli' ||
    lower.startsWith('trichy') ||
    lower.startsWith('tiruchirap')
  ) {
    return 'Tiruchirappalli';
  }

  // Combine Salem variations
  if (lower === 'salem' || lower.startsWith('salem')) {
    return 'Salem';
  }

  // Combine Tirunelveli variations
  if (lower === 'tirunelveli' || lower === 'thirunelveli' || lower.startsWith('tirunelveli')) {
    return 'Tirunelveli';
  }

  // Return Title Cased value
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function normalizeRegion(val: string): string {
  const cleaned = val.trim();
  if (!cleaned || cleaned.toLowerCase() === 'null' || cleaned.toLowerCase() === 'false') return '';

  const lower = cleaned.toLowerCase();
  
  if (lower.startsWith('chennai')) {
    return 'Chennai, Tamil Nadu';
  }
  if (lower.startsWith('coimbatore')) {
    return 'Coimbatore, Tamil Nadu';
  }
  if (lower.startsWith('madurai')) {
    return 'Madurai, Tamil Nadu';
  }
  if (lower.startsWith('trichy') || lower.startsWith('tiruchirappalli') || lower.startsWith('tiruchirapalli')) {
    return 'Tiruchirappalli, Tamil Nadu';
  }
  if (lower.startsWith('salem')) {
    return 'Salem, Tamil Nadu';
  }
  if (lower.startsWith('tirunelveli') || lower.startsWith('thirunelveli')) {
    return 'Tirunelveli, Tamil Nadu';
  }
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        cell += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',') {
      if (inQuotes) {
        cell += char;
      } else {
        result.push(cell);
        cell = '';
      }
    } else {
      cell += char;
    }
  }
  result.push(cell);
  return result;
}

function parseCSV(content: string) {
  const lines: string[] = [];
  let currentLine = '';
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const nextChar = content[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentLine += '"';
        i++; // Skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === '\n' || char === '\r') {
      if (inQuotes) {
        currentLine += char;
      } else {
        if (char === '\r' && nextChar === '\n') {
          i++; // Skip \n
        }
        lines.push(currentLine);
        currentLine = '';
      }
    } else {
      currentLine += char;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }

  if (lines.length === 0) return { headers: [], rows: [] };

  // Parse header
  const headers = parseCSVLine(lines[0]);
  const rows: any[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cells = parseCSVLine(lines[i]);
    if (cells.length === 0 || !cells[2]) continue; // Skip empty email rows (index 2 is email)
    
    const rowObj: any = {};
    headers.forEach((header, idx) => {
      rowObj[header] = cells[idx] || '';
    });
    rows.push(rowObj);
  }

  return { headers, rows };
}

function loadExcelData() {
  if (cachedRows) return;

  const csvPath = path.join(process.cwd(), 'public', 'startuptn-startups.csv');
  if (!fs.existsSync(csvPath)) {
    throw new Error('CSV file startuptn-startups.csv not found in public folder.');
  }

  const raw = fs.readFileSync(csvPath, 'utf8');
  const { headers, rows } = parseCSV(raw);
  cachedHeaders = headers;

  const parsed: any[] = [];
  rows.forEach((row, i) => {
    const email = row.email || '';
    const name = row.name || '';
    const role = row.role || 'Founder';

    // Construct customFields
    const customFields: any = {};
    headers.forEach(header => {
      let cellVal = row[header] || '';
      if (cellVal.toLowerCase() === 'false') {
        cellVal = '';
      }
      customFields[header] = cellVal;
    });

    parsed.push({
      _id: `lead-${i + 1}`,
      name,
      email,
      role,
      status: 'pending',
      customFields,
    });
  });

  cachedRows = parsed;

  // Populate dynamic filters from cachedRows and normalize values
  const rolesSet = new Set<string>();
  const sectorsSet = new Set<string>();
  const regionsSet = new Set<string>();
  const districtsSet = new Set<string>();
  const dpiitSet = new Set<string>();

  cachedRows!.forEach((c) => {
    // Normalise fields that evaluate to 'false' string inside customFields
    Object.keys(c.customFields).forEach((key) => {
      if (c.customFields[key] && String(c.customFields[key]).toLowerCase() === 'false') {
        c.customFields[key] = '';
      }
    });

    // Dynamic Fallbacks to prevent 'Unknown' or 'false' names
    if (!c.name || c.name.toLowerCase() === 'unknown' || c.name === '' || c.name.toLowerCase() === 'false') {
      const brandKey = Object.keys(c.customFields).find(k => k.toLowerCase().includes('brand name') || k.toLowerCase().includes('startup name') || k.toLowerCase().includes('startup') || k.toLowerCase().includes('name'));
      if (brandKey && c.customFields[brandKey] && String(c.customFields[brandKey]).toLowerCase() !== 'false') {
        c.name = c.customFields[brandKey];
      } else if (c.email) {
        c.name = c.email.split('@')[0];
      } else {
        c.name = 'Lead Candidate';
      }
    }

    // Heuristics: if name has numbers (e.g. 'svijay01011998') or matches email handle, prefer the Startup Brand Name!
    const hasDigits = /\d/.test(c.name);
    const isEmailPrefix = c.email && c.name.toLowerCase() === c.email.split('@')[0].toLowerCase();
    if (hasDigits || isEmailPrefix) {
      const brandKey = Object.keys(c.customFields).find(k => k.toLowerCase().includes('brand name') || k.toLowerCase().includes('startup name') || k.toLowerCase().includes('startup') || k.toLowerCase().includes('name') || k.toLowerCase().includes('company'));
      if (brandKey && c.customFields[brandKey] && String(c.customFields[brandKey]).toLowerCase() !== 'false' && String(c.customFields[brandKey]).trim() !== '') {
        const brandVal = String(c.customFields[brandKey]).trim();
        if (/\d/.test(brandVal) || brandVal.toLowerCase() === 'false') {
          c.name = '';
        } else {
          c.name = brandVal;
        }
      } else {
        c.name = ''; // Clear so template interpolator defaults to 'Your Company'
      }
    }

    // Dynamic Fallbacks to prevent 'Unknown' or 'false' roles
    if (!c.role || c.role.toLowerCase() === 'unknown' || c.role === 'Frontend Developer' || c.role === '' || c.role.toLowerCase() === 'false') {
      const roleKey = Object.keys(c.customFields).find(k => k.toLowerCase().includes('role') || k.toLowerCase().includes('title') || k.toLowerCase().includes('job'));
      if (roleKey && c.customFields[roleKey] && String(c.customFields[roleKey]).toLowerCase() !== 'false') {
        c.role = c.customFields[roleKey];
      } else {
        c.role = 'Founder';
      }
    }

    const sectorKey = Object.keys(c.customFields).find(k => k.toLowerCase() === 'sector');
    const regionKey = Object.keys(c.customFields).find(k => k.toLowerCase() === 'region' || k.toLowerCase() === 'state');
    const districtKey = Object.keys(c.customFields).find(k => k.toLowerCase() === 'district');
    const dpiitKey = Object.keys(c.customFields).find(k => k.toLowerCase() === 'dpiit certified' || k.toLowerCase() === 'dpiitcertified');

    // Run normalizations
    if (districtKey) {
      c.customFields[districtKey] = normalizeDistrict(c.customFields[districtKey]);
    }
    if (regionKey) {
      c.customFields[regionKey] = normalizeRegion(c.customFields[regionKey]);
    }

    if (sectorKey && c.customFields[sectorKey]) sectorsSet.add(c.customFields[sectorKey]);
    if (regionKey && c.customFields[regionKey]) regionsSet.add(c.customFields[regionKey]);
    if (districtKey && c.customFields[districtKey]) districtsSet.add(c.customFields[districtKey]);
    if (dpiitKey && c.customFields[dpiitKey]) dpiitSet.add(c.customFields[dpiitKey]);
  });

  uniqueRoles = Array.from(rolesSet).sort();
  uniqueSectors = Array.from(sectorsSet).sort();
  uniqueRegions = Array.from(regionsSet).sort();
  uniqueDistricts = Array.from(districtsSet).sort();
  uniqueDpiit = Array.from(dpiitSet).sort();
}

// GET lists paginated leads for spreadsheet view (legacy/fallback)
export async function GET(req: NextRequest) {
  try {
    loadExcelData();

    if (!cachedRows) {
      return NextResponse.json({ error: 'Failed to load Excel data.' }, { status: 500 });
    }

    const { searchParams } = new URL(req.url);
    const page = Number(searchParams.get('page') || '1');
    const limit = Number(searchParams.get('limit') || '50');
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role') || '';
    const sector = searchParams.get('sector') || '';
    const region = searchParams.get('region') || '';
    const district = searchParams.get('district') || '';
    const dpiit = searchParams.get('dpiit') || '';

    let filtered = [...cachedRows];

    if (search) {
      const query = search.toLowerCase();
      filtered = filtered.filter(
        c =>
          c.name.toLowerCase().includes(query) ||
          c.email.toLowerCase().includes(query) ||
          c.role.toLowerCase().includes(query) ||
          Object.values(c.customFields).some(val => String(val).toLowerCase().includes(query))
      );
    }

    if (role) {
      filtered = filtered.filter(c => c.role === role);
    }
    if (sector) {
      filtered = filtered.filter(c => {
        const key = Object.keys(c.customFields).find(k => k.toLowerCase() === 'sector');
        return key && c.customFields[key] === sector;
      });
    }
    if (region) {
      filtered = filtered.filter(c => {
        const key = Object.keys(c.customFields).find(k => k.toLowerCase() === 'region' || k.toLowerCase() === 'state');
        return key && c.customFields[key] === region;
      });
    }
    if (district) {
      filtered = filtered.filter(c => {
        const key = Object.keys(c.customFields).find(k => k.toLowerCase() === 'district');
        return key && c.customFields[key] === district;
      });
    }
    if (dpiit) {
      filtered = filtered.filter(c => {
        const key = Object.keys(c.customFields).find(k => k.toLowerCase() === 'dpiit certified' || k.toLowerCase() === 'dpiitcertified');
        return key && c.customFields[key] === dpiit;
      });
    }

    const total = filtered.length;
    const startIndex = (page - 1) * limit;
    const paginated = filtered.slice(startIndex, startIndex + limit);

    return NextResponse.json({
      leads: paginated,
      total,
      headers: cachedHeaders.filter(h => {
        const lower = h.toLowerCase();
        return !lower.includes('email') && !lower.includes('name') && !lower.includes('role');
      }),
      filters: {
        roles: uniqueRoles,
        sectors: uniqueSectors,
        regions: uniqueRegions,
        districts: uniqueDistricts,
        dpiit: uniqueDpiit,
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

// POST query handler supporting filters by statusMap and search details
export async function POST(req: NextRequest) {
  try {
    loadExcelData();
    if (!cachedRows) {
      return NextResponse.json({ error: 'Failed to load Excel data.' }, { status: 500 });
    }

    const body = await req.json().catch(() => ({}));
    
    // If it's a simple dashboard queue request, return all leads
    if (body.all === true) {
      return NextResponse.json({ leads: cachedRows });
    }

    // Otherwise, handle spreadsheet queries with custom status mapping
    const page = Number(body.page || '1');
    const limit = Number(body.limit || '50');
    const search = body.search || '';
    const role = body.role || '';
    const sector = body.sector || '';
    const region = body.region || '';
    const district = body.district || '';
    const dpiit = body.dpiit || '';
    const statusFilter = body.statusFilter || '';
    const statusMap = body.statusMap || {};

    let filtered = cachedRows.map(lead => {
      const saved = statusMap[lead.email];
      return {
        ...lead,
        status: saved?.status || 'pending',
      };
    });

    if (search) {
      const query = search.toLowerCase();
      filtered = filtered.filter(
        c =>
          c.name.toLowerCase().includes(query) ||
          c.email.toLowerCase().includes(query) ||
          c.role.toLowerCase().includes(query) ||
          Object.values(c.customFields).some(val => String(val).toLowerCase().includes(query))
      );
    }

    if (role) {
      filtered = filtered.filter(c => c.role === role);
    }
    if (sector) {
      filtered = filtered.filter(c => {
        const key = Object.keys(c.customFields).find(k => k.toLowerCase() === 'sector');
        return key && c.customFields[key] === sector;
      });
    }
    if (region) {
      filtered = filtered.filter(c => {
        const key = Object.keys(c.customFields).find(k => k.toLowerCase() === 'region' || k.toLowerCase() === 'state');
        return key && c.customFields[key] === region;
      });
    }
    if (district) {
      filtered = filtered.filter(c => {
        const key = Object.keys(c.customFields).find(k => k.toLowerCase() === 'district');
        return key && c.customFields[key] === district;
      });
    }
    if (dpiit) {
      filtered = filtered.filter(c => {
        const key = Object.keys(c.customFields).find(k => k.toLowerCase() === 'dpiit certified' || k.toLowerCase() === 'dpiitcertified');
        return key && c.customFields[key] === dpiit;
      });
    }
    if (statusFilter) {
      filtered = filtered.filter(c => c.status === statusFilter);
    }

    const total = filtered.length;
    const startIndex = (page - 1) * limit;
    const paginated = filtered.slice(startIndex, startIndex + limit);

    return NextResponse.json({
      leads: paginated,
      total,
      headers: cachedHeaders.filter(h => {
        const lower = h.toLowerCase();
        return !lower.includes('email') && !lower.includes('name') && !lower.includes('role');
      }),
      filters: {
        roles: uniqueRoles,
        sectors: uniqueSectors,
        regions: uniqueRegions,
        districts: uniqueDistricts,
        dpiit: uniqueDpiit,
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to load Excel leads' }, { status: 500 });
  }
}

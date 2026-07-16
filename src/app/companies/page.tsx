'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Database, Trash2, CheckCircle2, AlertCircle, AlertTriangle, HelpCircle, Loader2, Search, CheckSquare, Square, ChevronLeft, ChevronRight } from 'lucide-react';

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<any[]>([]);
  const [totalLeads, setTotalLeads] = useState(0);

  const [page, setPage] = useState(() => typeof window !== 'undefined' ? Number(localStorage.getItem('companies_filter_page') || '1') : 1);
  const [limit] = useState(50);
  
  const [search, setSearch] = useState(() => typeof window !== 'undefined' ? (localStorage.getItem('companies_filter_search') || '') : '');
  const [roleFilter, setRoleFilter] = useState(() => typeof window !== 'undefined' ? (localStorage.getItem('companies_filter_role') || '') : '');
  const [sectorFilter, setSectorFilter] = useState(() => typeof window !== 'undefined' ? (localStorage.getItem('companies_filter_sector') || '') : '');
  const [regionFilter, setRegionFilter] = useState(() => typeof window !== 'undefined' ? (localStorage.getItem('companies_filter_region') || '') : '');
  const [districtFilter, setDistrictFilter] = useState(() => typeof window !== 'undefined' ? (localStorage.getItem('companies_filter_district') || '') : '');
  const [dpiitFilter, setDpiitFilter] = useState(() => typeof window !== 'undefined' ? (localStorage.getItem('companies_filter_dpiit') || '') : '');
  const [statusFilter, setStatusFilter] = useState(() => typeof window !== 'undefined' ? (localStorage.getItem('companies_filter_status') || '') : '');

  const [loading, setLoading] = useState(true);
  const [sheetHeaders, setSheetHeaders] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Dynamic filter choices from server
  const [uniqueRoles, setUniqueRoles] = useState<string[]>([]);
  const [uniqueSectors, setUniqueSectors] = useState<string[]>([]);
  const [uniqueRegions, setUniqueRegions] = useState<string[]>([]);
  const [uniqueDistricts, setUniqueDistricts] = useState<string[]>([]);
  const [uniqueDpiit, setUniqueDpiit] = useState<string[]>([]);

  const isFirstRender = useRef(true);

  // Sync state changes back to localStorage
  useEffect(() => {
    localStorage.setItem('companies_filter_search', search);
  }, [search]);

  useEffect(() => {
    localStorage.setItem('companies_filter_role', roleFilter);
  }, [roleFilter]);

  useEffect(() => {
    localStorage.setItem('companies_filter_sector', sectorFilter);
  }, [sectorFilter]);

  useEffect(() => {
    localStorage.setItem('companies_filter_region', regionFilter);
  }, [regionFilter]);

  useEffect(() => {
    localStorage.setItem('companies_filter_district', districtFilter);
  }, [districtFilter]);

  useEffect(() => {
    localStorage.setItem('companies_filter_dpiit', dpiitFilter);
  }, [dpiitFilter]);

  useEffect(() => {
    localStorage.setItem('companies_filter_status', statusFilter);
  }, [statusFilter]);

  useEffect(() => {
    localStorage.setItem('companies_filter_page', String(page));
  }, [page]);

  // Reset to page 1 when filters change
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setPage(1);
  }, [search, roleFilter, sectorFilter, regionFilter, districtFilter, dpiitFilter, statusFilter]);

  useEffect(() => {
    fetchCompanies();
  }, [page, search, roleFilter, sectorFilter, regionFilter, districtFilter, dpiitFilter, statusFilter]);

  const fetchCompanies = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const statusMap = JSON.parse(localStorage.getItem('jobmail_leads_status') || '{}');

      const res = await fetch('/api/companies/excel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          page,
          limit,
          search,
          role: roleFilter,
          sector: sectorFilter,
          region: regionFilter,
          district: districtFilter,
          dpiit: dpiitFilter,
          statusFilter,
          statusMap
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to load Excel data.');
      }

      const data = await res.json();

      // Auto-heal out of bounds page index
      if (data.total > 0 && (page - 1) * limit >= data.total && page > 1) {
        setPage(1);
        localStorage.setItem('jobmail_page', '1');
        return;
      }

      setTotalLeads(data.total);
      setSheetHeaders(data.headers || []);
      
      // Load dropdown lists
      setUniqueRoles(data.filters?.roles || []);
      setUniqueSectors(data.filters?.sectors || []);
      setUniqueRegions(data.filters?.regions || []);
      setUniqueDistricts(data.filters?.districts || []);
      setUniqueDpiit(data.filters?.dpiit || []);

      // Load client selection diffs (unchecked by default!)
      const selectedSet = new Set(JSON.parse(localStorage.getItem('jobmail_selected_leads') || '[]'));

      const mapped = (data.leads || []).map((lead: any) => {
        return {
          ...lead,
          selected: selectedSet.has(lead.email), // selected true only if manually checked!
          status: lead.status || 'pending',
        };
      });

      setCompanies(mapped);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to fetch spreadsheet data.');
    } finally {
      setLoading(false);
    }
  };

  // Toggle selection for a single lead
  const handleToggleSelect = (email: string) => {
    try {
      const selected = JSON.parse(localStorage.getItem('jobmail_selected_leads') || '[]');
      const selectedSet = new Set(selected);
      
      if (selectedSet.has(email)) {
        selectedSet.delete(email);
      } else {
        selectedSet.add(email);
      }

      localStorage.setItem('jobmail_selected_leads', JSON.stringify(Array.from(selectedSet)));
      
      // Sync local state
      setCompanies(prev =>
        prev.map(c => (c.email === email ? { ...c, selected: !c.selected } : c))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleClearAllFilters = () => {
    setSearch('');
    setRoleFilter('');
    setSectorFilter('');
    setRegionFilter('');
    setDistrictFilter('');
    setDpiitFilter('');
    setStatusFilter('');
    setPage(1);
    
    localStorage.removeItem('jobmail_search');
    localStorage.removeItem('jobmail_role');
    localStorage.removeItem('jobmail_sector');
    localStorage.removeItem('jobmail_region');
    localStorage.removeItem('jobmail_district');
    localStorage.removeItem('jobmail_dpiit');
    localStorage.removeItem('jobmail_status');
    localStorage.setItem('jobmail_page', '1');
  };

  // Toggle selection for all visible rows on current page
  const handleToggleSelectAllFiltered = (checked: boolean) => {
    try {
      const selected = JSON.parse(localStorage.getItem('jobmail_selected_leads') || '[]');
      const selectedSet = new Set(selected);

      companies.forEach((c) => {
        if (checked) {
          selectedSet.add(c.email);
        } else {
          selectedSet.delete(c.email);
        }
      });

      localStorage.setItem('jobmail_selected_leads', JSON.stringify(Array.from(selectedSet)));
      
      // Sync local state
      setCompanies(prev => prev.map(c => ({ ...c, selected: checked })));
    } catch (err) {
      console.error(err);
    }
  };

  const handleClearAllSelections = () => {
    localStorage.removeItem('jobmail_selected_leads');
    fetchCompanies();
  };

  const handleResetAllStatuses = () => {
    if (!confirm('Are you sure you want to reset all sent/failed email statuses?')) return;
    localStorage.removeItem('jobmail_leads_status');
    fetchCompanies();
  };

  const isAllFilteredSelected = companies.length > 0 && companies.every(c => c.selected);

  const getStatusBadge = (status: string, error?: string) => {
    switch (status) {
      case 'verified':
        return (
          <span className="inline-flex items-center gap-1 rounded-[6px] bg-[#ecfdec] border border-[#b9f5bc] px-2 py-0.5 text-xs font-semibold text-[#28a948]">
            <CheckCircle2 className="h-3 w-3" /> Verified MX
          </span>
        );
      case 'sent':
        return (
          <span className="inline-flex items-center gap-1 rounded-[6px] bg-[#f0f7ff] border border-[#cae7ff] px-2 py-0.5 text-xs font-semibold text-[#006bff]">
            <CheckCircle2 className="h-3 w-3" /> Sent
          </span>
        );
      case 'failed':
        return (
          <span
            title={error || 'SMTP failed'}
            className="inline-flex items-center gap-1 rounded-[6px] bg-[#ffeeef] border border-[#ffd7d6] px-2 py-0.5 text-xs font-semibold text-[#fc0035] cursor-help"
          >
            <AlertTriangle className="h-3 w-3" /> Send Error
          </span>
        );
      case 'invalid':
        return (
          <span
            title={error || 'MX check failed'}
            className="inline-flex items-center gap-1 rounded-[6px] bg-[#f2f2f2] border border-[#eaeaea] px-2 py-0.5 text-xs font-semibold text-[#7d7d7d] cursor-help"
          >
            <AlertCircle className="h-3 w-3" /> Invalid MX
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-[6px] bg-[#fff6de] border border-[#ffdc73] px-2 py-0.5 text-xs font-semibold text-[#ffa600]">
            <HelpCircle className="h-3 w-3" /> Pending
          </span>
        );
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalLeads / limit));

  return (
    <div className="space-y-8 pb-12 bg-white text-[#171717]">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#171717]">
            Excel Leads Spreadsheet
          </h1>
          <p className="text-sm text-[#8f8f8f]">
            Viewing leads list parsed directly from `public/startuptn-startups.xlsx` ({totalLeads} total records).
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleClearAllSelections}
            className="flex items-center gap-1.5 rounded-[6px] border border-[#eaeaea] bg-white px-3 py-1.5 text-xs font-semibold text-[#171717] hover:bg-[#fafafa] transition-all shadow-sm"
          >
            Uncheck All Leads
          </button>
          <button
            onClick={handleResetAllStatuses}
            className="flex items-center gap-1.5 rounded-[6px] border border-[#ffd7d6] bg-white px-3 py-1.5 text-xs font-semibold text-[#fc0035] hover:bg-[#ffeeef] transition-all shadow-sm"
          >
            Reset Campaign Statuses
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="rounded-[6px] border border-[#ffd7d6] bg-[#ffeeef] p-4 text-xs text-[#fc0035] flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 text-[#ea001d]" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Leads Viewer Dashboard and Filtering */}
      <div className="rounded-[12px] border border-[#eaeaea] bg-white p-6 shadow-geist-raised space-y-4">
        {/* Categories Grid Filters */}
        <div className="grid gap-3 grid-cols-2 md:grid-cols-4 lg:grid-cols-8">
          {/* General search */}
          <div className="col-span-2 relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-[#8f8f8f]" />
            <input
              type="text"
              placeholder="Search cells..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 rounded-[6px] border border-[#eaeaea] bg-white py-2 pl-9 pr-4 text-xs text-[#171717] placeholder-[#8f8f8f] outline-none focus:border-[#006bff]"
            />
          </div>

          {/* Region dropdown filter */}
          <div className="relative">
            <select
              value={regionFilter}
              onChange={(e) => setRegionFilter(e.target.value)}
              className="w-full h-10 appearance-none rounded-[6px] border border-[#eaeaea] bg-white py-2 px-3 text-xs text-[#171717] outline-none focus:border-[#006bff] cursor-pointer"
            >
              <option value="">All Regions</option>
              {uniqueRegions.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {/* District dropdown filter */}
          <div className="relative">
            <select
              value={districtFilter}
              onChange={(e) => setDistrictFilter(e.target.value)}
              className="w-full h-10 appearance-none rounded-[6px] border border-[#eaeaea] bg-white py-2 px-3 text-xs text-[#171717] outline-none focus:border-[#006bff] cursor-pointer"
            >
              <option value="">All Districts</option>
              {uniqueDistricts.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* Sector dropdown filter */}
          <div className="relative">
            <select
              value={sectorFilter}
              onChange={(e) => setSectorFilter(e.target.value)}
              className="w-full h-10 appearance-none rounded-[6px] border border-[#eaeaea] bg-white py-2 px-3 text-xs text-[#171717] outline-none focus:border-[#006bff] cursor-pointer"
            >
              <option value="">All Sectors</option>
              {uniqueSectors.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Role dropdown filter */}
          <div className="relative">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full h-10 appearance-none rounded-[6px] border border-[#eaeaea] bg-white py-2 px-3 text-xs text-[#171717] outline-none focus:border-[#006bff] cursor-pointer"
            >
              <option value="">All Roles</option>
              {uniqueRoles.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {/* DPIIT Certified dropdown filter */}
          <div className="relative">
            <select
              value={dpiitFilter}
              onChange={(e) => setDpiitFilter(e.target.value)}
              className="w-full h-10 appearance-none rounded-[6px] border border-[#eaeaea] bg-white py-2 px-3 text-xs text-[#171717] outline-none focus:border-[#006bff] cursor-pointer"
            >
              <option value="">All DPIIT Certified</option>
              {uniqueDpiit.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* Campaign Validation Status dropdown filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full h-10 appearance-none rounded-[6px] border border-[#eaeaea] bg-white py-2 px-3 text-xs text-[#171717] outline-none focus:border-[#006bff] cursor-pointer font-semibold"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="verified">Verified MX</option>
              <option value="sent">Sent</option>
              <option value="failed">Send Error</option>
              <option value="invalid">Invalid MX</option>
            </select>
          </div>
        </div>

        {/* Interactive sheet table layout */}
        <div className="overflow-x-auto rounded-[6px] border border-[#eaeaea] bg-white max-h-[550px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-[#8f8f8f]">
              <Loader2 className="h-8 w-8 animate-spin text-[#006bff] mb-2" />
              <p className="text-sm">Fetching and filtering Excel sheets...</p>
            </div>
          ) : companies.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-[#8f8f8f] space-y-4">
              <Database className="h-10 w-10 text-[#c9c9c9]" />
              <div className="text-center space-y-1">
                <p className="text-sm font-semibold text-[#171717]">No matching leads found</p>
                <p className="text-xs text-[#8f8f8f] max-w-sm px-4">Your current filters might be too restrictive, your search query did not yield results, or your page index is out of bounds.</p>
              </div>
              <button
                onClick={handleClearAllFilters}
                className="h-9 px-4 rounded-[6px] bg-[#171717] hover:bg-[#4d4d4d] text-white text-xs font-semibold transition-all active:scale-95"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <table className="w-full border-collapse text-left text-xs text-[#171717] table-auto">
              <thead className="border-b border-[#eaeaea] bg-[#fafafa] font-semibold text-[#8f8f8f] sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-center w-10 bg-[#fafafa]">
                    <button
                      type="button"
                      onClick={() => handleToggleSelectAllFiltered(!isAllFilteredSelected)}
                      className="text-[#006bff] hover:text-[#0059ec]"
                    >
                      {isAllFilteredSelected ? (
                        <CheckSquare className="h-4.5 w-4.5" />
                      ) : (
                        <Square className="h-4.5 w-4.5 text-[#8f8f8f]" />
                      )}
                    </button>
                  </th>
                  <th className="px-4 py-3 bg-[#fafafa]">Status</th>
                  <th className="px-4 py-3 bg-[#fafafa]">Name</th>
                  <th className="px-4 py-3 bg-[#fafafa]">Email Address</th>
                  <th className="px-4 py-3 bg-[#fafafa]">Role</th>

                  {/* Dynamic custom columns */}
                  {sheetHeaders.map((header) => (
                    <th key={header} className="px-4 py-3 bg-[#fafafa] whitespace-nowrap">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eaeaea]">
                {companies.map((company) => (
                  <tr
                    key={company._id}
                    className={`hover:bg-[#fafafa] transition-colors ${
                      !company.selected ? 'opacity-65 bg-gray-50/50' : ''
                    }`}
                  >
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleSelect(company.email)}
                        className="mx-auto block"
                      >
                        {company.selected ? (
                          <CheckSquare className="h-4.5 w-4.5 text-[#006bff]" />
                        ) : (
                          <Square className="h-4.5 w-4.5 text-[#8f8f8f]" />
                        )}
                      </button>
                    </td>
                    
                    <td className="px-4 py-3 whitespace-nowrap">
                      {getStatusBadge(company.status, company.validationError)}
                    </td>
                    <td className="px-4 py-3 font-semibold text-[#171717]">{company.name}</td>
                    <td className="px-4 py-3 font-mono text-[#4d4d4d]">{company.email}</td>
                    <td className="px-4 py-3 text-[#4d4d4d]">{company.role}</td>

                    {/* Render custom fields cells dynamically */}
                    {sheetHeaders.map((header) => {
                      const val = company.customFields?.[header] || '';
                      const isLink = String(val).startsWith('http://') || String(val).startsWith('https://') || String(val).startsWith('www.');
                      return (
                        <td key={header} className="px-4 py-3 text-[#4d4d4d] max-w-xs truncate whitespace-nowrap">
                          {isLink ? (
                            <a
                              href={String(val).startsWith('www.') ? `https://${val}` : val}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[#006bff] hover:underline"
                            >
                              {val}
                            </a>
                          ) : (
                            val
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Dynamic Pagination Controls */}
        {!loading && totalLeads > 0 && (
          <div className="flex items-center justify-between border-t border-[#eaeaea] pt-4 mt-2">
            <p className="text-xs text-[#8f8f8f] font-semibold">
              Showing {Math.min(totalLeads, (page - 1) * limit + 1)} - {Math.min(totalLeads, page * limit)} of {totalLeads} leads
            </p>
            <div className="flex items-center gap-3">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
                className="flex h-9 w-9 items-center justify-center rounded-[6px] border border-[#eaeaea] bg-white text-[#4d4d4d] hover:text-[#171717] disabled:opacity-40 disabled:pointer-events-none transition-all shadow-sm"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-xs font-semibold text-[#171717]">
                Page {page} of {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
                className="flex h-9 w-9 items-center justify-center rounded-[6px] border border-[#eaeaea] bg-white text-[#4d4d4d] hover:text-[#171717] disabled:opacity-40 disabled:pointer-events-none transition-all shadow-sm"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

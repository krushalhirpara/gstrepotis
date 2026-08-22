import React, { useState } from 'react';
import { Button } from './Button';

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T, index: number) => React.ReactNode;
  sortable?: boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  searchable?: boolean;
  searchPlaceholder?: string;
  pagination?: boolean;
  pageSize?: number;
  actions?: (row: T) => React.ReactNode;
  bulkActions?: (selectedRows: T[]) => React.ReactNode;
  emptyTitle?: string;
  emptyMessage?: string;
  technicalHeader?: string;
}

export function DataTable<T extends { id: string | number }>({
  columns,
  data,
  searchable = true,
  searchPlaceholder = 'Search records...',
  pagination = true,
  pageSize: initialPageSize = 25,
  actions,
  bulkActions,
  emptyTitle = 'No records match search',
  emptyMessage = 'Upload statement or filter by different keywords.',
  technicalHeader,
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [selectedIds, setSelectedIds] = useState<(string | number)[]>([]);

  const filteredData = data.filter((row) => {
    if (!searchTerm) return true;
    return Object.values(row as Record<string, any>).some((val) =>
      String(val).toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const totalPages = Math.ceil(filteredData.length / pageSize) || 1;
  const paginatedData = pagination
    ? filteredData.slice((currentPage - 1) * pageSize, currentPage * pageSize)
    : filteredData;

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(paginatedData.map((d) => d.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id: string | number) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const selectedRows = data.filter((row) => selectedIds.includes(row.id));

  return (
    <div className="bg-white border border-[#E5E5E5] rounded-xl overflow-hidden shadow-none">
      {/* Table Toolbar */}
      <div className="p-3.5 border-b border-[#E5E5E5] flex flex-col sm:flex-row items-center justify-between gap-3 bg-white">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {technicalHeader && (
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#555555] border-r border-[#E5E5E5] pr-3 hidden sm:inline">
              {technicalHeader} ({data.length})
            </span>
          )}
          {searchable && (
            <div className="w-full sm:w-72 relative">
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-[#F7F7F7] font-mono text-xs text-[#111111] placeholder-[#888888] rounded-lg border border-[#D4D4D4] px-3 py-2 outline-none focus:border-black transition-all"
              />
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          {pagination && (
            <div className="flex items-center gap-2 font-mono text-xs text-[#555555]">
              <span>ROWS:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-[#F7F7F7] border border-[#D4D4D4] rounded px-2 py-1 outline-none font-mono text-xs text-black font-bold"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={250}>250</option>
              </select>
            </div>
          )}

          {bulkActions && selectedIds.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-[#555555] font-semibold">{selectedIds.length} SELECTED</span>
              {bulkActions(selectedRows)}
            </div>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#F7F7F7] border-b border-[#E5E5E5] font-mono text-[10px] font-bold uppercase tracking-wider text-[#555555]">
              {bulkActions && (
                <th className="p-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={paginatedData.length > 0 && selectedIds.length === paginatedData.length}
                    onChange={handleSelectAll}
                    className="rounded border-neutral-300 text-black focus:ring-black cursor-pointer"
                  />
                </th>
              )}
              {columns.map((col) => (
                <th key={col.key} className="p-3 whitespace-nowrap">
                  {col.header}
                </th>
              ))}
              {actions && <th className="p-3 text-right">ACTIONS</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E5E5] text-xs text-[#111111]">
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (actions ? 1 : 0) + (bulkActions ? 1 : 0)} className="py-12 text-center">
                  <div className="max-w-xs mx-auto">
                    <p className="font-mono text-xs font-bold text-[#111111] uppercase tracking-wider">{emptyTitle}</p>
                    <p className="text-xs text-[#555555] mt-1">{emptyMessage}</p>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedData.map((row, idx) => (
                <tr key={row.id} className="hover:bg-[#FAFAFA] transition-colors">
                  {bulkActions && (
                    <td className="p-3 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(row.id)}
                        onChange={() => handleSelectRow(row.id)}
                        className="rounded border-neutral-300 text-black focus:ring-black cursor-pointer"
                      />
                    </td>
                  )}
                  {columns.map((col) => (
                    <td key={col.key} className="p-3 whitespace-nowrap font-mono text-xs">
                      {col.render ? col.render(row, idx) : (row as any)[col.key]}
                    </td>
                  ))}
                  {actions && <td className="p-3 text-right whitespace-nowrap font-mono">{actions(row)}</td>}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination && filteredData.length > 0 && (
        <div className="p-3 border-t border-[#E5E5E5] bg-[#F7F7F7] flex flex-col sm:flex-row items-center justify-between font-mono text-[11px] text-[#555555] gap-2">
          <span>
            SHOWING {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, filteredData.length)} OF{' '}
            {filteredData.length} RECORDS
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            >
              PREV
            </Button>
            <span className="px-2 font-bold text-[#111111]">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
            >
              NEXT
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

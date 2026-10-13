"use client";

import { useState, useMemo } from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  getFilteredRowModel,
  ColumnFiltersState,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChevronLeft, ChevronRight, Loader2, Search } from "lucide-react";

interface DataTableProps<TData, TValue = unknown> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  isLoading?: boolean;
}

function Pager({
  pageIndex,
  pageCount,
  canPrevious,
  canNext,
  onPrevious,
  onNext,
}: {
  pageIndex: number;
  pageCount: number;
  canPrevious: boolean;
  canNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={onPrevious}
        disabled={!canPrevious}
        className="flex size-10 items-center justify-center rounded-full border-2 border-[#e5e5e5] text-[#1cb0f6] hover:bg-[#ddf4ff] disabled:opacity-40 disabled:hover:bg-transparent"
        aria-label="Página anterior"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <p className="text-[13px] font-extrabold uppercase tracking-wide text-[#afafaf]">
        Página{" "}
        <span className="text-[#3c3c3c]">
          {pageIndex + 1} / {Math.max(pageCount, 1)}
        </span>
      </p>
      <button
        type="button"
        onClick={onNext}
        disabled={!canNext}
        className="flex size-10 items-center justify-center rounded-full border-2 border-[#e5e5e5] text-[#1cb0f6] hover:bg-[#ddf4ff] disabled:opacity-40 disabled:hover:bg-transparent"
        aria-label="Próxima página"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

export function DataTable<TData, TValue = unknown>({
  columns,
  data,
  isLoading = false,
}: DataTableProps<TData, TValue>) {
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");

  const tableConfig = useMemo(
    () => ({
      data,
      columns,
      getCoreRowModel: getCoreRowModel(),
      getPaginationRowModel: getPaginationRowModel(),
      getFilteredRowModel: getFilteredRowModel(),
      onColumnFiltersChange: setColumnFilters,
      onGlobalFilterChange: setGlobalFilter,
      globalFilterFn: "includesString" as const,
      state: {
        columnFilters,
        globalFilter,
      },
      initialState: {
        pagination: {
          pageSize: 40,
        },
      },
    }),
    [data, columns, columnFilters, globalFilter]
  );

  const table = useReactTable(tableConfig);

  const pager = (
    <Pager
      pageIndex={table.getState().pagination.pageIndex}
      pageCount={table.getPageCount()}
      canPrevious={table.getCanPreviousPage()}
      canNext={table.getCanNextPage()}
      onPrevious={() => table.previousPage()}
      onNext={() => table.nextPage()}
    />
  );

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#afafaf]" />
          <input
            placeholder="Buscar palavras..."
            value={globalFilter}
            onChange={(event) => setGlobalFilter(event.target.value)}
            className="h-12 w-full rounded-2xl border-2 border-[#e5e5e5] bg-white pl-11 pr-4 text-sm font-bold text-[#3c3c3c] outline-none placeholder:text-[#afafaf] focus:border-[#1cb0f6]"
          />
        </div>
        {pager}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-[#1cb0f6]" />
            <p className="text-sm font-bold text-[#afafaf]">
              Atualizando tabela...
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border-2 border-[#e5e5e5] overflow-hidden">
          <Table className="min-w-full">
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="hover:bg-transparent">
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow className="hover:bg-transparent">
                  <TableCell
                    colSpan={columns.length}
                    className="h-28 text-center text-sm font-bold text-[#afafaf]"
                  >
                    Nenhum resultado encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="flex items-center justify-end pt-5">{pager}</div>
    </div>
  );
}

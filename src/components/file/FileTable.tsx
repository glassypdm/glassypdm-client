import {
  ColumnDef,
  ColumnFilter,
  ColumnFiltersState,
  RowSelectionState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "../ui/scroll-area";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Input } from "../ui/input";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  selection: RowSelectionState;
  setSelection: any;
  height: string;
  includeFilter: boolean;
  filter: ColumnFilter[];
  setFilter: any;

}

export function FileTable<TData, TValue>({
  columns,
  data,
  selection,
  setSelection,
  height,
  includeFilter,
  filter,
  setFilter
}: DataTableProps<TData, TValue>) {
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    onRowSelectionChange: setSelection,
    onColumnFiltersChange: setFilter,
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      rowSelection: selection,
      columnFilters: filter,
    },
  });

  return (
    <div className="rounded-md border">
      <div className="flex items-center py-4 px-2">
        { includeFilter ? <Input
          placeholder="Filter files..."
          value={(table.getColumn("file")?.getFilterValue() as string) ?? ""}
          onChange={(event) => {
            table.getColumn("file")?.setFilterValue(event.target.value);
          }
          }
          className="max-w-sm"
        /> : <></>}
      </div>
      <ScrollArea className={cn("flex", height)}>
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
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
                    <TableCell key={cell.id} className="p-1">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  Nothing to display.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );
}

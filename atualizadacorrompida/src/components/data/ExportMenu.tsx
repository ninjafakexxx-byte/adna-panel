import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { exportCSV, exportPDF } from "@/lib/export";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ExportMenu<T extends Record<string, any>>({
  rows,
  filename,
  title,
  columns,
}: {
  rows: T[];
  filename: string;
  title: string;
  columns?: { header: string; key: keyof T }[];
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-accent transition">
          <Download className="h-4 w-4" /> Exportar
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => exportCSV(rows, filename)}>
          <FileSpreadsheet className="h-4 w-4 mr-2" /> Exportar CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => exportPDF(rows, filename, title, columns)}>
          <FileText className="h-4 w-4 mr-2" /> Exportar PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

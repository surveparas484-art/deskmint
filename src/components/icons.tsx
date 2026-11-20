import {
  FileText, Files, Scissors, Trash2, RotateCw, FileArchive, FileOutput, ArrowUpDown, ImageDown, Image, ImagePlus,
  Maximize2, ArrowLeftRight, Calculator, Percent, Tag, Ruler, GraduationCap, CalendarClock, CalendarRange,
  ClipboardCheck, BookOpen, Sparkles, Languages, ScrollText, SpellCheck, PenLine, Mail, NotebookPen, Expand, Lightbulb, FileSearch, Hash, Stamp, Crop, Type, CaseSensitive, Eraser, QrCode, ScanLine, Timer, Hourglass,
  type LucideProps,
} from "lucide-react";
import type { IconName } from "@/lib/registry";

const map = {
  FileText, Files, Scissors, Trash2, RotateCw, FileArchive, FileOutput, ArrowUpDown, ImageDown, Image, ImagePlus,
  Maximize2, ArrowLeftRight, Calculator, Percent, Tag, Ruler, GraduationCap, CalendarClock, CalendarRange,
  ClipboardCheck, BookOpen, Sparkles, Languages, ScrollText, SpellCheck, PenLine, Mail, NotebookPen, Expand, Lightbulb, FileSearch, Hash, Stamp, Crop, Type, CaseSensitive, Eraser, QrCode, ScanLine, Timer, Hourglass,
} satisfies Record<IconName, React.ComponentType<LucideProps>>;

export function ToolIcon({ name, ...props }: { name: IconName } & LucideProps) {
  const Cmp = map[name];
  return <Cmp aria-hidden="true" {...props} />;
}

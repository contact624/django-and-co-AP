import JSZip from "jszip";
import jsPDF from "jspdf";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import QRCode from "qrcode";

// ============= TYPES =============

export interface ExportInvoice {
  id: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  subtotal: number;
  taxRate: number;
  taxAmount: number | null;
  total: number | null;
  status: string;
  notes: string | null;
  client: {
    firstName: string;
    lastName: string;
    email: string | null;
    address: string | null;
  };
  company: {
    name: string;
    ownerName: string | null;
    notes: string | null;
    address: string | null;
    email: string | null;
    phone: string | null;
    iban: string | null;
  };
  lines: {
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }[];
}

export interface ExportExpense {
  id: string;
  date: string;
  category: string;
  description: string;
  amount: number;
  receipt_url: string | null;
}

export type ExportPeriod = "month" | "quarter" | "year" | "custom";

// ============= PERIOD HELPERS =============

export function getPeriodDates(period: ExportPeriod, customStart?: Date, customEnd?: Date): { start: Date; end: Date } {
  const now = new Date();
  
  switch (period) {
    case "month":
      return {
        start: new Date(now.getFullYear(), now.getMonth(), 1),
        end: new Date(now.getFullYear(), now.getMonth() + 1, 0),
      };
    case "quarter":
      const quarterStart = Math.floor(now.getMonth() / 3) * 3;
      return {
        start: new Date(now.getFullYear(), quarterStart, 1),
        end: new Date(now.getFullYear(), quarterStart + 3, 0),
      };
    case "year":
      return {
        start: new Date(now.getFullYear(), 0, 1),
        end: new Date(now.getFullYear(), 11, 31),
      };
    case "custom":
      return {
        start: customStart || new Date(now.getFullYear(), 0, 1),
        end: customEnd || now,
      };
    default:
      return {
        start: new Date(now.getFullYear(), now.getMonth(), 1),
        end: new Date(now.getFullYear(), now.getMonth() + 1, 0),
      };
  }
}

export function getPeriodLabel(period: ExportPeriod, start?: Date, end?: Date): string {
  const now = new Date();
  
  switch (period) {
    case "month":
      return format(now, "MMMM yyyy", { locale: fr });
    case "quarter":
      const q = Math.floor(now.getMonth() / 3) + 1;
      return `T${q} ${now.getFullYear()}`;
    case "year":
      return `${now.getFullYear()}`;
    case "custom":
      if (start && end) {
        return `${format(start, "dd/MM/yyyy")} - ${format(end, "dd/MM/yyyy")}`;
      }
      return "Période personnalisée";
    default:
      return "";
  }
}

// ============= PDF GENERATION (Simplified for batch) =============

const COLORS = {
  primary: [138, 90, 59] as [number, number, number],
  text: [33, 33, 33] as [number, number, number],
  muted: [107, 114, 128] as [number, number, number],
  light: [156, 163, 175] as [number, number, number],
  border: [229, 231, 235] as [number, number, number],
  tableHeader: [245, 245, 245] as [number, number, number],
  black: [0, 0, 0] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
};

const SERVICE_LABELS: Record<string, string> = {
  individual_walk: "Balade individuelle",
  group_walk: "Balade groupée",
  custom_walk: "Balade sur mesure",
  education: "Éducation canine",
  dog_sitting: "Dog sitting",
  transport: "Transport",
  other: "Autre prestation",
};

function parseAddress(address: string | null): string[] {
  if (!address) return [];
  return address.split(/[\n]/).map(l => l.trim()).filter(l => l);
}

function formatIban(iban: string | null): string {
  if (!iban) return "";
  return iban.replace(/\s/g, "").replace(/(.{4})/g, "$1 ").trim();
}

function formatDatePdf(dateStr: string): string {
  try {
    return format(new Date(dateStr), "dd MMMM yyyy", { locale: fr });
  } catch {
    return dateStr;
  }
}

function formatDateShort(dateStr: string): string {
  try {
    return format(new Date(dateStr), "dd.MM.yyyy");
  } catch {
    return dateStr;
  }
}

function getServiceLabel(description: string): { label: string; date: string | null } {
  const parts = description.split(" - ");
  const serviceType = parts[0];
  const dateStr = parts[1] || null;
  const label = SERVICE_LABELS[serviceType] || serviceType;
  return { label, date: dateStr };
}

interface AggregatedLine {
  label: string;
  quantity: number;
  unitPrice: number;
  total: number;
  dates: string[];
}

function aggregateLines(lines: ExportInvoice["lines"]): AggregatedLine[] {
  const groups = new Map<string, AggregatedLine>();
  
  for (const line of lines) {
    const { label, date } = getServiceLabel(line.description);
    const key = `${label}|${line.unitPrice}`;
    
    if (groups.has(key)) {
      const existing = groups.get(key)!;
      existing.quantity += line.quantity;
      existing.total += line.total;
      if (date) existing.dates.push(date);
    } else {
      groups.set(key, {
        label,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        total: line.total,
        dates: date ? [date] : [],
      });
    }
  }
  
  return Array.from(groups.values()).map((group) => ({
    ...group,
    dates: group.dates.sort((a, b) => new Date(a).getTime() - new Date(b).getTime()),
  }));
}

function formatPeriod(dates: string[]): string | null {
  if (dates.length === 0) return null;
  if (dates.length === 1) return formatDateShort(dates[0]);
  const firstDate = formatDateShort(dates[0]);
  const lastDate = formatDateShort(dates[dates.length - 1]);
  return `Période du ${firstDate} au ${lastDate}`;
}

function generateSwissQRCode(data: ExportInvoice): string {
  const amount = (data.total || data.subtotal).toFixed(2);
  const iban = (data.company.iban || "").replace(/\s/g, "");
  
  const companyAddrLines = parseAddress(data.company.address);
  const companyStreet = companyAddrLines[0] || "";
  const companyZipCity = companyAddrLines[1] || "";
  
  const clientAddrLines = parseAddress(data.client.address);
  const clientStreet = clientAddrLines[0] || "";
  const clientZipCity = clientAddrLines[1] || "";
  
  const creditorName = data.company.ownerName || data.company.name;
  
  return [
    "SPC", "0200", "1", iban, "K",
    creditorName.substring(0, 70),
    companyStreet.substring(0, 70),
    companyZipCity.substring(0, 70),
    "", "", "CH", "", "", "", "", "", "", "",
    amount, "CHF", "K",
    `${data.client.firstName} ${data.client.lastName}`.substring(0, 70),
    clientStreet.substring(0, 70),
    clientZipCity.substring(0, 70),
    "", "", "CH", "NON", "",
    data.invoiceNumber.substring(0, 140),
    "EPD", "",
  ].join("\n");
}

export async function generateInvoicePdfBlob(data: ExportInvoice): Promise<Blob> {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const LAYOUT = {
    pageWidth: 210,
    pageHeight: 297,
    margin: 20,
    qrBillHeight: 105,
  };
  
  const QR_BILL_Y = LAYOUT.pageHeight - LAYOUT.qrBillHeight;
  const CONTENT_WIDTH = LAYOUT.pageWidth - LAYOUT.margin * 2;
  const maxContentY = QR_BILL_Y - 20;

  // Header
  let y = LAYOUT.margin;
  doc.setFontSize(20);
  doc.setTextColor(...COLORS.primary);
  doc.setFont("helvetica", "bold");
  doc.text(data.company.name || "Mon Entreprise", LAYOUT.margin, y);
  doc.text("FACTURE", LAYOUT.pageWidth - LAYOUT.margin, y, { align: "right" });
  
  y += 6;
  
  if (data.company.ownerName) {
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.muted);
    doc.setFont("helvetica", "normal");
    doc.text(data.company.ownerName, LAYOUT.margin, y);
  }
  
  doc.setFontSize(11);
  doc.setTextColor(...COLORS.text);
  doc.setFont("helvetica", "bold");
  doc.text(data.invoiceNumber, LAYOUT.pageWidth - LAYOUT.margin, y, { align: "right" });
  
  y += 6;
  
  const companyAddrLines = parseAddress(data.company.address);
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.muted);
  doc.setFont("helvetica", "normal");
  
  let addrY = y;
  companyAddrLines.forEach((line) => {
    doc.text(line, LAYOUT.margin, addrY);
    addrY += 3.5;
  });
  
  doc.setFontSize(9);
  doc.text(`Date: ${formatDatePdf(data.issueDate)}`, LAYOUT.pageWidth - LAYOUT.margin, y, { align: "right" });
  doc.text(`Échéance: ${formatDatePdf(data.dueDate)}`, LAYOUT.pageWidth - LAYOUT.margin, y + 5, { align: "right" });
  
  y = Math.max(addrY, y + 10) + 12;

  // Client block
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.muted);
  doc.setFont("helvetica", "bold");
  doc.text("FACTURER À", LAYOUT.margin, y);
  y += 5;
  
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.text);
  doc.text(`${data.client.firstName} ${data.client.lastName}`, LAYOUT.margin, y);
  y += 4;
  
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.muted);
  
  const clientAddrLines = parseAddress(data.client.address);
  clientAddrLines.forEach((line) => {
    doc.text(line, LAYOUT.margin, y);
    y += 3.5;
  });
  
  y += 12;

  // Lines table
  const aggregatedLines = aggregateLines(data.lines);
  
  const colDesc = LAYOUT.margin + 3;
  const colQty = LAYOUT.margin + 105;
  const colPrice = LAYOUT.margin + 130;
  const colTotal = LAYOUT.pageWidth - LAYOUT.margin - 3;
  
  doc.setFillColor(...COLORS.tableHeader);
  doc.rect(LAYOUT.margin, y - 4, CONTENT_WIDTH, 8, "F");
  
  doc.setFontSize(7);
  doc.setTextColor(...COLORS.muted);
  doc.setFont("helvetica", "bold");
  doc.text("DESCRIPTION", colDesc, y);
  doc.text("QTÉ", colQty, y, { align: "center" });
  doc.text("PRIX UNIT.", colPrice, y, { align: "center" });
  doc.text("TOTAL", colTotal, y, { align: "right" });
  
  y += 8;
  
  doc.setFont("helvetica", "normal");
  const rowHeight = 10;
  let isAlternate = false;
  
  for (const line of aggregatedLines) {
    if (y + rowHeight > maxContentY - 35) break;
    
    if (isAlternate) {
      doc.setFillColor(250, 250, 250);
      doc.rect(LAYOUT.margin, y - 4, CONTENT_WIDTH, rowHeight, "F");
    }
    isAlternate = !isAlternate;
    
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.text);
    doc.text(line.label, colDesc, y);
    
    const period = formatPeriod(line.dates);
    if (period) {
      doc.setFontSize(6);
      doc.setTextColor(...COLORS.light);
      doc.text(period, colDesc + 3, y + 3.5);
    }
    
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.text);
    doc.text(line.quantity.toString(), colQty, y, { align: "center" });
    doc.text(`${line.unitPrice.toFixed(2)} CHF`, colPrice, y, { align: "center" });
    
    doc.setFont("helvetica", "bold");
    doc.text(`${line.total.toFixed(2)} CHF`, colTotal, y, { align: "right" });
    doc.setFont("helvetica", "normal");
    
    y += rowHeight;
  }

  // Totals
  y += 6;
  const totalsX = LAYOUT.pageWidth - LAYOUT.margin - 70;
  const rightX = LAYOUT.pageWidth - LAYOUT.margin;
  
  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.3);
  doc.line(totalsX, y - 4, rightX, y - 4);
  
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.muted);
  doc.setFont("helvetica", "normal");
  doc.text("Sous-total", totalsX, y);
  doc.setTextColor(...COLORS.text);
  doc.text(`${data.subtotal.toFixed(2)} CHF`, rightX, y, { align: "right" });
  
  y += 5;
  
  doc.setTextColor(...COLORS.muted);
  doc.text(`TVA (${data.taxRate}%)`, totalsX, y);
  doc.setTextColor(...COLORS.text);
  doc.text(`${(data.taxAmount || 0).toFixed(2)} CHF`, rightX, y, { align: "right" });
  
  y += 5;
  
  doc.setDrawColor(...COLORS.primary);
  doc.setLineWidth(1);
  doc.line(totalsX, y, rightX, y);
  
  y += 5;
  
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.primary);
  doc.text("TOTAL", totalsX, y);
  doc.text(`${(data.total || data.subtotal).toFixed(2)} CHF`, rightX, y, { align: "right" });

  // Legal notice
  const legalY = QR_BILL_Y - 8;
  doc.setFontSize(7);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(...COLORS.light);
  doc.text("Entreprise non assujettie à la TVA selon art. 10 LTVA.", LAYOUT.pageWidth / 2, legalY, { align: "center" });

  // QR Bill
  const qrStartY = QR_BILL_Y + 5;
  const formattedIban = formatIban(data.company.iban);
  const totalAmount = (data.total || data.subtotal).toFixed(2);
  const creditorName = data.company.ownerName || data.company.name;
  const debtorName = `${data.client.firstName} ${data.client.lastName}`;
  const bottomY = LAYOUT.pageHeight - 18;

  doc.setDrawColor(...COLORS.black);
  doc.setLineWidth(0.3);
  doc.setLineDashPattern([3, 2], 0);
  doc.line(0, QR_BILL_Y, LAYOUT.pageWidth, QR_BILL_Y);
  doc.setLineDashPattern([], 0);
  
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.muted);
  doc.text("✂", 3, QR_BILL_Y - 1);

  // Receipt
  const receiptX = 5;
  const receiptWidth = 62;
  
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.black);
  doc.text("Récépissé", receiptX, qrStartY + 3);
  
  let ry = qrStartY + 10;
  
  doc.setFontSize(6);
  doc.setFont("helvetica", "bold");
  doc.text("Compte / Payable à", receiptX, ry);
  ry += 3;
  
  doc.setFont("helvetica", "normal");
  doc.text(formattedIban, receiptX, ry);
  ry += 3;
  doc.text(creditorName, receiptX, ry);
  ry += 3;
  companyAddrLines.forEach((line) => {
    doc.text(line, receiptX, ry);
    ry += 3;
  });
  
  ry += 2;
  
  doc.setFont("helvetica", "bold");
  doc.text("Payable par", receiptX, ry);
  ry += 3;
  
  doc.setFont("helvetica", "normal");
  doc.text(debtorName, receiptX, ry);
  ry += 3;
  clientAddrLines.forEach((line) => {
    doc.text(line, receiptX, ry);
    ry += 3;
  });
  
  doc.setFontSize(6);
  doc.setFont("helvetica", "bold");
  doc.text("Monnaie", receiptX, bottomY);
  doc.text("Montant", receiptX + 18, bottomY);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("CHF", receiptX, bottomY + 4);
  doc.text(totalAmount, receiptX + 18, bottomY + 4);
  
  doc.setDrawColor(...COLORS.black);
  doc.setLineWidth(0.3);
  doc.setLineDashPattern([3, 2], 0);
  doc.line(receiptWidth, QR_BILL_Y, receiptWidth, LAYOUT.pageHeight);
  doc.setLineDashPattern([], 0);

  // Payment section
  const paymentX = receiptWidth + 5;
  
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.black);
  doc.text("Section paiement", paymentX, qrStartY + 3);
  
  if (data.company.iban) {
    try {
      const qrData = generateSwissQRCode(data);
      const qrDataUrl = await QRCode.toDataURL(qrData, {
        errorCorrectionLevel: "M",
        margin: 0,
        width: 200,
        color: { dark: "#000000", light: "#ffffff" },
      });
      
      const qrSize = 46;
      const qrCodeX = paymentX;
      const qrCodeY = qrStartY + 8;
      
      doc.addImage(qrDataUrl, "PNG", qrCodeX, qrCodeY, qrSize, qrSize);
      
      const cx = qrCodeX + qrSize / 2;
      const cy = qrCodeY + qrSize / 2;
      doc.setFillColor(...COLORS.white);
      doc.rect(cx - 3.5, cy - 3.5, 7, 7, "F");
      doc.setFillColor(255, 0, 0);
      doc.rect(cx - 3, cy - 3, 6, 6, "F");
      doc.setFillColor(...COLORS.white);
      doc.rect(cx - 2, cy - 0.6, 4, 1.2, "F");
      doc.rect(cx - 0.6, cy - 2, 1.2, 4, "F");
    } catch (error) {
      console.error("QR Code generation error:", error);
    }
  }
  
  const infoX = paymentX + 52;
  let py = qrStartY + 10;
  
  doc.setFontSize(6);
  doc.setFont("helvetica", "bold");
  doc.text("Compte / Payable à", infoX, py);
  py += 3;
  
  doc.setFont("helvetica", "normal");
  doc.text(formattedIban, infoX, py);
  py += 3;
  doc.text(creditorName, infoX, py);
  py += 3;
  companyAddrLines.forEach((line) => {
    doc.text(line, infoX, py);
    py += 3;
  });
  
  py += 2;
  
  doc.setFont("helvetica", "bold");
  doc.text("Payable par", infoX, py);
  py += 3;
  
  doc.setFont("helvetica", "normal");
  doc.text(debtorName, infoX, py);
  py += 3;
  clientAddrLines.forEach((line) => {
    doc.text(line, infoX, py);
    py += 3;
  });
  
  doc.setFontSize(6);
  doc.setFont("helvetica", "bold");
  doc.text("Monnaie", infoX, bottomY);
  doc.text("Montant", infoX + 18, bottomY);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("CHF", infoX, bottomY + 4);
  doc.text(totalAmount, infoX + 18, bottomY + 4);

  return doc.output("blob");
}

// ============= CSV EXPORT =============

const STATUS_LABELS: Record<string, string> = {
  draft: "Brouillon",
  sent: "Envoyée",
  paid: "Payée",
  overdue: "En retard",
};

const CATEGORY_LABELS: Record<string, string> = {
  fuel: "Carburant",
  vehicle_maintenance: "Entretien véhicule",
  dog_equipment: "Équipement canin",
  insurance: "Assurance",
  phone: "Téléphone",
  accounting: "Comptabilité",
  training: "Formation",
  other: "Autre",
};

export function generateInvoicesCsv(invoices: ExportInvoice[]): string {
  const headers = [
    "Numéro",
    "Date émission",
    "Date échéance",
    "Client",
    "Sous-total",
    "TVA %",
    "TVA CHF",
    "Total",
    "Statut",
  ];
  
  const rows = invoices.map((inv) => [
    inv.invoiceNumber,
    formatDateShort(inv.issueDate),
    formatDateShort(inv.dueDate),
    `${inv.client.firstName} ${inv.client.lastName}`,
    inv.subtotal.toFixed(2),
    inv.taxRate.toString(),
    (inv.taxAmount || 0).toFixed(2),
    (inv.total || inv.subtotal).toFixed(2),
    STATUS_LABELS[inv.status] || inv.status,
  ]);
  
  const csvContent = [
    headers.join(";"),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(";")),
  ].join("\n");
  
  return "\uFEFF" + csvContent; // BOM for Excel
}

export function generateExpensesCsv(expenses: ExportExpense[]): string {
  const headers = [
    "Date",
    "Catégorie",
    "Description",
    "Montant",
  ];
  
  const rows = expenses.map((exp) => [
    formatDateShort(exp.date),
    CATEGORY_LABELS[exp.category] || exp.category,
    exp.description,
    exp.amount.toFixed(2),
  ]);
  
  const csvContent = [
    headers.join(";"),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(";")),
  ].join("\n");
  
  return "\uFEFF" + csvContent;
}

// ============= ZIP EXPORT =============

export async function generateInvoicesZip(
  invoices: ExportInvoice[],
  onProgress?: (current: number, total: number) => void
): Promise<Blob> {
  const zip = new JSZip();
  const folder = zip.folder("factures");
  
  if (!folder) throw new Error("Failed to create folder");
  
  for (let i = 0; i < invoices.length; i++) {
    const invoice = invoices[i];
    onProgress?.(i + 1, invoices.length);
    
    try {
      const pdfBlob = await generateInvoicePdfBlob(invoice);
      folder.file(`${invoice.invoiceNumber}.pdf`, pdfBlob);
    } catch (error) {
      console.error(`Error generating PDF for ${invoice.invoiceNumber}:`, error);
    }
  }
  
  // Add CSV summary
  const csvContent = generateInvoicesCsv(invoices);
  folder.file("resume_factures.csv", csvContent);
  
  return zip.generateAsync({ type: "blob" });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadCsv(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  downloadBlob(blob, filename);
}

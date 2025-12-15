import jsPDF from "jspdf";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import QRCode from "qrcode";

// ============= TYPES =============

interface InvoiceData {
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  subtotal: number;
  taxRate: number;
  taxAmount: number | null;
  total: number | null;
  notes: string | null;
  client: {
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
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
    paymentDelayDays: number | null;
  };
  lines: {
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }[];
}

// ============= DESIGN CONSTANTS =============

const COLORS = {
  primary: [138, 90, 59] as [number, number, number],    // Brun chaud Django & Co
  text: [33, 33, 33] as [number, number, number],        // Noir/gris foncé
  muted: [107, 114, 128] as [number, number, number],    // Gris moyen
  light: [156, 163, 175] as [number, number, number],    // Gris clair
  border: [229, 231, 235] as [number, number, number],   // Bordure légère
  tableHeader: [245, 245, 245] as [number, number, number], // Fond en-tête tableau
  black: [0, 0, 0] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
};

const LAYOUT = {
  pageWidth: 210,      // A4 width in mm
  pageHeight: 297,     // A4 height in mm
  margin: 20,          // Marges gauche/droite
  qrBillHeight: 105,   // Zone QR-bill réservée en bas
  lineHeight: 5,       // Hauteur de ligne standard
  sectionGap: 12,      // Espace entre sections
};

// Position Y où commence la zone QR-bill (ne pas dépasser)
const QR_BILL_Y = LAYOUT.pageHeight - LAYOUT.qrBillHeight;
const CONTENT_WIDTH = LAYOUT.pageWidth - LAYOUT.margin * 2;

const SERVICE_LABELS: Record<string, string> = {
  individual_walk: "Balade individuelle",
  group_walk: "Balade groupée",
  custom_walk: "Balade sur mesure",
  education: "Éducation canine",
  dog_sitting: "Dog sitting",
  transport: "Transport",
  other: "Autre prestation",
};

// ============= UTILITY FUNCTIONS =============

function parseAddress(address: string | null): string[] {
  if (!address) return [];
  return address.split(/[\n]/).map(l => l.trim()).filter(l => l);
}

function formatIban(iban: string | null): string {
  if (!iban) return "";
  return iban.replace(/\s/g, "").replace(/(.{4})/g, "$1 ").trim();
}

function formatDate(dateStr: string): string {
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

// ============= LINE AGGREGATION =============

interface AggregatedLine {
  label: string;
  quantity: number;
  unitPrice: number;
  total: number;
  dates: string[];
}

function aggregateLines(lines: InvoiceData["lines"]): AggregatedLine[] {
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
  
  // Sort dates and return aggregated lines
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

// ============= QR CODE GENERATION =============

function generateSwissQRCode(data: InvoiceData): string {
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

// ============= DRAWING FUNCTIONS =============

function drawHeader(doc: jsPDF, data: InvoiceData): number {
  let y = LAYOUT.margin;
  
  // Nom de l'entreprise (gauche, couleur primaire)
  doc.setFontSize(20);
  doc.setTextColor(...COLORS.primary);
  doc.setFont("helvetica", "bold");
  doc.text(data.company.name || "Mon Entreprise", LAYOUT.margin, y);
  
  // "FACTURE" (droite, couleur primaire)
  doc.text("FACTURE", LAYOUT.pageWidth - LAYOUT.margin, y, { align: "right" });
  
  y += 6;
  
  // Nom du propriétaire en plus petit (gauche)
  if (data.company.ownerName) {
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.muted);
    doc.setFont("helvetica", "normal");
    doc.text(data.company.ownerName, LAYOUT.margin, y);
  }
  
  // Numéro de facture (droite)
  doc.setFontSize(11);
  doc.setTextColor(...COLORS.text);
  doc.setFont("helvetica", "bold");
  doc.text(data.invoiceNumber, LAYOUT.pageWidth - LAYOUT.margin, y, { align: "right" });
  
  y += 6;
  
  // Adresse de l'entreprise (gauche)
  const companyAddrLines = parseAddress(data.company.address);
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.muted);
  doc.setFont("helvetica", "normal");
  
  let addrY = y;
  companyAddrLines.forEach((line) => {
    doc.text(line, LAYOUT.margin, addrY);
    addrY += 3.5;
  });
  if (data.company.email) {
    doc.text(data.company.email, LAYOUT.margin, addrY);
    addrY += 3.5;
  }
  if (data.company.phone) {
    doc.text(data.company.phone, LAYOUT.margin, addrY);
    addrY += 3.5;
  }
  
  // Dates (droite)
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.muted);
  doc.text(`Date: ${formatDate(data.issueDate)}`, LAYOUT.pageWidth - LAYOUT.margin, y, { align: "right" });
  doc.text(`Échéance: ${formatDate(data.dueDate)}`, LAYOUT.pageWidth - LAYOUT.margin, y + 5, { align: "right" });
  
  return Math.max(addrY, y + 10) + LAYOUT.sectionGap;
}

function drawClientBlock(doc: jsPDF, data: InvoiceData, startY: number): number {
  let y = startY;
  
  // Label "FACTURER À"
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.muted);
  doc.setFont("helvetica", "bold");
  doc.text("FACTURER À", LAYOUT.margin, y);
  
  y += 5;
  
  // Nom du client
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.text);
  doc.setFont("helvetica", "bold");
  doc.text(`${data.client.firstName} ${data.client.lastName}`, LAYOUT.margin, y);
  
  y += 4;
  
  // Adresse du client
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.muted);
  
  const clientAddrLines = parseAddress(data.client.address);
  clientAddrLines.forEach((line) => {
    doc.text(line, LAYOUT.margin, y);
    y += 3.5;
  });
  
  // Numéro de téléphone supprimé volontairement des factures
  
  return y + LAYOUT.sectionGap;
}

function drawLinesTable(doc: jsPDF, data: InvoiceData, startY: number, maxY: number): number {
  let y = startY;
  
  // Aggregate lines by service type and unit price
  const aggregatedLines = aggregateLines(data.lines);
  
  // Colonnes
  const colDesc = LAYOUT.margin + 3;
  const colQty = LAYOUT.margin + 105;
  const colPrice = LAYOUT.margin + 130;
  const colTotal = LAYOUT.pageWidth - LAYOUT.margin - 3;
  
  // En-tête du tableau avec fond grisé
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
  
  // Lignes du tableau
  doc.setFont("helvetica", "normal");
  
  const rowHeight = 10;
  let isAlternate = false;
  
  for (const line of aggregatedLines) {
    // Vérifier qu'on ne dépasse pas la zone max
    if (y + rowHeight > maxY) break;
    
    // Fond alterné léger
    if (isAlternate) {
      doc.setFillColor(250, 250, 250);
      doc.rect(LAYOUT.margin, y - 4, CONTENT_WIDTH, rowHeight, "F");
    }
    isAlternate = !isAlternate;
    
    // Description
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.text);
    doc.text(line.label, colDesc, y);
    
    // Période en dessous, plus petite et indentée
    const period = formatPeriod(line.dates);
    if (period) {
      doc.setFontSize(6);
      doc.setTextColor(...COLORS.light);
      doc.text(period, colDesc + 3, y + 3.5);
    }
    
    // Quantité
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.text);
    doc.text(line.quantity.toString(), colQty, y, { align: "center" });
    
    // Prix unitaire
    doc.text(`${line.unitPrice.toFixed(2)} CHF`, colPrice, y, { align: "center" });
    
    // Total
    doc.setFont("helvetica", "bold");
    doc.text(`${line.total.toFixed(2)} CHF`, colTotal, y, { align: "right" });
    doc.setFont("helvetica", "normal");
    
    y += rowHeight;
  }
  
  return y;
}

function drawTotals(doc: jsPDF, data: InvoiceData, startY: number): number {
  let y = startY + 6;
  
  const totalsX = LAYOUT.pageWidth - LAYOUT.margin - 70;
  const rightX = LAYOUT.pageWidth - LAYOUT.margin;
  
  // Ligne de séparation légère
  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.3);
  doc.line(totalsX, y - 4, rightX, y - 4);
  
  // Sous-total
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.muted);
  doc.setFont("helvetica", "normal");
  doc.text("Sous-total", totalsX, y);
  doc.setTextColor(...COLORS.text);
  doc.text(`${data.subtotal.toFixed(2)} CHF`, rightX, y, { align: "right" });
  
  y += 5;
  
  // TVA
  doc.setTextColor(...COLORS.muted);
  doc.text(`TVA (${data.taxRate}%)`, totalsX, y);
  doc.setTextColor(...COLORS.text);
  doc.text(`${(data.taxAmount || 0).toFixed(2)} CHF`, rightX, y, { align: "right" });
  
  y += 5;
  
  // Trait coloré avant le total
  doc.setDrawColor(...COLORS.primary);
  doc.setLineWidth(1);
  doc.line(totalsX, y, rightX, y);
  
  y += 5;
  
  // TOTAL
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.primary);
  doc.text("TOTAL", totalsX, y);
  doc.text(`${(data.total || data.subtotal).toFixed(2)} CHF`, rightX, y, { align: "right" });
  
  return y + 8;
}

function drawLegalNotice(doc: jsPDF) {
  // Position fixe: 8mm au-dessus de la ligne de coupe QR-bill
  const legalY = QR_BILL_Y - 8;
  
  doc.setFontSize(7);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(...COLORS.light);
  doc.text(
    "Entreprise non assujettie à la TVA selon art. 10 LTVA.",
    LAYOUT.pageWidth / 2,
    legalY,
    { align: "center" }
  );
}

async function drawQrBill(doc: jsPDF, data: InvoiceData) {
  const qrStartY = QR_BILL_Y + 5;
  const companyAddr = parseAddress(data.company.address);
  const clientAddr = parseAddress(data.client.address);
  const formattedIban = formatIban(data.company.iban);
  const totalAmount = (data.total || data.subtotal).toFixed(2);
  const creditorName = data.company.ownerName || data.company.name;
  const debtorName = `${data.client.firstName} ${data.client.lastName}`;
  const bottomY = LAYOUT.pageHeight - 18;

  // ===== LIGNE DE COUPE =====
  doc.setDrawColor(...COLORS.black);
  doc.setLineWidth(0.3);
  doc.setLineDashPattern([3, 2], 0);
  doc.line(0, QR_BILL_Y, LAYOUT.pageWidth, QR_BILL_Y);
  doc.setLineDashPattern([], 0);
  
  // Ciseaux
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.muted);
  doc.text("✂", 3, QR_BILL_Y - 1);

  // ===== RÉCÉPISSÉ (Gauche, 62mm) =====
  const receiptX = 5;
  const receiptWidth = 62;
  
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.black);
  doc.text("Récépissé", receiptX, qrStartY + 3);
  
  let ry = qrStartY + 10;
  
  // Compte / Payable à
  doc.setFontSize(6);
  doc.setFont("helvetica", "bold");
  doc.text("Compte / Payable à", receiptX, ry);
  ry += 3;
  
  doc.setFont("helvetica", "normal");
  doc.text(formattedIban, receiptX, ry);
  ry += 3;
  doc.text(creditorName, receiptX, ry);
  ry += 3;
  companyAddr.forEach((line) => {
    doc.text(line, receiptX, ry);
    ry += 3;
  });
  
  ry += 2;
  
  // Payable par
  doc.setFont("helvetica", "bold");
  doc.text("Payable par", receiptX, ry);
  ry += 3;
  
  doc.setFont("helvetica", "normal");
  doc.text(debtorName, receiptX, ry);
  ry += 3;
  clientAddr.forEach((line) => {
    doc.text(line, receiptX, ry);
    ry += 3;
  });
  
  // Montant en bas
  doc.setFontSize(6);
  doc.setFont("helvetica", "bold");
  doc.text("Monnaie", receiptX, bottomY);
  doc.text("Montant", receiptX + 18, bottomY);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("CHF", receiptX, bottomY + 4);
  doc.text(totalAmount, receiptX + 18, bottomY + 4);
  
  // Point de dépôt supprimé
  
  // Séparateur vertical pointillé
  doc.setDrawColor(...COLORS.black);
  doc.setLineWidth(0.3);
  doc.setLineDashPattern([3, 2], 0);
  doc.line(receiptWidth, QR_BILL_Y, receiptWidth, LAYOUT.pageHeight);
  doc.setLineDashPattern([], 0);

  // ===== SECTION PAIEMENT (Droite) =====
  const paymentX = receiptWidth + 5;
  
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.black);
  doc.text("Section paiement", paymentX, qrStartY + 3);
  
  // QR Code
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
      
      // Croix suisse au centre du QR
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
  
  // Infos paiement (à droite du QR)
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
  companyAddr.forEach((line) => {
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
  clientAddr.forEach((line) => {
    doc.text(line, infoX, py);
    py += 3;
  });
  
  // Montant
  doc.setFontSize(6);
  doc.setFont("helvetica", "bold");
  doc.text("Monnaie", infoX, bottomY);
  doc.text("Montant", infoX + 18, bottomY);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("CHF", infoX, bottomY + 4);
  doc.text(totalAmount, infoX + 18, bottomY + 4);
}

// ============= MAIN EXPORT =============

export async function generateInvoicePdf(data: InvoiceData): Promise<void> {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  // Zone max pour le contenu (au-dessus de la notice légale)
  const maxContentY = QR_BILL_Y - 20;

  // 1. En-tête
  let y = drawHeader(doc, data);

  // 2. Bloc client
  y = drawClientBlock(doc, data, y);

  // 3. Tableau des lignes
  y = drawLinesTable(doc, data, y, maxContentY - 35);

  // 4. Totaux
  drawTotals(doc, data, y);

  // 5. Notice légale (position fixe)
  drawLegalNotice(doc);

  // 6. QR-bill (zone fixe en bas)
  await drawQrBill(doc, data);

  // Sauvegarde
  doc.save(`${data.invoiceNumber}.pdf`);
}

import { useState, useEffect } from "react";
import { FileText, Loader2 } from "lucide-react";
import { useExpenses } from "@/hooks/useExpenses";

interface ReceiptLinkProps {
  receiptPath: string | null;
  className?: string;
  showText?: boolean;
}

export function ReceiptLink({ receiptPath, className = "", showText = false }: ReceiptLinkProps) {
  const { getReceiptSignedUrl } = useExpenses();
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!receiptPath || loading) return;

    setLoading(true);
    try {
      const url = await getReceiptSignedUrl(receiptPath);
      if (url) {
        window.open(url, "_blank", "noopener,noreferrer");
      }
    } catch (error) {
      console.error("Error opening receipt:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!receiptPath) return null;

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`inline-flex items-center gap-1.5 text-primary hover:underline ${className}`}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <FileText className="w-4 h-4" />
      )}
      {showText && <span className="text-sm">Voir le justificatif</span>}
    </button>
  );
}

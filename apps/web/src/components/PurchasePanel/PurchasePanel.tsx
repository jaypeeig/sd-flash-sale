import { useState } from "react";
import { Link } from "react-router-dom";
import { useUser } from "../../context/UserContext";
import { usePurchase } from "../../hooks/usePurchase";
import { AlertCircleIcon, CheckCircleIcon, LoadingSpinnerIcon } from "./icons";
import {
  MIN_LOADING_MS,
  NON_ACTIVE_LABELS,
  OUTCOME_IS_ERROR,
  OUTCOME_STYLES,
} from "./PurchasePanel.constants";
import type { PurchasePanelProps } from "./PurchasePanel.types";

const PurchasePanel = ({ sale, onPurchased }: PurchasePanelProps) => {
  const { email } = useUser();
  const { result, error, isSubmitting, submit } = usePurchase();
  const [isBusy, setIsBusy] = useState(false);

  if (email === null) {
    return (
      <div className="flex justify-end">
        <Link
          to="/login"
          className="inline-block w-fit cursor-pointer rounded bg-slate-900 px-3 py-2 text-white transition-colors hover:bg-slate-700"
        >
          Sign in to buy
        </Link>
      </div>
    );
  }

  const handleBuy = async () => {
    setIsBusy(true);
    const startedAt = Date.now();

    await submit(sale.id, email);

    // XXX: minimum loading time is purely for perceived UX feedback.
    const remainingMs = MIN_LOADING_MS - (Date.now() - startedAt);
    if (remainingMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, remainingMs));
    }

    setIsBusy(false);
    onPurchased(sale.id);
  };

  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1">
          {!isBusy && result && (
            <p
              role="status"
              className={`inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium ${OUTCOME_STYLES[result.status]}`}
            >
              {OUTCOME_IS_ERROR[result.status] ? <AlertCircleIcon /> : <CheckCircleIcon />}
              {result.message}
            </p>
          )}
          {!isBusy && error && (
            <p
              role="alert"
              className="inline-flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700"
            >
              <AlertCircleIcon />
              {error.message}
            </p>
          )}
        </div>
        <button
          type="button"
          disabled={sale.phase !== "active" || isSubmitting || isBusy}
          onClick={handleBuy}
          className="inline-flex w-fit shrink-0 cursor-pointer items-center gap-2 rounded bg-green-600 px-3 py-2 text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {isBusy && <LoadingSpinnerIcon />}
          {sale.phase !== "active" ? NON_ACTIVE_LABELS[sale.phase] : isBusy ? "Buying…" : "Buy now"}
        </button>
      </div>
      {!isBusy && result?.status === "success" && (
        <Link
          to="/orders"
          className="w-fit items-center gap-1 self-start text-sm font-medium underline underline-offset-2 transition-colors hover:text-green-900"
        >
          View your order
        </Link>
      )}
    </div>
  );
};

export default PurchasePanel;

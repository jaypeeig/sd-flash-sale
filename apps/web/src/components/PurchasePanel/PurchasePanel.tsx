import { useState } from "react";
import { Link } from "react-router-dom";
import { useUser } from "../../context/UserContext";
import { usePurchase } from "../../hooks/usePurchase";
import { MIN_LOADING_MS, NON_ACTIVE_LABELS, OUTCOME_STYLES } from "./PurchasePanel.constants";
import type { PurchasePanelProps } from "./PurchasePanel.types";

const PurchasePanel = ({ sale, onPurchased }: PurchasePanelProps) => {
  const { email } = useUser();
  const { result, error, isSubmitting, submit } = usePurchase();
  const [isBusy, setIsBusy] = useState(false);

  if (email === null) {
    return (
      <Link
        to="/login"
        className="inline-block w-fit cursor-pointer rounded bg-slate-900 px-3 py-2 text-white transition-colors hover:bg-slate-700"
      >
        Sign in to buy
      </Link>
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
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        disabled={sale.phase !== "active" || isSubmitting || isBusy}
        onClick={handleBuy}
        className="inline-flex w-fit cursor-pointer items-center gap-2 rounded bg-green-600 px-3 py-2 text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-slate-400"
      >
        {isBusy && (
          <svg className="size-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4Z"
            />
          </svg>
        )}
        {sale.phase !== "active" ? NON_ACTIVE_LABELS[sale.phase] : isBusy ? "Buying…" : "Buy now"}
      </button>
      {!isBusy && result && (
        <p role="status" className={OUTCOME_STYLES[result.status]}>
          {result.message}
        </p>
      )}
      {!isBusy && result?.status === "success" && (
        <Link to="/orders" className="w-fit text-slate-900 underline">
          View your orders
        </Link>
      )}
      {!isBusy && error && (
        <p role="alert" className="text-red-600">
          {error.message}
        </p>
      )}
    </div>
  );
};

export default PurchasePanel;

import { Link } from "react-router-dom";
import { useUser } from "../../context/UserContext";
import { usePurchase } from "../../hooks/usePurchase";
import { NON_ACTIVE_LABELS, OUTCOME_STYLES } from "./PurchasePanel.constants";
import type { PurchasePanelProps } from "./PurchasePanel.types";

const PurchasePanel = ({ sale, onPurchased }: PurchasePanelProps) => {
  const { email } = useUser();
  const { result, error, isSubmitting, submit } = usePurchase();

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
    await submit(sale.id, email);
    onPurchased(sale.id);
  };

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        disabled={sale.phase !== "active" || isSubmitting}
        onClick={handleBuy}
        className="w-fit cursor-pointer rounded bg-green-600 px-3 py-2 text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-slate-400"
      >
        {sale.phase !== "active"
          ? NON_ACTIVE_LABELS[sale.phase]
          : isSubmitting
            ? "Buying…"
            : "Buy now"}
      </button>
      {result && (
        <p role="status" className={OUTCOME_STYLES[result.status]}>
          {result.message}
        </p>
      )}
      {result?.status === "success" && (
        <Link to="/orders" className="w-fit text-slate-900 underline">
          View your orders
        </Link>
      )}
      {error && (
        <p role="alert" className="text-red-600">
          {error.message}
        </p>
      )}
    </div>
  );
};

export default PurchasePanel;

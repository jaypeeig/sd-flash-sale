import StatusMessage from "../../components/StatusMessage";
import { useUser } from "../../context/UserContext";
import { usePurchases } from "../../hooks/usePurchases";
import { formatDateTime } from "../../lib/formatDateTime";
import { formatMoney } from "../../lib/formatMoney";

const OrdersPage = () => {
  const { email } = useUser();
  const { data: purchases, error, isLoading } = usePurchases(email);

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="m-0 text-xl font-semibold">Order History</h2>
        {purchases && purchases.length > 0 && (
          <span className="text-sm text-slate-500">
            {purchases.length} {purchases.length === 1 ? "item" : "items"}
          </span>
        )}
      </div>
      {isLoading && <StatusMessage>Loading your orders…</StatusMessage>}
      {error && <StatusMessage tone="error">{error.message}</StatusMessage>}
      {!isLoading && !error && (!purchases || purchases.length === 0) && (
        <StatusMessage>You haven't bought anything yet.</StatusMessage>
      )}
      {purchases && purchases.length > 0 && (
        <ul className="flex flex-col gap-3 p-0">
          {purchases.map((record) => (
            <li
              key={record.id}
              className="flex list-none items-center gap-4 rounded-lg border border-slate-200 p-4 shadow-sm"
            >
              {record.product.imageUrl !== null ? (
                <img
                  src={record.product.imageUrl}
                  alt={record.product.name}
                  className="size-16 shrink-0 rounded-md object-cover"
                />
              ) : (
                <div className="size-16 shrink-0 rounded-md bg-slate-100" />
              )}
              <div className="flex flex-1 flex-col gap-0.5">
                <p className="m-0 font-medium">{record.product.name}</p>
                <p className="m-0 text-sm text-slate-500">{formatDateTime(record.purchasedAt)}</p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-0.5">
                <span className="text-lg font-semibold text-green-700">
                  {formatMoney(record.price)}
                </span>
                {record.product.price !== record.price && (
                  <span className="text-sm text-slate-500 line-through">
                    {formatMoney(record.product.price)}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default OrdersPage;

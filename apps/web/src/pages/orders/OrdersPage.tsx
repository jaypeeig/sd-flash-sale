import StatusMessage from "../../components/StatusMessage";
import { useUser } from "../../context/UserContext";
import { usePurchases } from "../../hooks/usePurchases";
import { formatDateTime } from "../../lib/formatDateTime";
import { formatMoney } from "../../lib/formatMoney";

const OrdersPage = () => {
  const { email } = useUser();
  const { data: purchases, error, isLoading } = usePurchases(email);

  return (
    <section className="flex flex-col gap-2">
      <h2 className="m-0 text-xl">Orders</h2>
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
              className="flex list-none items-center justify-between gap-2 rounded border border-slate-200 p-4"
            >
              <div>
                <p className="m-0 font-medium">{record.product.name}</p>
                <p className="m-0 text-slate-600">{formatDateTime(record.purchasedAt)}</p>
              </div>
              <span className="font-medium">{formatMoney(record.price)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default OrdersPage;

import LiveSaleCard from "../../components/LiveSaleCard";
import StatusMessage from "../../components/StatusMessage";
import { useSales } from "../../hooks/useSales";

const LiveSalePage = () => {
  const { data: sales, error, isLoading, refetch } = useSales("active");

  return (
    <section className="flex flex-col gap-2">
      <h2 className="m-0 text-xl">Live sales</h2>
      {isLoading && <StatusMessage>Loading live sales…</StatusMessage>}
      {error && (
        <div className="flex flex-col gap-2">
          <StatusMessage tone="error">{error.message}</StatusMessage>
          <button
            type="button"
            onClick={refetch}
            className="w-fit cursor-pointer rounded border border-slate-300 px-3 py-2 transition-colors hover:bg-slate-100"
          >
            Retry
          </button>
        </div>
      )}
      {!isLoading && !error && (!sales || sales.length === 0) && (
        <StatusMessage>No live sales right now. See what's coming up.</StatusMessage>
      )}
      {sales && sales.length > 0 && (
        <ul className="flex flex-col gap-4 p-0">
          {sales.map((sale) => (
            <li key={sale.id} className="list-none">
              <LiveSaleCard initialSale={sale} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default LiveSalePage;

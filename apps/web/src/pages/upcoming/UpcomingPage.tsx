import Countdown from "../../components/Countdown";
import SaleCard from "../../components/SaleCard";
import StatusMessage from "../../components/StatusMessage";
import { useSales } from "../../hooks/useSales";

const UpcomingPage = () => {
  const { data: sales, error, isLoading } = useSales("upcoming");

  return (
    <section className="flex flex-col gap-2">
      <h2 className="m-0 text-xl">Upcoming</h2>
      {isLoading && <StatusMessage>Loading upcoming sales…</StatusMessage>}
      {error && <StatusMessage tone="error">{error.message}</StatusMessage>}
      {!isLoading && !error && (!sales || sales.length === 0) && (
        <StatusMessage>No upcoming sales right now.</StatusMessage>
      )}
      {sales && sales.length > 0 && (
        <ul className="flex flex-col gap-3 p-0">
          {sales.map((sale) => (
            <li key={sale.id} className="list-none">
              <SaleCard sale={sale}>
                <Countdown
                  label="Starts in"
                  targetIso={sale.startsAt}
                  serverTimeIso={sale.serverTime}
                />
              </SaleCard>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default UpcomingPage;

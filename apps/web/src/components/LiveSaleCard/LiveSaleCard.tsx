import { useCallback, useState } from "react";
import { getSaleById } from "../../api/sales";
import Countdown from "../Countdown";
import PurchasePanel from "../PurchasePanel";
import SaleCard from "../SaleCard";
import type { LiveSaleCardProps } from "./LiveSaleCard.types";

// XXX: the parent list keys this component by sale.id, so a distinct sale
// always mounts a fresh instance — `sale` starts at `initialSale` via the
// useState initializer and diverges via refreshSale (a purchase), with no
// synchronizing effect needed to keep it in step with the list.
const LiveSaleCard = ({ initialSale }: LiveSaleCardProps) => {
  const [sale, setSale] = useState(initialSale);

  // XXX: refresh by id, not the list — ?status=active filters on
  // remainingStock > 0, so a sold-out sale drops out of that list entirely.
  // Refetching the list after a purchase would blank the card at exactly the
  // moment the user needs to read "Sorry, this item is sold out."
  const refreshSale = useCallback(async (saleId: string) => {
    try {
      setSale(await getSaleById(saleId));
    } catch {
      // a stale card beats blanking the page
    }
  }, []);

  return (
    <SaleCard
      sale={sale}
      timer={<Countdown label="Ends in" targetIso={sale.endsAt} serverTimeIso={sale.serverTime} />}
    >
      <PurchasePanel sale={sale} onPurchased={refreshSale} />
    </SaleCard>
  );
};

export default LiveSaleCard;

import { formatMoney } from "../../lib/formatMoney";
import { PHASE_BADGE_STYLES, PHASE_LABELS } from "./SaleCard.constants";
import type { SaleCardProps } from "./SaleCard.types";

const SaleCard = ({ sale, timer, children }: SaleCardProps) => {
  const { product } = sale;

  return (
    <article className="flex flex-col gap-4 rounded-lg border border-slate-200 p-4 shadow-sm">
      <div className="flex gap-4">
        <div className="w-1/3 shrink-0">
          {product.imageUrl !== null ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              className="aspect-square w-full rounded-md object-cover"
            />
          ) : (
            <div className="aspect-square w-full rounded-md bg-slate-100" />
          )}
        </div>
        <div className="flex w-2/3 flex-col gap-2">
          {timer && <div className="text-2xl font-semibold">{timer}</div>}
          <div className="flex items-start justify-between gap-2">
            <h3 className="m-0 text-lg font-medium">{product.name}</h3>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${PHASE_BADGE_STYLES[sale.phase]}`}
            >
              {PHASE_LABELS[sale.phase]}
            </span>
          </div>
          {product.description !== null && (
            <p className="text-sm text-slate-600">{product.description}</p>
          )}
          <p className="flex items-baseline gap-2">
            <span className="text-xl font-medium">{formatMoney(sale.salePrice)}</span>
            <span className="text-slate-500 line-through">{formatMoney(product.price)}</span>
          </p>
          <p className="text-sm text-slate-600">
            {sale.remainingStock} of {sale.totalStock} left
          </p>
        </div>
      </div>
      {children && <div className="border-t border-slate-100 pt-3">{children}</div>}
    </article>
  );
};

export default SaleCard;

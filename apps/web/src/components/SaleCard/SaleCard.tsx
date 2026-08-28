import { formatMoney } from "../../lib/formatMoney";
import { PHASE_LABELS } from "./SaleCard.constants";
import type { SaleCardProps } from "./SaleCard.types";

const SaleCard = ({ sale, children }: SaleCardProps) => {
  const { product } = sale;

  return (
    <article className="flex flex-col gap-3 rounded border border-slate-200 p-4">
      {product.imageUrl !== null && (
        <img src={product.imageUrl} alt={product.name} className="w-full rounded object-cover" />
      )}
      <div className="flex items-center justify-between gap-2">
        <h3 className="m-0 text-lg font-medium">{product.name}</h3>
        <span className="text-slate-600">{PHASE_LABELS[sale.phase]}</span>
      </div>
      {product.description !== null && <p className="text-slate-600">{product.description}</p>}
      <p className="flex items-baseline gap-2">
        <span className="text-xl font-medium">{formatMoney(sale.salePrice)}</span>
        <span className="text-slate-500 line-through">{formatMoney(product.price)}</span>
      </p>
      <p className="text-slate-600">
        {sale.remainingStock} of {sale.totalStock} left
      </p>
      {children}
    </article>
  );
};

export default SaleCard;

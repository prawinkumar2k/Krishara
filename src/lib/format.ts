export function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);
}
export const percentOff = (price: number, compare?: number | null) =>
  compare && compare > price ? Math.round(((compare - price) / compare) * 100) : 0;

export function formatDate(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric", month: "short", day: "numeric",
  });
}

export function formatCurrency(amount) {
  if (amount == null) return "৳0.00";
  return `৳${Number(amount).toFixed(2)}`;
}

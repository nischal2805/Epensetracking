export function formatIndianCurrency(amount: number): string {
  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);

  const formattedAmount = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(absAmount);

  return isNegative ? `-${formattedAmount}` : formattedAmount;
}

export function parseIndianCurrency(value: string): number {
  const cleanedValue = value.replace(/[₹,\s]/g, '');
  return parseFloat(cleanedValue) || 0;
}

export function formatCompactCurrency(amount: number): string {
  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);

  let formatted: string;

  if (absAmount >= 10000000) {
    formatted = `₹${(absAmount / 10000000).toFixed(2)}Cr`;
  } else if (absAmount >= 100000) {
    formatted = `₹${(absAmount / 100000).toFixed(2)}L`;
  } else if (absAmount >= 1000) {
    formatted = `₹${(absAmount / 1000).toFixed(1)}K`;
  } else {
    formatted = formatIndianCurrency(absAmount);
  }

  return isNegative ? `-${formatted}` : formatted;
}

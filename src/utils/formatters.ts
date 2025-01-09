export const formatMetricValue = (value: number): string => {
  // Jeśli wartość jest -1, zwróć '-'
  if (value === -1) return '-';
  
  // Zaokrąglij do 2 miejsc po przecinku i dodaj znak procentu
  return `${(value * 100).toFixed(2)}%`;
};

export const formatMetricValueRaw = (value: number): string => {
  if (value === -1) return 'N/A';
  return value.toFixed(3);
};

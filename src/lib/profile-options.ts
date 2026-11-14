/** Labels are presentation only; the actual set of available fields comes from Excel. */
export function careerFieldLabel(value: string) {
  const names: Record<string, string> = {
    software_engineering: "Software engineering",
    product_management: "Product management",
    data_science_ai_ml: "Data science, AI & ML",
    quant_finance: "Quantitative finance",
    hardware_engineering: "Hardware engineering",
  };
  return names[value] ?? value.replace(/_/g, " ");
}
export const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

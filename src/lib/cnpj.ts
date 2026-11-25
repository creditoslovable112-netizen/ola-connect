export function normalizeCnpj(value: string): string { return value.toUpperCase().replace(/[^A-Z0-9]/g, ""); }
export function formatCnpj(value: string): string {
  const v = normalizeCnpj(value).slice(0, 14);
  if (v.length <= 2) return v;
  if (v.length <= 5) return v.replace(/^(..)(.*)$/, "$1.$2");
  if (v.length <= 8) return v.replace(/^(..)(...)(.*)$/, "$1.$2.$3");
  if (v.length <= 12) return v.replace(/^(..)(...)(...)(.*)$/, "$1.$2.$3/$4");
  return v.replace(/^(..)(...)(...)(....)(..)$/, "$1.$2.$3/$4-$5");
}
function cnpjDigit(base: string, weights: number[]): number {
  const sum = [...base].reduce((total, char, index) => total + (char.charCodeAt(0) - 48) * weights[index], 0);
  const remainder = sum % 11;
  return remainder < 2 ? 0 : 11 - remainder;
}
export function isValidCnpj(value: string): boolean {
  const cnpj = normalizeCnpj(value);
  if (!/^[A-Z0-9]{12}[0-9]{2}$/.test(cnpj) || cnpj.length !== 14) return false;
  const firstWeights = [5,4,3,2,9,8,7,6,5,4,3,2];
  const secondWeights = [6,5,4,3,2,9,8,7,6,5,4,3,2];
  const first = cnpjDigit(cnpj.slice(0,12), firstWeights);
  const second = cnpjDigit(cnpj.slice(0,12) + first, secondWeights);
  return cnpj.endsWith(String(first) + String(second));
}

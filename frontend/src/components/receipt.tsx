/** Small pieces shared by every receipt-style page. */

/** A dashed tear line between receipt sections. */
export function Cut({ dots = false }: { dots?: boolean }) {
  return <hr className={dots ? "cut cut-dots" : "cut"} />;
}

/** A receipt line: a name, a dotted leader, and a value on the right. */
export function Line({
  name,
  value,
  strong = false,
  className = "",
}: {
  name: React.ReactNode;
  value: React.ReactNode;
  strong?: boolean;
  className?: string;
}) {
  return (
    <div className={`line${strong ? " line-strong" : ""} ${className}`.trim()}>
      <span>{name}</span>
      <span className="line-fill" aria-hidden="true" />
      <span className="line-value">{value}</span>
    </div>
  );
}

const LEFT = ["0001101", "0011001", "0010011", "0111101", "0100011", "0110001", "0101111", "0111011", "0110111", "0001011"];
const RIGHT = LEFT.map((pattern) => pattern.replace(/./g, (bit) => (bit === "0" ? "1" : "0")));
// Guard bars, and the bars of the first and last digit, run longer on UPC-A.
const LONG_BARS = new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 45, 46, 47, 48, 49, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94]);

function digitsOf(code: string): string {
  return code.replace(/\D/g, "");
}

/** True for a 12-digit UPC-A code whose check digit is right. */
export function isValidUpc(code: string): boolean {
  const digits = digitsOf(code);
  if (digits.length !== 12) {
    return false;
  }
  const numbers = [...digits].map(Number);
  const sum = numbers
    .slice(0, 11)
    .reduce((total, digit, index) => total + digit * (index % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === numbers[11];
}

/** "085315054108" → "0 85315 05410 8", the way it's printed under a barcode. */
export function formatUpc(code: string): string {
  const d = digitsOf(code);
  return d.length === 12 ? `${d[0]} ${d.slice(1, 6)} ${d.slice(6, 11)} ${d[11]}` : code;
}

/** Draws a real UPC-A barcode for a valid code. */
export function Barcode({
  code,
  module = 2.4,
  height = 52,
}: {
  code: string;
  module?: number;
  height?: number;
}) {
  const d = digitsOf(code);
  if (!isValidUpc(d)) {
    return null;
  }
  let bits = "101";
  for (let i = 0; i < 6; i += 1) bits += LEFT[Number(d[i])];
  bits += "01010";
  for (let i = 6; i < 12; i += 1) bits += RIGHT[Number(d[i])];
  bits += "101";
  const width = 95 * module;

  return (
    <span className="barcode-block">
      <svg
        className="barcode"
        fill="currentColor"
        height={height + 8}
        role="img"
        aria-label={`UPC barcode ${formatUpc(d)}`}
        viewBox={`0 0 ${width} ${height + 8}`}
        width={width}
      >
        {[...bits].map((bit, index) =>
          bit === "1" ? (
            <rect
              height={LONG_BARS.has(index) ? height + 8 : height}
              key={index}
              width={module}
              x={index * module}
              y={0}
            />
          ) : null,
        )}
      </svg>
      <span className="barcode-digits" aria-hidden="true">
        {formatUpc(d)}
      </span>
    </span>
  );
}

/** Today's date as printed at the top of a receipt, in U.S. Eastern time. */
export function receiptDate(now: Date = new Date()): string {
  return now.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "America/New_York",
  });
}

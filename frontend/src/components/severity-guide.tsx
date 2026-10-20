import { Line } from "@/components/receipt";
import { severityByKey, type SeverityKey } from "@/lib/format";

const LEVELS: [SeverityKey, string][] = [
  ["serious", "Class I"],
  ["moderate", "Class II"],
  ["low", "Class III"],
];

/** The key to the severity words, printed as receipt lines. */
export function SeverityGuide() {
  return (
    <section className="severity-guide" aria-labelledby="severity-title">
      <h2 className="r-label" id="severity-title">
        How serious is it?
      </h2>
      <ul className="severity-list">
        {LEVELS.map(([key, officialName]) => {
          const severity = severityByKey(key);
          return (
            <li className={`tone-${key}`} key={key}>
              <Line
                name={<strong className="tag">{severity.label}</strong>}
                value={officialName}
              />
              <p>{severity.summary}</p>
              <small>Official name: {officialName}</small>
            </li>
          );
        })}
        <li>
          <Line name={<strong className="tag">Health alert</strong>} value="USDA" />
          <p>{severityByKey("alert").summary}</p>
        </li>
      </ul>
    </section>
  );
}

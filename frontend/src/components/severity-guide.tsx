import { severityByKey, type SeverityKey } from "@/lib/format";

const LEVELS: [SeverityKey, string][] = [
  ["serious", "Class I"],
  ["moderate", "Class II"],
  ["low", "Class III"],
];

export function SeverityGuide() {
  return (
    <section className="shell severity-guide" aria-labelledby="severity-title">
      <h2 id="severity-title">How serious is it?</h2>
      <ul className="severity-grid">
        {LEVELS.map(([key, officialName]) => {
          const severity = severityByKey(key);
          return (
            <li className={`severity-tile tone-${key}`} key={key}>
              <strong>{severity.label}</strong>
              <span>
                {severity.summary} {severity.advice}
              </span>
              <small>Official name: {officialName}</small>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

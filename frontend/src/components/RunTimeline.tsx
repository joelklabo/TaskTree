import React from "react";

type Props = {
  steps: Array<{ step_name: string; agent: string; status: string; label?: string | null }>;
};

export default function RunTimeline({ steps }: Props) {
  if (!steps || steps.length === 0) return <p>No steps recorded.</p>;
  return (
    <ol>
      {steps.map((s, idx) => (
        <li key={idx}>
          {s.step_name} - {s.agent} - {s.status}
          {s.label ? ` (${s.label})` : ""}
        </li>
      ))}
    </ol>
  );
}

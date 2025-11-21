import React from "react";

export default function ConstitutionPage() {
  return (
    <div>
      <h2>Constitution</h2>
      <p>
        Constitution lives at <code>backend/tasktree/config/constitution.yaml</code>.
      </p>
      <p>
        In a real deployment this page would read that YAML via an API endpoint and render
        ownership, leases, and transitions.
      </p>
    </div>
  );
}

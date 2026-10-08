"use client";

import { useEffect, useState } from "react";

export default function BudgetInput({ value, onChange }: {
  value: number;
  onChange: (value: number) => void;
}) {
  const [draft, setDraft] = useState(value === 0 ? "" : String(value));

  useEffect(() => {
    setDraft(value === 0 ? "" : String(value));
  }, [value]);

  return (
    <input
      id="funding-budget"
      type="number"
      min={0}
      max={1000000000}
      step={1}
      placeholder="0"
      value={draft}
      onFocus={event => {
        if (event.currentTarget.value === "0") event.currentTarget.select();
      }}
      onChange={event => {
        const next = event.currentTarget.value.replace(/^0+(?=\d)/, "");
        setDraft(next);
        const amount = next === "" ? 0 : Number(next);
        if (Number.isFinite(amount)) onChange(amount);
      }}
    />
  );
}

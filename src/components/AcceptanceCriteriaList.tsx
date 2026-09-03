"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function AcceptanceCriteriaList({
  items,
  onChange,
}: {
  items: string[];
  onChange: (items: string[]) => void;
}) {
  const [newItem, setNewItem] = useState("");

  function updateItem(index: number, value: string) {
    const next = [...items];
    next[index] = value;
    onChange(next);
  }

  function removeItem(index: number) {
    onChange(items.filter((_, i) => i !== index));
  }

  function addItem() {
    const trimmed = newItem.trim();
    if (!trimmed) return;
    onChange([...items, trimmed]);
    setNewItem("");
  }

  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground select-none">{index + 1}.</span>
          <Input
            value={item}
            onChange={(e) => updateItem(index, e.target.value)}
            aria-label={`Acceptance criterion ${index + 1}`}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => removeItem(index)}
            aria-label={`Remove criterion ${index + 1}`}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}

      <div className="flex items-center gap-2">
        <span className="w-5" />
        <Input
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addItem();
            }
          }}
          placeholder="Add another criterion…"
        />
        <Button type="button" variant="ghost" size="icon" onClick={addItem} aria-label="Add criterion">
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

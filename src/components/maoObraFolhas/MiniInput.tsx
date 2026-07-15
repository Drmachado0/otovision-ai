import { memo } from "react";

export const MiniInput = memo(function MiniInput({
  value, onChange, type = "text", w, disabled, placeholder,
}: {
  value: string | number;
  onChange: (v: string | number) => void;
  type?: string;
  w?: number;
  disabled?: boolean;
  placeholder?: string;
}) {
  return (
    <input
      type={type}
      disabled={disabled}
      placeholder={placeholder}
      style={{ width: w }}
      value={value as any}
      onChange={(e) => onChange(type === "number" ? Number(e.target.value) || 0 : e.target.value)}
      className="h-7 rounded border border-input bg-background px-1.5 text-xs disabled:opacity-60"
    />
  );
});

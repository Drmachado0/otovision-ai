import { memo } from "react";
import { Star } from "lucide-react";

export const StarRating = memo(function StarRating({ value, onChange }: { value: number; onChange?: (v: number) => void }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          className={onChange ? "cursor-pointer hover:scale-110 transition-transform" : "cursor-default"}
          onClick={() => onChange?.(s)}
        >
          <Star
            className={`w-4 h-4 ${s <= value ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`}
          />
        </button>
      ))}
    </div>
  );
});

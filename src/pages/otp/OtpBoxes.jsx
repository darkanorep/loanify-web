import { useRef } from "react";

export const OTP_LENGTH = 6;

export default function OtpBoxes({ value, onChange, hasError }) {
    const inputRefs = useRef([]);

    function setDigit(index, digit) {
        const chars = value.split("");
        chars[index] = digit;
        onChange(chars.join("").slice(0, OTP_LENGTH));
    }

    function handleChange(e, index) {
        const digit = e.target.value.replace(/[^0-9]/g, "").slice(-1);
        setDigit(index, digit);
        if (digit && index < OTP_LENGTH - 1) {
            inputRefs.current[index + 1]?.focus();
        }
    }

    function handleKeyDown(e, index) {
        if (e.key === "Backspace" && !value[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    }

    function handlePaste(e) {
        const pasted = e.clipboardData.getData("text").replace(/[^0-9]/g, "");
        if (!pasted) return;
        e.preventDefault();
        onChange(pasted.slice(0, OTP_LENGTH));
        const nextIndex = Math.min(pasted.length, OTP_LENGTH - 1);
        inputRefs.current[nextIndex]?.focus();
    }

    return (
        <div className="flex justify-between gap-2" onPaste={handlePaste}>
            {Array.from({ length: OTP_LENGTH }).map((_, i) => (
                <input
                    key={i}
                    ref={(el) => (inputRefs.current[i] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={value[i] || ""}
                    onChange={(e) => handleChange(e, i)}
                    onKeyDown={(e) => handleKeyDown(e, i)}
                    aria-label={`Digit ${i + 1} of ${OTP_LENGTH}`}
                    aria-invalid={hasError}
                    className={`h-14 w-12 rounded-md border bg-secondary text-center text-xl font-semibold text-foreground shadow-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 ${
                        hasError ? "border-destructive" : "border-input"
                    }`}
                />
            ))}
        </div>
    );
}
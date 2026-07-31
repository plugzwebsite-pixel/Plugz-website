"use client";

import * as React from "react";
import { Eye, EyeOff, Lock } from "lucide-react";
import { Input, type InputProps } from "./input";

export const PasswordInput = React.forwardRef<HTMLInputElement, InputProps>(
  (props, ref) => {
    const [show, setShow] = React.useState(false);
    return (
      <Input
        ref={ref}
        type={show ? "text" : "password"}
        leftIcon={<Lock size={16} />}
        rightSlot={
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShow((s) => !s)}
            aria-label={show ? "Hide password" : "Show password"}
            className="grid h-9 w-9 place-items-center rounded-full text-text-faint transition-colors hover:text-text-strong"
          >
            {show ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        }
        {...props}
      />
    );
  }
);
PasswordInput.displayName = "PasswordInput";

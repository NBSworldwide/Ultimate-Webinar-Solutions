"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState, type ChangeEventHandler } from "react";

type PasswordFieldProps = {
  autoComplete: string;
  helpText?: string;
  id: string;
  label: string;
  minLength?: number;
  name: string;
  onChange: ChangeEventHandler<HTMLInputElement>;
  required?: boolean;
  value: string;
};

export function PasswordField({ autoComplete, helpText, id, label, minLength, name, onChange, required, value }: PasswordFieldProps) {
  const [isVisible, setIsVisible] = useState(false);
  const action = isVisible ? "Hide" : "Show";

  return <div className="field">
    <div className="password-field-label-row">
      <label htmlFor={id}>{label}</label>
      <span className="password-field-state" aria-live="polite">{isVisible ? "Shown" : "Hidden"}</span>
    </div>
    <div className="password-field">
      <input
        id={id}
        name={name}
        type={isVisible ? "text" : "password"}
        autoComplete={autoComplete}
        minLength={minLength}
        value={value}
        onChange={onChange}
        required={required}
      />
      <button
        className="password-visibility-toggle"
        type="button"
        aria-controls={id}
        aria-label={`${action} ${label.toLowerCase()}`}
        aria-pressed={isVisible}
        onClick={() => setIsVisible((current) => !current)}
      >
        {isVisible ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
      </button>
    </div>
    {helpText ? <small className="field-help">{helpText}</small> : null}
  </div>;
}

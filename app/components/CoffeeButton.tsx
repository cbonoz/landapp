"use client";

type CoffeeButtonProps = {
  amount?: number;
  size?: "small" | "medium" | "large";
};

export function CoffeeButton({ amount = 5, size = "medium" }: CoffeeButtonProps) {
  const paypalUrl = `https://paypal.me/chrisbuonocore/${amount}USD`;

  const sizeClasses = {
    small: "coffee-button-small",
    medium: "coffee-button-medium",
    large: "coffee-button-large",
  };

  return (
    <a
      href={paypalUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`coffee-button ${sizeClasses[size]}`}
      aria-label={`Support with $${amount} coffee donation`}
    >
      <span className="coffee-emoji">☕</span>
      <span className="coffee-text">Buy me a coffee</span>
      {amount && <span className="coffee-amount">${amount}</span>}
    </a>
  );
}

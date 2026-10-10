export default function Icon({ children, className = '' }) {
  return (
    <span className={`ui-icon ${className}`} aria-hidden="true">
      {children}
    </span>
  );
}

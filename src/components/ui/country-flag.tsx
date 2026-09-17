import type { ReactNode } from "react";

export function CountryFlag({ code, name }: { code: string; name: string }) {
  let flag: ReactNode;
  switch (code.toUpperCase()) {
    case "GB-ENG":
      flag = (
        <>
          <path fill="#fff" d="M0 0h30v20H0z" />
          <path fill="#c52b36" d="M12 0h6v20h-6zM0 7h30v6H0z" />
        </>
      );
      break;
    case "GB-SCT":
      flag = (
        <>
          <path fill="#1769aa" d="M0 0h30v20H0z" />
          <path stroke="#fff" strokeWidth="4" d="m0 0 30 20M30 0 0 20" />
        </>
      );
      break;
    case "ES":
      flag = (
        <>
          <path fill="#b82c37" d="M0 0h30v20H0z" />
          <path fill="#f5ce50" d="M0 5h30v10H0z" />
        </>
      );
      break;
    case "DE":
      flag = (
        <>
          <path fill="#222" d="M0 0h30v20H0z" />
          <path fill="#bd3036" d="M0 6.67h30v6.67H0z" />
          <path fill="#e6bc3d" d="M0 13.33h30V20H0z" />
        </>
      );
      break;
    case "FR":
    case "IT":
      flag = (
        <>
          <path fill="#fff" d="M0 0h30v20H0z" />
          <path
            fill={code.toUpperCase() === "FR" ? "#254b8b" : "#278653"}
            d="M0 0h10v20H0z"
          />
          <path fill="#c63d45" d="M20 0h10v20H20z" />
        </>
      );
      break;
    default:
      return (
        <span className="country-code" aria-label={name}>
          {code.toUpperCase()}
        </span>
      );
  }
  return (
    <svg
      className="country-flag"
      viewBox="0 0 30 20"
      role="img"
      aria-label={`${name} flag`}
    >
      {flag}
    </svg>
  );
}

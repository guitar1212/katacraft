/* Small dependency-free inline SVG icon set used across the app. */
import type { SVGProps } from 'react';

export function ChevronDown(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16" {...props}>
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export function Check(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14" {...props}>
      <path
        fillRule="evenodd"
        d="M16.704 5.29a1 1 0 00-1.408-1.418l-7.29 7.21-3.3-3.27a1 1 0 00-1.408 1.418l4 3.96a1 1 0 001.408 0l8-7.9z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export function X(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16" {...props}>
      <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
    </svg>
  );
}

export function Spinner(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" className="animate-spin" {...props}>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.25" />
      <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="4" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export function Heart(props: SVGProps<SVGSVGElement> & { filled?: boolean }) {
  const { filled, ...rest } = props;
  return (
    <svg viewBox="0 0 20 20" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" width="18" height="18" {...rest}>
      <path d="M10 17.3l-1.03-.94C5.14 13.09 2.5 10.7 2.5 7.72 2.5 5.3 4.42 3.4 6.83 3.4c1.36 0 2.67.64 3.17 1.65.5-1.01 1.81-1.65 3.17-1.65 2.41 0 4.33 1.9 4.33 4.32 0 2.98-2.64 5.37-6.47 8.66L10 17.3z" />
    </svg>
  );
}

export function Download(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16" {...props}>
      <path d="M10 2a.75.75 0 01.75.75v7.19l2.72-2.72a.75.75 0 111.06 1.06l-4 4a.75.75 0 01-1.06 0l-4-4a.75.75 0 111.06-1.06l2.72 2.72V2.75A.75.75 0 0110 2z" />
      <path d="M3 13.5a.75.75 0 01.75.75v1.5c0 .414.336.75.75.75h11a.75.75 0 00.75-.75v-1.5a.75.75 0 011.5 0v1.5A2.25 2.25 0 0115.5 18h-11A2.25 2.25 0 012.25 15.75v-1.5A.75.75 0 013 13.5z" />
    </svg>
  );
}

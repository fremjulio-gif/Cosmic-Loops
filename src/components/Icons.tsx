import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

export function IconPlay(props: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" {...props}>
      <path d="M4.5 3.1v9.8a.5.5 0 0 0 .76.43l7.8-4.9a.5.5 0 0 0 0-.86l-7.8-4.9a.5.5 0 0 0-.76.43Z" />
    </svg>
  );
}

export function IconPause(props: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" {...props}>
      <rect x="4" y="3" width="2.8" height="10" rx="0.6" />
      <rect x="9.2" y="3" width="2.8" height="10" rx="0.6" />
    </svg>
  );
}

export function IconArrowLeft(props: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} {...props}>
      <path d="M12.5 8H3.5M7 4.5 3.5 8 7 11.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconChevronLeft(props: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} {...props}>
      <path d="M10 3.5 5.5 8l4.5 4.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconChevronRight(props: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} {...props}>
      <path d="M6 3.5 10.5 8 6 12.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconDownload(props: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} {...props}>
      <path d="M8 2.5v7.8M4.8 7.5 8 10.7l3.2-3.2M3 13.2h10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconInfo(props: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} {...props}>
      <circle cx="8" cy="8" r="6" />
      <path d="M8 7.4v3.8" strokeLinecap="round" />
      <circle cx="8" cy="5.1" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconClose(props: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} {...props}>
      <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" />
    </svg>
  );
}

export function IconSearch(props: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} {...props}>
      <circle cx="7" cy="7" r="4.2" />
      <path d="m10.2 10.2 3.3 3.3" strokeLinecap="round" />
    </svg>
  );
}

export function IconMinus(props: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} {...props}>
      <path d="M3.5 8h9" strokeLinecap="round" />
    </svg>
  );
}

export function IconPlus(props: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} {...props}>
      <path d="M8 3.5v9M3.5 8h9" strokeLinecap="round" />
    </svg>
  );
}

export function IconExpand(props: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} {...props}>
      <path d="M2.5 6V2.5H6M10 2.5h3.5V6M13.5 10v3.5H10M6 13.5H2.5V10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconZoomIn(props: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} {...props}>
      <circle cx="7" cy="7" r="4.5" />
      <path d="M7 5v4M5 7h4M10.4 10.4 13.5 13.5" strokeLinecap="round" />
    </svg>
  );
}

export function IconZoomOut(props: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} {...props}>
      <circle cx="7" cy="7" r="4.5" />
      <path d="M5 7h4M10.4 10.4 13.5 13.5" strokeLinecap="round" />
    </svg>
  );
}

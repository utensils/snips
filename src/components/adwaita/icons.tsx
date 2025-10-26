import { type ReactElement, type ReactNode, type SVGProps } from 'react';

export interface IconProps extends SVGProps<SVGSVGElement> {
  size?: number;
}

const defaultSize = 16;

function IconBase({
  size = defaultSize,
  className = '',
  children,
  ...props
}: IconProps & { children: ReactNode }): ReactElement {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {children}
    </svg>
  );
}

export function TrashSymbolic(props: IconProps): ReactElement {
  return (
    <IconBase {...props}>
      <path d="M5.5 3.5h5" />
      <path d="M6.5 2h3" />
      <path d="M4 5.5h8" />
      <path d="M6 5.5v7a1 1 0 001 1h2a1 1 0 001-1v-7" />
      <path d="M7 7.5v4" />
      <path d="M9 7.5v4" />
    </IconBase>
  );
}

export function CheckSymbolic(props: IconProps): ReactElement {
  return (
    <IconBase {...props}>
      <path d="M4.5 8.5l2.5 2.5 4.5-5" />
    </IconBase>
  );
}

export function ChevronRightSymbolic(props: IconProps): ReactElement {
  return (
    <IconBase {...props}>
      <path d="M6.5 4.5l3.5 3.5-3.5 3.5" />
    </IconBase>
  );
}

export function ChevronLeftSymbolic(props: IconProps): ReactElement {
  return (
    <IconBase {...props}>
      <path d="M9.5 4.5L6 8l3.5 3.5" />
    </IconBase>
  );
}

export function CloseSymbolic(props: IconProps): ReactElement {
  return (
    <IconBase {...props}>
      <path d="M4.5 4.5l7 7" />
      <path d="M11.5 4.5l-7 7" />
    </IconBase>
  );
}

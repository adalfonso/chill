import { SVGProps } from "preact/compat";

// From hero icons
export const ChevronLeftIcon = (props: SVGProps<SVGSVGElement>) => {
  const { className, ...rest } = props;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="1em"
      height="1em"
      viewBox="0 0 24 24"
      {...rest}
      className={`chevron-left-icon ${className ?? ""}`}
    >
      <path
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        d="M15.75 19.5 8.25 12l7.5-7.5"
      ></path>
    </svg>
  );
};

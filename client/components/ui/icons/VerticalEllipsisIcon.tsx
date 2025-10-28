import { SVGProps } from "preact/compat";

// From hero icons
export const VerticalEllipsisIcon = (props: SVGProps<SVGSVGElement>) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="1em"
      height="1em"
      viewBox="0 0 20 20"
      {...props}
    >
      <path
        fill="currentColor"
        d="M10 3a1.5 1.5 0 1 1 0 3a1.5 1.5 0 0 1 0-3m0 5.5a1.5 1.5 0 1 1 0 3a1.5 1.5 0 0 1 0-3m1.5 7a1.5 1.5 0 1 0-3 0a1.5 1.5 0 0 0 3 0"
      ></path>
    </svg>
  );
};

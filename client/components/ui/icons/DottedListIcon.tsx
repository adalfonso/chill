import { SVGProps } from "preact/compat";

export const DottedListIcon = (props: SVGProps<SVGSVGElement>) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="1em"
      height="1em"
      viewBox="0 0 16 16"
      {...props}
    >
      <path
        fill="currentColor"
        d="M3 4.75a1 1 0 1 0 0-2a1 1 0 0 0 0 2M6.25 3a.75.75 0 0 0 0 1.5h7a.75.75 0 0 0 0-1.5zm0 4.25a.75.75 0 0 0 0 1.5h7a.75.75 0 0 0 0-1.5zm0 4.25a.75.75 0 0 0 0 1.5h7a.75.75 0 0 0 0-1.5zM4 12.25a1 1 0 1 1-2 0a1 1 0 0 1 2 0M3 9a1 1 0 1 0 0-2a1 1 0 0 0 0 2"
      ></path>
    </svg>
  );
};

import { SVGProps } from "preact/compat";

export const GripVerticalIcon = (props: SVGProps<SVGSVGElement>) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="1em"
      height="1em"
      viewBox="0 0 24 24"
      {...props}
    >
      <path
        fill="currentColor"
        d="M9 5a1.5 1.5 0 1 1-3 0a1.5 1.5 0 0 1 3 0m0 7a1.5 1.5 0 1 1-3 0a1.5 1.5 0 0 1 3 0m-1.5 8.5a1.5 1.5 0 1 0 0-3a1.5 1.5 0 0 0 0 3M18 5a1.5 1.5 0 1 1-3 0a1.5 1.5 0 0 1 3 0m-1.5 8.5a1.5 1.5 0 1 0 0-3a1.5 1.5 0 0 0 0 3m1.5 5.5a1.5 1.5 0 1 1-3 0a1.5 1.5 0 0 1 3 0"
      />
    </svg>
  );
};

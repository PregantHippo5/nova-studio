import { HTMLAttributes } from 'react';

export default function Container({
  className = '',
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`mx-auto w-full max-w-content px-6 md:px-10 ${className}`} {...props}>
      {children}
    </div>
  );
}

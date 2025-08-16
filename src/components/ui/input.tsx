export const Input = ({ className = '', ...props }: any) => (
  <input
    className={`border rounded px-3 py-1 outline-none focus:ring-2 focus:ring-blue-300 ${className}`}
    {...props}
  />
)


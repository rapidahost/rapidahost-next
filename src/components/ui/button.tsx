export const Button = ({ children, className = '', ...props }: any) => (
  <button
    className={`px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition ${className}`}
    {...props}
  >
    {children}
  </button>
)


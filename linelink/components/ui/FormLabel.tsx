import * as React from "react"


export interface FormLabelProps
  extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean
}

const FormLabel = React.forwardRef<HTMLLabelElement, FormLabelProps>(
  ({ className = "", children, required, ...props }, ref) => (
    <label
      ref={ref}
      className={`text-sm font-medium leading-none block mb-1 text-gray-700 dark:text-gray-300 ${className}`}
      {...props}
    >
      {children}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
  )
)
FormLabel.displayName = "FormLabel"

export default FormLabel
import { forwardRef } from 'react';
import { FiMoreVertical, FiX } from 'react-icons/fi';

const Card = forwardRef(({
  children,
  title,
  subtitle,
  actions,
  onClose,
  className = '',
  variant = 'default',
  hoverable = false,
  padding = true,
  ...props
}, ref) => {
  const variants = {
    default: 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700',
    elevated: 'bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700',
    ghost: 'bg-transparent border border-transparent',
    gradient: 'bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 border border-blue-100 dark:border-gray-700',
  };

  const paddingClass = padding ? 'p-6' : 'p-0';

  return (
    <div
      ref={ref}
      className={`
        rounded-xl transition-all duration-200
        ${variants[variant]}
        ${hoverable ? 'hover:shadow-md hover:-translate-y-1 cursor-pointer' : ''}
        ${paddingClass}
        ${className}
      `}
      {...props}
    >
      {(title || actions || onClose) && (
        <div className="flex items-center justify-between mb-4">
          <div>
            {title && (
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {subtitle}
              </p>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            {actions && (
              <div className="flex items-center space-x-1">
                {actions}
              </div>
            )}
            {onClose && (
              <button
                onClick={onClose}
                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                aria-label="Close"
              >
                <FiX className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}
      
      <div className={title || actions || onClose ? '' : 'first:pt-0'}>
        {children}
      </div>
    </div>
  );
});

Card.displayName = 'Card';

export default Card;
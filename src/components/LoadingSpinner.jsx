function LoadingSpinner({
  label = 'Loading',
  size = 'md',
  variant = 'section',
  className = '',
  showLabel = true,
}) {
  const classes = [
    'loading-spinner',
    `loading-spinner-${variant}`,
    `loading-spinner-${size}`,
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <span className={classes} role="status" aria-live="polite" aria-label={label}>
      <span className="loading-spinner-ring" aria-hidden="true"></span>
      {showLabel && <span className="loading-spinner-label">{label}</span>}
    </span>
  )
}

export default LoadingSpinner

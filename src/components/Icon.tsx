interface IconProps {
  name: string
  className?: string
  filled?: boolean
  size?: number
}

export default function Icon({ name, className, filled, size }: IconProps) {
  return (
    <span
      className={`material-symbols-outlined ${className || ''}`}
      style={{
        fontSize: size ? `${size}px` : undefined,
        fontVariationSettings: filled ? "'FILL' 1" : undefined,
      }}
    >{name}</span>
  )
}

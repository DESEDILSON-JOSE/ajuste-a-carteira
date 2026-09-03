export default function Spinner({ size = 32, color = '#22c55e' }) {
  return (
    <div
      className="spinner"
      style={{ width: size, height: size, borderTopColor: color }}
    />
  )
}

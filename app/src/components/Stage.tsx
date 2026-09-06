/** Atmosphere only: a warm spotlight from above, a faint stage floor, and film grain. */
export function Stage() {
  return (
    <div className="stage" aria-hidden="true">
      <div className="stage__spot" />
      <div className="stage__floor" />
      <div className="stage__grain" />
    </div>
  );
}

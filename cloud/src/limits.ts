export interface GateState {
  day: string;
  count: number;
  ips: Record<string, number>;
  requests: Record<string, number>;
  names: Record<string, number>;
}
export function reserve(
  previous: GateState | undefined,
  input: { ip: string; requestId: string; nameHash: string },
  now: number,
): { status: number; state: GateState } {
  const day = new Date(now).toISOString().slice(0, 10);
  const state: GateState =
    previous?.day === day
      ? structuredClone(previous)
      : { day, count: 0, ips: {}, requests: {}, names: {} };
  if (state.requests[input.requestId] || state.names[input.nameHash]) return { status: 409, state };
  if (state.count >= 100 || (state.ips[input.ip] ?? 0) >= 3) return { status: 429, state };
  state.count++;
  state.ips[input.ip] = (state.ips[input.ip] ?? 0) + 1;
  state.requests[input.requestId] = now;
  state.names[input.nameHash] = now;
  return { status: 200, state };
}

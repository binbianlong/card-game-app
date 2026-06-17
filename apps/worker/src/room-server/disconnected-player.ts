const disconnectedPlayerCpuDelayMs = 15_000;

function isDisconnectedPlayerCpuControlled({
  disconnectedAt,
  now,
}: {
  disconnectedAt: number;
  now: number;
}) {
  return disconnectedAt + disconnectedPlayerCpuDelayMs <= now;
}

function getDisconnectedPlayerCpuAlarmTime(disconnectedAt: number) {
  return disconnectedAt + disconnectedPlayerCpuDelayMs;
}

export {
  disconnectedPlayerCpuDelayMs,
  getDisconnectedPlayerCpuAlarmTime,
  isDisconnectedPlayerCpuControlled,
};

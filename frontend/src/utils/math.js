export function lerp(from, to, degree = 1) {
    return from + degree * (to - from);
}

export function randomRange(from, to) {
    return Math.random() * (to - from) + from;
}

export function randomNegate(value) {
    const multipler = Math.random() > 0.5 ? -1 : 1;
    return value * multipler;
}

export function timeSince(startDate) {
    const epochStart = epoch(startDate);
    const currentEpoch = epoch(new Date());
    return {
        minutes: Math.floor((currentEpoch - epochStart) / 60),
        seconds: (currentEpoch - epochStart) % 60,
    };
}

export function epoch(date) {
    return Math.floor(date / 1000);
}

export function leftPad(toPad, length, padChar) {
    const toPadLength = String(toPad).length;
    if (toPadLength >= length) return toPad;
    return `${(String(padChar) * (toPadLength - length))}${toPad}`;
}
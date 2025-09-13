export function lerp(from: number, to: number, degree: number = 1): number {
    return from + degree * (to - from);
}

export function randomRange(from: number, to: number): number {
    return Math.random() * (to - from) + from;
}

export function randomNegate(value: number): number {
    const multipler = Math.random() > 0.5 ? -1 : 1;
    return value * multipler;
}

export function timeSince(startDate: Date): { minutes: number; seconds: number } {
    const epochStart = epoch(startDate);
    const currentEpoch = epoch(new Date());
    return {
        minutes: Math.floor((currentEpoch - epochStart) / 60),
        seconds: (currentEpoch - epochStart) % 60,
    };
}

export function epoch(date: Date): number {
    return Math.floor(date.getTime() / 1000);
}

export function leftPad(toPad: string | number, length: number, padChar: string): string {
    const toPadLength = String(toPad).length;
    if (toPadLength >= length) return String(toPad);
    return `${String(padChar).repeat(length - toPadLength)}${toPad}`;
}
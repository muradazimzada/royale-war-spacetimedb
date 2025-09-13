/**
 * Checks if (pointX, pointY) collides with the circle
 * at (circleX, circleY) with circleRadius.
 */
export function pointInCircle(
    pointX: number,
    pointY: number,
    circleX: number,
    circleY: number,
    circleRadius: number
): boolean {
    const distance =
        Math.pow(circleX - pointX, 2) +
        Math.pow(circleY - pointY, 2);

    return distance < Math.pow(circleRadius, 2);
}
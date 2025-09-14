/**
 * Checks if (pointX, pointY) collides with the circle
 * at (circleX, circleY) with circleRadius.
 * 
 * @return bool
 */
export function pointInCircle(
    pointX, pointY, circleX, circleY, circleRadius
) {
    let distance =
        Math.pow(circleX - pointX, 2) +
        Math.pow(circleY - pointY, 2);

    return distance < Math.pow(circleRadius, 2);
}
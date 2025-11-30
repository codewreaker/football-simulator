import { Player } from '../entities/Player';

/**
 * Physics - Handles collision detection and response between players
 */
export class Physics {
    /**
     * Handle collisions between all players
     * Uses impulse-based collision response for realistic physics
     */
    static handleCollisions(players: Player[]): void {
        // Check every pair of players for collision
        for (let i = 0; i < players.length; i++) {
            for (let j = i + 1; j < players.length; j++) {
                const p1 = players[i];
                const p2 = players[j];
                const distance = p1.pos.dist(p2.pos);
                const minDist = p1.radius + p2.radius;

                // If players are overlapping
                if (distance < minDist) {
                    this.resolveCollision(p1, p2, distance, minDist);
                }
            }
        }
    }

    /**
     * Resolve a collision between two players
     * Separates them and applies impulse-based physics response
     */
    private static resolveCollision(
        p1: Player,
        p2: Player,
        distance: number,
        minDist: number
    ): void {
        // Calculate collision normal (direction to push apart)
        const normal = p1.pos.sub(p2.pos).normalize();

        // Separate players so they're not overlapping
        const overlap = minDist - distance;
        const separation = normal.mult(overlap / 2);
        p1.pos = p1.pos.add(separation);
        p2.pos = p2.pos.sub(separation);

        // Apply physics - players bounce off each other slightly
        const relativeVel = p1.vel.sub(p2.vel);
        const speed = relativeVel.x * normal.x + relativeVel.y * normal.y;

        if (speed < 0) return; // Players moving apart already

        // Elastic collision with damping (0.3 = energy loss)
        const impulse = (2 * speed) / (p1.mass + p2.mass);
        p1.vel = p1.vel.sub(normal.mult(impulse * p2.mass * 0.3));
        p2.vel = p2.vel.add(normal.mult(impulse * p1.mass * 0.3));
    }
}

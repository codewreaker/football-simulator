/**
 * Vector class for 2D mathematical operations
 * Handles all vector math needed for physics simulations
 */
export class Vector {
    x: number;
    y: number;

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }

    /**
     * Add two vectors together
     */
    add(v: Vector): Vector {
        return new Vector(this.x + v.x, this.y + v.y);
    }

    /**
     * Subtract one vector from another
     */
    sub(v: Vector): Vector {
        return new Vector(this.x - v.x, this.y - v.y);
    }

    /**
     * Multiply vector by a scalar (number)
     */
    mult(n: number): Vector {
        return new Vector(this.x * n, this.y * n);
    }

    /**
     * Get the length/magnitude of the vector
     */
    mag(): number {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    /**
     * Convert to unit vector (length = 1, keeps direction)
     */
    normalize(): Vector {
        const m = this.mag();
        return m > 0 ? this.mult(1 / m) : new Vector(0, 0);
    }

    /**
     * Cap the maximum magnitude of a vector
     */
    limit(max: number): Vector {
        const m = this.mag();
        return m > max ? this.normalize().mult(max) : this;
    }

    /**
     * Get distance between two vectors
     */
    dist(v: Vector): number {
        return this.sub(v).mag();
    }
}

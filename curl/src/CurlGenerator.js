import { Vector2, Vector3 } from 'three';
// import noise from '../../lib/perlin.js';
import { Noise } from '../../lib/perlinNoise.js';

const noise = new Noise();
const noise2 = new Noise();
noise.seed( ~ ~ ( Math.random() * 1000 ) );
noise2.seed( ~ ~ ( Math.random() * 1000 ) );

const offset = 0.0;
function fbm( x, y, z ) {

	let n = 0;
	let l = 1.0;
	let totalWeight = 0.0;
	let amplitude = 1.0;
	for ( let i = 0; i < 1; i ++ ) {

	  n += amplitude * noise2.simplex3( x * l, y * l, z * l );
	  totalWeight += amplitude;
	  amplitude *= 0.5;
	  l *= 2.0;

	}

	n /= totalWeight;
	return n;

}

//Find the curl of the noise field based on on the noise value at the location of a particle
function computeCurl3( x, y, z, curl ) {

	const eps = 0.0001;

	x += 1000.0 * offset;
	y -= 1000.0 * offset;

	//Find rate of change in YZ plane
	let n1 = fbm( x, y + eps, z );
	let n2 = fbm( x, y - eps, z );
	//Average to find approximate derivative
	let a = ( n1 - n2 ) / ( 2 * eps );
	n1 = fbm( x, y, z + eps );
	n2 = fbm( x, y, z - eps );
	//Average to find approximate derivative
	let b = ( n1 - n2 ) / ( 2 * eps );
	curl.x = a - b;

	//Find rate of change in ZX plane
	n1 = fbm( x, y, z + eps );
	n2 = fbm( x, y, z - eps );
	//Average to find approximate derivative
	a = ( n1 - n2 ) / ( 2 * eps );
	n1 = fbm( x + eps, y, z );
	n2 = fbm( x - eps, y, z );
	//Average to find approximate derivative
	b = ( n1 - n2 ) / ( 2 * eps );
	curl.y = a - b;

	//Find rate of change in XY plane
	n1 = noise.simplex3( x + eps, y, z );
	n2 = noise.simplex3( x - eps, y, z );
	//Average to find approximate derivative
	a = ( n1 - n2 ) / ( 2 * eps );
	n1 = noise.simplex3( x, y + eps, z );
	n2 = noise.simplex3( x, y - eps, z );
	//Average to find approximate derivative
	b = ( n1 - n2 ) / ( 2 * eps );
	curl.z = a - b;

	return curl;

}

function computeCurl2( x, y, target ) {

	const eps = 0.0001;

	//Find rate of change in X direction
	let n1 = noise.simplex2( x + eps, y );
	let n2 = noise.simplex2( x - eps, y );

	//Average to find approximate derivative
	const a = ( n1 - n2 ) / ( 2 * eps );

	//Find rate of change in Y direction
	n1 = noise.simplex2( x, y + eps );
	n2 = noise.simplex2( x, y - eps );

	//Average to find approximate derivative
	const b = ( n1 - n2 ) / ( 2 * eps );

	//Curl
	target.x = b;
	target.y = - a;
	return target;

}


// https://al-ro.github.io/projects/embers/
export class CurlGenerator {

	constructor() {

		this.scale = 1;

	}

	sample3d( x, y, z, target = new Vector3() ) {

		const s = this.scale;
		computeCurl3( x / s, y / s, z / s, target );
		return target;

	}

	sample2d( x, y, target = new Vector2() ) {

		const s = this.scale;
		computeCurl2( x / s, y / s, target );
		return target;

	}

}

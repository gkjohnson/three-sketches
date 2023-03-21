import { Vector3 } from 'three';
import noise from '../../lib/perlin.js';
import { createNoise3D } from 'simplex-noise';

const noise3D = createNoise3D( Math.random );

const offset = 0.0;
function fbm( x, y, z ) {

	let n = 0;
	let l = 1.0;
	let totalWeight = 0.0;
	let amplitude = 1.0;
	for ( let i = 0; i < 1; i ++ ) {

	  n += amplitude * noise3D( x * l, y * l, z * l );
	  totalWeight += amplitude;
	  amplitude *= 0.5;
	  l *= 2.0;

	}

	n /= totalWeight;
	return n;

}



//Find the curl of the noise field based on on the noise value at the location of a particle
function computeCurl2( x, y, z ) {

	const eps = 0.0001;

	x += 1000.0 * offset;
	y -= 1000.0 * offset;

	const curl = new Vector3();

	//Find rate of change in YZ plane
	var n1 = fbm( x, y + eps, z );
	var n2 = fbm( x, y - eps, z );
	//Average to find approximate derivative
	let a = ( n1 - n2 ) / ( 2 * eps );
	var n1 = fbm( x, y, z + eps );
	var n2 = fbm( x, y, z - eps );
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



// https://al-ro.github.io/projects/embers/
export class CurlGenerator {

	constructor() {

		this.scale = 0.25;

	}

	sample2( ...args ) {

		args[ 0 ] /= this.scale;
		args[ 1 ] /= this.scale;
		args[ 2 ] /= this.scale;
		return computeCurl2( ...args );

	}

	sample( x, y, z, target = new Vector3() ) {

		var eps = 0.0001;

		// Find rate of change in YZ plane
		var n1 = noise3D( x, y + eps, z );
		var n2 = noise3D( x, y - eps, z );

		// Average to find approximate derivative
		var a = ( n1 - n2 ) / ( 2 * eps );
		var n1 = noise3D( x, y, z + eps );
		var n2 = noise3D( x, y, z - eps );

		// Average to find approximate derivative
		var b = ( n1 - n2 ) / ( 2 * eps );
		target.x = a - b;

		// Find rate of change in XZ plane
		n1 = noise3D( x, y, z + eps );
		n2 = noise3D( x, y, z - eps );
		a = ( n1 - n2 ) / ( 2 * eps );
		n1 = noise3D( x + eps, y, z );
		n2 = noise3D( x - eps, y, z );
		b = ( n1 - n2 ) / ( 2 * eps );
		target.y = a - b;

		// Find rate of change in XY plane
		n1 = noise3D( x + eps, y, z );
		n2 = noise3D( x - eps, y, z );
		a = ( n1 - n2 ) / ( 2 * eps );
		n1 = noise3D( x, y + eps, z );
		n2 = noise3D( x, y - eps, z );
		b = ( n1 - n2 ) / ( 2 * eps );
		target.z = a - b;

		return target;

	}

}

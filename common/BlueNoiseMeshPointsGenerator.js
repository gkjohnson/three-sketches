import { Vector3, BufferGeometry, Box3, BufferAttribute } from 'three';
import { MeshSurfaceSampler } from 'three/addons/math/MeshSurfaceSampler.js';
import { MeshBVH } from 'three-mesh-bvh';

// https://github.com/marmakoide/mesh-blue-noise-sampling/blob/949fadb51f3e78c5cfa1c3297c0bb81abea35442/mesh-sampling.py
export class BlueNoiseMeshPointsGenerator {

	constructor( mesh ) {

		this.sampler = new MeshSurfaceSampler( mesh );
		this.sampleCount = 1000;
		this.optionsMultiplier = 4;
		this.surfaceArea = - 1;

	}

	getTargetDistance() {

		return Math.sqrt( this.surfaceArea / ( ( 2 * this.sampleCount ) * Math.sqrt( 3 ) ) );

	}

	build() {

		const { sampler } = this;
		sampler.build();

		this.surfaceArea = sampler.distribution[ sampler.distribution.length - 1 ];

	}

	generate() {

		const { sampler, optionsMultiplier } = this;
		if ( sampler.distribution === null ) {

			this.build();

		}

		const sample_count = this.sampleCount;
		const points_list = new Array( optionsMultiplier * sample_count );
		for ( let i = 0, l = points_list.length; i < l; i ++ ) {

			const v = new Vector3();
			sampler.sample( v );
			points_list[ i ] = v;

		}

		// def blue_noise_sample_elimination(point_list, mesh_surface_area, sample_count):
		// alpha = 8
		// rmax = numpy.sqrt(mesh_surface_area / ((2 * sample_count) * numpy.sqrt(3.)))
		const alpha = 8;
		const rmax = this.getTargetDistance();

		// # Compute a KD-tree of the input point list
		// kdtree = KDTree(point_list)
		const kdTree = new PointsBVH( points_list );

		// # Compute the weight for each sample
		// D = numpy.minimum(squareform(pdist(point_list)), 2 * rmax)
		const D = squareform( pdist( points_list ), points_list.length );
		mapElements( D, el => Math.min( el, 2 * rmax ) );

		// D = (1. - (D / (2 * rmax))) ** alpha
		mapElements( D, el => ( 1.0 - ( el / ( 2 * rmax ) ) ) ** alpha );

		// W = numpy.zeros(point_list.shape[0])
		// for i in range(point_list.shape[0]):
		// 	W[i] = sum(D[i, j] for j in kdtree.query_ball_point(point_list[i], 2 * rmax) if i != j)
		const W = new Array( points_list.length ).fill( 0 );
		for ( let i = 0, l = points_list.length; i < l; i ++ ) {

			const neighbors = kdTree.query_ball_point( points_list[ i ], 2 * rmax );
			for ( let j = 0, jl = neighbors.length; j < jl; j ++ ) {

				const neighbor = neighbors[ j ];
				if ( neighbor === i ) continue;

				W[ i ] += D[ i ][ neighbor ];

			}

		}

		// # Pick the samples we need
		// heap = sorted((w, i) for i, w in enumerate(W))
		const heapSort = ( a, b ) => a[ 0 ] - b[ 0 ];
		let heap = W.map( ( v, i ) => [ v, i ] ).sort( heapSort );

		// id_set = set(range(point_list.shape[0]))
		const id_set = new Set( new Array( points_list.length ).fill().map( ( v, i ) => i ) );

		// while len(id_set) > sample_count:
		while ( id_set.size > sample_count ) {

			// 	# Pick the sample with the highest weight
			// 	w, i = heap.pop()
			// 	id_set.remove(i)
			const [ , i ] = heap.pop();
			id_set.delete( i );

			// 	neighbor_set = set(kdtree.query_ball_point(point_list[i], 2 * rmax))
			// 	neighbor_set.remove(i)
			const neighbor_set = new Set( kdTree.query_ball_point( points_list[ i ], 2 * rmax ) );
			neighbor_set.delete( i );

			// 	heap = [(w - D[i, j], j) if j in neighbor_set else (w, j) for w, j in heap]
			// 	heap.sort()
			heap = heap.map( ( [ w, j ] ) => {

				if ( neighbor_set.has( j ) ) {

					return [ w - D[ i ][ j ], j ];

				} else {

					return [ w, j ];

				}

			} );
			heap.sort( heapSort );

		}

		// # Job done
		// return point_list[sorted(id_set)]
		return Array.from( id_set ).map( id => points_list[ id ] );

	}

}

// scipy implementations
// scipy.spatial.distance.pdist
function pdist( points ) {

	const l = points.length;
	const array = new Float32Array( l * ( l - 1 ) / 2 );
	let index = 0;
	for ( let i = 0; i < l; i ++ ) {

		const v1 = points[ i ];
		for ( let j = i + 1; j < l; j ++ ) {

			const v2 = points[ j ];
			array[ index ] = v1.distanceTo( v2 );
			index ++;

		}

	}

	return array;

}

function squareform( arr, count ) {

	const matrix = new Array( count );
	for ( let i = 0; i < count; i ++ ) {

		const row = new Float32Array( count );
		matrix[ i ] = row;
		for ( let j = 0; j < count; j ++ ) {

			if ( i === j ) {

				row[ j ] = 0;

			} else {

				const m = count;

				const i2 = Math.min( i, j );
				const j2 = Math.max( i, j );

				const index = m * i2 + j2 - Math.floor( ( i2 + 2 ) * ( i2 + 1 ) / 2 );
				row[ j ] = arr[ index ];

			}

		}

	}

	return matrix;

}

function mapElements( matrix, cb ) {

	for ( let i = 0, l = matrix.length; i < l; i ++ ) {

		const row = matrix[ i ];
		for ( let j = 0, lj = row.length; j < lj; j ++ ) {

			row[ j ] = cb( row[ j ] );

		}

	}

}

// Points BVH
function generatePointsProxyGeometry( points ) {

	const geometry = new BufferGeometry();
	geometry.setFromPoints( points );

	const index = new Uint32Array( points.length * 3 );
	for ( let i = 0, l = points.length; i < l; i ++ ) {

		index[ 3 * i + 0 ] = i;
		index[ 3 * i + 1 ] = i;
		index[ 3 * i + 2 ] = i;

	}

	geometry.setIndex( new BufferAttribute( index, 1 ) );
	return geometry;

}

const _temp = new Vector3();
export class PointsBVH extends MeshBVH {

	constructor( points, options ) {

		super( generatePointsProxyGeometry( points ), options );

	}

	query_ball_point( point, dist ) {

		const results = [];
		const distSq = dist * dist;
		const geometry = this.geometry;
		const index = geometry.index;
		this.shapecast(

			{

				intersectsBounds: box => {

					const closestPoint = _temp.copy( point ).clamp( box.min, box.max );
					return point.distanceToSquared( closestPoint ) < distSq;

				},

				intersectsTriangle: ( tri, triIndex ) => {

					if ( tri.a.distanceToSquared( point ) < distSq ) {

						results.push( index.getX( 3 * triIndex ) );

					}

					return false;

				},

			}

		);

		return results;

	}

}

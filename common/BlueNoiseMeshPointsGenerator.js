import { Vector3, BufferGeometry, Box3 } from 'three';
import { MeshSurfaceSampler } from 'three/addons/math/MeshSurfaceSampler.js';
import { MeshBVH } from 'three-mesh-bvh';

// https://github.com/marmakoide/mesh-blue-noise-sampling/blob/949fadb51f3e78c5cfa1c3297c0bb81abea35442/mesh-sampling.py
export class BlueNoiseMeshPointGenerator {

	constructor( mesh ) {

		this.sampler = new MeshSurfaceSampler( mesh );

	}

	generate( sample_count ) {

		const sampler = this.sampler;
		if ( sampler.distribution === null ) {

			sampler.build();

		}

		const points_list = new Array( 4 * sample_count );
		for ( let i = 0, l = points_list.length; i < l; i ++ ) {

			points_list[ i ] = sampler.sample( new Vector3() );

		}

		const mesh_surface_area = sampler.distribution[ sampler.distribution.length - 1 ];

		// def blue_noise_sample_elimination(point_list, mesh_surface_area, sample_count):
		// alpha = 8
		// rmax = numpy.sqrt(mesh_surface_area / ((2 * sample_count) * numpy.sqrt(3.)))
		const alpha = 8;
		const rmax = Math.sqrt( mesh_surface_area / ( ( 2 * sample_count ) * Math.sqrt( 3 ) ) );

		const kdTree = new PointsBVH( points_list );

		// # Compute the weight for each sample
		// D = numpy.minimum(squareform(pdist(point_list)), 2 * rmax)
		const D = squareform( pdist( points_list ) );
		mapElements( D, el => Math.min( el, 2 * rmax ) );

		// D = (1. - (D / (2 * rmax))) ** alpha
		mapElements( D, el => 1.0 - ( el / ( 2 * rmax ) ) ** alpha );

		// W = numpy.zeros(point_list.shape[0])
		// for i in range(point_list.shape[0]):
		// 	W[i] = sum(D[i, j] for j in kdtree.query_ball_point(point_list[i], 2 * rmax) if i != j)
		const W = new Array( points_list.length );
		for ( let i = 0, l = points_list.length; i < l; i ++ ) {

			const queryPoints = kdTree.queryBallPoint( points_list[ i ], 2 * rmax );
			W[ i ] = 0;
			for ( let j = 0, jl = queryPoints.length; j < jl; j ++ ) {

				if ( j === i ) continue;
				W[ i ] += D[ i ][ j ];

			}

		}

		// # Pick the samples we need
		// heap = sorted((w, i) for i, w in enumerate(W))
		const heapSort = ( a, b ) => a[ 0 ] - b[ 0 ];
		const heap = W.map( ( v, i ) => [ v, i ] ).sort( heapSort );

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
			neighbor_set.remove( i );

			// 	heap = [(w - D[i, j], j) if j in neighbor_set else (w, j) for w, j in heap]
			// 	heap.sort()
			heap = heap.map( ( w, j ) => {

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
	for ( let i = 0; i < l; i ++ ) {

		const v1 = points[ i ];
		for ( let j = i + 1; j < l; j ++ ) {

			const v2 = points[ j ];
			array.push( v1.distanceTo( v2 ) );

		}

	}

	return array;

}

function squareform( arr, count ) {

	const matrix = new Array( count );
	for ( let i = 0; i < count; i ++ ) {

		const row = new Array( count );
		matrix[ i ] = row;
		for ( let j = 0; j < count; j ++ ) {

			if ( i === j ) {

				row[ j ] = 0;

			} else {

				const m = count;
				const index = m * i + j - ( ( i + 2 ) * ( i + 1 ) );
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

	return mapElements;

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

	geometry.setIndex( index );
	return geometry;

}

const _temp = new Vector3();
export class PointsBVH extends MeshBVH {

	constructor( points, options ) {

		super( generatePointsProxyGeometry( points ), options );

	}

	queryBallPoint( point, dist ) {

		const results = [];
		const distSq = dist * dist;
		this.shapecast(

			{

				intersectsBounds: box => {

					const d2 = _temp.copy( point ).clamp( box.min, box.max );
					return d2 < distSq;

				},

				intersectsTriangle: ( tri, triIndex ) => {

					if ( tri.a.distanceToSquared( point ) < distSq ) {

						results.push( triIndex );

					}

					return false;

				},

			}

		);

		return results;

	}

}

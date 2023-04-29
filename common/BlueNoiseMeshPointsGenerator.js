import { Vector3, BufferGeometry, Box3 } from 'three';
import { MeshSurfaceSampler } from 'three/addons/math/MeshSurfaceSampler.js';
import { MeshBVH } from 'three-mesh-bvh';

// https://github.com/marmakoide/mesh-blue-noise-sampling/blob/949fadb51f3e78c5cfa1c3297c0bb81abea35442/mesh-sampling.py
export class BlueNoiseMeshPointGenerator {

	constructor( mesh ) {

		this.sampler = new MeshSurfaceSampler( mesh );

	}

	generate( count ) {

		const sampler = this.sampler;
		if ( sampler.distribution === null ) {

			sampler.build();

		}

		const points = new Array( 4 * count );
		for ( let i = 0, l = points.length; i < l; i ++ ) {

			points[ i ] = sampler.sample( new Vector3() );

		}

		//
		const surfaceArea = sampler.distribution[ sampler.distribution.length - 1 ];
		const alpha = 8;
		const rmax = Math.sqrt( surfaceArea / ( ( 2 * count ) * Math.sqrt( 3 ) ) );

		const kdTree = new PointsBVH( points );

		// # Compute the weight for each sample
		// D = numpy.minimum(squareform(pdist(point_list)), 2 * rmax)
		// D = (1. - (D / (2 * rmax))) ** alpha

		// W = numpy.zeros(point_list.shape[0])
		// for i in range(point_list.shape[0]):
		// 	W[i] = sum(D[i, j] for j in kdtree.query_ball_point(point_list[i], 2 * rmax) if i != j)

		// # Pick the samples we need
		// heap = sorted((w, i) for i, w in enumerate(W))

		// id_set = set(range(point_list.shape[0]))
		// while len(id_set) > sample_count:
		// 	# Pick the sample with the highest weight
		// 	w, i = heap.pop()
		// 	id_set.remove(i)

		// 	neighbor_set = set(kdtree.query_ball_point(point_list[i], 2 * rmax))
		// 	neighbor_set.remove(i)
		// 	heap = [(w - D[i, j], j) if j in neighbor_set else (w, j) for w, j in heap]
		// 	heap.sort()

		// # Job done
		// return point_list[sorted(id_set)]

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

}

function squareform( arr ) {

	// TODO

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

import { App } from '../common/App.js';
import { MeshBasicMaterial, Mesh, Raycaster, SphereGeometry, Fog, Vector3, Vector2 } from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { BlueNoiseMeshPointsGenerator } from '../common/BlueNoiseMeshPointsGenerator.js';
import { InstancedSpheres } from '../common/objects/InstancedSphere.js';
import { MeshSurfaceSampler } from 'three/addons/math/MeshSurfaceSampler.js';
import { SurfaceWalker, SurfacePoint } from '../surface-flow/src/SurfaceWalker.js';

const POINT_COUNT = 1000;
( async () => {

	const app = new App();
	app.init( document.body );

	const { camera, scene, renderer } = app;
	camera.position.set( 4, 4, - 7 ).multiplyScalar( 0.5 );
	camera.lookAt( 0, 0, 0 );
	renderer.setClearColor( 0x111111 );

	const mouse = new Vector2( - 1, - 1 );
	window.addEventListener( 'pointermove', e => {

		mouse.x = ( e.clientX / window.innerWidth ) * 2 - 1;
		mouse.y = - ( e.clientY / window.innerHeight ) * 2 + 1;

	} );

	const controls = new OrbitControls( camera, renderer.domElement );
	controls.autoRotateSpeed = 0.25;
	controls.autoRotate = true;
	controls.panEnabled = false;

	const mesh = new Mesh( new SphereGeometry() );
	mesh.material.color.set( 0x111111 ).convertSRGBToLinear();
	mesh.material.opacity = 0.5;
	mesh.material.transparent = true;
	mesh.material.polygonOffset = true;
	mesh.material.polygonOffsetUnits = 10;
	mesh.material.polygonOffsetFactor = 10;

	const surf = new SurfaceWalker( mesh.geometry );

	let points, faceIndices;
	const pointsGenerator = new BlueNoiseMeshPointsGenerator( mesh );
	pointsGenerator.sampleCount = POINT_COUNT;
	pointsGenerator.build();

	if ( window.location.hash === '#random' ) {

		const sampler = new MeshSurfaceSampler( mesh );
		sampler.build();
		sampler.sampleFaceIndex = function () {

			const cumulativeTotal = this.distribution[ this.distribution.length - 1 ];
			return this.binarySearch( this.randomFunction() * cumulativeTotal );

		};

		points = new Array( POINT_COUNT );
		faceIndices = new Array( POINT_COUNT );

		for ( let i = 0; i < POINT_COUNT; i ++ ) {

			faceIndices[ i ] = sampler.sampleFaceIndex();
			points[ i ] = new Vector3();
			sampler.sampleFace( faceIndices[ i ], points[ i ] );

		}

	} else {

		faceIndices = [];
		points = pointsGenerator.generate( faceIndices );

	}

	const vectors = new Array( points.length ).fill().map( () => new Vector3() );
	const spheres = new InstancedSpheres( new MeshBasicMaterial(), POINT_COUNT );
	const targetDistance = pointsGenerator.getTargetDistance();
	scene.add( spheres );

	scene.fog = new Fog( 0, 1, 2 );
	scene.fog.color.set( 0x111111 ).convertSRGBToLinear();

	app.toggleLoading();
	app.update = delta => {

		controls.update();
		vectors.forEach( v => v.setScalar( 0 ) );

		const raycaster = new Raycaster();
		raycaster.setFromCamera( mouse, camera );

		const deltaVec = new Vector3();
		const hit = raycaster.intersectObject( mesh )[ 0 ];
		if ( hit ) {

			const hitPoint = hit.point;
			points.forEach( ( p, i ) => {

				const v = vectors[ i ];
				deltaVec.subVectors( p, hitPoint );

				const lenDiff = Math.max( targetDistance * 4.5 - deltaVec.length(), 0 );
				deltaVec.normalize().multiplyScalar( lenDiff );
				v.addScaledVector( deltaVec, 5 );

			} );

		}

		pointForPoint( points, ( i, j ) => {

			const p1 = points[ i ];
			const p2 = points[ j ];
			deltaVec.subVectors( p1, p2 );

			const lenDiff = Math.max( targetDistance * 2.5 - deltaVec.length(), 0 );
			deltaVec.normalize().multiplyScalar( lenDiff );

			const tg1 = vectors[ i ];
			const tg2 = vectors[ j ];

			tg1.add( deltaVec );
			tg2.sub( deltaVec );

		} );

		points.forEach( ( p, i ) => {

			// p.addScaledVector( vectors[ i ], 0.01 );

			vectors[ i ].multiplyScalar( 10 * delta );
			const surfacePoint = new SurfacePoint();
			surfacePoint.copy( p );
			surfacePoint.index = faceIndices[ i ];
			surf.movePoint( surfacePoint, vectors[ i ], surfacePoint );
			faceIndices[ i ] = surfacePoint.index;

			p.copy( surfacePoint );

			spheres.setPosition( i, p, 0.01 );

		} );

		const camDist = camera.position.length();
		scene.fog.near = camDist - 1.5;
		scene.fog.far = camDist + 2.5;

	};

	function pointForPoint( points, cb ) {

		for ( let i = 0, l = points.length; i < l; i ++ ) {

			for ( let j = i + 1; j < l; j ++ ) {

				cb( i, j );

			}

		}

	}

} )();
